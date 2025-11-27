
import React, { useEffect, useState, useRef } from 'react';
import { LogEntry } from '../../lib/types';
import { store } from '../../lib/store';
import { METHOD_COLORS } from '../../lib/utils';
import { cn } from '../../lib/utils';
import { Trash2, Pause, Play, Search, Clock } from 'lucide-react';
import { Input } from '../../components/ui/Input';

interface LogMonitorProps {
  projectId: string;
}

const LogMonitor = ({ projectId }: LogMonitorProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = store.subscribeToLogs((log) => {
      if (log.projectId === projectId && !isPaused) {
        setLogs(prev => [...prev.slice(-49), log]); // Keep last 50 logs
      }
    });
    return unsubscribe;
  }, [projectId, isPaused]);

  useEffect(() => {
    if (endRef.current && !isPaused) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter(l => 
    l.path.toLowerCase().includes(filter.toLowerCase()) || 
    String(l.status).includes(filter)
  );

  return (
    <div className="flex flex-col h-full bg-[#111]">
        <div className="p-2 border-b border-gray-800 flex items-center justify-between gap-2 bg-gray-900/50">
             <div className="relative flex-1">
                 <Search className="w-3 h-3 absolute left-2 top-2 text-gray-500" />
                 <Input 
                    className="h-7 text-xs pl-7 bg-black border-gray-800" 
                    placeholder="Filter logs..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                 />
             </div>
             <div className="flex items-center gap-1">
                 <button onClick={() => setIsPaused(!isPaused)} className={cn("p-1.5 rounded hover:bg-gray-800 transition-colors", isPaused ? "text-yellow-400" : "text-gray-400")}>
                    {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                 </button>
                 <button onClick={() => setLogs([])} className="p-1.5 rounded hover:bg-gray-800 text-gray-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                 </button>
             </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-xs italic">
                    {filter ? 'No logs match filter' : 'Waiting for requests...'}
                </div>
            ) : (
                filteredLogs.map(log => (
                    <div key={log.id} className="bg-gray-900/40 border border-gray-800 rounded-md p-2 text-xs font-mono hover:bg-gray-900 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-2">
                                 <span className={cn("px-1 rounded border text-[10px] font-bold", METHOD_COLORS[log.method])}>
                                     {log.method}
                                 </span>
                                 <span className="text-gray-300 truncate max-w-[150px]" title={log.path}>{log.path}</span>
                             </div>
                             <span className={cn("px-1.5 py-0.5 rounded font-bold", log.status < 300 ? "text-green-400 bg-green-900/20" : "text-red-400 bg-red-900/20")}>
                                 {log.status}
                             </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                             <div className="flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                             </div>
                             <span>{log.responseName || 'Response'}</span>
                        </div>
                    </div>
                ))
            )}
            <div ref={endRef} />
        </div>
    </div>
  );
};

export default LogMonitor;
