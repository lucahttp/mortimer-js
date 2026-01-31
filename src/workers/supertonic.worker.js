
import * as ort from 'onnxruntime-web';
import { UnicodeProcessor, preprocessText, sampleNoisyLatent, arrayToTensor, intArrayToTensor } from '../utils/supertonic-utils.js';

// Configuration
// Configure WASM paths - adjust if your project serves them differently
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
ort.env.wasm.numThreads = 1;

let sessions = {};
let config = {};
let processor = {};
let modelsLoaded = false;
let currentVoice = 'M3';
let voiceEmbeddings = {};

// Default voice map to file paths (assuming they are in public/supertonic/voice_styles)
const VOICE_MAP = {
    'F1': 'F1.json', 'F2': 'F2.json', 'F3': 'F3.json', 'F4': 'F4.json', 'F5': 'F5.json',
    'M1': 'M1.json', 'M2': 'M2.json', 'M3': 'M3.json', 'M4': 'M4.json', 'M5': 'M5.json'
};

self.onmessage = async (e) => {
    const { type, data } = e.data;

    try {
        if (type === 'load') {
            await loadModels();
            self.postMessage({ type: 'loaded' });
        }
        else if (type === 'generate') {
            if (!modelsLoaded) await loadModels();

            const { text, voiceId = 'M3' } = data;
            const audioBuffer = await generateSpeech(text, voiceId);

            // Send back audio buffer (transferable)
            self.postMessage({
                type: 'success',
                data: {
                    audio: audioBuffer,
                    sampleRate: config.ae?.sample_rate || 24000
                }
            }, [audioBuffer.buffer]);
        }
    } catch (err) {
        console.error("Supertonic Worker Error:", err);
        self.postMessage({ type: 'error', error: err.message });
    }
};

async function loadModels() {
    if (modelsLoaded) return;

    const basePath = '/supertonic/onnx'; // Mapped from public/supertonic/onnx

    // Load Config
    const configResp = await fetch('/supertonic/tts.json');
    config = await configResp.json();

    // Load Processor Indexer
    const indexerResp = await fetch('/supertonic/unicode_indexer.json');
    const indexerData = await indexerResp.json();
    processor = new UnicodeProcessor(indexerData);

    // Load ONNX Models
    // Use WebGPU if available, else WASM
    const options = {
        executionProviders: ['wasm'], // Default to WASM for stability, maybe 'webgpu' later
        graphOptimizationLevel: 'all'
    };

    try {
        const [dp, textEnc, vectorEst, vocoder] = await Promise.all([
            ort.InferenceSession.create(`${basePath}/duration_predictor.onnx`, options),
            ort.InferenceSession.create(`${basePath}/text_encoder.onnx`, options),
            ort.InferenceSession.create(`${basePath}/vector_estimator.onnx`, options),
            ort.InferenceSession.create(`${basePath}/vocoder.onnx`, options),
        ]);

        sessions = { dp, textEnc, vectorEst, vocoder };

        // Load default voice embedding
        await loadVoiceEmbedding(currentVoice);

        modelsLoaded = true;
    } catch (e) {
        throw new Error(`Failed to load ONNX models: ${e.message}`);
    }
}

async function loadVoiceEmbedding(voiceId) {
    if (voiceEmbeddings[voiceId]) return voiceEmbeddings[voiceId];

    const filename = VOICE_MAP[voiceId];
    if (!filename) throw new Error(`Unknown voice: ${voiceId}`);

    const resp = await fetch(`/supertonic/voice_styles/${filename}`);
    const data = await resp.json();

    const embeddings = {
        styleTtl: new ort.Tensor(data.style_ttl.type || 'float32', Float32Array.from(data.style_ttl.data.flat(Infinity)), data.style_ttl.dims),
        styleDp: new ort.Tensor(data.style_dp.type || 'float32', Float32Array.from(data.style_dp.data.flat(Infinity)), data.style_dp.dims)
    };

    voiceEmbeddings[voiceId] = embeddings;
    return embeddings;
}

async function generateSpeech(text, voiceId) {
    const embeddings = await loadVoiceEmbedding(voiceId);

    // 1. Text Processing
    // Detect lang (optional, default en/na)
    const { textIds, textMask } = processor.call([text], 'en'); // Hardcoded 'en' for now, or detect
    const bsz = 1;

    const textIdsShape = [bsz, textIds[0].length];
    const textMaskShape = [bsz, 1, textMask[0][0].length];

    // 2. Duration Predictor
    const dpOut = await sessions.dp.run({
        text_ids: intArrayToTensor(textIds, textIdsShape),
        style_dp: embeddings.styleDp,
        text_mask: arrayToTensor(textMask, textMaskShape)
    });

    // Duration Logic
    const durOnnx = Array.from(dpOut.duration.data);
    const durReshaped = [[[durOnnx[0]]]]; // bsz=1

    // 3. Text Encoder
    const textEncOut = await sessions.textEnc.run({
        text_ids: intArrayToTensor(textIds, textIdsShape),
        style_ttl: embeddings.styleTtl,
        text_mask: arrayToTensor(textMask, textMaskShape)
    });

    // 4. Denoising (Vector Estimator)
    const { noisyLatent, latentMask } = sampleNoisyLatent(durReshaped, config);
    const latentDim = noisyLatent[0].length;
    const latentLen = noisyLatent[0][0].length;
    const latentShape = [bsz, latentDim, latentLen];
    const latentMaskShape = [bsz, 1, latentMask[0][0].length];

    // Convert latent to flat Float32Array
    const latentSize = bsz * latentDim * latentLen;
    const latentBuffer = new Float32Array(latentSize);
    let idx = 0;
    for (let d = 0; d < latentDim; d++) {
        for (let t = 0; t < latentLen; t++) {
            latentBuffer[idx++] = noisyLatent[0][d][t];
        }
    }

    // Steps
    const totalStep = 10; // Default steps (lower = faster)
    const scalarShape = [bsz];
    const totalStepTensor = arrayToTensor([totalStep], scalarShape);

    const textEmbTensor = textEncOut.text_emb;
    const latentMaskTensor = arrayToTensor(latentMask, latentMaskShape);
    const textMaskTensor = arrayToTensor(textMask, textMaskShape);

    for (let step = 0; step < totalStep; step++) {
        const currentStepTensor = arrayToTensor([step], scalarShape);
        const noisyLatentTensor = new ort.Tensor('float32', latentBuffer, latentShape); // Zero-copy? No, creates view.

        const out = await sessions.vectorEst.run({
            noisy_latent: noisyLatentTensor,
            text_emb: textEmbTensor,
            style_ttl: embeddings.styleTtl,
            text_mask: textMaskTensor,
            latent_mask: latentMaskTensor,
            total_step: totalStepTensor,
            current_step: currentStepTensor
        });

        const denoised = out.denoised_latent.data;
        latentBuffer.set(denoised);
    }

    // 5. Vocoder
    const vocoderOut = await sessions.vocoder.run({
        latent: new ort.Tensor('float32', latentBuffer, latentShape)
    });

    const wavBatch = vocoderOut.wav_tts.data;
    const sampleRate = config.ae.sample_rate;
    const wavLen = Math.floor(sampleRate * durOnnx[0]);

    return wavBatch.slice(0, wavLen); // Float32Array audio
}
