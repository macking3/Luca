
import React, { useState, useEffect } from 'react';
import { X, BrainCircuit, Code, Play, Terminal, Plus, Layers, FileText, Cpu } from 'lucide-react';
import { CustomSkill } from '../types';

interface Props {
  onClose: () => void;
  onExecute: (name: string, args: any) => void;
}

const SkillsMatrix: React.FC<Props> = ({ onClose, onExecute }) => {
  const [skills, setSkills] = useState<CustomSkill[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [loading, setLoading] = useState(false);
  
  // Create Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newScript, setNewScript] = useState('');
  const [newLang, setNewLang] = useState<'python' | 'node'>('python');
  const [newInputs, setNewInputs] = useState('');

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/skills/list');
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (e) {
      console.error("Failed to fetch skills");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
      if (!newName || !newScript) return;
      try {
          const inputsArray = newInputs.split(',').map(s => s.trim()).filter(s => s);
          
          const res = await fetch('http://localhost:3001/api/skills/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name: newName,
                  description: newDesc,
                  script: newScript,
                  language: newLang,
                  inputs: inputsArray
              })
          });
          
          if (res.ok) {
              fetchSkills();
              setActiveTab('LIST');
              setNewName('');
              setNewScript('');
          }
      } catch (e) {
          alert("Failed to create skill");
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 font-mono p-2 sm:p-4">
      <div className="relative w-full sm:w-[95%] max-w-sm sm:max-w-2xl lg:max-w-5xl h-full sm:h-[85vh] bg-[#050505] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.1)] rounded-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-purple-900/50 bg-purple-950/10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-600/20 rounded border border-purple-500/50 text-purple-400">
                    <BrainCircuit size={24} />
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold text-white tracking-widest">NEURAL SKILLS MATRIX</h2>
                    <div className="text-[10px] font-mono text-purple-400 flex gap-4">
                        <span>REGISTERED CAPABILITIES: {skills.length}</span>
                        <span>ENGINE: DYNAMIC</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar */}
            <div className="w-64 border-r border-purple-900/30 bg-[#080808] flex flex-col">
                <button 
                    onClick={() => setActiveTab('LIST')}
                    className={`p-4 text-xs font-bold tracking-widest text-left flex items-center gap-3 border-l-2 transition-all ${activeTab === 'LIST' ? 'border-purple-500 bg-purple-900/20 text-purple-300' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                    <Layers size={16} /> ACTIVE SKILLS
                </button>
                <button 
                    onClick={() => setActiveTab('CREATE')}
                    className={`p-4 text-xs font-bold tracking-widest text-left flex items-center gap-3 border-l-2 transition-all ${activeTab === 'CREATE' ? 'border-purple-500 bg-purple-900/20 text-purple-300' : 'border-transparent text-slate-500 hover:text-white'}`}
                >
                    <Plus size={16} /> DEFINE NEW SKILL
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 bg-black p-8 relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(168,85,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                {activeTab === 'LIST' && (
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        {skills.length === 0 && <div className="text-slate-600 italic">No custom skills registered.</div>}
                        {skills.map((skill, i) => (
                            <div key={i} className="border border-purple-900/30 bg-purple-950/5 p-4 rounded hover:border-purple-500/50 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-white font-bold">
                                        <Code size={16} className="text-purple-500" />
                                        {skill.name}
                                    </div>
                                    <span className="text-[9px] border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase">{skill.language}</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-4 h-10 line-clamp-2">{skill.description}</p>
                                
                                <div className="bg-black p-2 rounded text-[9px] font-mono text-slate-500 mb-4 border border-slate-800">
                                    ARGS: {skill.inputs.join(', ') || 'NONE'}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => onExecute(skill.name, {})} className="flex-1 bg-purple-900/20 border border-purple-700 hover:bg-purple-700 hover:text-white text-purple-400 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all">
                                        <Play size={12} /> EXECUTE
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {/* Pre-built Office Skills Card */}
                        <div className="border border-blue-900/30 bg-blue-950/5 p-4 rounded opacity-80">
                            <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                                <FileText size={16} /> OFFICE SUITE (PRE-BUILT)
                            </div>
                            <p className="text-xs text-slate-500 mb-4">Standard productivity modules loaded.</p>
                            <div className="space-y-1 text-[10px] font-mono text-slate-400">
                                <div>• readDocument (PDF/DOCX)</div>
                                <div>• createDocument (Reports)</div>
                                <div>• analyzeSpreadsheet (Excel)</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'CREATE' && (
                    <div className="max-w-2xl mx-auto relative z-10 flex flex-col h-full">
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            <div>
                                <label className="text-xs text-purple-400 font-bold mb-1 block">SKILL NAME (camelCase)</label>
                                <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 p-3 text-white text-sm rounded focus:border-purple-500 outline-none" placeholder="e.g. scrapeReddit" />
                            </div>
                            <div>
                                <label className="text-xs text-purple-400 font-bold mb-1 block">DESCRIPTION</label>
                                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-slate-900 border border-slate-800 p-3 text-white text-sm rounded focus:border-purple-500 outline-none" placeholder="What does this skill do?" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-purple-400 font-bold mb-1 block">LANGUAGE</label>
                                    <select value={newLang} onChange={e => setNewLang(e.target.value as any)} className="w-full bg-slate-900 border border-slate-800 p-3 text-white text-sm rounded focus:border-purple-500 outline-none">
                                        <option value="python">Python 3</option>
                                        <option value="node">Node.js</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-purple-400 font-bold mb-1 block">INPUTS (Comma Separated)</label>
                                    <input value={newInputs} onChange={e => setNewInputs(e.target.value)} className="w-full bg-slate-900 border border-slate-800 p-3 text-white text-sm rounded focus:border-purple-500 outline-none" placeholder="url, limit, query" />
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="text-xs text-purple-400 font-bold mb-1 block">SCRIPT LOGIC</label>
                                <textarea 
                                    value={newScript} 
                                    onChange={e => setNewScript(e.target.value)} 
                                    className="w-full h-64 bg-[#1e1e1e] border border-slate-700 p-4 text-white font-mono text-sm rounded focus:border-purple-500 outline-none resize-none"
                                    placeholder={newLang === 'python' ? "import requests\nprint('Hello World')" : "console.log('Hello World');"}
                                />
                            </div>
                        </div>
                        <button onClick={handleCreate} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-widest flex items-center justify-center gap-2 mt-4 rounded">
                            <Cpu size={18} /> COMPILE & REGISTER SKILL
                        </button>
                    </div>
                )}

            </div>

        </div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
