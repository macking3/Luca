
import React, { useEffect, useRef, useState } from 'react';
import { TacticalMarker } from '../types';
import { Globe, Radio, Crosshair, X } from 'lucide-react';

interface Props {
  targetName: string;
  markers: TacticalMarker[];
  onClose: () => void;
}

const GeoTacticalView: React.FC<Props> = ({ targetName, markers, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const rotationRef = useRef(0);

  // Fake log generation
  useEffect(() => {
    const interval = setInterval(() => {
      const newLog = `[SAT-${Math.floor(Math.random()*99)}] Triangulating sector ${Math.floor(Math.random()*1000)}... Signal: -${Math.floor(Math.random()*50 + 30)}dBm`;
      setLogs(prev => [...prev.slice(-6), newLog]);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // 3D Globe Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const GLOBE_RADIUS = 220;

    const render = () => {
        // Resize handling
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Rotate
        rotationRef.current += 0.002;
        const rotation = rotationRef.current;

        // Helper: Project 3D point to 2D
        const project = (lat: number, lon: number, radius: number) => {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180) + rotation;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            const y = radius * Math.cos(phi);

            // Simple perspective projection
            const scale = 1000 / (1000 - z); 
            return { x: cx + x * scale, y: cy + y * scale, z, visible: z > 0 };
        };

        // Draw Lat/Long Lines (Back then Front)
        ctx.lineWidth = 1;
        
        // Draw Grid Lines
        for (let lat = -80; lat <= 80; lat += 20) {
            ctx.beginPath();
            let firstPoint = true;
            for (let lon = 0; lon <= 360; lon += 5) {
                const p = project(lat, lon, GLOBE_RADIUS);
                if (firstPoint) { ctx.moveTo(p.x, p.y); firstPoint = false; }
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)'; // Very dim Cyan
            ctx.stroke();
        }

        for (let lon = 0; lon < 360; lon += 20) {
            ctx.beginPath();
            let firstPoint = true;
            for (let lat = -90; lat <= 90; lat += 5) {
                const p = project(lat, lon, GLOBE_RADIUS);
                if (firstPoint) { ctx.moveTo(p.x, p.y); firstPoint = false; }
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
            ctx.stroke();
        }

        // Draw Globe Outline
        ctx.beginPath();
        ctx.arc(cx, cy, GLOBE_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw Glow
        const gradient = ctx.createRadialGradient(cx, cy, GLOBE_RADIUS * 0.8, cx, cy, GLOBE_RADIUS * 1.2);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Render Targets
        markers.forEach(marker => {
            const p = project(marker.lat, marker.lng, GLOBE_RADIUS);
            const isTarget = marker.type === 'TARGET';
            const color = isTarget ? '#ef4444' : '#06b6d4'; // Red or Cyan

            if (p.visible) {
                // Draw Point
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Draw Pulsing Ring
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8 + Math.sin(Date.now() * 0.01) * 4, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw Connecting Line to Label
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + 30, p.y - 30);
                ctx.lineTo(p.x + 100, p.y - 30);
                ctx.strokeStyle = color;
                ctx.stroke();

                // Draw Label Text
                ctx.font = 'bold 12px "Rajdhani", sans-serif';
                ctx.fillStyle = color;
                ctx.textAlign = 'left';
                ctx.fillText(marker.label, p.x + 35, p.y - 35);
                
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillText(`LAT: ${marker.lat.toFixed(4)}`, p.x + 35, p.y - 20);
                ctx.fillText(`LNG: ${marker.lng.toFixed(4)}`, p.x + 35, p.y - 8);
            } else {
                // Ghost marker on back side (optional)
                // ctx.beginPath();
                // ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                // ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                // ctx.fill();
            }
        });

        animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [markers]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-lg animate-in fade-in duration-300">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] border border-sci-cyan/30 flex flex-col bg-[#050505] overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)] rounded-lg">
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-slate-900/80 border-b border-sci-cyan/20 p-4 flex justify-between items-center z-50 backdrop-blur">
            <div className="flex items-center gap-4">
                <Globe className="text-sci-cyan animate-pulse" size={24} />
                <div>
                    <h2 className="font-display text-2xl text-white font-bold tracking-widest">GLOBAL TACTICAL FEED</h2>
                    <div className="text-[10px] font-mono text-sci-cyan flex gap-4">
                        <span className="flex items-center gap-1"><Radio size={10}/> SAT_UPLINK: ENCRYPTED</span>
                        <span>LATENCY: 14ms</span>
                        <span className="text-white">TARGET_ID: {targetName}</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-900/30 hover:text-red-500 transition-colors border border-transparent hover:border-red-500 rounded">
                <X size={20} />
            </button>
        </div>

        {/* Main 3D Canvas */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" />
            
            {/* Decorative HUD Elements */}
            <div className="absolute top-24 left-8 w-64 space-y-4 pointer-events-none">
                <div className="border-l-2 border-sci-cyan pl-4">
                    <div className="text-xs text-sci-cyan font-bold tracking-widest">COORDINATE STREAM</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-1">
                        {logs.slice(-4).map((l, i) => <div key={i} className="truncate animate-in slide-in-from-left-2">{l}</div>)}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-40 right-8 w-48 pointer-events-none text-right">
                 <div className="text-[10px] text-sci-cyan font-mono mb-1">ORBITAL SYNC</div>
                 <div className="w-full h-1 bg-slate-800"><div className="h-full bg-sci-cyan w-[80%] animate-pulse"></div></div>
            </div>
        </div>

        {/* Bottom Panel: Telemetry */}
        <div className="h-32 bg-slate-950 border-t border-sci-cyan/20 flex divide-x divide-slate-800 z-50">
            {/* Left: Live Logs */}
            <div className="w-1/3 p-4 font-mono text-[10px] text-sci-cyan overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-2 opacity-50">
                    <Radio size={12} /> SIGNAL INTERCEPT LOG
                </div>
                <div className="flex-1 flex flex-col justify-end">
                    {logs.slice(-3).map((log, i) => (
                        <div key={i} className="truncate opacity-70 hover:opacity-100 border-l-2 border-transparent hover:border-sci-cyan pl-2 transition-all">{log}</div>
                    ))}
                </div>
            </div>
            
            {/* Center: Waveform (Visual) */}
            <div className="w-1/3 p-4 flex items-center justify-center relative overflow-hidden bg-black">
                 <div className="flex items-end gap-px h-16 w-full justify-center opacity-50">
                    {[...Array(40)].map((_, i) => (
                        <div 
                            key={i} 
                            className="w-1 bg-sci-cyan transition-all duration-100"
                            style={{ height: `${Math.random() * 100}%`, opacity: Math.random() }}
                        ></div>
                    ))}
                 </div>
                 <div className="absolute top-2 left-2 text-[10px] font-mono text-white/50 tracking-widest">SPECTRUM ANALYZER [RF]</div>
            </div>

            {/* Right: Target Info */}
            <div className="w-1/3 p-4 font-mono text-xs bg-slate-900/50">
                <div className="mb-2 text-red-500 flex items-center gap-2 font-bold tracking-wider">
                    <Crosshair size={14} /> ACTIVE TRACKING
                </div>
                {markers.length > 0 ? (
                    <div className="space-y-2 text-slate-300">
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span>PRIMARY ID</span>
                            <span className="text-white font-bold">{markers[0].label}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-1">
                            <span>LOCK STATUS</span>
                            <span className="text-red-400 animate-pulse font-bold">{markers[0].status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VECTOR</span>
                            <span className="text-sci-cyan">{markers[0].lat.toFixed(4)}, {markers[0].lng.toFixed(4)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-600 italic">No active targets designated.</div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default GeoTacticalView;
