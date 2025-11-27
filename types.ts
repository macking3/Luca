
export enum Sender {
  USER = 'ADMIN',
  LUCA = 'LUCA',
  SYSTEM = 'SYSTEM'
}

export enum SystemStatus {
  NORMAL = 'NORMAL',
  CAUTION = 'CAUTION',
  CRITICAL = 'CRITICAL'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isTyping?: boolean;
  groundingMetadata?: any; // Stores search citations
  attachment?: string; // Base64 image string (User uploaded)
  generatedImage?: string; // Base64 image string (AI generated)
  _wasPruned?: boolean;
}

export interface UserProfile {
    name: string;
    customInstructions: string;
    voiceName: string; // 'Puck', 'Kore', etc.
}

// ... (Keep existing device enums) ...
export enum DeviceType {
  LIGHT = 'LIGHT',
  LOCK = 'LOCK',
  SERVER = 'SERVER',
  ROBOTIC_ARM = 'ROBOTIC_ARM',
  CAMERA = 'CAMERA',
  MOBILE = 'MOBILE',
  SMART_TV = 'SMART_TV',
  WIRELESS_NODE = 'WIRELESS_NODE',
  BLUETOOTH_PERIPHERAL = 'BLUETOOTH_PERIPHERAL'
}

export interface SmartDevice {
  id: string;
  name: string;
  type: DeviceType;
  isOn: boolean;
  status: 'online' | 'offline' | 'error';
  location: string;
}

export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  max: number;
}

export interface ToolExecutionLog {
  toolName: string;
  args: Record<string, any>;
  result: string;
  timestamp: number;
}

export interface TacticalMarker {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type: 'TARGET' | 'ALLY' | 'UNKNOWN';
  status: 'LOCKED' | 'TRACKING' | 'LOST';
}

export interface MemoryNode {
  id: string;
  key: string;
  value: string;
  category: 'PREFERENCE' | 'FACT' | 'PROTOCOL' | 'SECURITY' | 'USER_STATE' | 'SESSION_STATE' | 'AGENT_STATE';
  timestamp: number;
  confidence: number;
}

// --- GRAPH TYPES (GRAPHITI IMPLEMENTATION) ---

export interface GraphNode {
  id: string;
  label: string;
  type: 'ENTITY' | 'CONCEPT' | 'EVENT';
  color?: string;
  // Simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  // Metadata
  created?: number;
  lastSeen?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
  created: number;
  expired?: number; // If set, this is a historical/inactive edge
}

export interface GraphData {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}

// --- POLYMARKET TYPES ---

export interface PolyMarket {
    id: string;
    question: string;
    slug: string;
    outcomes: string[]; // ["Yes", "No"]
    outcomePrices: string[]; // ["0.65", "0.35"]
    volume: number;
    endDate: string;
    icon: string;
}

export interface PolyPosition {
    id: string;
    marketId: string;
    question: string;
    outcome: string; // "Yes" or "No"
    shares: number;
    avgPrice: number;
    currentPrice: number;
    pnl: number;
}

// --- CRYPTO TYPES ---

export interface CryptoAsset {
    symbol: string;
    name: string;
    amount: number;
    currentPrice: number;
    pnl: number; // Percentage
}

export interface CryptoWallet {
    address: string;
    chain: 'ETH' | 'SOL' | 'BTC';
    privateKey: string; // Simulated
    assets: CryptoAsset[];
    totalValueUsd: number;
}

export interface TradeLog {
    id: string;
    type: 'BUY' | 'SELL';
    token: string;
    amount: number;
    price: number;
    timestamp: number;
    hash: string;
}

// --- FOREX TYPES ---

export interface ForexPosition {
    id: string;
    pair: string;
    type: 'LONG' | 'SHORT';
    lots: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number; // In Base Currency
}

export interface ForexAccount {
    accountId: string;
    baseCurrency: string;
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    leverage: number;
    positions: ForexPosition[];
}

export interface ForexTradeLog {
    id: string;
    type: 'BUY' | 'SELL';
    pair: string;
    lots: number;
    price: number;
    timestamp: number;
    ticket: string;
}

// --- MANAGEMENT TYPES ---

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  deadline?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  type: 'MEETING' | 'DEADLINE' | 'MAINTENANCE' | 'BLOCKER';
}

// --- OSINT TYPES ---

export interface OsintHit {
    platform: string;
    url: string;
    category: 'SOCIAL' | 'DARK_WEB' | 'DOMAIN' | 'GOV';
    confidence: number;
}

export interface OsintProfile {
    target: string;
    riskScore: number; // 0-100
    hits: OsintHit[];
    status: 'SCANNING' | 'COMPLETE';
    meta: Record<string, string>; // Key values like "IP", "Email", etc.
}

// --- CODE & NETWORK TYPES ---

export interface CodeVulnerability {
    line: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type: string;
    description: string;
}

export interface CodeAuditReport {
    fileName: string;
    language: string;
    vulnerabilities: CodeVulnerability[];
    score: number; // 0-100 security score
}

export interface NetworkNode {
    id: string;
    label: string;
    type: 'SERVER' | 'ROUTER' | 'IOT' | 'MOBILE' | 'DB';
    ip: string;
    status: 'ONLINE' | 'OFFLINE' | 'COMPROMISED';
}

export interface NetworkLink {
    source: string;
    target: string;
    protocol: string;
}

// --- SKILL TYPES ---

export interface CustomSkill {
    name: string;
    description: string;
    script: string; // The code to execute (Python/Node)
    language: 'python' | 'node';
    inputs: string[]; // Argument names
    created: number;
}

// --- SUBSYSTEM ORCHESTRATION TYPES (CONCEPT 2) ---
export interface Subsystem {
    id: string;
    name: string;
    pid: number | null;
    port: number | null;
    status: 'RUNNING' | 'STOPPED' | 'STOPPING' | 'ERROR';
    startTime: number;
    cpu: number;
    mem: number;
    logCount: number;
}

export interface SubsystemLog {
    timestamp: number;
    type: 'stdout' | 'stderr' | 'error';
    data: string;
}

// --- GHOST BROWSER TYPES (CONCEPT 3) ---
export interface WebviewInstance {
    id: string;
    url: string;
    title: string;
    subsystemId?: string; // Link to subsystem if spawned from one
    createdAt: number;
}

// --- LLM PROVIDER TYPES (PHASE 2) ---
export interface LLMProviderInfo {
    name: string;
    model: string;
    available: boolean;
    supportsFunctions?: boolean;
    supportsStreaming?: boolean;
    costPerToken?: { input: number; output: number };
    note?: string;
}
