
import React, { useEffect, useState } from 'react';
import { X, MessageSquare, RefreshCw, ShieldCheck, User, Send, LogOut } from 'lucide-react';
import QRCode from 'qrcode';

interface Props {
  onClose: () => void;
}

const WhatsAppManager: React.FC<Props> = ({ onClose }) => {
  const [status, setStatus] = useState('INIT');
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Poll status
  useEffect(() => {
    // Try to start the client if not running (Lazy Load)
    startWhatsApp();
    
    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, []);

  const startWhatsApp = async () => {
      try {
          await fetch('http://localhost:3001/api/whatsapp/start', { method: 'POST' });
      } catch(e) {
          console.error("Failed to start WhatsApp service");
      }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/whatsapp/status');
      const data = await res.json();
      setStatus(data.status);
      
      if (data.status === 'SCAN_QR' && data.qr) {
        setQrData(data.qr);
        QRCode.toDataURL(data.qr, { margin: 2, scale: 5, color: { dark: '#10b981', light: '#000000' } })
          .then(url => setQrImage(url));
      }

      if (data.status === 'READY' && chats.length === 0) {
        fetchChats();
      }
    } catch (e) {
      setStatus('ERROR_OFFLINE');
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/whatsapp/chats');
      const data = await res.json();
      if (data.chats) setChats(data.chats);
    } catch (e) {
      console.error("Failed to fetch chats");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
      if (confirm("Are you sure you want to disconnect the current WhatsApp session?")) {
          try {
              await fetch('http://localhost:3001/api/whatsapp/logout', { method: 'POST' });
              setStatus('INIT');
              setQrImage(null);
              setChats([]);
          } catch (e) {
              alert("Logout failed");
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-[800px] h-[600px] bg-[#0a0a0a] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-emerald-900/50 bg-emerald-950/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 text-emerald-500">
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-widest">WHATSAPP NEURAL LINK</h2>
              <div className="text-[10px] font-mono text-emerald-600/80 flex gap-3 items-center">
                <span>PROTOCOL: WHATSAPP-WEB.JS (MCP)</span>
                <span className={`px-2 py-0.5 rounded text-black font-bold ${status === 'READY' ? 'bg-emerald-500' : 'bg-yellow-500'}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          
          {/* Left: Connection Status */}
          <div className="w-1/2 p-8 flex flex-col items-center justify-center border-r border-emerald-900/20 bg-black relative">
             {status === 'READY' ? (
               <div className="text-center space-y-4 animate-in zoom-in duration-300 w-full flex flex-col items-center">
                 <div className="w-32 h-32 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                   <ShieldCheck size={64} className="text-emerald-500" />
                 </div>
                 <div className="text-emerald-400 font-bold tracking-widest">UPLINK ESTABLISHED</div>
                 <p className="text-xs text-slate-500 font-mono max-w-xs">
                   Neural interface active. You can now instruct LUCA to send messages directly.
                 </p>
                 <button 
                    onClick={handleLogout}
                    className="mt-4 flex items-center gap-2 px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 text-xs font-bold rounded transition-colors"
                 >
                     <LogOut size={12} /> DISCONNECT SESSION
                 </button>
               </div>
             ) : status === 'SCAN_QR' ? (
               <div className="flex flex-col items-center space-y-4 animate-in fade-in">
                 <div className="relative p-2 bg-white/5 rounded-lg border border-emerald-500/30">
                   {qrImage ? (
                     <img src={qrImage} alt="Scan QR" className="w-48 h-48 object-contain" />
                   ) : (
                     <div className="w-48 h-48 flex items-center justify-center text-emerald-500/50">
                       <RefreshCw className="animate-spin" />
                     </div>
                   )}
                   {/* Scan Line */}
                   <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_10px_#10b981] animate-[scan_2s_linear_infinite]"></div>
                 </div>
                 <div className="text-center">
                   <div className="text-sm text-white font-bold mb-1">AUTHENTICATION REQUIRED</div>
                   <div className="text-[10px] text-slate-500 font-mono">Open WhatsApp &gt; Linked Devices &gt; Link a Device</div>
                 </div>
               </div>
             ) : status === 'AUTHENTICATED' ? (
               <div className="text-center text-emerald-500 font-mono text-xs animate-pulse flex flex-col items-center gap-4">
                   <RefreshCw size={32} className="animate-spin" />
                   <div>PHONE PAIRED. DOWNLOADING MESSAGES...</div>
               </div>
             ) : (
               <div className="text-center text-slate-500 font-mono text-xs">
                 {status === 'ERROR_OFFLINE' ? 'CORE OFFLINE. CANNOT CONNECT.' : 'INITIALIZING CLIENT...'}
               </div>
             )}
          </div>

          {/* Right: Live Chat Preview */}
          <div className="w-1/2 flex flex-col bg-[#050505]">
            <div className="p-4 border-b border-emerald-900/20 flex justify-between items-center text-xs font-bold text-slate-400">
              <span>ACTIVE THREADS</span>
              <button onClick={fetchChats} className="hover:text-white"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-700 text-xs font-mono italic p-8 text-center">
                  {status === 'READY' ? 'No recent chats found.' : 'Waiting for connection...'}
                </div>
              ) : (
                <div className="divide-y divide-emerald-900/10">
                  {chats.map((chat: any) => (
                    <div key={chat.id._serialized} className="p-4 hover:bg-emerald-900/5 transition-colors cursor-default group">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                          <User size={14} className="text-emerald-600" />
                          {chat.name || chat.id.user}
                        </div>
                        <div className="text-[10px] text-slate-600">{new Date(chat.timestamp * 1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate group-hover:text-emerald-500/70 transition-colors">
                        {chat.lastMessage?.body || '[Media]'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-emerald-900/20 bg-black text-[10px] text-slate-500 font-mono text-center">
              Use the Agent Chat to send messages.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WhatsAppManager;
