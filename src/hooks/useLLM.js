import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for LLM chat with Qwen3 WebGPU
 * Supports streaming responses and chat history
 */
export function useLLM() {
    // Chat messages history
    const [messages, setMessages] = useState([]);

    // Current streaming state
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isModelReady, setIsModelReady] = useState(false);
    const [progress, setProgress] = useState([]);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError] = useState(null);
    const [tps, setTps] = useState(null);
    const [numTokens, setNumTokens] = useState(null);

    const workerRef = useRef(null);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/llm.worker.js', import.meta.url),
            { type: 'module' }
        );

        // Check WebGPU support
        workerRef.current.postMessage({ type: 'check' });

        workerRef.current.onmessage = (event) => {
            const message = event.data;

            switch (message.status) {
                case 'loading':
                    setIsModelLoading(true);
                    setLoadingStatus(message.data);
                    break;

                case 'initiate':
                    setProgress((prev) => [...prev, message]);
                    break;

                case 'progress':
                    setProgress((prev) =>
                        prev.map((item) =>
                            item.file === message.file
                                ? { ...item, progress: message.progress }
                                : item
                        )
                    );
                    break;

                case 'done':
                    setProgress((prev) =>
                        prev.filter((item) => item.file !== message.file)
                    );
                    break;

                case 'ready':
                    setIsModelLoading(false);
                    setIsModelReady(true);
                    setLoadingStatus('');
                    break;

                case 'start':
                    // Add empty assistant message for streaming
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: '' },
                    ]);
                    setIsGenerating(true);
                    break;

                case 'update':
                    // Stream update - append to last message
                    setTps(message.tps);
                    setNumTokens(message.numTokens);
                    setMessages((prev) => {
                        const cloned = [...prev];
                        const last = cloned.at(-1);
                        cloned[cloned.length - 1] = {
                            ...last,
                            content: last.content + message.output,
                        };
                        return cloned;
                    });
                    break;

                case 'complete':
                    setTps(message.tps);
                    setNumTokens(message.numTokens);
                    setIsGenerating(false);
                    break;

                case 'error':
                    setError(message.data?.message || 'Unknown error');
                    setIsGenerating(false);
                    break;
            }
        };

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    /**
     * Load the model (optional - will auto-load on first generate)
     */
    const loadModel = useCallback(() => {
        if (!workerRef.current || isModelReady) return;
        workerRef.current.postMessage({ type: 'load' });
    }, [isModelReady]);

    /**
     * Send a user message and generate response
     */
    const sendMessage = useCallback((content) => {
        if (!workerRef.current || isGenerating) return;

        // Add user message
        const userMessage = { role: 'user', content };
        setMessages((prev) => {
            const updatedMessages = [...prev, userMessage];

            // Send to worker with updated context
            workerRef.current.postMessage({
                type: 'generate',
                data: {
                    messages: [
                        { role: 'system', content: 'You are a helpful voice assistant. Keep responses concise and conversational.' },
                        ...updatedMessages.filter(m => m.content.length > 0),
                    ],
                },
            });

            return updatedMessages;
        });

        setError(null);
        setTps(null);
    }, [isGenerating]);

    /**
     * Interrupt current generation
     */
    const interrupt = useCallback(() => {
        if (!workerRef.current) return;
        workerRef.current.postMessage({ type: 'interrupt' });
    }, []);

    /**
     * Reset chat history
     */
    const reset = useCallback(() => {
        if (!workerRef.current) return;
        workerRef.current.postMessage({ type: 'reset' });
        setMessages([]);
        setTps(null);
        setNumTokens(null);
        setError(null);
    }, []);

    /**
     * Get the last assistant response
     */
    const lastResponse = messages.filter(m => m.role === 'assistant').at(-1)?.content || null;

    return {
        messages,
        lastResponse,
        isGenerating,
        isModelLoading,
        isModelReady,
        progress,
        loadingStatus,
        error,
        tps,
        numTokens,
        loadModel,
        sendMessage,
        interrupt,
        reset,
    };
}
