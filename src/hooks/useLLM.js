import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for LLM text generation with Qwen3 WebGPU
 */
export function useLLM() {
    const [response, setResponse] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [isModelReady, setIsModelReady] = useState(false);
    const [progress, setProgress] = useState([]);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError] = useState(null);

    const workerRef = useRef(null);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker(
            new URL('../workers/llm.worker.js', import.meta.url),
            { type: 'module' }
        );

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
                    setIsGenerating(true);
                    setResponse({ text: '', tps: 0, numTokens: 0 });
                    break;

                case 'update':
                    setResponse({
                        text: message.output,
                        tps: message.tps,
                        numTokens: message.numTokens,
                    });
                    break;

                case 'complete':
                    setResponse({
                        text: message.output,
                        tps: message.tps,
                        numTokens: message.numTokens,
                        complete: true,
                    });
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
     * Generate a response for a given prompt
     */
    const generate = useCallback((prompt) => {
        if (!workerRef.current) return;

        setResponse(null);
        setError(null);
        setIsGenerating(true);

        workerRef.current.postMessage({
            type: 'generate',
            data: { prompt },
        });
    }, []);

    /**
     * Interrupt current generation
     */
    const interrupt = useCallback(() => {
        if (!workerRef.current) return;
        workerRef.current.postMessage({ type: 'interrupt' });
    }, []);

    /**
     * Clear the current response
     */
    const clear = useCallback(() => {
        setResponse(null);
        setError(null);
    }, []);

    return {
        response,
        isGenerating,
        isModelLoading,
        isModelReady,
        progress,
        loadingStatus,
        error,
        loadModel,
        generate,
        interrupt,
        clear,
    };
}
