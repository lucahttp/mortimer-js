import { useRef, useEffect } from 'react';

/**
 * Audio player component for recorded audio playback
 */
function AudioPlayer({ src, onEnded }) {
    const audioRef = useRef(null);

    useEffect(() => {
        // Revoke previous blob URL when src changes
        return () => {
            if (src && src.startsWith('blob:')) {
                URL.revokeObjectURL(src);
            }
        };
    }, [src]);

    if (!src) {
        return (
            <div className="flex items-center justify-center h-full text-sm opacity-60">
                No recording yet
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full">
            <audio
                ref={audioRef}
                controls
                src={src}
                onEnded={onEnded}
                className="max-w-full"
            />
        </div>
    );
}

export { AudioPlayer };
