
import React, { useEffect, useRef } from 'react';

interface Props {
  status: 'NORMAL' | 'CAUTION' | 'CRITICAL' | 'LOCKED';
  amplitude: number; // 0 to 1
  isProcessing: boolean;
}

const HolographicCore: React.FC<Props> = ({ status, amplitude, isProcessing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getColor = () => {
    switch (status) {
      case 'CRITICAL': return { r: 239, g: 68, b: 68 }; // Red
      case 'LOCKED': return { r: 239, g: 0, b: 0 }; // Deep Red
      case 'CAUTION': return { r: 245, g: 158, b: 11 }; // Amber
      default: return { r: 6, g: 182, b: 212 }; // Cyan
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;
    let animationId: number;

    const draw = () => {
      if (!canvas) return;
      const { width, height } = canvas;
      const color = getColor();
      
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      // Processing Speed Multiplier
      const speed = isProcessing ? 0.15 : 0.02;
      tick += speed + (amplitude * 0.2);

      // GLOBAL GLOW
      const glowSize = 20 + (amplitude * 50);
      const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 60);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // INNER CORE (Geodesic Sphere feel)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tick * 0.5);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
      ctx.lineWidth = 2;
      
      // Draw 3 rotating rings
      for (let i = 0; i < 3; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        const radius = 15 + (amplitude * 10);
        ctx.ellipse(0, 0, radius, radius * 0.4, tick + (i * 2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // OUTER SHELL (Data Rings)
      ctx.save();
      ctx.translate(cx, cy);
      
      // Ring 1 (Clockwise)
      ctx.rotate(tick * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 1.5);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ring 2 (Counter-Clockwise)
      ctx.rotate(-tick * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, 38 + (amplitude * 5), 0, Math.PI);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // PARTICLES (If processing or talking)
      if (isProcessing || amplitude > 0.1) {
          const particleCount = 8;
          for(let i=0; i<particleCount; i++) {
              const angle = (tick * 2) + (i * (Math.PI * 2 / particleCount));
              const dist = 45 + Math.sin(tick * 5 + i) * 5;
              const px = cx + Math.cos(angle) * dist;
              const py = cy + Math.sin(angle) * dist;
              
              ctx.beginPath();
              ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fill();
          }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [status, amplitude, isProcessing]);

  return <canvas ref={canvasRef} width={120} height={120} className="w-full h-full" />;
};

export default HolographicCore;
