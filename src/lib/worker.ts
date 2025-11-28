import { findMatch } from './matcher';
import { parseSwagger } from './parser';

// State Mirror
let state = {
    projects: [] as any[],
    endpoints: [] as any[],
    responses: [] as any[]
};

self.onmessage = async (e: MessageEvent) => {
    const { type, payload, id } = e.data;

    try {
        if (type === 'SYNC_DATA') {
            state = payload;
        } 
        else if (type === 'FIND_MATCH') {
            const { projectId, method, path, requestBody, requestHeaders } = payload;
            const result = findMatch(state, projectId, method, path, requestBody, requestHeaders);
            self.postMessage({ type: 'MATCH_RESULT', id, payload: result });
        }
        else if (type === 'PARSE_SWAGGER') {
            const { projectId, swaggerJson } = payload;
            const result = parseSwagger(projectId, swaggerJson);
            self.postMessage({ type: 'PARSE_RESULT', id, payload: result });
        }
    } catch (err: any) {
        console.error("Worker Error", err);
        self.postMessage({ type: 'ERROR', id, payload: err.message });
    }
};