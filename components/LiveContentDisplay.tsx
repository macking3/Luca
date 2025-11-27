
import React from 'react';
import { X, Globe, Youtube, ExternalLink, Play, Newspaper, Activity } from 'lucide-react';

interface Props {
  content: any; // groundingMetadata
  onClose: () => void;
}

const LiveContentDisplay: React.FC<Props> = ({ content, onClose }) => {
  const chunks = content?.groundingChunks || [];
  
  // Filter content types
  const videos = chunks.filter((c: any) => c.web?.uri?.includes('youtube.com') || c.web?.uri?.includes('youtu.be'));
  const articles = chunks.filter((c: any) => !videos.includes(c));

  const getYoutubeId = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="absolute top-24 right-6 w-[400px] max-h-[80vh] flex flex-col gap-4 z-40 pointer-events-none">
        {/* Container needs pointer-events-auto for interaction */}
        <div className="bg-[#050505]/90 backdrop-blur-md border border-rq-blue/30 rounded-lg shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-right duration-500">
            
            {/* Header */}
            <div className="bg-slate-900/80 p-3 border-b border-rq-blue/20 flex justify-between items-center">
                <div className="flex items-center gap-2 text-rq-blue text-xs font-bold tracking-widest">
                    <Activity size={14} className="animate-pulse" />
                    LIVE INTEL FEED
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar max-h-[600px] space-y-4">
                
                {/* Video Section */}
                {videos.length > 0 && (
                    <div className="space-y-3">
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 border-b border-slate-800 pb-1">
                            <Youtube size={12} className="text-red-500" /> VIDEO STREAMS
                        </div>
                        {videos.map((video: any, i: number) => {
                            const id = getYoutubeId(video.web.uri);
                            if (!id) return null;
                            return (
                                <div key={i} className="rounded overflow-hidden border border-slate-800 shadow-lg bg-black group hover:border-red-900/50 transition-colors">
                                    <div className="relative aspect-video">
                                        <iframe 
                                            width="100%" 
                                            height="100%" 
                                            src={`https://www.youtube.com/embed/${id}?autoplay=${i === 0 ? 1 : 0}&mute=1&controls=1`} 
                                            title={video.web.title}
                                            frameBorder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowFullScreen
                                            className="absolute inset-0"
                                        ></iframe>
                                    </div>
                                    <div className="p-2 bg-slate-900/80 border-t border-slate-800">
                                        <div className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">{video.web.title}</div>
                                        <div className="text-[9px] text-slate-500 font-mono">SOURCE: YOUTUBE</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Article Section */}
                {articles.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 border-b border-slate-800 pb-1">
                            <Newspaper size={12} className="text-emerald-500" /> WEB SOURCES
                        </div>
                        {articles.map((article: any, i: number) => {
                            const hostname = new URL(article.web.uri).hostname.replace('www.', '');
                            return (
                                <a 
                                    key={i} 
                                    href={article.web.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block p-3 bg-white/5 border border-white/5 hover:border-rq-blue/50 hover:bg-white/10 rounded transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-0.5 h-full bg-rq-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="text-xs font-bold text-slate-200 group-hover:text-rq-blue mb-1 line-clamp-2 leading-snug">
                                        {article.web.title}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                        <span className="truncate max-w-[200px] flex items-center gap-1">
                                            <Globe size={8} /> {hostname}
                                        </span>
                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-rq-blue" />
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}

                {chunks.length === 0 && (
                    <div className="text-center text-xs text-slate-500 py-10 font-mono border border-dashed border-slate-800 rounded">
                        NO_INTEL_FOUND
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="h-8 bg-rq-blue/5 border-t border-rq-blue/20 flex items-center px-4 justify-between text-[9px] font-mono text-rq-blue">
                <span>SOURCES: {chunks.length}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-rq-blue rounded-full animate-pulse"></span> LIVE_FEED</span>
            </div>
        </div>
    </div>
  );
};

export default LiveContentDisplay;
