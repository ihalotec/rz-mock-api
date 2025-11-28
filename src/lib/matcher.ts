import { StoreData, MockEndpoint, MockResponse } from './types';
import { generateId } from './utils';

export interface MatchResult {
  endpoint: MockEndpoint;
  response: MockResponse;
  matchedStrategy: string;
}

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

export function findMatch(
  data: StoreData, 
  projectId: string, 
  method: string, 
  path: string, 
  requestBody?: string, 
  requestHeaders?: Record<string, string>
): MatchResult | null {
    const project = data.projects.find(p => p.id === projectId);
    
    if (!project || project.status === 'stopped') {
        // Return null implies server stopped or not found, caller handles logging
        return null; 
    }

    const endpoint = data.endpoints.find(e => e.projectId === projectId && e.method === method && e.path === path);
    if (!endpoint) return null;

    const responses = data.responses.filter(r => r.endpointId === endpoint.id);
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

    return { endpoint, response: selectedResponse, matchedStrategy };
}