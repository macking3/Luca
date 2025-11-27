import React, { useEffect, useRef, useState } from 'react';
import { Mic, X, Activity, Volume2, Radio, AudioWaveform, Zap, Cpu, Terminal, Network, Lock, ShieldAlert, Camera, Eye, Globe, ExternalLink } from 'lucide-react';
import { FULL_TOOL_SET } from '../services/geminiService';
import { liveService } from '../services/liveService';

interface Props {
  isActive: boolean;
  onClose: () => void;
  amplitude: number; // 0 to 1
  transcript: string;
  transcriptSource: 'user' | 'model';
  isVadActive: boolean;
  searchResults?: any; // Optional search results (groundingMetadata)
}

const VoiceHud: React.FC<Props> = ({ isActive, onClose, amplitude, transcript, transcriptSource, isVadActive, searchResults }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null); 
  const [dynamicProtocols, setDynamicProtocols] = useState<string[]>([]);
  const [latency, setLatency] = useState(14);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Initialize dynamic tool list and simulate latency fluctuation
  useEffect(() => {
      if (isActive) {
          const tools = FULL_TOOL_SET.map(t => t.name.replace(/([A-Z])/g, '_$1').toUpperCase());
          setDynamicProtocols(tools.sort(() => 0.5 - Math.random()).slice(0, 6));
      } else {
          // Cleanup video on close
          if (videoStream) {
              videoStream.getTracks().forEach(t => t.stop());
              setVideoStream(null);
          }
          setIsVideoActive(false);
      }
      
      const interval = setInterval(() => {
          setLatency(prev => Math.max(5, Math.min(40, prev + (Math.random() - 0.5) * 10)));
      }, 1000);
      return () => clearInterval(interval);
  }, [isActive]);

  // Toggle Video Stream
  const toggleVideo = async () => {
      if (isVideoActive) {
          if (videoStream) {
              videoStream.getTracks().forEach(t => t.stop());
              setVideoStream(null);
          }
          setIsVideoActive(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'environment' } });
              setVideoStream(stream);
              setIsVideoActive(true);
              if (videoRef.current) {
                  videoRef.current.srcObject = stream;
              }
          } catch (e) {
              console.error("Failed to access camera", e);
          }
      }
  };

  // Video Frame Capture Loop
  useEffect(() => {
      let interval: any;
      if (isVideoActive && videoRef.current && captureCanvasRef.current) {
          interval = setInterval(() => {
              if (videoRef.current && captureCanvasRef.current) {
                  const ctx = captureCanvasRef.current.getContext('2d');
                  if (ctx) {
                      captureCanvasRef.current.width = videoRef.current.videoWidth;
                      captureCanvasRef.current.height = videoRef.current.videoHeight;
                      ctx.drawImage(videoRef.current, 0, 0);
                      // Convert to base64 and send
                      const base64 = captureCanvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
                      liveService.sendVideoFrame(base64);
                  }
              }
          }, 1000); // Send 1 frame per second
      }
      return () => clearInterval(interval);
  }, [isVideoActive]);

  // Visualization Loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let tick = 0;

    const draw = () => {
      if (!canvasRef.current) return;
      const { width, height } = canvasRef.current;
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Speed
      tick += 0.05 + (amplitude * 0.2);

      // --- 1. LIQUID PLASMA ORB (The Core) ---
      
      const baseRadius = Math.min(width, height) * 0.18; // Size of the orb
      const activeScale = isVadActive ? 1.2 : 1.0;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      ctx.beginPath();
      // Draw fluid shape
      const points = 120;
      for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          
          // Wave superposition for "liquid" effect
          const w1 = Math.sin(angle * 3 + tick) * 10; 
          const w2 = Math.cos(angle * 6 - tick * 1.5) * 8;
          const w3 = Math.sin(angle * 12 + tick * 5) * (amplitude * 60);
          const pulse = amplitude * 30;

          const r = (baseRadius + w1 + w2 + w3 + pulse) * activeScale;
          
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill Gradient
      const gradient = ctx.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius * 1.5);
      if (isVadActive) {
          // INPUT MODE: Bright White/Cyan
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.4, '#22d3ee');
          gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
      } else if (transcriptSource === 'model' && amplitude > 0.05) {
          // SPEAKING MODE: Deep Blue/Violet Pulse
          gradient.addColorStop(0, '#60a5fa');
          gradient.addColorStop(0.5, '#3b82f6');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
          // IDLE: Darker Blue
          gradient.addColorStop(0, '#3b82f6');
          gradient.addColorStop(0.6, 'rgba(29, 78, 216, 0.5)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
      }

      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Outer Glow Stroke
      ctx.shadowBlur = 20 + (amplitude * 30);
      ctx.shadowColor = isVadActive ? '#22d3ee' : '#3b82f6';
      ctx.strokeStyle = isVadActive ? '#cffafe' : '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset
      ctx.restore();


      // --- 2. OUTER HUD RINGS ---
      
      // Ring 1: Dashed Data Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(tick * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)'; // Cyan dim
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 20]); // Dashed
      ctx.stroke();
      ctx.restore();

      // Ring 2: Segmented Containment
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-tick * 0.5);
      const segments = 3;
      for(let i=0; i<segments; i++) {
          ctx.rotate((Math.PI * 2) / segments);
          ctx.beginPath();
          ctx.arc(0, 0, baseRadius * 2.2, 0, Math.PI * 0.4); // Arc segment
          ctx.strokeStyle = isVadActive ? '#22d3ee' : '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
      }
      ctx.restore();
      
      // Ring 3: Audio Spectrum Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 2.5 + (amplitude * 20), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [amplitude, isVadActive, transcriptSource]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
       
       {/* Background Grid */}
       <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

       {/* Video Stream Element (Hidden until active) */}
       <div className={`absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ${isVideoActive ? 'opacity-40' : 'opacity-0'}`}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {/* Scanner Overlay */}
            {isVideoActive && (
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:100%_4px]">
                    <div className="absolute top-10 left-10 border-t-2 border-l-2 border-rq-blue w-16 h-16"></div>
                    <div className="absolute top-10 right-10 border-t-2 border-r-2 border-rq-blue w-16 h-16"></div>
                    <div className="absolute bottom-10 left-10 border-b-2 border-l-2 border-rq-blue w-16 h-16"></div>
                    <div className="absolute bottom-10 right-10 border-b-2 border-r-2 border-rq-blue w-16 h-16"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-rq-blue/50 w-64 h-64 rounded-full animate-pulse"></div>
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-rq-blue/20 px-4 py-1 text-rq-blue text-xs font-bold font-mono tracking-widest">
                        LIVE VISION FEED ACTIVE
                    </div>
                </div>
            )}
       </div>
       
       {/* Hidden capture canvas */}
       <canvas ref={captureCanvasRef} className="hidden" />

       {/* Main Visualizer Area - Z-Index 20 */}
       <div className="relative w-full h-full flex items-center justify-center z-20 pointer-events-none">
          {/* The Canvas Orb */}
          <canvas 
             ref={canvasRef} 
             width={window.innerWidth} 
             height={window.innerHeight} 
             className="absolute inset-0 w-full h-full"
          />
          
          {/* Center Status Text */}
          <div className="absolute z-20 flex flex-col items-center pointer-events-none">
             <div className={`font-mono text-sm tracking-[0.5em] font-bold mb-96 transition-all duration-300 ${isVadActive ? 'text-white scale-110' : 'text-sci-cyan/50'}`}>
                {isVadActive ? 'LISTENING' : transcriptSource === 'model' && amplitude > 0.05 ? 'SPEAKING' : 'STANDBY'}
             </div>
          </div>

          {/* CENTRAL DISPLAY AREA: TRANSCRIPT OR SEARCH RESULTS */}
          <div className="absolute bottom-32 w-full max-w-4xl flex flex-col items-center justify-center z-30">
              
              {searchResults && searchResults.groundingChunks ? (
                  // SEARCH RESULTS MODE (SCROLLABLE LIST)
                  <div className="pointer-events-auto bg-black/80 border border-sci-cyan/30 rounded-lg p-6 backdrop-blur-md shadow-[0_0_50px_rgba(6,182,212,0.15)] max-h-[50vh] w-full max-w-2xl overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-10 fade-in duration-500">
                      <div className="flex items-center justify-between mb-4 border-b border-sci-cyan/20 pb-2">
                          <div className="flex items-center gap-2 text-sci-cyan font-bold tracking-widest text-xs">
                              <Globe size={14} className="animate-pulse" /> INTELLIGENCE FEED
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">SOURCES: {searchResults.groundingChunks.length}</div>
                      </div>
                      <div className="grid gap-3">
                          {searchResults.groundingChunks.map((chunk: any, i: number) => {
                              if (!chunk.web?.uri) return null;
                              return (
                                  <a 
                                    key={i}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noreferrer" 
                                    className="flex flex-col gap-1 p-3 rounded bg-white/5 hover:bg-sci-cyan/10 border border-transparent hover:border-sci-cyan/30 transition-all group"
                                  >
                                      <div className="text-white font-bold text-sm leading-snug group-hover:text-sci-cyan transition-colors">
                                          {chunk.web.title}
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                                          <ExternalLink size={10} />
                                          <span className="truncate">{new URL(chunk.web.uri).hostname}</span>
                                      </div>
                                  </a>
                              )
                          })}
                      </div>
                  </div>
              ) : (
                  // TRANSCRIPT MODE (STANDARD OVERLAY)
                  <div className="text-center space-y-6 px-8 pointer-events-none w-full">
                      {transcript ? (
                          <div className={`font-display text-2xl md:text-4xl tracking-wide font-bold leading-relaxed transition-all duration-300 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${
                            transcriptSource === 'model' ? 'text-sci-cyan' : 'text-white'
                          }`}>
                            "{transcript}"
                          </div>
                      ) : (
                          <div className="text-slate-600 font-mono text-xs animate-pulse">WAITING FOR AUDIO INPUT...</div>
                      )}
                  </div>
              )}
          </div>

          {/* Left Panel: Dynamic Active Protocols */}
          <div className="absolute left-12 bottom-1/3 hidden md:flex flex-col gap-4 w-64 font-mono text-xs z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-sci-cyan font-bold border-b border-sci-cyan/30 pb-2 mb-2">
                  <Terminal size={14} /> ACTIVE PROTOCOLS
              </div>
              <div className="space-y-3 text-slate-400">
                  {dynamicProtocols.map((proto, i) => (
                    <div key={i} className="group flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                        <div className="w-1 h-1 bg-sci-cyan rounded-full animate-pulse"></div>
                        <span>"{proto}"</span>
                    </div>
                  ))}
                  <div className="text-[8px] opacity-30 pt-2">...AND {FULL_TOOL_SET.length - 6} MORE MODULES</div>
              </div>
          </div>

          {/* Right Panel: Telemetry ONLY (Restored) */}
          <div className="absolute right-12 bottom-24 hidden md:flex flex-col gap-2 w-80 font-mono text-[10px] text-right z-30 pointer-events-auto">
                <div className="text-sci-cyan font-bold mb-2">TELEMETRY STREAM</div>
                
                <div className="flex justify-end items-center gap-2 text-slate-400">
                    <span>LATENCY</span>
                    <span className="text-white font-bold">{latency.toFixed(0)}ms</span>
                </div>
                
                <div className="flex justify-end items-center gap-2 text-slate-400">
                    <span>AUDIO_INPUT_DB</span>
                    <div className="w-16 h-1 bg-slate-800 rounded overflow-hidden">
                        <div className="h-full bg-sci-cyan" style={{ width: `${amplitude * 100}%` }}></div>
                    </div>
                </div>

                {isVideoActive && (
                    <div className="flex justify-end items-center gap-2 text-rq-blue">
                        <span>VIDEO_FEED</span>
                        <div className="w-2 h-2 rounded-full bg-rq-blue animate-pulse"></div>
                    </div>
                )}

                <div className="flex justify-end items-center gap-2 text-slate-400">
                    <span>SPECTRUM_SHFT</span>
                    <span className="text-white font-bold">{(amplitude * 1000).toFixed(0)}Hz</span>
                </div>
                
                <div className="mt-4 p-2 border border-red-500/30 bg-red-900/10 text-red-400 flex items-center justify-center gap-2">
                    <ShieldAlert size={12} /> FIREWALL: ACTIVE
                </div>
          </div>

       </div>

       {/* Header Controls - BOOSTED Z-INDEX AND POINTER EVENTS */}
       <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-[100] pointer-events-none">
         <div className="flex flex-col gap-2 pointer-events-auto">
            <h2 className="font-display text-3xl text-white tracking-[0.2em] font-bold flex items-center gap-3">
                <Activity className="text-sci-cyan animate-pulse" />
                LUCA<span className="text-sci-cyan">_OS</span>
            </h2>
            <div className="text-[10px] font-mono text-sci-cyan opacity-80 flex gap-6 pl-1">
                <span className="flex items-center gap-2"><Cpu size={12} /> NEURAL_NET: ONLINE</span>
                <span className="flex items-center gap-2 text-green-400"><Radio size={12} /> VAD: LIVEKIT_TUNED</span>
                <span className="flex items-center gap-2 text-green-400"><Lock size={12} /> ENCRYPTION: AES-256</span>
            </div>
         </div>
         <div className="flex gap-4 pointer-events-auto">
            <button 
                onClick={toggleVideo}
                className={`cursor-pointer group p-4 rounded-full border transition-all ${isVideoActive ? 'bg-rq-blue/20 border-rq-blue text-rq-blue' : 'bg-black/40 border-white/10 hover:bg-white/10 text-slate-400'}`}
                title="Toggle Vision"
            >
                <Camera size={24} />
                {isVideoActive && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-rq-blue whitespace-nowrap">VISION ON</div>}
            </button>
            <button 
                onClick={onClose} 
                className="cursor-pointer group p-4 rounded-full border border-white/10 hover:bg-red-900/50 hover:border-red-500 hover:text-white transition-all bg-black/60 z-[110] backdrop-blur-sm"
                title="Terminate Voice Uplink"
            >
                <X size={24} className="text-slate-400 group-hover:text-white" />
            </button>
         </div>
       </div>

       {/* Footer Status - Z-Index 60 */}
       <div className="absolute bottom-8 flex items-center justify-center gap-12 text-[10px] font-mono text-slate-500 uppercase tracking-widest z-[60] pointer-events-none">
           <div className="flex items-center gap-2">
               <Volume2 size={12} className={amplitude > 0.5 ? 'text-white' : ''} />
               VOL: {(amplitude * 100).toFixed(0)}%
           </div>
           <div className="flex items-center gap-2">
               <Radio size={12} className="animate-pulse text-sci-cyan" />
               LOW_LATENCY_LINK
           </div>
           <div className="flex items-center gap-2">
               <Eye size={12} className={isVideoActive ? 'text-rq-blue' : ''} />
               VISION: {isVideoActive ? 'ONLINE' : 'OFFLINE'}
           </div>
           <div className="flex items-center gap-2">
               <Zap size={12} />
               CORE_TEMP: NORMAL
           </div>
       </div>

    </div>
  );
};

export default VoiceHud;