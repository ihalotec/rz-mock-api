

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ResponseStrategy = 'DEFAULT' | 'RANDOM' | 'QUERY_MATCH';

export interface Project {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  status: 'running' | 'stopped';
}

export interface SwaggerDocs {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string; // query, path, header
    required?: boolean;
    description?: string;
    schema?: any;
  }>;
  requestBody?: {
    description?: string;
    content?: Record<string, { schema?: any; example?: any }>;
  };
  responses?: Record<string, {
    description?: string;
    content?: Record<string, { schema?: any; example?: any }>;
  }>;
}

export interface MockEndpoint {
  id: string;
  projectId: string;
  method: HttpMethod;
  path: string;
  name: string;
  description?: string;
  responseStrategy: ResponseStrategy;
  defaultResponseId?: string;
  docs?: SwaggerDocs; // New field for detailed documentation
}

export interface MockResponse {
  id: string;
  endpointId: string;
  name: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string; // JSON string
  delay: number; // ms
  matchType?: 'json' | 'regex'; 
  matchExpression?: string;
}

export interface StoreData {
  projects: Project[];
  endpoints: MockEndpoint[];
  responses: MockResponse[];
}

export interface LogEntry {
  id: string;
  projectId: string;
  timestamp: number;
  method: HttpMethod;
  path: string;
  status: number;
  duration: number;
  requestBody?: string;
  responseBody?: string;
  responseName?: string;
}