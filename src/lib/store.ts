import { StoreData, Project, MockEndpoint, MockResponse, LogEntry, SwaggerDocs } from './types';
import { generateId, resolveRefs } from './utils';
import { findMatch } from './matcher';
import { parseSwagger } from './parser';

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

class MockStore {
  private data: StoreData = { ...initialData };
  private db: IDBDatabase | null = null;
  private logListeners: LogListener[] = [];
  private dataListeners: DataListener[] = [];
  private initialized = false;
  
  // Worker for heavy lifting
  private worker: Worker | null = null;
  private workerCallbacks: Map<string, (data: any) => void> = new Map();

  constructor() {
      // Initialize Worker with fallback
      this.initWorker();
  }

  private initWorker() {
      try {
          // Check if we are in an environment that supports modules and import.meta
          if (typeof import.meta !== 'undefined' && import.meta.url) {
              try {
                 // Try to construct the URL relative to the current module
                 const workerUrl = new URL('./worker.ts', import.meta.url);
                 this.worker = new Worker(workerUrl, { type: 'module' });
                 
                 this.worker.onerror = (e) => {
                      // Silent fallback on error
                      console.warn("Worker failed to load. Falling back to main thread operations.");
                      this.worker = null;
                 };

                 this.worker.onmessage = (e) => {
                      const { type, id, payload } = e.data;
                      if (this.workerCallbacks.has(id)) {
                          this.workerCallbacks.get(id)!(payload);
                          this.workerCallbacks.delete(id);
                      }
                  };
              } catch (e) {
                  // URL construction failed
                  console.debug("Could not construct worker URL, using main thread.");
                  this.worker = null;
              }
          }
      } catch (e) {
          // General failure
          this.worker = null;
      }
  }

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
                  this.syncWorker(); // Send initial data to worker
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
        this.syncWorker();
      } catch (e) {
          console.error("Failed to save to IndexedDB", e);
      }
  }

  private syncWorker() {
      if (this.worker) {
          this.worker.postMessage({ type: 'SYNC_DATA', payload: this.data });
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

  // --- Async Mock Engine ---
  
  async simulateRequest(projectId: string, method: string, path: string, requestBody?: string, requestHeaders?: Record<string, string>): Promise<{ endpoint: MockEndpoint, response: MockResponse, matchedStrategy: string } | null> {
    
    const processResult = (result: any) => {
        const start = Date.now();
        const commonLogFields = {
            id: generateId(),
            projectId,
            timestamp: start,
            method: method as any,
            path,
            requestBody,
            duration: 5,
        };

        if (!result) {
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
        } else {
            this.notifyLog({
                ...commonLogFields,
                status: result.response.statusCode,
                responseBody: result.response.body,
                responseName: result.response.name
            });
            return result;
        }
    };

    // Worker Path (if initialized)
    if (this.worker) {
        return new Promise((resolve) => {
            const reqId = generateId();
            const timeout = setTimeout(() => {
                // Timeout fallback
                resolve(null); 
            }, 5000); 

            this.workerCallbacks.set(reqId, (result: any) => {
                clearTimeout(timeout);
                resolve(processResult(result));
            });

            this.worker!.postMessage({
                type: 'FIND_MATCH',
                id: reqId,
                payload: { projectId, method, path, requestBody, requestHeaders }
            });
        });
    } 
    
    // Fallback: Main Thread (Sync)
    // This is executed if worker is null (failed to init or crash)
    const result = findMatch(this.data, projectId, method, path, requestBody, requestHeaders);
    return processResult(result);
  }

  async importSwagger(projectId: string, swaggerJson: any): Promise<void> {
    const project = this.getProject(projectId);
    if (project && swaggerJson.components) {
        project.components = swaggerJson.components;
    }
    
    // Worker Path
    if (this.worker) {
        return new Promise((resolve, reject) => {
             const reqId = generateId();
             this.workerCallbacks.set(reqId, (data: any) => {
                 if (typeof data === 'string') {
                     console.error(data);
                     reject(data);
                     return;
                 }
                 const { endpoints, responses } = data;
                 this.data.endpoints.push(...endpoints);
                 this.data.responses.push(...responses);
                 this.save();
                 resolve();
             });
    
             this.worker!.postMessage({
                 type: 'PARSE_SWAGGER',
                 id: reqId,
                 payload: { projectId, swaggerJson }
             });
        });
    }

    // Fallback: Main Thread (Sync)
    try {
        const { endpoints, responses } = parseSwagger(projectId, swaggerJson);
        this.data.endpoints.push(...endpoints);
        this.data.responses.push(...responses);
        this.save();
    } catch (e) {
        console.error("Import failed on main thread", e);
        throw e;
    }
  }
}

export const store = new MockStore();