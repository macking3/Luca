
import { FunctionDeclaration } from "@google/genai";

export type ToolCategory = 'CORE' | 'FILES' | 'NETWORK' | 'MOBILE' | 'HACKING' | 'CRYPTO' | 'OSINT' | 'WHATSAPP' | 'MEDIA' | 'SYSTEM' | 'DEV' | 'OFFICE';

export interface ToolEntry {
    category: ToolCategory;
    tool: FunctionDeclaration;
    keywords: string[];
}

const registry: ToolEntry[] = [];

export const ToolRegistry = {
    register: (tool: FunctionDeclaration, category: ToolCategory, keywords: string[] = []) => {
        // Prevent duplicate registration
        const existing = registry.findIndex(t => t.tool.name === tool.name);
        if (existing >= 0) {
            // Update existing
            registry[existing] = { tool, category, keywords };
        } else {
            const descWords = tool.description?.toLowerCase().split(' ') || [];
            const nameWords = tool.name.toLowerCase().split(/(?=[A-Z])/);
            const allKeywords = [...new Set([...keywords, ...descWords, ...nameWords, category.toLowerCase()])];
            registry.push({ tool, category, keywords: allKeywords });
        }
    },

    search: (query: string): FunctionDeclaration[] => {
        const q = query.toLowerCase();
        if (q === 'all' || q === 'everything') return registry.map(e => e.tool);
        
        const queryTerms = q.split(/\s+/);

        return registry.filter(entry => {
            // 1. Direct Category Match
            const catMatch = entry.category.toLowerCase().includes(q);
            
            // 2. Keyword Match (Any term in query matches any keyword in entry)
            const keywordMatch = queryTerms.some(term => 
                entry.keywords.some(k => k.includes(term) || term.includes(k))
            );
            
            return catMatch || keywordMatch;
        }).map(e => e.tool);
    },

    getCore: (): FunctionDeclaration[] => {
        return registry.filter(e => e.category === 'CORE').map(e => e.tool);
    },

    getAll: (): FunctionDeclaration[] => {
        return registry.map(e => e.tool);
    }
};
