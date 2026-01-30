import { cn } from '@/lib/utils';

/**
 * Color-coded legend item for wake word visualization
 */
function WakeWordLegend({ wakeWords, colors }) {
    return (
        <div className="flex flex-wrap justify-end gap-x-1.5 gap-y-0.5 font-mono text-[10px] uppercase leading-[11px]">
            {wakeWords.map((word) => {
                const [r, g, b] = colors[word] || [255, 255, 255];
                return (
                    <div
                        key={word}
                        style={{ color: `rgb(${r},${g},${b})` }}
                    >
                        {word}
                    </div>
                );
            })}
        </div>
    );
}

export { WakeWordLegend };
