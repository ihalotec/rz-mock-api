

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Upload, ChevronDown, ChevronRight, Folder, Tag, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MockEndpoint } from '../../lib/types';
import { store } from '../../lib/store';
import { cn, METHOD_COLORS } from '../../lib/utils';
import { Input } from '../../components/ui/Input';

interface SidebarProps {
  endpoints: MockEndpoint[];
  selectedEndpointId?: string;
  onSelectEndpoint: (id: string) => void;
  onImportSwagger: () => void;
  onCreateEndpoint: () => void;
}

const Sidebar = ({ 
  endpoints, 
  selectedEndpointId, 
  onSelectEndpoint, 
  onImportSwagger,
  onCreateEndpoint
}: SidebarProps) => {
  const { projectId } = useParams();
  const [search, setSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  // Grouping Logic
  const groupedEndpoints = useMemo<Record<string, MockEndpoint[]>>(() => {
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

  const handleExport = () => {
      if (!projectId) return;
      try {
          const jsonString = store.exportProject(projectId);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `castlemock-backup-${projectId}-${Date.now()}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } catch (e) {
          alert("Failed to export project.");
          console.error(e);
      }
  };

  return (
    <div className="w-80 border-r border-border flex flex-col fixed left-0 top-14 bottom-0 z-20 bg-sidebar">
      <div className="p-4 border-b border-border">
         <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-sm tracking-wide text-gray-400 uppercase">Explorer</div>
             <div className="flex gap-1">
                 <Button variant="ghost" size="icon" onClick={handleExport} title="Export Project Backup" className="h-7 w-7">
                    <Download className="w-4 h-4" />
                 </Button>
                 <Button variant="ghost" size="icon" onClick={onImportSwagger} title="Import Swagger / OpenAPI" className="h-7 w-7">
                    <Upload className="w-4 h-4" />
                 </Button>
             </div>
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
                Object.entries(groupedEndpoints).map(([group, groupEndpoints]: [string, MockEndpoint[]]) => (
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
    </div>
  );
};

export default Sidebar;
