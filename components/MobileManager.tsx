
import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, Battery, Signal, Wifi, Folder, MessageSquare, Phone, Search, FileText, Image, Video, Music, Download, Cast, MonitorPlay, MousePointer2, Skull, Terminal, Activity, AlertTriangle, Lock, Eye, Trash2 } from 'lucide-react';
import { SmartDevice } from '../types';

interface Props {
  device: SmartDevice | null;
  onClose: () => void;
}

const MobileManager: React.FC<Props> = ({ device, onClose }) => {
  const [activeTab, setActiveTab] = useState<'DASH' | 'FILES' | 'COMMS' | 'LIVE' | 'EXPLOIT' | 'WIRELESS'>('DASH');
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [files, setFiles] = useState<{name: string, size: string, type: string, date: string}[]>([]);
  const [usingRealFiles, setUsingRealFiles] = useState(false);
  const [isAdbConnected, setIsAdbConnected] = useState(false);
  const [screenImage, setScreenImage] = useState<string | null>(null);
  
  // Exploitation State
  const [exploitLogs, setExploitLogs] = useState<string[]>([]);
  const [dumpedData, setDumpedData] = useState<any[]>([]);
  const [wirelessIp, setWirelessIp] = useState('192.168.1.');
  const [runningPackages, setRunningPackages] = useState<string[]>([]);

  // Simulated Files Fallback
  const simulatedFiles = [
    { name: 'Project_7_Notes.pdf', size: '2.4 MB', type: 'DOC', date: '2h ago' },
    { name: 'Site_Photos_044.jpg', size: '4.1 MB', type: 'IMG', date: '5h ago' },
    { name: 'Meeting_Recording.wav', size: '12 MB', type: 'AUDIO', date: 'Yesterday' },
    { name: 'Encryption_Keys_Backup.dat', size: '256 KB', type: 'FILE', date: 'Yesterday' },
    { name: 'Security_Footage_Sector_1.mp4', size: '145 MB', type: 'VIDEO', date: '2d ago' },
  ];

  // Simulated Comms
  const messages = [
    { from: 'System', text: 'Uplink active.', time: 'Now' },
    { from: 'RedQueen', text: 'Device synced successfully.', time: '1m ago' },
  ];

  // Check ADB Status
  useEffect(() => {
      const checkAdb = async () => {
          try {
              const res = await fetch('http://localhost:3001/api/mobile/status');
              if (res.ok) {
                  const data = await res.json();
                  setIsAdbConnected(data.connected);
                  if (data.connected && activeTab === 'LIVE') {
                       // Trigger polling
                  }
              }
          } catch (e) {
              setIsAdbConnected(false);
          }
      };
      checkAdb();
      const interval = setInterval(checkAdb, 5000);
      return () => clearInterval(interval);
  }, [activeTab]);

  // Screen Polling for Live View
  useEffect(() => {
      let interval: any;
      if (activeTab === 'LIVE' && isAdbConnected) {
          const fetchScreen = async () => {
              try {
                  const res = await fetch('http://localhost:3001/api/mobile/screen');
                  if (res.ok) {
                      const data = await res.json();
                      setScreenImage(data.image); // Base64 PNG
                  }
              } catch (e) {
                  console.error("Screenshot failed", e);
              }
          };
          fetchScreen();
          interval = setInterval(fetchScreen, 800); // ~1 FPS to avoid lag
      }
      return () => clearInterval(interval);
  }, [activeTab, isAdbConnected]);

  // Handle Tap on Image
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
      if (!isAdbConnected) return;
      
      // Calculate relative coordinates
      const rect = e.currentTarget.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      
      // Assuming 1080x1920 standard resolution for now (simplification)
      const realX = Math.round(xRatio * 1080);
      const realY = Math.round(yRatio * 2340); 

      try {
          await fetch('http://localhost:3001/api/mobile/input', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ type: 'TAP', x: realX, y: realY })
          });
      } catch (e) {
          console.error("Tap failed", e);
      }
  };

  const sendKey = async (keyCode: number) => {
      await fetch('http://localhost:3001/api/mobile/input', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ type: 'KEY', keyCode })
      });
  };

  const handleWirelessConnect = async () => {
      addLog(`ATTEMPTING WIRELESS BRIDGE: ${wirelessIp}:5555`);
      try {
          const res = await fetch('http://localhost:3001/api/mobile/connect-wireless', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ip: wirelessIp })
          });
          const data = await res.json();
          if (data.success) addLog(`SUCCESS: ${data.result}`, 'success');
          else addLog(`FAILURE: ${data.error}`, 'error');
      } catch (e) {
          addLog('CONNECTION TIMEOUT', 'error');
      }
  };

  const handleExfiltrate = async (type: 'SMS' | 'CALLS') => {
      addLog(`INITIATING EXFILTRATION: ${type}...`);
      setDumpedData([]);
      try {
          const res = await fetch('http://localhost:3001/api/mobile/exfiltrate', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ type })
          });
          const data = await res.json();
          if (data.success && data.data) {
              setDumpedData(data.data);
              addLog(`SUCCESS: ${data.data.length} RECORDS DUMPED.`, 'success');
          } else {
              addLog(`EXFIL FAILED: ${data.error}`, 'error');
          }
      } catch (e) {
          addLog('PROTOCOL ERROR', 'error');
      }
  };

  const fetchPackages = async () => {
      addLog('SCANNING INSTALLED PACKAGES...');
      try {
          const res = await fetch('http://localhost:3001/api/mobile/packages');
          const data = await res.json();
          if (data.packages) setRunningPackages(data.packages);
          addLog(`FOUND ${data.packages.length} PACKAGES.`);
      } catch (e) {
          addLog('SCAN FAILED', 'error');
      }
  };

  const killPackage = async (pkg: string) => {
      addLog(`KILLING PROCESS: ${pkg}...`, 'warning');
      try {
          await fetch('http://localhost:3001/api/mobile/kill', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ package: pkg })
          });
          addLog('PROCESS TERMINATED.', 'success');
      } catch (e) {
          addLog('CMD FAILED', 'error');
      }
  };

  const addLog = (msg: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
      const prefix = type === 'error' ? '[ERR]' : type === 'success' ? '[OK]' : type === 'warning' ? '[WARN]' : '[INF]';
      setExploitLogs(prev => [`${prefix} ${msg}`, ...prev]);
  };


  // REAL BATTERY API
  useEffect(() => {
    // @ts-ignore
    if (navigator.getBattery) {
        // @ts-ignore
        navigator.getBattery().then((battery) => {
            const updateBattery = () => {
                setBatteryLevel(Math.floor(battery.level * 100));
                setIsCharging(battery.charging);
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
            battery.addEventListener('chargingchange', updateBattery);
        });
    }
  }, []);

  // REAL FILE LISTING
  useEffect(() => {
    const fetchFiles = async () => {
        if (activeTab === 'FILES') {
            try {
                const res = await fetch('http://localhost:3001/api/files/list');
                if (res.ok) {
                    const realFiles = await res.json();
                    if (realFiles.length > 0) {
                        setFiles(realFiles);
                        setUsingRealFiles(true);
                    } else {
                        setFiles(simulatedFiles);
                        setUsingRealFiles(false);
                    }
                } else {
                     throw new Error("Offline");
                }
            } catch (e) {
                setFiles(simulatedFiles);
                setUsingRealFiles(false);
            }
        }
    };
    fetchFiles();
  }, [activeTab]);

  if (!device) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
        <div className={`relative w-[90%] max-w-5xl h-[85vh] bg-[#0a0a0a] border shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg flex flex-col overflow-hidden transition-all ${activeTab === 'EXPLOIT' || activeTab === 'WIRELESS' ? 'border-red-900 shadow-red-900/20' : 'border-rq-blue/30 shadow-rq-blue/15'}`}>
            
            {/* Header */}
            <div className={`h-16 border-b flex items-center justify-between px-6 ${activeTab === 'EXPLOIT' || activeTab === 'WIRELESS' ? 'bg-red-950/10 border-red-900' : 'bg-slate-950 border-slate-800'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full border flex items-center justify-center ${activeTab === 'EXPLOIT' || activeTab === 'WIRELESS' ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-rq-blue/10 border-rq-blue/30 text-rq-blue'}`}>
                        {activeTab === 'EXPLOIT' ? <Skull size={20} /> : <Smartphone size={20} />}
                    </div>
                    <div>
                        <h2 className={`font-display text-xl font-bold tracking-widest ${activeTab === 'EXPLOIT' || activeTab === 'WIRELESS' ? 'text-red-500' : 'text-white'}`}>
                            {activeTab === 'EXPLOIT' ? 'ROOT ACCESS SHELL' : device.name}
                        </h2>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
                            <span className="flex items-center gap-1"><Signal size={12} className="text-green-500" /> ONLINE</span>
                            <span className="flex items-center gap-1">
                                <Cast size={12} className={isAdbConnected ? 'text-green-500' : 'text-slate-500'} /> 
                                {isAdbConnected ? 'ADB: CONNECTED' : 'ADB: OFFLINE'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Battery size={12} className={batteryLevel < 20 ? 'text-red-500' : 'text-green-500'} /> 
                                {batteryLevel}% {isCharging ? '(CHARGING)' : ''}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto">
                {[
                    { id: 'DASH', label: 'DASHBOARD', icon: Activity },
                    { id: 'LIVE', label: 'LIVE VIEW', icon: MonitorPlay },
                    { id: 'FILES', label: 'FILES', icon: Folder },
                    { id: 'COMMS', label: 'LOGS', icon: MessageSquare },
                    { id: 'WIRELESS', label: 'WIRELESS', icon: Wifi },
                    { id: 'EXPLOIT', label: 'EXPLOIT', icon: Terminal, danger: true },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex-1 py-3 px-4 text-xs font-bold tracking-widest flex items-center justify-center gap-2 transition-colors whitespace-nowrap
                            ${activeTab === tab.id 
                                ? (tab.danger ? 'bg-red-900/20 text-red-500 border-b-2 border-red-500' : 'bg-rq-blue/10 text-rq-blue border-b-2 border-rq-blue') 
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 bg-black relative overflow-hidden p-6">
                <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                {activeTab === 'DASH' && (
                    <div className="grid grid-cols-2 gap-6 h-full">
                        {/* Storage Map */}
                        <div className="border border-slate-800 bg-slate-900/20 p-4 rounded-sm">
                            <h3 className="text-xs font-bold text-rq-blue tracking-widest mb-4 border-b border-slate-800 pb-2">BATTERY DIAGNOSTICS</h3>
                            <div className="flex items-center justify-center py-8">
                                <div className="relative w-32 h-32 rounded-full border-8 border-slate-800 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full border-8 border-rq-blue border-t-transparent border-l-transparent rotate-45"></div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-white">{batteryLevel}%</div>
                                        <div className="text-[8px] text-slate-500">{isCharging ? 'CHARGING' : 'DRAINING'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2 text-[10px] font-mono text-slate-400 text-center">
                                <div>REAL-TIME BATTERY API STATUS: ACTIVE</div>
                            </div>
                        </div>

                        {/* Location Map Placeholder */}
                        <div className="border border-slate-800 bg-slate-900/20 p-4 rounded-sm flex flex-col">
                             <h3 className="text-xs font-bold text-rq-blue tracking-widest mb-4 border-b border-slate-800 pb-2">DEVICE LOCATION</h3>
                             <div className="flex-1 bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center">
                                 <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                                 <div className="w-3 h-3 bg-rq-blue rounded-full animate-ping absolute"></div>
                                 <div className="w-2 h-2 bg-white rounded-full relative z-10"></div>
                             </div>
                             <div className="mt-2 text-[10px] font-mono text-slate-500">
                                 GEOLOCATION: TRACKING
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'WIRELESS' && (
                    <div className="h-full flex flex-col items-center justify-center gap-8">
                        <div className="text-center space-y-2">
                            <Wifi size={48} className="mx-auto text-slate-600" />
                            <h3 className="text-xl font-bold text-white">WIRELESS ADB BRIDGE</h3>
                            <p className="text-xs text-slate-500 font-mono max-w-md">
                                Connect to devices on the local subnet via TCP/IP (Port 5555).<br/>
                                Target device must have "Wireless Debugging" enabled.
                            </p>
                        </div>

                        <div className="flex gap-2 w-full max-w-md">
                            <input 
                                type="text" 
                                value={wirelessIp}
                                onChange={(e) => setWirelessIp(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 p-3 text-white font-mono text-sm focus:border-rq-blue outline-none"
                                placeholder="192.168.1.X"
                            />
                            <button 
                                onClick={handleWirelessConnect}
                                className="bg-rq-blue hover:bg-blue-400 text-black font-bold px-6 text-xs tracking-widest transition-colors"
                            >
                                CONNECT
                            </button>
                        </div>
                        
                        <div className="w-full max-w-md bg-black border border-slate-800 h-32 overflow-y-auto p-2 font-mono text-[10px] text-slate-400">
                             {exploitLogs.map((log, i) => (
                                 <div key={i} className={log.includes('[OK]') ? 'text-green-500' : log.includes('[ERR]') ? 'text-red-500' : ''}>{log}</div>
                             ))}
                        </div>
                    </div>
                )}

                {activeTab === 'EXPLOIT' && (
                    <div className="h-full flex gap-6">
                        {/* Left: Controls */}
                        <div className="w-1/3 flex flex-col gap-4">
                            <div className="bg-red-950/10 border border-red-900/50 p-4">
                                <h3 className="text-xs font-bold text-red-500 tracking-widest mb-3 flex items-center gap-2">
                                    <Eye size={12} /> DATA EXFILTRATION
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleExfiltrate('SMS')} className="p-2 bg-red-900/20 border border-red-800 hover:bg-red-500 hover:text-black text-red-400 text-[10px] font-bold transition-all">DUMP SMS</button>
                                    <button onClick={() => handleExfiltrate('CALLS')} className="p-2 bg-red-900/20 border border-red-800 hover:bg-red-500 hover:text-black text-red-400 text-[10px] font-bold transition-all">DUMP CALLS</button>
                                </div>
                            </div>

                            <div className="bg-red-950/10 border border-red-900/50 p-4 flex-1 flex flex-col">
                                <h3 className="text-xs font-bold text-red-500 tracking-widest mb-3 flex items-center gap-2">
                                    <Activity size={12} /> PROCESS KILLER
                                </h3>
                                <button onClick={fetchPackages} className="mb-2 w-full py-1 bg-slate-900 border border-slate-700 text-slate-400 text-[10px] hover:text-white hover:border-white">REFRESH LIST</button>
                                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {runningPackages.map((pkg, i) => (
                                        <div key={i} className="flex justify-between items-center bg-black p-1 border border-slate-900 group hover:border-red-900">
                                            <span className="text-[9px] font-mono text-slate-500 truncate w-32">{pkg}</span>
                                            <button onClick={() => killPackage(pkg)} className="text-red-900 hover:text-red-500"><Trash2 size={10} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Terminal / Data View */}
                        <div className="flex-1 bg-black border border-slate-800 flex flex-col font-mono">
                             <div className="bg-slate-900 p-2 text-[10px] text-slate-500 flex justify-between">
                                 <span>ROOT@REMOTE_SHELL: ~ $</span>
                                 <span>STATUS: {isAdbConnected ? 'ROOTED' : 'DISCONNECTED'}</span>
                             </div>
                             <div className="flex-1 overflow-y-auto p-2 text-[10px] text-green-500 space-y-1">
                                 {exploitLogs.map((log, i) => (
                                     <div key={i} className={log.includes('[ERR]') ? 'text-red-500' : log.includes('[WARN]') ? 'text-yellow-500' : 'text-green-500'}>{log}</div>
                                 ))}
                                 {dumpedData.length > 0 && (
                                     <div className="mt-4 pt-4 border-t border-green-900">
                                         <div className="text-white mb-2">--- BEGIN DATA DUMP ---</div>
                                         {dumpedData.map((record, i) => (
                                             <div key={i} className="mb-1 opacity-80 hover:opacity-100 hover:bg-white/5 p-1">
                                                 {JSON.stringify(record)}
                                             </div>
                                         ))}
                                         <div className="text-white mt-2">--- END DATA DUMP ---</div>
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'LIVE' && (
                    <div className="h-full flex flex-col items-center justify-center">
                        {!isAdbConnected ? (
                            <div className="text-center text-slate-500">
                                <Cast size={48} className="mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-white mb-2">ADB LINK OFFLINE</h3>
                                <p className="text-xs font-mono max-w-md mx-auto">
                                    To enable remote control, connect your device via USB and enable USB Debugging in Developer Options. Ensure ADB is running on the host.
                                </p>
                            </div>
                        ) : (
                            <div className="relative flex-1 w-full flex justify-center items-center gap-8">
                                {/* Phone Frame */}
                                <div className="relative h-full aspect-[9/19] bg-black border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                                    {screenImage ? (
                                        <img 
                                            src={`data:image/png;base64,${screenImage}`} 
                                            alt="Device Screen" 
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={handleImageClick}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse">
                                            WAITING FOR STREAM...
                                        </div>
                                    )}
                                </div>

                                {/* Controls */}
                                <div className="flex flex-col gap-4">
                                    <div className="p-4 bg-slate-900 border border-slate-800 rounded flex flex-col gap-2">
                                        <button onClick={() => sendKey(3)} className="px-4 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-xs font-bold rounded">HOME</button>
                                        <button onClick={() => sendKey(4)} className="px-4 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-xs font-bold rounded">BACK</button>
                                        <button onClick={() => sendKey(187)} className="px-4 py-2 bg-slate-800 hover:bg-rq-blue hover:text-black text-white text-xs font-bold rounded">APPS</button>
                                        <button onClick={() => sendKey(26)} className="px-4 py-2 bg-red-900/50 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold rounded mt-2">POWER</button>
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500 max-w-[150px]">
                                        <MousePointer2 size={12} className="inline mr-1" />
                                        Tap screen to send input events.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'FILES' && (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-4 justify-between">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                <input type="text" placeholder="Search storage..." className="w-full bg-slate-900 border border-slate-800 rounded pl-10 pr-4 py-2 text-xs font-mono text-white focus:border-rq-blue focus:outline-none" />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                                {usingRealFiles ? (
                                    <span className="text-green-500 flex items-center gap-1"><Download size={12} /> LIVE HOST DATA (DOWNLOADS)</span>
                                ) : (
                                    <span className="text-yellow-500">SIMULATION_MODE (Core Offline)</span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                             <table className="w-full text-left text-xs font-mono text-slate-400">
                                 <thead className="text-[10px] text-slate-600 bg-slate-900/50 uppercase tracking-wider">
                                     <tr>
                                         <th className="p-3">Name</th>
                                         <th className="p-3">Type</th>
                                         <th className="p-3">Size</th>
                                         <th className="p-3 text-right">Modified</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800">
                                     {files.map((file, i) => (
                                         <tr key={i} className="hover:bg-slate-800/30 hover:text-rq-blue cursor-pointer transition-colors group">
                                             <td className="p-3 flex items-center gap-3 truncate max-w-[200px]">
                                                 {file.type === 'IMG' || file.type === 'JPG' || file.type === 'PNG' ? <Image size={14} /> :
                                                  file.type === 'DOC' || file.type === 'PDF' ? <FileText size={14} /> :
                                                  file.type === 'AUDIO' || file.type === 'WAV' || file.type === 'MP3' ? <Music size={14} /> :
                                                  file.type === 'VIDEO' || file.type === 'MP4' ? <Video size={14} /> :
                                                  <Folder size={14} />}
                                                 <span className="text-white group-hover:text-rq-blue truncate">{file.name}</span>
                                             </td>
                                             <td className="p-3">{file.type}</td>
                                             <td className="p-3">{file.size}</td>
                                             <td className="p-3 text-right">{file.date}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                             {!usingRealFiles && (
                                <div className="p-4 text-center text-[10px] text-slate-600 italic">
                                    Note: Browser sandbox prevents direct access to real files. Connect Local Core for real data.
                                </div>
                             )}
                        </div>
                    </div>
                )}

                {activeTab === 'COMMS' && (
                    <div className="h-full flex flex-col space-y-2">
                        {messages.map((msg, i) => (
                            <div key={i} className="p-3 bg-slate-900/40 border border-slate-800 rounded flex gap-4 hover:border-rq-blue/30 transition-colors">
                                <div className="p-2 bg-slate-800 rounded-full h-fit">
                                    <MessageSquare size={16} className="text-slate-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-white">{msg.from}</span>
                                        <span className="text-[10px] font-mono text-slate-500">{msg.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-mono">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default MobileManager;