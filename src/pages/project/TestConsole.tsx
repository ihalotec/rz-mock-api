
import React, { useState, useEffect } from 'react';
import { Play, Loader2, FileJson } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [urlPath, setUrlPath] = useState(endpoint.path);
  const [requestBody, setRequestBody] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    setUrlPath(endpoint.path);
    setResponse(null);
    setStatus(null);
    setDebugInfo(null);
    setRequestBody('');
  }, [endpoint]);

  const handleTest = async () => {
    if (project.status === 'stopped') {
        setResponse({ error: "Mock server is stopped. Please start the server from the sidebar." });
        return;
    }

    setLoading(true);
    setResponse(null);
    setStatus(null);
    setDebugInfo(null);

    // Simulate Network Latency
    setTimeout(() => {
        const match = store.findMatch(project.id, endpoint.method, urlPath, requestBody);
        
        if (match) {
            // Apply configured delay
            setTimeout(() => {
                setStatus(match.response.statusCode);
                setDebugInfo(`Strategy: ${match.matchedStrategy} | Response: ${match.response.name}`);
                try {
                    setResponse(JSON.parse(match.response.body));
                } catch (e) {
                    setResponse(match.response.body);
                }
                setLoading(false);
            }, match.response.delay || 100);
        } else {
            setStatus(404);
            setResponse({ error: "No mock response found for this path/method combination." });
            setLoading(false);
        }
    }, 300);
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
