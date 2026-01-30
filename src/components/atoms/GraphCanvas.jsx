import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable canvas component for audio visualization
 */
const GraphCanvas = forwardRef(({ className, width = 640, height = 100, ...props }, ref) => {
    return (
        <canvas
            ref={ref}
            width={width}
            height={height}
            className={cn(
                "border border-white/10 border-b-0",
                "bg-gradient-to-t from-white/10 to-transparent",
                "bg-[repeating-linear-gradient(to_top,rgba(255,255,255,0.05),rgba(255,255,255,0.05)_1px,transparent_1px,transparent_10px),linear-gradient(to_top,rgba(255,255,255,0.1),transparent)]",
                className
            )}
            {...props}
        />
    );
});

GraphCanvas.displayName = 'GraphCanvas';

export { GraphCanvas };
