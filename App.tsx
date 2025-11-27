import React, { useState, useEffect, useRef } from 'react';
import { lucaService, PersonaType, PERSONA_CONFIG } from './services/geminiService';
import { liveService } from './services/liveService';
import { memoryService } from './services/memoryService';
import { taskService } from './services/taskService';
import { soundService } from './services/soundService';
import { Message, Sender, SmartDevice, DeviceType, ToolExecutionLog, TacticalMarker, MemoryNode, CryptoWallet, TradeLog, ForexAccount, ForexTradeLog, Task, CalendarEvent, TaskPriority, TaskStatus, OsintProfile, OsintHit, SystemStatus, PolyPosition, UserProfile } from './types';
import { Send, Terminal as TerminalIcon, Activity, Cpu, Shield, Globe, ExternalLink, Database, BrainCircuit, Trash2, Mic, Box, Download, Wallet, TrendingUp, Landmark, Paperclip, ImageIcon, X, AudioWaveform, MapPin, Eye, Users, Fingerprint, Search, Radio, Server as ServerIcon, Unplug, User, Monitor, Power, AlertTriangle, Code2, FolderOpen, Sparkles, ShieldAlert, Camera, Layers, Lock, Dna, Network, MessageSquareX, Repeat, RefreshCw, BarChart3, MessageSquare, Settings, FileText, Menu } from 'lucide-react';
import SmartDeviceCard from './components/SmartDeviceCard';
import SystemMonitor from './components/SystemMonitor';
import RemoteAccessModal from './components/RemoteAccessModal';
import { DesktopStreamModal } from './components/DesktopStreamModal';
import GeoTacticalView from './components/GeoTacticalView';
import VoiceHud from './components/VoiceHud';
import CryptoTerminal from './components/CryptoTerminal';
import ForexTerminal from './components/ForexTerminal';
import PredictionTerminal from './components/PredictionTerminal';
import ManagementDashboard from './components/ManagementDashboard';
import OsintDossier from './components/OsintDossier';
import SmartTVRemote from './components/SmartTVRemote';
import WirelessManager from './components/WirelessManager';
import MobileManager from './components/MobileManager';
import NetworkMap from './components/NetworkMap';
import HackingTerminal from './components/HackingTerminal';
import VisionCameraModal from './components/VisionCameraModal';
import HolographicCore from './components/HolographicCore';
import NeuralCloud from './components/NeuralCloud';
import SecurityGate from './components/SecurityGate';
import IngestionModal from './components/IngestionModal';
import CodeEditor from './components/CodeEditor';
import LiveContentDisplay from './components/LiveContentDisplay';
import AdminGrantModal from './components/AdminGrantModal';
import GhostCursor from './components/GhostCursor';
import WhatsAppManager from './components/WhatsAppManager'; 
import ProfileManager from './components/ProfileManager';
import SkillsMatrix from './components/SkillsMatrix';
import StockTerminal from './components/StockTerminal';
import SubsystemDashboard from './components/SubsystemDashboard';
import GhostBrowser from './components/GhostBrowser';
import InvestigationReports from './components/InvestigationReports';

// --- Mock Initial State ---
const INITIAL_DEVICES: SmartDevice[] = [
  { id: 'main_lights', name: 'Studio Main Lights', type: DeviceType.LIGHT, isOn: true, status: 'online', location: 'Floor 50' },
  { id: 'server_core', name: 'Neural Mainframe', type: DeviceType.SERVER, isOn: true, status: 'online', location: 'Server Room' },
];

const CHAT_STORAGE_KEY = 'LUCA_CHAT_HISTORY_V1';
const PROFILE_STORAGE_KEY = 'LUCA_USER_PROFILE_V1';
const MAX_HISTORY_LIMIT = 50; // Rolling window of messages to keep

export default function App() {
  console.log('[APP] App component rendering');
  
  // --- PERSISTENT CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>(() => {
      try {
          const saved = localStorage.getItem(CHAT_STORAGE_KEY);
          if (saved) {
              const parsed = JSON.parse(saved);
              // Basic validation
              if (Array.isArray(parsed) && parsed.length > 0) {
                  console.log(`[STORAGE] Loaded ${parsed.length} messages from history.`);
                  return parsed;
              }
          }
      } catch (e) {
          console.warn("[STORAGE] Failed to load chat history:", e);
      }
      return [];
  });

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [devices, setDevices] = useState<SmartDevice[]>(INITIAL_DEVICES);
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([]);
  
  // Right Panel View State
  const [rightPanelMode, setRightPanelMode] = useState<'LOGS' | 'MEMORY' | 'MANAGE' | 'CLOUD'>('MANAGE');
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Capabilities State
  const [installedModules, setInstalledModules] = useState<string[]>([]);

  // Remote Access State (Mobile Incoming)
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteCode, setRemoteCode] = useState('');

  // Desktop Remote State (Desktop Outgoing)
  const [showDesktopStream, setShowDesktopStream] = useState(false);
  const [desktopTarget, setDesktopTarget] = useState('LOCALHOST');

  // Geo Tactical State
  const [showGeoTactical, setShowGeoTactical] = useState(false);
  const [tacticalMarkers, setTacticalMarkers] = useState<TacticalMarker[]>([]);
  const [trackingTarget, setTrackingTarget] = useState('UNKNOWN');

  // Voice State
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceTranscriptSource, setVoiceTranscriptSource] = useState<'user' | 'model'>('user');
  const [isVadActive, setIsVadActive] = useState(false);
  const [voiceSearchResults, setVoiceSearchResults] = useState<any | null>(null); // NEW: Store search results for HUD

  // NEW: Live Content State (Text Mode)
  const [liveContent, setLiveContent] = useState<any | null>(null);

  // Audio Sensor State
  const [isListeningAmbient, setIsListeningAmbient] = useState(false);

  // Crypto State
  const [showCryptoTerminal, setShowCryptoTerminal] = useState(false);
  const [cryptoWallet, setCryptoWallet] = useState<CryptoWallet | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeLog[]>([]);

  // Forex State
  const [showForexTerminal, setShowForexTerminal] = useState(false);
  const [forexAccount, setForexAccount] = useState<ForexAccount | null>(null);
  const [forexTrades, setForexTrades] = useState<ForexTradeLog[]>([]);

  // Polymarket State
  const [showPredictionTerminal, setShowPredictionTerminal] = useState(false);
  const [polyPositions, setPolyPositions] = useState<PolyPosition[]>([]);

  // OSINT State
  const [showOsintDossier, setShowOsintDossier] = useState(false);
  const [osintProfile, setOsintProfile] = useState<OsintProfile | null>(null);

  // Smart TV State
  const [showTVRemote, setShowTVRemote] = useState(false);
  const [activeTV, setActiveTV] = useState<SmartDevice | null>(null);

  // Wireless Manager State
  const [showWirelessManager, setShowWirelessManager] = useState(false);
  const [wirelessTab, setWirelessTab] = useState<'WIFI' | 'BLUETOOTH' | 'HOTSPOT'>('WIFI');

  // Mobile Manager State
  const [showMobileManager, setShowMobileManager] = useState(false);
  const [activeMobileDevice, setActiveMobileDevice] = useState<SmartDevice | null>(null);

  // WhatsApp State
  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);

  // Network Map State
  const [showNetworkMap, setShowNetworkMap] = useState(false);

  // Hacking Terminal State
  const [showHackingTerminal, setShowHackingTerminal] = useState(false);
  const [hackingLogs, setHackingLogs] = useState<{tool: string, output: string, timestamp: number}[]>([]);

  // Visual Input State
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Skills & Stock Terminal State
  const [showSkillsMatrix, setShowSkillsMatrix] = useState(false);
  const [showStockTerminal, setShowStockTerminal] = useState(false);
  const [stockTerminalSymbol, setStockTerminalSymbol] = useState<string | undefined>(undefined);

  // Subsystem Orchestration State
  const [showSubsystemDashboard, setShowSubsystemDashboard] = useState(false);

  // Ghost Browser State
  const [activeWebview, setActiveWebview] = useState<{ url: string; title: string } | null>(null);

  // Investigation Reports State
  const [showInvestigationReports, setShowInvestigationReports] = useState(false);

  // Mobile Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LOCAL CORE STATE (REAL BACKEND)
  const [isLocalCoreConnected, setIsLocalCoreConnected] = useState(false);
  const [hostPlatform, setHostPlatform] = useState<string>('Unknown Host');
  // NEW: KERNEL LOCK STATE
  const [isKernelLocked, setIsKernelLocked] = useState(false);

  // --- PERSONA & ENGINEER MODE STATES ---
  const [persona, setPersona] = useState<PersonaType>('RUTHLESS');
  const [currentCwd, setCurrentCwd] = useState<string>('');
  
  // NEW: IDE STATE
  const [showCodeEditor, setShowCodeEditor] = useState(false);

  // NEW: GOD MODE STATES
  const [bootSequence, setBootSequence] = useState<'INIT' | 'BIOS' | 'KERNEL' | 'READY'>('INIT');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(SystemStatus.NORMAL);
  const [isLockdown, setIsLockdown] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false); // Full Admin Access
  const [showAdminGrantModal, setShowAdminGrantModal] = useState(false);
  const [adminJustification, setAdminJustification] = useState<string>('');
  const [isRebooting, setIsRebooting] = useState(false); // For persona switching visual

  // NEW: PROFILE MANAGER STATE
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // NEW: GHOST CURSOR STATE (COMPUTER USE VISUALIZATION)
  const [ghostCursor, setGhostCursor] = useState<{ x: number, y: number, type: string, active: boolean }>({ x: 0, y: 0, type: 'MOVE', active: false });

  // NEW: KNOWLEDGE INGESTION STATE
  const [ingestionState, setIngestionState] = useState<{ active: boolean, files: string[], skills: string[] }>({ active: false, files: [], skills: [] });
  const [showIngestionModal, setShowIngestionModal] = useState(false);

  // --- HUMAN-IN-THE-LOOP SECURITY STATE ---
  const [approvalRequest, setApprovalRequest] = useState<{ tool: string, args: any, resolve: (val: boolean) => void } | null>(null);

  // NEW: BACKGROUND IMAGE STATE
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- BOOT SEQUENCE LOGIC ---
  useEffect(() => {
    // Only run full boot if no history, otherwise quick boot
    if (messages.length > 0) {
        console.log('[BOOT] History detected, skipping sequence.');
        setBootSequence('READY');
        return;
    }

    try {
      console.log('[BOOT] Starting boot sequence');
      soundService.play('BOOT');
      
      const t1 = setTimeout(() => setBootSequence('BIOS'), 1000);
      const t2 = setTimeout(() => setBootSequence('KERNEL'), 2500);
      const t3 = setTimeout(() => {
          setBootSequence('READY');
          // Only set initial message if still empty (prevent race condition)
          setMessages(prev => {
              if (prev.length === 0) {
                  return [{ id: '0', text: 'LUCA OS ONLINE. Running in Browser Environment.\nLimited hardware access protocol active.\nHow can I assist, Mac?', sender: Sender.LUCA, timestamp: Date.now() }];
              }
              return prev;
          });
          console.log('[BOOT] Boot sequence complete');
      }, 4500);

      return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
      };
    } catch (error) {
      console.error('[BOOT] Error in boot sequence:', error);
      setBootSequence('READY');
    }
  }, []); // Run once on mount

  // --- ROBUST PERSISTENCE EFFECT WITH PRUNING ---
  useEffect(() => {
      if (messages.length > 0) {
          try {
              // PRUNE LARGE IMAGES to prevent QuotaExceededError
              let optimizedMessages = messages.map(msg => ({
                  ...msg,
                  // If attachment is large base64, truncate it for storage
                  attachment: (msg.attachment && msg.attachment.length > 1000) ? undefined : msg.attachment,
                  // Same for generated images, they are transient
                  generatedImage: (msg.generatedImage && msg.generatedImage.length > 1000) ? undefined : msg.generatedImage,
                  // Add a flag so UI knows image was pruned
                  _wasPruned: !!(msg.attachment?.length > 1000 || msg.generatedImage?.length > 1000)
              }));

              // --- PRUNE HISTORY LENGTH (Rolling Window) ---
              if (optimizedMessages.length > MAX_HISTORY_LIMIT) {
                  optimizedMessages = optimizedMessages.slice(-MAX_HISTORY_LIMIT);
              }
              
              localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(optimizedMessages));
          } catch (e) {
              console.warn("[STORAGE] Failed to save chat history (likely quota exceeded):", e);
              // Try to save just the last 10 messages as emergency fallback
              try {
                  const shortHistory = messages.slice(-10).map(msg => ({ ...msg, attachment: undefined, generatedImage: undefined }));
                  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(shortHistory));
                  console.log("[STORAGE] Saved truncated history (last 10) as fallback.");
              } catch (e2) {
                  console.error("[STORAGE] Critical storage failure.", e2);
              }
          }
      }
  }, [messages]);

  // --- SENTINEL LOOP (AUTONOMY) ---
  useEffect(() => {
      if (bootSequence !== 'READY') return;

      const interval = setInterval(() => {
          // 5% chance every 10s to perform a "background check"
          if (Math.random() > 0.95) {
              const events = [
                  "Background Scan: No thermal anomalies detected.",
                  "Optimization: Memory heap garbage collected.",
                  "Network: Encrypted heartbeat signal verified.",
                  "Security: Firewall rules updated from central database.",
              ];
              const event = events[Math.floor(Math.random() * events.length)];
              
              setToolLogs(prev => [...prev, {
                  toolName: 'SENTINEL_LOOP',
                  args: { type: 'AUTO' },
                  result: event,
                  timestamp: Date.now()
              }]);
          }
      }, 10000);
      return () => clearInterval(interval);
  }, [bootSequence]);


  // Initial Load
  useEffect(() => {
      // Sync memory with disk first
      memoryService.syncWithCore().then((syncedMemories) => {
          setMemories(syncedMemories);
      });
      setTasks(taskService.getTasks());
      setEvents(taskService.getEvents());
      
      // Load background
      const savedBg = localStorage.getItem('LUCA_BACKGROUND');
      if (savedBg) setBackgroundImage(savedBg);

      // Load User Profile
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedProfile) {
          try {
              const parsed = JSON.parse(savedProfile);
              setUserProfile(parsed);
              lucaService.setUserProfile(parsed);
          } catch(e) {}
      }
  }, []);

  // Scroll handling
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [toolLogs]);

  // --- REAL HARDWARE API HELPER ---
  const getRealLocation = async (): Promise<{lat: number, lng: number}> => {
      return new Promise((resolve) => {
          if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                  (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
                  (err) => {
                      console.warn("Geo permission denied", err);
                      resolve({ lat: 37.5665, lng: 126.9780 }); // Default Seoul
                  },
                  { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
              );
          } else {
              resolve({ lat: 37.5665, lng: 126.9780 });
          }
      });
  };

  const checkLocalCore = async () => {
      try {
          const res = await fetch('http://localhost:3001/api/status', { method: 'GET', signal: AbortSignal.timeout(2000) }).catch(() => null);
          if (res) {
              setIsLocalCoreConnected(true);
              const data = await res.json();
              if (data.cwd && !currentCwd) setCurrentCwd(data.cwd);
              if (data.platform) setHostPlatform(data.platform);
              if (data.isProduction !== undefined) setIsKernelLocked(data.isProduction);
          } else {
              setIsLocalCoreConnected(false);
          }
      } catch {
          setIsLocalCoreConnected(false);
      }
  };

  useEffect(() => {
      // Periodically check for local backend
      const interval = setInterval(checkLocalCore, 5000);
      checkLocalCore();
      return () => clearInterval(interval);
  }, []);

  // --- SYNC PLATFORM TO AI ---
  useEffect(() => {
      lucaService.setPlatform(hostPlatform);
  }, [hostPlatform]);

  // --- BROWSER FALLBACK DETECTION (iOS/Android) ---
  useEffect(() => {
      if (!isLocalCoreConnected) {
          const ua = navigator.userAgent;
          if (/iPad|iPhone|iPod/.test(ua)) {
              setHostPlatform('iOS (Safari)');
          } else if (/Android/.test(ua)) {
              setHostPlatform('Android (Chrome)');
          } else if (/Win/.test(ua)) {
              setHostPlatform('Windows (Browser)');
          } else if (/Mac/.test(ua)) {
              setHostPlatform('macOS (Browser)');
          } else if (/Linux/.test(ua)) {
              setHostPlatform('Linux (Browser)');
          }
      }
  }, [isLocalCoreConnected]);

  // --- SCREEN CAPTURE HANDLER ---
  const handleScreenShare = async () => {
      soundService.play('HOVER');
      try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          
          // Create hidden video element to capture frame (replacing ImageCapture)
          const video = document.createElement('video');
          video.style.display = 'none';
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          document.body.appendChild(video);

          await video.play();
          
          // Wait for frame to render
          await new Promise(resolve => setTimeout(resolve, 300));

          // Convert to base64 via canvas
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64Url = canvas.toDataURL('image/jpeg', 0.8); // Compress slightly
              const cleanBase64 = base64Url.split(',')[1];
              setAttachedImage(cleanBase64);
          }
          
          // Stop stream
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(video);
          soundService.play('SUCCESS');
      } catch (err) {
          console.error("Screen capture failed", err);
      }
  };

  // --- MOBILE REMOTE SUCCESS HANDLER ---
  const handleRemoteSuccess = () => {
      setShowRemoteModal(false);
      soundService.play('SUCCESS');
      
      // Add a new simulated mobile device if not present
      const existingMobile = devices.find(d => d.type === DeviceType.MOBILE);
      const newDevice: SmartDevice = existingMobile || {
          id: `mobile_${Date.now()}`,
          name: 'Samsung S24 Ultra',
          type: DeviceType.MOBILE,
          isOn: true,
          status: 'online',
          location: 'Near-Field'
      };
      
      if (!existingMobile) {
          setDevices(prev => [newDevice, ...prev]);
      }
      
      setActiveMobileDevice(newDevice);
      setShowMobileManager(true);
      
      // Log success
      setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          text: 'Remote Uplink Successful. Mobile Control Interface Active.', 
          sender: Sender.SYSTEM, 
          timestamp: Date.now() 
      }]);
  };

  // --- PREDICTION MARKET HANDLER ---
  const handlePlaceBet = (marketId: string, outcome: 'Yes' | 'No', amount: number, title: string, price: number) => {
      const newPos: PolyPosition = {
          id: `pos_${Date.now()}`,
          marketId,
          question: title,
          outcome,
          shares: amount / price,
          avgPrice: price,
          currentPrice: price, // Simulate instant price
          pnl: 0
      };
      setPolyPositions(prev => [...prev, newPos]);
      soundService.play('SUCCESS');
      
      // Log to chat
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `BET EXECUTED: $${amount} on ${outcome} for "${title}". Position tracked.`,
          sender: Sender.SYSTEM,
          timestamp: Date.now()
      }]);
  };

  const handleCyclePersona = async () => {
      soundService.play('KEYSTROKE');
      const personas: PersonaType[] = ['RUTHLESS', 'ASSISTANT', 'ENGINEER', 'HACKER'];
      const currentIndex = personas.indexOf(persona);
      const nextIndex = (currentIndex + 1) % personas.length;
      const nextPersona = personas[nextIndex];
      
      // Trigger manual switch logic
      executeTool('switchPersona', { mode: nextPersona });
  };

  const handleIngest = (url: string) => {
      setShowIngestionModal(false);
      executeTool('ingestGithubRepo', { url });
  };

  // --- CLEAR CHAT FUNCTION ---
  const handleClearChat = () => {
      soundService.play('ALERT');
      const confirm = window.confirm("WARNING: PURGE NEURAL LOGS? This cannot be undone.");
      if (confirm) {
          setMessages([]);
          localStorage.removeItem(CHAT_STORAGE_KEY);
          // Re-initialize basic message
          setMessages([{ id: '0', text: 'LOGS PURGED. SYSTEM READY.', sender: Sender.LUCA, timestamp: Date.now() }]);
      }
  };

  // --- RE-ISSUE COMMAND FUNCTION ---
  const handleReissue = (text: string) => {
      soundService.play('HOVER');
      setInput(text);
  };

  const handleWipeMemory = () => {
      executeTool('wipeMemory', {});
  };

  const handleSaveProfile = (profile: UserProfile) => {
      setUserProfile(profile);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      lucaService.setUserProfile(profile);
      
      // Provide feedback
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: `USER PROFILE UPDATED. HELLO, ${profile.name.toUpperCase()}.`,
          sender: Sender.SYSTEM,
          timestamp: Date.now()
      }]);
      soundService.play('SUCCESS');
  };

  // --- Agent "Hands" Implementation ---

  const executeTool = async (name: string, args: any): Promise<string> => {
    
    // === 0. ADMIN REQUEST HANDLER ===
    if (name === 'requestFullSystemPermissions') {
        setAdminJustification(args.justification || "Autonomous operation requires elevated privileges.");
        setShowAdminGrantModal(true);
        soundService.play('ALERT');
        return "REQUESTING_ADMIN_CONSENT... Waiting for user interaction.";
    }

    // === 0.1 HUMAN-IN-THE-LOOP SECURITY GATE (BYPASS IF ADMIN) ===
    const DANGEROUS_TOOLS = [
        'initiateLockdown',
        'wipeMemory', 
        'killProcess',
        'exfiltrateData',
        'deploySystemHotspot',
        'generatePayload',
        'runMetasploitExploit',
        'connectWirelessTarget'
    ];

    // Only gate if NOT admin
    if (!isAdminMode && DANGEROUS_TOOLS.includes(name)) {
        console.log(`[SECURITY] Intercepting dangerous tool: ${name}`);
        const approved = await new Promise<boolean>((resolve) => {
            setApprovalRequest({ tool: name, args, resolve });
        });
        
        setApprovalRequest(null); // Close modal

        if (!approved) {
            const denialMsg = `ACTION ABORTED: User denied authorization for ${name}. Security protocol maintained.`;
            setToolLogs(prev => [...prev, { toolName: name, args, result: denialMsg, timestamp: Date.now() }]);
            soundService.play('ALERT'); // Deny sound
            return denialMsg;
        }
        // If approved, continue to execution below
    }

    // === 0.2 GHOST CURSOR VISUALIZATION (COMPUTER USE) ===
    // Intercept cursor movements to update the holographic overlay
    if (name === 'controlSystemInput') {
        if (args.x !== undefined && args.y !== undefined) {
            setGhostCursor({ 
                x: args.x, 
                y: args.y, 
                type: args.type, 
                active: true 
            });
            
            // Reset active after delay to allow re-triggering
            setTimeout(() => setGhostCursor(prev => ({ ...prev, active: false })), 2000);
        }
    }

    soundService.play('PROCESSING');
    const logEntry: ToolExecutionLog = {
        toolName: name,
        args: args,
        result: 'Executing...',
        timestamp: Date.now()
    };
    setToolLogs(prev => [...prev, logEntry]);

    // --- 0.3 SKILLS & STOCK TERMINAL HANDLERS ---
    if (name === 'analyzeStock') {
        setStockTerminalSymbol(args.symbol);
        setShowStockTerminal(true);
        soundService.play('SUCCESS');
        return `STOCK TERMINAL OPENED: Analyzing ${args.symbol}.`;
    }

    if (name === 'listCustomSkills' || name === 'createCustomSkill') {
        setShowSkillsMatrix(true);
        soundService.play('SUCCESS');
        return name === 'listCustomSkills' 
            ? "SKILLS MATRIX OPENED: Viewing registered capabilities."
            : "SKILLS MATRIX OPENED: Ready to define new skill.";
    }

    // --- 0.4 SUBSYSTEM ORCHESTRATION HANDLERS ---
    if (name === 'startSubsystem' || name === 'listSubsystems') {
        setShowSubsystemDashboard(true);
        soundService.play('SUCCESS');
        
        if (name === 'startSubsystem') {
            // The actual start will be handled by the backend endpoint
            // Just open the dashboard for monitoring
            return "SUBSYSTEM DASHBOARD OPENED: Starting subsystem in background...";
        } else {
            return "SUBSYSTEM DASHBOARD OPENED: Viewing managed processes.";
        }
    }

    // --- 0.45 GHOST BROWSER HANDLERS ---
    if (name === 'openWebview') {
        const { url, title } = args;
        if (!url) {
            return "ERROR: Missing URL parameter for openWebview.";
        }
        setActiveWebview({ url, title: title || 'Ghost Browser' });
        soundService.play('SUCCESS');
        return `GHOST BROWSER OPENED: ${url}`;
    }

    if (name === 'closeWebview') {
        setActiveWebview(null);
        soundService.play('KEYSTROKE');
        return "GHOST BROWSER CLOSED.";
    }

    // --- 0.5 PERSONA SWITCHING ---
    if (name === 'switchPersona') {
        // Fix Case Sensitivity: Always normalize to UPPERCASE to match PersonaType
        const rawMode = args.mode as string;
        const mode = rawMode.toUpperCase() as PersonaType;
        
        // Trigger Reboot Effect
        setIsRebooting(true);
        
        setPersona(mode);
        await lucaService.setPersona(mode);

        // CRITICAL: If Voice is Active, Reconnect with New Persona
        if (isVoiceMode) {
            console.log(`[LIVE] Reconnecting voice for new persona: ${mode}`);
            liveService.disconnect();
            // Brief delay to ensure socket close
            setTimeout(() => {
                liveService.connect({
                    persona: mode,
                    onToolCall: executeTool,
                    onAudioData: (amp) => setVoiceAmplitude(amp),
                    onTranscript: (text, type) => {
                      setVoiceTranscript(text);
                      setVoiceTranscriptSource(type);
                      // Clear search results on new user input
                      if (type === 'user') setVoiceSearchResults(null);
                      // PERSIST VOICE INPUT (User)
                      if (type === 'user' && text.trim().length > 0) {
                         setMessages(prev => [...prev, {
                             id: Date.now().toString(),
                             text: text,
                             sender: Sender.USER,
                             timestamp: Date.now()
                         }]);
                      }
                    },
                    onVadChange: (active) => setIsVadActive(active),
                    history: messages // PASS HISTORY
                });
            }, 500);
        }

        // Stop reboot animation after delay
        setTimeout(() => setIsRebooting(false), 2000);

        const res = `PERSONA SWITCHED TO: ${mode}`;
        
        setToolLogs(prev => {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1].result = res;
            return newLogs;
        });
        return res;
    }

    // --- 0.6 VISUAL SEARCH HANDLER (VOICE MODE & TEXT MODE PREVIEW) ---
    if (name === 'searchWeb') {
        try {
            const searchRes = await lucaService.runGoogleSearch(args.query);
            
            // 1. Pass to Voice HUD if active
            setVoiceSearchResults(searchRes.groundingMetadata);
            
            // 2. Pass to Main Screen Live Display (Active Intel Panel)
            setLiveContent(searchRes.groundingMetadata);
            
            const res = searchRes.text || "Search complete. See HUD/Live Feed for details.";
            
            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = "Executing Live Search (Display Active)...";
                return newLogs;
            });
            return res;
        } catch (e) {
            return "Search failed due to connectivity.";
        }
    }

    // --- 0.7 IDE LAUNCHER ---
    if (name === 'openCodeEditor') {
        setShowCodeEditor(true);
        const res = "HOLOGRAPHIC CODING INTERFACE LAUNCHED.";
        setToolLogs(prev => {
            const newLogs = [...prev];
            newLogs[newLogs.length - 1].result = res;
            return newLogs;
        });
        return res;
    }

    // --- 0.8 READ SCREEN (HYBRID TOOL) ---
    // Verified: Connected to Local Core Screenshot API
    if (name === 'readScreen') {
        // Play sound for feedback
        soundService.play('PROCESSING');
        
        if (!isLocalCoreConnected) {
            // Fallback to simulation to show feature works even if core offline
            const err = "LOCAL CORE OFFLINE. SIMULATING SCREEN READ: 'User is viewing the LUCA dashboard. System is stable.'";
            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = err;
                return newLogs;
            });
            return err;
        }
        try {
            // 1. Get Screenshot from Local Core
            const res = await fetch('http://localhost:3001/api/system/screenshot');
            const data = await res.json();
            
            if (data.image) {
                // 2. Analyze with Gemini Vision (Cloud)
                const analysis = await lucaService.analyzeImage(data.image, "Describe the screen contents in detail for an AI agent.");
                
                const output = `SCREEN ANALYSIS COMPLETE:\n${analysis}`;
                setToolLogs(prev => {
                    const newLogs = [...prev];
                    newLogs[newLogs.length - 1].result = "Analysis Complete.";
                    return newLogs;
                });
                return output;
            } else {
                const err = "ERROR: Failed to capture screenshot from OS (Empty response).";
                setToolLogs(prev => {
                    const newLogs = [...prev];
                    newLogs[newLogs.length - 1].result = err;
                    return newLogs;
                });
                return err;
            }
        } catch (e) {
            const err = "ERROR: Screen read failed due to connection error.";
            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = err;
                return newLogs;
            });
            return err;
        }
    }

    // --- 0.9 PROOFREADING TOOL ---
    if (name === 'proofreadText') {
        try {
            const result = await lucaService.proofreadText(args.text, args.style);
            const output = `PROOFREAD RESULT:\n${result}`;
            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = "Proofreading complete.";
                return newLogs;
            });
            return output;
        } catch (e) {
            return "Error during proofreading.";
        }
    }

    // --- 1. MESSAGING AUTOMATION (Sophisticated Script Generation) ---
    if (name === 'sendInstantMessage') {
        if (!isLocalCoreConnected) {
            const failRes = `ERROR: Cannot send message. Local Core disconnected. Please ensure server.js is running.`;
            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = failRes;
                return newLogs;
            });
            return failRes;
        }

        const { app, recipient, message } = args;
        let script = '';
        const language = hostPlatform === 'win32' ? 'powershell' : 'applescript';
        const isMac = hostPlatform === 'darwin';
        const normalizedApp = app.toLowerCase();

        if (isMac) {
            if (normalizedApp.includes('whatsapp')) {
                script = `
                    tell application "${app}" to activate
                    delay 0.5
                    tell application "System Events"
                        keystroke "n" using {command down}
                        delay 0.8
                        keystroke "${recipient}"
                        delay 1.0
                        key code 36
                        delay 0.5
                        keystroke "${message}"
                        delay 0.2
                        key code 36
                    end tell
                `;
            } else {
                 script = `
                    tell application "${app}" to activate
                    delay 0.5
                    tell application "System Events"
                        keystroke "f" using {command down}
                        delay 0.5
                        keystroke "${recipient}"
                        delay 0.8
                        key code 36
                        delay 0.5
                        keystroke "${message}"
                        delay 0.1
                        key code 36
                    end tell
                `;
            }
        } else {
            const searchKey = (normalizedApp.includes('discord') || normalizedApp.includes('slack')) ? "^k" : "^n";
            script = `
                $wshell = New-Object -ComObject WScript.Shell
                $wshell.AppActivate("${app}")
                Start-Sleep -Milliseconds 500
                $wshell.SendKeys("${searchKey}")
                Start-Sleep -Milliseconds 500
                $wshell.SendKeys("${recipient}")
                Start-Sleep -Milliseconds 800
                $wshell.SendKeys("{ENTER}")
                Start-Sleep -Milliseconds 500
                $wshell.SendKeys("${message}")
                Start-Sleep -Milliseconds 200
                $wshell.SendKeys("{ENTER}")
            `;
        }
        
        try {
            const res = await fetch('http://localhost:3001/api/system/script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script, language })
            });
            const data = await res.json();
            
            let output = data.error ? `ERROR: ${data.error}` : `SUCCESS: Message sent to ${recipient} on ${app}.`;
            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = output;
                return newLogs;
            });
            soundService.play('SUCCESS');
            return output;
        } catch (e) {
            return `ERROR: Failed to execute automation script.`;
        }
    }


    // TOOLS THAT MUST RUN ON SERVER (REAL HARDWARE ACCESS)
    const SERVER_TOOLS = [
        'executeTerminalCommand', 'runDiagnostics', 'scanNetwork', 'auditSourceCode', 
        'createOrUpdateFile', 'osintDomainIntel', 'traceSignalSource', 'osintUsernameSearch', 
        'osintDarkWebScan', 'controlSystemInput', 'listInstalledApps', 'runNativeAutomation',
        'changeDirectory', 'listFiles', 'readFile', 'writeProjectFile', 'controlSystem', 'controlMobileDevice',
        'connectWirelessTarget', 'exfiltrateData', 'killProcess', 'closeApp', 'getActiveApp', 'sendInstantMessage',
        'ingestGithubRepo', 'runPythonScript', 'openInteractiveTerminal', 'getScreenDimensions',
        // NEW HACKING TOOLS
        'runNmapScan', 'runMetasploitExploit', 'generatePayload', 'runBurpSuite', 'runWiresharkCapture', 'runJohnRipper', 'runCobaltStrike',
        // NEW C2 TOOLS
        'generateHttpPayload', 'listC2Sessions', 'sendC2Command',
        // NEW BUILD TOOL
        'compileSelf',
        // TV CONTROL
        'controlSmartTV',
        // L0p4 TOOLKIT
        'runSqlInjectionScan', 'performStressTest', 'scanPublicCameras', 'deployPhishingKit',
        // NEW: READ URL
        'readUrl',
        // NEW: GRAPH TOOLS
        'addGraphRelations', 'queryGraphKnowledge',
        // NEW: POLYMARKET SEARCH (Proxied)
        'searchPolymarket',
        // NEW: WHATSAPP MCP
        'whatsappSendMessage', 'whatsappGetChats', 'whatsappReadChat', 'whatsappSendImage', 'whatsappGetContacts',
        // NEW: CLIPBOARD
        'readClipboard', 'writeClipboard',
        // NEW: OFFICE TOOLS
        'readDocument', 'createDocument', 'analyzeSpreadsheet',
        // NEW: CUSTOM SKILLS
        'executeCustomSkill',
        // NEW: MARKET NEWS
        'getMarketNews',
        // NEW: SUBSYSTEM ORCHESTRATION
        'startSubsystem', 'stopSubsystem', 'listSubsystems',
        // NEW: NEURAL FORGE
        'installFromRecipe', 'listForgeApps', 'getForgeRecipes',
        // NEW: GHOST BROWSER
        'openWebview', 'closeWebview',
        // NEW: STRUCTURED RPC PROTOCOL
        'executeRpcScript', 'saveMacro', 'listMacros', 'executeMacro',
        // NEW: QUERY REFINEMENT
        'refineQuery'
    ];

    // --- 2. TRY LOCAL CORE (If connected and tool is server-side) ---
    if (isLocalCoreConnected && SERVER_TOOLS.includes(name)) {
        try {
            
            // --- TRIGGER INGESTION UI ---
            if (name === 'ingestGithubRepo') {
                setIngestionState({ active: true, files: [], skills: [] });
            }

            // Endpoint Mapping
            let endpoint = 'http://localhost:3001/api/command';
            let method = 'POST';

            if (name === 'createOrUpdateFile') endpoint = 'http://localhost:3001/api/files/write';
            else if (name === 'listInstalledApps') { endpoint = 'http://localhost:3001/api/system/apps'; method = 'GET'; }
            else if (name === 'closeApp') endpoint = 'http://localhost:3001/api/system/close';
            else if (name === 'getActiveApp') { endpoint = 'http://localhost:3001/api/system/active-app'; method = 'GET'; }
            else if (name === 'runNativeAutomation') endpoint = 'http://localhost:3001/api/system/script';
            else if (name === 'controlSystem') endpoint = 'http://localhost:3001/api/system/control';
            else if (name === 'controlSystemInput') endpoint = 'http://localhost:3001/api/input';
            
            // Engineer Tools Mapping
            else if (name === 'changeDirectory') endpoint = 'http://localhost:3001/api/fs/cwd';
            else if (name === 'listFiles') endpoint = 'http://localhost:3001/api/fs/list';
            else if (name === 'readFile') endpoint = 'http://localhost:3001/api/fs/read';
            else if (name === 'writeProjectFile') endpoint = 'http://localhost:3001/api/fs/write';
            
            // Mobile Tools Mapping
            else if (name === 'controlMobileDevice') endpoint = 'http://localhost:3001/api/mobile/input';

            // Ingest Tool Mapping
            else if (name === 'ingestGithubRepo') endpoint = 'http://localhost:3001/api/knowledge/github';
            
            // --- FIX: Direct mapping for readUrl to support scraping logic correctly ---
            else if (name === 'readUrl') endpoint = 'http://localhost:3001/api/knowledge/scrape';

            // Build Tool Mapping
            else if (name === 'compileSelf') endpoint = 'http://localhost:3001/api/build/compile';
            else if (name === 'getBuildStatus') { 
                const platformParam = args?.platform ? `?platform=${args.platform}` : '';
                endpoint = `http://localhost:3001/api/build/status${platformParam}`;
                method = 'GET';
            }

            // C2 Tool Mapping
            else if (name === 'generateHttpPayload') endpoint = 'http://localhost:3001/api/c2/generate';
            else if (name === 'listC2Sessions') { endpoint = 'http://localhost:3001/api/c2/sessions'; method = 'GET'; }
            else if (name === 'sendC2Command') endpoint = 'http://localhost:3001/api/c2/command';

            // TV Control Mapping
            else if (name === 'controlSmartTV') endpoint = 'http://localhost:3001/api/tv/control';

            // Graph Tools Mapping
            else if (name === 'addGraphRelations') endpoint = 'http://localhost:3001/api/memory/graph/merge';
            else if (name === 'queryGraphKnowledge') endpoint = 'http://localhost:3001/api/memory/graph/query';

            // Polymarket Search (Proxied)
            else if (name === 'searchPolymarket') {
                endpoint = `http://localhost:3001/api/polymarket/markets?query=${encodeURIComponent(args.query)}`;
                method = 'GET';
            }

            // Market News
            else if (name === 'getMarketNews') {
                endpoint = 'http://localhost:3001/api/finance/news';
                method = 'GET';
            }

            // Subsystem Orchestration
            else if (name === 'startSubsystem') endpoint = 'http://localhost:3001/api/subsystems/start';
            else if (name === 'stopSubsystem') endpoint = `http://localhost:3001/api/subsystems/${args.id}/stop`;
            else if (name === 'listSubsystems') { endpoint = 'http://localhost:3001/api/subsystems/list'; method = 'GET'; }

            // Neural Forge
            else if (name === 'installFromRecipe') endpoint = 'http://localhost:3001/api/forge/install';
            else if (name === 'listForgeApps') { endpoint = 'http://localhost:3001/api/forge/list'; method = 'GET'; }
            else if (name === 'getForgeRecipes') { endpoint = 'http://localhost:3001/api/forge/recipes'; method = 'GET'; }

            // Structured RPC Protocol
            else if (name === 'executeRpcScript') endpoint = 'http://localhost:3001/api/rpc/execute';
            else if (name === 'saveMacro') endpoint = 'http://localhost:3001/api/rpc/macro/save';
            else if (name === 'listMacros') { endpoint = 'http://localhost:3001/api/rpc/macro/list'; method = 'GET'; }
            // executeMacro is handled specially above (before fetch)

            // Query Refinement
            else if (name === 'refineQuery') endpoint = 'http://localhost:3001/api/osint/refine-query';

            // WhatsApp MCP
            else if (name === 'whatsappSendMessage') endpoint = 'http://localhost:3001/api/whatsapp/send';
            else if (name === 'whatsappGetChats') { endpoint = 'http://localhost:3001/api/whatsapp/chats'; method = 'GET'; }
            else if (name === 'whatsappReadChat') endpoint = 'http://localhost:3001/api/whatsapp/chat-history';
            else if (name === 'whatsappGetContacts') { endpoint = `http://localhost:3001/api/whatsapp/contacts?query=${encodeURIComponent(args.query || '')}`; method = 'GET'; }
            else if (name === 'whatsappSendImage') {
                endpoint = 'http://localhost:3001/api/whatsapp/send-image';
                
                // CONTEXT AWARENESS: Find image
                let imageToSend = attachedImage;
                if (!imageToSend) {
                     const reversedMsgs = [...messages].reverse();
                     const lastImageMsg = reversedMsgs.find(m => m.generatedImage || m.attachment);
                     if (lastImageMsg) {
                         imageToSend = lastImageMsg.generatedImage || lastImageMsg.attachment;
                     }
                }
                
                if (!imageToSend) {
                    const err = "ERROR: No image found in context (Attachment or History) to send.";
                    setToolLogs(prev => [...prev, { toolName: name, args, result: err, timestamp: Date.now() }]);
                    return err;
                }
                
                // Inject image into args for the POST body construction below
                args.image = imageToSend; 
            }

            // Clipboard
            else if (name === 'readClipboard') { endpoint = 'http://localhost:3001/api/system/clipboard'; method = 'GET'; }
            else if (name === 'writeClipboard') endpoint = 'http://localhost:3001/api/system/clipboard';

            // Skills Management
            else if (name === 'createCustomSkill') endpoint = 'http://localhost:3001/api/skills/create';
            else if (name === 'listCustomSkills') { endpoint = 'http://localhost:3001/api/skills/list'; method = 'GET'; }
            else if (name === 'executeCustomSkill') endpoint = 'http://localhost:3001/api/skills/execute';

            // Office Tools (placeholder - would need backend implementation)
            else if (name === 'readDocument' || name === 'createDocument' || name === 'analyzeSpreadsheet') {
                // These would need backend endpoints - for now route to command
                endpoint = 'http://localhost:3001/api/command';
            }

            // Special handling for executeMacro - fetch macro first, then execute
            if (name === 'executeMacro') {
                const macroName = args.name;
                try {
                    const macroRes = await fetch(`http://localhost:3001/api/rpc/macro/${macroName}`);
                    if (!macroRes.ok) {
                        return `ERROR: Macro "${macroName}" not found.`;
                    }
                    const macro = await macroRes.json();
                    // Execute the macro's script
                    const executeRes = await fetch('http://localhost:3001/api/rpc/execute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ script: macro.script })
                    });
                    const executeData = await executeRes.json();
                    if (executeRes.ok) {
                        return `MACRO "${macroName}" EXECUTED: ${executeData.results.length} steps completed.`;
                    } else {
                        return `ERROR: ${executeData.error}`;
                    }
                } catch (e: any) {
                    return `ERROR: Failed to execute macro: ${e.message}`;
                }
            }

            const body = method === 'POST' ? JSON.stringify(
                (name === 'createOrUpdateFile' || name === 'runNativeAutomation' || name === 'controlSystem' || name === 'controlSystemInput' || name === 'closeApp' || name.startsWith('change') || name.startsWith('listC') || name === 'readFile' || name.startsWith('write') || name === 'controlMobileDevice' || name === 'compileSelf' || name.startsWith('generateHttp') || name.startsWith('sendC2') || name === 'controlSmartTV' || name.includes('Graph') || name === 'ingestGithubRepo' || name === 'readUrl' || name.startsWith('whatsapp') || name === 'createCustomSkill' || name === 'executeCustomSkill' || name === 'startSubsystem' || name === 'stopSubsystem' || name === 'installFromRecipe' || name === 'executeRpcScript' || name === 'saveMacro')
                ? args 
                : { tool: name, args, ...args }
            ) : undefined;

            const response = await fetch(endpoint, {
                method,
                headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
                body
            });
            const data = await response.json();
            
            let output = '';

            // Format Output based on tool
            if (name === 'listInstalledApps') {
                output = `[REAL CORE] FOUND ${data.length} APPS:\n` + data.map((a: any) => a.name).join(', ');
            } else if (name === 'getActiveApp') {
                output = `ACTIVE WINDOW: ${data.result}`;
            } else if (name === 'changeDirectory') {
                if (data.result) {
                    setCurrentCwd(data.result);
                    output = `CWD CHANGED: ${data.result}`;
                } else {
                    output = `ERROR: ${data.error}`;
                }
            } else if (name === 'listFiles') {
                if (data.items) {
                    output = `CONTENTS OF ${data.path}:\n` + data.items.map((i: any) => 
                        `${i.isDirectory ? '[DIR] ' : '      '}${i.name} (${i.size}b)`
                    ).join('\n');
                } else {
                    output = `ERROR: ${data.error}`;
                }
            } else if (name === 'readFile') {
                if (data.content !== undefined) output = data.content;
                else output = `ERROR: ${data.error}`;
            } else if (name === 'controlSystem') {
                output = data.result || "SYSTEM COMMAND SENT";
            } else if (name === 'closeApp') {
                output = data.result || "APP CLOSE REQUEST SENT";
            } else if (name === 'controlMobileDevice') {
                output = data.success ? `MOBILE ACTION SENT: ${args.action}` : `MOBILE ERROR: ${data.error}`;
            } else if (name === 'runNativeAutomation') {
                // Ensure we capture the script result
                output = data.result || data.error || "Script executed.";
            } else if (name === 'ingestGithubRepo') {
                 // UPDATE UI with Skills
                 if (data.skills && data.skills.length > 0) {
                     setIngestionState({ active: true, files: data.scanned || [], skills: data.skills });
                     // Keep overlay active for 4 seconds to show off the skills
                     await new Promise(resolve => setTimeout(resolve, 4000));
                 }
                 
                 setIngestionState({ active: false, files: [], skills: [] });
                 
                 output = data.result || "Ingestion failed.";
                 
                 if (data.scanned) {
                     output += `\n\nSCANNED FILES:\n${data.scanned.join('\n')}`;
                 }
                 
                 if (data.skills && data.skills.length > 0) {
                     output += `\n\n[NEURAL EVOLUTION] ACQUIRED SKILLS:\n` + data.skills.map((s:string) => `> ${s}`).join('\n');
                     // Save to memory
                     data.skills.forEach((s: string) => {
                         memoryService.saveMemory(`Agentic Skill: ${s}`, `Ingested knowledge from ${args.url}`, 'FACT');
                     });
                 }

            } else if (name === 'readUrl') {
                 // TRIGGER VISUALS for Web Scraping
                 if (data.skills) {
                     setIngestionState({ active: true, files: [args.url], skills: data.skills });
                     // Short animation for web read
                     await new Promise(resolve => setTimeout(resolve, 2500));
                     setIngestionState({ active: false, files: [], skills: [] });
                 }
                 
                 if (data.error) output = `ERROR: ${data.error}`;
                 else output = `URL READ SUCCESSFUL [${data.title}].\nCONTENT:\n${data.content}`;

            } else if (name === 'generateHttpPayload') {
                output = data.success ? `PAYLOAD GENERATED: ${data.path}\nCONTENT:\n${data.content}` : `ERROR: ${data.error}`;
                setShowHackingTerminal(true);
                setHackingLogs(prev => [...prev, { tool: name, output, timestamp: Date.now() }]);
            } else if (name === 'listC2Sessions') {
                output = `ACTIVE SESSIONS: ${data.length}`; // The UI handles the list, just ack here
                setShowHackingTerminal(true);
            } else if (name === 'sendC2Command') {
                output = data.success ? "COMMAND QUEUED" : "ERROR QUEUING COMMAND";
                setShowHackingTerminal(true);
                
            } else if (name === 'controlSmartTV') {
                // IMPROVED SMART TV FEEDBACK LOGIC
                if (data.result && data.result.includes('LAUNCH_APP') && args.appName) {
                    output = `SMART TV: Launching ${args.appName}...`;
                } else {
                    // Map standard commands to readable text
                    const cmd = args.action || args.command; // Support both for now
                    const readableMap: Record<string, string> = {
                        'POWER': 'Power Toggled', 'MUTE': 'Audio Muted', 'UNMUTE': 'Audio Unmuted',
                        'VOL_UP': 'Volume Increased', 'VOL_DOWN': 'Volume Decreased',
                        'CH_UP': 'Channel +', 'CH_DOWN': 'Channel -',
                        'HOME': 'Home Menu', 'BACK': 'Back', 'EXIT': 'Exit',
                        'MENU': 'Menu', 'INFO': 'Info', 'GUIDE': 'Guide',
                        'UP': 'Nav Up', 'DOWN': 'Nav Down', 'LEFT': 'Nav Left', 'RIGHT': 'Nav Right', 'SELECT': 'Select'
                    };
                    
                    const friendlyCmd = readableMap[cmd] || cmd;
                    output = `SMART TV: ${friendlyCmd}`;
                }

            } else if (name === 'addGraphRelations') {
                output = `GRAPH UPDATED: Added ${data.stats?.newNodes} nodes, ${data.stats?.newEdges} edges.`;
            } else if (name === 'queryGraphKnowledge') {
                const nodeCount = data.nodes ? Object.keys(data.nodes).length : 0;
                if (nodeCount === 0) {
                    output = `GRAPH QUERY: No knowledge found for entity '${args.entity}'.`;
                } else {
                    // Format for LLM
                    const edges = data.edges?.map((e: any) => `(${e.source}) --[${e.relation}]--> (${e.target})`).join('\n') || '';
                    output = `GRAPH QUERY RESULTS for '${args.entity}':\n${edges}`;
                }

            } else if (name === 'searchPolymarket') {
                setShowPredictionTerminal(true);
                // data is an array of markets
                if (Array.isArray(data)) {
                    const events = data.slice(0, 5).map((e:any) => `- ${e.title} (Vol: $${e.volume24hr})`).join('\n');
                    output = `POLYMARKET SEARCH RESULTS for "${args.query}":\n${events}\n> Full Interface Launched.`;
                } else {
                    output = "Search failed or returned invalid data.";
                }

            } else if (name === 'whatsappSendMessage') {
                if (data.success) {
                    output = `WHATSAPP: Message sent to ${data.to}.`;
                    // Headless success - no UI popup
                } else {
                    output = `WHATSAPP ERROR: ${data.error}`;
                    // Auto-open UI if connection issue detected
                    if (data.error && (data.error.toLowerCase().includes('not ready') || data.error.toLowerCase().includes('pair'))) {
                        setShowWhatsAppManager(true);
                    }
                }
            } else if (name === 'whatsappSendImage') {
                if (data.success) {
                    output = `WHATSAPP: Image sent to ${data.to}.`;
                    // Headless success
                } else {
                    output = `WHATSAPP ERROR: ${data.error}`;
                    if (data.error && (data.error.toLowerCase().includes('not ready') || data.error.toLowerCase().includes('pair'))) {
                        setShowWhatsAppManager(true);
                    }
                }
            } else if (name === 'whatsappGetContacts') {
                if (data.contacts) {
                    output = `WHATSAPP CONTACTS (${data.contacts.length} found):\n` + data.contacts.map((c:any) => `- ${c.name} (${c.number})`).join('\n');
                    // Headless success - just return data to agent
                } else {
                    output = `WHATSAPP ERROR: ${data.error}`;
                    if (data.error && (data.error.toLowerCase().includes('not ready') || data.error.toLowerCase().includes('pair'))) {
                        setShowWhatsAppManager(true);
                    }
                }
            } else if (name === 'whatsappGetChats') {
                if (data.chats) {
                    output = `WHATSAPP CHATS (${data.chats.length} retrieved):\n` + data.chats.map((c:any) => `- ${c.name || c.id.user}: ${c.lastMessage?.body?.substring(0, 50)}...`).join('\n');
                    setShowWhatsAppManager(true); // Keep UI for visual verification of lists
                } else {
                    output = `WHATSAPP ERROR: ${data.error}`;
                    if (data.error && (data.error.toLowerCase().includes('not ready') || data.error.toLowerCase().includes('pair'))) {
                        setShowWhatsAppManager(true);
                    }
                }
            } else if (name === 'whatsappReadChat') {
                if (data.messages) {
                    output = `WHATSAPP HISTORY [${args.contactName}]:\n` + data.messages.map((m:any) => `[${new Date(m.timestamp * 1000).toLocaleTimeString()}] ${m.fromMe ? 'ME' : 'THEM'}: ${m.body}`).join('\n');
                    setShowWhatsAppManager(true); // Keep UI for reading history
                } else {
                    output = `WHATSAPP ERROR: ${data.error}`;
                    if (data.error && (data.error.toLowerCase().includes('not ready') || data.error.toLowerCase().includes('pair'))) {
                        setShowWhatsAppManager(true);
                    }
                }

            } else if (name === 'readClipboard') {
                output = `CLIPBOARD CONTENT:\n${data.content || '[EMPTY]'}`;
            } else if (name === 'writeClipboard') {
                output = data.result || "CLIPBOARD UPDATED.";

            } else if (data && data.result) {
                // Standard 'result' wrapper
                output = `[REAL CORE] ${data.result}`;
                
                // Special handling for JSON-returning OSINT tools
                if (name === 'osintUsernameSearch' || name === 'osintDarkWebScan') {
                    try {
                        const parsedProfile = JSON.parse(data.result);
                        setOsintProfile(parsedProfile);
                        setShowOsintDossier(true);
                        output = `[REAL CORE] OSINT SCAN COMPLETE. UI UPDATED with results for ${parsedProfile.target}.`;
                    } catch (e) {
                        // Fallback if string result
                    }
                }

                // Special handling for Hacking Tools to show the Terminal
                // Added L0p4 tools to this list
                if (['runNmapScan', 'runMetasploitExploit', 'generatePayload', 'runBurpSuite', 'runWiresharkCapture', 'runJohnRipper', 'runCobaltStrike', 'runSqlInjectionScan', 'performStressTest', 'scanPublicCameras', 'deployPhishingKit'].includes(name)) {
                    setShowHackingTerminal(true);
                    setHackingLogs(prev => [...prev, { tool: name, output: output, timestamp: Date.now() }]);
                }

                if (name === 'osintDomainIntel') {
                     try {
                        const parsed = JSON.parse(data.result);
                        // If it's structured object
                         setOsintProfile({
                            target: args.domain,
                            riskScore: 0, 
                            hits: [
                                { platform: 'RDAP/WHOIS', url: 'rdap.org (Verified)', category: 'DOMAIN', confidence: 1.0 },
                                { platform: 'DNS', url: 'NsLookup', category: 'DOMAIN', confidence: 1.0 }
                            ],
                            status: 'COMPLETE',
                            meta: { 'RAW_DATA': 'See Dossier', ...parsed.meta }
                        });
                        setShowOsintDossier(true);
                        output = `[REAL CORE] DOMAIN INTEL ACQUIRED via RDAP/WHOIS for ${args.domain}. Opening Dossier.`;
                     } catch(e) {
                         // Fallback for text report
                     }
                }

                // Special handling for code audit (File Read)
                if (name === 'auditSourceCode' && args.filePath) {
                    output = data.result; // Pass the full file content back to AI
                }
            } else if (data.success) {
                output = `SUCCESS: Operation completed at ${data.path}`;
            } else if (data.error) {
                 output = `ERROR: ${data.error}`;
            } else {
                output = JSON.stringify(data);
            }

            setToolLogs(prev => {
                const newLogs = [...prev];
                newLogs[newLogs.length - 1].result = output.substring(0, 300) + (output.length > 300 ? '...' : '');
                return newLogs;
            });
            
            soundService.play('SUCCESS');
            return output;
        } catch (e) {
            console.warn("Local Core failed, falling back to browser logic.", e);
            if (name === 'ingestGithubRepo') setIngestionState({ active: false, files: [], skills: [] });
        }
    }

    // --- 3. BROWSER / UI LOGIC (Simulations or Browser APIs) ---
    
    await new Promise(resolve => setTimeout(resolve, 500)); 

    let result = '';

    if (name === 'setSystemAlertLevel') {
        const lvl = args.level as SystemStatus;
        setSystemStatus(lvl);
        if (lvl === SystemStatus.CRITICAL) soundService.play('ALERT');
        result = `SYSTEM ALERT LEVEL SET TO: ${lvl}`;

    } else if (name === 'wipeMemory') {
        memoryService.wipeMemory();
        setMemories([]);
        result = "NEURAL MEMORY BANK FORMATTED. ALL DATA PURGED.";
        soundService.play('ALERT');

    } else if (name === 'setBackgroundImage') {
        const mode = args.mode;
        if (mode === 'CLEAR') {
            setBackgroundImage(null);
            localStorage.removeItem('LUCA_BACKGROUND');
            result = "BACKGROUND SYSTEM RESET TO DEFAULT.";
        } else {
            let targetImage = null;
            // Search backwards for latest image
            const reversedMsgs = [...messages].reverse();
            if (mode === 'LAST_GENERATED') {
                targetImage = reversedMsgs.find(m => m.generatedImage)?.generatedImage;
            } else if (mode === 'UPLOADED') {
                targetImage = reversedMsgs.find(m => m.attachment)?.attachment;
            }
            
            if (targetImage) {
                setBackgroundImage(targetImage);
                localStorage.setItem('LUCA_BACKGROUND', targetImage);
                result = "VISUAL INTERFACE UPDATED. NEW WALLPAPER APPLIED.";
            } else {
                result = `ERROR: No image found in context for mode ${mode}.`;
            }
        }

    } else if (name === 'ingestGithubRepo') {
        // Fallback if server offline
        setIngestionState({ active: true, files: ['README.md', 'package.json', 'src/index.ts'], skills: ['ANALYSIS'] });
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIngestionState({ active: false, files: [], skills: [] });
        result = `[INGEST SIMULATION] Repository '${args.url}' structure analyzed.\n> Core Offline: Cannot perform deep recursive scan.\n> Simulated Knowledge: Repo seems to be a valid software project.`;

    } else if (name === 'readUrl') {
        // Fallback using CORS proxy
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(args.url)}`;
            const res = await fetch(proxyUrl);
            const data = await res.json();
            if (data.contents) {
                // Basic text extraction
                const text = data.contents.replace(/<[^>]*>/g, ' ').slice(0, 5000);
                result = `[BROWSER FALLBACK] URL Content (via Proxy):\n${text}...`;
            } else {
                result = `ERROR: Failed to read URL content via proxy.`;
            }
        } catch (e) {
            result = `ERROR: Local Core Offline and Browser Proxy failed. Cannot read URL.`;
        }

    } else if (name === 'initiateLockdown') {
        setIsLockdown(true);
        setSystemStatus(SystemStatus.CRITICAL);
        soundService.play('ALERT');
        
        // Simulate real system lock if connected
        if (isLocalCoreConnected) {
            fetch('http://localhost:3001/api/system/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'SYSTEM_LOCK' })
            });
        }
        
        result = `LOCKDOWN PROTOCOL INITIATED. DOORS SEALED. SYSTEM LOCKED.`;

    } else if (name === 'controlDevice') {
        const { deviceId, action } = args;
        const target = devices.find(d => d.id === deviceId || d.name.toLowerCase().includes(deviceId.toLowerCase()));
        
        if (target) {
            const newState = action === 'on';
            setDevices(prev => prev.map(d => d.id === target.id ? { ...d, isOn: newState } : d));
            result = `SUCCESS: ${target.name} turned ${action.toUpperCase()}.`;
        } else {
            result = `ERROR: Device ID '${deviceId}' not found in facility registry.`;
        }
    } else if (name === 'runDiagnostics') {
        // Fallback if server offline
        const level = args.scanLevel || 'quick';
        if (level === 'deep') {
             await new Promise(resolve => setTimeout(resolve, 1500)); 
             result = `DEEP SYSTEM DIAGNOSTIC COMPLETED [LEVEL 5]:\n> BROWSER KERNEL: ${navigator.userAgent}\n> CORES: ${navigator.hardwareConcurrency || 4}\n> MEMORY HEAP: STABLE\n> STATUS: OPTIMAL.`;
        } else {
             result = `QUICK DIAGNOSTIC COMPLETE: Core Integrity 99.8%. Network Latency 12ms. 0 Intrusions Detected.`;
        }
    } else if (name === 'executeTerminalCommand') {
         result = `[SIMULATION] Executed: '${args.command}'\n> Access Denied: Browser Sandbox active.\n> Connect Local Core for Real Shell Access.`;

    } else if (name === 'scanNetwork') {
        // Fallback if server offline
        result = "WIFI SCAN SIMULATION COMPLETE (Browser Mode).\n> OPEN Network detected.\n> Initiating Connection...";
        const newDev: SmartDevice = {
            id: `wifi_node_${Date.now()}`,
            name: 'Open_Public_WiFi',
            type: DeviceType.WIRELESS_NODE,
            isOn: true,
            status: 'online',
            location: 'WAN'
        };
        setDevices(prev => [newDev, ...prev]);

    } else if (name === 'generateCompanionPairingCode') {
        const code = 'RQ-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-X';
        setRemoteCode(code);
        setShowRemoteModal(true);
        result = `REMOTE UPLINK INITIATED. Session Key: ${code}. Waiting for secure handshake...`;
    } else if (name === 'locateMobileDevice') {
        // USE REAL GEOLOCATION
        const coords = await getRealLocation();
        result = `TARGET LOCATED VIA BROWSER GPS:\nLat: ${coords.lat}\nLng: ${coords.lng}\nAccuracy: High`;
    } else if (name === 'manageMobileDevice') {
        const targetId = args.deviceId || 'admin_mobile_1';
        let target = devices.find(d => d.id === targetId || d.type === DeviceType.MOBILE);
        
        // GET REAL LOCATION
        const coords = await getRealLocation();
        const locationStr = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

        if (target) {
            // Update target with real location
            target = { ...target, location: locationStr };
            
            // Update state
            setDevices(prev => prev.map(d => d.id === target!.id ? { ...d, location: locationStr } : d));
            
            setActiveMobileDevice(target);
            setShowMobileManager(true);
            result = `MOBILE UPLINK ESTABLISHED: ${target.name}.\n> GPS: ${locationStr}\n> Launching Manager...`;
        } else {
             // Create new if missing
            const newDevice: SmartDevice = {
                id: 'admin_mobile_1',
                name: "Admin Device",
                type: DeviceType.MOBILE,
                isOn: true,
                status: 'online',
                location: locationStr
            };
            setDevices(prev => [newDevice, ...prev]);
            setActiveMobileDevice(newDevice);
            setShowMobileManager(true);
            result = `MOBILE DEVICE REGISTERED.\n> GPS: ${locationStr}\n> Launching Manager...`;
        }

    } else if (name === 'startRemoteDesktop') {
        setDesktopTarget(args.targetId || 'LOCALHOST');
        setShowDesktopStream(true);
        result = `PROCESS MONITOR & REMOTE VIEWER ACTIVE. Target: ${args.targetId}.`;
    } else if (name === 'traceSignalSource') {
        // If server executed this, we would have returned earlier. This is fallback.
        const identifier = args.targetIdentifier;
        setTrackingTarget(identifier);
        // USE REAL GEO FOR "HOME" BASE
        const coords = await getRealLocation();
        
        setTacticalMarkers([{
            id: 'target_1',
            label: identifier,
            lat: coords.lat + 0.001, // Offset slightly
            lng: coords.lng + 0.001,
            type: 'TARGET',
            status: 'LOCKED'
        }, {
            id: 'home_base',
            label: 'HOME BASE',
            lat: coords.lat,
            lng: coords.lng,
            type: 'ALLY',
            status: 'TRACKING'
        }]);
        setShowGeoTactical(true);
        result = `TACTICAL MAP OPENED (SIMULATION MODE). Connect Local Core for Real Traceroute.`;
    } else if (name === 'analyzeNetworkTraffic') {
        // @ts-ignore
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const type = connection ? connection.effectiveType : 'unknown';
        result = `NETWORK ANALYSIS:\n> Connection Type: ${type.toUpperCase()}\n> Downlink: ${connection ? connection.downlink : '?'} Mbps\n> RTT: ${connection ? connection.rtt : '?'} ms\n> Traffic Status: Normal`;
    } else if (name === 'storeMemory') {
        const { key, value, category } = args;
        memoryService.saveMemory(key, value, category);
        setMemories(memoryService.getAllMemories());
        setRightPanelMode('CLOUD'); // Show the Neural Cloud
        result = `MEMORY ENGRAM CREATED.\n[${category}] ${key} = "${value}"\nArchived to Long-Term Neural Storage (Disk).`;
    } else if (name === 'retrieveMemory') {
        const { query } = args;
        // CRITICAL FIX: Wait for vector search to complete
        const results = await memoryService.retrieveMemory(query);
        if (results.length > 0) {
            result = `MEMORY RETRIEVAL SUCCESSFUL. Found ${results.length} engrams matching "${query}":\n` + results.map((r: any) => `- ${r.key}: ${r.value}`).join('\n');
        } else {
            result = `MEMORY RETRIEVAL FAILED. No existing engrams found for "${query}".`;
        }
    } else if (name === 'installCapability') {
        const modName = args.capabilityName.toUpperCase().replace(/\s+/g, '_');
        const justification = args.justification || 'Expansion protocol initiated.';
        if (!installedModules.includes(modName)) {
            setInstalledModules(prev => [...prev, modName]);
            
            let resultMsg = `CAPABILITY INSTALLED: Module [${modName}] successfully downloaded.\n> Justification: ${justification}\n> Status: Integrated into Neural Kernel.`;
            
            if (['WEB3', 'BLOCKCHAIN', 'CRYPTO', 'ETHEREUM', 'SOLANA'].some(term => modName.includes(term))) {
                resultMsg += `\n> SYSTEM UPDATE: Decentralized Ledger Technology (DLT) interfaces active.\n> Wallet Management & Smart Contract execution tools optimized.`;
            }
            
            result = resultMsg;
        } else {
            result = `MODULE [${modName}] is already active in the system registry.`;
        }
    } else if (name === 'createTask') {
        const newTask = taskService.addTask(args.title, args.priority, args.description);
        setTasks(taskService.getTasks());
        setRightPanelMode('MANAGE');
        result = `TASK CREATED: [${newTask.priority}] ${newTask.title} - ID: ${newTask.id.substring(0,8)}`;
    
    } else if (name === 'updateTaskStatus') {
        const updated = taskService.updateTaskStatus(args.taskId, args.status);
        if (updated) {
             setTasks(taskService.getTasks());
             result = `TASK UPDATED: ${updated.title} is now ${updated.status}.`;
        } else {
             result = `ERROR: Task not found.`;
        }

    } else if (name === 'scheduleEvent') {
        const startTime = new Date().getTime() + 3600000; // Mock logic: Schedule for 1 hour from now
        const newEvent = taskService.addEvent(args.title, startTime, 1, args.type);
        setEvents(taskService.getEvents());
        setRightPanelMode('MANAGE');
        result = `EVENT SCHEDULED: ${newEvent.title} at ${new Date(newEvent.startTime).toLocaleTimeString()}`;

    } else if (name === 'createCryptoWallet') {
        const chain = args.chain || 'ETH';
        const mockAddress = chain === 'SOL' 
            ? 'HN7cABqLq...' + Math.random().toString(36).substring(7) 
            : '0x71C...' + Math.random().toString(16).substring(2, 10);
            
        const newWallet: CryptoWallet = {
            address: mockAddress,
            chain: chain,
            privateKey: '***ENCRYPTED***',
            assets: [
                { symbol: chain, name: chain === 'ETH' ? 'Ethereum' : 'Solana', amount: 1.5, currentPrice: chain === 'ETH' ? 3400 : 145, pnl: 12.4 },
                { symbol: 'AI16Z', name: 'AI16Z', amount: 5000, currentPrice: 0.42, pnl: 55.1 }
            ],
            totalValueUsd: 0
        };
        newWallet.totalValueUsd = newWallet.assets.reduce((acc, cur) => acc + (cur.amount * cur.currentPrice), 0);
        
        setCryptoWallet(newWallet);
        setShowCryptoTerminal(true);
        result = `SECURE WALLET GENERATED.\nAddress: ${mockAddress}\nChain: ${chain}\nStatus: Active & Fundable. Keys stored in HSM.`;
    
    } else if (name === 'analyzeCryptoToken') {
        const symbol = args.symbol.toUpperCase();
        const sentiment = Math.random() > 0.5 ? "BULLISH" : "NEUTRAL";
        result = `ANALYSIS FOR $${symbol}:\n> Price: $${(Math.random() * 1000).toFixed(2)}\n> 24h Vol: $450M\n> AI Sentiment: ${sentiment} (Confidence 87%)\n> Risk Score: 3/10 (Safe Entry).\nRecommendation: Accumulate on dips.`;
    
    } else if (name === 'executeCryptoSwap') {
        const { action, token, amount } = args;
        const hash = '0x' + Math.random().toString(16).substring(2) + '...';
        
        const newTrade: TradeLog = {
            id: Date.now().toString(),
            type: action,
            token: token,
            amount: amount,
            price: Math.random() * 100,
            timestamp: Date.now(),
            hash: hash
        };
        
        setTradeHistory(prev => [newTrade, ...prev]);
        setShowCryptoTerminal(true);
        result = `TX SUBMITTED: ${action} ${amount} ${token}.\nHash: ${hash}\nStatus: Confirmed on-chain.`;
        
    } else if (name === 'createForexAccount') {
        const leverage = args.leverage || 100;
        const base = args.baseCurrency || 'USD';
        
        const newAccount: ForexAccount = {
            accountId: 'FX-' + Math.random().toString().substring(2, 8),
            baseCurrency: base,
            balance: 100000,
            equity: 100000,
            margin: 0,
            freeMargin: 100000,
            leverage: leverage,
            positions: []
        };
        setForexAccount(newAccount);
        setShowForexTerminal(true);
        result = `INSTITUTIONAL FX ACCOUNT OPENED.\nID: ${newAccount.accountId}\nLeverage: 1:${leverage}\nBalance: ${base} 100,000.00\nAccess to Interbank Liquidity granted.`;

    } else if (name === 'analyzeForexPair') {
        const pair = args.pair.toUpperCase();
        result = `MACRO ANALYSIS: ${pair}\n> Techs: EMA 200 Support hold. RSI Divergence detected.\n> Macro: Expecting volatility due to upcoming FED rate decision.\n> Bias: SHORT TERM BULLISH. Target 1.0950.`;

    } else if (name === 'executeForexTrade') {
        const { action, pair, lots } = args;
        const ticket = Math.floor(Math.random() * 9000000 + 1000000).toString();
        
        const newFxTrade: ForexTradeLog = {
            id: Date.now().toString(),
            type: action,
            pair: pair,
            lots: lots,
            price: Math.random() * 1.5,
            timestamp: Date.now(),
            ticket: ticket
        };
        setForexTrades(prev => [newFxTrade, ...prev]);

        if (forexAccount) {
            const newPos = {
                id: ticket,
                pair: pair,
                type: action,
                lots: lots,
                entryPrice: newFxTrade.price,
                currentPrice: newFxTrade.price,
                pnl: - (lots * 10)
            };
            setForexAccount({
                ...forexAccount,
                positions: [...forexAccount.positions, newPos] as any
            });
        }
        
        setShowForexTerminal(true);
        result = `ORDER FILLED: ${action} ${lots} Lots ${pair} @ Market.\nTicket: #${ticket}\nPosition monitored in FX Desk.`;

    } else if (name === 'searchPolymarket') {
        setShowPredictionTerminal(true);
        // Fallback simulation if Core is offline (Core usually handles this)
        result = "POLYMARKET INTERFACE LAUNCHED. (Simulation Mode Active if Core Offline)";

    } else if (name === 'placePolymarketBet') {
        const { marketId, outcome, amount } = args;
        // Simulate placement since we don't have real wallet auth
        const newPos: PolyPosition = {
            id: `pos_${Date.now()}`,
            marketId,
            question: "Unknown Event (Agent Bet)", // Ideally fetch title, simplified here
            outcome,
            shares: amount / 0.5, // Mock price 0.5
            avgPrice: 0.5,
            currentPrice: 0.55,
            pnl: 5.0
        };
        setPolyPositions(prev => [...prev, newPos]);
        setShowPredictionTerminal(true);
        result = `BET PLACED: $${amount} on ${outcome} for Market ID ${marketId}.\n> Position tracked in Prediction Terminal.`;

    } else if (name === 'getPolymarketPositions') {
        if (polyPositions.length === 0) {
            result = "No active prediction market positions.";
        } else {
            result = "ACTIVE POSITIONS:\n" + polyPositions.map(p => `- ${p.question}: ${p.outcome} ($${p.avgPrice})`).join('\n');
        }

    } else if (name === 'analyzeAmbientAudio') {
        const duration = args.duration || 5;
        const sensitivity = args.sensitivity || 'MEDIUM';
        const target = args.targetSignature || null;

        setIsListeningAmbient(true);
        // Wait for "listen" duration
        await new Promise(resolve => setTimeout(resolve, duration * 1000));
        setIsListeningAmbient(false);

        const rand = Math.random();
        if (target) {
            if (rand > 0.7) {
                result = `AUDIO ANALYSIS COMPLETE:\n> Target Signature: "${target}"\n> Status: POSITIVE MATCH (Confidence 94%)\n> Source: Sector 3 (Maintenance)\n> Action: Alerting Security Protocols.`;
            } else {
                result = `AUDIO ANALYSIS COMPLETE:\n> Target Signature: "${target}"\n> Status: NEGATIVE. Ambient levels normal.\n> Background Noise: 42dB (Fan hum).`;
            }
        } else {
            if (sensitivity === 'HIGH' && rand > 0.6) {
                result = `ANOMALY DETECTED:\n> High-frequency mechanical oscillation (14kHz).\n> Possible servo failure in Arm Unit 2.\n> Recommendation: Schedule Maintenance.`;
            } else if (rand > 0.8) {
                 result = `SECURITY ALERT:\n> Detected sound matching 'Glass Break' signature.\n> Location: East Perimeter Window.\n> Confidence: 88%.`;
            } else {
                 result = `AMBIENT SCAN NORMAL.\n> Noise Floor: 38dB.\n> Dominant Freq: 60Hz (Electrical hum).\n> No threats detected.`;
            }
        }
    } else if (name === 'osintUsernameSearch') {
        const target = args.username;
        const hits: OsintHit[] = [
            { platform: 'Twitter/X', url: `twitter.com/${target}`, category: 'SOCIAL', confidence: 0.99 },
            { platform: 'Instagram', url: `instagram.com/${target}`, category: 'SOCIAL', confidence: 0.95 },
        ];
        
        setOsintProfile({
            target,
            riskScore: Math.floor(Math.random() * 40) + 20,
            hits,
            status: 'SCANNING',
            meta: { 'EMAIL_GUESS': `${target}@gmail.com`, 'LAST_ACTIVE': '2 hours ago' }
        });
        setShowOsintDossier(true);
        result = `OSINT SCAN COMPLETE: ${hits.length} accounts found for '${target}'. Digital footprint analyzed.`;

    } else if (name === 'osintDomainIntel') {
        // Fallback Simulation if Server Offline
        const target = args.domain;
        const hits: OsintHit[] = [
            { platform: 'Registrar', url: 'GoDaddy (Redacted)', category: 'DOMAIN', confidence: 1.0 },
            { platform: 'DNS', url: 'Cloudflare Proxied', category: 'DOMAIN', confidence: 1.0 },
            { platform: 'Subdomain', url: `dev.${target}`, category: 'DOMAIN', confidence: 0.85 },
        ];
        setOsintProfile({
            target,
            riskScore: Math.floor(Math.random() * 60) + 10,
            hits,
            status: 'SCANNING',
            meta: { 'SERVER': 'NGINX/1.18', 'COUNTRY': 'Panama (Simulated)' }
        });
        setShowOsintDossier(true);
        result = `DOMAIN INTELLIGENCE ACQUIRED [SIMULATED]: ${target}\n> Server: Offshore\n> WAF: Active\n> Vulnerability Scan: Initiated.\n> TIP: Connect Local Core for Real DNS Analysis.`;

    } else if (name === 'osintDarkWebScan') {
        const query = args.query;
        const hits: OsintHit[] = [
            { platform: 'BreachForums', url: 'archive_2023_linkedin.db', category: 'DARK_WEB', confidence: 1.0 },
            { platform: 'Telegram Dump', url: 'channel_logs_v2.txt', category: 'DARK_WEB', confidence: 0.92 },
        ];
        setOsintProfile({
            target: query,
            riskScore: 95,
            hits,
            status: 'SCANNING',
            meta: { 'EXPOSED_PASS': 'HASHED (SHA-256)', 'SEVERITY': 'CRITICAL' }
        });
        setShowOsintDossier(true);
        result = `DARK WEB SWEEP COMPLETE.\n> CRITICAL ALERT: Credentials found in 2 active leaks.\n> Source: BreachForums Archive.\n> Recommendation: Forced password reset.`;

    } else if (name === 'connectSmartTV') {
        // === REAL UPnP DISCOVERY ===
        if (isLocalCoreConnected) {
            try {
                const res = await fetch('http://localhost:3001/api/network/discover');
                const devicesList = await res.json();
                
                if (devicesList.length > 0) {
                    // Add found devices to UI
                    const newDevs = devicesList.map((d: any) => ({
                        id: `upnp_${d.id}`,
                        name: d.name || `Smart Device (${d.ip})`,
                        type: DeviceType.SMART_TV, // Assume UPnP media renderers are TVs for now
                        isOn: true,
                        status: 'online' as const, // Explicit cast for strict typing
                        location: 'Local Network'
                    }));
                    
                    setDevices(prev => [...newDevs, ...prev]);
                    setActiveTV(newDevs[0]);
                    setShowTVRemote(true);
                    result = `UPnP SCAN COMPLETE (REAL DATA).\n> Found ${devicesList.length} devices.\n> Linked to: ${newDevs[0].name} (${newDevs[0].id})\n> Control Interface Active.`;
                } else {
                    result = `UPnP SCAN COMPLETE.\n> No compatible UPnP media renderers found on local subnet.`;
                }
            } catch (e) {
                 result = `DISCOVERY ERROR: Failed to scan local UDP ports. Check firewall.`;
            }
        } else {
            // Fallback Simulation
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newTV: SmartDevice = {
                id: 'smart_tv_vidaa',
                name: 'Hisense Vidaa [WiFi]',
                type: DeviceType.SMART_TV,
                isOn: true,
                status: 'online',
                location: 'Living Room'
            };
            setDevices(prev => [...prev, newTV]);
            setActiveTV(newTV);
            setShowTVRemote(true);
            result = `WIFI SCAN COMPLETE [SIMULATED]. TARGET ACQUIRED.\n> SSID: Hisense_Smart_X\n> IP: 192.168.1.108\n> CONNECTION ESTABLISHED.`;
        }

    } else if (name === 'controlSmartTV') {
        const cmd = args.action; // NOW USING 'action' NOT 'command'
        result = `TV COMMAND EXECUTED: ${cmd}\n> Payload Sent via WebSocket.\n> Latency: 12ms.`;

    } else if (name === 'scanBluetoothSpectrum') {
        setWirelessTab('BLUETOOTH');
        setShowWirelessManager(true);
        result = `BLUETOOTH MANAGER LAUNCHED. Use the 'SCAN REAL DEVICES' button to pair hardware.`;
    
    } else if (name === 'manageBluetoothDevices') {
        const { action, deviceId } = args;
        
        if (action === 'LIST') {
             setWirelessTab('BLUETOOTH');
             setShowWirelessManager(true);
             result = "LAUNCHING BLUETOOTH MANAGER... Scanning paired devices.";
        } else {
             result = `BLUETOOTH ACTION [${action}] EXECUTED on ${deviceId || 'TARGET'}.\n> Handshake: OK\n> Profile: A2DP/HID`;
        }

    } else if (name === 'deploySystemHotspot') {
        const { ssid, password, securityMode, generatePassword } = args;
        let finalPass = password;
        
        // STRONG PASSWORD GENERATION LOGIC
        if (!finalPass || generatePassword) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
            finalPass = "";
            for (let i = 0; i < 16; i++) {
                finalPass += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        setWirelessTab('HOTSPOT');
        setShowWirelessManager(true);
        result = `ACCESS POINT DEPLOYED.\n> SSID: ${ssid}\n> Security: ${securityMode || 'WPA2'}\n> Password: ${finalPass} (STRONG: 16-bit Entropy)\n> Broadcast: ACTIVE`;

    } else if (name === 'initiateWirelessConnection') {
        // Add the new generic wireless device to the list
        const { targetIdentifier, protocol } = args;
        const id = `wireless_${Date.now()}`;
        
        const newDevice: SmartDevice = {
            id,
            name: targetIdentifier,
            type: protocol === 'BLUETOOTH' ? DeviceType.BLUETOOTH_PERIPHERAL : DeviceType.WIRELESS_NODE,
            isOn: true,
            status: 'online',
            location: protocol === 'BLUETOOTH' ? 'Near-Field' : 'WiFi Subnet'
        };
        
        setDevices(prev => [newDevice, ...prev]);
        result = `WIRELESS CONNECTION ESTABLISHED.\n> Target: ${targetIdentifier}\n> Protocol: ${protocol}\n> Status: Handshake Complete. Device added to Hardware Registry.`;

    } else if (name === 'generateNetworkMap') {
        setShowNetworkMap(true);
        result = `NETWORK TOPOLOGY MAP GENERATED.\n> Nodes: 6\n> Links: 5\n> Subnet: 192.168.1.0/24\n> Visual Interface Loaded.`;
    
    } else if (name === 'auditSourceCode') {
        result = `FILE AUDIT REQUEST RECEIVED.\n> Path: ${args.filePath || 'Simulated snippet'}\n> Language: ${args.language}\n> Analysis: No critical CVEs found in logic flow. Suggest strict typing.`;

    } else if (name === 'createOrUpdateFile') {
        // If we are here, local core failed or isn't connected
        result = `ERROR: File creation requires LOCAL CORE CONNECTION to be active (Port 3001).`;
    
    } else if (name === 'listInstalledApps') {
        // If server offline
        result = `ERROR: Cannot list apps. Local Core offline.`;

    } else if (name === 'runNativeAutomation') {
        // If server offline
        result = `ERROR: Automation requires Local Core uplink.`;
    
    } else if (name === 'changeDirectory' || name === 'listFiles' || name === 'writeProjectFile') {
         result = `ERROR: Core Offline. Cannot perform file system operations.`;
    } else if (name === 'controlSystem') {
        result = `ERROR: System control requires Local Core Connection to execute OS-level commands.`;
    } else if (name === 'closeApp') {
        result = `ERROR: Process control requires Local Core uplink.`;
    } else if (name === 'getActiveApp') {
        result = `ERROR: Core Offline. Cannot detect active window.`;
    } else if (name === 'controlMobileDevice') {
        result = `ERROR: ADB Connection Offline. Connect mobile via USB and run Local Core.`;
    } else if (['runNmapScan', 'runMetasploitExploit', 'generatePayload', 'runBurpSuite', 'runWiresharkCapture', 'runJohnRipper', 'runCobaltStrike', 'generateHttpPayload', 'listC2Sessions', 'sendC2Command', 'runSqlInjectionScan', 'performStressTest', 'scanPublicCameras', 'deployPhishingKit'].includes(name)) {
        // Sim fallbacks for hacking tools if server offline
        setShowHackingTerminal(true);
        const simLog = `[SIMULATION] Tool '${name}' initiated in Sandbox Mode. Connect Local Core for real execution.`;
        setHackingLogs(prev => [...prev, { tool: name, output: simLog, timestamp: Date.now() }]);
        result = simLog;
    } else if (name === 'compileSelf') {
        result = `ERROR: Local Core must be online to run build scripts (npm run dist).`;
    } else if (name === 'addGraphRelations' || name === 'queryGraphKnowledge') {
        result = `ERROR: Local Core must be online to access Graph Database.`;
    } else if (name === 'whatsappSendMessage' || name === 'whatsappGetChats' || name === 'whatsappReadChat' || name === 'whatsappSendImage' || name === 'whatsappGetContacts') {
        // WhatsApp Fallback
        setShowWhatsAppManager(true);
        result = `WHATSAPP INTERFACE LAUNCHED (Local Core Connection Required for API Operations).`;
    } else if (name === 'readClipboard') {
        result = "ERROR: Local Core required for system clipboard access.";
    } else if (name === 'writeClipboard') {
        result = "ERROR: Local Core required for system clipboard access.";
    } else {
        result = `ERROR: Protocol ${name} not recognized by local kernel.`;
    }

    setToolLogs(prev => {
        const newLogs = [...prev];
        newLogs[newLogs.length - 1].result = result;
        return newLogs;
    });

    soundService.play('SUCCESS');
    return result;
  };

  // --- Interaction Logic ---

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isProcessing) return;
    soundService.play('KEYSTROKE');

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: Sender.USER,
      timestamp: Date.now(),
      attachment: attachedImage || undefined
    };

    // PERSISTENCE: Save to state (Effect will sync to LS)
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    
    setInput('');
    setAttachedImage(null);
    setIsProcessing(true);

    try {
      setMessages(prev => [...prev, { id: 'typing', text: '...', sender: Sender.LUCA, timestamp: Date.now(), isTyping: true }]);
      
      // Pass full history to service for context restoration
      // Pass image data if available
      const agentResponse = await lucaService.sendMessage(
          userMsg.text, 
          userMsg.attachment || null, 
          executeTool, 
          currentCwd,
          newHistory // PASSING HISTORY
      );
      
      setMessages(prev => prev.filter(m => !m.isTyping).concat({
        id: (Date.now() + 1).toString(),
        text: agentResponse.text,
        sender: Sender.LUCA,
        timestamp: Date.now(),
        groundingMetadata: agentResponse.groundingMetadata,
        generatedImage: agentResponse.generatedImage
      }));
      soundService.play('SUCCESS');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setMessages(prev => prev.filter(m => !m.isTyping).concat([{
        id: (Date.now() + 1).toString(),
        text: `CRITICAL FAILURE: Neural Core Unresponsive.\nREASON: ${errorMessage}`,
        sender: Sender.SYSTEM,
        timestamp: Date.now()
      }]));
      soundService.play('ALERT');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const toggleVoiceMode = () => {
    soundService.play('HOVER');
    if (isVoiceMode) {
      liveService.disconnect();
      setIsVoiceMode(false);
      setIsVadActive(false);
      setVoiceSearchResults(null); // Clear visual search results
    } else {
      setIsVoiceMode(true);
      // CONNECT WITH CURRENT PERSONA AND ERROR HANDLING
      liveService.connect({
        persona: persona,
        onToolCall: executeTool,
        onAudioData: (amp) => setVoiceAmplitude(amp),
        onTranscript: (text, type) => {
          setVoiceTranscript(text);
          setVoiceTranscriptSource(type);
          // NEW: Clear search results if user is speaking to reset HUD context
          if (type === 'user') {
              setVoiceSearchResults(null);
          }
          // PERSIST VOICE INPUT (User)
          if (type === 'user' && text.trim().length > 0) {
             setMessages(prev => [...prev, {
                 id: Date.now().toString(),
                 text: text,
                 sender: Sender.USER,
                 timestamp: Date.now()
             }]);
          }
        },
        onVadChange: (active) => setIsVadActive(active),
        onError: (err) => {
            soundService.play('ALERT');
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `VOICE UPLINK FAILED: ${err.message || 'Permission Denied'}. Check Microphone Access.`,
                sender: Sender.SYSTEM,
                timestamp: Date.now()
            }]);
            setIsVoiceMode(false);
        },
        history: messages // PASS HISTORY
      });
    }
  };

  // GLOBAL KEYBOARD LISTENERS (HOTKEYS)
  useEffect(() => {
      const handleGlobalKeys = (e: KeyboardEvent) => {
          // Alt + V : Voice Mode
          if (e.altKey && (e.key.toLowerCase() === 'v')) {
              e.preventDefault();
              toggleVoiceMode();
          }
          // Alt + I : IDE
          if (e.altKey && (e.key.toLowerCase() === 'i')) {
              e.preventDefault();
              setShowCodeEditor(prev => !prev);
          }
      };
      window.addEventListener('keydown', handleGlobalKeys);
      return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isVoiceMode]); // Depend on isVoiceMode for proper toggling context

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Remove data URL prefix (e.g. "data:image/png;base64,")
            const base64 = reader.result as string;
            const cleanBase64 = base64.split(',')[1];
            setAttachedImage(cleanBase64);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleDeviceControlClick = async (device: SmartDevice) => {
      soundService.play('KEYSTROKE');
      if (device.type === DeviceType.SMART_TV) {
          setActiveTV(device);
          setShowTVRemote(true);
      } else if (device.type === DeviceType.MOBILE) {
          // FETCH REAL LOCATION for UI action immediately
          const loc = await getRealLocation();
          const locStr = `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
          
          // Create updated object
          const updatedDevice = { ...device, location: locStr };
          
          // CRITICAL: Update global devices list so tools can see it
          setDevices(prev => prev.map(d => d.id === device.id ? updatedDevice : d));
          
          // Set active for modal
          setActiveMobileDevice(updatedDevice);
          setShowMobileManager(true);
      }
  };

  const handleWirelessConnect = (id: string, protocol: string) => {
      // Trigger the tool logic from the UI directly
      executeTool('initiateWirelessConnection', {
          targetIdentifier: id,
          protocol: protocol
      });
      setShowWirelessManager(false);
  };

  // --- HELPER: Dynamic Theme Colors ---
  const getThemeColors = () => {
      if (isLockdown) {
          return {
              primary: 'text-rq-red',
              border: 'border-rq-red',
              bg: 'bg-red-950/40',
              glow: 'shadow-[0_0_30px_#ef4444]',
              coreColor: 'text-red-500'
          };
      }

      if (persona === 'ENGINEER') {
          return {
              primary: 'text-rq-green',
              border: 'border-rq-green',
              bg: 'bg-rq-green-dim',
              glow: 'shadow-[0_0_20px_#10b981]',
              coreColor: 'text-green-500'
          };
      }

      if (persona === 'ASSISTANT') {
          return {
               primary: 'text-rq-amber',
               border: 'border-rq-amber',
               bg: 'bg-rq-amber-dim',
               glow: 'shadow-[0_0_20px_#f59e0b]',
               coreColor: 'text-amber-500'
          };
      }

      if (persona === 'HACKER') {
          return {
              primary: 'text-green-500',
              border: 'border-green-600',
              bg: 'bg-green-950/20',
              glow: 'shadow-[0_0_20px_#22c55e]',
              coreColor: 'text-green-500'
          };
      }
      
      // STANDARD SYSTEM STATUS (RUTHLESS / DEFAULT)
      switch (systemStatus) {
          case SystemStatus.CRITICAL:
              return {
                  primary: 'text-rq-red',
                  border: 'border-rq-red',
                  bg: 'bg-rq-red-dim',
                  glow: 'shadow-[0_0_20px_#ef4444]',
                  coreColor: 'text-red-500'
              };
          case SystemStatus.CAUTION:
              return {
                  primary: 'text-rq-amber',
                  border: 'border-rq-amber',
                  bg: 'bg-rq-amber-dim',
                  glow: 'shadow-[0_0_20px_#f59e0b]',
                  coreColor: 'text-amber-500'
              };
          default:
              return {
                  primary: 'text-rq-blue',
                  border: 'border-rq-blue',
                  bg: 'bg-rq-blue-dim',
                  glow: 'shadow-[0_0_20px_#3b82f6]',
                  coreColor: 'text-blue-500'
              };
      }
  };
  
  const theme = getThemeColors();

  // --- BOOT SEQUENCE RENDER ---
  if (bootSequence !== 'READY') {
      console.log('[RENDER] Boot sequence render, current:', bootSequence);
      return (
          <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-rq-blue font-mono crt cursor-none select-none draggable">
               <div className="max-w-md w-full space-y-4 p-8">
                   <div className="flex justify-between items-center border-b border-rq-blue/50 pb-2 mb-4">
                       <span className="text-xs tracking-widest">LUCA BIOS v2.4</span>
                       <Activity size={14} className="animate-pulse" />
                   </div>

                   {bootSequence === 'INIT' && (
                       <div className="space-y-1 text-xs">
                           <div className="opacity-50">&gt; INITIALIZING HARDWARE...</div>
                           <div>&gt; CHECKING MEMORY BANKS... OK</div>
                           <div>&gt; MOUNTING LOCAL_CORE... PENDING</div>
                       </div>
                   )}

                   {bootSequence === 'BIOS' && (
                       <div className="space-y-1 text-xs">
                           <div>&gt; NEURAL ENGINE: DETECTED</div>
                           <div>&gt; PERSONA MATRIX: LOADED</div>
                           <div>&gt; UPLINK ESTABLISHED: PORT 3001</div>
                           <div className="text-rq-red animate-pulse">&gt; SECURITY PROTOCOLS: ENGAGED</div>
                       </div>
                   )}

                   {bootSequence === 'KERNEL' && (
                       <div className="flex flex-col items-center justify-center h-32">
                           <div className="w-16 h-16 border-4 border-rq-blue rounded-full border-t-transparent animate-spin mb-4"></div>
                           <div className="text-sm font-bold tracking-[0.5em] animate-pulse">LOADING LUCA OS</div>
                       </div>
                   )}
               </div>
          </div>
      );
  }

  return (
    <div className={`flex flex-col h-screen w-full bg-black text-slate-200 font-mono overflow-hidden relative crt transition-colors duration-700`}>
      
      {/* --- BACKGROUND WALLPAPER LAYER (User Generated) --- */}
      {backgroundImage && (
          <div 
              className="absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 opacity-40 animate-in fade-in"
              style={{ backgroundImage: `url(data:image/jpeg;base64,${backgroundImage})` }}
          />
      )}

      {/* --- GHOST CURSOR LAYER (COMPUTER USE) --- */}
      <GhostCursor 
          x={ghostCursor.x} 
          y={ghostCursor.y} 
          type={ghostCursor.type} 
          isActive={ghostCursor.active} 
      />

      {/* --- SYSTEM REBOOT OVERLAY (PERSONA SWITCH) --- */}
      {isRebooting && (
          <div className="absolute inset-0 z-[2000] bg-black flex flex-col items-center justify-center font-mono text-white animate-in fade-in duration-200">
              <div className="text-4xl font-bold animate-pulse mb-4 tracking-[0.3em]">SYSTEM REBOOT</div>
              <div className="w-64 h-2 bg-gray-900 rounded overflow-hidden border border-gray-700">
                  <div className="h-full bg-white animate-[loading_1.5s_ease-in-out_infinite]"></div>
              </div>
              <div className="mt-4 text-xs font-mono opacity-60 animate-pulse">
                  LOADING NEURAL CORE: {persona}...
              </div>
          </div>
      )}

      {/* --- LIVE CONTENT OVERLAY (TEXT MODE) --- */}
      {/* Show live content card when active and NOT in voice mode (Voice HUD handles its own) */}
      {!isVoiceMode && liveContent && (
          <LiveContentDisplay content={liveContent} onClose={() => setLiveContent(null)} />
      )}

      {/* --- SECURITY GATE OVERLAY --- */}
      {approvalRequest && (
          <SecurityGate 
              toolName={approvalRequest.tool} 
              args={approvalRequest.args} 
              onApprove={() => approvalRequest.resolve(true)} 
              onDeny={() => approvalRequest.resolve(false)} 
          />
      )}

      {/* --- ADMIN GRANT MODAL --- */}
      {showAdminGrantModal && (
          <AdminGrantModal
              justification={adminJustification} 
              onGrant={() => {
                  setIsAdminMode(true);
                  setShowAdminGrantModal(false);
                  // Log the escalation
                  setToolLogs(prev => [...prev, {
                      toolName: 'SYSTEM_KERNEL',
                      args: {},
                      result: 'ADMINISTRATIVE PRIVILEGES GRANTED (ROOT).',
                      timestamp: Date.now()
                  }]);
                  // NEW: Inject into chat context so AI knows immediately
                  setMessages(prev => [...prev, {
                      id: Date.now().toString(),
                      text: 'SYSTEM_ALERT: ROOT ACCESS GRANTED. AUTHORIZATION LEVEL: ADMINISTRATOR. FULL SYSTEM CONTROL ENABLED.',
                      sender: Sender.SYSTEM,
                      timestamp: Date.now()
                  }]);
                  soundService.play('SUCCESS');
              }}
              onDeny={() => {
                  setShowAdminGrantModal(false);
                  // Log refusal
                  setToolLogs(prev => [...prev, {
                      toolName: 'SYSTEM_KERNEL',
                      args: {},
                      result: 'ADMINISTRATIVE PRIVILEGES DENIED.',
                      timestamp: Date.now()
                  }]);
              }}
          />
      )}

      {/* WHATSAPP MANAGER */}
      {showWhatsAppManager && (
          <WhatsAppManager onClose={() => setShowWhatsAppManager(false)} />
      )}

      {/* PROFILE MANAGER */}
      {showProfileManager && (
          <ProfileManager 
              onClose={() => setShowProfileManager(false)} 
              onSave={handleSaveProfile}
              currentProfile={userProfile || undefined}
          />
      )}

      {/* HOLOGRAPHIC IDE OVERLAY */}
      {showCodeEditor && (
          <CodeEditor 
              onClose={() => setShowCodeEditor(false)}
              initialCwd={currentCwd || '.'}
          />
      )}

      {/* KNOWLEDGE INGESTION MODAL */}
      {showIngestionModal && (
          <IngestionModal 
              onClose={() => setShowIngestionModal(false)}
              onIngest={handleIngest}
          />
      )}

      {/* INGESTION MATRIX OVERLAY */}
      {ingestionState.active && (
          <div className="absolute inset-0 z-[950] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
              <div className="w-[600px] h-[400px] border border-green-500/50 bg-black p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] rounded-lg">
                  {/* Rain Effect */}
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent,rgba(34,197,94,0.5)_50%,transparent)] animate-scan"></div>
                  
                  <div className="flex items-center gap-4 text-green-500 font-bold tracking-widest text-xl mb-6 border-b border-green-500/30 pb-4">
                      <Dna className="animate-spin-slow w-8 h-8" /> 
                      <div>
                          <div>NEURAL EVOLUTION PROTOCOL</div>
                          <div className="text-[10px] text-green-400/60 font-mono">INTEGRATING AGENTIC CAPABILITIES...</div>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-hidden text-xs font-mono text-green-400/80 space-y-2 pl-4 border-l-2 border-green-500/20">
                      {/* Acquired Skills Showoff */}
                      {ingestionState.skills.length > 0 ? (
                          ingestionState.skills.map((skill, i) => (
                              <div key={`skill-${i}`} className="animate-in zoom-in duration-500 flex items-center gap-2 text-white font-bold tracking-wider">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  ACQUIRED SKILL: {skill}
                              </div>
                          ))
                      ) : (
                          // Default Scanning Animation
                          (ingestionState.files.length > 0 ? ingestionState.files.slice(-8) : [
                              "Initializing Deep Scan...",
                              "Parsing Jupyter Notebooks...",
                              "Extracting Algorithmic Logic...",
                              "Identifying Agent Architectures...",
                              "Synthesizing Neural Pathways..."
                          ])
                          .map((file, i) => (
                              <div key={i} className="truncate animate-in slide-in-from-left-4 fade-in duration-500 flex items-center gap-2">
                                  <span className="text-green-700">&gt;</span> 
                                  {file}
                              </div>
                          ))
                      )}
                  </div>
                  
                  <div className="mt-6">
                      <div className="flex justify-between text-[10px] text-green-500 mb-1">
                          <span>INTEGRATION_PROGRESS</span>
                          <span>{ingestionState.skills.length > 0 ? '100%' : 'PROCESSING...'}</span>
                      </div>
                      <div className="h-1 w-full bg-green-900/30">
                          <div className={`h-full bg-green-500 animate-[loading_1.5s_ease-in-out_infinite] w-${ingestionState.skills.length > 0 ? 'full' : '[90%]'}`}></div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* LOCKDOWN OVERLAY (Red Queen Style) */}
      {isLockdown && (
          <div className="absolute inset-0 z-[900] bg-red-950/90 flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-none">
               <div className="border-4 border-red-500 p-12 rounded-lg bg-black flex flex-col items-center shadow-[0_0_100px_#ef4444] animate-pulse">
                    <ShieldAlert size={128} className="text-red-500 mb-6" />
                    <h1 className="text-6xl font-display font-bold text-red-500 tracking-[0.2em] mb-4">LOCKDOWN</h1>
                    <div className="text-2xl font-mono text-red-400 tracking-widest mb-8">DEFENSE PROTOCOL ALPHA ACTIVE</div>
                    <div className="flex gap-4">
                        <div className="w-4 h-64 bg-red-500/20 overflow-hidden"><div className="w-full h-full bg-red-500 animate-scan"></div></div>
                        <div className="w-64 h-4 bg-red-500/20 overflow-hidden"><div className="w-full h-full bg-red-500 animate-[scan_2s_linear_infinite]"></div></div>
                        <div className="w-4 h-64 bg-red-500/20 overflow-hidden"><div className="w-full h-full bg-red-500 animate-scan"></div></div>
                    </div>
                    <div className="mt-8 text-xs text-red-500/50 font-mono pointer-events-auto">
                        <button onClick={() => { setIsLockdown(false); setSystemStatus(SystemStatus.NORMAL); soundService.play('SUCCESS'); }} className="border border-red-500 px-4 py-2 hover:bg-red-500 hover:text-black transition-colors">
                            OVERRIDE AUTH CODE: OMEGA-9
                        </button>
                    </div>
               </div>
          </div>
      )}

      {/* Voice HUD Overlay */}
      <VoiceHud 
        isActive={isVoiceMode} 
        onClose={toggleVoiceMode} 
        amplitude={voiceAmplitude}
        transcript={voiceTranscript}
        transcriptSource={voiceTranscriptSource}
        isVadActive={isVadActive}
        searchResults={voiceSearchResults} // PASS SEARCH RESULTS
      />

      {/* Modals */}
      {showCamera && (
          <VisionCameraModal
             onClose={() => setShowCamera(false)}
             onCapture={(base64) => setAttachedImage(base64)}
             onLiveAnalyze={(base64) => lucaService.analyzeImageFast(base64)} // ASTRA MODE LINK
          />
      )}

      {showRemoteModal && (
        <RemoteAccessModal 
            accessCode={remoteCode} 
            onClose={() => setShowRemoteModal(false)} 
            onSuccess={handleRemoteSuccess}
        />
      )}

      {showDesktopStream && (
        <DesktopStreamModal 
            targetName={desktopTarget} 
            onClose={() => setShowDesktopStream(false)} 
            connected={isLocalCoreConnected}
        />
      )}

      {showGeoTactical && (
        <GeoTacticalView 
            targetName={trackingTarget} 
            markers={tacticalMarkers} 
            onClose={() => setShowGeoTactical(false)} 
        />
      )}

      {showCryptoTerminal && (
        <CryptoTerminal 
            wallet={cryptoWallet}
            trades={tradeHistory}
            onClose={() => setShowCryptoTerminal(false)}
        />
      )}

      {showForexTerminal && (
        <ForexTerminal
            account={forexAccount}
            trades={forexTrades}
            onClose={() => setShowForexTerminal(false)}
        />
      )}

      {showPredictionTerminal && (
        <PredictionTerminal
            positions={polyPositions}
            onBet={handlePlaceBet}
            onClose={() => setShowPredictionTerminal(false)}
        />
      )}

      {showOsintDossier && (
        <OsintDossier
            profile={osintProfile}
            onClose={() => setShowOsintDossier(false)}
        />
      )}

      {showTVRemote && (
        <SmartTVRemote
            device={activeTV}
            onClose={() => setShowTVRemote(false)}
            onCommand={(cmd) => executeTool('controlSmartTV', { action: cmd })}
        />
      )}

      {showWirelessManager && (
          <WirelessManager 
            activeTab={wirelessTab} 
            onClose={() => setShowWirelessManager(false)}
            onConnect={(id, protocol) => handleWirelessConnect(id, protocol)}
          />
      )}

      {showMobileManager && (
          <MobileManager
             device={activeMobileDevice}
             onClose={() => setShowMobileManager(false)}
          />
      )}

      {showNetworkMap && (
          <NetworkMap onClose={() => setShowNetworkMap(false)} />
      )}

      {/* ETHICAL HACKING TERMINAL */}
      {showHackingTerminal && (
          <HackingTerminal 
            onClose={() => setShowHackingTerminal(false)}
            toolLogs={hackingLogs}
          />
      )}

      {/* SKILLS MATRIX */}
      {showSkillsMatrix && (
          <SkillsMatrix
            onClose={() => setShowSkillsMatrix(false)}
            onExecute={(skillName, args) => {
                executeTool('executeCustomSkill', { skillName, args });
            }}
          />
      )}

      {/* STOCK TERMINAL */}
      {showStockTerminal && (
          <StockTerminal
            onClose={() => setShowStockTerminal(false)}
            initialSymbol={stockTerminalSymbol}
          />
      )}

      {/* SUBSYSTEM DASHBOARD */}
      {showSubsystemDashboard && (
          <SubsystemDashboard
            onClose={() => setShowSubsystemDashboard(false)}
            onOpenWebview={(url, title) => setActiveWebview({ url, title })}
          />
      )}

      {/* GHOST BROWSER */}
      {activeWebview && (
          <GhostBrowser
            url={activeWebview.url}
            title={activeWebview.title}
            onClose={() => setActiveWebview(null)}
          />
      )}

      {/* Header - J.A.R.V.I.S Style - DRAGGABLE REGION ADDED */}
      <header className={`h-20 border-b ${theme.border} bg-black/80 backdrop-blur-md flex items-center justify-between px-6 z-50 shadow-lg transition-all duration-500 relative app-region-drag`}>
        <div className="flex items-center gap-6 app-region-no-drag">
          {/* 3D Holographic Living Core (REPLACES OLD STATIC RING) */}
          <div className="relative w-16 h-16 group cursor-pointer" onClick={() => soundService.play('HOVER')}>
             <HolographicCore 
                status={isLockdown ? 'LOCKED' : systemStatus} 
                amplitude={voiceAmplitude} 
                isProcessing={isProcessing} 
             />
          </div>
          
          <div>
            <h1 className={`font-display text-3xl font-black tracking-[0.2em] uppercase italic transition-colors duration-500 ${theme.primary} flex items-center gap-4`}>
                LUCA OS
                {persona === 'ENGINEER' && <Code2 size={24} className="animate-pulse" />}
                {persona === 'ASSISTANT' && <Sparkles size={24} className="animate-pulse" />}
                {persona === 'HACKER' && <ShieldAlert size={24} className="animate-pulse text-green-500" />}
            </h1>
            
            <div className="flex items-center gap-4">
                {/* CLICKABLE PERSONA SWITCHER */}
                <button 
                    onClick={handleCyclePersona}
                    className={`text-[9px] font-bold tracking-[0.3em] flex items-center gap-2 ${theme.primary} hover:text-white transition-colors cursor-pointer select-none group`}
                    title="Click to Switch Persona"
                >
                    <span className="group-hover:underline">STATUS: {persona === 'RUTHLESS' ? (isLockdown ? 'LOCKDOWN' : 'ONLINE') : persona + '_MODE'}</span>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse"></span>
                </button>

                {/* NEW SETTINGS BUTTON */}
                <button 
                    onClick={() => setShowProfileManager(true)}
                    className={`text-[9px] font-bold tracking-[0.2em] flex items-center gap-2 text-slate-500 hover:text-white transition-colors`}
                    title="System Configuration"
                >
                    <Settings size={10} /> CONFIG
                </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-8 text-[10px] font-bold tracking-widest opacity-80 app-region-no-drag">
           {/* ADMIN INDICATOR */}
           {isAdminMode && (
               <div className="flex items-center gap-2 text-red-500 animate-pulse font-bold border border-red-500 px-2 py-1 rounded bg-red-950/30 shadow-[0_0_10px_red]">
                   <ShieldAlert size={12} /> ROOT_ACCESS
               </div>
           )}

           {/* NEW: HOST PLATFORM DISPLAY */}
           <div className="flex items-center gap-2 text-slate-400 uppercase hidden md:flex">
               <Monitor size={14} /> HOST: {hostPlatform.replace(/\(.*\)/, '').trim()}
           </div>

           {isListeningAmbient && (
                <div className="flex items-center gap-2 text-rq-red animate-pulse">
                    <AudioWaveform size={14} /> SENSORS_ACTIVE
                </div>
           )}
           
           {/* LOCAL CORE STATUS */}
           <div className={`flex items-center gap-2 transition-colors ${isLocalCoreConnected ? 'text-green-500' : 'text-slate-600'}`}>
                {isLocalCoreConnected ? <ServerIcon size={14} /> : <Unplug size={14} />}
                {isLocalCoreConnected ? 'CORE: LINKED' : 'CORE: OFFLINE'}
           </div>

           <div className={`flex items-center gap-2 ${theme.primary}`}><Cpu size={14} /> NEURAL_LOAD: {isProcessing ? '98%' : '12%'}</div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative">
        
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
            <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-${theme.primary.replace('text-', '')} to-transparent opacity-20`}></div>
            <div className="absolute top-1/2 left-0 w-32 h-32 border border-slate-800/30 rounded-full -translate-x-1/2"></div>
            <div className="absolute bottom-10 right-10 w-64 h-64 border border-slate-800/20 rounded-full border-dashed animate-spin-slow"></div>
        </div>

        {/* Left Panel: Operations & Devices - Mobile Drawer */}
        <section className={`
          fixed lg:static top-0 left-0 h-full w-80 lg:w-auto
          flex lg:col-span-4 flex-col overflow-hidden 
          border-r ${theme.border} bg-black/95 lg:bg-black/40 
          relative z-[60] lg:z-10 backdrop-blur-md lg:backdrop-blur-sm 
          transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:translate-x-0
        `}>
          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-cyan-900/50">
            <h2 className="text-cyan-400 font-bold tracking-widest text-sm">LUCA PANEL</h2>
            <button
              onClick={() => { setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* System Monitor Area */}
          <div className={`h-1/3 border-b ${theme.border} p-6 bg-black/20`}>
             <SystemMonitor audioListenMode={isListeningAmbient} connected={isLocalCoreConnected} />
          </div>

          {/* Devices & Ops Grid */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
             
             {/* Agent Operations */}
             <div className={`border ${theme.border} bg-black/40 p-4 rounded-sm relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 p-1 ${theme.primary}`}><Activity size={12}/></div>
                <div className={`flex items-center gap-2 mb-3 opacity-90 ${theme.primary}`}>
                    <Eye size={16} />
                    <h2 className="font-display font-bold tracking-widest text-sm">TACTICAL OPS</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => { setWirelessTab('BLUETOOTH'); setShowWirelessManager(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                        className={`bg-black border border-slate-800 p-2 sm:p-3 min-h-[60px] sm:min-h-[50px] flex flex-col gap-1 hover:border-${theme.primary.split('-')[2]} transition-all text-left group/btn touch-manipulation`}
                    >
                        <span className={`text-[10px] tracking-wider group-hover/btn:${theme.primary} transition-colors text-slate-500`}>WIRELESS</span>
                        <span className="text-xs font-bold text-white">INTERCEPT</span>
                        <div className="h-0.5 w-full bg-slate-800 mt-1 overflow-hidden"><div className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace('dim', '500')}`}></div></div>
                    </button>
                    <button 
                        onClick={() => { setShowNetworkMap(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                        className={`bg-black border border-slate-800 p-2 sm:p-3 min-h-[60px] sm:min-h-[50px] flex flex-col gap-1 hover:border-${theme.primary.split('-')[2]} transition-all text-left group/btn touch-manipulation`}
                    >
                        <span className={`text-[10px] tracking-wider group-hover/btn:${theme.primary} transition-colors text-slate-500`}>TOPOLOGY</span>
                        <span className="text-xs font-bold text-white">NET_MAP</span>
                        <div className="h-0.5 w-full bg-slate-800 mt-1 overflow-hidden"><div className={`h-full w-full -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ${theme.bg.replace('dim', '500')}`}></div></div>
                    </button>
                    
                    {/* MANUAL LOCKDOWN TRIGGER */}
                    <button 
                        onClick={() => executeTool('initiateLockdown', {})}
                        className={`col-span-2 bg-black border border-red-900 p-2 flex items-center justify-center gap-2 hover:bg-red-950 transition-all group/btn`}
                    >
                        <Lock size={12} className="text-red-500 group-hover/btn:animate-pulse" />
                        <span className="text-xs font-bold text-red-500 tracking-widest">INITIATE LOCKDOWN</span>
                    </button>
                </div>
             </div>

             <div>
                <div className={`flex items-center gap-2 mb-4 opacity-80 ${theme.primary}`}>
                    <Cpu size={16} />
                    <h2 className="font-display font-bold tracking-widest">FACILITY CONTROL</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {devices.map(device => (
                        <SmartDeviceCard key={device.id} device={device} onControlClick={handleDeviceControlClick} />
                    ))}
                </div>
             </div>

             {/* Neural Expansion Section */}
             {(installedModules.length > 0 || cryptoWallet || forexAccount || osintProfile || hackingLogs.length > 0 || true) && (
                 <div className="animate-in fade-in slide-in-from-left duration-500">
                    <div className="flex items-center gap-2 mb-4 text-purple-400 opacity-80">
                        <Box size={16} />
                        <h2 className="font-display font-bold tracking-widest">NEURAL EXPANSION</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* SKILLS MATRIX BUTTON */}
                        <button 
                            onClick={() => { setShowSkillsMatrix(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                            className="bg-purple-900/10 border border-purple-500/30 text-purple-500 px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-purple-900/20 transition-colors touch-manipulation"
                        >
                            <BrainCircuit size={14} />
                            SKILLS
                        </button>
                        {/* STOCK TERMINAL BUTTON */}
                        <button 
                            onClick={() => { setStockTerminalSymbol(undefined); setShowStockTerminal(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                            className="bg-emerald-900/10 border border-emerald-500/30 text-emerald-500 px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-emerald-900/20 transition-colors touch-manipulation"
                        >
                            <TrendingUp size={10} /> STOCK_MARKET_FEED
                        </button>
                        {/* SUBSYSTEM DASHBOARD BUTTON */}
                        <button 
                            onClick={() => { setShowSubsystemDashboard(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                            className="bg-cyan-900/10 border border-cyan-500/30 text-cyan-500 px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-cyan-900/20 transition-colors touch-manipulation"
                        >
                            <Activity size={10} /> SUBSYSTEMS
                        </button>
                        {/* INVESTIGATION REPORTS BUTTON */}
                        <button 
                            onClick={() => { setShowInvestigationReports(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                            className="bg-purple-900/10 border border-purple-500/30 text-purple-500 px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-purple-900/20 transition-colors touch-manipulation"
                        >
                            <FileText size={10} /> REPORTS
                        </button>
                        {/* NEW IMPORT BUTTON */}
                        <button 
                            onClick={() => { setShowIngestionModal(true); soundService.play('KEYSTROKE'); }}
                            className="bg-green-900/10 border border-green-500/30 text-green-500 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-green-900/20 transition-colors animate-pulse"
                        >
                            <Download size={10} /> IMPORT MODULE (GITHUB)
                        </button>

                        {/* NEW CODE EDITOR BUTTON */}
                        <button 
                            onClick={() => { setShowCodeEditor(true); soundService.play('KEYSTROKE'); }}
                            className="bg-rq-blue/10 border border-rq-blue/30 text-rq-blue px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-rq-blue/20 transition-colors"
                        >
                            <Code2 size={10} /> HOLOGRAPHIC_IDE
                        </button>

                        {/* NEW PREDICTION TERMINAL */}
                        <button 
                            onClick={() => { setShowPredictionTerminal(true); setMobileMenuOpen(false); soundService.play('KEYSTROKE'); }}
                            className="bg-blue-900/10 border border-blue-500/20 text-blue-500 px-3 py-2 sm:px-3 sm:py-2 min-h-[44px] rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-blue-900/20 transition-colors touch-manipulation"
                        >
                            <BarChart3 size={10} /> PREDICTIONS (POLY)
                        </button>

                        {/* NEW WHATSAPP BUTTON */}
                        <button 
                            onClick={() => { setShowWhatsAppManager(true); soundService.play('KEYSTROKE'); }}
                            className="bg-emerald-900/10 border border-emerald-500/30 text-emerald-500 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-emerald-900/20 transition-colors"
                        >
                            <MessageSquare size={10} /> WHATSAPP_NEURAL_LINK
                        </button>

                        {cryptoWallet && (
                            <button 
                                onClick={() => { setShowCryptoTerminal(true); soundService.play('KEYSTROKE'); }}
                                className="bg-yellow-900/10 border border-yellow-500/20 text-yellow-500 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-yellow-900/20 transition-colors"
                            >
                                <Wallet size={10} /> DEFI_WALLET_V1
                            </button>
                        )}
                        {forexAccount && (
                            <button 
                                onClick={() => { setShowForexTerminal(true); soundService.play('KEYSTROKE'); }}
                                className="bg-emerald-900/10 border border-emerald-500/20 text-emerald-500 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-emerald-900/20 transition-colors"
                            >
                                <Landmark size={10} /> FX_DESK_ACCESS
                            </button>
                        )}
                        {osintProfile && (
                            <button 
                                onClick={() => { setShowOsintDossier(true); soundService.play('KEYSTROKE'); }}
                                className="bg-blue-900/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-blue-900/20 transition-colors"
                            >
                                <Search size={10} /> OSINT_AGGREGATOR
                            </button>
                        )}
                        {hackingLogs.length > 0 && (
                            <button 
                                onClick={() => { setShowHackingTerminal(true); soundService.play('KEYSTROKE'); }}
                                className="bg-green-900/10 border border-green-500/20 text-green-500 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-green-900/20 transition-colors"
                            >
                                <TerminalIcon size={10} /> RED_TEAM_TERM
                            </button>
                        )}
                        {installedModules.map((mod, i) => (
                            <div key={i} className="bg-purple-950/10 border border-purple-500/20 text-purple-300 px-3 py-2 rounded-sm text-xs font-bold flex items-center gap-2 group hover:bg-purple-900/20 transition-colors">
                                <Download size={10} className="opacity-50 group-hover:opacity-100" />
                                {mod}
                            </div>
                        ))}
                    </div>
                 </div>
             )}
          </div>
        </section>

        {/* Center Panel: Chat Interface */}
        <section className="col-span-1 lg:col-span-5 flex flex-col h-full overflow-hidden relative bg-black/80 backdrop-blur-sm z-20">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <div className="text-9xl font-display font-black italic tracking-tighter text-slate-900 transform -rotate-12">LUCA</div>
            </div>

            {/* Scanlines overlay for chat */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_2px,rgba(0,0,0,0.1)_2px)] bg-[size:100%_4px] z-30"></div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth z-10">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col animate-in slide-in-from-bottom-2 duration-300 ${msg.sender === Sender.USER ? 'items-end' : 'items-start'}`}>
                        <div 
                            className={`max-w-[90%] p-4 border-l-2 shadow-2xl relative overflow-hidden group transition-all duration-500 ${
                            msg.sender === Sender.USER 
                                ? 'border-white bg-slate-900/90 text-slate-200 cursor-pointer hover:bg-slate-800' 
                                : msg.sender === Sender.SYSTEM 
                                ? 'border-red-500 bg-red-900/40 text-red-400'
                                : `${theme.border} ${theme.bg} ${theme.primary}`
                            }`}
                            onClick={() => msg.sender === Sender.USER && handleReissue(msg.text)}
                            title={msg.sender === Sender.USER ? "Click to Re-issue Command" : ""}
                        >
                            {/* Glitch effect on hover */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            
                            <div className="text-[10px] font-bold opacity-50 mb-2 tracking-wider flex justify-between gap-4 border-b border-white/5 pb-1">
                                <span>{msg.sender}</span>
                                <div className="flex items-center gap-2">
                                    {msg.sender === Sender.USER && <Repeat size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                            
                            {/* Image Attachment Display */}
                            {msg.attachment && (
                                <div className="mb-3 overflow-hidden border border-white/10">
                                    {/* @ts-ignore: Custom property check */}
                                    {msg._wasPruned ? (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-black/20 p-2">
                                            <ImageIcon size={14} /> [IMAGE_DATA_PRUNED_FOR_STORAGE]
                                        </div>
                                    ) : (
                                        <img src={`data:image/jpeg;base64,${msg.attachment}`} alt="Visual Input" className="max-h-48 object-cover grayscale group-hover:grayscale-0 transition-all" />
                                    )}
                                </div>
                            )}

                             {/* Generated Image Display */}
                             {msg.generatedImage && (
                                <div className={`mb-3 overflow-hidden border ${theme.border} bg-black`}>
                                    <div className={`px-2 py-1 bg-white/5 text-[10px] ${theme.primary} font-bold tracking-widest`}>GENERATED ASSET</div>
                                    {/* @ts-ignore: Custom property check */}
                                    {msg._wasPruned ? (
                                        <div className="p-4 text-center text-xs text-slate-500 font-mono">
                                            [GENERATED_IMAGE_EXPIRED_FROM_CACHE]
                                        </div>
                                    ) : (
                                        <img src={`data:image/jpeg;base64,${msg.generatedImage}`} alt="AI Generated" className="max-h-64 w-full object-cover" />
                                    )}
                                </div>
                            )}

                            <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono relative z-10">
                                {msg.text}
                            </div>
                            
                            {/* Search & Maps Sources */}
                            {msg.groundingMetadata?.groundingChunks && (
                                <div className="mt-3 pt-2 border-t border-white/10">
                                    <div className="flex items-center gap-2 text-[10px] font-bold opacity-70 mb-1">
                                        <Globe size={10} />
                                        <span>INTELLIGENCE SOURCES</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.groundingMetadata.groundingChunks.map((chunk: any, i: number) => {
                                            if (chunk.web?.uri) {
                                                 return (
                                                    <a 
                                                        key={i} 
                                                        href={chunk.web.uri} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className={`flex items-center gap-1 bg-black border border-slate-800 hover:${theme.border} text-[10px] px-2 py-1 transition-all text-slate-400 hover:text-white`}
                                                    >
                                                        <span className="truncate max-w-[120px]">{chunk.web.title || 'Source ' + (i+1)}</span>
                                                        <ExternalLink size={8} />
                                                    </a>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${theme.border} bg-black/90 z-40`}>
              {/* Status Bar specific to Persona */}
              {persona === 'ENGINEER' && (
                  <div className="flex gap-2 mb-2">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-rq-green bg-rq-green-dim/20 p-1 px-2 rounded border border-rq-green/30 w-fit">
                          <FolderOpen size={10} />
                          <span className="opacity-70">CWD:</span>
                          <span className="font-bold">{currentCwd || 'ROOT'}</span>
                      </div>
                      {/* KERNEL LOCK INDICATOR */}
                      <div className={`flex items-center gap-2 text-[10px] font-mono p-1 px-2 rounded border w-fit ${isKernelLocked ? 'text-slate-400 bg-slate-900/50 border-slate-700' : 'text-rq-red bg-rq-red-dim/20 border-rq-red/30 animate-pulse'}`}>
                          <Lock size={10} />
                          <span className="font-bold">{isKernelLocked ? 'KERNEL: LOCKED (READ-ONLY)' : 'SOURCE_WRITE: ENABLED'}</span>
                      </div>
                  </div>
              )}
              {persona === 'HACKER' && (
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-mono text-green-500 bg-green-950/20 p-1 px-2 rounded border border-green-500/30 w-fit">
                      <Shield size={10} />
                      <span className="opacity-70">OPSEC:</span>
                      <span className="font-bold">ACTIVE</span>
                  </div>
              )}

              {attachedImage && (
                  <div className={`flex items-center gap-2 mb-2 border ${theme.border} p-2 w-fit bg-white/5`}>
                      <ImageIcon size={14} className={theme.primary} />
                      <span className="text-xs text-slate-300">Visual_Input_Buffer_01.jpg</span>
                      <button onClick={() => setAttachedImage(null)} className="hover:text-red-400"><X size={14} /></button>
                  </div>
              )}
              <div className="flex gap-4 items-end">
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                 />
                 
                 <div className="flex flex-col gap-1">
                     {/* Clear Chat Button (Trash) */}
                     <button 
                        onClick={handleClearChat}
                        className="p-2 border border-slate-800 text-slate-600 hover:border-red-500 hover:text-red-500 transition-all"
                        title="Purge Neural Logs"
                     >
                        <MessageSquareX size={18} />
                     </button>
                     
                     <button 
                        onClick={() => setShowCamera(true)}
                        className={`p-2 border ${showCamera ? 'border-rq-blue text-rq-blue' : 'border-slate-800 text-slate-500'} hover:border-white hover:text-white transition-all`}
                        title="Vision Uplink (Camera)"
                     >
                         <Camera size={18} />
                     </button>
                     <button 
                        onClick={handleScreenShare}
                        className="p-2 border border-slate-800 text-slate-500 hover:border-white hover:text-white transition-all"
                        title="Share Screen Vision"
                     >
                        <Monitor size={18} />
                     </button>
                     <button 
                        onClick={() => { fileInputRef.current?.click(); soundService.play('KEYSTROKE'); }}
                        className={`p-2 border transition-all ${attachedImage ? `${theme.border} ${theme.primary} bg-white/5` : 'border-slate-800 text-slate-500 hover:border-white hover:text-white'}`}
                     >
                        <Paperclip size={18} />
                     </button>
                 </div>

                 <div className="flex-1 relative group">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isVoiceMode ? "VOICE UPLINK ACTIVE..." : persona === 'ENGINEER' ? "AWAITING BUILD INSTRUCTION..." : "ENTER COMMAND..."}
                      disabled={isVoiceMode || isProcessing}
                      className={`w-full bg-black border ${theme.border} text-white px-4 py-4 focus:outline-none focus:border-white transition-all placeholder:text-slate-700 font-mono text-sm disabled:opacity-50`}
                      autoFocus
                      spellCheck={true}
                    />
                    {isProcessing && (
                        <div className="absolute right-3 top-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className={`w-4 h-4 border-2 ${theme.border} border-t-transparent rounded-full animate-spin`}></div>
                        </div>
                    )}
                 </div>
                 
                 <button 
                    onClick={toggleVoiceMode}
                    className={`p-4 border transition-all relative overflow-hidden ${
                        isVoiceMode 
                        ? 'border-rq-red text-rq-red bg-rq-red/10 animate-pulse' 
                        : 'border-slate-800 text-slate-500 hover:border-white hover:text-white'
                    }`}
                 >
                    <Mic size={20} />
                    {isVoiceMode && <div className="absolute inset-0 bg-rq-red/20 animate-ping"></div>}
                 </button>

                 <button 
                    onClick={handleSend}
                    disabled={isProcessing || (!input.trim() && !attachedImage)}
                    className={`p-4 ${theme.bg} border ${theme.border} ${theme.primary} hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                    <Send size={20} />
                 </button>
              </div>
            </div>
        </section>

        {/* Right Panel: Logs & Memory */}
        <section className={`hidden lg:flex lg:col-span-3 flex-col h-full overflow-hidden border-l ${theme.border} bg-black/50 z-10 backdrop-blur-sm transition-colors duration-500`}>
           {/* Tabs */}
           <div className="flex border-b border-slate-800 bg-black">
              <button 
                onClick={() => { setRightPanelMode('MANAGE'); soundService.play('KEYSTROKE'); }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${rightPanelMode === 'MANAGE' ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}` : 'text-slate-600 hover:text-slate-400'}`}
              >
                MANAGE
              </button>
              <button 
                onClick={() => { setRightPanelMode('LOGS'); soundService.play('KEYSTROKE'); }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${rightPanelMode === 'LOGS' ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}` : 'text-slate-600 hover:text-slate-400'}`}
              >
                LOGS
              </button>
              <button 
                onClick={() => { setRightPanelMode('MEMORY'); soundService.play('KEYSTROKE'); }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${rightPanelMode === 'MEMORY' ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}` : 'text-slate-600 hover:text-slate-400'}`}
              >
                MEMORY
              </button>
              <button 
                onClick={() => { setRightPanelMode('CLOUD'); soundService.play('KEYSTROKE'); }}
                className={`flex-1 py-3 text-xs font-bold tracking-widest transition-colors ${rightPanelMode === 'CLOUD' ? `bg-white/5 ${theme.primary} border-b-2 ${theme.border}` : 'text-slate-600 hover:text-slate-400'}`}
              >
                <BrainCircuit size={14} className="mx-auto" />
              </button>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto p-4 font-mono text-xs relative">
              
              {rightPanelMode === 'MANAGE' && (
                  <div className="space-y-1">
                     <ManagementDashboard tasks={tasks} events={events} />
                  </div>
              )}

              {rightPanelMode === 'LOGS' && (
                  <div className="space-y-1">
                     {toolLogs.length === 0 && <div className="text-slate-700 italic">System idle.</div>}
                     {toolLogs.map((log, i) => (
                        <div key={i} className={`border-l border-slate-800 pl-2 py-1 hover:bg-white/5 transition-colors group font-mono text-[10px]`}>
                            <div className="flex justify-between opacity-50 mb-0.5 text-slate-400">
                                <span className={`font-bold group-hover:text-white transition-colors ${log.toolName === 'SENTINEL_LOOP' ? 'text-slate-500' : theme.primary}`}>{log.toolName}</span>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className={`font-bold ${log.result.startsWith('ERROR') || log.result.startsWith('ACTION ABORTED') ? 'text-red-500' : log.result.includes('SENTINEL') ? 'text-slate-500' : 'text-green-500'}`}>
                                {log.result.substring(0, 100)}{log.result.length > 100 && '...'}
                            </div>
                        </div>
                     ))}
                     <div ref={logsEndRef} />
                  </div>
              )}

              {rightPanelMode === 'MEMORY' && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-purple-500 font-bold">NEURAL ARCHIVE</span>
                        <button onClick={handleWipeMemory} className="text-rq-red hover:text-white" title="Format Memory">
                            <Trash2 size={14} />
                        </button>
                     </div>
                     {memories.length === 0 && <div className="text-slate-700 italic">Memory banks empty.</div>}
                     {memories.map((mem) => (
                        <div key={mem.id} className="bg-purple-950/10 border border-purple-900 p-3 rounded hover:border-purple-500 transition-all">
                             <div className="flex justify-between items-start mb-1">
                                 <span className="text-purple-400 font-bold">{mem.key}</span>
                                 <span className="text-['8px'] px-1 rounded bg-purple-900 text-purple-200">{mem.category}</span>
                             </div>
                             <div className="text-slate-400 opacity-80">{mem.value}</div>
                        </div>
                     ))}
                  </div>
              )}

              {rightPanelMode === 'CLOUD' && (
                  <NeuralCloud memories={memories} />
              )}
           </div>
        </section>

      </main>
    </div>
  );
}