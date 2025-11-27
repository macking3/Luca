import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Aperture, Scan, Zap, Target, Crosshair, Maximize, Eye, Activity } from 'lucide-react';
import { soundService } from '../services/soundService';

interface Props {
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  onLiveAnalyze?: (base64Image: string) => Promise<string>;
}

const VisionCameraModal: React.FC<Props> = ({ onClose, onCapture, onLiveAnalyze }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [scanTargets, setScanTargets] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            facingMode: "environment" // Prefer back camera on mobile
          } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera Access Denied:", err);
      }
    };

    startCamera();
    soundService.play('HOVER');

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- LIVE SCANNING LOOP (ASTRA MODE) ---
  useEffect(() => {
      let interval: any;
      if (isLiveScanning && onLiveAnalyze) {
          setScanLog(prev => [...prev, "> INITIALIZING ASTRA PROTOCOL..."]);
          soundService.play('PROCESSING');
          
          interval = setInterval(async () => {
              if (!videoRef.current || !canvasRef.current) return;
              
              // 1. Capture Frame silently
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                  canvasRef.current.width = 640; // Low res for speed
                  canvasRef.current.height = 480;
                  ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                  const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
                  
                  // 2. Random Targets Visual Effect
                  setScanTargets(Array.from({length: 3}).map(() => ({
                      x: Math.random() * 80 + 10,
                      y: Math.random() * 80 + 10
                  })));

                  // 3. Send to AI
                  try {
                      const analysis = await onLiveAnalyze(base64);
                      setScanLog(prev => [...prev.slice(-6), `> ${analysis}`]);
                  } catch (e) {
                      console.error("Live Scan Error", e);
                  }
              }
          }, 2000); // Every 2 seconds
      } else {
          setScanTargets([]);
      }
      return () => clearInterval(interval);
  }, [isLiveScanning, onLiveAnalyze]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    soundService.play('PROCESSING');
    setAnalyzing(true);

    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'absolute inset-0 bg-white z-[200] animate-out fade-out duration-500';
    document.body.appendChild(flash);
    setTimeout(() => document.body.removeChild(flash), 500);

    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
      const cleanBase64 = base64.split(',')[1];

      setTimeout(() => {
        onCapture(cleanBase64);
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden font-mono">
      
      {/* Camera Feed Layer */}
      <div className="absolute inset-0 flex items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover opacity-80"
          />
      </div>
      
      {/* Live Scan HUD Overlays */}
      {isLiveScanning && (
          <div className="absolute inset-0 pointer-events-none">
              {/* Scrolling Scanline */}
              <div className="absolute top-0 left-0 w-full h-1 bg-rq-blue/50 animate-[scan_2s_linear_infinite] shadow-[0_0_15px_#3b82f6]"></div>
              
              {/* Random Targets */}
              {scanTargets.map((t, i) => (
                  <div 
                    key={i} 
                    className="absolute w-12 h-12 border border-rq-blue/60 animate-pulse transition-all duration-500"
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                  >
                      <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-rq-blue"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-rq-blue"></div>
                      <div className="absolute top-full left-0 text-[8px] bg-rq-blue/80 text-black px-1 mt-1">ID_{Math.floor(Math.random()*999)}</div>
                  </div>
              ))}

              {/* Side Data Stream */}
              <div className="absolute right-4 top-20 bottom-32 w-64 flex flex-col items-end gap-2 text-[10px] text-rq-blue font-bold tracking-wider opacity-90">
                  <div className="flex items-center gap-2 border-b border-rq-blue/30 pb-1 mb-2">
                      <Activity size={12} className="animate-pulse" /> LIVE_ANALYSIS_STREAM
                  </div>
                  {scanLog.map((log, i) => (
                      <div key={i} className="bg-black/60 px-2 py-1 border-r-2 border-rq-blue animate-in slide-in-from-right-4 fade-in duration-300 text-right max-w-full break-words">
                          {log}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* HUD Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none p-4 md:p-8 flex flex-col justify-between">
          
          {/* Top HUD */}
          <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                  <div className={`flex items-center gap-2 ${isLiveScanning ? 'text-rq-blue animate-pulse' : 'text-slate-400'}`}>
                      <Target size={20} />
                      <span className="text-xs font-bold tracking-[0.2em]">{isLiveScanning ? 'ASTRA_PROTOCOL: ONLINE' : 'VISION_UPLINK_ACTIVE'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500/60">
                      RES: 1080p | FPS: 60 | ISO: AUTO
                  </div>
              </div>
              <button 
                onClick={onClose}
                className="pointer-events-auto p-2 rounded-full border border-slate-700 text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                  <X size={24} />
              </button>
          </div>

          {/* Center Reticle (Hide in live scan for cleaner view) */}
          {!isLiveScanning && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20 rounded-lg flex items-center justify-center">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                
                <Crosshair className="text-white/40 animate-spin-slow" size={32} />
                
                {analyzing && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center">
                        <span className="bg-black/80 text-white px-2 py-1 text-xs font-bold">ANALYZING...</span>
                    </div>
                )}
            </div>
          )}

          {/* Bottom Controls */}
          <div className="flex items-center justify-center relative gap-8 pointer-events-auto">
             
             {/* Live Scan Toggle */}
             {onLiveAnalyze && (
                 <button 
                    onClick={() => setIsLiveScanning(!isLiveScanning)}
                    className={`flex flex-col items-center gap-1 group ${isLiveScanning ? 'text-rq-blue' : 'text-slate-500 hover:text-white'}`}
                 >
                     <div className={`p-3 rounded-full border transition-all ${isLiveScanning ? 'bg-rq-blue/20 border-rq-blue' : 'bg-black/40 border-slate-700'}`}>
                         <Eye size={20} className={isLiveScanning ? 'animate-pulse' : ''} />
                     </div>
                     <span className="text-[9px] font-bold tracking-widest">LIVE SCAN</span>
                 </button>
             )}

             {/* Capture Button */}
             <button 
                onClick={handleCapture}
                disabled={analyzing || isLiveScanning}
                className={`group relative flex items-center justify-center ${isLiveScanning ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
             >
                 <div className="w-20 h-20 rounded-full border-2 border-white group-hover:scale-110 transition-transform duration-300"></div>
                 <div className="absolute w-16 h-16 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors"></div>
                 <div className="absolute w-12 h-12 rounded-full bg-white group-hover:bg-white transition-colors"></div>
                 
                 <Aperture size={24} className="absolute text-black opacity-50 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-500" />
             </button>

             {/* Placeholder for symmetry */}
             <div className="w-[50px]"></div>
          </div>

      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] z-10"></div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VisionCameraModal;
