import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Upload, ChevronDown, ChevronRight, Folder, Tag, Download, Layers } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MockEndpoint } from '../../lib/types';
import { store } from '../../lib/store';
import { cn, METHOD_COLORS } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface SidebarProps {
  endpoints: MockEndpoint[];
  selectedEndpointId?: string;
  onSelectEndpoint: (id: string) => void;
  onImportSwagger: () => void;
  onCreateEndpoint: () => void;
}

// Helper types for virtualization
type RowItem = 
    | { type: 'group'; name: string; count: number; isExpanded: boolean }
    | { type: 'endpoint'; data: MockEndpoint; responseCount: number };

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
  
  const responseCounts = useMemo(() => {
      if (!projectId) return {};
      return store.getResponseCounts(projectId);
  }, [endpoints, projectId]);

  // Grouping Logic
  const groupedEndpoints = useMemo<Record<string, MockEndpoint[]>>(() => {
      const groups: Record<string, MockEndpoint[]> = {};
      const filtered = endpoints.filter(e => 
        e.name.toLowerCase().includes(search.toLowerCase()) || 
        e.path.toLowerCase().includes(search.toLowerCase())
      );

      filtered.forEach(ep => {
          let groupName = 'General';
          if (ep.docs?.tags && ep.docs.tags.length > 0) {
              groupName = ep.docs.tags[0];
          } else {
              const parts = ep.path.split('/').filter(p => p);
              if (parts.length > 0) {
                  const segment = parts[0];
                  groupName = segment.charAt(0).toUpperCase() + segment.slice(1);
              }
          }
          if (!groups[groupName]) groups[groupName] = [];
          groups[groupName].push(ep);
      });

      return Object.keys(groups).sort().reduce((acc, key) => {
          acc[key] = groups[key];
          return acc;
      }, {} as Record<string, MockEndpoint[]>);
  }, [endpoints, search]);

  // Flatten logic for virtualization
  const flattenedItems = useMemo<RowItem[]>(() => {
      const items: RowItem[] = [];
      Object.entries(groupedEndpoints).forEach(([groupName, eps]) => {
          const isCollapsed = collapsedGroups[groupName] || false;
          items.push({ 
              type: 'group', 
              name: groupName, 
              count: eps.length, 
              isExpanded: !isCollapsed 
          });
          
          if (!isCollapsed) {
              eps.forEach(ep => {
                  items.push({ 
                      type: 'endpoint', 
                      data: ep,
                      responseCount: responseCounts[ep.id] || 0
                  });
              });
          }
      });
      return items;
  }, [groupedEndpoints, collapsedGroups, responseCounts]);

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

  // Row Renderer for react-window
  // Receives `data` from itemData prop
  const Row = ({ index, style, data }: ListChildComponentProps<RowItem[]>) => {
      const item = data[index];
      
      if (item.type === 'group') {
          return (
              <div style={style} className="px-2 mt-2">
                   <button 
                        onClick={() => toggleGroup(item.name)}
                        className="w-full flex items-center px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-md transition-colors"
                    >
                        {item.isExpanded ? <ChevronDown className="w-3 h-3 mr-1.5" /> : <ChevronRight className="w-3 h-3 mr-1.5" />}
                        <Folder className="w-3 h-3 mr-2 opacity-70" />
                        <span className="truncate">{item.name}</span>
                        <span className="ml-auto text-[10px] bg-gray-800 text-gray-500 px-1.5 rounded-full">{item.count}</span>
                    </button>
              </div>
          );
      }

      const endpoint = item.data;
      return (
          <div style={style} className="px-2 pl-6">
              <button
                    onClick={() => onSelectEndpoint(endpoint.id)}
                    className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all group relative h-[36px]", // Fixed height matching virtualization
                        selectedEndpointId === endpoint.id 
                            ? "bg-primary/10 text-primary border-l-2 border-primary" 
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent"
                    )}
                >
                    <span className={cn(
                        "text-[9px] font-bold uppercase w-8 text-left shrink-0",
                        METHOD_COLORS[endpoint.method].split(' ')[0]
                    )}>
                        {endpoint.method}
                    </span>
                    <span className="truncate flex-1 text-left text-xs" title={endpoint.name}>{endpoint.name}</span>
                    
                    {item.responseCount > 1 && (
                        <Badge variant="default" className="ml-auto text-[9px] h-4 px-1.5 gap-1 bg-gray-800 border border-gray-700 text-gray-400 shadow-none hover:bg-gray-700 shrink-0">
                            <Layers className="w-2.5 h-2.5" />
                            {item.responseCount}
                        </Badge>
                    )}
                </button>
          </div>
      );
  };

  return (
    <div className="w-80 border-r border-border flex flex-col fixed left-0 top-14 bottom-0 z-20 bg-sidebar">
      <div className="p-4 border-b border-border shrink-0">
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

      <div className="flex-1 flex flex-col px-2 pt-2 min-h-0">
         <div className="flex items-center justify-between px-2 mb-2 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collections</span>
            <button onClick={onCreateEndpoint} className="text-gray-500 hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
            </button>
        </div>

        {flattenedItems.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
                No endpoints found.
            </div>
        ) : (
            <div className="flex-1 min-h-0 w-full">
                <AutoSizer>
                    {({ height, width }: { height: number; width: number }) => (
                        <List
                            height={height}
                            itemCount={flattenedItems.length}
                            itemSize={44}
                            width={width}
                            itemData={flattenedItems} // CRITICAL: Explicitly pass data to trigger updates
                        >
                            {Row}
                        </List>
                    )}
                </AutoSizer>
            </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;