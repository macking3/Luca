
import React, { useState } from 'react';
import { X, Github, Download, Terminal, Database } from 'lucide-react';

interface Props {
  onClose: () => void;
  onIngest: (url: string) => void;
}

const IngestionModal: React.FC<Props> = ({ onClose, onIngest }) => {
  const [url, setUrl] = useState('');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#050505] border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)] rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
        
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3 text-green-500">
                <div className="p-2 border border-green-500/30 bg-green-500/10 rounded">
                    <Github size={24} />
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold tracking-widest">KNOWLEDGE INGESTION</h2>
                    <p className="text-[10px] font-mono text-green-500/60">INTEGRATE EXTERNAL OPEN SOURCE INTELLIGENCE</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400">TARGET REPOSITORY URL</label>
                <div className="relative">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        className="w-full bg-black border border-slate-800 rounded p-3 pl-10 text-sm font-mono text-green-400 focus:border-green-500 focus:outline-none placeholder:text-slate-700"
                        autoFocus
                    />
                </div>
            </div>

            <div className="p-4 border border-green-900/30 bg-green-900/5 rounded text-[10px] font-mono text-slate-400">
                <div className="flex items-center gap-2 text-green-500 mb-2 font-bold">
                    <Database size={12} /> NEURAL PROTOCOL:
                </div>
                <ul className="space-y-1 list-disc pl-4">
                    <li>Deep recursive scan of source trees.</li>
                    <li>Extracts core logic patterns (Python/JS/Rust).</li>
                    <li>Vectorizes capabilities for autonomous usage.</li>
                    <li>Auto-generates wrapper scripts via Engineer Persona.</li>
                </ul>
            </div>

            <button 
                onClick={() => { if(url) onIngest(url); }}
                disabled={!url}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold tracking-[0.2em] flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={18} /> INITIATE TRANSFER
            </button>
        </div>
      </div>
    </div>
  );
};

export default IngestionModal;
