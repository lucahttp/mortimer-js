import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHeyBuddy } from '@/hooks/useHeyBuddy';
import { useTranscriber } from '@/hooks/useTranscriber';
import { useLLM } from '@/hooks/useLLM';
import { useTTS } from '@/hooks/useTTS';
import { useMultiLineVisualization, useAudioVisualization } from '@/hooks/useAudioVisualization';
import { HeyBuddyCard } from '@/components/templates/HeyBuddyCard';
import { PermissionPrompt } from '@/components/molecules/PermissionPrompt';
import { GoogleGenerativeAI } from "@google/generative-ai";
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

  // Settings State - Persistent
  const [reasoningEnabled, setReasoningEnabled] = useState(() => {
    const saved = localStorage.getItem('heybuddy_reasoningEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem('heybuddy_systemPrompt') || "You are 'Mortimer', an intelligent and helpful voice assistant running directly in the browser. You are concise, friendly, and conversational. You support real-time reasoning and voice interaction.";
  });

  const [language, setLanguage] = useState(() => localStorage.getItem('heybuddy_language') || "en");

  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = localStorage.getItem('heybuddy_ttsEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // LLM Provider State - Persistent
  const [llmProvider, setLlmProvider] = useState(() => localStorage.getItem('heybuddy_llmProvider') || 'local');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('heybuddy_geminiApiKey') || '');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('heybuddy_geminiModel') || 'gemini-1.5-flash');

  const [geminiModelsList, setGeminiModelsList] = useState([]);

  // Persistence Effects
  useEffect(() => localStorage.setItem('heybuddy_reasoningEnabled', JSON.stringify(reasoningEnabled)), [reasoningEnabled]);
  useEffect(() => localStorage.setItem('heybuddy_systemPrompt', systemPrompt), [systemPrompt]);
  useEffect(() => localStorage.setItem('heybuddy_language', language), [language]);
  useEffect(() => localStorage.setItem('heybuddy_ttsEnabled', JSON.stringify(ttsEnabled)), [ttsEnabled]);
  useEffect(() => localStorage.setItem('heybuddy_llmProvider', llmProvider), [llmProvider]);
  useEffect(() => localStorage.setItem('heybuddy_geminiApiKey', geminiApiKey), [geminiApiKey]);
  useEffect(() => localStorage.setItem('heybuddy_geminiModel', geminiModel), [geminiModel]);

  // Fetch Gemini Models
  useEffect(() => {
    async function fetchModels() {
      if (!geminiApiKey || geminiApiKey.length < 30) return; // Basic length check
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        // Note: client-side listing might require a proxy or specific CORS headers, 
        // but the SDK handles fetch. let's try.
        // Actually, currently the JS SDK might not support listModels directly in the client 
        // without using the REST endpoint manually or if it's node-only.
        // Wait, GoogleGenerativeAI SDK for web usually encapsulates generation. 
        // Model listing might be administrative.
        // Let's check if `getGenerativeModel` is the only way.
        // Documentation says `listModels` exists in `GoogleGenerativeAI` on the server/node SDK.
        // For web sdk?
        // "The Google AI JavaScript SDK does not currently support listing models."
        // Ah. If that's the case, I should revert to a static list or try a fetch to the REST endpoint.
        // Endpoint: https://generativelanguage.googleapis.com/v1beta/models?key=API_KEY

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const data = await response.json();
        if (data.models) {
          const validModels = data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace("models/", ""));
          setGeminiModelsList(validModels);
        }
      } catch (e) {
        console.error("Failed to list models", e);
      }
    }

    // Debounce slightly
    const timer = setTimeout(fetchModels, 1000);
    return () => clearTimeout(timer);
  }, [geminiApiKey]);

  // TTS Hook
  const { speak, cancel: cancelTTS, isSpeaking: isTTSSpeaking } = useTTS();

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
  } = useLLM({
    provider: llmProvider,
    apiKey: geminiApiKey,
    model: geminiModel,
    systemPrompt,
    reasoningEnabled
  });

  // Handle recording complete - start transcription
  const handleRecordingComplete = useCallback((audioSamples) => {
    console.log('Recording complete, starting transcription...', audioSamples.length, 'samples');
    clearTranscript();
    transcribe(audioSamples, language);
  }, [transcribe, clearTranscript, language]);

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

  const processedTextRef = useRef('');

  // When transcription completes, send message to LLM
  useEffect(() => {
    if (transcript?.text && !transcript.isBusy && !isGenerating) {
      // Prevent duplicate sends for the exact same text
      if (processedTextRef.current === transcript.text) return;

      console.log('Transcription complete, sending to LLM:', transcript.text);
      processedTextRef.current = transcript.text;
      sendMessage(transcript.text);
      // Clear transcript to prevent re-sending it in a loop (and allow new identical text later if needed)
      // Note: We might need to reset processedTextRef if we want to allow saying "Hello" twice in a row.
      // But clearing transcript usually suffices.
      clearTranscript();
    }
  }, [transcript, isGenerating, sendMessage, clearTranscript]);

  // Reset processed text when transcript is cleared (optional, but good for safety)
  useEffect(() => {
    if (!transcript?.text) {
      processedTextRef.current = '';
    }
  }, [transcript]);

  // Resume listening when LLM response is complete
  // Resume listening completely when LLM response is complete
  useEffect(() => {
    if (!isGenerating && lastResponse && lastResponse.length > 0) {
      // Trigger TTS if enabled
      if (ttsEnabled) {
        // Speak the final response (or just the content part if we separated it? useLLM gives raw lastResponse which might include thoughts?)
        // useLLM lastResponse usually only includes content if parsed correctly, but let's check.
        // In useLLM.js: lastResponse = messages.filter...at(-1)?.content
        // Content is separate from thought. So it's safe.
        speak(lastResponse);
      }

      // Check if we just finished (not starting a new one)
      const lastUserMsg = chatMessages.filter(m => m.role === 'user').at(-1);
      const lastAssistantMsg = chatMessages.filter(m => m.role === 'assistant').at(-1);
      if (lastAssistantMsg && lastAssistantMsg.content.length > 0) {
        console.log('LLM response complete, resuming listening');
        resume();
      }
    }
  }, [isGenerating, lastResponse, chatMessages, resume, ttsEnabled, speak]);

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

        // Settings Props
        reasoningEnabled={reasoningEnabled}
        setReasoningEnabled={setReasoningEnabled}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        language={language}
        setLanguage={setLanguage}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}

        // Gemini / Provider Props
        llmProvider={llmProvider}
        setLlmProvider={setLlmProvider}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        geminiModel={geminiModel}
        setGeminiModel={setGeminiModel}
        geminiModelsList={geminiModelsList}
      />
    </div>
  );
}

export default App;
