
import { StoreData, Project, MockEndpoint, MockResponse, LogEntry, SwaggerDocs } from './types';
import { generateId } from './utils';

const DB_NAME = 'CastleMockLiteDB';
const STORE_NAME = 'state';
const DATA_KEY = 'root';

const initialData: StoreData = {
  projects: [],
  endpoints: [],
  responses: []
};

type LogListener = (log: LogEntry) => void;

// --- Helper Functions ---

// Simple object path retrieval for JSON matching
function getObjectValue(obj: any, path: string): any {
  if (!path) return undefined;
  // Handle simple dot notation $.key.subkey or key.subkey
  const cleanPath = path.startsWith('$.') ? path.substring(2) : path;
  return cleanPath.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

// Recursively resolve Swagger $ref pointers
function resolveRefs(obj: any, root: any, stack: string[] = []): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => resolveRefs(item, root, stack));
    }

    // Check if this object is a reference
    if (obj.$ref && typeof obj.$ref === 'string') {
        const ref = obj.$ref;
        if (stack.includes(ref)) {
             // Circular detection
             return { type: 'object', description: `[Circular: ${ref.split('/').pop()}]` };
        }
        
        if (ref.startsWith('#/')) {
            const path = ref.substring(2).split('/');
            let current = root;
            for (const segment of path) {
                current = current?.[segment];
                if (current === undefined) break;
            }
            if (current !== undefined) {
                // Resolve the referenced object
                const resolved = resolveRefs(current, root, [...stack, ref]);
                // Return a new object merging the resolved content
                // If resolved is not an object (e.g. primitive), don't try to spread it
                if (resolved !== null && typeof resolved === 'object') {
                    const { $ref, ...rest } = obj;
                    return { ...resolved, ...rest };
                }
                return resolved;
            }
        }
    }

    // Recursively process keys
    const result: any = {};
    for (const key in obj) {
        result[key] = resolveRefs(obj[key], root, stack);
    }
    return result;
}

// Generate a dummy example from a schema if no example is provided
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
        if (schema.items) {
            return [generateExample(schema.items)];
        }
        return [];
    }

    if (schema.type === 'string') {
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'email') return "user@example.com";
        if (schema.format === 'uuid') return "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        if (schema.enum && schema.enum.length > 0) return schema.enum[0];
        return "string";
    }

    if (schema.type === 'integer' || schema.type === 'number') {
        return 0;
    }

    if (schema.type === 'boolean') {
        return true;
    }

    return "unknown";
}


class MockStore {
  private data: StoreData = { ...initialData };
  private db: IDBDatabase | null = null;
  private listeners: LogListener[] = [];
  private initialized = false;

  // Initialize IndexedDB
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
          req.onerror = () => {
              // Ignore error, use initial data
              resolve();
          };
      });
  }

  private save() {
      if (!this.db) return;
      // Fire and forget save to DB
      try {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(this.data, DATA_KEY);
      } catch (e) {
          console.error("Failed to save to IndexedDB", e);
      }
  }

  // --- Event System for Logs ---
  subscribeToLogs(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyLog(log: LogEntry) {
    this.listeners.forEach(l => l(log));
  }

  // Projects
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
      docs: {
        tags: ['Custom']
      }
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
      delay: 0
    };
    this.data.responses.push(newResponse);
    
    // Set as default if it's the first one
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

  // Mock Engine Logic
  findMatch(projectId: string, method: string, path: string, requestBody?: string): { endpoint: MockEndpoint, response: MockResponse, matchedStrategy: string } | null {
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

    const endpoint = this.data.endpoints.find(e => 
      e.projectId === projectId && 
      e.method === method && 
      e.path === path
    );

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
        else if (endpoint.responseStrategy === 'QUERY_MATCH' && requestBody) {
            selectedResponse = responses.find(r => {
                if (!r.matchType || !r.matchExpression) return false;

                if (r.matchType === 'regex') {
                    try {
                        const regex = new RegExp(r.matchExpression);
                        return regex.test(requestBody);
                    } catch (e) { return false; }
                }
                
                if (r.matchType === 'json') {
                    try {
                        const jsonBody = JSON.parse(requestBody);
                        const parts = r.matchExpression.split('==');
                        const path = parts[0].trim();
                        const expectedValue = parts.length > 1 ? parts[1].trim().replace(/['"]/g, '') : undefined;
                        const actualValue = getObjectValue(jsonBody, path);

                        if (expectedValue !== undefined) {
                            return String(actualValue) === expectedValue;
                        } else {
                            return actualValue !== undefined;
                        }
                    } catch (e) { return false; }
                }
                return false;
            });
        }

        if (!selectedResponse) {
            matchedStrategy = 'FALLBACK (Default)';
            if (endpoint.defaultResponseId) {
                selectedResponse = responses.find(r => r.id === endpoint.defaultResponseId);
            }
            if (!selectedResponse) {
                selectedResponse = responses[0];
            }
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
    
    const resolve = (obj: any) => resolveRefs(obj, swaggerJson);

    // To prevent blocking UI on huge files, we process in chunks or just handle errors gracefully.
    // Since this runs in client, heavy processing will freeze. 
    // For now we process synchronously but wrapped in try-catch blocks per endpoint to avoid total failure.

    Object.keys(paths).forEach(path => {
      try {
          const methods = paths[path];
          Object.keys(methods).forEach(methodKey => {
            const method = methodKey.toUpperCase();
            if (method === 'PARAMETERS') return; 

            const details = methods[methodKey];
            
            const resolvedParameters = (details.parameters || []).map((p: any) => resolve(p));
            const resolvedRequestBody = details.requestBody ? resolve(details.requestBody) : undefined;
            const resolvedResponses = details.responses ? resolve(details.responses) : undefined;

            const docs: SwaggerDocs = {
                summary: details.summary,
                description: details.description,
                tags: details.tags || [],
                parameters: resolvedParameters,
                requestBody: resolvedRequestBody,
                responses: resolvedResponses
            };

            const newEndpoint: MockEndpoint = {
              id: generateId(),
              projectId,
              method: method as any,
              path,
              name: details.summary || details.operationId || `${method} ${path}`,
              description: details.description,
              responseStrategy: 'DEFAULT',
              docs
            };
            this.data.endpoints.push(newEndpoint);

            // Generate Mock Response
            let responseBody = '{}';
            const successKey = Object.keys(resolvedResponses || {}).find(k => k.startsWith('2'));
            const successResponse = successKey ? resolvedResponses[successKey] : null;

            if (successResponse) {
                const jsonContent = successResponse.content?.['application/json'];
                
                if (jsonContent) {
                    if (jsonContent.example) {
                        responseBody = JSON.stringify(jsonContent.example, null, 2);
                    } else if (jsonContent.schema) {
                        try {
                            const generated = generateExample(jsonContent.schema);
                            responseBody = JSON.stringify(generated, null, 2);
                        } catch (genErr) {
                            console.warn(`Failed to generate example for ${method} ${path}`, genErr);
                            responseBody = '{}';
                        }
                    }
                }
            }

            const newResponse: MockResponse = {
                id: generateId(),
                endpointId: newEndpoint.id,
                name: successKey ? `${successKey} Response` : "Default 200",
                statusCode: successKey ? parseInt(successKey) : 200,
                headers: { "Content-Type": "application/json" },
                body: responseBody,
                delay: 0
            };
            this.data.responses.push(newResponse);
            newEndpoint.defaultResponseId = newResponse.id;
          });
      } catch (err) {
          console.error(`Failed to process path: ${path}`, err);
      }
    });
    
    this.save();
  }
}

export const store = new MockStore();
