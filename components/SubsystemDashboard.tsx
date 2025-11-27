
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square, RotateCw, Trash2, Terminal, Activity, Cpu, HardDrive, Clock, ExternalLink } from 'lucide-react';
import { Subsystem, SubsystemLog } from '../types';

interface Props {
  onClose: () => void;
  onOpenWebview?: (url: string, title: string) => void;
}

const SubsystemDashboard: React.FC<Props> = ({ onClose, onOpenWebview }) => {
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>(null);
  const [logs, setLogs] = useState<SubsystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubsystems();
    const interval = setInterval(fetchSubsystems, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedSubsystem) {
      fetchLogs(selectedSubsystem);
      const interval = setInterval(() => fetchLogs(selectedSubsystem), 1000);
      return () => clearInterval(interval);
    }
  }, [selectedSubsystem]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchSubsystems = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/subsystems/list');
      if (res.ok) {
        const data = await res.json();
        setSubsystems(data);
      }
    } catch (e) {
      console.error("Failed to fetch subsystems");
    }
  };

  const fetchLogs = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/subsystems/${id}/logs?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch logs");
    }
  };

  const handleStop = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/subsystems/${id}/stop`, { method: 'POST' });
      if (res.ok) {
        await fetchSubsystems();
      }
    } catch (e) {
      alert("Failed to stop subsystem");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/subsystems/${id}/restart`, { method: 'POST' });
      if (res.ok) {
        await fetchSubsystems();
      }
    } catch (e) {
      alert("Failed to restart subsystem");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this subsystem?")) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/subsystems/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchSubsystems();
        if (selectedSubsystem === id) {
          setSelectedSubsystem(null);
          setLogs([]);
        }
      }
    } catch (e) {
      alert("Failed to remove subsystem");
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const selected = subsystems.find(s => s.id === selectedSubsystem);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 font-mono p-2 sm:p-4">
      <div className="relative w-full sm:w-[95%] max-w-sm sm:max-w-2xl lg:max-w-7xl h-full sm:h-[90vh] bg-[#050505] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] rounded-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-cyan-900/50 bg-cyan-950/10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-cyan-600/20 rounded border border-cyan-500/50 text-cyan-400">
                    <Activity size={24} />
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold text-white tracking-widest">SUBSYSTEM ORCHESTRATOR</h2>
                    <div className="text-[10px] font-mono text-cyan-400 flex gap-4">
                        <span>ACTIVE: {subsystems.filter(s => s.status === 'RUNNING').length}</span>
                        <span>ENGINE: PROCESS_MANAGER</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Subsystem List */}
            <div className="w-80 border-r border-cyan-900/30 bg-[#080808] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-cyan-900/30">
                    <h3 className="text-xs font-bold text-cyan-500 tracking-widest mb-3">MANAGED PROCESSES</h3>
                    <div className="space-y-2">
                        {subsystems.length === 0 && (
                            <div className="text-slate-600 text-xs italic p-4">No subsystems running.</div>
                        )}
                        {subsystems.map((sub) => (
                            <div 
                                key={sub.id}
                                onClick={() => setSelectedSubsystem(sub.id)}
                                className={`p-3 border rounded cursor-pointer transition-all ${
                                    selectedSubsystem === sub.id 
                                        ? 'border-cyan-500 bg-cyan-900/20' 
                                        : 'border-cyan-900/30 hover:border-cyan-700/50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            sub.status === 'RUNNING' ? 'bg-green-500 animate-pulse' :
                                            sub.status === 'STOPPING' ? 'bg-yellow-500' :
                                            sub.status === 'ERROR' ? 'bg-red-500' : 'bg-slate-500'
                                        }`}></div>
                                        <span className="text-white font-bold text-sm">{sub.name}</span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-slate-400 space-y-1">
                                    <div className="flex justify-between">
                                        <span>PID:</span>
                                        <span className="text-cyan-400">{sub.pid || 'N/A'}</span>
                                    </div>
                                    {sub.port && (
                                        <div className="flex justify-between">
                                            <span>PORT:</span>
                                            <span className="text-cyan-400">{sub.port}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>CPU:</span>
                                        <span className="text-cyan-400">{sub.cpu.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>MEM:</span>
                                        <span className="text-cyan-400">{sub.mem.toFixed(1)} MB</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Center: Logs Viewer */}
            <div className="flex-1 bg-black flex flex-col overflow-hidden">
                {selectedSubsystem && selected ? (
                    <>
                        <div className="h-16 border-b border-cyan-900/30 bg-[#080808] flex items-center justify-between px-6">
                            <div className="flex items-center gap-4">
                                <Terminal size={20} className="text-cyan-500" />
                                <div>
                                    <h3 className="text-white font-bold">{selected.name}</h3>
                                    <div className="text-[10px] text-slate-400">
                                        Uptime: {formatUptime(Date.now() - selected.startTime)} | 
                                        Logs: {selected.logCount}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selected.port && (
                                    <button
                                        onClick={() => {
                                            if (onOpenWebview) {
                                                onOpenWebview(`http://localhost:${selected.port}`, selected.name);
                                            } else {
                                                window.open(`http://localhost:${selected.port}`, '_blank');
                                            }
                                        }}
                                        className="px-3 py-1 bg-cyan-900/20 border border-cyan-700 text-cyan-400 text-xs font-bold hover:bg-cyan-900/40 transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink size={12} /> OPEN IN GHOST
                                    </button>
                                )}
                                <button
                                    onClick={() => handleRestart(selected.id)}
                                    disabled={loading || selected.status !== 'RUNNING'}
                                    className="px-3 py-1 bg-blue-900/20 border border-blue-700 text-blue-400 text-xs font-bold hover:bg-blue-900/40 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <RotateCw size={12} /> RESTART
                                </button>
                                <button
                                    onClick={() => handleStop(selected.id)}
                                    disabled={loading || selected.status !== 'RUNNING'}
                                    className="px-3 py-1 bg-red-900/20 border border-red-700 text-red-400 text-xs font-bold hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Square size={12} /> STOP
                                </button>
                                <button
                                    onClick={() => handleRemove(selected.id)}
                                    disabled={loading}
                                    className="px-3 py-1 bg-slate-900/20 border border-slate-700 text-slate-400 text-xs font-bold hover:bg-slate-900/40 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Trash2 size={12} /> REMOVE
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0a] font-mono text-xs">
                            {logs.length === 0 && (
                                <div className="text-slate-600 italic">No logs yet...</div>
                            )}
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1">
                                    <span className="text-slate-500">
                                        [{new Date(log.timestamp).toLocaleTimeString()}]
                                    </span>
                                    <span className={`ml-2 ${
                                        log.type === 'stderr' ? 'text-red-400' :
                                        log.type === 'error' ? 'text-red-600' :
                                        'text-slate-300'
                                    }`}>
                                        {log.data}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-600">
                        <div className="text-center">
                            <Activity size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Select a subsystem to view logs</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Metrics Panel */}
            {selectedSubsystem && selected && (
                <div className="w-64 border-l border-cyan-900/30 bg-[#080808] p-4">
                    <h3 className="text-xs font-bold text-cyan-500 tracking-widest mb-4">METRICS</h3>
                    <div className="space-y-4">
                        <div className="border border-cyan-900/30 p-3 rounded">
                            <div className="flex items-center gap-2 mb-2">
                                <Cpu size={14} className="text-cyan-400" />
                                <span className="text-xs text-slate-400">CPU USAGE</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{selected.cpu.toFixed(1)}%</div>
                            <div className="h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className="h-full bg-cyan-500 transition-all"
                                    style={{ width: `${Math.min(100, selected.cpu)}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="border border-cyan-900/30 p-3 rounded">
                            <div className="flex items-center gap-2 mb-2">
                                <HardDrive size={14} className="text-cyan-400" />
                                <span className="text-xs text-slate-400">MEMORY</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{selected.mem.toFixed(1)} MB</div>
                        </div>
                        <div className="border border-cyan-900/30 p-3 rounded">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={14} className="text-cyan-400" />
                                <span className="text-xs text-slate-400">UPTIME</span>
                            </div>
                            <div className="text-lg font-bold text-white">
                                {formatUptime(Date.now() - selected.startTime)}
                            </div>
                        </div>
                        <div className="border border-cyan-900/30 p-3 rounded">
                            <div className="text-xs text-slate-400 mb-2">STATUS</div>
                            <div className={`text-sm font-bold ${
                                selected.status === 'RUNNING' ? 'text-green-400' :
                                selected.status === 'STOPPING' ? 'text-yellow-400' :
                                selected.status === 'ERROR' ? 'text-red-400' :
                                'text-slate-400'
                            }`}>
                                {selected.status}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SubsystemDashboard;

