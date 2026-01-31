# 🤖 Morti (Mortimer) - Your Offline AI Companion

A fully offline, privacy-first AI assistant that runs entirely in your browser. Morti combines wake word detection, speech recognition, LLM reasoning, and text-to-speech synthesis—all without sending data to external servers.

![Morti Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

| Feature | Technology | Description |
|---------|------------|-------------|
| 🎤 **Wake Word Detection** | [Hey Buddy](https://github.com/painebenjamin/hey-buddy) | Custom wake words like "Hey Buddy" or "Okay Buddy" |
| 🗣️ **Speech Recognition** | [Whisper WebGPU](https://github.com/xenova/whisper-web) | Real-time transcription via transformers.js |
| 🧠 **Local LLM** | [Qwen3 0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) | 100% offline inference using WebGPU |
| 🔊 **Text-to-Speech** | [Supertonic 2](https://huggingface.co/Supertone/supertonic-2) | Natural voice synthesis with 10 voices |
| 🎨 **Modern UI** | React + Tailwind CSS | Cyber-dark glassmorphism design |

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/lucahttp/morti-chat.git
cd morti-chat

# Install dependencies (automatically downloads AI models)
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🎙️ How to Use

1. **Grant Permissions** - Allow microphone access when prompted
2. **Say Wake Word** - Say "Hey Buddy" or "Okay Buddy" to activate
3. **Speak Your Query** - Ask anything after the wake word
4. **Listen to Response** - Morti will respond with synthesized speech

## ⚙️ Configuration

Click the **Settings** button to configure:

- **System Prompt** - Define the AI's personality and behavior
- **Voice Selection** - Pick from 10 different TTS voices (M1-M5, F1-F5)
- **Wake Word Sensitivity** - Adjust detection threshold

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│              100% Browser-Based (No Server)              │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Wake Word│  │  Whisper │  │  Qwen3   │  │Supertonic│  │
│  │  (ONNX)  │→→│ (WebGPU) │→→│ (WebGPU) │→→│  (ONNX)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│       ↑              ↑              ↓              ↓     │
│  Microphone     Transcription   Local LLM     Audio Out  │
└──────────────────────────────────────────────────────────┘
```

## 📦 Project Structure

```
hey-buddy-react/
├── public/
│   ├── models/          # Wake word ONNX models
│   ├── pretrained/      # VAD, embedding models
│   └── supertonic/      # TTS models (auto-downloaded)
├── src/
│   ├── components/      # React UI components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # Core services (HeyBuddy, TTS, ONNX)
│   └── workers/         # Web Workers (transcription, LLM)
└── scripts/
    └── download-models.js  # Model downloader
```

## 🔧 Technologies

- **Runtime**: ONNX Runtime Web, WebGPU, Web Workers
- **Frontend**: React 19, Tailwind CSS 4, Vite 7
- **AI Models**: Silero VAD, Whisper,Qwen3, Supertonic TTS

## 📚 Credits & Sources

| Project | Description | Link |
|---------|-------------|------|
| Hey Buddy | Wake word detection | [GitHub](https://github.com/painebenjamin/hey-buddy) |
| Supertonic 2 | Neural TTS by Supertone | [HuggingFace](https://huggingface.co/spaces/Supertone/supertonic-2) |
| Whisper Web | WebGPU Whisper | [GitHub](https://github.com/xenova/whisper-web) |
| Transformers.js | Browser AI runtime | [GitHub](https://github.com/huggingface/transformers.js) |
| Qwen3 | Local LLM model | [HuggingFace](https://huggingface.co/Qwen/Qwen3-0.6B) |

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

<p align="center">
  <strong>🎭 Morti - Privacy-first AI that lives in your browser</strong>
</p>
