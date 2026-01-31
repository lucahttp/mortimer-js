import { useState, useEffect, useRef } from 'react';
import Chat from '@/components/chat/Chat';

/**
 * Main application card layout template
 * Reasoning Core 2.0 theme
 */
function HeyBuddyCard({
    wakeWordCanvasRef,
    speechCanvasRef,
    frameBudgetCanvasRef,
    wakeWords,
    colors,
    isRecording,
    recordingUrl,
    isTranscribing,
    isTranscriberLoading,
    transcript,
    transcriptionProgress,
    isGenerating,
    isLLMLoading,
    llmResponse,
    llmProgress,
    llmLoadingStatus,
    chatMessages = [],
    sendMessage,
}) {
    const [inputValue, setInputValue] = useState("");
    const chatContainerRef = useRef(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages, isGenerating]); // Scroll on new messages or generation updates

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue("");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Calculate aggregated loading state
    const isLoading = isTranscriberLoading || isLLMLoading;
    const loadingText = isTranscriberLoading ? "Initializing Whisper Logic..." : isLLMLoading ? (llmLoadingStatus || "Loading Reasoning Core...") : "Systems Online";
    const loadingProgress = isTranscriberLoading
        ? (transcriptionProgress?.reduce((acc, item) => acc + (item.progress || 0), 0) / (transcriptionProgress?.length || 1))
        : isLLMLoading
            ? (llmProgress?.reduce((acc, item) => acc + (item.progress || 0), 0) / (llmProgress?.length || 1))
            : 100;

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black p-4 font-mono text-zinc-300">
            <div className="w-full max-w-3xl overflow-hidden border border-zinc-800 bg-[#0a0a0a] shadow-2xl flex flex-col h-[90vh]">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/50 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="text-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7L40.12,130.83a8,8,0,0,0,5,13.65l57.6,11.61L88.06,229.43a8,8,0,0,0,13.69,7l114-120.26A8,8,0,0,0,215.79,118.17Z"></path></svg>
                        </div>
                        <h2 className="text-xs font-bold tracking-widest uppercase">Reasoning Core 2.0</h2>
                    </div>
                    <div className="flex gap-4 text-[10px] text-zinc-500 uppercase">
                        <p>STATUS: <span className={isLoading ? "text-yellow-500 animate-pulse" : "text-zinc-300"}>{isLoading ? "INITIALIZING" : "ACTIVE"}</span></p>
                        <p>MODEL: <span className="text-zinc-300">QWEN2.5-3B</span></p>
                        <p>MODE: <span className="text-zinc-300">REASONING</span></p>
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar scroll-smooth"
                >
                    <Chat messages={chatMessages} isGenerating={isGenerating} />
                </div>

                {/* Footer Controls */}
                <div className="border-t border-zinc-800 bg-black p-6 shrink-0">

                    {/* Status / Graphics Bar */}
                    <div className="mb-6 flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                        <div className="flex items-center gap-4">
                            {/* Live Audio Graphic - We use the canvas here for real data */}
                            <div className="flex items-center gap-1 h-8 w-32 relative overflow-hidden">
                                {isRecording ? (
                                    <canvas
                                        ref={speechCanvasRef}
                                        width={128}
                                        height={32}
                                        className="w-full h-full opacity-80"
                                    />
                                ) : (
                                    <div className="flex items-end gap-1 h-4 ml-2">
                                        <div className="w-1 bg-zinc-800 h-1"></div>
                                        <div className="w-1 bg-zinc-800 h-1"></div>
                                        <div className="w-1 bg-zinc-800 h-1"></div>
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase">
                                RTF: <span className="text-yellow-500 font-bold">{llmResponse?.tps ? (1000 / llmResponse.tps).toFixed(3) + "x" : "0.000x"}</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase">
                            Tok/sec: <span className="text-zinc-200">{llmResponse?.tps ? llmResponse.tps.toFixed(2) : "0.0"}</span>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="relative group">
                        <textarea
                            rows="2"
                            className="w-full resize-none border-b border-zinc-700 bg-transparent py-2 text-zinc-100 placeholder-zinc-600 focus:border-yellow-500 focus:outline-none transition-all font-mono text-sm"
                            placeholder="Enter prompt for reasoning..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        ></textarea>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-4 text-zinc-500">
                                <button className="hover:text-yellow-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z"></path></svg>
                                </button>
                                <button className="hover:text-yellow-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M128,176a48,48,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48,48,0,0,0,128,176ZM200,128a8,8,0,0,1-16,0,56,56,0,0,0-112,0,8,8,0,0,1-16,0,72,72,0,0,1,64-71.6V40h-16a8,8,0,0,1,0-16h48a8,8,0,0,1,0,16h-16v16.4A72,72,0,0,1,200,128Z"></path></svg>
                                </button>
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isGenerating}
                                className="flex items-center gap-2 border border-yellow-500 bg-transparent px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7L40.12,130.83a8,8,0,0,0,5,13.65l57.6,11.61L88.06,229.43a8,8,0,0,0,13.69,7l114-120.26A8,8,0,0,0,215.79,118.17Z"></path></svg>
                                Generate Reasoning
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { HeyBuddyCard };
