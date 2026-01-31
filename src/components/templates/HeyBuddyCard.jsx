import { useState, useEffect, useRef } from 'react';
import Chat from '@/components/chat/Chat';

/**
 * Main application card layout template
 * Morti (Mortimer) theme
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
    // Settings Props
    reasoningEnabled,
    setReasoningEnabled,
    systemPrompt,
    setSystemPrompt,
    language,
    setLanguage,
    ttsEnabled,
    setTtsEnabled,
    ttsProvider,
    setTtsProvider,
    // Provider Props
    llmProvider,
    setLlmProvider,
    geminiApiKey,
    setGeminiApiKey,
    geminiModel,
    setGeminiModel,
    geminiModelsList,
}) {
    const [inputValue, setInputValue] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

    // Check if system is busy processing
    const isBusy = isTranscribing || isGenerating;
    const statusText = isBusy ? "PROCESSING" : isRecording ? "LISTENING" : "IDLE";
    const statusColor = isBusy ? "text-yellow-500 animate-pulse" : isRecording ? "text-red-500" : "text-zinc-500";

    const LANGUAGES = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
    ];

    // Calculate Status Bubble Props
    let statusBubbleProps = { status: 'idle' };

    if (isTranscriberLoading) {
        statusBubbleProps = { status: 'loading_whisper' };
    } else if (isTranscribing) {
        statusBubbleProps = {
            status: 'transcribing',
            transcript: transcript?.text
        };
    } else if (isRecording) {
        statusBubbleProps = { status: 'recording' };
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black p-4 font-mono text-zinc-300">
            <div className="w-full max-w-3xl overflow-hidden border border-zinc-800 bg-[#0a0a0a] shadow-2xl flex flex-col h-[90vh]">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/50 shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="text-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7L40.12,130.83a8,8,0,0,0,5,13.65l57.6,11.61L88.06,229.43a8,8,0,0,0,13.69,7l114-120.26A8,8,0,0,0,215.79,118.17Z"></path></svg>
                        </div>
                        <h2 className="text-xs font-bold tracking-widest uppercase">Morti (Mortimer) Yout offline assistant</h2>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] uppercase">
                        <div className="flex gap-4 text-zinc-500 hidden sm:flex">
                            <p>STATUS: <span className={statusColor}>{statusText}</span></p>
                            <p>PROVIDER: <span className="text-zinc-300">{llmProvider === 'local' ? 'WEBGPU' : 'GEMINI API'}</span></p>
                        </div>

                        {/* Settings Toggle */}
                        <button
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            className={`hover:text-yellow-500 transition-colors ${isSettingsOpen ? 'text-yellow-500' : 'text-zinc-500'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8h-3.26a88.13,88.13,0,0,1-17.75,42.72l2.31,2.3a8,8,0,0,1-11.32,11.32l-2.3-2.31A88.13,88.13,0,0,1,140.74,208.74V212a8,8,0,0,1-16,0v-3.26a88.13,88.13,0,0,1-42.72-17.75l-2.3,2.31a8,8,0,0,1-11.32-11.32l2.31-2.3A88.13,88.13,0,0,1,53.26,136H50a8,8,0,0,1,0-16h3.26a88.13,88.13,0,0,1,17.75-42.72l-2.31-2.3a8,8,0,0,1,11.32-11.32l2.3,2.31A88.13,88.13,0,0,1,124.74,47.26V44a8,8,0,0,1,16,0v3.26a88.13,88.13,0,0,1,42.72,17.75l2.3-2.31a8,8,0,0,1,11.32-11.32l-2.31,2.3A88.13,88.13,0,0,1,212.74,120H216A8,8,0,0,1,224,128Zm-96,40a40,40,0,1,0-40-40A40,40,0,0,0,128,168Z"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar scroll-smooth"
                >
                    {isSettingsOpen ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">

                            {/* Model Provider Section */}
                            <div className="space-y-4 border-b border-zinc-800 pb-6">
                                <h3 className="text-lg font-bold text-yellow-500 uppercase tracking-widest">Model Engine</h3>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-400 uppercase">Provider</label>
                                    <select
                                        value={llmProvider}
                                        onChange={(e) => setLlmProvider(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-sm focus:border-yellow-500 focus:outline-none transition-colors"
                                    >
                                        <option value="local">Local On-Device (WebGPU)</option>
                                        <option value="gemini">Google Gemini API</option>
                                    </select>
                                </div>

                                {llmProvider === 'gemini' && (
                                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Gemini API Key</label>
                                            <input
                                                type="password"
                                                value={geminiApiKey}
                                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                                placeholder="AIza..."
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-sm focus:border-yellow-500 focus:outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-zinc-400 uppercase">Model</label>
                                            <select
                                                value={geminiModel}
                                                onChange={(e) => setGeminiModel(e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-sm focus:border-yellow-500 focus:outline-none transition-colors"
                                            >
                                                {geminiModelsList && geminiModelsList.length > 0 ? (
                                                    geminiModelsList.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fastest)</option>
                                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Reasoning)</option>
                                                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>


                            <h3 className="text-lg font-bold text-yellow-500 uppercase tracking-widest border-b border-zinc-800 pb-2">System Configuration</h3>

                            {/* Reasoning Toggle */}
                            <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800 rounded-sm">
                                <div>
                                    <h4 className="font-bold text-zinc-200">Reasoning Mode</h4>
                                    <p className="text-xs text-zinc-500 mt-1">Enable specialized thought chain processing/prompting</p>
                                </div>
                                <button
                                    onClick={() => setReasoningEnabled(!reasoningEnabled)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${reasoningEnabled ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-black rounded-full shadow-md transform transition-transform ${reasoningEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>

                            {/* TTS Toggle */}
                            <div className={`flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800 ${ttsEnabled ? 'rounded-t-sm border-b-0' : 'rounded-sm'}`}>
                                <div>
                                    <h4 className="font-bold text-zinc-200">Voice Synthesis (TTS)</h4>
                                    <p className="text-xs text-zinc-500 mt-1">Read responses aloud</p>
                                </div>
                                <button
                                    onClick={() => setTtsEnabled(!ttsEnabled)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${ttsEnabled ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-black rounded-full shadow-md transform transition-transform ${ttsEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </button>
                            </div>

                            {ttsEnabled && (
                                <div className="p-4 bg-zinc-900/30 border-x border-b border-zinc-800 rounded-b-sm animate-in slide-in-from-top-1 fade-in">
                                    <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">Engine</label>
                                    <select
                                        value={ttsProvider}
                                        onChange={(e) => setTtsProvider && setTtsProvider(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-sm focus:border-yellow-500 focus:outline-none transition-colors"
                                    >
                                        <option value="supertonic">Supertonic (Local AI / High Quality)</option>
                                        <option value="browser">Browser Native (System Default)</option>
                                    </select>
                                    {ttsProvider === 'supertonic' && (
                                        <p className="text-[10px] text-zinc-500 mt-2">
                                            Running <strong>M3 (Robert)</strong> voice model locally via WebGPU/WASM.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Language Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Input Language (STT)</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-sm focus:border-yellow-500 focus:outline-none transition-colors"
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name} ({lang.code.toUpperCase()})</option>
                                    ))}
                                </select>
                            </div>

                            {/* System Prompt */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">System Prompt</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    rows="6"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-sm p-3 text-sm font-mono focus:border-yellow-500 focus:outline-none transition-colors leading-relaxed"
                                ></textarea>
                                <p className="text-xs text-zinc-600">The core instructions that define the assistant's persona and constraints.</p>
                            </div>

                        </div>
                    ) : (
                        <Chat messages={chatMessages} isGenerating={isGenerating} statusBubbleProps={statusBubbleProps} />
                    )}
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
                            placeholder={isSettingsOpen ? "Settings mode active..." : (llmProvider === 'gemini' && !geminiApiKey ? "Enter API Key in Settings..." : "Enter prompt...")}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSettingsOpen || (llmProvider === 'gemini' && !geminiApiKey)}
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
                                disabled={!inputValue.trim() || isGenerating || isSettingsOpen || (llmProvider === 'gemini' && !geminiApiKey)}
                                className="flex items-center gap-2 border border-yellow-500 bg-transparent px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7L40.12,130.83a8,8,0,0,0,5,13.65l57.6,11.61L88.06,229.43a8,8,0,0,0,13.69,7l114-120.26A8,8,0,0,0,215.79,118.17Z"></path></svg>
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export { HeyBuddyCard };
