
import React, { useEffect, useState, useRef } from 'react';
import { X, Monitor, HardDrive, Cpu, Activity, RefreshCw, Table, MousePointer2, Keyboard } from 'lucide-react';

interface Props {
  targetName: string;
  onClose: () => void;
  connected?: boolean;
}

export const DesktopStreamModal: React.FC<Props> = ({ targetName, onClose, connected = false }) => {
  const [processes, setProcesses] = useState<{pid: string, name: string, mem: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMode, setInputMode] = useState(false);
  
  // Process List Polling
  useEffect(() => {
    let interval: any;
    const fetchProcesses = async () => {
        if (connected) {
            try {
                const res = await fetch('http://localhost:3001/api/system/processes');
                if (res.ok) {
                    const data = await res.json();
                    setProcesses(data);
                    setLoading(false);
                }
            } catch (e) {
                console.error("Failed to fetch processes");
            }
        } else {
            setProcesses(Array.from({length: 15}).map((_, i) => ({
                pid: (Math.floor(Math.random() * 8000) + 1000).toString(),
                name: `sim_proc_${i}.exe`,
                mem: `${Math.floor(Math.random() * 500)} MB`
            })));
            setLoading(false);
        }
    };
    fetchProcesses();
    interval = setInterval(fetchProcesses, 2000);
    return () => clearInterval(interval);
  }, [connected]);

  // Input Capture Logic
  const sendInput = async (type: 'click' | 'text', payload: string) => {
      if (!connected) return;
      try {
          await fetch('http://localhost:3001/api/input', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, payload })
          });
      } catch (e) {
          console.error("Input Sent Failed", e);
      }
  };

  const handleOverlayClick = () => {
      if (inputMode) sendInput('click', 'left');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (inputMode) {
          e.preventDefault(); // Prevent browser actions (like F5)
          // Filter simply characters or specific keys
          if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace') {
             sendInput('text', e.key);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in zoom-in-95 duration-300" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="relative w-[95%] h-[90%] bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden rounded-lg outline-none">
        
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-700 p-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer" onClick={onClose}></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400"></div>
            </div>
            <div className="h-6 w-px bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-2 text-sm font-mono text-sci-cyan">
                <Monitor size={16} />
                <span className="uppercase font-bold tracking-wider">{targetName}</span>
                <span className="text-xs opacity-50 text-slate-400">:: REMOTE_VIEWER_V2</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
             <button 
                onClick={() => setInputMode(!inputMode)}
                className={`flex items-center gap-2 px-3 py-1 rounded border transition-all ${inputMode ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}
             >
                 {inputMode ? <Keyboard size={14} /> : <MousePointer2 size={14} />}
                 {inputMode ? 'INPUT CAPTURE ACTIVE' : 'ENABLE INPUT UPLINK'}
             </button>

             <span className={connected ? 'text-green-500 font-bold' : 'text-yellow-500 font-bold'}>
                 {connected ? 'LIVE HOST DATA' : 'SIMULATION MODE'}
             </span>
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded transition-colors text-white">
                <X size={18} />
            </button>
          </div>
        </div>

        {/* Desktop Content Area */}
        <div className="flex-1 relative bg-[#0c0c0c] flex">
            
            {/* Input Capture Overlay */}
            {inputMode && (
                <div 
                    className="absolute inset-0 z-50 cursor-crosshair flex items-center justify-center bg-red-500/5 border-4 border-red-500/20"
                    onClick={handleOverlayClick}
                >
                    <div className="bg-black/80 p-4 border border-red-500 text-red-500 font-mono text-xs text-center pointer-events-none">
                        <div className="font-bold text-lg mb-2">CONTROL UPLINK ENGAGED</div>
                        <div>KEYBOARD & MOUSE INPUT REDIRECTED TO HOST</div>
                        <div className="mt-2 opacity-70">CLICK TO SEND LEFT_CLICK<br/>TYPE TO SEND KEYSTROKES</div>
                    </div>
                </div>
            )}

            {/* Left Sidebar */}
            <div className="w-16 bg-slate-950/50 border-r border-slate-800 flex flex-col items-center py-4 gap-4">
                <div className="p-2 bg-sci-cyan/20 text-sci-cyan rounded-lg border border-sci-cyan/50 cursor-pointer">
                    <Activity size={20} />
                </div>
                <div className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer"><HardDrive size={20} /></div>
                <div className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer"><Cpu size={20} /></div>
            </div>

            {/* Main Process Table */}
            <div className="flex-1 p-8 relative overflow-hidden flex flex-col">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                <div className="relative z-10 flex-1 bg-slate-900/80 border border-slate-700 rounded shadow-lg backdrop-blur flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-700 bg-slate-800 flex justify-between items-center">
                        <h3 className="font-mono text-sm text-white font-bold flex items-center gap-2">
                            <Table size={14} /> ACTIVE PROCESSES ({processes.length})
                        </h3>
                        {loading && <RefreshCw size={14} className="animate-spin text-sci-cyan" />}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-xs font-mono text-slate-300">
                            <thead className="bg-slate-950 text-slate-500 sticky top-0">
                                <tr>
                                    <th className="p-3">PID</th>
                                    <th className="p-3">IMAGE NAME</th>
                                    <th className="p-3 text-right">MEMORY</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {processes.map((proc, i) => (
                                    <tr key={i} className="hover:bg-slate-700/50 transition-colors cursor-pointer">
                                        <td className="p-3 text-sci-cyan">{proc.pid}</td>
                                        <td className="p-3 text-white font-bold">{proc.name}</td>
                                        <td className="p-3 text-right text-slate-400">{proc.mem}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Footer Status Bar */}
        <div className="h-8 bg-sci-base border-t border-slate-800 flex items-center px-4 gap-6 text-[10px] font-mono text-slate-500">
            <span>CPU: {Math.floor(Math.random() * 30 + 10)}%</span>
            <span>TASKS: {processes.length} RUNNING</span>
            <span className="text-sci-cyan ml-auto">REAL-TIME KERNEL ACCESS GRANTED</span>
        </div>
      </div>
    </div>
  );
};
