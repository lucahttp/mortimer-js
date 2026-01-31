import { useState, useEffect, useRef, useCallback } from 'react';
import { SupertonicTTS } from '../services/SupertonicTTS';

/**
 * React hook for Supertonic TTS
 * Uses the same ONNX pattern as HeyBuddy - global window.ort from CDN
 */
export function useSupertonicTTS(enabled = true) {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(null);

    const ttsRef = useRef(null);
    const audioCtxRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        // Initialize Audio Context
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Initialize TTS engine
        if (!ttsRef.current) {
            console.log("[useSupertonicTTS] Creating SupertonicTTS instance...");

            ttsRef.current = new SupertonicTTS({
                debug: true,
                basePath: '/supertonic',
            });

            // Set up callbacks
            ttsRef.current.onProgress(({ message, percent }) => {
                console.log(`[useSupertonicTTS] Progress: ${message} (${percent}%)`);
                setProgress({ message, percent });
            });

            ttsRef.current.onReady(() => {
                console.log("[useSupertonicTTS] TTS Ready!");
                setIsLoading(false);
                setIsLoaded(true);
                setError(null);
            });

            ttsRef.current.onError((err) => {
                console.error("[useSupertonicTTS] TTS Error:", err);
                setError(err);
                setIsLoading(false);
            });

            // Start initialization
            setIsLoading(true);
            ttsRef.current.initialize().catch((err) => {
                console.error("[useSupertonicTTS] Initialize failed:", err);
                setError(err.message);
                setIsLoading(false);
            });
        }

        return () => {
            // Cleanup
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                // Don't close immediately, might be used by other components
            }
        };
    }, [enabled]);

    const speak = useCallback(async (text) => {
        if (!ttsRef.current) {
            console.warn("[useSupertonicTTS] TTS not initialized");
            return;
        }

        if (!isLoaded) {
            console.warn("[useSupertonicTTS] TTS not ready");
            return;
        }

        try {
            console.log("[useSupertonicTTS] Generating speech...");
            const { audio, sampleRate } = await ttsRef.current.generate(text);

            // Play audio
            if (audioCtxRef.current && audio && audio.length > 0) {
                // Resume audio context if suspended
                if (audioCtxRef.current.state === 'suspended') {
                    await audioCtxRef.current.resume();
                }

                const audioBuffer = audioCtxRef.current.createBuffer(1, audio.length, sampleRate);
                audioBuffer.getChannelData(0).set(audio);

                const source = audioCtxRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtxRef.current.destination);
                source.start();

                console.log("[useSupertonicTTS] Playing audio...");
            }
        } catch (err) {
            console.error("[useSupertonicTTS] Speak error:", err);
            setError(err.message);
        }
    }, [isLoaded]);

    return {
        speak,
        isLoading,
        isLoaded,
        error,
        progress,
    };
}

export default useSupertonicTTS;
