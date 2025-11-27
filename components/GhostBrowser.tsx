
import React, { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, ExternalLink, Maximize2, Minimize2, Home, ArrowLeft, ArrowRight } from 'lucide-react';

interface Props {
  url: string;
  title?: string;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

// Electron webview type declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.WebViewHTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement>;
    }
  }
}

const GhostBrowser: React.FC<Props> = ({ url, title = 'Ghost Browser', onClose, onNavigate }) => {
  const webviewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidStartLoading = () => {
      setIsLoading(true);
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
    };

    const handleDidNavigate = (e: any) => {
      setCurrentUrl(e.url);
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
      if (onNavigate) {
        onNavigate(e.url);
      }
    };

    const handleDidFailLoad = (e: any) => {
      console.error('Webview load failed:', e);
      setIsLoading(false);
    };

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    // Update navigation state periodically
    const navInterval = setInterval(() => {
      if (webview) {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      }
    }, 500);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      clearInterval(navInterval);
    };
  }, [onNavigate]);

  const handleGoBack = () => {
    webviewRef.current?.goBack();
  };

  const handleGoForward = () => {
    webviewRef.current?.goForward();
  };

  const handleRefresh = () => {
    webviewRef.current?.reload();
  };

  const handleGoHome = () => {
    webviewRef.current?.loadURL(url);
  };

  const handleOpenExternal = () => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.shell.openExternal(currentUrl);
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div className={`fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 font-mono ${
      isMaximized ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      <div className={`relative w-full h-full sm:w-[95%] sm:h-[90vh] max-w-sm sm:max-w-4xl lg:max-w-7xl bg-[#050505] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] rounded-lg flex flex-col overflow-hidden ${
        isMaximized ? 'rounded-none max-w-none' : ''
      }`}>
        
        {/* Header */}
        <div className="h-14 border-b border-cyan-900/50 bg-cyan-950/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Navigation Controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleGoBack}
                        disabled={!canGoBack}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Go Back"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <button
                        onClick={handleGoForward}
                        disabled={!canGoForward}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Go Forward"
                    >
                        <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleGoHome}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Home"
                    >
                        <Home size={16} />
                    </button>
                </div>

                {/* URL Bar */}
                <div className="flex-1 mx-4 min-w-0">
                    <div className="bg-black/40 border border-cyan-900/30 rounded px-3 py-1.5 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-cyan-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <input
                            type="text"
                            value={currentUrl}
                            onChange={(e) => setCurrentUrl(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    webviewRef.current?.loadURL(currentUrl);
                                }
                            }}
                            className="flex-1 bg-transparent text-xs text-white outline-none font-mono"
                            placeholder="Enter URL..."
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="text-xs text-cyan-400 font-bold tracking-widest truncate max-w-[200px]">
                    {title}
                </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={handleOpenExternal}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Open in External Browser"
                >
                    <ExternalLink size={16} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                    title="Close"
                >
                    <X size={16} />
                </button>
            </div>
        </div>

        {/* Webview Container */}
        <div className="flex-1 relative bg-black overflow-hidden">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="text-cyan-400 text-sm font-mono">LOADING...</div>
                    </div>
                </div>
            )}

            {/* Electron Webview */}
            <webview
                ref={webviewRef}
                src={url}
                style={{ width: '100%', height: '100%' }}
                allowpopups={true}
                webpreferences="nodeIntegration=no,contextIsolation=yes"
            />
        </div>

        {/* Status Bar */}
        <div className="h-6 border-t border-cyan-900/30 bg-[#080808] px-4 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-4">
                <span>GHOST_BROWSER</span>
                <span className="text-cyan-400">ACTIVE</span>
            </div>
            <div className="flex items-center gap-4">
                <span>ENGINE: ELECTRON_WEBVIEW</span>
                <span>MODE: EMBEDDED</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GhostBrowser;

