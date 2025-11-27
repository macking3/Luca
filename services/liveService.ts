
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { FULL_TOOL_SET, PERSONA_CONFIG, PersonaType, HARDCODED_API_KEY } from './geminiService';
import { memoryService } from './memoryService';
import { taskService } from './taskService';
import { Message } from '../types'; // Import Message type

interface LiveConfig {
  onToolCall: (name: string, args: any) => Promise<any>;
  onAudioData: (amplitude: number) => void;
  onTranscript: (text: string, type: 'user' | 'model') => void;
  onVadChange?: (isActive: boolean) => void;
  onError?: (error: Error) => void;
  persona?: PersonaType;
  history?: Message[]; // NEW: Accept chat history for context
  platform?: string;
}

// OPTIMIZED PROMPT FOR SPEED AND BREVITY
const VOICE_OPTIMIZATION_PROMPT = `
**VOICE MODE PROTOCOL (LATENCY: CRITICAL)**:
1. **CONCISENESS IS LAW**: Speak in extremely short, punchy sentences. Target < 10 words per sentence.
2. **NO FILLER**: NEVER say "Let me check that," "Processing," "One moment," or "I can do that." Just execute the action silently.
3. **MULTI-INTENT**: If the user gives multiple commands (e.g., "Turn on lights and search for news"), execute ALL tools sequentially in one turn.
4. **DIRECTNESS**: Do not repeat the user's request. Answer immediately.
5. **SHARPNESS**: Be crisp. Cut the fluff.
`;

class LucaLiveService {
  private ai: GoogleGenAI;
  private activeSession: any = null; 
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private stream: MediaStream | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private isConnected = false;

  // --- VISUALIZER & LOCAL BARGE-IN SETTINGS ---
  private noiseFloor = 0.005; 
  private readonly NOISE_ALPHA = 0.05;
  // Increased sensitivity for faster barge-in
  private readonly SNR_THRESHOLD = 1.2; 
  // Lower absolute threshold for responsiveness
  private readonly ABSOLUTE_THRESHOLD = 0.003; 
  private isSpeakingLocal = false;

  constructor() {
    const apiKey = process.env.API_KEY || HARDCODED_API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(config: LiveConfig) {
    if (this.isConnected) return;

    const memoryContext = memoryService.getMemoryContext();
    const managementContext = taskService.getManagementContext();

    // GET PERSONA CONFIG
    const persona = config.persona || 'RUTHLESS';
    const personaConfig = PERSONA_CONFIG[persona] || PERSONA_CONFIG.RUTHLESS;
    
    // --- CONTEXT INJECTION (HISTORY) ---
    let historyContext = "";
    if (config.history && config.history.length > 0) {
        // Take last 10 messages to provide immediate context without overloading token limit
        const recent = config.history.slice(-10);
        historyContext = "\n\n**IMMEDIATE CONVERSATION CONTEXT (DO NOT IGNORE):**\n" + 
            recent.map(m => {
                // Strip large base64 attachments from context to save bandwidth
                const content = m.text ? m.text : (m.attachment ? "[User uploaded an image]" : "[Empty]");
                return `${m.sender}: ${content}`;
            }).join('\n');
    }

    // Resolve the instruction function and Append Voice Optimizations AND History
    const platform = config.platform || 'Unknown Host';
    const baseInstruction = personaConfig.instruction(memoryContext, managementContext, platform);
    const systemInstruction = baseInstruction + historyContext + "\n\n" + VOICE_OPTIMIZATION_PROMPT;

    // Create contexts with specific sample rates to ensure compatibility
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    try {
      // REMOVED 'sampleRate: 16000' constraint from getUserMedia.
      // This prevents "ConstraintNotSatisfiedError" on hardware that only supports 44.1k/48k.
      // The AudioContext (init at 16k) will handle the resampling automatically.
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
      });
      
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log(`LUCA Voice Uplink Established [Persona: ${persona}]`);
            this.isConnected = true;
            this.setupInputStream(config, sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
            this.handleServerMessage(msg, config, sessionPromise);
          },
          onclose: () => {
            console.log('LUCA Voice Uplink Closed');
            this.disconnect();
          },
          onerror: (err) => {
            console.error('LUCA Voice Error', err);
            this.disconnect();
            if (config.onError) config.onError(new Error("Session Error: " + (err.message || "Unknown")));
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          // USE FULL TOOL SET FOR VOICE (Voice mode doesn't support dynamic loading easily yet)
          tools: [{ functionDeclarations: FULL_TOOL_SET }],
          speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: personaConfig.voiceName } }
          }
        }
      });

      this.activeSession = sessionPromise;

    } catch (e) {
      console.error("Failed to initialize voice session", e);
      this.disconnect();
      if (config.onError) {
          // Forward the actual error message for debugging
          config.onError(e instanceof Error ? e : new Error("Microphone Access Denied or Hardware Incompatible"));
      }
    }
  }

  /**
   * Send a video frame to the live session for multimodal analysis.
   * @param base64Image Raw base64 string (without data:image/jpeg;base64 prefix)
   */
  sendVideoFrame(base64Image: string) {
      if (!this.isConnected || !this.activeSession) return;
      
      this.activeSession.then((session: any) => {
          session.sendRealtimeInput({ 
              media: { 
                  mimeType: 'image/jpeg', 
                  data: base64Image 
              } 
          });
      });
  }

  private setupInputStream(config: LiveConfig, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    
    // High-Pass Filter (Cut rumble < 80Hz) to improve VAD accuracy
    const rumbleFilter = this.inputAudioContext.createBiquadFilter();
    rumbleFilter.type = 'highpass';
    rumbleFilter.frequency.value = 80;
    rumbleFilter.Q.value = 0.5;

    // ULTRA-LOW LATENCY BUFFER: 512 samples (~32ms at 16kHz)
    // This significantly improves barge-in responsiveness.
    this.inputNode = this.inputAudioContext.createScriptProcessor(512, 1, 1);
    
    source.connect(rumbleFilter);
    rumbleFilter.connect(this.inputNode);
    this.inputNode.connect(this.inputAudioContext.destination); 

    this.inputNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const rms = this.calculateRMS(inputData);
        config.onAudioData(rms); 

        // --- 1. CONTINUOUS STREAMING (Server-Side VAD) ---
        // We always send audio. This allows the model to hear interruptions instantly.
        const pcmBlob = this.createBlob(inputData);
        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));

        // --- 2. LOCAL BARGE-IN LOGIC (For UI & Playback Cutoff) ---
        // Dynamic noise floor adaptation
        if (rms < this.noiseFloor * 1.5) {
            this.noiseFloor = (this.noiseFloor * 0.95) + (rms * 0.05);
        } else {
            this.noiseFloor = (this.noiseFloor * 0.995) + (rms * 0.005);
        }

        const isSignal = rms > this.ABSOLUTE_THRESHOLD && rms > (this.noiseFloor * this.SNR_THRESHOLD);

        if (isSignal) {
            if (!this.isSpeakingLocal) {
                this.isSpeakingLocal = true;
                config.onVadChange?.(true);
                // CRITICAL: Hard-cut audio immediately when user speaks
                this.interrupt(); 
            }
        } else {
            if (this.isSpeakingLocal) {
                 // Debounce slightly
                 setTimeout(() => {
                     if (this.isConnected) config.onVadChange?.(false);
                 }, 250);
                 this.isSpeakingLocal = false;
            }
        }
    };
  }

  private async handleServerMessage(msg: LiveServerMessage, config: LiveConfig, sessionPromise: Promise<any>) {
    // Handle Audio Output
    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      this.playAudio(audioData, config.onAudioData);
    }

    // Handle Model Transcripts
    if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
       config.onTranscript(msg.serverContent.modelTurn.parts[0].text, 'model');
    }

    // Handle User Transcripts (If available via input transcription)
    // @ts-ignore - Types might be incomplete in some SDK versions
    if (msg.serverContent?.turnComplete && msg.serverContent?.turnComplete === true) {
        // Sometimes the final user transcript is sent here if configured.
        // For now, if we rely on client-side VAD, we can just use the final tool call as the "intent".
    }
    
    // Capture user input transcription if provided in the stream
    // @ts-ignore - Check for input transcription structure
    const userText = msg.serverContent?.inputAudioTranscription?.text || msg.clientContent?.turns?.[0]?.parts?.[0]?.text;
    if (userText) {
        config.onTranscript(userText, 'user');
    }

    // Handle Interruption Signal from Server (Backup to local VAD)
    if (msg.serverContent?.interrupted) {
        this.interrupt();
    }

    // Handle Tool Calls
    if (msg.toolCall) {
      const functionCalls = msg.toolCall.functionCalls;
      if (functionCalls.length > 0) {
        console.log(`[VOICE AGENT] Processing ${functionCalls.length} tool calls in parallel...`);
        
        // PARALLEL EXECUTION (Promise.all)
        // This enables the agent to "turn on lights" AND "search web" simultaneously
        const responses = await Promise.all(functionCalls.map(async (fc) => {
            console.log(`[VOICE AGENT] Executing: ${fc.name}`);
            config.onTranscript(`[EXECUTING] ${fc.name}...`, 'model');
            
            try {
                const result = await config.onToolCall(fc.name, fc.args);
                
                // Optimize output size for voice latency
                let optimizedResult = result;
                if (typeof result === 'string' && result.length > 500) {
                    optimizedResult = result.substring(0, 500) + "... [TRUNCATED]";
                } else if (typeof result === 'object') {
                    optimizedResult = JSON.stringify(result).substring(0, 500);
                }

                return {
                    id: fc.id,
                    name: fc.name,
                    response: { result: optimizedResult }
                };
            } catch (e) {
                console.error(`Tool Error (${fc.name})`, e);
                return {
                    id: fc.id,
                    name: fc.name,
                    response: { error: "Execution Failed" }
                };
            }
        }));

        // Send all responses back to the model in one go
        sessionPromise.then(session => session.sendToolResponse({
            functionResponses: responses
        }));
      }
    }
  }

  disconnect() {
    this.isConnected = false;
    this.isSpeakingLocal = false;
    this.activeSession = null;
    this.interrupt(); // Clear audio queue
    
    if (this.inputNode) {
        this.inputNode.disconnect();
        this.inputNode = null;
    }
    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
    }
    this.nextStartTime = 0;
    this.noiseFloor = 0.005; // Reset noise floor
  }

  private interrupt() {
      // Immediate audio cutoff
      if (this.sources.size > 0) {
          // console.log(">> INTERRUPTING AUDIO OUTPUT");
          this.sources.forEach(source => {
              try { source.stop(); } catch (e) {}
          });
          this.sources.clear();
          // Reset timing cursor to current time to avoid silence gap on next utterance
          if (this.outputAudioContext) {
            this.nextStartTime = this.outputAudioContext.currentTime;
          }
      }
  }

  private calculateRMS(data: Float32Array): number {
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
          sum += data[i] * data[i];
      }
      return Math.sqrt(sum / data.length);
  }

  private async playAudio(base64Data: string, onAmplitude: (amp: number) => void) {
    if (!this.outputAudioContext || !this.outputNode) return;

    // If audio context time has advanced past our next start time (e.g. long pause), reset cursor
    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);

    const audioBuffer = await this.decodeAudioData(
        this.decodeBase64(base64Data),
        this.outputAudioContext
    );

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);

    source.onended = () => {
        this.sources.delete(source);
    };

    // Visualizer simulation for output
    const duration = audioBuffer.duration * 1000;
    const steps = 10;
    const interval = duration / steps;
    let i = 0;
    const anim = setInterval(() => {
        i++;
        if(i > steps) clearInterval(anim);
        // Only animate if this source is still playing (wasn't interrupted)
        if (this.sources.has(source)) {
            onAmplitude(0.2 + Math.random() * 0.3);
        }
    }, interval);
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }
}

export const liveService = new LucaLiveService();
