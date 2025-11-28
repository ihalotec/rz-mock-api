import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import EndpointViewer from './EndpointViewer';
import TestConsole from './TestConsole';
import LogMonitor from './LogMonitor';
import { store } from '../../lib/store';
import { useProject, useEndpoints } from '../../hooks/useStoreData';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FloatingPanel } from '../../components/ui/FloatingPanel';
import { Header } from '../../components/layout/Header';
import { PlayCircle, Activity, Upload, Link as LinkIcon, FileJson, Loader2 } from 'lucide-react';

const ProjectLayout = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const endpoints = useEndpoints(projectId);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  
  // Floating Window States
  const [showTestConsole, setShowTestConsole] = useState(true);
  const [testConsoleMinimized, setTestConsoleMinimized] = useState(true);

  const [showLogs, setShowLogs] = useState(false);
  const [logsMinimized, setLogsMinimized] = useState(false);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [newEndpoint, setNewEndpoint] = useState({ name: '', path: '/', method: 'GET' });

  // Handle direct navigation to invalid projects
  if (projectId && project === undefined) {
      // Still loading or not found. If we implement proper loading state in hook, we can show spinner.
      // For now, if endpoints load and project is missing, it's 404.
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const result = evt.target?.result;
              if (typeof result !== 'string') throw new Error("Failed to read file");
              const json = JSON.parse(result);
              if (projectId) {
                  store.importSwagger(projectId, json);
                  setIsImportModalOpen(false);
              }
          } catch (err: any) {
              console.error("Import failed:", err);
              alert(`Import failed: ${err.message}`);
          }
      };
      reader.readAsText(file);
  };

  const handleUrlImport = async () => {
      if (!importUrl) return;
      setIsImporting(true);
      try {
          let response;
          try {
              response = await fetch(importUrl);
              if (!response.ok) throw new Error(`Status ${response.status}`);
          } catch (directError) {
              const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(importUrl)}`;
              response = await fetch(proxyUrl);
          }
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const json = await response.json();
          if (projectId) {
              store.importSwagger(projectId, json);
              setIsImportModalOpen(false);
              setImportUrl('');
          }
      } catch (e: any) {
          console.error("URL Import failed:", e);
          alert(`Failed to import: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
  };

  const handleToggleServer = () => {
      if (project) {
          store.updateProjectStatus(project.id, project.status === 'running' ? 'stopped' : 'running');
      }
  };

  const handleCreateEndpoint = () => {
      if(projectId && newEndpoint.name && newEndpoint.path) {
          const ep = store.createEndpoint(projectId, newEndpoint.method, newEndpoint.path, newEndpoint.name);
          store.createResponse(ep.id, "Success", "{}", 200);
          setSelectedEndpointId(ep.id);
          setIsCreateModalOpen(false);
          setNewEndpoint({ name: '', path: '/', method: 'GET' });
      }
  };

  if (!project) return <div className="p-10 text-white flex items-center gap-2"><Loader2 className="animate-spin"/> Loading Project...</div>;

  const selectedEndpoint = endpoints.find(e => e.id === selectedEndpointId);

  return (
    <div className="flex h-screen overflow-hidden relative bg-background pt-14">
      <Header project={project} onToggleServer={handleToggleServer} />

      <Sidebar 
        endpoints={endpoints} 
        selectedEndpointId={selectedEndpointId || undefined}
        onSelectEndpoint={setSelectedEndpointId}
        onImportSwagger={() => setIsImportModalOpen(true)}
        onCreateEndpoint={() => setIsCreateModalOpen(true)}
      />
      
      <main className="flex-1 ml-80 flex bg-background relative z-10">
        {selectedEndpoint ? (
            <>
                <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-3.5rem)]">
                    {/* Using key to force re-mount when ID changes ensures state reset in viewer */}
                    <EndpointViewer key={selectedEndpoint.id} endpoint={selectedEndpoint} />
                    
                    <div className="h-10 border-t border-border bg-[#16181d] flex items-center px-4 gap-4 shrink-0">
                        <button 
                            onClick={() => { setShowTestConsole(true); setTestConsoleMinimized(false); }}
                            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded transition-colors ${showTestConsole && !testConsoleMinimized ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'}`}
                        >
                            <PlayCircle className="w-4 h-4" /> Test Console
                        </button>
                        <button 
                            onClick={() => { setShowLogs(true); setLogsMinimized(false); }}
                            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded transition-colors ${showLogs && !logsMinimized ? 'bg-success/20 text-success' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Activity className="w-4 h-4" /> Log Monitor
                        </button>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                <h2 className="text-xl font-semibold mb-2">Welcome to {project.name}</h2>
                <p>Select an endpoint from the sidebar or import a Swagger file.</p>
                <Button className="mt-4" onClick={() => setIsImportModalOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" /> Import Swagger
                </Button>
            </div>
        )}
      </main>

      {selectedEndpoint && (
        <>
            <FloatingPanel 
                title="Test Console" 
                isOpen={showTestConsole}
                isMinimized={testConsoleMinimized}
                onClose={() => setShowTestConsole(false)}
                onMinimize={() => setTestConsoleMinimized(!testConsoleMinimized)}
                initialPosition={{ x: window.innerWidth - 450, y: 80 }}
                initialSize={{ w: 400, h: 500 }}
                icon={<PlayCircle className="w-4 h-4 text-white" />}
                colorClass="bg-primary"
            >
                <TestConsole endpoint={selectedEndpoint} project={project} />
            </FloatingPanel>

            <FloatingPanel 
                title="Log Monitor" 
                isOpen={showLogs}
                isMinimized={logsMinimized}
                onClose={() => setShowLogs(false)}
                onMinimize={() => setLogsMinimized(!logsMinimized)}
                initialPosition={{ x: window.innerWidth - 450, y: 600 }}
                initialSize={{ w: 400, h: 300 }}
                icon={<Activity className="w-4 h-4 text-white" />}
                colorClass="bg-success"
            >
                <LogMonitor projectId={project.id} />
            </FloatingPanel>
        </>
      )}

      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
             <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl">
                 <h2 className="text-lg font-bold text-white mb-4">Create Endpoint</h2>
                 <div className="space-y-4">
                     <div>
                         <label className="text-xs text-gray-400 mb-1 block">Name</label>
                         <Input 
                            value={newEndpoint.name}
                            onChange={(e) => setNewEndpoint({...newEndpoint, name: e.target.value})}
                            placeholder="Get Users"
                         />
                     </div>
                     <div className="flex gap-4">
                         <div className="w-1/3">
                             <label className="text-xs text-gray-400 mb-1 block">Method</label>
                             <select 
                                className="w-full h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white focus:outline-none"
                                value={newEndpoint.method}
                                onChange={(e) => setNewEndpoint({...newEndpoint, method: e.target.value})}
                             >
                                 <option value="GET">GET</option>
                                 <option value="POST">POST</option>
                                 <option value="PUT">PUT</option>
                                 <option value="DELETE">DELETE</option>
                                 <option value="PATCH">PATCH</option>
                             </select>
                         </div>
                         <div className="flex-1">
                             <label className="text-xs text-gray-400 mb-1 block">Path</label>
                             <Input 
                                value={newEndpoint.path}
                                onChange={(e) => setNewEndpoint({...newEndpoint, path: e.target.value})}
                                placeholder="/users"
                             />
                         </div>
                     </div>
                 </div>
                 <div className="flex justify-end gap-2 mt-6">
                     <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                     <Button onClick={handleCreateEndpoint}>Create</Button>
                 </div>
             </div>
          </div>
      )}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
             <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl">
                 <h2 className="text-lg font-bold text-white mb-6">Import OpenAPI / Swagger</h2>
                 <div className="space-y-6">
                     <div className="p-4 border border-dashed border-gray-700 rounded-lg bg-gray-800/30">
                         <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                             <FileJson className="w-4 h-4 mr-2" /> Upload JSON File
                         </h3>
                         <input 
                            type="file" 
                            accept=".json"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-blue-600"
                         />
                     </div>
                     <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-900 px-2 text-gray-500">Or import from URL</span>
                        </div>
                     </div>
                     <div className="p-4 border border-gray-800 rounded-lg bg-gray-800/30">
                         <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                             <LinkIcon className="w-4 h-4 mr-2" /> Import from URL
                         </h3>
                         <div className="flex gap-2">
                             <Input 
                                placeholder="https://api.example.com/swagger.json" 
                                value={importUrl}
                                onChange={(e) => setImportUrl(e.target.value)}
                             />
                             <Button onClick={handleUrlImport} disabled={!importUrl || isImporting}>
                                 {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                             </Button>
                         </div>
                     </div>
                 </div>
                 <div className="flex justify-end mt-6">
                     <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Close</Button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default ProjectLayout;