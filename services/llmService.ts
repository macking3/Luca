
/**
 * LLM Service Abstraction Layer
 * 
 * Provides a unified interface for multiple LLM providers.
 * Currently supports Gemini, with placeholders for OpenAI, Claude, and Ollama.
 * 
 * Usage:
 *   const llm = llmService.getProvider('gemini');
 *   const response = await llm.generate(prompt);
 */

import { FunctionDeclaration } from "@google/genai";
import { HARDCODED_API_KEY } from "./geminiService";

// --- LLM PROVIDER INTERFACE ---
export interface LLMProvider {
    name: string;
    model: string;
    generate(prompt: string, options?: LLMGenerateOptions): Promise<string>;
    stream?(prompt: string, options?: LLMGenerateOptions): AsyncGenerator<string>;
    chat?(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string>;
    supportsFunctions?: boolean;
    supportsStreaming?: boolean;
    maxTokens?: number;
    costPerToken?: { input: number; output: number }; // Cost in USD per 1M tokens
}

export interface LLMGenerateOptions {
    temperature?: number;
    maxTokens?: number;
    functions?: FunctionDeclaration[];
    systemPrompt?: string;
}

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// --- GEMINI PROVIDER (CURRENT) ---
class GeminiProvider implements LLMProvider {
    name = 'gemini';
    model: string;
    private apiKey: string;

    constructor(model: string = 'gemini-pro') {
        this.model = model;
        this.apiKey = HARDCODED_API_KEY;
    }

    supportsFunctions = true;
    supportsStreaming = true;
    maxTokens = 8192;
    costPerToken = { input: 0.5, output: 1.5 }; // Approximate Gemini Pro pricing per 1M tokens

    async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
        try {
            // Use fetch API directly for now (simpler than SDK)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        maxOutputTokens: options?.maxTokens ?? this.maxTokens,
                    },
                    systemInstruction: options?.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error: any) {
            throw new Error(`Gemini generation failed: ${error.message}`);
        }
    }

    async *stream(prompt: string, options?: LLMGenerateOptions): AsyncGenerator<string> {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        maxOutputTokens: options?.maxTokens ?? this.maxTokens,
                    },
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(l => l.trim() && l.startsWith('data: '));

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line.substring(6)); // Remove 'data: ' prefix
                        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) yield text;
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        } catch (error: any) {
            throw new Error(`Gemini streaming failed: ${error.message}`);
        }
    }

    async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
        // Convert messages to Gemini format
        const contents = messages
            .filter(msg => msg.role !== 'system') // System messages go in systemInstruction
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));

        const systemMessage = messages.find(msg => msg.role === 'system');

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        maxOutputTokens: options?.maxTokens ?? this.maxTokens,
                    },
                    systemInstruction: systemMessage?.content || options?.systemPrompt ? 
                        { parts: [{ text: systemMessage?.content || options?.systemPrompt || '' }] } : undefined,
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch (error: any) {
            throw new Error(`Gemini chat failed: ${error.message}`);
        }
    }
}

// --- OPENAI PROVIDER (PLACEHOLDER) ---
class OpenAIProvider implements LLMProvider {
    name = 'openai';
    model: string;
    private apiKey: string;

    constructor(model: string = 'gpt-4o', apiKey?: string) {
        this.model = model;
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    }

    supportsFunctions = true;
    supportsStreaming = true;
    maxTokens = 4096;
    costPerToken = { input: 2.5, output: 10.0 }; // Approximate GPT-4o pricing

    async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
        }

        // TODO: Implement OpenAI API call
        // const response = await fetch('https://api.openai.com/v1/chat/completions', {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${this.apiKey}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         model: this.model,
        //         messages: [{ role: 'user', content: prompt }],
        //         temperature: options?.temperature ?? 0.7,
        //         max_tokens: options?.maxTokens ?? this.maxTokens
        //     })
        // });
        // const data = await response.json();
        // return data.choices[0].message.content;

        throw new Error('OpenAI provider not yet implemented. Coming soon!');
    }

    async *stream(prompt: string, options?: LLMGenerateOptions): AsyncGenerator<string> {
        throw new Error('OpenAI streaming not yet implemented.');
    }

    async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
        throw new Error('OpenAI chat not yet implemented.');
    }
}

// --- CLAUDE PROVIDER (PLACEHOLDER) ---
class ClaudeProvider implements LLMProvider {
    name = 'claude';
    model: string;
    private apiKey: string;

    constructor(model: string = 'claude-3-5-sonnet-20241022', apiKey?: string) {
        this.model = model;
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    }

    supportsFunctions = true;
    supportsStreaming = true;
    maxTokens = 8192;
    costPerToken = { input: 3.0, output: 15.0 }; // Approximate Claude 3.5 Sonnet pricing

    async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
        }

        // TODO: Implement Anthropic API call
        // const response = await fetch('https://api.anthropic.com/v1/messages', {
        //     method: 'POST',
        //     headers: {
        //         'x-api-key': this.apiKey,
        //         'anthropic-version': '2023-06-01',
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         model: this.model,
        //         max_tokens: options?.maxTokens ?? this.maxTokens,
        //         messages: [{ role: 'user', content: prompt }]
        //     })
        // });
        // const data = await response.json();
        // return data.content[0].text;

        throw new Error('Claude provider not yet implemented. Coming soon!');
    }

    async *stream(prompt: string, options?: LLMGenerateOptions): AsyncGenerator<string> {
        throw new Error('Claude streaming not yet implemented.');
    }

    async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
        throw new Error('Claude chat not yet implemented.');
    }
}

// --- OLLAMA PROVIDER (PLACEHOLDER) ---
class OllamaProvider implements LLMProvider {
    name = 'ollama';
    model: string;
    private baseUrl: string;

    constructor(model: string = 'llama3.1', baseUrl?: string) {
        this.model = model;
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    }

    supportsFunctions = false; // Ollama models typically don't support function calling
    supportsStreaming = true;
    maxTokens = 4096;
    costPerToken = { input: 0, output: 0 }; // Free (local)

    async generate(prompt: string, options?: LLMGenerateOptions): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens ?? this.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response || '';
        } catch (error: any) {
            throw new Error(`Ollama generation failed: ${error.message}`);
        }
    }

    async *stream(prompt: string, options?: LLMGenerateOptions): AsyncGenerator<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt,
                    stream: true,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens ?? this.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(l => l.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) yield data.response;
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        } catch (error: any) {
            throw new Error(`Ollama streaming failed: ${error.message}`);
        }
    }

    async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.maxTokens ?? this.maxTokens
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            return data.message?.content || '';
        } catch (error: any) {
            throw new Error(`Ollama chat failed: ${error.message}`);
        }
    }
}

// --- LLM SERVICE MANAGER ---
class LLMService {
    private providers: Map<string, LLMProvider> = new Map();
    private defaultProvider: string = 'gemini';
    private defaultModel: string = 'gemini-pro';

    constructor() {
        // Initialize Gemini (current default)
        this.registerProvider(new GeminiProvider('gemini-pro'));
        
        // Register placeholders (will be implemented when API keys are available)
        // Uncomment when ready:
        // if (process.env.OPENAI_API_KEY) {
        //     this.registerProvider(new OpenAIProvider('gpt-4o'));
        // }
        // if (process.env.ANTHROPIC_API_KEY) {
        //     this.registerProvider(new ClaudeProvider('claude-3-5-sonnet-20241022'));
        // }
        // if (process.env.OLLAMA_BASE_URL) {
        //     this.registerProvider(new OllamaProvider('llama3.1'));
        // }
    }

    registerProvider(provider: LLMProvider) {
        this.providers.set(provider.name, provider);
        console.log(`[LLM_SERVICE] Registered provider: ${provider.name} (${provider.model})`);
    }

    getProvider(name?: string): LLMProvider {
        const providerName = name || this.defaultProvider;
        const provider = this.providers.get(providerName);
        
        if (!provider) {
            console.warn(`[LLM_SERVICE] Provider "${providerName}" not found, falling back to "${this.defaultProvider}"`);
            const fallback = this.providers.get(this.defaultProvider);
            if (fallback) return fallback;
            // Get first available provider as last resort
            const first = this.providers.values().next().value;
            if (!first) throw new Error('No LLM providers available');
            return first;
        }
        
        return provider;
    }

    listProviders(): Array<{ name: string; model: string; available: boolean }> {
        return Array.from(this.providers.values()).map(p => ({
            name: p.name,
            model: p.model,
            available: true // All registered providers are available
        }));
    }

    setDefaultProvider(name: string) {
        if (this.providers.has(name)) {
            this.defaultProvider = name;
            console.log(`[LLM_SERVICE] Default provider set to: ${name}`);
        } else {
            throw new Error(`Provider "${name}" not found`);
        }
    }

    getDefaultProvider(): string {
        return this.defaultProvider;
    }

    // Fallback mechanism: try primary, then fallback to secondary
    async generateWithFallback(
        prompt: string,
        primaryProvider: string = this.defaultProvider,
        fallbackProvider: string = 'gemini',
        options?: LLMGenerateOptions
    ): Promise<{ text: string; provider: string }> {
        try {
            const provider = this.getProvider(primaryProvider);
            const text = await provider.generate(prompt, options);
            return { text, provider: primaryProvider };
        } catch (error: any) {
            console.warn(`[LLM_SERVICE] Primary provider "${primaryProvider}" failed: ${error.message}`);
            console.log(`[LLM_SERVICE] Falling back to "${fallbackProvider}"`);
            
            const fallback = this.getProvider(fallbackProvider);
            const text = await fallback.generate(prompt, options);
            return { text, provider: fallbackProvider };
        }
    }
}

// Export singleton instance
export const llmService = new LLMService();

