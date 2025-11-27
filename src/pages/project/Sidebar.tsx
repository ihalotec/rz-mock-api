
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Play, Square, Settings, ChevronLeft, ChevronDown, ChevronRight, Folder, Tag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MockEndpoint } from '../../lib/types';
import { cn, METHOD_COLORS } from '../../lib/utils';
import { Input } from '../../components/ui/Input';

interface SidebarProps {
  endpoints: MockEndpoint[];
  selectedEndpointId?: string;
  onSelectEndpoint: (id: string) => void;
  onImportSwagger: () => void;
  onToggleServer: () => void;
  isServerRunning: boolean;
  onCreateEndpoint: () => void;
}

const Sidebar = ({ 
  endpoints, 
  selectedEndpointId, 
  onSelectEndpoint, 
  onImportSwagger,
  onToggleServer,
  isServerRunning,
  onCreateEndpoint
}: SidebarProps) => {
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  
  // Grouping Logic
  const groupedEndpoints = useMemo(() => {
      const groups: Record<string, MockEndpoint[]> = {};
      const filtered = endpoints.filter(e => 
        e.name.toLowerCase().includes(search.toLowerCase()) || 
        e.path.toLowerCase().includes(search.toLowerCase())
      );

      filtered.forEach(ep => {
          // Priority 1: Swagger Tags
          let groupName = 'General';
          
          if (ep.docs?.tags && ep.docs.tags.length > 0) {
              groupName = ep.docs.tags[0];
          } else {
              // Priority 2: First Path Segment
              const parts = ep.path.split('/').filter(p => p);
              if (parts.length > 0) {
                  const segment = parts[0];
                  // Capitalize
                  groupName = segment.charAt(0).toUpperCase() + segment.slice(1);
              }
          }
          
          if (!groups[groupName]) groups[groupName] = [];
          groups[groupName].push(ep);
      });

      // Sort keys
      return Object.keys(groups).sort().reduce((acc, key) => {
          acc[key] = groups[key];
          return acc;
      }, {} as Record<string, MockEndpoint[]>);
  }, [endpoints, search]);

  const toggleGroup = (group: string) => {
      setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="w-80 h-screen bg-sidebar border-r border-border flex flex-col fixed left-0 top-0 z-20">
      <div className="p-4 border-b border-border">
         <button 
            onClick={() => navigate('/')}
            className="flex items-center text-xs text-gray-500 hover:text-white mb-4 transition-colors"
         >
            <ChevronLeft className="w-3 h-3 mr-1" /> Back to Dashboard
         </button>
         <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-lg tracking-wide text-white">API References</div>
             <Button variant="ghost" size="icon" onClick={onImportSwagger} title="Import Swagger / OpenAPI">
                <Upload className="w-4 h-4" />
             </Button>
         </div>
         <div className="flex gap-2 mb-2">
            <Button 
                variant={isServerRunning ? "danger" : "secondary"} 
                className={cn("w-full justify-center text-xs h-8", isServerRunning && "bg-red-500/10 text-red-500 border-red-900")}
                onClick={onToggleServer}
            >
                {isServerRunning ? <Square className="w-3 h-3 mr-2 fill-current" /> : <Play className="w-3 h-3 mr-2 fill-current" />}
                {isServerRunning ? 'Stop Server' : 'Run Mock Server'}
            </Button>
         </div>
         <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
             <Input 
                placeholder="Search endpoints..." 
                className="pl-9 h-9 bg-gray-900/50 border-gray-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-2 py-4 space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collections</span>
                <button onClick={onCreateEndpoint} className="text-gray-500 hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            
            {Object.keys(groupedEndpoints).length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-sm">
                    No endpoints found.
                </div>
            ) : (
                Object.entries(groupedEndpoints).map(([group, groupEndpoints]) => (
                    <div key={group} className="mb-2">
                        <button 
                            onClick={() => toggleGroup(group)}
                            className="w-full flex items-center px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md transition-colors"
                        >
                            {collapsedGroups[group] ? <ChevronRight className="w-3 h-3 mr-1.5" /> : <ChevronDown className="w-3 h-3 mr-1.5" />}
                            {groupEndpoints[0]?.docs?.tags?.includes(group) ? (
                                <Tag className="w-3 h-3 mr-2 opacity-70 text-primary" />
                            ) : (
                                <Folder className="w-3 h-3 mr-2 opacity-70" />
                            )}
                            {group}
                            <span className="ml-auto text-[10px] bg-gray-800 text-gray-500 px-1.5 rounded-full">{groupEndpoints.length}</span>
                        </button>
                        
                        {!collapsedGroups[group] && (
                            <div className="pl-2 mt-1 space-y-0.5 border-l border-gray-800 ml-3">
                                {groupEndpoints.map(endpoint => (
                                    <button
                                        key={endpoint.id}
                                        onClick={() => onSelectEndpoint(endpoint.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all group relative",
                                            selectedEndpointId === endpoint.id 
                                                ? "bg-primary/10 text-primary border-l-2 border-primary" 
                                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase w-8 text-left",
                                            METHOD_COLORS[endpoint.method].split(' ')[0] // Just take the text color
                                        )}>
                                            {endpoint.method}
                                        </span>
                                        <span className="truncate flex-1 text-left text-xs">{endpoint.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>

      <div className="p-4 border-t border-border">
          <div className="text-xs text-gray-600 flex justify-between">
              <span>CastleMock Lite v1.0</span>
              <Settings className="w-3 h-3" />
          </div>
      </div>
    </div>
  );
};

export default Sidebar;
