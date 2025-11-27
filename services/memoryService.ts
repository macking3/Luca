
import { MemoryNode, GraphData } from '../types';
import { GoogleGenAI } from "@google/genai";

// API Key sourced from env
const API_KEY = process.env.API_KEY || '';

const MEMORY_STORAGE_KEY = 'LUCA_NEURAL_ARCHIVE_V1';
const CORE_URL = 'http://localhost:3001/api/memory';

// Initialize AI for Embeddings
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const memoryService = {
  
  /**
   * Try to load memories from the Local Core (File System)
   */
  async syncWithCore(): Promise<MemoryNode[]> {
      try {
        const res = await fetch(`${CORE_URL}/load`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
            const serverMemories = await res.json();
            if (Array.isArray(serverMemories)) {
                localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(serverMemories));
                return serverMemories;
            }
        }
      } catch (e) {
          console.log("Core Memory Sync Failed. Using Local Cache.");
      }
      return this.getAllMemories();
  },

  /**
   * Retrieve all stored memories (Sync from LocalStorage).
   */
  getAllMemories(): MemoryNode[] {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetch Graph Data for Visualization (Project Synapse V2)
   */
  async getGraphData(): Promise<GraphData | null> {
      try {
          const res = await fetch(`${CORE_URL}/graph/visualize`, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
              return await res.json();
          }
      } catch (e) {
          console.warn("Graph Fetch Failed (Core Offline?)");
      }
      return null;
  },

  /**
   * Generate Embedding Vector for text using Gemini 2.5 Flash or embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
      try {
          const result = await ai.models.embedContent({
              model: "text-embedding-004",
              contents: [{ parts: [{ text }] }]
          });
          return result.embeddings?.[0]?.values || [];
      } catch (e) {
          console.error("Embedding Generation Failed:", e);
          return []; // Fallback
      }
  },

  /**
   * Save a new fact or preference (Now with Vector Support).
   */
  async saveMemory(key: string, value: string, category: MemoryNode['category'] = 'FACT'): Promise<MemoryNode> {
    const memories = this.getAllMemories();
    
    // 1. Generate Embedding
    const contentToEmbed = `${key}: ${value}`;
    const vector = await this.generateEmbedding(contentToEmbed);

    const newNode: MemoryNode = {
      id: crypto.randomUUID(),
      key,
      value,
      category,
      timestamp: Date.now(),
      confidence: 0.99
    };

    // Update existing or add new
    const existingIndex = memories.findIndex(m => m.key.toLowerCase() === key.toLowerCase());
    if (existingIndex >= 0) memories[existingIndex] = newNode;
    else memories.push(newNode);

    // 2. Save to Browser
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));

    // 3. Save to Disk (Background Sync)
    fetch(`${CORE_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memories)
    }).catch(() => {});

    // 4. Save Vector to Core (Level 4 Upgrade)
    if (vector.length > 0) {
        fetch(`${CORE_URL}/vector-save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: newNode.id,
                content: contentToEmbed,
                embedding: vector,
                metadata: { category }
            })
        }).catch(e => console.warn("Vector Save Failed", e));
    }

    return newNode;
  },

  /**
   * Search memories using Vector Similarity (Semantic Search)
   */
  async retrieveMemory(query: string): Promise<MemoryNode[]> {
    // 1. Try Vector Search first (Level 4)
    try {
        const vector = await this.generateEmbedding(query);
        if (vector.length > 0) {
            const res = await fetch(`${CORE_URL}/vector-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embedding: vector, limit: 5 })
            });
            
            if (res.ok) {
                const vectorResults = await res.json();
                if (vectorResults.length > 0) {
                    // Map vector results back to full memory nodes if possible, or return as is
                    return vectorResults.map((v: any) => ({
                        id: v.id,
                        key: v.content.split(':')[0],
                        value: v.content.substring(v.content.indexOf(':') + 1).trim(),
                        category: v.metadata?.category || 'FACT',
                        timestamp: Date.now(),
                        confidence: v.similarity
                    }));
                }
            }
        }
    } catch (e) {
        console.warn("Vector search failed, falling back to keyword match.");
    }

    // 2. Fallback to Keyword Match (Level 3)
    const memories = this.getAllMemories();
    const lowerQuery = query.toLowerCase();
    return memories.filter(m => 
      m.key.toLowerCase().includes(lowerQuery) || 
      m.value.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Format memories as a context string for the LLM.
   * UPDATED: Token Safeguard Applied - Truncates large memory values.
   */
  getMemoryContext(): string {
    const memories = this.getAllMemories();
    if (memories.length === 0) return "Memory Core Empty.";
    
    // Mem0 Logic: Separate into distinct state layers
    const userState = memories.filter(m => m.category === 'USER_STATE' || m.category === 'PREFERENCE');
    const sessionState = memories.filter(m => m.category === 'SESSION_STATE');
    const agentState = memories.filter(m => m.category === 'AGENT_STATE');
    const facts = memories.filter(m => !['USER_STATE', 'PREFERENCE', 'SESSION_STATE', 'AGENT_STATE'].includes(m.category));

    // HELPER: Truncate huge memories to prevent 429 Quota errors
    const formatMem = (m: MemoryNode) => {
        let val = m.value;
        if (val.length > 300) val = val.substring(0, 300) + "...[TRUNCATED]";
        return `- ${m.key}: ${val}`;
    };

    let context = "=== MEM0 MEMORY LAYER ===\n";
    if (userState.length) context += "[USER STATE]:\n" + userState.map(formatMem).join('\n') + "\n\n";
    if (sessionState.length) context += "[SESSION CONTEXT]:\n" + sessionState.map(formatMem).join('\n') + "\n\n";
    if (agentState.length) context += "[AGENT EVOLUTION]:\n" + agentState.map(formatMem).join('\n') + "\n\n";
    
    // Strictly limit facts to the last 15 to prevent overflow, and truncate heavily
    if (facts.length) context += "[SEMANTIC KNOWLEDGE (Recent 15)]:\n" + facts.slice(-15).map(m => `[${m.category}] ${m.key}: ${m.value.substring(0, 200)}...`).join('\n');

    return context;
  },

  /**
   * Wipe memory (Factory Reset).
   */
  wipeMemory() {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    fetch(`${CORE_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([])
    }).catch(() => {});
  }
};
