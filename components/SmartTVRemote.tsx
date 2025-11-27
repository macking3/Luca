
import React, { useState } from 'react';
import { SmartDevice } from '../types';
import { Power, Volume2, Home, Tv, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Youtube, Wifi, Lock, Grid3x3, ArrowLeft, Menu, LogOut } from 'lucide-react';

interface Props {
  device: SmartDevice | null;
  onClose: () => void;
  onCommand: (cmd: string) => void;
}

const SmartTVRemote: React.FC<Props> = ({ device, onClose, onCommand }) => {
  const [pressed, setPressed] = useState<string | null>(null);
  const [pairingMode, setPairingMode] = useState(false); // Simulating auth requirement
  const [pin, setPin] = useState('');

  if (!device) return null;

  // Determine brand for UI customization
  const nameLower = device.name.toLowerCase();
  let brand = 'UNIVERSAL';
  let osName = 'SMART_TV';
  
  if (nameLower.includes('samsung')) { brand = 'SAMSUNG'; osName = 'TIZEN_OS'; }
  else if (nameLower.includes('lg')) { brand = 'LG'; osName = 'WEB_OS'; }
  else if (nameLower.includes('sony')) { brand = 'SONY'; osName = 'ANDROID_TV'; }
  else if (nameLower.includes('hisense') || nameLower.includes('vidaa')) { brand = 'HISENSE'; osName = 'VIDAA_OS'; }
  else if (nameLower.includes('roku')) { brand = 'ROKU'; osName = 'ROKU_OS'; }

  const handlePress = (cmd: string) => {
    setPressed(cmd);
    onCommand(cmd);
    setTimeout(() => setPressed(null), 200);
  };

  const handlePinSubmit = () => {
      if (pin.length >= 4) {
          // Simulate sending PIN to backend
          onCommand(`AUTH_PAIR::${pin}`);
          setPairingMode(false);
          setPin('');
      }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
        {/* Remote Body */}
        <div className="relative w-80 bg-[#050505] border border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
            
            {/* IR Blaster Visual */}
            <div className="h-4 w-full bg-slate-900 flex justify-center items-center">
                 <div className={`w-2 h-2 rounded-full ${pressed ? 'bg-rq-red shadow-[0_0_10px_red]' : 'bg-red-900'}`}></div>
            </div>

            {/* Screen / Status */}
            <div className="h-32 bg-slate-900 border-b border-slate-800 p-5 flex flex-col justify-between relative overflow-hidden">
                {/* Scanline */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:100%_4px]"></div>
                
                <div className="flex justify-between items-start z-10">
                    <div className="text-[10px] font-mono text-slate-500">{brand} REMOTE</div>
                    <button onClick={onClose} className="text-slate-600 hover:text-white"><X size={16}/></button>
                </div>
                <div className="z-10">
                    <div className="text-rq-blue font-display font-bold text-xl truncate">{device.name}</div>
                    <div className="flex items-center justify-between mt-1">
                        <div className="text-[10px] font-mono text-green-500 flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 bg-green-500 rounded-full ${pairingMode ? '' : 'animate-pulse'}`}></div>
                            {pairingMode ? 'AUTH_REQUIRED' : `${osName} LINKED`}
                        </div>
                        {pairingMode ? <Lock size={14} className="text-amber-500 animate-pulse" /> : <Wifi size={14} className="text-rq-blue" />}
                    </div>
                </div>
            </div>

            {/* PAIRING OVERLAY */}
            {pairingMode ? (
                <div className="p-6 flex flex-col items-center gap-4 h-[450px] justify-center bg-black/90 absolute bottom-0 w-full z-20 backdrop-blur-md">
                    <div className="text-amber-500 text-xs font-bold tracking-widest flex items-center gap-2">
                        <Grid3x3 size={16} /> ENTER PAIRING PIN
                    </div>
                    <div className="text-[10px] text-slate-500 text-center px-4">
                        Enter the code displayed on the {brand !== 'UNIVERSAL' ? brand : 'Target'} TV screen.
                    </div>
                    <input 
                        type="text" 
                        maxLength={8}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="bg-slate-900 border border-slate-700 text-white text-center text-2xl font-mono tracking-[0.5em] w-40 py-2 rounded focus:border-rq-blue outline-none"
                        placeholder="----"
                    />
                    <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                            <button key={n} onClick={() => setPin(p => (p.length < 8 ? p + n : p))} className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded font-mono text-sm">{n}</button>
                        ))}
                        <button onClick={() => setPin('')} className="bg-red-900/30 text-red-500 py-3 rounded font-mono text-[10px]">CLR</button>
                        <button onClick={() => setPin(p => (p.length < 8 ? p + 0 : p))} className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded font-mono text-sm">0</button>
                        <button onClick={handlePinSubmit} className="bg-rq-blue text-black py-3 rounded font-mono text-[10px] font-bold">OK</button>
                    </div>
                </div>
            ) : (
                /* STANDARD CONTROLS */
                <div className="p-6 flex flex-col gap-6 bg-[#050505]">
                    {/* Power & Sources */}
                    <div className="flex justify-between px-6">
                        <button 
                            onClick={() => handlePress('POWER')}
                            className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all shadow-lg ${pressed === 'POWER' ? 'bg-red-500 border-red-500 text-white shadow-red-500/50' : 'border-slate-800 bg-slate-900/50 text-red-500 hover:bg-red-900/20'}`}
                        >
                            <Power size={22} />
                        </button>
                        <button 
                             onClick={() => handlePress('INPUT')}
                             className="w-14 h-14 rounded-full flex items-center justify-center border border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                        >
                            <Tv size={22} />
                        </button>
                    </div>

                    {/* Navigation Area */}
                    <div className="relative flex flex-col items-center gap-2 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                        {/* Nav Header Buttons */}
                        <div className="flex justify-between w-full px-2 mb-2">
                            <button onClick={() => handlePress('MENU')} className="text-[9px] font-bold text-slate-500 hover:text-white flex flex-col items-center gap-1 group">
                                <Menu size={16} className="group-hover:text-rq-blue"/> MENU
                            </button>
                            <button onClick={() => handlePress('EXIT')} className="text-[9px] font-bold text-slate-500 hover:text-white flex flex-col items-center gap-1 group">
                                <LogOut size={16} className="group-hover:text-red-500"/> EXIT
                            </button>
                        </div>

                        {/* D-Pad */}
                        <button onClick={() => handlePress('UP')} className="w-12 h-10 rounded-t-lg bg-slate-800 hover:bg-rq-blue hover:text-black text-slate-400 flex items-center justify-center transition-colors border-b border-black"><ChevronUp size={20}/></button>
                        <div className="flex gap-3">
                            <button onClick={() => handlePress('LEFT')} className="w-10 h-12 rounded-l-lg bg-slate-800 hover:bg-rq-blue hover:text-black text-slate-400 flex items-center justify-center transition-colors border-r border-black"><ChevronLeft size={20}/></button>
                            <button onClick={() => handlePress('OK')} className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-white hover:border-rq-blue font-bold text-[10px] shadow-inner active:scale-95 transition-all">OK</button>
                            <button onClick={() => handlePress('RIGHT')} className="w-10 h-12 rounded-r-lg bg-slate-800 hover:bg-rq-blue hover:text-black text-slate-400 flex items-center justify-center transition-colors border-l border-black"><ChevronRight size={20}/></button>
                        </div>
                        <button onClick={() => handlePress('DOWN')} className="w-12 h-10 rounded-b-lg bg-slate-800 hover:bg-rq-blue hover:text-black text-slate-400 flex items-center justify-center transition-colors border-t border-black"><ChevronDown size={20}/></button>
                        
                        {/* Back Button */}
                        <button 
                            onClick={() => handlePress('BACK')} 
                            className="absolute bottom-4 left-4 text-slate-500 hover:text-white flex items-center gap-1 text-[9px] font-bold"
                        >
                            <ArrowLeft size={14} /> BACK
                        </button>
                    </div>

                    {/* Vol / Channel / Home */}
                    <div className="flex justify-between items-center px-2">
                        <div className="flex flex-col gap-2 bg-slate-900 rounded-full p-1 border border-slate-800">
                             <button onClick={() => handlePress('VOL_UP')} className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center"><Volume2 size={16}/></button>
                             <button onClick={() => handlePress('VOL_DOWN')} className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center"><Volume2 size={14} className="opacity-50" /></button>
                        </div>
                        
                        <div className="flex flex-col gap-4 justify-center">
                            <button onClick={() => handlePress('HOME')} className="w-12 h-12 rounded-full border border-slate-700 text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                <Home size={20} />
                            </button>
                            <button 
                                onClick={() => setPairingMode(true)} 
                                className="text-[8px] font-mono text-amber-600 hover:text-amber-400 border border-amber-900/30 px-2 py-1 rounded text-center"
                                title="Force Re-Pair"
                            >
                                PAIR
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 bg-slate-900 rounded-full p-1 border border-slate-800">
                             <button onClick={() => handlePress('CH_UP')} className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">CH+</button>
                             <button onClick={() => handlePress('CH_DOWN')} className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">CH-</button>
                        </div>
                    </div>

                    {/* App Shortcuts */}
                    <div className="grid grid-cols-2 gap-3 mt-1">
                        <button onClick={() => handlePress('NETFLIX')} className="h-10 bg-black border border-red-900/50 rounded text-red-500 font-bold text-[10px] tracking-wider hover:bg-red-600 hover:text-white transition-colors">NETFLIX</button>
                        <button onClick={() => handlePress('YOUTUBE')} className="h-10 bg-black border border-white/20 rounded text-white font-bold text-[10px] tracking-wider hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-1"><Youtube size={12} /> YouTube</button>
                        <button onClick={() => handlePress('PRIME')} className="h-10 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 font-bold text-[10px] tracking-wider hover:bg-blue-500 hover:text-white transition-colors">PRIME</button>
                        <button onClick={() => handlePress('DISNEY')} className="h-10 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 font-bold text-[10px] tracking-wider hover:bg-indigo-500 hover:text-white transition-colors">DISNEY+</button>
                    </div>

                </div>
            )}
        </div>
    </div>
  );
};

export default SmartTVRemote;
