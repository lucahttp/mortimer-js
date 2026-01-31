import { useState, useRef, useEffect } from 'react';

/**
 * Bubble to show transient states like recording, transcribing, loading.
 * Styles are designed to be "8-bit" or retro futuristic where requested.
 */
export function ChatStatusBubble({ status, transcript, audioUrl }) {
    if (status === 'idle') return null;

    // 8-bit Loader (CSS Pixelated Spinner)
    const PixelLoader = () => (
        <div className="flex gap-2 items-center text-yellow-500 font-mono text-xs uppercase tracking-widest">
            <div className="w-4 h-4 relative animate-spin [image-rendering:pixelated]">
                <div className="absolute inset-0 border-2 border-t-yellow-500 border-r-transparent border-b-yellow-500 border-l-transparent" />
            </div>
            <span>Processing</span>
        </div>
    );

    // Audio Wave Animation (CSS Bars)
    const AudioWave = () => (
        <div className="flex items-center gap-1 h-6">
            <span className="w-1 bg-red-500 h-2 animate-[wave_0.5s_ease-in-out_infinite]" />
            <span className="w-1 bg-red-500 h-4 animate-[wave_0.7s_ease-in-out_infinite]" />
            <span className="w-1 bg-red-500 h-6 animate-[wave_0.4s_ease-in-out_infinite]" />
            <span className="w-1 bg-red-500 h-3 animate-[wave_0.6s_ease-in-out_infinite]" />
            <span className="w-1 bg-red-500 h-5 animate-[wave_0.8s_ease-in-out_infinite]" />
        </div>
    );

    // Audio Player (Simple Play/Pause with visualization)
    const AudioPlayer = ({ url }) => {
        const [playing, setPlaying] = useState(false);
        const audioRef = useRef(null);

        const togglePlay = () => {
            if (audioRef.current) {
                if (playing) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play();
                }
                setPlaying(!playing);
            }
        };

        useEffect(() => {
            if (audioRef.current) {
                audioRef.current.onended = () => setPlaying(false);
            }
        }, []);

        return (
            <div className="flex items-center gap-3 bg-zinc-800 rounded-lg p-2 pr-4 border border-zinc-700">
                <audio ref={audioRef} src={url} className="hidden" />
                <button
                    onClick={togglePlay}
                    className="w-8 h-8 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded-full text-zinc-200 transition-colors"
                >
                    {playing ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                        <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>
                {playing ? <AudioWave /> : <div className="h-6 w-16 bg-zinc-900/50 rounded flex items-center justify-center text-[10px] text-zinc-600 font-mono">WAVE</div>}
            </div>
        );
    };

    const containerClass = "flex justify-end animate-in fade-in slide-in-from-bottom-2";
    const bubbleClass = "bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] border border-zinc-700 shadow-lg";

    switch (status) {
        case 'wake_word_detected':
            return (
                <div className={containerClass}>
                    <div className={bubbleClass}>
                        <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs">
                            <div className="w-2 h-2 bg-yellow-400 animate-ping rounded-full"></div>
                            SESSION INITIALIZED
                        </div>
                    </div>
                </div>
            );
        case 'recording':
            return (
                <div className={containerClass}>
                    <div className={bubbleClass}>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-red-400 uppercase tracking-widest animate-pulse">Recording</span>
                            <AudioWave />
                        </div>
                    </div>
                </div>
            );
        case 'audio_available':
            return (
                <div className={containerClass}>
                    <div className={bubbleClass}>
                        <div className="space-y-2">
                            <div className="text-[10px] text-zinc-500 font-mono uppercase">Audio Input Captured</div>
                            <AudioPlayer url={audioUrl} />
                        </div>
                    </div>
                </div>
            );
        case 'loading_whisper':
            return (
                <div className={containerClass}>
                    <div className={bubbleClass}>
                        <PixelLoader />
                        <span className="text-[10px] block mt-1 text-zinc-500">Loading Transcriber...</span>
                    </div>
                </div>
            );
        case 'transcribing':
            return (
                <div className={containerClass}>
                    <div className={bubbleClass}>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono text-zinc-400 animate-pulse">Transcribing...</span>
                            {transcript && <p className="text-sm text-zinc-300 italic">"{transcript}..."</p>}
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
}
