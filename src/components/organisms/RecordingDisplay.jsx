import { AudioPlayer } from '@/components/molecules/AudioPlayer';

/**
 * Recording status and audio playback display
 */
function RecordingDisplay({ isRecording, recordingUrl }) {
    return (
        <section className="mt-4 relative block h-[100px] leading-[100px] text-center text-[11px] bg-gradient-to-t from-white/10 to-transparent border border-white/10 rounded-b-[10px]">
            <label className="absolute right-0 top-0 max-w-[120px] uppercase font-mono text-xs text-right px-1 leading-5 bg-gradient-to-t from-white/10 to-transparent border border-white/10 border-t-0 border-r-0">
                Recording
            </label>
            <div className="flex items-center justify-center h-full">
                {isRecording ? (
                    <span className="animate-pulse text-cyan-400">Recording…</span>
                ) : (
                    <AudioPlayer src={recordingUrl} />
                )}
            </div>
        </section>
    );
}

export { RecordingDisplay };
