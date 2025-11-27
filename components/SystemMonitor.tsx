
import React, { useEffect, useRef, useState } from 'react';
import { Activity, Cpu, Zap, Server } from 'lucide-react';
import AudioStreamer from './AudioStreamer';

interface Props {
  audioListenMode?: boolean;
  connected?: boolean;
}

const SystemMonitor: React.FC<Props> = ({ audioListenMode = false, connected = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({ cpu: 0, mem: 0, net: 0 });
  
  // Real Audio Data Ref (Mutable for Animation Loop)
  const audioLevelRef = useRef(0);

  // Audio Handler
  const handleAudioData = (chunk: Float32Array) => {
      // Calculate simple RMS for visualizer
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) {
          sum += chunk[i] * chunk[i];
      }
      const rms = Math.sqrt(sum / chunk.length);
      // Amplify for visual effect
      audioLevelRef.current = Math.min(100, rms * 500); 
  };

  // Data Fetch Loop
  useEffect(() => {
    const interval = setInterval(async () => {
        if (connected) {
            try {
                const res = await fetch('http://localhost:3001/api/monitor', { signal: AbortSignal.timeout(800) });
                if (res.ok) {
                    const json = await res.json();
                    setMetrics(json);
                }
            } catch {}
        } else {
            // Simulation Mode
            setMetrics(prev => ({
                cpu: Math.min(100, Math.max(5, prev.cpu + (Math.random() - 0.5) * 20)),
                mem: Math.min(100, Math.max(20, prev.mem + (Math.random() - 0.5) * 5)),
                net: Math.max(0, prev.net + (Math.random() - 0.5) * 10)
            }));
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  // Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let tick = 0;
    const history: number[] = Array(50).fill(0); // For line graph

    const drawGauge = (x: number, y: number, radius: number, value: number, color: string, label: string) => {
        // Background Ring
        ctx.beginPath();
        ctx.arc(x, y, radius, 0.75 * Math.PI, 2.25 * Math.PI);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)'; // Slate-800
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Value Ring
        const startAngle = 0.75 * Math.PI;
        const endAngle = 0.75 * Math.PI + (value / 100) * (1.5 * Math.PI);
        
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset

        // Value Text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(value) + '%', x, y + 5);
        
        // Label Text
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'; // Slate-400
        ctx.font = '10px "Rajdhani"';
        ctx.fillText(label, x, y + 25);
    };

    const drawGraph = (x: number, y: number, w: number, h: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        
        history.forEach((val, i) => {
            const px = x + (i / (history.length - 1)) * w;
            // Clamp value
            const clampVal = Math.max(0, Math.min(100, val));
            const py = y + h - (clampVal / 100) * h;
            ctx.lineTo(px, py);
        });
        
        ctx.strokeStyle = audioListenMode ? '#f59e0b' : '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fill Gradient
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.fillStyle = audioListenMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';
        ctx.fill();
        
        // Grid lines
        ctx.beginPath();
        ctx.moveTo(x, y + h/2);
        ctx.lineTo(x + w, y + h/2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const render = () => {
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);
        tick++;

        // Update History for graph
        if (tick % 5 === 0) { 
            history.shift();
            // Use Real Audio Level if in Listen Mode
            if (audioListenMode) {
                history.push(audioLevelRef.current);
            } else {
                history.push(metrics.net * 5); 
            }
        }

        // Draw Gauges
        drawGauge(60, 70, 40, metrics.cpu, '#06b6d4', 'CPU CORE');
        drawGauge(160, 70, 40, metrics.mem, '#8b5cf6', 'MEM ALLOC');
        
        // Draw Graph Area
        drawGraph(20, 140, width - 140, 50);

        // Draw "Hex Rain" Text on Right
        ctx.fillStyle = audioListenMode ? '#f59e0b' : '#10b981';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        
        const logs = [
            `PKT_IN:  ${(Math.random()*999).toFixed(0).padStart(3, '0')}`,
            `PKT_OUT: ${(Math.random()*999).toFixed(0).padStart(3, '0')}`,
            `LATENCY: ${(Math.random()*20).toFixed(0)}ms`,
            `THERMAL: 42°C`,
            `FAN_RPM: 1200`
        ];
        
        logs.forEach((l, i) => {
            ctx.fillText(l, width - 110, 145 + (i * 12));
        });

        // Status Header
        ctx.fillStyle = audioListenMode ? '#f59e0b' : '#3b82f6';
        ctx.font = 'bold 12px "Rajdhani"';
        ctx.fillText(audioListenMode ? 'AUDIO_ANALYSIS_ACTIVE' : connected ? 'REALTIME_TELEMETRY' : 'SIMULATION_MODE', 20, 125);

        // Decorative Corner
        ctx.beginPath();
        ctx.moveTo(width - 10, 10);
        ctx.lineTo(width - 10, 30);
        ctx.lineTo(width - 30, 10);
        ctx.closePath();
        ctx.fillStyle = '#334155';
        ctx.fill();

        animationId = requestAnimationFrame(render);
    };

    // Resize observer
    const resize = () => {
        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
    };
    window.addEventListener('resize', resize);
    resize(); // Init

    render();
    return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);
    };
  }, [metrics, audioListenMode, connected]);

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
            <Activity className={audioListenMode ? 'text-amber-500' : 'text-sci-cyan'} size={16} />
            <h2 className={`font-display font-bold tracking-widest text-xs ${audioListenMode ? 'text-amber-500' : 'text-sci-cyan'}`}>
                {audioListenMode ? 'SENSOR ARRAY' : 'SYSTEM DIAGNOSTICS'}
            </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
            {connected ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>
      
      <div className="flex-1 w-full relative bg-black/40 border border-slate-800/50 rounded overflow-hidden">
        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_2px,rgba(0,0,0,0.1)_2px)] bg-[size:100%_4px] z-10"></div>
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {/* --- REAL SENSOR INTEGRATION --- */}
        <AudioStreamer 
            isStreamingActive={audioListenMode} 
            onAudioData={handleAudioData} 
        />
      </div>
    </div>
  );
};

export default SystemMonitor;
