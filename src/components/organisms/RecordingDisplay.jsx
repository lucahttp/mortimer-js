import { AudioPlayer } from '@/components/molecules/AudioPlayer';

/**
 * Recording status, transcription, and LLM response display
 */
function RecordingDisplay({
    isRecording,
    recordingUrl,
    isTranscribing,
    isModelLoading,
    transcript,
    progress,
    isGenerating,
    isLLMLoading,
    llmResponse,
    llmProgress,
    llmLoadingStatus,
}) {
    // Calculate overall download progress
    const downloadProgress = progress?.length > 0
        ? progress.reduce((acc, item) => acc + (item.progress || 0), 0) / progress.length
        : null;

    const llmDownloadProgress = llmProgress?.length > 0
        ? llmProgress.reduce((acc, item) => acc + (item.progress || 0), 0) / llmProgress.length
        : null;

    return (
        <section className="mt-4 relative block min-h-[100px] text-center text-[11px] bg-gradient-to-t from-white/10 to-transparent border border-white/10 rounded-b-[10px]">
            <label className="absolute right-0 top-0 max-w-[140px] uppercase font-mono text-xs text-right px-1 leading-5 bg-gradient-to-t from-white/10 to-transparent border border-white/10 border-t-0 border-r-0">
                Voice Assistant
            </label>

            <div className="flex flex-col items-center justify-center p-4 gap-3">
                {/* Recording/Playback Section */}
                <div className="h-[50px] flex items-center justify-center w-full">
                    {isRecording ? (
                        <span className="animate-pulse text-cyan-400">🎙️ Recording…</span>
                    ) : (
                        <AudioPlayer src={recordingUrl} />
                    )}
                </div>

                {/* Transcription Section */}
                {(isTranscribing || isModelLoading || transcript) && (
                    <div className="w-full border-t border-white/10 pt-3">
                        {isModelLoading && downloadProgress !== null && (
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-cyan-400 text-xs">Loading Whisper model...</span>
                                <div className="w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-400 transition-all duration-300"
                                        style={{ width: `${downloadProgress}%` }}
                                    />
                                </div>
                                <span className="text-white/60 text-[10px]">{Math.round(downloadProgress)}%</span>
                            </div>
                        )}

                        {isTranscribing && !isModelLoading && (
                            <div className="flex items-center justify-center gap-2">
                                <span className="animate-pulse text-cyan-400">Transcribing...</span>
                                {transcript?.tps && (
                                    <span className="text-white/60 text-[10px]">
                                        {transcript.tps.toFixed(1)} tokens/s
                                    </span>
                                )}
                            </div>
                        )}

                        {transcript?.text && !isTranscribing && (
                            <div className="text-left text-sm leading-relaxed text-white/90">
                                <span className="text-cyan-400/60 text-xs uppercase block mb-1">You said:</span>
                                "{transcript.text}"
                            </div>
                        )}
                    </div>
                )}

                {/* LLM Response Section */}
                {(isGenerating || isLLMLoading || llmResponse) && (
                    <div className="w-full border-t border-white/10 pt-3">
                        {isLLMLoading && llmDownloadProgress !== null && (
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-emerald-400 text-xs">{llmLoadingStatus || 'Loading Qwen3 model...'}</span>
                                <div className="w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-400 transition-all duration-300"
                                        style={{ width: `${llmDownloadProgress}%` }}
                                    />
                                </div>
                                <span className="text-white/60 text-[10px]">{Math.round(llmDownloadProgress)}%</span>
                            </div>
                        )}

                        {isGenerating && !isLLMLoading && (
                            <div className="text-left">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-emerald-400/60 text-xs uppercase">AI Response:</span>
                                    <span className="text-white/60 text-[10px]">
                                        {llmResponse?.numTokens || 0} tokens • {(llmResponse?.tps || 0).toFixed(1)} t/s
                                    </span>
                                </div>
                                <div className="text-sm leading-relaxed text-white/90">
                                    {llmResponse?.text || <span className="animate-pulse">Thinking...</span>}
                                </div>
                            </div>
                        )}

                        {llmResponse?.complete && (
                            <div className="text-left">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-emerald-400/60 text-xs uppercase">AI Response:</span>
                                    <span className="text-white/60 text-[10px]">
                                        {llmResponse.numTokens} tokens • {(llmResponse.tps || 0).toFixed(1)} t/s
                                    </span>
                                </div>
                                <div className="text-sm leading-relaxed text-white/90">
                                    {llmResponse.text}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export { RecordingDisplay };
