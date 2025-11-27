
import React, { useState, useEffect, useRef } from 'react';
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import { X, FolderOpen, FileCode, ChevronRight, ChevronDown, Save, Play, Zap, RefreshCw, Code2, Terminal, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { lucaService } from '../services/geminiService';
import { soundService } from '../services/soundService';

interface FileNode {
  name: string;
  isDirectory: boolean;
  path?: string;
  children?: FileNode[];
}

interface Props {
  onClose: () => void;
  initialCwd: string;
}

const CodeEditor: React.FC<Props> = ({ onClose, initialCwd }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState(initialCwd);
  const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // AI Edit State
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const editorRef = useRef<any>(null);
  const monaco = useMonaco();

  // Load file tree
  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchFiles = async (path: string) => {
    try {
      const res = await fetch('http://localhost:3001/api/fs/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      if (data.items) {
        setFiles(data.items);
      }
    } catch (e) {
      console.error("FS Error", e);
    }
  };

  const handleFileClick = async (file: FileNode) => {
    if (file.isDirectory) {
      const newPath = `${currentPath}/${file.name}`; 
      setCurrentPath(newPath);
    } else {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3001/api/fs/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `${currentPath}/${file.name}` })
        });
        const data = await res.json();
        setActiveFile({ path: `${currentPath}/${file.name}`, content: data.content });
        // Auto-hide terminal when switching files
        setShowTerminal(false);
      } catch (e) {
        console.error("Read Error", e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setSaving(true);
    try {
        // Corrected payload key to 'path'
        await fetch('http://localhost:3001/api/fs/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: activeFile.path, content: activeFile.content })
        });
        soundService.play('SUCCESS');
    } catch(e) {
        soundService.play('ALERT');
    } finally {
        setSaving(false);
    }
  };

  const handleRun = async () => {
      if (!activeFile) return;
      
      // Auto-save before running
      await handleSave();

      setIsRunning(true);
      setShowTerminal(true);
      setTerminalOutput([]); // Clear previous output
      soundService.play('PROCESSING');

      // Determine command based on extension
      const ext = activeFile.path.split('.').pop()?.toLowerCase();
      let cmd = '';
      
      if (ext === 'py') cmd = `python "${activeFile.path}"`;
      else if (ext === 'js') cmd = `node "${activeFile.path}"`;
      else if (ext === 'ts') cmd = `npx ts-node "${activeFile.path}"`;
      else if (ext === 'sh') cmd = `bash "${activeFile.path}"`;
      else {
          setTerminalOutput([`Error: No execution runner configured for .${ext} files.`]);
          setIsRunning(false);
          return;
      }

      setTerminalOutput([`> ${cmd}`, 'Running...']);

      try {
          const res = await fetch('http://localhost:3001/api/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  tool: 'executeTerminalCommand', 
                  args: { command: cmd } 
              })
          });
          const data = await res.json();
          
          if (data.result) {
              setTerminalOutput(prev => [...prev, data.result, `\n[Process exited]`]);
          } else {
              setTerminalOutput(prev => [...prev, 'No output returned.', `\n[Process exited]`]);
          }
          soundService.play('SUCCESS');
      } catch (e: any) {
          setTerminalOutput(prev => [...prev, `Execution Failed: ${e.message}`]);
          soundService.play('ALERT');
      } finally {
          setIsRunning(false);
      }
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
    // Add Keybinding for AI Edit (Ctrl+K or Cmd+K)
    editor.addCommand(monaco?.KeyMod.CtrlCmd | monaco?.KeyCode.KeyK, () => {
        setShowAIInput(true);
    });
    // Add Keybinding for Save (Ctrl+S or Cmd+S)
    editor.addCommand(monaco?.KeyMod.CtrlCmd | monaco?.KeyCode.KeyS, () => {
        handleSave();
    });
  };

  const handleAIEdit = async () => {
      if (!editorRef.current || !activeFile) return;
      
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      const selectedText = model.getValueInRange(selection);
      
      if (!selectedText) {
          return; // Should probably warn user to select text
      }

      setAiLoading(true);
      soundService.play('PROCESSING');

      try {
          // Call specialized edit function
          const newCode = await lucaService.editCodeSelection(selectedText, aiInstruction, activeFile.content);
          
          // Apply Edit
          editorRef.current.executeEdits("ai-edit", [{
              range: selection,
              text: newCode,
              forceMoveMarkers: true
          }]);
          
          setShowAIInput(false);
          setAiInstruction('');
          soundService.play('SUCCESS');
      } catch (e) {
          console.error("AI Edit Failed", e);
          soundService.play('ALERT');
      } finally {
          setAiLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[190] bg-[#050505] text-slate-300 font-mono flex flex-col animate-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="h-12 border-b border-slate-800 bg-[#0a0a0a] flex items-center justify-between px-4 select-none">
          <div className="flex items-center gap-4">
              <Code2 className="text-rq-blue" size={20} />
              <span className="font-bold tracking-widest text-white text-sm">LUCA NEURAL IDE</span>
              <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800 max-w-[300px] truncate">
                  {activeFile ? activeFile.path : 'NO FILE OPEN'}
              </span>
          </div>
          <div className="flex items-center gap-2">
              {activeFile && (
                  <button 
                    onClick={handleRun} 
                    disabled={isRunning}
                    className="flex items-center gap-2 px-3 py-1 bg-green-900/20 hover:bg-green-900/40 text-green-500 border border-green-900/50 rounded transition-all text-xs font-bold"
                    title="Run Code (Auto-Saves)"
                  >
                      {isRunning ? <RefreshCw size={14} className="animate-spin"/> : <Play size={14} />}
                      RUN
                  </button>
              )}
              <button onClick={handleSave} className="p-2 hover:text-green-400 hover:bg-green-900/20 rounded transition-all" title="Save (Ctrl+S)">
                  <Save size={18} className={saving ? "animate-bounce" : ""} />
              </button>
              <div className="w-px h-4 bg-slate-800 mx-2"></div>
              <button onClick={onClose} className="p-2 hover:text-red-400 hover:bg-red-900/20 rounded transition-all">
                  <X size={18} />
              </button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-[#080808] flex flex-col">
              <div className="p-2 border-b border-slate-800 flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>EXPLORER</span>
                  <button onClick={() => setCurrentPath(initialCwd)} title="Reset Root"><RefreshCw size={12}/></button>
              </div>
              
              <div className="p-2 border-b border-slate-800 text-[10px] text-slate-600 break-all">
                  {currentPath}
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {currentPath !== initialCwd && (
                      <div 
                        className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded cursor-pointer text-slate-500"
                        onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/') || '/')}
                      >
                          <ChevronDown size={12} /> ..
                      </div>
                  )}
                  {files.map((file, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded cursor-pointer group text-xs ${activeFile?.path.endsWith(file.name) ? 'text-rq-blue bg-rq-blue/10' : ''}`}
                        onClick={() => handleFileClick(file)}
                      >
                          {file.isDirectory ? <FolderOpen size={14} className="text-yellow-600" /> : <FileCode size={14} className="text-blue-500" />}
                          <span className="truncate">{file.name}</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 relative bg-[#1e1e1e] flex flex-col">
              <div className="flex-1 relative">
                  {activeFile ? (
                      <>
                        <Editor 
                            height="100%"
                            defaultLanguage={activeFile.path.endsWith('.py') ? 'python' : activeFile.path.endsWith('.js') ? 'javascript' : 'typescript'}
                            path={activeFile.path}
                            value={activeFile.content}
                            theme="vs-dark"
                            onMount={handleEditorMount}
                            onChange={(val) => setActiveFile(prev => prev ? {...prev, content: val || ''} : null)}
                            options={{
                                minimap: { enabled: true },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', monospace",
                                padding: { top: 20 },
                                smoothScrolling: true,
                                cursorBlinking: 'smooth'
                            }}
                        />
                        
                        {/* AI EDIT OVERLAY (Cursor Style) */}
                        {showAIInput && (
                            <div className="absolute top-10 right-10 w-[400px] bg-[#0a0a0a] border border-rq-blue shadow-[0_0_30px_rgba(59,130,246,0.2)] rounded-lg p-4 z-50 animate-in fade-in slide-in-from-top-4">
                                <div className="flex justify-between items-center mb-3 text-rq-blue text-xs font-bold tracking-widest">
                                    <div className="flex items-center gap-2"><Zap size={14} className="fill-current" /> NEURAL EDIT</div>
                                    <button onClick={() => setShowAIInput(false)}><X size={14}/></button>
                                </div>
                                <textarea 
                                    className="w-full bg-[#111] border border-slate-700 rounded p-2 text-sm text-white font-mono focus:border-rq-blue outline-none resize-none h-24 mb-2"
                                    placeholder="Describe the change (e.g., 'Refactor to async await', 'Fix the bug in loop')..."
                                    value={aiInstruction}
                                    onChange={(e) => setAiInstruction(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIEdit(); }}}
                                />
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500">Select code before asking.</span>
                                    <button 
                                        onClick={handleAIEdit}
                                        disabled={aiLoading || !aiInstruction}
                                        className="bg-rq-blue hover:bg-blue-400 text-black px-4 py-1 rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {aiLoading ? <RefreshCw size={12} className="animate-spin"/> : <Play size={12} className="fill-current"/>}
                                        GENERATE
                                    </button>
                                </div>
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600">
                          <Code2 size={64} className="mb-4 opacity-20" />
                          <div className="text-sm">SELECT A FILE TO INITIALIZE NEURAL INTERFACE</div>
                      </div>
                  )}
              </div>

              {/* INTEGRATED TERMINAL */}
              {showTerminal && (
                  <div className="h-1/3 bg-[#0c0c0c] border-t border-slate-700 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-slate-800 text-xs font-mono">
                          <div className="flex items-center gap-2 text-slate-300">
                              <Terminal size={12} />
                              <span>TERMINAL OUTPUT</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={() => setTerminalOutput([])} className="hover:text-white text-slate-500" title="Clear">
                                  <Trash2 size={12} />
                              </button>
                              <button onClick={() => setShowTerminal(false)} className="hover:text-white text-slate-500" title="Close">
                                  <Minimize2 size={12} />
                              </button>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-300 space-y-1">
                          {terminalOutput.length === 0 ? (
                              <div className="text-slate-600 italic">Ready to execute...</div>
                          ) : (
                              terminalOutput.map((line, i) => (
                                  <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
                              ))
                          )}
                          {isRunning && <div className="w-2 h-4 bg-rq-blue animate-pulse mt-1"></div>}
                      </div>
                  </div>
              )}
          </div>
      </div>
      
      {/* Footer */}
      <div className="h-6 bg-rq-blue/10 border-t border-slate-800 flex items-center px-4 text-[10px] text-rq-blue justify-between select-none">
          <div className="flex gap-4">
              <span>Ln 12, Col 40</span>
              <span>UTF-8</span>
              <span>TypeScript</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => setShowTerminal(!showTerminal)}>
                  <Terminal size={10} />
                  <span>TERMINAL: {showTerminal ? 'OPEN' : 'CLOSED'}</span>
              </div>
              <div className="w-px h-3 bg-rq-blue/30 mx-2"></div>
              <Zap size={10} />
              <span>AGENT_MODE: {showAIInput ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
      </div>

    </div>
  );
};

export default CodeEditor;
