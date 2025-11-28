import { resolveRefs, generateId } from './utils';
import { SwaggerDocs, MockEndpoint, MockResponse } from './types';

// Helper for generating examples
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

export function parseSwagger(projectId: string, swaggerJson: any): { endpoints: MockEndpoint[], responses: MockResponse[] } {
    const endpoints: MockEndpoint[] = [];
    const responses: MockResponse[] = [];
    
    const paths = swaggerJson.paths || {};
    const resolveForExample = (obj: any) => resolveRefs(obj, swaggerJson);

    Object.keys(paths).forEach(path => {
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

            const endpointId = generateId();
            const newEndpoint: MockEndpoint = {
                id: endpointId,
                projectId,
                method: method as any,
                path,
                name: details.summary || details.operationId || `${method} ${path}`,
                description: details.description,
                responseStrategy: 'DEFAULT',
                docs: docs,
                defaultResponseId: undefined
            };

            let responseBody = '{}';
            const successKey = Object.keys(details.responses || {}).find(k => k.startsWith('2'));
            let successResponse = successKey ? details.responses[successKey] : null;
            let successResponseId = undefined;

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

            if (successKey || successResponse) {
                const resId = generateId();
                successResponseId = resId;
                responses.push({
                    id: resId,
                    endpointId: newEndpoint.id,
                    name: successKey ? `${successKey} Response` : "Default 200",
                    statusCode: successKey ? parseInt(successKey) : 200,
                    headers: { "Content-Type": "application/json" },
                    body: responseBody,
                    delay: 0,
                    delayMode: 'fixed'
                });
            } else {
                // Create a default empty response if none found
                 const resId = generateId();
                 successResponseId = resId;
                 responses.push({
                    id: resId,
                    endpointId: newEndpoint.id,
                    name: "Default 200",
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                    delay: 0,
                    delayMode: 'fixed'
                });
            }
            
            newEndpoint.defaultResponseId = successResponseId;
            endpoints.push(newEndpoint);
        });
    });

    return { endpoints, responses };
}