
import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, CheckCircle2, XCircle, Fingerprint, AlertTriangle } from 'lucide-react';
import { soundService } from '../services/soundService';

interface Props {
  toolName: string;
  args: any;
  onApprove: () => void;
  onDeny: () => void;
}

const SecurityGate: React.FC<Props> = ({ toolName, args, onApprove, onDeny }) => {
  const [timeLeft, setTimeLeft] = useState(15); // Auto-deny after 15s

  useEffect(() => {
    soundService.play('ALERT');
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDeny();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200">
      
      {/* Background Hazard Stripes */}
      <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)] pointer-events-none"></div>

      <div className="relative w-full max-w-lg border-2 border-red-600 bg-[#050000] shadow-[0_0_100px_rgba(239,68,68,0.3)] rounded-sm flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-600 text-black p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 font-bold text-lg tracking-[0.2em]">
                <ShieldAlert className="animate-pulse" /> SECURITY INTERVENTION
            </div>
            <div className="font-mono text-xs font-bold border border-black px-2 py-1 rounded">
                AUTH_TIMEOUT: {timeLeft}s
            </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col gap-6 relative">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-full text-red-500">
                    <Lock size={32} />
                </div>
                <div>
                    <h3 className="text-red-500 font-display text-xl font-bold tracking-wider mb-1">RESTRICTED ACTION DETECTED</h3>
                    <p className="text-slate-400 text-xs font-mono leading-relaxed">
                        The automated agent is attempting to execute a high-risk protocol.
                        Manual administrator authorization is required to proceed.
                    </p>
                </div>
            </div>

            <div className="bg-red-950/10 border border-red-900/50 p-4 font-mono text-xs space-y-2">
                <div className="flex justify-between border-b border-red-900/50 pb-2">
                    <span className="text-red-400">PROTOCOL (TOOL):</span>
                    <span className="text-white font-bold">{toolName}</span>
                </div>
                <div className="space-y-1">
                    <span className="text-red-400 block mb-1">PARAMETERS:</span>
                    <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap break-all bg-black/50 p-2 rounded border border-red-900/30">
                        {JSON.stringify(args, null, 2)}
                    </pre>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                    onClick={onDeny}
                    className="group py-4 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-400 font-bold tracking-widest text-xs flex flex-col items-center gap-2 transition-all"
                >
                    <XCircle size={20} className="group-hover:text-white" />
                    DENY ACCESS
                </button>
                <button 
                    onClick={onApprove}
                    className="group py-4 bg-red-600 hover:bg-red-500 text-black font-bold tracking-widest text-xs flex flex-col items-center gap-2 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)]"
                >
                    <Fingerprint size={20} className="group-hover:scale-110 transition-transform" />
                    AUTHORIZE OVERRIDE
                </button>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-red-950/30 p-2 text-center text-[9px] font-mono text-red-500/60 uppercase tracking-widest">
            <AlertTriangle size={10} className="inline mr-1" /> 
            By authorizing, you accept full liability for system instability.
        </div>

      </div>
    </div>
  );
};

export default SecurityGate;
