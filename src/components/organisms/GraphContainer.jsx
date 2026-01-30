import { MetricGraph } from '@/components/molecules/MetricGraph';

/**
 * Container for all three visualization graphs
 */
function GraphContainer({
    wakeWordCanvasRef,
    speechCanvasRef,
    frameBudgetCanvasRef,
    wakeWords,
    colors,
    width = 640,
    height = 100,
}) {
    return (
        <div className="flex flex-col items-center gap-4">
            <MetricGraph
                label="wake words"
                canvasRef={wakeWordCanvasRef}
                wakeWords={wakeWords}
                colors={colors}
                width={width}
                height={height}
            />
            <MetricGraph
                label="speech"
                canvasRef={speechCanvasRef}
                width={width}
                height={height}
            />
            <MetricGraph
                label="frame budget"
                canvasRef={frameBudgetCanvasRef}
                width={width}
                height={height}
            />
        </div>
    );
}

export { GraphContainer };
