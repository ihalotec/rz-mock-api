

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Box, ArrowRight, Upload, FileJson, Link as LinkIcon, Loader2 } from 'lucide-react';
import { store } from '../../lib/store';
import { Project } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Header } from '../../components/layout/Header';
import { cn } from '../../lib/utils';

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creationMode, setCreationMode] = useState<'blank' | 'import'>('blank');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importedData, setImportedData] = useState<any>(null); // Store parsed JSON
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setProjects(store.getProjects());
  }, []);

  // Reset form when modal opens
  useEffect(() => {
      if (isModalOpen) {
          setNewProject({ name: '', description: '' });
          setCreationMode('blank');
          setImportFile(null);
          setImportUrl('');
          setImportedData(null);
          setIsProcessing(false);
      }
  }, [isModalOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (newProject.name) {
              handleCreate();
          }
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setImportFile(file);
      setImportUrl('');
      setIsProcessing(true);

      try {
          const text = await file.text();
          const json = JSON.parse(text);
          setImportedData(json);
          
          // Smart Prefill
          if (json.openapi || json.swagger) {
              // It's a Swagger file
              setNewProject({
                  name: json.info?.title || file.name.replace('.json', ''),
                  description: json.info?.description || ''
              });
          } else if (json.type === 'castlemock-lite-backup' && json.project) {
              // It's a Backup file
              setNewProject({
                  name: json.project.name + " (Imported)",
                  description: json.project.description || ''
              });
          }
      } catch (err) {
          alert("Invalid JSON file.");
          setImportFile(null);
          setImportedData(null);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleCreate = async () => {
    if (!newProject.name) return;
    setIsProcessing(true);

    try {
        let projectId = '';

        if (creationMode === 'import' && importedData) {
            // Check if it's a backup or swagger
            if (importedData.type === 'castlemock-lite-backup') {
                const importedProject = store.importProjectBackup(importedData);
                // Allow overriding name/description from form
                importedProject.name = newProject.name;
                importedProject.description = newProject.description;
                // Save specific updates
                // store.updateProject(importedProject) - not implemented, but create handles persistence. 
                // Since importProjectBackup saves, we might just need to update it if name changed.
                // For simplicity, we just use the ID returned.
                projectId = importedProject.id;
            } else {
                // Assume Swagger
                const project = store.createProject(newProject.name, newProject.description);
                store.importSwagger(project.id, importedData);
                projectId = project.id;
            }
        } else if (creationMode === 'import' && importUrl) {
             // Handle URL import at creation time
             const project = store.createProject(newProject.name, newProject.description);
             try {
                let res = await fetch(importUrl);
                if (!res.ok) {
                     const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(importUrl)}`;
                     res = await fetch(proxyUrl);
                }
                if (!res.ok) throw new Error("Failed to fetch");
                const json = await res.json();
                store.importSwagger(project.id, json);
             } catch (err) {
                 alert("Failed to import from URL. Created empty project instead.");
             }
             projectId = project.id;
        } else {
            // Blank
            const project = store.createProject(newProject.name, newProject.description);
            projectId = project.id;
        }

        setProjects(store.getProjects());
        setIsModalOpen(false);
        navigate(`/project/${projectId}`);
    } catch (e) {
        console.error(e);
        alert("An error occurred during project creation.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 pt-14">
      <Header />
      <div className="p-8 max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
            <p className="text-gray-400">Manage your mock environments.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </header>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-lg bg-gray-900/20">
            <Box className="w-16 h-16 text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-500 mb-6">Create a new project to get started with mocking.</p>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Create Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="group relative bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-all cursor-pointer overflow-hidden"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-gray-800 rounded-lg">
                    <Box className="w-6 h-6 text-gray-300" />
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${project.status === 'running' ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                    {project.status === 'running' ? 'Active' : 'Stopped'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-primary transition-colors">{project.name}</h3>
                <p className="text-sm text-gray-400 mb-4 h-10 line-clamp-2">{project.description || 'No description provided.'}</p>
                <div className="flex items-center text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
                    Manage API <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-lg shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Create New Project</h2>
              
              <div className="space-y-6">
                {/* Import Options Toggle */}
                <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Initial Content</label>
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setCreationMode('blank')}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                creationMode === 'blank' 
                                    ? "bg-primary/10 border-primary text-primary" 
                                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"
                            )}
                        >
                            <Box className="w-4 h-4" /> Blank Project
                        </button>
                        <button
                            onClick={() => setCreationMode('import')}
                            className={cn(
                                "flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2",
                                creationMode === 'import' 
                                    ? "bg-primary/10 border-primary text-primary" 
                                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500"
                            )}
                        >
                            <Upload className="w-4 h-4" /> Import API
                        </button>
                    </div>

                    {/* Import Inputs */}
                    {creationMode === 'import' && (
                        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-2">
                                    <FileJson className="w-3 h-3" /> Upload File (Swagger or Backup)
                                </label>
                                <input 
                                    type="file" 
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-gray-800 file:text-primary hover:file:bg-gray-700"
                                />
                            </div>
                            <div className="relative flex items-center">
                                <span className="w-full border-t border-gray-700"></span>
                                <span className="absolute left-1/2 -translate-x-1/2 bg-gray-900 px-2 text-[10px] text-gray-500 uppercase">OR</span>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-2">
                                    <LinkIcon className="w-3 h-3" /> Import URL
                                </label>
                                <Input 
                                    placeholder="https://api.example.com/swagger.json"
                                    value={importUrl}
                                    onChange={(e) => {
                                        setImportUrl(e.target.value);
                                        setImportFile(null);
                                        setImportedData(null);
                                    }}
                                    className="h-8 text-xs"
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Basic Info - Moved below so it can be prefilled */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-400 mb-1 block">Project Name</label>
                        <Input 
                            value={newProject.name} 
                            onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. User Service API"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-400 mb-1 block">Description</label>
                        <Textarea 
                            value={newProject.description} 
                            onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                            placeholder="Optional description..."
                            className="min-h-[60px]"
                        />
                    </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newProject.name || isProcessing}>
                    {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {creationMode === 'import' ? 'Create & Import' : 'Create Project'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
