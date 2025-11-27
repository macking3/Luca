
import React, { useEffect, useState } from 'react';
import { QrCode, X, Wifi, ShieldCheck, Smartphone, Radio, Lock, Scan, CheckCircle2, Cpu, Network, Fingerprint, ArrowRight, Bug, Skull, AlertTriangle } from 'lucide-react';

interface Props {
  accessCode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const RemoteAccessModal: React.FC<Props> = ({ accessCode, onClose, onSuccess }) => {
  const [stage, setStage] = useState<'INIT' | 'KEYS' | 'QR' | 'HANDSHAKE' | 'CONNECTED'>('INIT');
  const [mode, setMode] = useState<'STANDARD' | 'EXPLOIT'>('STANDARD');
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [localIp, setLocalIp] = useState<string>('localhost');

  // Sequence Controller
  useEffect(() => {
    let timer: any;
    setLogs([]);
    setStage('INIT');

    const addLog = (msg: string) => setLogs(prev => [...prev.slice(-5), `> ${msg}`]);

    const initSequence = async () => {
        // Stage 1: Init
        if (mode === 'STANDARD') {
            addLog('INITIALIZING SECURE HANDSHAKE...');
        } else {
            addLog('INITIALIZING PAYLOAD GENERATOR (MSF)...');
        }
        
        // Fetch real IP from server
        try {
            const res = await fetch('http://localhost:3001/api/network/ip');
            if (res.ok) {
                const data = await res.json();
                setLocalIp(data.ip);
                // Generate Real QR pointing to the mobile endpoint
                const targetUrl = `http://${data.ip}:${data.port}/mobile`;
                // Use a public QR API for generation
                setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}&color=${mode === 'STANDARD' ? '06b6d4' : 'ef4444'}&bgcolor=050505`);
            } else {
                throw new Error("Core Offline");
            }
        } catch (e) {
            // Fallback
            setLocalIp('OFFLINE_MODE');
            setQrUrl(null); // Will use icon as fallback
        }

        await new Promise(r => setTimeout(r, 1000));

        setStage('KEYS');
        if (mode === 'STANDARD') {
            addLog('GENERATING RSA-4096 KEYPAIR...');
        } else {
            addLog('COMPILING REVERSE_TCP STAGER...');
        }

        // Stage 2: Keys -> QR
        setTimeout(() => {
            if (mode === 'STANDARD') {
                addLog('ENCRYPTING SESSION TOKEN...');
            } else {
                addLog('EMBEDDING EXPLOIT IN BITMAP...');
            }
            
            setTimeout(() => {
                 setStage('QR');
                 if (mode === 'STANDARD') {
                    addLog('VISUAL UPLINK READY. SCAN NOW.');
                 } else {
                    addLog('TRAP SET. WAITING FOR TARGET INTERACTION...');
                 }
            }, 1500);
        }, 1000);
    };

    initSequence();

    return () => clearTimeout(timer);
  }, [mode]);

  // Handshake Polling (Real Connection Check)
  useEffect(() => {
      let pollInterval: any;
      if (stage === 'QR') {
          pollInterval = setInterval(async () => {
              try {
                  const res = await fetch('http://localhost:3001/api/mobile/await-handshake');
                  if (res.ok) {
                      const data = await res.json();
                      if (data.success) {
                          clearInterval(pollInterval);
                          handleRealConnection(data.device);
                      }
                  }
              } catch (e) {
                  // Ignore polling errors
              }
          }, 1000);
      }
      return () => clearInterval(pollInterval);
  }, [stage]);

  const handleRealConnection = (deviceInfo: any) => {
      setStage('HANDSHAKE');
      setLogs(prev => [...prev, `> INCOMING CONNECTION: ${deviceInfo.ip}`, '> HANDSHAKE VERIFIED...', '> ESTABLISHING TUNNEL...']);
      
      setTimeout(() => {
          setStage('CONNECTED');
          setLogs(prev => [...prev, '> ACCESS GRANTED.', '> LAUNCHING INTERFACE...']);
          
          setTimeout(() => {
              if (onSuccess) onSuccess();
              else onClose();
          }, 1500);
      }, 2000);
  };

  const handleSimulateScan = () => {
      // Manual trigger override
      handleRealConnection({ ip: '192.168.1.105 (SIM)' });
  };

  const toggleMode = () => {
      setMode(prev => prev === 'STANDARD' ? 'EXPLOIT' : 'STANDARD');
  };

  const theme = mode === 'STANDARD' 
    ? { text: 'text-sci-cyan', border: 'border-sci-cyan', bg: 'bg-sci-cyan', glow: 'shadow-[0_0_60px_rgba(6,182,212,0.1)]' }
    : { text: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500', glow: 'shadow-[0_0_60px_rgba(239,68,68,0.15)]' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
       <div className={`relative w-[90%] max-w-md bg-[#050505] border ${mode === 'EXPLOIT' ? 'border-red-900' : 'border-slate-800'} ${theme.glow} p-0 overflow-hidden rounded-lg flex flex-col transition-all duration-500`}>
          
          {/* Animated Scanner Top */}
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${mode === 'STANDARD' ? 'sci-cyan' : 'red-500'} to-transparent animate-scan opacity-50`}></div>
          
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/30">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded border ${mode === 'STANDARD' ? 'bg-sci-cyan/10 border-sci-cyan/30' : 'bg-red-900/20 border-red-500/30'}`}>
                    {mode === 'STANDARD' ? <Wifi className={theme.text} size={20} /> : <Skull className={theme.text} size={20} />}
                </div>
                <div>
                    <h2 className={`font-display text-lg font-bold tracking-widest ${mode === 'STANDARD' ? 'text-white' : 'text-red-500'}`}>
                        {mode === 'STANDARD' ? 'REMOTE UPLINK' : 'PAYLOAD DELIVERY'}
                    </h2>
                    <div className={`text-[10px] font-mono tracking-[0.2em] flex gap-2 ${theme.text}`}>
                        <span>PROTOCOL: {mode === 'STANDARD' ? 'WEBRTC_V2' : 'QRL_JACKING'}</span>
                        <span className={`w-1 h-1 rounded-full ${theme.bg} animate-pulse self-center`}></span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="absolute top-6 right-16">
              <button 
                onClick={toggleMode}
                disabled={stage !== 'INIT' && stage !== 'QR'}
                className={`text-[9px] font-mono border px-2 py-1 rounded hover:bg-white/5 transition-colors flex items-center gap-1 ${mode === 'STANDARD' ? 'border-sci-cyan text-sci-cyan' : 'border-red-500 text-red-500'}`}
                title="Toggle Offensive Capability"
              >
                  {mode === 'STANDARD' ? <ShieldCheck size={10} /> : <Bug size={10} />}
                  {mode === 'STANDARD' ? 'SECURE_MODE' : 'EXPLOIT_MODE'}
              </button>
          </div>

          {/* Main Content Area */}
          <div className="p-8 flex flex-col items-center justify-center relative min-h-[350px]">
             
             {/* Background Grid */}
             <div className={`absolute inset-0 opacity-10 bg-[linear-gradient(rgba(${mode === 'STANDARD' ? '6,182,212' : '239,68,68'},0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(${mode === 'STANDARD' ? '6,182,212' : '239,68,68'},0.2)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none`}></div>

             {/* STAGE: INIT / KEYS */}
             {(stage === 'INIT' || stage === 'KEYS') && (
                 <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                     <div className="relative">
                         <div className={`w-32 h-32 rounded-full border-4 border-slate-800 border-t-${mode === 'STANDARD' ? 'sci-cyan' : 'red-500'} animate-spin`}></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                             <Cpu size={48} className="text-slate-700" />
                         </div>
                     </div>
                     <div className={`${theme.text} font-mono text-sm animate-pulse`}>
                         {mode === 'STANDARD' ? 'GENERATING SECURE TOKENS...' : 'COMPILING MALICIOUS APK...'}
                     </div>
                 </div>
             )}

             {/* STAGE: QR CODE */}
             {stage === 'QR' && (
                 <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500 w-full">
                     <div className="relative group cursor-pointer" onClick={handleSimulateScan}>
                        {/* Holographic Corners */}
                        <div className={`absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 ${theme.border}`}></div>
                        <div className={`absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 ${theme.border}`}></div>
                        <div className={`absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 ${theme.border}`}></div>
                        <div className={`absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 ${theme.border}`}></div>
                        
                        <div className={`relative p-4 bg-white rounded-lg ${mode === 'EXPLOIT' ? 'shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'shadow-[0_0_30px_rgba(6,182,212,0.3)]'}`}>
                            {qrUrl ? (
                                <img src={qrUrl} alt="Scan to Connect" className="w-40 h-40 object-contain" />
                            ) : (
                                <QrCode size={160} className={mode === 'EXPLOIT' ? 'text-red-900' : 'text-black'} />
                            )}
                            
                            {/* Scanning Line Overlay */}
                            <div className={`absolute top-0 left-0 w-full h-2 blur-sm animate-[scan_2s_linear_infinite] ${mode === 'STANDARD' ? 'bg-sci-cyan/50' : 'bg-red-500/50'}`}></div>
                        </div>
                     </div>

                     <div className="text-center space-y-2">
                         <div className="text-xs font-mono text-slate-400">HOST: {localIp}</div>
                         <div className="text-2xl font-display font-bold text-white tracking-[0.2em] text-shadow-glow">{accessCode}</div>
                         <div className="text-[10px] font-mono text-slate-500 animate-pulse">AWAITING CONNECTION...</div>
                     </div>

                     {/* Interactive Simulation Button (Fallback) */}
                     <button 
                        onClick={handleSimulateScan}
                        className="mt-4 text-[9px] opacity-50 hover:opacity-100 border-b border-slate-700"
                     >
                        Force Simulate Connection (Debug)
                     </button>
                 </div>
             )}

             {/* STAGE: HANDSHAKE */}
             {stage === 'HANDSHAKE' && (
                 <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300">
                     <div className="relative w-32 h-32 flex items-center justify-center">
                         <div className={`absolute inset-0 rounded-full border opacity-50 animate-ping ${mode === 'STANDARD' ? 'border-sci-cyan' : 'border-red-500'}`}></div>
                         <div className={`absolute inset-0 rounded-full border opacity-50 animate-ping delay-150 ${mode === 'STANDARD' ? 'border-sci-cyan' : 'border-red-500'}`}></div>
                         <Smartphone size={64} className="text-white relative z-10" />
                         <div className={`absolute -bottom-8 text-xs font-mono ${theme.text}`}>
                             {mode === 'STANDARD' ? 'HANDSHAKE...' : 'INJECTING...'}
                         </div>
                     </div>
                 </div>
             )}

             {/* STAGE: CONNECTED */}
             {stage === 'CONNECTED' && (
                 <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300">
                     <div className={`w-32 h-32 rounded-full flex items-center justify-center border shadow-[0_0_40px] ${mode === 'STANDARD' ? 'bg-green-500/10 border-green-500/50 shadow-green-500/30' : 'bg-red-500/10 border-red-500/50 shadow-red-500/30'}`}>
                         {mode === 'STANDARD' ? <CheckCircle2 size={64} className="text-green-500" /> : <AlertTriangle size={64} className="text-red-500" />}
                     </div>
                     <div className={`font-display text-xl tracking-widest ${mode === 'STANDARD' ? 'text-green-500' : 'text-red-500'}`}>
                         {mode === 'STANDARD' ? 'UPLINK SECURE' : 'ROOT SHELL ACTIVE'}
                     </div>
                 </div>
             )}

          </div>

          {/* Terminal Log Footer */}
          <div className="bg-black border-t border-slate-800 p-4 font-mono text-[10px] h-32 flex flex-col">
              <div className="text-slate-500 mb-2 flex justify-between">
                  <span>SYSTEM_LOG</span>
                  <span className={mode === 'EXPLOIT' ? 'text-red-500' : 'text-sci-cyan'}>{stage === 'QR' ? 'LISTENING' : stage}</span>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col justify-end gap-1">
                  {logs.map((log, i) => (
                      <div key={i} className={`truncate animate-in slide-in-from-left-2 duration-200 ${mode === 'EXPLOIT' ? 'text-red-400/80' : 'text-sci-cyan/80'}`}>{log}</div>
                  ))}
              </div>
          </div>

          {/* Bottom Status Bar */}
          <div className={`h-8 border-t flex items-center justify-between px-4 text-[9px] font-mono ${mode === 'STANDARD' ? 'bg-sci-cyan/5 border-sci-cyan/10 text-slate-400' : 'bg-red-900/10 border-red-900/30 text-red-400'}`}>
              <div className="flex items-center gap-2">
                  <ShieldCheck size={10} className={theme.text} /> 
                  {mode === 'STANDARD' ? 'ENCRYPTION: AES-256-GCM' : 'OBFUSCATION: POLYMORPHIC'}
              </div>
              <div className="flex items-center gap-2">
                  <Network size={10} /> 
                  LATENCY: 1ms
              </div>
          </div>

       </div>
    </div>
  );
};

export default RemoteAccessModal;
