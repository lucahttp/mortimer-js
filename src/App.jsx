
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHeyBuddy } from '@/hooks/useHeyBuddy';
import { useTranscriber } from '@/hooks/useTranscriber';
import { useLLM } from '@/hooks/useLLM';
import { useTTS } from '@/hooks/useTTS';
import { useSupertonicTTS } from '@/hooks/useSupertonicTTS';
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
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [ttsProvider, setTtsProvider] = useState(() => localStorage.getItem('heybuddy_ttsProvider') || 'supertonic');

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
  useEffect(() => localStorage.setItem('heybuddy_ttsProvider', ttsProvider), [ttsProvider]);
  useEffect(() => localStorage.setItem('heybuddy_llmProvider', llmProvider), [llmProvider]);
  useEffect(() => localStorage.setItem('heybuddy_geminiApiKey', geminiApiKey), [geminiApiKey]);
  useEffect(() => localStorage.setItem('heybuddy_geminiModel', geminiModel), [geminiModel]);

  // Fetch Gemini Models
  useEffect(() => {
    async function fetchModels() {
      if (!geminiApiKey || geminiApiKey.length < 30) return; // Basic length check
      try {
        // Note: client-side listing might require a proxy or specific CORS headers
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

    const timer = setTimeout(fetchModels, 1000);
    return () => clearTimeout(timer);
  }, [geminiApiKey]);

  // Browser TTS Hook
  const { speak: browserSpeak, cancel: cancelBrowserTTS, isSpeaking: isBrowserSpeaking } = useTTS();

  // Supertonic TTS Hook (Local/ONNX)
  const {
    speak: supertonicSpeak,
    stop: stopSupertonic,
    isSpeaking: isSupertonicSpeaking
  } = useSupertonicTTS({
    enabled: ttsEnabled && ttsProvider === 'supertonic',
    language: language
  });

  // United Speak Function
  const speak = useCallback((text) => {
    if (!ttsEnabled) return;

    if (ttsProvider === 'supertonic') {
      supertonicSpeak(text);
    } else {
      browserSpeak(text);
    }
  }, [ttsEnabled, ttsProvider, supertonicSpeak, browserSpeak]);

  // United Stop Function
  const stopAudio = useCallback(() => {
    cancelBrowserTTS();
    stopSupertonic();
  }, [cancelBrowserTTS, stopSupertonic]);

  const isSpeaking = isBrowserSpeaking || isSupertonicSpeaking;

  // Transcription hook
  const {
    transcript,
    isTranscribing,
    isModelLoading: isTranscriberLoading,
    progress: transcriptionProgress,
    transcribe,
    clear: clearTranscript,
  } = useTranscriber();

  // LLM hook
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
  } = useLLM({
    provider: llmProvider,
    apiKey: geminiApiKey,
    model: geminiModel,
    systemPrompt,
    reasoningEnabled
  });

  // Handle recording complete
  const handleRecordingComplete = useCallback((audioSamples) => {
    console.log('Recording complete, starting transcription...', audioSamples.length, 'samples');
    clearTranscript();
    transcribe(audioSamples, language);
  }, [transcribe, clearTranscript, language]);

  // Hey Buddy hook
  const {
    isInitialized,
    isRecording,
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

  // Pause listening logic
  useEffect(() => {
    if (isTranscribing || isGenerating || isSpeaking) {
      pause();
    }
  }, [isTranscribing, isGenerating, isSpeaking, pause]);

  const processedTextRef = useRef('');

  // Transcription -> LLM
  useEffect(() => {
    if (transcript?.text && !transcript.isBusy && !isGenerating) {
      if (processedTextRef.current === transcript.text) return;

      console.log('Transcription complete, sending to LLM:', transcript.text);
      processedTextRef.current = transcript.text;
      sendMessage(transcript.text);
      clearTranscript();
    }
  }, [transcript, isGenerating, sendMessage, clearTranscript]);

  useEffect(() => {
    if (!transcript?.text) {
      processedTextRef.current = '';
    }
  }, [transcript]);

  // Speak Logic
  useEffect(() => {
    if (!isGenerating && lastResponse && lastResponse.length > 0) {
      if (ttsEnabled) {
        speak(lastResponse);
      }

      // Resume listening logic
      // If TTS is disabled, resume immediately
      if (!ttsEnabled) {
        resume();
      }
      // If TTS enabled, the 'isSpeaking' effect above will handle pause/resume flow 
      // (Pauses when speaking starts. We need resume when speaking ends.)
    }
  }, [isGenerating, lastResponse, ttsEnabled, speak, resume]);

  // Resume when completely idle
  useEffect(() => {
    if (!isSpeaking && !isGenerating && !isTranscribing && !isRecording && isInitialized) {
      resume();
    }
  }, [isSpeaking, isGenerating, isTranscribing, isRecording, isInitialized, resume]);


  // Canvas refs
  const wakeWordCanvasRef = useRef(null);
  const speechCanvasRef = useRef(null);
  const frameBudgetCanvasRef = useRef(null);

  // Visualization Hooks
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

  const handleAllowMicrophone = useCallback(async () => {
    const granted = await requestMicrophonePermission();
    if (granted) {
      setShowPermissionPrompt(false);
      await start();
    }
  }, [requestMicrophonePermission, start]);

  const activeStates = useMemo(() => {
    const states = {};
    for (const word of WAKE_WORDS) {
      const key = word.replace(' ', '-');
      states[word] = wakeWords[key]?.active || false;
    }
    return states;
  }, [wakeWords]);

  useEffect(() => {
    if (!isInitialized) return;

    for (const word of WAKE_WORDS) {
      const key = word.replace(' ', '-');
      const probability = wakeWords[key]?.probability || 0;
      pushWakeWordValue(word, probability);
    }

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

  // Status for Chat Bubble (Merged)
  const statusBubbleProps = useMemo(() => {
    if (isLLMLoading || (isGenerating && !lastResponse)) {
      return { status: 'loading_llm' };
    }
    if (isTranscribing) {
      return { status: 'transcribing', transcript: transcript?.text };
    }
    if (isRecording) {
      return { status: 'recording' };
    }
    // Check for thinking state? 
    // The message component specific logic handles thinking display
    // But if we want a global status:
    if (isGenerating && lastResponse) {
      return { status: 'response' };
    }
    if (isSpeaking) {
      return { status: 'play_audio' };
    }
    // Wake word detected?
    const isWakeWordActive = Object.values(activeStates).some(s => s);
    if (isWakeWordActive) {
      return { status: 'wake_word_detected' };
    }
    return { status: 'idle' };
  }, [isLLMLoading, isGenerating, isTranscribing, transcript, isRecording, lastResponse, isSpeaking, activeStates]);


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
        statusBubbleProps={statusBubbleProps}

        // Settings Props
        reasoningEnabled={reasoningEnabled}
        setReasoningEnabled={setReasoningEnabled}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        language={language}
        setLanguage={setLanguage}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}
        ttsProvider={ttsProvider}
        setTtsProvider={setTtsProvider}

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
