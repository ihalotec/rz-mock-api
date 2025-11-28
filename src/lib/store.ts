import { StoreData, Project, MockEndpoint, MockResponse, LogEntry, SwaggerDocs } from './types';
import { generateId, resolveRefs } from './utils';

const DB_NAME = 'CastleMockLiteDB';
const STORE_NAME = 'state';
const DATA_KEY = 'root';

const initialData: StoreData = {
  projects: [],
  endpoints: [],
  responses: []
};

type LogListener = (log: LogEntry) => void;
type DataListener = () => void;

// --- Helper Functions ---
// Simple object path retrieval for JSON matching
function getObjectValue(obj: any, path: string): any {
  if (!path) return undefined;
  const cleanPath = path.startsWith('$.') ? path.substring(2) : path;
  const normalizedPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');
  return normalizedPath.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

function isSubset(subset: any, actual: any): boolean {
    if (subset === actual) return true;
    if (subset instanceof Date && actual instanceof Date) return subset.getTime() === actual.getTime();
    if (!subset || !actual || typeof subset !== 'object' || typeof actual !== 'object') return subset === actual;

    if (Array.isArray(subset)) {
        if (!Array.isArray(actual)) return false;
        for (let i = 0; i < subset.length; i++) {
             if (!isSubset(subset[i], actual[i])) return false;
        }
        return true;
    }
    return Object.keys(subset).every(key => isSubset(subset[key], actual[key]));
}

function generateExample(schema: any): any {
    if (!schema) return "null";
    if (schema.example) return schema.example;
    if (schema.default) return schema.default;

    if (schema.type === 'object' || schema.properties) {
        const obj: any = {};
        const props = schema.properties || {};
        Object.keys(props).forEach(key => {
            obj[key] = generateExample(props[key]);
        });
        return obj;
    }

    if (schema.type === 'array') {
        if (schema.items) return [generateExample(schema.items)];
        return [];
    }

    if (schema.type === 'string') {
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'email') return "user@example.com";
        if (schema.format === 'uuid') return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        if (schema.enum && schema.enum.length > 0) return schema.enum[0];
        return "string";
    }

    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return true;

    return "unknown";
}


class MockStore {
  private data: StoreData = { ...initialData };
  private db: IDBDatabase | null = null;
  private logListeners: LogListener[] = [];
  private dataListeners: DataListener[] = []; // New general data listeners
  private initialized = false;

  async init(): Promise<void> {
      if (this.initialized) return;

      return new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, 1);

          request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains(STORE_NAME)) {
                  db.createObjectStore(STORE_NAME);
              }
          };

          request.onsuccess = (event) => {
              this.db = (event.target as IDBOpenDBRequest).result;
              this.loadFromDB().then(() => {
                  this.initialized = true;
                  resolve();
                  this.notifyDataChange();
              });
          };

          request.onerror = (event) => {
              console.error("IndexedDB error:", event);
              reject("Failed to open database");
          };
      });
  }

  private async loadFromDB() {
      if (!this.db) return;
      return new Promise<void>((resolve) => {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(DATA_KEY);
          
          req.onsuccess = () => {
              if (req.result) {
                  this.data = req.result;
              }
              resolve();
          };
          req.onerror = () => resolve();
      });
  }

  private save() {
      if (!this.db) return;
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(this.data, DATA_KEY);
        this.notifyDataChange();
      } catch (e) {
          console.error("Failed to save to IndexedDB", e);
      }
  }

  // --- Reactive System ---
  subscribe(listener: DataListener) {
      this.dataListeners.push(listener);
      return () => {
          this.dataListeners = this.dataListeners.filter(l => l !== listener);
      };
  }

  private notifyDataChange() {
      this.dataListeners.forEach(l => l());
  }

  subscribeToLogs(listener: LogListener) {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  private notifyLog(log: LogEntry) {
    this.logListeners.forEach(l => l(log));
  }

  // --- Accessors ---
  getProjects(): Project[] {
    return [...this.data.projects];
  }

  createProject(name: string, description: string): Project {
    const newProject: Project = {
      id: generateId(),
      name,
      description,
      baseUrl: `/mock/${generateId()}`,
      status: 'stopped'
    };
    this.data.projects.push(newProject);
    this.save();
    return newProject;
  }

  getProject(id: string): Project | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  updateProjectStatus(id: string, status: 'running' | 'stopped') {
    const project = this.data.projects.find(p => p.id === id);
    if (project) {
      project.status = status;
      this.save();
    }
  }

  deleteProject(id: string) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    const endpointsToDelete = this.data.endpoints.filter(e => e.projectId === id);
    const endpointIds = new Set(endpointsToDelete.map(e => e.id));
    this.data.endpoints = this.data.endpoints.filter(e => e.projectId !== id);
    this.data.responses = this.data.responses.filter(r => !endpointIds.has(r.endpointId));
    this.save();
  }

  // Export / Import
  exportProject(projectId: string): string {
      const project = this.getProject(projectId);
      if (!project) throw new Error("Project not found");
      const endpoints = this.getEndpoints(projectId);
      const responses = endpoints.flatMap(e => this.getResponses(e.id));
      const backup = {
          version: 1,
          type: 'castlemock-lite-backup',
          timestamp: Date.now(),
          project,
          endpoints,
          responses
      };
      return JSON.stringify(backup);
  }

  importProjectBackup(backupData: any): Project {
      if (backupData.type !== 'castlemock-lite-backup' || !backupData.project) {
          throw new Error("Invalid backup file format");
      }
      const newPrjId = generateId();
      const newProject: Project = {
          ...backupData.project,
          id: newPrjId,
          name: `${backupData.project.name} (Imported)`,
          status: 'stopped'
      };

      const idMap: Record<string, string> = {}; 
      const newEndpoints = (backupData.endpoints || []).map((e: MockEndpoint) => {
          const newId = generateId();
          idMap[e.id] = newId;
          return { ...e, id: newId, projectId: newPrjId };
      });

      const newResponses = (backupData.responses || []).map((r: MockResponse) => {
          const newEpId = idMap[r.endpointId];
          if (!newEpId) return null;
          const newId = generateId();
          const parentEp = newEndpoints.find((ep: MockEndpoint) => ep.id === newEpId);
          if (parentEp && parentEp.defaultResponseId === r.id) {
              parentEp.defaultResponseId = newId;
          }
          return { ...r, id: newId, endpointId: newEpId };
      }).filter(Boolean) as MockResponse[];

      this.data.projects.push(newProject);
      this.data.endpoints.push(...newEndpoints);
      this.data.responses.push(...newResponses);
      this.save();
      return newProject;
  }

  // Endpoints
  getEndpoints(projectId: string): MockEndpoint[] {
    return this.data.endpoints.filter(e => e.projectId === projectId);
  }

  createEndpoint(projectId: string, method: any, path: string, name: string): MockEndpoint {
    const newEndpoint: MockEndpoint = {
      id: generateId(),
      projectId,
      method,
      path,
      name,
      responseStrategy: 'DEFAULT',
      docs: { tags: ['Custom'] }
    };
    this.data.endpoints.push(newEndpoint);
    this.save();
    return newEndpoint;
  }

  updateEndpoint(endpoint: MockEndpoint) {
    const index = this.data.endpoints.findIndex(e => e.id === endpoint.id);
    if (index !== -1) {
      this.data.endpoints[index] = endpoint;
      this.save();
    }
  }

  // Responses
  getResponses(endpointId: string): MockResponse[] {
    return this.data.responses.filter(r => r.endpointId === endpointId);
  }

  createResponse(endpointId: string, name: string, body: string, statusCode = 200): MockResponse {
    const newResponse: MockResponse = {
      id: generateId(),
      endpointId,
      name,
      statusCode,
      headers: { "Content-Type": "application/json" },
      body,
      delay: 0,
      delayMode: 'fixed',
      delayMin: 100,
      delayMax: 500
    };
    this.data.responses.push(newResponse);
    
    const endpoint = this.data.endpoints.find(e => e.id === endpointId);
    if (endpoint && !endpoint.defaultResponseId) {
      endpoint.defaultResponseId = newResponse.id;
      const epIndex = this.data.endpoints.findIndex(e => e.id === endpointId);
      this.data.endpoints[epIndex] = endpoint;
    }
    
    this.save();
    return newResponse;
  }

  updateResponse(response: MockResponse) {
    const index = this.data.responses.findIndex(r => r.id === response.id);
    if (index !== -1) {
      this.data.responses[index] = response;
      this.save();
    }
  }

  deleteResponse(id: string) {
    this.data.responses = this.data.responses.filter(r => r.id !== id);
    this.save();
  }

  // Mock Engine
  findMatch(projectId: string, method: string, path: string, requestBody?: string, requestHeaders?: Record<string, string>): { endpoint: MockEndpoint, response: MockResponse, matchedStrategy: string } | null {
    const start = Date.now();
    const project = this.data.projects.find(p => p.id === projectId);
    
    if (!project || project.status === 'stopped') {
        this.notifyLog({
            id: generateId(),
            projectId,
            timestamp: start,
            method: method as any,
            path,
            status: 503,
            duration: Date.now() - start,
            requestBody,
            responseBody: JSON.stringify({ error: "Server stopped" }),
            responseName: "System Error"
        });
        return null;
    }

    const endpoint = this.data.endpoints.find(e => e.projectId === projectId && e.method === method && e.path === path);

    if (!endpoint) {
        this.notifyLog({
            id: generateId(),
            projectId,
            timestamp: start,
            method: method as any,
            path,
            status: 404,
            duration: Date.now() - start,
            requestBody,
            responseBody: JSON.stringify({ error: "Not Found" }),
            responseName: "System Error"
        });
        return null;
    }

    const responses = this.data.responses.filter(r => r.endpointId === endpoint.id);
    let selectedResponse: MockResponse | undefined;
    let matchedStrategy: string = endpoint.responseStrategy;

    if (responses.length > 0) {
        if (endpoint.responseStrategy === 'RANDOM') {
            const randomIndex = Math.floor(Math.random() * responses.length);
            selectedResponse = responses[randomIndex];
        } 
        else if (endpoint.responseStrategy === 'HEADER_MATCH' && requestHeaders) {
            selectedResponse = responses.find(r => {
                try {
                    if (!r.matchExpression) return false;
                    const { key, value } = JSON.parse(r.matchExpression);
                    if (!key) return false;
                    const headerVal = Object.entries(requestHeaders).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
                    return headerVal === value;
                } catch { return false; }
            });
        }
        else if (endpoint.responseStrategy === 'QUERY_MATCH' && requestBody) {
            selectedResponse = responses.find(r => {
                if (!r.matchType || !r.matchExpression) return false;
                if (r.matchType === 'regex') {
                    try { return new RegExp(r.matchExpression).test(requestBody); } catch { return false; }
                }
                if (r.matchType === 'json') {
                    try {
                        const jsonBody = JSON.parse(requestBody);
                        let operator = '==';
                        if (r.matchExpression.includes('!=')) operator = '!=';
                        else if (r.matchExpression.includes('==')) operator = '==';
                        else operator = 'exists';

                        let path = r.matchExpression.trim();
                        let expectedValueStr: string | undefined;

                        if (operator !== 'exists') {
                            const splitIdx = r.matchExpression.indexOf(operator);
                            path = r.matchExpression.substring(0, splitIdx).trim();
                            expectedValueStr = r.matchExpression.substring(splitIdx + operator.length).trim();
                        }
                        const actualValue = getObjectValue(jsonBody, path);

                        if (operator === 'exists') return actualValue !== undefined && actualValue !== null;

                        let expectedValue: any = expectedValueStr;
                        if (expectedValueStr?.startsWith("'") || expectedValueStr?.startsWith('"')) {
                            expectedValue = expectedValueStr.replace(/['"]/g, '');
                        } else if (expectedValueStr === 'true') expectedValue = true;
                        else if (expectedValueStr === 'false') expectedValue = false;
                        else if (expectedValueStr === 'null') expectedValue = null;
                        else if (!isNaN(Number(expectedValueStr))) expectedValue = Number(expectedValueStr);

                        if (operator === '==') return actualValue == expectedValue;
                        if (operator === '!=') return actualValue != expectedValue;
                        return false;
                    } catch { return false; }
                }
                if (r.matchType === 'body_json') {
                   try { return isSubset(JSON.parse(r.matchExpression), JSON.parse(requestBody)); } catch { return false; }
                }
                return false;
            });
        }

        if (!selectedResponse) {
            matchedStrategy = 'FALLBACK (Default)';
            if (endpoint.defaultResponseId) {
                selectedResponse = responses.find(r => r.id === endpoint.defaultResponseId);
            }
            if (!selectedResponse) selectedResponse = responses[0];
        }
    }

    if (!selectedResponse) return null;

    this.notifyLog({
        id: generateId(),
        projectId,
        timestamp: start,
        method: method as any,
        path,
        status: selectedResponse.statusCode,
        duration: 0, 
        requestBody,
        responseBody: selectedResponse.body,
        responseName: selectedResponse.name
    });

    return { endpoint, response: selectedResponse, matchedStrategy };
  }

  importSwagger(projectId: string, swaggerJson: any) {
    const paths = swaggerJson.paths || {};
    const project = this.getProject(projectId);
    if (project && swaggerJson.components) {
        project.components = swaggerJson.components;
    }
    const resolveForExample = (obj: any) => resolveRefs(obj, swaggerJson);

    Object.keys(paths).forEach(path => {
      try {
          const methods = paths[path];
          Object.keys(methods).forEach(methodKey => {
            const method = methodKey.toUpperCase();
            if (method === 'PARAMETERS') return; 

            const details = methods[methodKey];
            const docs: SwaggerDocs = {
                summary: details.summary,
                description: details.description,
                tags: details.tags || [],
                parameters: details.parameters,
                requestBody: details.requestBody,
                responses: details.responses
            };

            const newEndpoint = this.createEndpoint(projectId, method as any, path, details.summary || details.operationId || `${method} ${path}`);
            if (details.description) newEndpoint.description = details.description;
            newEndpoint.docs = docs;
            this.updateEndpoint(newEndpoint);

            let responseBody = '{}';
            const successKey = Object.keys(details.responses || {}).find(k => k.startsWith('2'));
            let successResponse = successKey ? details.responses[successKey] : null;
            
            if (successResponse) {
                successResponse = resolveForExample(successResponse);
                const jsonContent = successResponse?.content?.['application/json'];
                if (jsonContent) {
                    if (jsonContent.example) responseBody = JSON.stringify(jsonContent.example, null, 2);
                    else if (jsonContent.schema) {
                        try {
                            const resolvedSchema = resolveForExample(jsonContent.schema);
                            responseBody = JSON.stringify(generateExample(resolvedSchema), null, 2);
                        } catch (e) { responseBody = '{}'; }
                    }
                }
            }
            this.createResponse(newEndpoint.id, successKey ? `${successKey} Response` : "Default 200", responseBody, successKey ? parseInt(successKey) : 200);
          });
      } catch (err) { console.error(`Failed to process path: ${path}`, err); }
    });
    this.save();
  }
}

export const store = new MockStore();