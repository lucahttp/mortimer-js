
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage Supertonic On-Device TTS
 * Loads models and generates speech via Web Worker
 */
export function useSupertonicTTS({ enabled = true, language = 'en' } = {}) {
    const workerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!enabled) return;

        // Initialize Audio Context (must be resumed on user interaction usually)
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Initialize Worker
        if (!workerRef.current) {
            setIsLoading(true);
            workerRef.current = new Worker(
                new URL('../workers/supertonic.worker.js', import.meta.url),
                { type: 'module' }
            );

            workerRef.current.onmessage = (e) => {
                const { type, data, error: errMsg } = e.data;

                if (type === 'loaded') {
                    setIsLoaded(true);
                    setIsLoading(false);
                    console.log("[Supertonic] Models Loaded");
                }
                else if (type === 'success') {
                    playAudio(data.audio, data.sampleRate);
                }
                else if (type === 'error') {
                    console.error("[Supertonic] Worker Error:", errMsg);
                    setError(errMsg);
                    setIsSpeaking(false);
                }
            };

            // Trigger load
            workerRef.current.postMessage({ type: 'load' });
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }
        };
    }, [enabled]);

    const playAudio = async (float32Array, sampleRate) => {
        if (!audioCtxRef.current) return;

        try {
            if (audioCtxRef.current.state === 'suspended') {
                await audioCtxRef.current.resume();
            }

            const buffer = audioCtxRef.current.createBuffer(1, float32Array.length, sampleRate);
            buffer.getChannelData(0).set(float32Array);

            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);

            source.onended = () => {
                setIsSpeaking(false);
            };

            source.start(0);
            setIsSpeaking(true);
        } catch (e) {
            console.error("[Supertonic] Playback Error:", e);
            setError(e.message);
            setIsSpeaking(false);
        }
    };

    const speak = useCallback((text, voiceId = 'M3') => {
        if (!enabled || !workerRef.current || !isLoaded) {
            console.warn("[Supertonic] TTS not ready or disabled");
            return;
        }

        // Clean text (remove <think> tags if any passed, though usually handled upstream)
        const cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        if (!cleanText) return;

        setIsSpeaking(true);
        workerRef.current.postMessage({
            type: 'generate',
            data: { text: cleanText, voiceId }
        });
    }, [enabled, isLoaded]);

    const stop = useCallback(() => {
        if (workerRef.current) {
            // Worker doesn't support 'stop' natively yet, but we can stop playback
            if (audioCtxRef.current) {
                audioCtxRef.current.suspend();
                setIsSpeaking(false);
                // Reset context?
                audioCtxRef.current.close().then(() => {
                    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
                });
            }
        }
    }, []);

    return {
        speak,
        stop,
        isLoaded,
        isLoading,
        isSpeaking,
        error
    };
}
