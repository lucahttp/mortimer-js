import { useRef, useEffect } from 'react';
import { GraphCanvas } from '@/components/atoms/GraphCanvas';
import { WakeWordLegend } from '@/components/atoms/WakeWordLegend';

/**
 * Graph with label and optional legend for displaying metrics
 */
function MetricGraph({
    label,
    canvasRef,
    wakeWords = null,
    colors = null,
    width = 640,
    height = 100,
    className = ''
}) {
    return (
        <div className={`relative ${className}`}>
            <GraphCanvas ref={canvasRef} width={width} height={height} />
            <label className="absolute right-0 top-0 max-w-[120px] uppercase font-mono text-right px-1 leading-5 bg-gradient-to-t from-white/10 to-transparent border border-white/10 border-t-0 border-r-0">
                {label}
                {wakeWords && colors && (
                    <WakeWordLegend wakeWords={wakeWords} colors={colors} />
                )}
            </label>
        </div>
    );
}

export { MetricGraph };
