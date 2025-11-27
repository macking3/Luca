
import React, { useEffect, useState } from 'react';
import { OsintProfile, OsintHit } from '../types';
import { X, User, Globe, ShieldAlert, Search, Lock, FileText, AlertTriangle, UserSearch, Share2, Fingerprint, Network, PieChart } from 'lucide-react';

interface Props {
  profile: OsintProfile | null;
  onClose: () => void;
}

const OsintDossier: React.FC<Props> = ({ profile, onClose }) => {
  const [scanProgress, setScanProgress] = useState(0);
  
  useEffect(() => {
    if (profile?.status === 'SCANNING') {
      const interval = setInterval(() => {
        setScanProgress(prev => (prev < 100 ? prev + 1 : 100));
      }, 30);
      return () => clearInterval(interval);
    } else {
        setScanProgress(100);
    }
  }, [profile]);

  if (!profile) return null;

  const socialCount = profile.hits.filter(h => h.category === 'SOCIAL').length;
  const darkCount = profile.hits.filter(h => h.category === 'DARK_WEB').length;
  const domainCount = profile.hits.filter(h => h.category === 'DOMAIN').length;
  const totalCount = profile.hits.length;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="relative w-[95%] max-w-5xl h-[85vh] bg-black border border-rq-blue/40 shadow-[0_0_40px_rgba(59,130,246,0.15)] rounded-sm flex flex-col overflow-hidden">
        
        {/* Scanning Overlay */}
        {scanProgress < 100 && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center font-mono gap-4">
                <UserSearch size={48} className="text-rq-blue animate-pulse" />
                <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rq-blue transition-all duration-100" style={{ width: `${scanProgress}%` }}></div>
                </div>
                <div className="text-xs text-rq-blue tracking-widest">BUILDING TARGET PROFILE... {scanProgress}%</div>
            </div>
        )}

        {/* Header */}
        <div className="h-16 border-b border-rq-border bg-rq-panel flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <div className="p-2 border border-rq-red/50 bg-rq-red/10 rounded-sm text-rq-red">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h2 className="font-display text-2xl font-bold text-white tracking-[0.2em]">DIGITAL DOSSIER</h2>
                    <div className="text-[10px] font-mono text-slate-500 flex gap-4 uppercase">
                        <span>REF: {profile.target}</span>
                        <span>SOURCE: OSINT_AGGREGATOR_V9</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            
            {/* Left Column: Identity & Risk Assessment */}
            <div className="w-[280px] border-r border-rq-border p-6 bg-[#050505] flex flex-col gap-6">
                <div className="relative aspect-square bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden rounded-sm">
                    <User size={80} className="text-slate-700" />
                    <div className="absolute inset-0 border-[20px] border-transparent border-t-rq-blue/20 border-b-rq-blue/20 opacity-50 rounded-full animate-pulse"></div>
                    <div className="absolute top-2 right-2 text-[10px] font-mono text-rq-blue">CONFIDENCE: 99.8%</div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-[10px] font-bold text-slate-600 tracking-widest mb-1">TARGET IDENTIFIER</div>
                        <div className="font-mono text-xl text-white font-bold border-b border-rq-blue/30 pb-2">{profile.target}</div>
                    </div>
                    
                    <div>
                        <div className="text-[10px] font-bold text-slate-600 tracking-widest mb-2">RISK SCORE BREAKDOWN</div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`font-display text-4xl font-bold ${profile.riskScore > 70 ? 'text-rq-red' : 'text-rq-blue'}`}>
                                {profile.riskScore}
                            </div>
                            <div className="text-[9px] text-slate-500 leading-tight">
                                AGGREGATED<br/>THREAT LEVEL
                            </div>
                        </div>
                        {/* Mini Risk Bars */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] text-slate-400"><span>EXPOSURE</span><span>{Math.min(100, totalCount * 10)}%</span></div>
                            <div className="h-1 bg-slate-800 w-full"><div className="h-full bg-rq-blue" style={{width: `${Math.min(100, totalCount * 10)}%`}}></div></div>
                            
                            <div className="flex justify-between text-[9px] text-slate-400"><span>LEAK GRAVITY</span><span>{Math.min(100, darkCount * 30)}%</span></div>
                            <div className="h-1 bg-slate-800 w-full"><div className="h-full bg-rq-red" style={{width: `${Math.min(100, darkCount * 30)}%`}}></div></div>
                        </div>
                    </div>

                    <div className="p-3 bg-rq-red/5 border border-rq-red/20 rounded-sm">
                        <div className="flex items-center gap-2 text-rq-red text-xs font-bold mb-2">
                            <AlertTriangle size={12} /> THREAT ASSESSMENT
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Subject exhibits high digital footprint. {darkCount > 0 ? "CRITICAL: Credentials found in leak databases." : "No direct dark web leaks found."} Recommend continuous monitoring.
                        </p>
                    </div>
                </div>
            </div>

            {/* Center Column: Intelligence Data Feed */}
            <div className="flex-1 bg-black flex flex-col border-r border-rq-border">
                
                {/* Filter Stats Bar */}
                <div className="h-12 border-b border-rq-border flex divide-x divide-rq-border bg-rq-panel/30">
                    <div className="flex-1 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <Globe size={14} className="text-rq-blue" />
                        <span>SOCIAL: {socialCount}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <Lock size={14} className="text-rq-red" />
                        <span>LEAKS: {darkCount}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <Network size={14} className="text-emerald-500" />
                        <span>DOMAIN: {domainCount}</span>
                    </div>
                </div>

                {/* Hits List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 relative">
                    {/* Background Lines */}
                    <div className="absolute top-0 bottom-0 left-8 w-px bg-slate-800/50 z-0"></div>

                    {profile.hits.length === 0 && (
                        <div className="text-slate-600 italic text-sm font-mono text-center mt-10">No public records found.</div>
                    )}

                    {profile.hits.map((hit, i) => (
                        <div key={i} className="relative z-10 flex gap-4 group">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-black shrink-0 transition-colors ${
                                hit.category === 'DARK_WEB' ? 'border-red-900 group-hover:border-rq-red text-rq-red' : 
                                hit.category === 'SOCIAL' ? 'border-blue-900 group-hover:border-rq-blue text-rq-blue' : 
                                'border-emerald-900 group-hover:border-emerald-500 text-emerald-500'
                            }`}>
                                {hit.category === 'DARK_WEB' ? <Lock size={14} /> : hit.category === 'DOMAIN' ? <Globe size={14} /> : <Search size={14} />}
                            </div>
                            
                            <div className="flex-1 border border-rq-border bg-rq-panel/50 p-3 hover:border-rq-blue/50 transition-colors cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold text-sm text-white mb-1">{hit.platform}</div>
                                    <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                        CONF: {(hit.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="font-mono text-xs text-slate-500 truncate group-hover:text-rq-blue transition-colors">
                                    {hit.url}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Metadata Footer */}
                <div className="p-4 border-t border-rq-border bg-rq-panel/30 grid grid-cols-2 gap-4 font-mono text-xs">
                     {Object.entries(profile.meta).map(([key, value]) => (
                         <div key={key} className="flex justify-between border-b border-slate-800 pb-1">
                             <span className="text-slate-500">{key}</span>
                             <span className="text-sci-cyan max-w-[150px] truncate text-right" title={String(value)}>{value}</span>
                         </div>
                     ))}
                </div>
            </div>

            {/* Right Column: Relationship Graph */}
            <div className="w-[300px] bg-[#020202] flex flex-col">
                <div className="p-4 border-b border-rq-border">
                    <h3 className="text-xs font-bold text-rq-blue tracking-widest flex items-center gap-2">
                        <Share2 size={14} /> RELATIONSHIP GRAPH
                    </h3>
                </div>
                <div className="flex-1 relative overflow-hidden p-4">
                    {/* Abstract Graph Visualization */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,rgba(59,130,246,0.2)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                    
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Center Node */}
                        <div className="absolute z-20 w-12 h-12 bg-slate-900 border-2 border-rq-blue rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <Fingerprint size={24} className="text-white" />
                        </div>

                        {/* Orbiting Nodes */}
                        {profile.hits.slice(0, 6).map((hit, i, arr) => {
                            const angle = (i / arr.length) * Math.PI * 2;
                            const radius = 80;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            
                            return (
                                <div key={i} className="absolute z-10" style={{ transform: `translate(${x}px, ${y}px)` }}>
                                    {/* Line to center */}
                                    <div 
                                        className="absolute top-1/2 left-1/2 h-px bg-slate-700 origin-left -z-10"
                                        style={{ 
                                            width: `${radius}px`, 
                                            transform: `rotate(${angle + Math.PI}rad)`,
                                        }}
                                    ></div>
                                    
                                    <div className={`w-6 h-6 rounded-full border bg-black flex items-center justify-center ${
                                        hit.category === 'DARK_WEB' ? 'border-rq-red text-rq-red' : 'border-slate-600 text-slate-500'
                                    }`}>
                                        <div className="w-1 h-1 rounded-full bg-current"></div>
                                    </div>
                                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-slate-500 whitespace-nowrap bg-black/80 px-1">
                                        {hit.platform}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="h-1/3 border-t border-rq-border p-4 bg-rq-panel/10">
                    <h3 className="text-xs font-bold text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                        <PieChart size={12} /> DATA DISTRIBUTION
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <div className="w-2 h-2 bg-rq-blue rounded-full"></div> SOCIAL MEDIA ({(socialCount/totalCount * 100).toFixed(0)}%)
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <div className="w-2 h-2 bg-rq-red rounded-full"></div> DARK WEB ({(darkCount/totalCount * 100).toFixed(0)}%)
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> INFRASTRUCTURE ({(domainCount/totalCount * 100).toFixed(0)}%)
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
};

export default OsintDossier;