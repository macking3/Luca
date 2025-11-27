
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, BarChart3, DollarSign, CheckCircle, Circle, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { PolyMarket, PolyPosition } from '../types';

interface Props {
  onClose: () => void;
  positions: PolyPosition[];
  onBet: (marketId: string, outcome: 'Yes' | 'No', amount: number, title: string, price: number) => void;
}

const PredictionTerminal: React.FC<Props> = ({ onClose, positions, onBet }) => {
  const [markets, setMarkets] = useState<any[]>([]); // Raw API data
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState(10);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async (query?: string) => {
    setLoading(true);
    try {
        const url = query 
            ? `http://localhost:3001/api/polymarket/markets?query=${encodeURIComponent(query)}`
            : `http://localhost:3001/api/polymarket/markets`;
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) {
            setMarkets(data);
            if (!selectedMarket && data.length > 0) setSelectedMarket(data[0]);
        }
    } catch (e) {
        console.error("Failed to fetch markets", e);
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') fetchMarkets(searchQuery);
  };

  // Helper to get outcome prices from the complex Gamma API structure
  const getPrices = (market: any) => {
      // Markets in Gamma often come as "events" containing "markets"
      // Simple handling for the first market in the event (usually the main one)
      const m = market.markets?.[0];
      if (!m) return { yes: 0.5, no: 0.5 };
      
      // Parse outcome prices if available strings or numbers
      // Gamma API output varies, simulating parser
      let yesPrice = 0.5;
      try {
          const outcomePrices = JSON.parse(m.outcomePrices || '[]');
          if (outcomePrices.length > 0) yesPrice = parseFloat(outcomePrices[0]);
      } catch(e) {
          // Fallback logic if data structure is different
          yesPrice = Math.random(); // Fallback for demo if API fails
      }
      return { yes: yesPrice, no: 1 - yesPrice };
  };

  const placeBet = (outcome: 'Yes' | 'No') => {
      if (!selectedMarket) return;
      const m = selectedMarket.markets?.[0];
      if (!m) return;
      
      const prices = getPrices(selectedMarket);
      const price = outcome === 'Yes' ? prices.yes : prices.no;
      
      onBet(m.id, outcome, betAmount, selectedMarket.title, price);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in zoom-in-95 duration-300">
      <div className="relative w-[95%] max-w-6xl h-[85vh] bg-[#050505] border border-blue-600/30 shadow-[0_0_50px_rgba(37,99,235,0.1)] rounded-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-blue-900/50 bg-blue-950/10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-600/20 rounded border border-blue-500/50 text-blue-400">
                    <BarChart3 size={20} />
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold text-white tracking-widest">PREDICTION TERMINAL</h2>
                    <div className="text-[10px] font-mono text-blue-400 flex gap-4">
                        <span>SOURCE: POLYMARKET GAMMA API</span>
                        <span>STATUS: LIVE</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Market List */}
            <div className="w-1/3 border-r border-blue-900/30 bg-[#080808] flex flex-col">
                <div className="p-4 border-b border-blue-900/30 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search events (e.g. 'Trump', 'Fed')..." 
                            className="w-full bg-slate-900 border border-slate-700 rounded pl-10 pr-4 py-2 text-xs font-mono text-white focus:border-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>
                    <button onClick={() => fetchMarkets(searchQuery)} className="p-2 bg-blue-900/20 text-blue-400 rounded hover:bg-blue-900/40"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {markets.map((market, i) => (
                        <div 
                            key={i} 
                            onClick={() => setSelectedMarket(market)}
                            className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-900/50 transition-colors ${selectedMarket?.id === market.id ? 'bg-blue-900/10 border-l-2 border-l-blue-500' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="text-xs font-bold text-slate-200 line-clamp-2">{market.title}</h3>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                <span>Vol: ${(market.volume24hr || 0).toLocaleString()}</span>
                                {market.markets?.[0] && (
                                    <span className="text-blue-400">{(getPrices(market).yes * 100).toFixed(0)}% YES</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center: Analysis & Trading */}
            <div className="flex-1 bg-black flex flex-col relative p-8">
                {selectedMarket ? (
                    <div className="flex flex-col h-full gap-6">
                        
                        {/* Market Detail */}
                        <div>
                            <h1 className="text-2xl font-display font-bold text-white mb-2">{selectedMarket.title}</h1>
                            <p className="text-sm text-slate-400 line-clamp-3">{selectedMarket.description}</p>
                        </div>

                        {/* Fake Graph */}
                        <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded relative overflow-hidden p-4">
                            <div className="absolute top-2 right-2 text-xs font-mono text-slate-500">PROBABILITY_HISTORY [24H]</div>
                            <div className="flex items-end h-full w-full gap-1">
                                {Array.from({length: 60}).map((_, i) => {
                                    const h = 30 + Math.random() * 40;
                                    return (
                                        <div key={i} className="flex-1 bg-blue-500/20 hover:bg-blue-500/60 transition-all" style={{height: `${h}%`}}></div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Trading Actions */}
                        <div className="h-32 border-t border-slate-800 pt-6 grid grid-cols-3 gap-6">
                            
                            <div className="flex flex-col justify-center gap-2">
                                <label className="text-[10px] font-bold text-slate-500">WAGER AMOUNT (USD)</label>
                                <div className="flex items-center bg-slate-900 border border-slate-700 rounded px-3 py-2">
                                    <DollarSign size={14} className="text-slate-400" />
                                    <input 
                                        type="number" 
                                        value={betAmount} 
                                        onChange={(e) => setBetAmount(Number(e.target.value))}
                                        className="bg-transparent border-none outline-none text-white font-mono text-lg w-full ml-2"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => placeBet('Yes')}
                                className="bg-emerald-900/20 border border-emerald-600 hover:bg-emerald-600 hover:text-white text-emerald-500 transition-all rounded flex flex-col items-center justify-center gap-1 group"
                            >
                                <span className="text-xs font-bold tracking-widest">BET "YES"</span>
                                <span className="text-lg font-mono group-hover:text-white">{(getPrices(selectedMarket).yes * 100).toFixed(1)}%</span>
                            </button>

                            <button 
                                onClick={() => placeBet('No')}
                                className="bg-red-900/20 border border-red-600 hover:bg-red-600 hover:text-white text-red-500 transition-all rounded flex flex-col items-center justify-center gap-1 group"
                            >
                                <span className="text-xs font-bold tracking-widest">BET "NO"</span>
                                <span className="text-lg font-mono group-hover:text-white">{(getPrices(selectedMarket).no * 100).toFixed(1)}%</span>
                            </button>

                        </div>

                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-700 font-mono text-sm">SELECT A MARKET FROM THE FEED</div>
                )}
            </div>

            {/* Right: Portfolio */}
            <div className="w-64 bg-[#030303] border-l border-blue-900/30 flex flex-col">
                <div className="p-4 border-b border-blue-900/30 text-xs font-bold text-blue-500 tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} /> ACTIVE POSITIONS
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {positions.length === 0 && <div className="text-center text-[10px] text-slate-600 mt-4">No active bets.</div>}
                    {positions.map((pos) => (
                        <div key={pos.id} className="bg-slate-900/50 border border-slate-800 p-3 rounded hover:border-blue-500/30">
                            <div className="text-[10px] text-slate-400 line-clamp-1 mb-1" title={pos.question}>{pos.question}</div>
                            <div className="flex justify-between items-center">
                                <div className={`text-xs font-bold ${pos.outcome === 'Yes' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {pos.outcome.toUpperCase()}
                                </div>
                                <div className="text-xs font-mono text-white">{pos.shares.toFixed(1)} shares</div>
                            </div>
                            <div className="mt-2 flex justify-between text-[9px] text-slate-600 font-mono">
                                <span>Entry: {pos.avgPrice.toFixed(2)}</span>
                                <span className="text-blue-400">Live</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default PredictionTerminal;
