import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MockResponse, MockEndpoint, ResponseStrategy } from '../../lib/types';
import { store } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Save, Clock, Tag, X, Sparkles, Loader2, Split } from 'lucide-react';

interface ResponseEditorProps {
  response: MockResponse;
  endpoint: MockEndpoint;
}

export const ResponseEditor = ({ response, endpoint }: ResponseEditorProps) => {
  const [data, setData] = useState<MockResponse>(response);
  const [isDirty, setIsDirty] = useState(false);
  const [headerList, setHeaderList] = useState<{id: string, key: string, value: string}[]>([]);
  const [headerMatchConfig, setHeaderMatchConfig] = useState({ key: '', value: '' });
  
  // AI
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Sync data on prop change, but only if IDs differ (prevent overwriting edits)
  useEffect(() => {
    setData(response);
    setIsDirty(false);
    
    // Parse headers
    const list = Object.entries(response.headers || {}).map(([k, v]) => ({
        id: Math.random().toString(36).substr(2, 9),
        key: k,
        value: v
    }));
    setHeaderList(list);

    // Parse Match Config if needed
    if (endpoint.responseStrategy === 'HEADER_MATCH' && response.matchExpression) {
        try {
            const parsed = JSON.parse(response.matchExpression);
            setHeaderMatchConfig({ key: parsed.key || '', value: parsed.value || '' });
        } catch {
            setHeaderMatchConfig({ key: '', value: '' });
        }
    }
  }, [response.id, endpoint.responseStrategy]);

  const handleChange = (field: keyof MockResponse, value: any) => {
      setData(prev => ({ ...prev, [field]: value }));
      setIsDirty(true);
  };

  const handleSave = () => {
      const updated = { ...data };
      if (endpoint.responseStrategy === 'HEADER_MATCH') {
          updated.matchExpression = JSON.stringify(headerMatchConfig);
          updated.matchType = 'header';
      }
      store.updateResponse(updated);
      setIsDirty(false);
  };

  const updateHeaderList = (newList: typeof headerList) => {
      setHeaderList(newList);
      const headersObj: Record<string, string> = {};
      newList.forEach(h => { if (h.key.trim()) headersObj[h.key] = h.value; });
      handleChange('headers', headersObj);
  };

  const handleGenerateAI = async () => {
    if (!aiPromptText || !process.env.API_KEY) return;
    setIsGeneratingAi(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const isRegex = data.matchType === 'regex';
        const prompt = `Generate a REST API mock matching rule. Endpoint: ${endpoint.method} ${endpoint.path}. Type: ${isRegex ? 'Regex' : 'JSON Path'}. User request: "${aiPromptText}". Output only the raw expression string.`;
        const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        let expression = res.text?.trim() || '';
        expression = expression.replace(/^```\w*\s*/, '').replace(/\s*```$/, '').trim();
        if (expression) {
            handleChange('matchExpression', expression);
            setShowAiPrompt(false);
            setAiPromptText('');
        }
    } catch (e) { console.error(e); alert("AI Generation failed"); }
    finally { setIsGeneratingAi(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden border border-gray-800 rounded-lg bg-[#16181d]">
        <div className="border-b border-gray-800 p-4 flex justify-between items-center bg-gray-900/50">
            <Input value={data.name} onChange={(e) => handleChange('name', e.target.value)} className="w-64 h-8 bg-transparent border-transparent hover:border-gray-700 focus:bg-gray-900 focus:border-gray-600 font-semibold" placeholder="Response Name"/>
            <div className="flex items-center gap-3">{isDirty && <span className="text-xs text-yellow-500 italic">Unsaved changes</span>}<Button size="sm" onClick={handleSave} disabled={!isDirty}><Save className="w-4 h-4 mr-2" /> Save</Button></div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">Status Code</label>
                    <Input type="number" value={data.statusCode} onChange={(e) => handleChange('statusCode', parseInt(e.target.value))} className="font-mono bg-gray-900/50"/>
                </div>
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">Latency (ms)</label>
                    <div className="flex gap-2">
                        <select className="w-24 rounded-md border border-gray-700 bg-gray-900 px-2 text-xs text-gray-300" value={data.delayMode || 'fixed'} onChange={(e) => handleChange('delayMode', e.target.value)}>
                            <option value="fixed">Fixed</option>
                            <option value="random">Random</option>
                        </select>
                        {data.delayMode === 'random' ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input type="number" min="0" placeholder="Min" value={data.delayMin || 0} onChange={(e) => handleChange('delayMin', parseInt(e.target.value))} className="font-mono bg-gray-900/50 text-xs"/>
                                <span className="text-gray-500">-</span>
                                <Input type="number" min="0" placeholder="Max" value={data.delayMax || 0} onChange={(e) => handleChange('delayMax', parseInt(e.target.value))} className="font-mono bg-gray-900/50 text-xs"/>
                            </div>
                        ) : (
                            <div className="relative flex-1">
                                <Clock className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
                                <Input type="number" min="0" placeholder="0" value={data.delay || 0} onChange={(e) => handleChange('delay', parseInt(e.target.value) || 0)} className="pl-9 font-mono bg-gray-900/50"/>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {endpoint.responseStrategy === 'QUERY_MATCH' && (
                <div className="mb-6 p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                    <h3 className="text-xs font-semibold text-primary uppercase mb-3 flex items-center justify-between">
                        <div className="flex items-center"><Split className="w-3 h-3 mr-2" /> Match Condition</div>
                        {(data.matchType === 'json' || data.matchType === 'regex') && (
                            <button onClick={() => setShowAiPrompt(!showAiPrompt)} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 border border-purple-500/30 bg-purple-500/10 px-2 py-1 rounded transition-all"><Sparkles className="w-3 h-3" /> Ask AI</button>
                        )}
                    </h3>
                    {showAiPrompt && (
                        <div className="mb-4 p-3 bg-purple-900/10 border border-purple-500/20 rounded-md">
                            <div className="flex gap-2">
                                <Input value={aiPromptText} onChange={(e) => setAiPromptText(e.target.value)} className="h-8 text-xs bg-gray-900 border-purple-500/30" placeholder="Describe rule..." onKeyDown={(e) => e.key === 'Enter' && handleGenerateAI()}/>
                                <Button size="sm" onClick={handleGenerateAI} disabled={!aiPromptText || isGeneratingAi} className="h-8 px-3 bg-purple-600 hover:bg-purple-500 text-white">{isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Generate'}</Button>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <div className="w-1/3">
                            <select className="w-full h-9 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-300" value={data.matchType || ''} onChange={(e) => handleChange('matchType', e.target.value)}>
                                <option value="">No Condition</option>
                                <option value="json">JSON Path</option>
                                <option value="body_json">Body Subset</option>
                                <option value="regex">Regex</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            {data.matchType === 'json' && <Input placeholder="user.role == 'admin'" className="h-9" value={data.matchExpression || ''} onChange={(e) => handleChange('matchExpression', e.target.value)}/>}
                            {data.matchType === 'regex' && <Input placeholder="^User.*" className="h-9 font-mono" value={data.matchExpression || ''} onChange={(e) => handleChange('matchExpression', e.target.value)}/>}
                            {data.matchType === 'body_json' && <Textarea placeholder='{ "key": "value" }' className="h-24 font-mono text-xs" value={data.matchExpression || ''} onChange={(e) => handleChange('matchExpression', e.target.value)}/>}
                        </div>
                    </div>
                </div>
            )}
            
            {endpoint.responseStrategy === 'HEADER_MATCH' && (
                <div className="mb-6 p-4 bg-gray-900/40 rounded-lg border border-gray-800">
                    <h3 className="text-xs font-semibold text-primary uppercase mb-3 flex items-center"><Tag className="w-3 h-3 mr-2" /> Header Match</h3>
                    <div className="flex gap-3">
                        <Input placeholder="Header Name" className="h-9" value={headerMatchConfig.key} onChange={(e) => { setHeaderMatchConfig(p => ({...p, key: e.target.value})); setIsDirty(true); }}/>
                        <Input placeholder="Expected Value" className="h-9" value={headerMatchConfig.value} onChange={(e) => { setHeaderMatchConfig(p => ({...p, value: e.target.value})); setIsDirty(true); }}/>
                    </div>
                </div>
            )}

            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500 flex items-center"><Tag className="w-3 h-3 mr-1" /> Response Headers</label>
                    <button onClick={() => updateHeaderList([...headerList, {id: Math.random().toString(), key:'', value:''}])} className="text-xs text-primary hover:text-white flex items-center">+ Add</button>
                </div>
                <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-2 space-y-2">
                    {headerList.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center group">
                            <Input className="flex-1 h-8 text-xs font-mono bg-gray-900 border-gray-700" placeholder="Key" value={item.key} onChange={(e) => updateHeaderList(headerList.map(h => h.id === item.id ? { ...h, key: e.target.value } : h))}/>
                            <Input className="flex-1 h-8 text-xs font-mono bg-gray-900 border-gray-700" placeholder="Value" value={item.value} onChange={(e) => updateHeaderList(headerList.map(h => h.id === item.id ? { ...h, value: e.target.value } : h))}/>
                            <button onClick={() => updateHeaderList(headerList.filter(h => h.id !== item.id))} className="text-gray-600 hover:text-red-400"><X className="w-4 h-4" /></button>
                        </div>
                    ))}
                    {headerList.length === 0 && <div className="text-center py-2 text-xs text-gray-600 italic">No custom headers.</div>}
                </div>
            </div>

            <div>
                <label className="text-xs text-gray-500 mb-1 block">Response Body (JSON)</label>
                <Textarea className="min-h-[300px] font-mono text-sm leading-6 resize-y bg-[#0d0e12]" value={data.body} onChange={(e) => handleChange('body', e.target.value)} spellCheck={false}/>
            </div>
        </div>
    </div>
  );
};