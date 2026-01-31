import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHeyBuddy } from '@/hooks/useHeyBuddy';
import { useTranscriber } from '@/hooks/useTranscriber';
import { useLLM } from '@/hooks/useLLM';
import { useMultiLineVisualization, useAudioVisualization } from '@/hooks/useAudioVisualization';
import { HeyBuddyCard } from '@/components/templates/HeyBuddyCard';
import { PermissionPrompt } from '@/components/molecules/PermissionPrompt';
import './App.css';

// Configuration
const ROOT_URL = "https://huggingface.co/benjamin-paine/hey-buddy/resolve/main";
const WAKE_WORDS = ["buddy", "hey buddy", "hi buddy", "sup buddy", "yo buddy", "okay buddy", "hello buddy"];
const COLORS = {
  "buddy": [0, 119, 187],
  "hey buddy": [0, 153, 136],
  "hi buddy": [51, 227, 138],
  "sup buddy": [238, 119, 51],
  "yo buddy": [204, 51, 217],
  "okay buddy": [238, 51, 119],
  "hello buddy": [184, 62, 104],
  "speech": [22, 200, 206],
  "frame budget": [25, 255, 25],
};

const heyBuddyOptions = {
  debug: true,
  modelPath: WAKE_WORDS.map((word) => `${ROOT_URL}/models/${word.replace(' ', '-')}.onnx`),
  vadModelPath: `${ROOT_URL}/pretrained/silero-vad.onnx`,
  spectrogramModelPath: `${ROOT_URL}/pretrained/mel-spectrogram.onnx`,
  embeddingModelPath: `${ROOT_URL}/pretrained/speech-embedding.onnx`,
};

function App() {
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);

  // Transcription hook
  const {
    transcript,
    isTranscribing,
    isModelLoading: isTranscriberLoading,
    progress: transcriptionProgress,
    transcribe,
    clear: clearTranscript,
  } = useTranscriber();

  // LLM hook - now with chat support
  const {
    messages: chatMessages,
    lastResponse,
    isGenerating,
    isModelLoading: isLLMLoading,
    progress: llmProgress,
    loadingStatus: llmLoadingStatus,
    tps,
    numTokens,
    sendMessage,
    reset: resetChat,
  } = useLLM();

  // Handle recording complete - start transcription
  const handleRecordingComplete = useCallback((audioSamples) => {
    console.log('Recording complete, starting transcription...', audioSamples.length, 'samples');
    clearTranscript();
    transcribe(audioSamples);
  }, [transcribe, clearTranscript]);

  // Hey Buddy hook - must be called before effects that use pause/resume
  const {
    isInitialized,
    isRecording,
    isSpeaking,
    speechProbability,
    wakeWords,
    recording,
    frameTimeEma,
    permissionStatus,
    start,
    stop,
    pause,
    resume,
    requestMicrophonePermission,
  } = useHeyBuddy(heyBuddyOptions, handleRecordingComplete);

  // Pause listening when transcription or generation starts
  useEffect(() => {
    if (isTranscribing || isGenerating) {
      console.log('Pausing wake word detection during processing');
      pause();
    }
  }, [isTranscribing, isGenerating, pause]);

  // When transcription completes, send message to LLM
  useEffect(() => {
    if (transcript?.text && !transcript.isBusy && !isGenerating) {
      console.log('Transcription complete, sending to LLM:', transcript.text);
      sendMessage(transcript.text);
      // Clear transcript to prevent re-sending it in a loop
      clearTranscript();
    }
  }, [transcript, isGenerating, sendMessage, clearTranscript]);

  // Resume listening when LLM response is complete
  useEffect(() => {
    if (!isGenerating && lastResponse && lastResponse.length > 0) {
      // Check if we just finished (not starting a new one)
      const lastUserMsg = chatMessages.filter(m => m.role === 'user').at(-1);
      const lastAssistantMsg = chatMessages.filter(m => m.role === 'assistant').at(-1);
      if (lastAssistantMsg && lastAssistantMsg.content.length > 0) {
        console.log('LLM response complete, resuming listening');
        resume();
      }
    }
  }, [isGenerating, lastResponse, chatMessages, resume]);

  // Canvas refs
  const wakeWordCanvasRef = useRef(null);
  const speechCanvasRef = useRef(null);
  const frameBudgetCanvasRef = useRef(null);

  // Visualization hooks
  const wakeWordColors = useMemo(() => {
    const colors = {};
    for (const word of WAKE_WORDS) {
      colors[word] = COLORS[word];
    }
    return colors;
  }, []);

  const { pushValue: pushWakeWordValue, draw: drawWakeWords } = useMultiLineVisualization(
    wakeWordCanvasRef,
    wakeWordColors
  );

  const { pushValue: pushSpeechValue, draw: drawSpeech } = useAudioVisualization(
    speechCanvasRef,
    { color: COLORS.speech }
  );

  const { pushValue: pushFrameBudgetValue, draw: drawFrameBudget } = useAudioVisualization(
    frameBudgetCanvasRef,
    { color: COLORS["frame budget"], normalize: true, normalizeMax: 120 }
  );

  // Handle permission request
  const handleAllowMicrophone = useCallback(async () => {
    const granted = await requestMicrophonePermission();
    if (granted) {
      setShowPermissionPrompt(false);
      await start();
    }
  }, [requestMicrophonePermission, start]);

  // Build active states for wake word visualization
  const activeStates = useMemo(() => {
    const states = {};
    for (const word of WAKE_WORDS) {
      const key = word.replace(' ', '-');
      states[word] = wakeWords[key]?.active || false;
    }
    return states;
  }, [wakeWords]);

  // Update visualizations when data changes
  useEffect(() => {
    if (!isInitialized) return;

    // Push wake word values
    for (const word of WAKE_WORDS) {
      const key = word.replace(' ', '-');
      const probability = wakeWords[key]?.probability || 0;
      pushWakeWordValue(word, probability);
    }

    // Push speech and frame budget
    pushSpeechValue(speechProbability);
    pushFrameBudgetValue(frameTimeEma);
  }, [
    isInitialized,
    wakeWords,
    speechProbability,
    frameTimeEma,
    pushWakeWordValue,
    pushSpeechValue,
    pushFrameBudgetValue,
  ]);

  // Animation loop
  useEffect(() => {
    let animationId;

    const draw = () => {
      drawWakeWords(activeStates);
      drawSpeech(isSpeaking ? 1.0 : 0.5);
      drawFrameBudget(1.0);
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [drawWakeWords, drawSpeech, drawFrameBudget, activeStates, isSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Build LLM response object for UI
  const llmResponse = lastResponse ? {
    text: lastResponse,
    tps,
    numTokens,
    complete: !isGenerating,
  } : null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white p-4">
      <PermissionPrompt
        open={showPermissionPrompt && !isInitialized}
        onAllow={handleAllowMicrophone}
        permissionStatus={permissionStatus}
      />
      <HeyBuddyCard
        wakeWordCanvasRef={wakeWordCanvasRef}
        speechCanvasRef={speechCanvasRef}
        frameBudgetCanvasRef={frameBudgetCanvasRef}
        wakeWords={WAKE_WORDS}
        colors={COLORS}
        isRecording={isRecording}
        recordingUrl={recording}
        isTranscribing={isTranscribing}
        isTranscriberLoading={isTranscriberLoading}
        transcript={transcript}
        transcriptionProgress={transcriptionProgress}
        isGenerating={isGenerating}
        isLLMLoading={isLLMLoading}
        llmResponse={llmResponse}
        llmProgress={llmProgress}
        llmLoadingStatus={llmLoadingStatus}
        chatMessages={chatMessages}
        sendMessage={sendMessage}
      />
    </div>
  );
}

export default App;
