

import React, { useEffect, useState } from 'react';
import { MockEndpoint, MockResponse, ResponseStrategy } from '../../lib/types';
import { store } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { METHOD_COLORS } from '../../lib/utils';
import { Save, Clock, Plus, Trash2, Split, Flag, Shuffle, FileText, Settings, X, Tag, Check, Copy, Database, Code } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EndpointViewerProps {
  endpoint: MockEndpoint;
  onUpdate: () => void;
}

// Internal component for displaying JSON with Copy and Scroll
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
        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
          {text}
        </pre>
      </div>
      <button 
        onClick={handleCopy} 
        className="absolute top-2 right-2 p-1.5 bg-gray-800/80 backdrop-blur-sm rounded-md text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-gray-700"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
};

const EndpointViewer = ({ endpoint, onUpdate }: EndpointViewerProps) => {
  const [responses, setResponses] = useState<MockResponse[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [editResponse, setEditResponse] = useState<MockResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'mock'>('docs');
  
  // Local state for headers to ensure stable editing
  const [headerList, setHeaderList] = useState<{id: string, key: string, value: string}[]>([]);

  // Local state for Header Match configuration
  const [headerMatchConfig, setHeaderMatchConfig] = useState({ key: '', value: '' });

  useEffect(() => {
    loadData();
    setActiveTab('docs');
  }, [endpoint]);

  useEffect(() => {
    if (responses.length > 0 && !selectedResponseId) {
        setSelectedResponseId(responses[0].id);
    }
  }, [responses]);

  useEffect(() => {
    if (selectedResponseId) {
        const found = responses.find(r => r.id === selectedResponseId);
        if (found) {
            setEditResponse({ ...found });
            setIsDirty(false);
            
            // Initialize Header Config if strategy is HEADER_MATCH
            if (endpoint.responseStrategy === 'HEADER_MATCH' && found.matchExpression) {
                try {
                    const parsed = JSON.parse(found.matchExpression);
                    setHeaderMatchConfig({ key: parsed.key || '', value: parsed.value || '' });
                } catch {
                    setHeaderMatchConfig({ key: '', value: '' });
                }
            } else {
                setHeaderMatchConfig({ key: '', value: '' });
            }
        }
    }
  }, [selectedResponseId, responses, endpoint.responseStrategy]);

  // Sync editResponse headers to local list
  useEffect(() => {
    if (editResponse) {
        const list = Object.entries(editResponse.headers || {}).map(([k, v]) => ({
            id: Math.random().toString(36).substr(2, 9),
            key: k,
            value: v
        }));
        setHeaderList(list);
    }
  }, [editResponse?.id]);

  const loadData = () => {
    const loadedResponses = store.getResponses(endpoint.id);
    setResponses(loadedResponses);
    if (selectedResponseId && !loadedResponses.find(r => r.id === selectedResponseId)) {
        setSelectedResponseId(loadedResponses.length > 0 ? loadedResponses[0].id : null);
    }
    if (loadedResponses.length === 0) {
        const def = store.createResponse(endpoint.id, 'Default 200', '{}', 200);
        setResponses([def]);
        setSelectedResponseId(def.id);
    }
  };

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const updated = { ...endpoint, responseStrategy: e.target.value as ResponseStrategy };
      store.updateEndpoint(updated);
      onUpdate();
  };

  const handleCreateResponse = () => {
      const newRes = store.createResponse(endpoint.id, `Response ${responses.length + 1}`, '{}', 200);
      setResponses([...responses, newRes]);
      setSelectedResponseId(newRes.id);
  };

  const handleDeleteResponse = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Delete this response?')) {
          store.deleteResponse(id);
          loadData();
      }
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = { ...endpoint, defaultResponseId: id };
      store.updateEndpoint(updated);
      onUpdate();
  };

  const handleSave = () => {
    if (editResponse) {
      // If HEADER_MATCH, save config to matchExpression
      if (endpoint.responseStrategy === 'HEADER_MATCH') {
          editResponse.matchExpression = JSON.stringify(headerMatchConfig);
          editResponse.matchType = 'header';
      }

      store.updateResponse(editResponse);
      setIsDirty(false);
      const updatedList = responses.map(r => r.id === editResponse.id ? editResponse : r);
      setResponses(updatedList);
    }
  };

  const handleEditChange = (field: keyof MockResponse, value: any) => {
      if (editResponse) {
          setEditResponse({ ...editResponse, [field]: value });
          setIsDirty(true);
      }
  };

  const handleMatchConditionChange = (field: 'type' | 'expression', value: string) => {
      if (editResponse) {
          setEditResponse({
              ...editResponse,
              matchType: field === 'type' ? value as any : editResponse.matchType,
              matchExpression: field === 'expression' ? value : editResponse.matchExpression
          });
          setIsDirty(true);
      }
  };

  const handleHeaderMatchChange = (field: 'key' | 'value', val: string) => {
      setHeaderMatchConfig(prev => ({ ...prev, [field]: val }));
      setIsDirty(true);
  };

  // --- Headers List Management ---
  const handleHeaderListChange = (id: string, field: 'key' | 'value', val: string) => {
    const newList = headerList.map(h => h.id === id ? { ...h, [field]: val } : h);
    setHeaderList(newList);
    
    // Sync to editResponse
    const headersObj: Record<string, string> = {};
    newList.forEach(h => {
        if (h.key.trim()) headersObj[h.key] = h.value;
    });
    // We update the state but use functional update to avoid dependency loops if we depended on editResponse
    setEditResponse(prev => prev ? { ...prev, headers: headersObj } : null);
    setIsDirty(true);
  };

  const addHeaderItem = () => {
      setHeaderList([...headerList, { id: Math.random().toString(36).substr(2, 9), key: '', value: '' }]);
  };

  const removeHeaderItem = (id: string) => {
      const newList = headerList.filter(h => h.id !== id);
      setHeaderList(newList);
      const headersObj: Record<string, string> = {};
      newList.forEach(h => {
          if (h.key.trim()) headersObj[h.key] = h.value;
      });
      setEditResponse(prev => prev ? { ...prev, headers: headersObj } : null);
      setIsDirty(true);
  };


  if (!editResponse) return null;

  return (
    <div className="flex flex-col h-full bg-background custom-scrollbar overflow-y-auto">
        <div className="p-8 pb-32 max-w-6xl mx-auto w-full">
            
            {/* --- Documentation Header --- */}
            <div className="mb-6">
                <div className="flex items-center gap-3 overflow-hidden mb-4">
                    <span className={cn("px-3 py-1 rounded text-sm font-bold border shrink-0", METHOD_COLORS[endpoint.method])}>
                        {endpoint.method}
                    </span>
                    <h1 className="text-2xl font-bold text-white tracking-tight break-all">{endpoint.path}</h1>
                </div>

                <div className="text-gray-400 text-sm leading-relaxed">
                    {endpoint.docs?.description || endpoint.description || "No description available for this endpoint."}
                </div>
            </div>

            {/* --- Tabs Navigation --- */}
            <div className="flex items-center gap-6 border-b border-gray-800 mb-8">
                <button 
                    onClick={() => setActiveTab('docs')}
                    className={cn(
                        "pb-3 text-sm font-medium transition-colors relative",
                        activeTab === 'docs' ? "text-primary" : "text-gray-400 hover:text-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Documentation
                    </div>
                    {activeTab === 'docs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button 
                    onClick={() => setActiveTab('mock')}
                    className={cn(
                        "pb-3 text-sm font-medium transition-colors relative",
                        activeTab === 'mock' ? "text-primary" : "text-gray-400 hover:text-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Mock Configuration
                    </div>
                    {activeTab === 'mock' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
            </div>

            {/* --- Tab Content: Documentation --- */}
            {activeTab === 'docs' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    {/* Left Column: Parameters & Request */}
                    <div className="space-y-8">
                        {/* Parameters Table */}
                        {endpoint.docs?.parameters && endpoint.docs.parameters.length > 0 && (
                            <div>
                                 <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center">
                                    <Split className="w-3 h-3 mr-2" /> Parameters
                                 </h3>
                                 <div className="border border-gray-800 rounded-lg overflow-hidden">
                                     <table className="w-full text-left text-sm text-gray-400">
                                         <thead className="bg-gray-900 text-gray-500 font-medium text-xs uppercase">
                                             <tr>
                                                 <th className="px-4 py-2">Name</th>
                                                 <th className="px-4 py-2">In</th>
                                                 <th className="px-4 py-2">Type</th>
                                                 <th className="px-4 py-2">Desc</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-800 bg-[#0f1117]">
                                             {endpoint.docs.parameters.map((param, idx) => (
                                                 <tr key={idx}>
                                                     <td className="px-4 py-2 font-mono text-white">
                                                         {param.name} 
                                                         {param.required && <span className="text-red-500 ml-1">*</span>}
                                                     </td>
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

                        {/* Request Body */}
                        {endpoint.docs?.requestBody && (
                            <div>
                                 <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center">
                                    <Code className="w-3 h-3 mr-2" /> Request Body
                                 </h3>
                                 <div className="bg-[#16181d] border border-gray-800 rounded-lg p-3">
                                     {endpoint.docs.requestBody.description && (
                                         <div className="text-xs text-gray-400 mb-2">{endpoint.docs.requestBody.description}</div>
                                     )}
                                     <JsonViewer 
                                        data={
                                            endpoint.docs.requestBody.content?.['application/json']?.example || 
                                            endpoint.docs.requestBody.content?.['application/json']?.schema || {}
                                        } 
                                     />
                                 </div>
                            </div>
                        )}
                         {(!endpoint.docs?.requestBody && (!endpoint.docs?.parameters || endpoint.docs.parameters.length === 0)) && (
                            <div className="p-8 border border-dashed border-gray-800 rounded-lg text-center text-gray-500 text-sm">
                                No parameters or request body documented.
                            </div>
                        )}
                    </div>

                    {/* Right Column: Responses */}
                    <div>
                         <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center">
                            <Database className="w-3 h-3 mr-2" /> Response Examples
                         </h3>
                         <div className="space-y-4">
                             {endpoint.docs?.responses && Object.entries(endpoint.docs.responses).map(([code, detail]) => (
                                 <div key={code} className="bg-[#16181d] border border-gray-800 rounded-lg overflow-hidden">
                                     <div className="px-3 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                             <Badge variant={parseInt(code) < 300 ? 'success' : 'danger'} className="text-[10px]">
                                                 {code}
                                             </Badge>
                                             <span className="text-xs text-gray-400">{detail.description}</span>
                                         </div>
                                     </div>
                                     {detail.content?.['application/json']?.example && (
                                         <div className="p-2">
                                            <JsonViewer data={detail.content['application/json'].example} />
                                         </div>
                                     )}
                                     {(!detail.content?.['application/json']?.example && detail.content?.['application/json']?.schema) && (
                                         <div className="p-2 text-xs text-gray-500 italic text-center py-4">
                                             Schema available, but no example provided in docs. 
                                             <br/>Check Mock Config for generated example.
                                         </div>
                                     )}
                                 </div>
                             ))}
                             {(!endpoint.docs?.responses || Object.keys(endpoint.docs.responses).length === 0) && (
                                 <div className="text-gray-500 text-xs italic p-4 border border-gray-800 rounded bg-[#16181d]">No documented responses.</div>
                             )}
                         </div>
                    </div>
                </div>
            )}

            {/* --- Tab Content: Mock Configuration --- */}
            {activeTab === 'mock' && (
                <div className="animate-in fade-in duration-300">
                     
                     {/* Strategy Control */}
                    <div className="bg-[#16181d] border border-gray-800 rounded-lg p-4 mb-8 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-800 rounded-md text-gray-300">
                                {endpoint.responseStrategy === 'RANDOM' && <Shuffle className="w-5 h-5" />}
                                {endpoint.responseStrategy === 'QUERY_MATCH' && <Split className="w-5 h-5" />}
                                {endpoint.responseStrategy === 'HEADER_MATCH' && <Tag className="w-5 h-5" />}
                                {endpoint.responseStrategy === 'DEFAULT' && <Flag className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-200">Response Strategy</div>
                                <div className="text-xs text-gray-500">How the mock server determines which response to send.</div>
                            </div>
                        </div>
                        <select 
                            value={endpoint.responseStrategy} 
                            onChange={handleStrategyChange}
                            className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="DEFAULT">Default (Fixed)</option>
                            <option value="RANDOM">Random</option>
                            <option value="QUERY_MATCH">Match Request (Conditional)</option>
                            <option value="HEADER_MATCH">Header Match</option>
                        </select>
                    </div>

                    <div className="flex gap-6 items-start min-h-[600px]">
                        {/* Responses List Sidebar */}
                        <div className="w-64 shrink-0 flex flex-col h-full border border-gray-800 rounded-lg bg-[#0f1117] overflow-hidden">
                            <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                                <span className="text-xs font-semibold text-gray-400 uppercase">Mock Responses</span>
                                <button onClick={handleCreateResponse} className="text-gray-400 hover:text-white">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[700px]">
                                {responses.map(res => (
                                    <div 
                                        key={res.id}
                                        onClick={() => setSelectedResponseId(res.id)}
                                        className={cn(
                                            "group flex flex-col p-2 rounded-md text-sm border cursor-pointer transition-all",
                                            selectedResponseId === res.id 
                                                ? "bg-gray-800 border-gray-600" 
                                                : "bg-transparent border-transparent hover:bg-gray-900 hover:border-gray-800"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-medium text-gray-300 truncate pr-2">{res.name}</div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {endpoint.responseStrategy === 'DEFAULT' && endpoint.defaultResponseId !== res.id && (
                                                    <button 
                                                        title="Set as Default" 
                                                        onClick={(e) => handleSetDefault(res.id, e)}
                                                        className="text-gray-500 hover:text-primary"
                                                    >
                                                        <Flag className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {responses.length > 1 && (
                                                    <button 
                                                        onClick={(e) => handleDeleteResponse(res.id, e)}
                                                        className="text-gray-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={res.statusCode < 300 ? 'success' : 'danger'} className="px-1.5 py-0 text-[10px]">
                                                {res.statusCode}
                                            </Badge>
                                            {endpoint.defaultResponseId === res.id && (
                                                <Badge variant="default" className="px-1.5 py-0 text-[10px] bg-blue-900/30 text-blue-400 border-blue-900">
                                                    Default
                                                </Badge>
                                            )}
                                            {(endpoint.responseStrategy === 'QUERY_MATCH' || endpoint.responseStrategy === 'HEADER_MATCH') && res.matchType && (
                                                <span className="text-[10px] text-gray-500 bg-gray-800 px-1 rounded">
                                                    {res.matchType === 'header' ? 'Header' : res.matchType}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Editor */}
                        <div className="flex-1 flex flex-col h-full overflow-hidden border border-gray-800 rounded-lg bg-[#16181d]">
                            <div className="border-b border-gray-800 p-4 flex justify-between items-center bg-gray-900/50">
                                <Input 
                                    value={editResponse.name}
                                    onChange={(e) => handleEditChange('name', e.target.value)}
                                    className="w-64 h-8 bg-transparent border-transparent hover:border-gray-700 focus:bg-gray-900 focus:border-gray-600 font-semibold"
                                />
                                <div className="flex items-center gap-3">
                                    {isDirty && <span className="text-xs text-yellow-500 italic">Unsaved changes</span>}
                                    <Button size="sm" onClick={handleSave} disabled={!isDirty}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {/* Conditional Logic UI - Query Match */}
                                {endpoint.responseStrategy === 'QUERY_MATCH' && (
                                    <div className="mb-6 p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                                        <h3 className="text-xs font-semibold text-primary uppercase mb-3 flex items-center">
                                            <Split className="w-3 h-3 mr-2" /> Match Condition
                                        </h3>
                                        <div className="flex gap-3">
                                            <div className="w-1/3">
                                                <select 
                                                    className="w-full h-9 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-600"
                                                    value={editResponse.matchType || ''}
                                                    onChange={(e) => handleMatchConditionChange('type', e.target.value)}
                                                >
                                                    <option value="">No Condition (Fallback)</option>
                                                    <option value="json">JSON Path (Key == Value)</option>
                                                    <option value="body_json">JSON Body Subset (Partial Match)</option>
                                                    <option value="regex">Regex Body Match</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                {editResponse.matchType === 'json' && (
                                                    <Input 
                                                        placeholder="e.g. user.role == 'admin', items[0].id != 5, or just 'isActive'" 
                                                        className="h-9" 
                                                        value={editResponse.matchExpression || ''}
                                                        onChange={(e) => handleMatchConditionChange('expression', e.target.value)}
                                                    />
                                                )}
                                                {editResponse.matchType === 'regex' && (
                                                    <Input 
                                                        placeholder="e.g. ^User.*123" 
                                                        className="h-9 font-mono"
                                                        value={editResponse.matchExpression || ''}
                                                        onChange={(e) => handleMatchConditionChange('expression', e.target.value)}
                                                    />
                                                )}
                                                {editResponse.matchType === 'body_json' && (
                                                    <div className="flex flex-col gap-1">
                                                        <Textarea 
                                                            placeholder='{ "key": "value" }' 
                                                            className="h-24 font-mono text-xs"
                                                            value={editResponse.matchExpression || ''}
                                                            onChange={(e) => handleMatchConditionChange('expression', e.target.value)}
                                                        />
                                                        <span className="text-[10px] text-gray-500">Response triggers if request body contains this JSON structure.</span>
                                                    </div>
                                                )}
                                                {(!editResponse.matchType) && (
                                                    <div className="h-9 flex items-center text-xs text-gray-500 italic">This response will be used if no other conditions match.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Conditional Logic UI - Header Match */}
                                {endpoint.responseStrategy === 'HEADER_MATCH' && (
                                    <div className="mb-6 p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                                        <h3 className="text-xs font-semibold text-primary uppercase mb-3 flex items-center">
                                            <Tag className="w-3 h-3 mr-2" /> Header Match Condition
                                        </h3>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-gray-500 mb-1 block uppercase">Header Name</label>
                                                <Input 
                                                    placeholder="e.g. X-Api-Key" 
                                                    className="h-9" 
                                                    value={headerMatchConfig.key}
                                                    onChange={(e) => handleHeaderMatchChange('key', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] text-gray-500 mb-1 block uppercase">Expected Value</label>
                                                <Input 
                                                    placeholder="e.g. secret-token-123" 
                                                    className="h-9" 
                                                    value={headerMatchConfig.value}
                                                    onChange={(e) => handleHeaderMatchChange('value', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[10px] text-gray-500">
                                            This response will trigger if the request header <strong>{headerMatchConfig.key || '...'}</strong> equals <strong>{headerMatchConfig.value || '...'}</strong>.
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Status Code</label>
                                        <Input 
                                            type="number" 
                                            value={editResponse.statusCode} 
                                            onChange={(e) => handleEditChange('statusCode', parseInt(e.target.value))}
                                            className="font-mono bg-gray-900/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Latency (ms)</label>
                                        <div className="flex gap-2">
                                            <select 
                                                className="w-24 rounded-md border border-gray-700 bg-gray-900 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-600"
                                                value={editResponse.delayMode || 'fixed'}
                                                onChange={(e) => handleEditChange('delayMode', e.target.value)}
                                            >
                                                <option value="fixed">Fixed</option>
                                                <option value="random">Random</option>
                                            </select>
                                            
                                            {editResponse.delayMode === 'random' ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Input 
                                                        type="number"
                                                        min="0"
                                                        placeholder="Min"
                                                        value={editResponse.delayMin === undefined ? 0 : editResponse.delayMin}
                                                        onChange={(e) => handleEditChange('delayMin', parseInt(e.target.value) || 0)}
                                                        className="font-mono bg-gray-900/50 text-xs"
                                                    />
                                                    <span className="text-gray-500">-</span>
                                                    <Input 
                                                        type="number"
                                                        min="0"
                                                        placeholder="Max"
                                                        value={editResponse.delayMax === undefined ? 0 : editResponse.delayMax}
                                                        onChange={(e) => handleEditChange('delayMax', parseInt(e.target.value) || 0)}
                                                        className="font-mono bg-gray-900/50 text-xs"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="relative flex-1">
                                                    <Clock className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                                                    <Input 
                                                        type="number"
                                                        min="0"
                                                        placeholder="0"
                                                        value={editResponse.delay === 0 ? '' : editResponse.delay}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value);
                                                            handleEditChange('delay', isNaN(val) ? 0 : val);
                                                        }}
                                                        className="pl-9 font-mono bg-gray-900/50"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Response Headers Section */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs text-gray-500 flex items-center">
                                            <Tag className="w-3 h-3 mr-1" /> Response Headers
                                        </label>
                                        <button 
                                            onClick={addHeaderItem}
                                            className="text-xs text-primary hover:text-white flex items-center"
                                        >
                                            <Plus className="w-3 h-3 mr-1" /> Add Header
                                        </button>
                                    </div>
                                    
                                    <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-2 space-y-2">
                                        {headerList.length > 0 ? (
                                            headerList.map((item) => (
                                                <div key={item.id} className="flex gap-2 items-center group">
                                                    <Input 
                                                        className="flex-1 h-8 text-xs font-mono bg-gray-900 border-gray-700"
                                                        placeholder="Key"
                                                        value={item.key}
                                                        onChange={(e) => handleHeaderListChange(item.id, 'key', e.target.value)}
                                                    />
                                                    <Input 
                                                        className="flex-1 h-8 text-xs font-mono bg-gray-900 border-gray-700"
                                                        placeholder="Value"
                                                        value={item.value}
                                                        onChange={(e) => handleHeaderListChange(item.id, 'value', e.target.value)}
                                                    />
                                                    <button 
                                                        onClick={() => removeHeaderItem(item.id)}
                                                        className="p-1 text-gray-600 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                                        title="Remove Header"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-2 text-xs text-gray-600 italic">
                                                No custom headers defined.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Response Body (JSON)</label>
                                    <Textarea 
                                        className="min-h-[300px] font-mono text-sm leading-6 resize-y bg-[#0d0e12]" 
                                        value={editResponse.body}
                                        onChange={(e) => handleEditChange('body', e.target.value)}
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default EndpointViewer;