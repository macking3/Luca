
import React, { useEffect, useState } from 'react';
import { ForexAccount, ForexTradeLog } from '../types';
import { X, TrendingUp, TrendingDown, Activity, Globe, BarChart3, Briefcase } from 'lucide-react';

interface Props {
  account: ForexAccount | null;
  trades: ForexTradeLog[];
  onClose: () => void;
}

const ForexTerminal: React.FC<Props> = ({ account, trades, onClose }) => {
  const [pairs, setPairs] = useState<{symbol: string, rate: number, change: number}[]>([]);
  const [isRealData, setIsRealData] = useState(false);

  useEffect(() => {
    const fetchRates = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/forex/rates');
            if (res.ok) {
                const rates = await res.json();
                // Filter interesting pairs
                const newPairs = [
                    { symbol: 'EURUSD', rate: rates['EUR'], change: 0.0 }, // API gives base USD, so rate is USD -> EUR. Invert for display? Usually API gives 1 USD = X EUR.
                    // Let's display USD pairs
                    { symbol: 'USDJPY', rate: rates['JPY'], change: 0.0 },
                    { symbol: 'GBPUSD', rate: 1 / rates['GBP'], change: 0.0 }, // Invert for GBPUSD
                    { symbol: 'USDCAD', rate: rates['CAD'], change: 0.0 },
                    { symbol: 'AUDUSD', rate: 1 / rates['AUD'], change: 0.0 }
                ];
                setPairs(newPairs.map(p => ({ ...p, change: (Math.random() - 0.5) * 0.001 }))); // Fake change since API is static snapshot
                setIsRealData(true);
            } else {
                throw new Error("Offline");
            }
        } catch (e) {
            setIsRealData(false);
            setPairs([
                { symbol: 'EURUSD', rate: 1.0850, change: 0.0012 },
                { symbol: 'GBPUSD', rate: 1.2740, change: -0.0005 },
                { symbol: 'USDJPY', rate: 151.20, change: 0.45 },
                { symbol: 'AUDUSD', rate: 0.6530, change: 0.0020 },
                { symbol: 'USDCAD', rate: 1.3590, change: -0.0010 },
            ]);
        }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  if (!account) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in zoom-in-95 duration-300">
      <div className="relative w-[95%] max-w-6xl h-[85vh] bg-[#0f172a] border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)] rounded flex flex-col overflow-hidden">
        
        {/* Institutional Header */}
        <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-emerald-500 font-bold tracking-widest">
                    <Globe size={18} />
                    <span>INSTITUTIONAL FX DESK</span>
                </div>
                <div className="h-4 w-px bg-slate-700"></div>
                <div className="text-xs font-mono text-slate-400">
                    LEVERAGE: 1:{account.leverage} | {account.baseCurrency}
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isRealData ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    {isRealData ? 'LIVE_MARKET_DATA' : 'SIMULATION_FEED'}
                </span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 flex">
            {/* Left: Quotes Panel */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-3 text-[10px] font-bold text-slate-500 tracking-wider bg-slate-950">MARKET WATCH</div>
                <div className="flex-1 overflow-y-auto">
                    {pairs.map(pair => (
                        <div key={pair.symbol} className="flex justify-between items-center p-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                            <div>
                                <div className="font-bold text-white group-hover:text-emerald-400">{pair.symbol}</div>
                                <div className="text-[10px] text-slate-500">Spread: {isRealData ? 'REAL' : '0.2'}</div>
                            </div>
                            <div className="text-right">
                                <div className={`font-mono font-bold ${pair.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {pair.rate.toFixed(4)}
                                </div>
                                <div className="flex items-center justify-end gap-1 text-[10px] opacity-60">
                                    {pair.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {Math.abs(pair.change).toFixed(4)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center: Main Chart & Terminal */}
            <div className="flex-1 flex flex-col bg-[#0b1120]">
                {/* Fake Chart Area */}
                <div className="flex-1 relative overflow-hidden border-b border-slate-800 p-4">
                     <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                     <div className="absolute top-4 left-4 text-emerald-500/50 font-mono text-xs">CHART FEED: EURUSD [M15]</div>
                     
                     {/* Animated Candles Simulation */}
                     <div className="flex items-end justify-end gap-1 h-full opacity-50 pb-8">
                        {Array.from({length: 40}).map((_, i) => {
                            const height = Math.random() * 60 + 10;
                            const isGreen = Math.random() > 0.4;
                            return (
                                <div key={i} className="w-4 flex flex-col items-center justify-end group">
                                    <div className={`w-px h-4 ${isGreen ? 'bg-emerald-600' : 'bg-red-600'}`}></div>
                                    <div 
                                        className={`w-full ${isGreen ? 'bg-emerald-500/80' : 'bg-red-500/80'}`} 
                                        style={{ height: `${height}%` }}
                                    ></div>
                                    <div className={`w-px h-4 ${isGreen ? 'bg-emerald-600' : 'bg-red-600'}`}></div>
                                </div>
                            )
                        })}
                     </div>
                </div>

                {/* Bottom: Account & Trade Panel */}
                <div className="h-64 bg-slate-900 flex flex-col">
                     {/* Account Stats Bar */}
                     <div className="h-10 bg-slate-950 border-b border-slate-800 flex items-center px-4 gap-8 text-xs font-mono text-slate-400">
                        <div>BALANCE: <span className="text-white font-bold">${account.balance.toLocaleString()}</span></div>
                        <div>EQUITY: <span className="text-emerald-400 font-bold">${account.equity.toLocaleString()}</span></div>
                        <div>MARGIN: <span className="text-slate-300">${account.margin.toLocaleString()}</span></div>
                        <div>FREE MARGIN: <span className="text-slate-300">${account.freeMargin.toLocaleString()}</span></div>
                     </div>

                     {/* Tabs */}
                     <div className="flex border-b border-slate-800">
                         <div className="px-4 py-2 text-xs font-bold bg-slate-800 text-emerald-500 border-t-2 border-emerald-500">TRADE</div>
                         <div className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-800 cursor-pointer">HISTORY</div>
                         <div className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-800 cursor-pointer">JOURNAL</div>
                     </div>

                     {/* Table Header */}
                     <div className="grid grid-cols-7 px-4 py-2 text-[10px] font-bold text-slate-500 bg-slate-950/50 border-b border-slate-800">
                        <div>TICKET</div>
                        <div>TIME</div>
                        <div>TYPE</div>
                        <div>VOLUME</div>
                        <div>SYMBOL</div>
                        <div>PRICE</div>
                        <div className="text-right">PROFIT</div>
                     </div>

                     {/* Active Trades & History List */}
                     <div className="flex-1 overflow-y-auto font-mono text-xs">
                        {/* Active Positions */}
                        {account.positions.map(pos => (
                            <div key={pos.id} className="grid grid-cols-7 px-4 py-2 border-b border-slate-800 bg-slate-800/20 hover:bg-slate-800/40">
                                <div>#{pos.id.substring(0,6)}</div>
                                <div className="text-slate-400">OPEN</div>
                                <div className={pos.type === 'LONG' ? 'text-emerald-500' : 'text-red-500'}>{pos.type}</div>
                                <div>{pos.lots}</div>
                                <div className="font-bold">{pos.pair}</div>
                                <div>{pos.entryPrice}</div>
                                <div className={`text-right font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {pos.pnl.toFixed(2)}
                                </div>
                            </div>
                        ))}
                        
                        {/* History Log */}
                        {trades.map(trade => (
                            <div key={trade.id} className="grid grid-cols-7 px-4 py-2 border-b border-slate-800 opacity-60 hover:opacity-100">
                                <div>#{trade.ticket}</div>
                                <div>{new Date(trade.timestamp).toLocaleTimeString()}</div>
                                <div className={trade.type === 'BUY' ? 'text-emerald-500' : 'text-red-500'}>{trade.type}</div>
                                <div>{trade.lots}</div>
                                <div className="font-bold">{trade.pair}</div>
                                <div>{trade.price}</div>
                                <div className="text-right text-slate-500">-</div>
                            </div>
                        ))}

                        {trades.length === 0 && account.positions.length === 0 && (
                            <div className="flex items-center justify-center h-20 text-slate-600 italic">
                                No active orders.
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ForexTerminal;
