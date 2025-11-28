import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export const METHOD_COLORS = {
  GET: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  POST: "text-green-400 border-green-400/30 bg-green-400/10",
  PUT: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  DELETE: "text-red-400 border-red-400/30 bg-red-400/10",
  PATCH: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

export const METHOD_BADGE_COLORS = {
  GET: "bg-blue-500",
  POST: "bg-green-500",
  PUT: "bg-orange-500",
  DELETE: "bg-red-500",
  PATCH: "bg-yellow-500",
};

// Recursively resolve Swagger $ref pointers
export function resolveRefs(obj: any, root: any, stack: string[] = []): any {
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