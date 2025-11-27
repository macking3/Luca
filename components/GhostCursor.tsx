
import React, { useEffect, useState } from 'react';
import { MousePointer2 } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  type: string; // 'CLICK', 'MOVE'
  isActive: boolean;
}

const GhostCursor: React.FC<Props> = ({ x, y, type, isActive }) => {
  const [visible, setVisible] = useState(false);
  const [clickAnim, setClickAnim] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      if (type.includes('CLICK')) {
        setClickAnim(true);
        setTimeout(() => setClickAnim(false), 500);
      }
      
      // Auto-hide after 3 seconds of inactivity
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [x, y, type, isActive]);

  if (!visible) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none transition-all duration-300 ease-out flex flex-col items-center"
      style={{ 
        left: x, 
        top: y,
        transform: 'translate(-50%, -50%)' 
      }}
    >
      {/* Reticle Ring */}
      <div className={`w-8 h-8 rounded-full border-2 border-rq-blue flex items-center justify-center ${clickAnim ? 'scale-50 bg-rq-blue/50' : 'scale-100'} transition-transform duration-200`}>
          <div className="w-1 h-1 bg-rq-blue rounded-full"></div>
      </div>
      
      {/* Lines */}
      <div className="absolute w-12 h-px bg-rq-blue/50 top-4"></div>
      <div className="absolute h-12 w-px bg-rq-blue/50 left-4"></div>

      {/* Label */}
      <div className="mt-6 bg-black/80 text-rq-blue font-mono text-[9px] px-2 py-1 rounded border border-rq-blue shadow-lg whitespace-nowrap">
          AI_CURSOR: {x},{y}
      </div>
    </div>
  );
};

export default GhostCursor;
