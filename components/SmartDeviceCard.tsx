
import React from 'react';
import { SmartDevice, DeviceType } from '../types';
import { Lightbulb, Lock, Server, Bot, Video, Activity, Smartphone, Tv } from 'lucide-react';

interface Props {
  device: SmartDevice;
  onControlClick?: (device: SmartDevice) => void;
}

const SmartDeviceCard: React.FC<Props> = ({ device, onControlClick }) => {
  const getIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT: return <Lightbulb size={20} />;
      case DeviceType.LOCK: return <Lock size={20} />;
      case DeviceType.SERVER: return <Server size={20} />;
      case DeviceType.ROBOTIC_ARM: return <Bot size={20} />;
      case DeviceType.CAMERA: return <Video size={20} />;
      case DeviceType.MOBILE: return <Smartphone size={20} />;
      case DeviceType.SMART_TV: return <Tv size={20} />;
      default: return <Activity size={20} />;
    }
  };

  const activeColor = device.status === 'error' ? 'text-rq-red border-rq-red bg-rq-red-dim' 
    : device.isOn ? 'text-rq-blue border-rq-blue bg-rq-blue-dim' 
    : 'text-slate-500 border-slate-700 bg-slate-900';

  return (
    <div className={`
      relative p-4 border rounded-sm transition-all duration-500
      flex flex-col gap-2 backdrop-blur-sm group
      ${activeColor}
    `}>
      <div className="flex justify-between items-start">
        <div className="p-2 rounded-full bg-black/50 border border-white/10">
            {getIcon()}
        </div>
        <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-400' : 'bg-red-500'} animate-pulse`} />
            <span className="text-[10px] uppercase tracking-wider font-mono opacity-70">{device.status}</span>
        </div>
      </div>
      
      <div>
        <h3 className="font-display font-bold text-lg tracking-wide truncate">{device.name}</h3>
        <p className="font-mono text-xs opacity-60">{device.location}</p>
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-xs">
        <span>STATUS:</span>
        <span className={`font-bold ${device.isOn ? 'text-white' : 'opacity-50'}`}>
            {device.isOn ? 'ACTIVE' : 'STANDBY'}
        </span>
      </div>

      {device.type === DeviceType.SMART_TV && onControlClick && (
        <button 
            onClick={() => onControlClick(device)}
            className="mt-2 w-full py-1 bg-black/50 hover:bg-rq-blue hover:text-black border border-white/10 text-[10px] font-bold tracking-widest transition-colors"
        >
            LAUNCH REMOTE
        </button>
      )}

      {device.type === DeviceType.MOBILE && onControlClick && (
        <button 
            onClick={() => onControlClick(device)}
            className="mt-2 w-full py-1 bg-black/50 hover:bg-rq-blue hover:text-black border border-white/10 text-[10px] font-bold tracking-widest transition-colors"
        >
            ACCESS UPLINK
        </button>
      )}
    </div>
  );
};

export default SmartDeviceCard;