import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, RotateCcw, Terminal } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRestoring: boolean;
}

class SystemErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRestoring: false
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isRestoring: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL SYSTEM FAILURE:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRollback = async () => {
    this.setState({ isRestoring: true });
    try {
        // Attempt to restore the last modified file via the Local Core
        // We assume the user wants to undo the LAST file write operation
        const res = await fetch('http://localhost:3001/api/fs/restore-last', {
            method: 'POST'
        });
        const data = await res.json();
        
        if (data.success) {
            alert(`ROLLBACK SUCCESSFUL: ${data.file}\nSystem will now restart.`);
            window.location.reload();
        } else {
            alert(`ROLLBACK FAILED: ${data.error}\nManual intervention required in /src folder.`);
            this.setState({ isRestoring: false });
        }
    } catch (e) {
        alert("CONNECTION ERROR: Local Core offline. Cannot automate rollback.");
        this.setState({ isRestoring: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-black text-red-600 font-mono flex flex-col items-center justify-center p-10 relative overflow-hidden">
            {/* Background Hazard */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,transparent_10px,transparent_20px)]"></div>
            
            <div className="max-w-3xl w-full border-4 border-red-600 bg-[#050000] p-8 shadow-[0_0_100px_rgba(220,38,38,0.5)] relative z-10 rounded-lg">
                <div className="flex items-center gap-4 mb-6 border-b-2 border-red-600 pb-4">
                    <ShieldAlert size={48} className="animate-pulse" />
                    <div>
                        <h1 className="text-4xl font-black tracking-[0.2em]">CRITICAL FAILURE</h1>
                        <p className="text-red-400 font-bold">NEURAL KERNEL PANIC // RUNTIME EXCEPTION</p>
                    </div>
                </div>

                <div className="bg-red-950/30 border border-red-900 p-4 mb-6 rounded font-mono text-xs overflow-auto max-h-48">
                    <div className="text-white font-bold mb-2">STACK TRACE:</div>
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => window.location.reload()}
                        className="flex-1 py-4 border border-red-600 hover:bg-red-600 hover:text-black transition-all font-bold tracking-widest flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} /> FORCE RESTART
                    </button>
                    
                    <button 
                        onClick={this.handleRollback}
                        disabled={this.state.isRestoring}
                        className="flex-1 py-4 bg-red-600 hover:bg-white hover:text-black text-black transition-all font-bold tracking-widest flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-pulse"
                    >
                        {this.state.isRestoring ? <RefreshCw size={18} className="animate-spin"/> : <RotateCcw size={18} />}
                        INITIATE ROLLBACK PROTOCOL
                    </button>
                </div>

                <div className="mt-6 text-center text-xs text-red-500/60 uppercase">
                    <Terminal size={10} className="inline mr-1" />
                    Automated Self-Repair Module V1.0
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SystemErrorBoundary;