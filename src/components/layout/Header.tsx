
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Book, LayoutDashboard, Play, Square, ChevronLeft, Box } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Project } from '../../lib/types';

interface HeaderProps {
  project?: Project;
  onToggleServer?: () => void;
}

export const Header = ({ project, onToggleServer }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDocs = location.pathname === '/docs';

  return (
    <header className="h-14 bg-[#0f1117] border-b border-gray-800 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-6">
        <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
        >
            <div className="bg-primary/20 p-1.5 rounded-md">
                <Box className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white hidden sm:block">CastleMock Lite</span>
        </div>

        <nav className="flex items-center gap-1">
            <Button 
                variant="ghost" 
                size="sm" 
                className={cn("text-gray-400 hover:text-white", isDocs && "text-white bg-gray-800")}
                onClick={() => navigate('/docs')}
            >
                <Book className="w-4 h-4 mr-2" />
                Documentation
            </Button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {project && (
            <>
                <div className="hidden md:flex items-center text-sm text-gray-400 border-r border-gray-800 pr-4 mr-1">
                    <span className="font-medium text-white mr-2">{project.name}</span>
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                        project.status === 'running' ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"
                    )}>
                        {project.status === 'running' ? 'Active' : 'Stopped'}
                    </span>
                </div>

                {onToggleServer && (
                    <Button 
                        variant={project.status === 'running' ? "danger" : "success"} 
                        size="sm"
                        className={cn(
                            "w-32", 
                            project.status === 'running' ? "bg-red-500/10 text-red-500 border-red-900 hover:bg-red-500/20" : "bg-green-600 hover:bg-green-500 text-white border-transparent"
                        )}
                        onClick={onToggleServer}
                    >
                        {project.status === 'running' ? (
                            <>
                                <Square className="w-3 h-3 mr-2 fill-current" /> Stop Server
                            </>
                        ) : (
                            <>
                                <Play className="w-3 h-3 mr-2 fill-current" /> Run Server
                            </>
                        )}
                    </Button>
                )}
            </>
        )}
      </div>
    </header>
  );
};
