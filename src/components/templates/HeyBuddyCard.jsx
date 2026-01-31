import { Card, CardContent } from '@/components/ui/card';
import { GraphContainer } from '@/components/organisms/GraphContainer';
import { RecordingDisplay } from '@/components/organisms/RecordingDisplay';
import logo from '@/assets/logo.png';

/**
 * Main application card layout template
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
}) {
    return (
        <Card className="max-w-[640px] mx-auto p-4 border-gray-600 rounded-2xl bg-[#101623] text-white">
            <CardContent className="p-0">
                {/* Logo Section */}
                <section className="flex justify-center">
                    <img src={logo} alt="Hey Buddy!" className="w-full max-w-[420px]" />
                </section>

                {/* Headline Section */}
                <section className="text-[15px]">
                    <p className="mb-2.5 mt-1">
                        <strong className="text-cyan-400"><em>Hey Buddy!</em></strong> is a library for training wake word models (a.k.a audio keyword spotters) and deploying them to the browser for real-time use on CPU or GPU.
                    </p>
                    <p className="mb-2.5 mt-1">
                        Using a wake-word as a gating mechanism for voice-enabled web applications carries numerous benefits, including reduced power consumption, improved privacy, and enhanced performance in noisy environments over speech-to-text systems.
                    </p>
                    <p className="mb-0 mt-1">
                        This space serves as a demonstration of the JavaScript library for front-end applications. Say something like, <em className="text-cyan-400">"Hey buddy, what is 2 + 2?"</em> to see the wake word, transcription, and AI response in action.
                    </p>
                </section>

                {/* Links Section */}
                <section className="flex flex-wrap justify-center gap-4 my-4">
                    <a href="https://github.com/painebenjamin/hey-buddy" target="_blank" rel="noopener noreferrer">
                        <img src="https://img.shields.io/static/v1?label=painebenjamin&message=hey-buddy&logo=github&color=0b1830" alt="painebenjamin - hey-buddy" className="h-5" />
                    </a>
                    <a href="https://huggingface.co/benjamin-paine/hey-buddy" target="_blank" rel="noopener noreferrer">
                        <img src="https://img.shields.io/static/v1?label=benjamin-paine&message=hey-buddy&logo=huggingface&color=0b1830" alt="benjamin-paine - hey-buddy" className="h-5" />
                    </a>
                </section>

                {/* Graphs Section */}
                <section>
                    <GraphContainer
                        wakeWordCanvasRef={wakeWordCanvasRef}
                        speechCanvasRef={speechCanvasRef}
                        frameBudgetCanvasRef={frameBudgetCanvasRef}
                        wakeWords={wakeWords}
                        colors={colors}
                    />
                </section>

                {/* Recording Section */}
                <RecordingDisplay
                    isRecording={isRecording}
                    recordingUrl={recordingUrl}
                    isTranscribing={isTranscribing}
                    isModelLoading={isTranscriberLoading}
                    transcript={transcript}
                    progress={transcriptionProgress}
                    isGenerating={isGenerating}
                    isLLMLoading={isLLMLoading}
                    llmResponse={llmResponse}
                    llmProgress={llmProgress}
                    llmLoadingStatus={llmLoadingStatus}
                />
            </CardContent>
        </Card>
    );
}

export { HeyBuddyCard };
