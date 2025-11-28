import React, { useEffect, useState, useMemo } from 'react';
import { MockEndpoint, MockResponse, ResponseStrategy, SwaggerDocs } from '../../lib/types';
import { store } from '../../lib/store';
import { useResponses } from '../../hooks/useStoreData';
import { resolveRefs, METHOD_COLORS, cn } from '../../lib/utils';
import { Badge } from '../../components/ui/Badge';
import { ResponseEditor } from './ResponseEditor';
import { Save, Plus, Trash2, Split, Flag, Shuffle, FileText, Settings, Tag, Check, Copy, Database, Code, Sliders, Layers, GitBranch } from 'lucide-react';

interface EndpointViewerProps {
  endpoint: MockEndpoint;
}

const JsonViewer = ({ data }: { data: any }) => {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <div className="bg-[#0f1117] p-3 rounded border border-gray-800 overflow-auto max-h-[300px] custom-scrollbar">
        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">{text}</pre>
      </div>
      <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-800/80 rounded-md text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

const EndpointViewer = ({ endpoint }: EndpointViewerProps) => {
  const responses = useResponses(endpoint.id);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'mock'>('docs');
  const [mockSubTab, setMockSubTab] = useState<'general' | 'responses'>('general');
  
  const project = store.getProject(endpoint.projectId);

  const resolvedDocs = useMemo<SwaggerDocs | undefined>(() => {
      if (!endpoint.docs) return undefined;
      if (project?.components) {
          const root = { components: project.components };
          return resolveRefs(endpoint.docs, root);
      }
      return endpoint.docs;
  }, [endpoint.docs, project?.components]);

  useEffect(() => {
    if (responses.length > 0) {
        if (!selectedResponseId || !responses.find(r => r.id === selectedResponseId)) {
             setSelectedResponseId(responses[0].id);
        }
    } else {
        // Create default if none exist (rare edge case with hook loading)
        if (responses.length === 0) store.createResponse(endpoint.id, 'Default 200', '{}', 200);
    }
  }, [responses, selectedResponseId, endpoint.id]);

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const updated = { ...endpoint, responseStrategy: e.target.value as ResponseStrategy };
      store.updateEndpoint(updated);
  };

  const handleCreateResponse = () => {
      const newRes = store.createResponse(endpoint.id, `Response ${responses.length + 1}`, '{}', 200);
      setSelectedResponseId(newRes.id);
  };

  const handleDeleteResponse = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Delete this response?')) store.deleteResponse(id);
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      store.updateEndpoint({ ...endpoint, defaultResponseId: id });
  };

  const selectedResponse = responses.find(r => r.id === selectedResponseId);

  return (
    <div className="flex flex-col h-full bg-background custom-scrollbar overflow-y-auto">
        <div className="p-8 pb-32 max-w-6xl mx-auto w-full">
            <div className="mb-6">
                <div className="flex items-center gap-3 overflow-hidden mb-4">
                    <span className={cn("px-3 py-1 rounded text-sm font-bold border shrink-0", METHOD_COLORS[endpoint.method])}>
                        {endpoint.method}
                    </span>
                    <h1 className="text-2xl font-bold text-white tracking-tight break-all">{endpoint.path}</h1>
                </div>
                <div className="text-gray-400 text-sm leading-relaxed">
                    {resolvedDocs?.description || endpoint.description || "No description available for this endpoint."}
                </div>
            </div>

            <div className="flex items-center gap-6 border-b border-gray-800 mb-8">
                <button onClick={() => setActiveTab('docs')} className={cn("pb-3 text-sm font-medium transition-colors relative", activeTab === 'docs' ? "text-primary" : "text-gray-400 hover:text-gray-200")}>
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Documentation</div>
                    {activeTab === 'docs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button onClick={() => setActiveTab('mock')} className={cn("pb-3 text-sm font-medium transition-colors relative", activeTab === 'mock' ? "text-primary" : "text-gray-400 hover:text-gray-200")}>
                    <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Mock Configuration</div>
                    {activeTab === 'mock' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
            </div>

            {activeTab === 'docs' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="space-y-8">
                        {resolvedDocs?.parameters && resolvedDocs.parameters.length > 0 && (
                            <div>
                                 <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center"><Split className="w-3 h-3 mr-2" /> Parameters</h3>
                                 <div className="border border-gray-800 rounded-lg overflow-hidden">
                                     <table className="w-full text-left text-sm text-gray-400">
                                         <thead className="bg-gray-900 text-gray-500 font-medium text-xs uppercase">
                                             <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">In</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Desc</th></tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-800 bg-[#0f1117]">
                                             {resolvedDocs.parameters.map((param, idx) => (
                                                 <tr key={idx}>
                                                     <td className="px-4 py-2 font-mono text-white">{param.name}{param.required && <span className="text-red-500 ml-1">*</span>}</td>
                                                     <td className="px-4 py-2">{param.in}</td>
                                                     <td className="px-4 py-2 text-primary">{param.schema?.type || 'string'}</td>
                                                     <td className="px-4 py-2 text-xs max-w-[150px] truncate" title={param.description}>{param.description || '-'}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                            </div>
                        )}
                        {resolvedDocs?.requestBody && (
                            <div>
                                 <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center"><Code className="w-3 h-3 mr-2" /> Request Body</h3>
                                 <div className="bg-[#16181d] border border-gray-800 rounded-lg p-3">
                                     <JsonViewer data={resolvedDocs.requestBody.content?.['application/json']?.example || resolvedDocs.requestBody.content?.['application/json']?.schema || {}} />
                                 </div>
                            </div>
                        )}
                    </div>
                    <div>
                         <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center"><Database className="w-3 h-3 mr-2" /> Response Examples</h3>
                         <div className="space-y-4">
                             {resolvedDocs?.responses && Object.entries(resolvedDocs.responses).map(([code, detail]) => (
                                 <div key={code} className="bg-[#16181d] border border-gray-800 rounded-lg overflow-hidden">
                                     <div className="px-3 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                                         <div className="flex items-center gap-2"><Badge variant={parseInt(code) < 300 ? 'success' : 'danger'} className="text-[10px]">{code}</Badge><span className="text-xs text-gray-400">{detail.description}</span></div>
                                     </div>
                                     {detail.content?.['application/json']?.example && <div className="p-2"><JsonViewer data={detail.content['application/json'].example} /></div>}
                                 </div>
                             ))}
                             {(!resolvedDocs?.responses || Object.keys(resolvedDocs.responses).length === 0) && <div className="text-gray-500 text-xs italic p-4 border border-gray-800 rounded bg-[#16181d]">No documented responses.</div>}
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'mock' && (
                <div className="animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-1">
                        <button onClick={() => setMockSubTab('general')} className={cn("flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-md transition-colors", mockSubTab === 'general' ? "bg-[#16181d] text-white border-t border-x border-gray-800" : "text-gray-500 hover:text-gray-300")}>
                            <Sliders className="w-3 h-3" /> General Settings
                        </button>
                        <button onClick={() => setMockSubTab('responses')} className={cn("flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-t-md transition-colors", mockSubTab === 'responses' ? "bg-[#16181d] text-white border-t border-x border-gray-800" : "text-gray-500 hover:text-gray-300")}>
                            <Layers className="w-3 h-3" /> Responses & Matching
                        </button>
                    </div>

                    {mockSubTab === 'general' && (
                        <div className="bg-[#16181d] border border-gray-800 rounded-lg p-6 max-w-2xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-gray-800 rounded-lg text-gray-300">
                                    {endpoint.responseStrategy === 'RANDOM' && <Shuffle className="w-6 h-6" />}
                                    {endpoint.responseStrategy === 'QUERY_MATCH' && <Split className="w-6 h-6" />}
                                    {endpoint.responseStrategy === 'HEADER_MATCH' && <Tag className="w-6 h-6" />}
                                    {endpoint.responseStrategy === 'DEFAULT' && <Flag className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-white mb-1">Response Strategy</h3>
                                    <p className="text-xs text-gray-400">Determines how the mock server selects a response.</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block uppercase font-semibold">Strategy Type</label>
                                <select value={endpoint.responseStrategy} onChange={handleStrategyChange} className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary">
                                    <option value="DEFAULT">Default (Fixed)</option>
                                    <option value="RANDOM">Random</option>
                                    <option value="QUERY_MATCH">Match Request (Conditional)</option>
                                    <option value="HEADER_MATCH">Header Match</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {mockSubTab === 'responses' && (
                        <div className="flex gap-6 items-start min-h-[600px]">
                            <div className="w-64 shrink-0 flex flex-col h-full border border-gray-800 rounded-lg bg-[#0f1117] overflow-hidden">
                                <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                    <span className="text-xs font-semibold text-gray-400 uppercase">Mock Responses</span>
                                    <button onClick={handleCreateResponse} className="text-gray-400 hover:text-white" title="Add Response"><Plus className="w-4 h-4" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[700px]">
                                    {responses.map(res => (
                                        <div key={res.id} onClick={() => setSelectedResponseId(res.id)} className={cn("group flex flex-col p-2 rounded-md text-sm border cursor-pointer transition-all", selectedResponseId === res.id ? "bg-gray-800 border-gray-600" : "bg-transparent border-transparent hover:bg-gray-900 hover:border-gray-800")}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-medium text-gray-300 truncate pr-2">{res.name}</div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {endpoint.responseStrategy === 'DEFAULT' && endpoint.defaultResponseId !== res.id && (
                                                        <button onClick={(e) => handleSetDefault(res.id, e)} className="text-gray-500 hover:text-primary"><Flag className="w-3 h-3" /></button>
                                                    )}
                                                    {responses.length > 1 && <button onClick={(e) => handleDeleteResponse(res.id, e)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={res.statusCode < 300 ? 'success' : 'danger'} className="px-1.5 py-0 text-[10px]">{res.statusCode}</Badge>
                                                {endpoint.defaultResponseId === res.id && <Badge variant="default" className="px-1.5 py-0 text-[10px] bg-blue-900/30 text-blue-400 border-blue-900">Default</Badge>}
                                                {(res.matchType) && <span className="text-[10px] text-gray-500 bg-gray-800 px-1 rounded">Rule</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {selectedResponse ? <ResponseEditor response={selectedResponse} endpoint={endpoint} /> : <div className="flex-1 p-8 text-gray-500 text-center">Select a response to edit.</div>}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default EndpointViewer;