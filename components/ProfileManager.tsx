
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { User, Mic, FileText, Save, X, Settings } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  currentProfile?: UserProfile;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

const ProfileManager: React.FC<Props> = ({ onClose, onSave, currentProfile }) => {
  const [name, setName] = useState(currentProfile?.name || 'Mac');
  const [voice, setVoice] = useState(currentProfile?.voiceName || 'Kore');
  const [instructions, setInstructions] = useState(currentProfile?.customInstructions || '');

  const handleSave = () => {
    onSave({
      name,
      voiceName: voice,
      customInstructions: instructions
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#050505] border border-rq-blue/40 shadow-[0_0_50px_rgba(59,130,246,0.15)] rounded-lg p-6 flex flex-col gap-6">
        
        <div className="flex justify-between items-center border-b border-rq-blue/20 pb-4">
          <div className="flex items-center gap-3 text-rq-blue">
            <Settings size={24} className="animate-spin-slow" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-widest">USER PROFILE CONFIG</h2>
              <div className="text-[10px] font-mono opacity-60">CUSTOMIZE NEURAL PERSONA</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <User size={14} /> DESIGNATION (YOUR NAME)
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded p-3 text-sm font-mono text-white focus:border-rq-blue focus:outline-none"
              placeholder="Enter your name..."
            />
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Mic size={14} /> AGENT VOICE SYNTHESIS
            </label>
            <div className="grid grid-cols-5 gap-2">
              {VOICES.map(v => (
                <button
                  key={v}
                  onClick={() => setVoice(v)}
                  className={`py-2 text-[10px] font-bold border rounded transition-all ${voice === v ? 'bg-rq-blue text-black border-rq-blue' : 'bg-black border-slate-800 text-slate-500 hover:border-slate-600'}`}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <FileText size={14} /> CUSTOM SYSTEM INSTRUCTIONS
            </label>
            <textarea 
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full h-32 bg-slate-900/50 border border-slate-800 rounded p-3 text-xs font-mono text-green-400 focus:border-rq-blue focus:outline-none resize-none"
              placeholder="Define custom behaviors (e.g., 'Be sarcastic', 'Speak in riddles', 'Focus on React code')..."
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 bg-rq-blue hover:bg-blue-400 text-black font-bold tracking-[0.2em] flex items-center justify-center gap-2 transition-all rounded-sm mt-2"
        >
          <Save size={18} /> SAVE CONFIGURATION
        </button>

      </div>
    </div>
  );
};

export default ProfileManager;
