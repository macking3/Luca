
import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, Activity, RefreshCw, Newspaper, DollarSign, PieChart } from 'lucide-react';

interface Props {
  onClose: () => void;
  initialSymbol?: string;
}

const StockTerminal: React.FC<Props> = ({ onClose, initialSymbol }) => {
  const [symbol, setSymbol] = useState(initialSymbol || 'AAPL');
  const [stockData, setStockData] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
      setLoading(true);
      try {
          // Parallel fetch
          const [stockRes, newsRes] = await Promise.all([
              fetch(`http://localhost:3001/api/finance/stock/${symbol}`),
              fetch(`http://localhost:3001/api/finance/news`)
          ]);
          
          if (stockRes.ok) setStockData(await stockRes.json());
          if (newsRes.ok) setNews(await newsRes.json());
          
      } catch (e) {
          console.error("Stock Data Fetch Failed");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, [symbol]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-in zoom-in-95 duration-300 font-mono p-2 sm:p-4">
      <div className="relative w-full sm:w-[95%] max-w-sm sm:max-w-2xl lg:max-w-6xl h-full sm:h-[85vh] bg-[#0a0a0a] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-emerald-900/50 bg-emerald-950/10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-600/10 rounded border border-emerald-500/30 text-emerald-500">
                    <Activity size={20} />
                </div>
                <div>
                    <h2 className="font-display text-xl font-bold text-white tracking-widest">EQUITY INTELLIGENCE</h2>
                    <div className="text-[10px] font-mono text-emerald-600 flex gap-4">
                        <span>EXCHANGE: NASDAQ/NYSE</span>
                        <span>STATUS: {stockData?.status || 'CONNECTING...'}</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
            
            {/* Left: Ticker & Stats */}
            <div className="w-80 border-r border-emerald-900/30 bg-[#050505] flex flex-col p-6">
                <div className="mb-6 relative">
                    <input 
                        type="text" 
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 pl-4 text-xl font-bold text-white focus:border-emerald-500 outline-none tracking-widest"
                        placeholder="TICKER"
                    />
                    <button onClick={fetchData} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {stockData ? (
                    <div className="space-y-6">
                        <div>
                            <div className="text-4xl font-bold text-white">${stockData.price}</div>
                            <div className={`flex items-center gap-2 text-sm font-bold ${parseFloat(stockData.change) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {parseFloat(stockData.change) >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {stockData.change} ({stockData.changePercent})
                            </div>
                        </div>

                        <div className="space-y-3 text-xs text-slate-400 border-t border-emerald-900/30 pt-4">
                            <div className="flex justify-between"><span>OPEN</span><span className="text-white">{stockData.open}</span></div>
                            <div className="flex justify-between"><span>HIGH</span><span className="text-white">{stockData.high}</span></div>
                            <div className="flex justify-between"><span>LOW</span><span className="text-white">{stockData.low}</span></div>
                            <div className="flex justify-between"><span>VOL</span><span className="text-white">{stockData.volume}</span></div>
                            <div className="flex justify-between"><span>MKT CAP</span><span className="text-white">{stockData.marketCap}</span></div>
                            <div className="flex justify-between"><span>P/E</span><span className="text-white">{stockData.peRatio}</span></div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-600 text-xs italic mt-10">Enter a ticker to load data.</div>
                )}
            </div>

            {/* Center: Chart (Simulated) */}
            <div className="flex-1 bg-black relative flex flex-col">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
                
                <div className="flex-1 flex items-end px-10 pb-10 gap-1">
                    {Array.from({length: 60}).map((_, i) => {
                        const h = Math.random() * 60 + 10;
                        const isGreen = Math.random() > 0.45;
                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                <div className={`w-1 mx-auto h-full ${isGreen ? 'bg-emerald-800' : 'bg-red-900'} opacity-30 group-hover:opacity-100`}></div>
                                <div 
                                    className={`w-full ${isGreen ? 'bg-emerald-500' : 'bg-red-500'} hover:brightness-125 transition-all`} 
                                    style={{ height: `${h}%` }}
                                ></div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Right: News Feed */}
            <div className="w-80 border-l border-emerald-900/30 bg-[#050505] flex flex-col">
                <div className="p-4 border-b border-emerald-900/30 text-xs font-bold text-emerald-500 tracking-widest flex items-center gap-2">
                    <Newspaper size={14} /> MARKET WIRE
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {news.map((item, i) => (
                        <div key={i} className="group cursor-pointer">
                            <div className="text-[10px] text-emerald-700 mb-1 flex justify-between">
                                <span>{item.source}</span>
                                <span>{item.time}</span>
                            </div>
                            <div className="text-xs text-slate-300 font-bold group-hover:text-emerald-400 transition-colors leading-snug">
                                {item.title}
                            </div>
                            <div className="h-px w-full bg-emerald-900/20 mt-3"></div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default StockTerminal;
