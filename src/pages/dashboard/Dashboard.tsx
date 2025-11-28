import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Box, ArrowRight } from 'lucide-react';
import { useProjects } from '../../hooks/useStoreData';
import { Button } from '../../components/ui/Button';
import { Header } from '../../components/layout/Header';
import { CreateProjectModal } from '../../components/modals/CreateProjectModal';

const Dashboard = () => {
  const projects = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

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

        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </div>
  );
};

export default Dashboard;