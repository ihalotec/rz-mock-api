import { StoreData, Project, MockEndpoint, MockResponse, LogEntry, SwaggerDocs } from './types';
import { generateId, resolveRefs } from './utils';
import { findMatch } from './matcher';

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

  getResponseCounts(projectId: string): Record<string, number> {
    const counts: Record<string, number> = {};
    const endpoints = this.getEndpoints(projectId);
    const epIds = new Set(endpoints.map(e => e.id));
    
    for (const r of this.data.responses) {
        if (epIds.has(r.endpointId)) {
            counts[r.endpointId] = (counts[r.endpointId] || 0) + 1;
        }
    }
    return counts;
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
    const result = findMatch(this.data, projectId, method, path, requestBody, requestHeaders);

    const commonLogFields = {
        id: generateId(),
        projectId,
        timestamp: start,
        method: method as any,
        path,
        requestBody,
        duration: Date.now() - start,
    };

    if (!result) {
        // If findMatch returns null, it means no project/endpoint found, OR project stopped.
        // We need to differentiate for logging, but findMatch abstraction hides details.
        // For simplicity, we check project status here briefly or assume 404/503 based on data.
        const project = this.data.projects.find(p => p.id === projectId);
        if (!project || project.status === 'stopped') {
            this.notifyLog({
                ...commonLogFields,
                status: 503,
                responseBody: JSON.stringify({ error: "Server stopped" }),
                responseName: "System Error"
            });
        } else {
             this.notifyLog({
                ...commonLogFields,
                status: 404,
                responseBody: JSON.stringify({ error: "Not Found" }),
                responseName: "System Error"
            });
        }
        return null;
    }

    this.notifyLog({
        ...commonLogFields,
        status: result.response.statusCode,
        responseBody: result.response.body,
        responseName: result.response.name
    });

    return result;
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