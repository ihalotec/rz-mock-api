

import React, { useState, useEffect } from 'react';
import { Play, Loader2, FileJson, Plus, Trash2, X, Tag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { MockEndpoint, Project } from '../../lib/types';
import { store } from '../../lib/store';
import { cn, METHOD_BADGE_COLORS } from '../../lib/utils';

interface TestConsoleProps {
  endpoint: MockEndpoint;
  project: Project;
}

const TestConsole = ({ endpoint, project }: TestConsoleProps) => {
  const [response, setResponse] = useState<any>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [urlPath, setUrlPath] = useState(endpoint.path);
  const [requestBody, setRequestBody] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  // Request Headers State
  const [requestHeaders, setRequestHeaders] = useState<{id: string, key: string, value: string}[]>([]);
  const [showHeaders, setShowHeaders] = useState(false);

  useEffect(() => {
    setUrlPath(endpoint.path);
    setResponse(null);
    setResponseHeaders({});
    setStatus(null);
    setDebugInfo(null);
    setRequestBody('');
    
    // Load headers from localStorage
    const saved = localStorage.getItem(`req_headers_${endpoint.id}`);
    if (saved) {
        try { setRequestHeaders(JSON.parse(saved)); } catch (e) { setRequestHeaders([]); }
    } else {
        setRequestHeaders([]);
    }
  }, [endpoint]);

  // Save headers to localStorage on change
  useEffect(() => {
     if (endpoint?.id) {
         localStorage.setItem(`req_headers_${endpoint.id}`, JSON.stringify(requestHeaders));
     }
  }, [requestHeaders, endpoint?.id]);

  const handleAddHeader = () => {
      setRequestHeaders([...requestHeaders, { id: Math.random().toString(36), key: '', value: '' }]);
      setShowHeaders(true);
  };

  const handleRemoveHeader = (id: string) => {
      setRequestHeaders(requestHeaders.filter(h => h.id !== id));
  };

  const handleUpdateHeader = (id: string, field: 'key' | 'value', value: string) => {
      setRequestHeaders(requestHeaders.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const handleTest = async () => {
    if (project.status === 'stopped') {
        setResponse({ error: "Mock server is stopped. Please start the server from the sidebar." });
        return;
    }

    setLoading(true);
    setResponse(null);
    setResponseHeaders({});
    setStatus(null);
    setDebugInfo(null);

    // Prepare Request Data
    const effectiveHeaders = requestHeaders.reduce((acc, h) => {
        if (h.key.trim()) acc[h.key] = h.value;
        return acc;
    }, {} as Record<string, string>);

    // Simulate Network Latency
    setTimeout(() => {
        // Pass headers to log or matcher? Currently matcher doesn't use them but we simulate the request.
        const match = store.findMatch(project.id, endpoint.method, urlPath, requestBody);
        
        if (match) {
            // Calculate Delay
            let finalDelay = match.response.delay || 0;
            if (match.response.delayMode === 'random') {
                const min = match.response.delayMin || 0;
                const max = match.response.delayMax || 1000;
                const effectiveMax = Math.max(min, max);
                finalDelay = Math.floor(Math.random() * (effectiveMax - min + 1)) + min;
            }
            
            // Apply configured delay
            setTimeout(() => {
                setStatus(match.response.statusCode);
                setResponseHeaders(match.response.headers || {});
                
                // Add note about request headers used
                const headerNote = Object.keys(effectiveHeaders).length > 0 
                    ? ` | Req Headers: ${Object.keys(effectiveHeaders).join(', ')}` 
                    : '';

                setDebugInfo(`Strategy: ${match.matchedStrategy} | Response: ${match.response.name} | Latency: ${finalDelay}ms${headerNote}`);
                try {
                    setResponse(JSON.parse(match.response.body));
                } catch (e) {
                    setResponse(match.response.body);
                }
                setLoading(false);
            }, finalDelay);
        } else {
            setStatus(404);
            setResponse({ error: "No mock response found for this path/method combination." });
            setLoading(false);
        }
    }, 100);
  };

  const showBodyInput = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);

  return (
    <div className="flex flex-col h-full bg-[#111]">
        <div className="p-3 border-b border-border bg-gray-900/50">
            <div className="flex gap-2 mb-3">
                <div className={cn("flex items-center justify-center px-3 rounded-l-md font-bold text-xs text-white", METHOD_BADGE_COLORS[endpoint.method])}>
                    {endpoint.method}
                </div>
                <div className="flex-1 bg-gray-800 rounded-r-md flex items-center px-3 text-sm font-mono text-gray-300 relative overflow-hidden">
                    <span className="text-gray-500 mr-1 select-none">/</span>
                    <Input 
                        className="bg-transparent border-0 focus:ring-0 p-0 h-auto w-full rounded-none shadow-none text-xs" 
                        value={urlPath.startsWith('/') ? urlPath.slice(1) : urlPath}
                        onChange={(e) => setUrlPath('/' + e.target.value.replace(/^\//, ''))}
                    />
                </div>
            </div>
            
            {/* Request Headers Section */}
            <div className="mb-3">
                 <div className="flex items-center justify-between mb-1">
                     <button 
                        onClick={() => setShowHeaders(!showHeaders)}
                        className="text-[10px] text-gray-500 flex items-center uppercase tracking-wider font-semibold hover:text-gray-300 transition-colors"
                     >
                        <Tag className="w-3 h-3 mr-1" /> Request Headers {requestHeaders.length > 0 && `(${requestHeaders.length})`}
                     </button>
                     <button onClick={handleAddHeader} className="text-[10px] text-primary hover:text-white flex items-center">
                        <Plus className="w-3 h-3" />
                     </button>
                 </div>
                 
                 {showHeaders && (
                     <div className="space-y-1 mb-2 bg-gray-900/30 p-2 rounded border border-gray-800">
                        {requestHeaders.length === 0 && <div className="text-[10px] text-gray-600 italic">No headers</div>}
                        {requestHeaders.map(h => (
                            <div key={h.id} className="flex gap-1">
                                <Input 
                                    className="h-6 text-[10px] px-1 bg-gray-900 border-gray-700" 
                                    placeholder="Name"
                                    value={h.key}
                                    onChange={(e) => handleUpdateHeader(h.id, 'key', e.target.value)}
                                />
                                <Input 
                                    className="h-6 text-[10px] px-1 bg-gray-900 border-gray-700" 
                                    placeholder="Value"
                                    value={h.value}
                                    onChange={(e) => handleUpdateHeader(h.id, 'value', e.target.value)}
                                />
                                <button onClick={() => handleRemoveHeader(h.id)} className="text-gray-500 hover:text-red-400">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                     </div>
                 )}
            </div>

            {showBodyInput && (
                <div className="mb-3">
                     <div className="text-[10px] text-gray-500 mb-1 flex items-center uppercase tracking-wider font-semibold">
                        <FileJson className="w-3 h-3 mr-1" /> Request Body
                     </div>
                     <Textarea 
                        className="h-20 font-mono text-xs bg-gray-900/50 border-gray-800 resize-none"
                        placeholder='{ "key": "value" }'
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                     />
                </div>
            )}

            <Button onClick={handleTest} disabled={loading} className="w-full h-8 text-xs">
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="flex items-center"><Play className="w-3 h-3 mr-2 fill-current" /> Send Request</div>}
            </Button>
        </div>

        <div className="flex-1 overflow-auto p-3 custom-scrollbar">
            {response ? (
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Response</span>
                        {status && (
                             <span className={cn(
                                 "text-[10px] px-2 py-0.5 rounded font-mono",
                                 status >= 200 && status < 300 ? "text-green-400 bg-green-900/20" : "text-red-400 bg-red-900/20"
                             )}>
                                 {status} {status === 200 ? 'OK' : 'Error'}
                             </span>
                        )}
                    </div>
                    {debugInfo && (
                        <div className="text-[9px] text-gray-500 font-mono border-l-2 border-primary/30 pl-2">
                            {debugInfo}
                        </div>
                    )}
                    
                    {/* Headers Display */}
                    {Object.keys(responseHeaders).length > 0 && (
                        <div className="bg-gray-900/30 border border-gray-800 rounded p-2">
                             <div className="text-[9px] text-gray-500 font-bold mb-1 uppercase">Response Headers</div>
                             {Object.entries(responseHeaders).map(([k, v]) => (
                                 <div key={k} className="flex justify-between text-[10px] font-mono border-b border-gray-800/50 last:border-0 py-0.5">
                                     <span className="text-gray-400">{k}:</span>
                                     <span className="text-gray-300">{v}</span>
                                 </div>
                             ))}
                        </div>
                    )}

                    <div className="bg-gray-900 rounded-md p-3 border border-gray-800 overflow-x-auto">
                        <pre className="text-xs font-mono text-gray-300">
                            {JSON.stringify(response, null, 2)}
                        </pre>
                    </div>
                 </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 text-xs opacity-50">
                    <Play className="w-8 h-8 mb-2 stroke-1" />
                    <span>Send a request to see the response</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default TestConsole;
