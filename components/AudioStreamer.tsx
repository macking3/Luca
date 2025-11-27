
import React, { useEffect, useRef } from 'react';

interface AudioStreamerProps {
  onSpeechDetected?: (isSpeaking: boolean) => void;
  onAudioData: (audioChunk: Float32Array) => void;
  isStreamingActive: boolean;
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({ onSpeechDetected, onAudioData, isStreamingActive }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Voice Activity Detection (VAD) State
  const isSpeakingRef = useRef(false);
  const noiseFloorRef = useRef(0.005); // Initial estimated noise floor
  const silenceCounterRef = useRef(0);

  useEffect(() => {
    if (isStreamingActive) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isStreamingActive]);

  const startStream = async () => {
    try {
      // 1. Request Microphone Access
      // Explicitly ask for 16kHz to match Gemini requirements and reduce processing overhead
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      streamRef.current = stream;

      // 2. Initialize Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      // Ensure context is running (browsers sometimes suspend it)
      if (ctx.state === 'suspended') {
          await ctx.resume();
      }

      // 3. Create Media Source
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 4. Create ScriptProcessor
      // Buffer Size 512 = ~32ms latency at 16kHz. Critical for responsiveness.
      const processor = ctx.createScriptProcessor(512, 1, 1);
      processorRef.current = processor;

      // 5. Connect Nodes
      source.connect(processor);
      processor.connect(ctx.destination);

      // 6. Audio Processing Loop
      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        
        // Create a copy of the data to send out (avoid detached buffer issues)
        const outputData = new Float32Array(inputBuffer);
        onAudioData(outputData);

        // Run VAD Logic if handler provided
        if (onSpeechDetected) {
            processVad(inputBuffer);
        }
      };

    } catch (err) {
      console.error("[AudioStreamer] Access Denied or Error:", err);
      stopStream();
    }
  };

  const processVad = (data: Float32Array) => {
      // Calculate RMS (Root Mean Square) - Energy of the chunk
      let sum = 0;
      for(let i=0; i<data.length; i++) {
          sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);

      // Adaptive Noise Floor Logic
      const alpha = 0.05;
      if (rms < 0.02) { 
         noiseFloorRef.current = (noiseFloorRef.current * (1 - alpha)) + (rms * alpha);
      }

      // VAD Thresholds
      const THRESHOLD_MULTIPLIER = 1.5; 
      const ABSOLUTE_THRESHOLD = 0.01; // Minimum volume to be considered speech

      const threshold = Math.max(ABSOLUTE_THRESHOLD, noiseFloorRef.current * THRESHOLD_MULTIPLIER);
      const isSignal = rms > threshold;

      if (isSignal) {
          silenceCounterRef.current = 0;
          if (!isSpeakingRef.current) {
              isSpeakingRef.current = true;
              onSpeechDetected && onSpeechDetected(true);
          }
      } else {
          silenceCounterRef.current++;
          // Debounce silence (~200ms delay before cutting off)
          if (silenceCounterRef.current > 6 && isSpeakingRef.current) {
              isSpeakingRef.current = false;
              onSpeechDetected && onSpeechDetected(false);
          }
      }
  };

  const stopStream = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    // Reset VAD
    isSpeakingRef.current = false;
    noiseFloorRef.current = 0.005;
  };

  return null;
};

export default AudioStreamer;
