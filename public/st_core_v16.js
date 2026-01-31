
self.importScripts('/wasm/ort.all.min.js');
const ort = self.ort;

// --- INLINED UTILS START ---
const AVAILABLE_LANGS = ["en", "ko", "es", "pt", "fr"];

function textToUnicodeValues(text) {
    return Array.from(text).map(char => char.charCodeAt(0));
}

function lengthToMask(lengths, maxLen = null) {
    maxLen = maxLen || Math.max(...lengths);
    const mask = [];
    for (let i = 0; i < lengths.length; i++) {
        const row = [];
        for (let j = 0; j < maxLen; j++) {
            row.push(j < lengths[i] ? 1.0 : 0.0);
        }
        mask.push([row]);
    }
    return mask;
}

function getTextMask(textIdsLengths) {
    return lengthToMask(textIdsLengths);
}

function preprocessText(text, lang = null) {
    text = text.normalize('NFKD');
    // Remove emojis
    text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu, '');

    const replacements = {
        "–": "-", "‑": "-", "—": "-", "_": " ",
        "\u201C": '"', "\u201D": '"', "\u2018": "'", "\u2019": "'",
        "´": "'", "`": "'", "[": " ", "]": " ", "|": " ", "/": " ", "#": " ", "→": " ", "←": " ",
    };

    for (const [k, v] of Object.entries(replacements)) { text = text.replaceAll(k, v); }
    text = text.replace(/[♥☆♡©\\]/g, "");

    const exprReplacements = { "@": " at ", "e.g.,": "for example,", "i.e.,": "that is," };
    for (const [k, v] of Object.entries(exprReplacements)) { text = text.replaceAll(k, v); }

    text = text.replace(/ ,/g, ",").replace(/ \./g, ".").replace(/ !/g, "!").replace(/ \?/g, "?")
        .replace(/ ;/g, ";").replace(/ :/g, ":").replace(/ '/g, "'");

    while (text.includes('""')) { text = text.replace(/""/g, '"'); }
    while (text.includes("''")) { text = text.replace(/''/g, "'"); }

    text = text.replace(/\s+/g, " ").trim();
    if (!/[.!?;:,'"')\]}…。」』】〉》›»]$/.test(text) && text.length > 0) { text += "."; }

    if (lang !== null) {
        text = `<${lang}>` + text + `</${lang}>`;
    } else {
        text = `<na>` + text + `</na>`;
    }

    return text;
}

class UnicodeProcessor {
    constructor(indexer) {
        this.indexer = indexer;
    }

    call(textList, lang = null) {
        const processedTexts = textList.map(t => preprocessText(t, lang));
        const textIdsLengths = processedTexts.map(t => t.length);
        const maxLen = Math.max(...textIdsLengths);

        const textIds = [];
        const unsupportedChars = new Set();

        for (let i = 0; i < processedTexts.length; i++) {
            const row = new Array(maxLen).fill(0);
            const unicodeVals = textToUnicodeValues(processedTexts[i]);
            for (let j = 0; j < unicodeVals.length; j++) {
                const indexValue = this.indexer[unicodeVals[j]];
                if (indexValue === undefined || indexValue === null || indexValue === -1) {
                    unsupportedChars.add(processedTexts[i][j]);
                    row[j] = 0;
                } else {
                    row[j] = indexValue;
                }
            }
            textIds.push(row);
        }

        const textMask = getTextMask(textIdsLengths);
        return { textIds, textMask, unsupportedChars: Array.from(unsupportedChars) };
    }
}

function getLatentMask(wavLengths, cfgs) {
    const baseChunkSize = cfgs.ae.base_chunk_size;
    const chunkCompressFactor = cfgs.ttl.chunk_compress_factor;
    const latentSize = baseChunkSize * chunkCompressFactor;
    const latentLengths = wavLengths.map(len => Math.floor((len + latentSize - 1) / latentSize));
    return lengthToMask(latentLengths);
}

function sampleNoisyLatent(duration, cfgs) {
    const sampleRate = cfgs.ae.sample_rate;
    const baseChunkSize = cfgs.ae.base_chunk_size;
    const chunkCompressFactor = cfgs.ttl.chunk_compress_factor;
    const ldim = cfgs.ttl.latent_dim;

    const wavLenMax = Math.max(...duration.map(d => d[0][0])) * sampleRate;
    const wavLengths = duration.map(d => Math.floor(d[0][0] * sampleRate));
    const chunkSize = baseChunkSize * chunkCompressFactor;
    const latentLen = Math.floor((wavLenMax + chunkSize - 1) / chunkSize);
    const latentDim = ldim * chunkCompressFactor;

    const noisyLatent = [];
    for (let b = 0; b < duration.length; b++) {
        const batch = [];
        for (let d = 0; d < latentDim; d++) {
            const row = [];
            for (let t = 0; t < latentLen; t++) {
                const u1 = Math.random();
                const u2 = Math.random();
                const randNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                row.push(randNormal);
            }
            batch.push(row);
        }
        noisyLatent.push(batch);
    }

    const latentMask = getLatentMask(wavLengths, cfgs);
    for (let b = 0; b < noisyLatent.length; b++) {
        for (let d = 0; d < noisyLatent[b].length; d++) {
            for (let t = 0; t < noisyLatent[b][d].length; t++) {
                noisyLatent[b][d][t] *= latentMask[b][0][t];
            }
        }
    }
    return { noisyLatent, latentMask };
}

function arrayToTensor(arr, dims) {
    return new ort.Tensor('float32', Float32Array.from(arr.flat(Infinity)), dims);
}

function intArrayToTensor(arr, dims) {
    return new ort.Tensor('int32', Int32Array.from(arr.flat(Infinity)), dims);
}
// --- INLINED UTILS END ---


// Configuration
ort.env.wasm.wasmPaths = '/wasm/';
ort.env.wasm.numThreads = 1; // Single-thread baseline to avoid .mjs helper bug in Vite
ort.env.wasm.proxy = false;

console.log("[SUPERTONIC_WORKER_V16] Initializing single-threaded classic worker...");

let config = null;
let processor = null;
let sessions = null;
let modelsLoaded = false;
let currentVoice = 'M3';
const voiceEmbeddings = {};

const VOICE_MAP = {
    'M3': 'M3_robert_style.json',
    'F1': 'F1_sarah_style.json',
};

self.onmessage = async (e) => {
    const { type, data } = e.data;
    console.log("[SUPERTONIC_WORKER_V16] Received message:", type);

    try {
        if (type === 'load') {
            await loadModels();
            self.postMessage({ type: 'loaded' });
        }
        else if (type === 'generate') {
            if (!modelsLoaded) await loadModels();

            const { text, voiceId = 'M3' } = data;
            const audioBuffer = await generateSpeech(text, voiceId);

            self.postMessage({
                type: 'success',
                data: {
                    audio: audioBuffer,
                    sampleRate: config.ae?.sample_rate || 24000
                }
            }, [audioBuffer.buffer]);
        }
    } catch (err) {
        console.error("[SUPERTONIC_WORKER_V16] Error:", err);
        self.postMessage({ type: 'error', error: err.message });
    }
};

async function loadModels() {
    if (modelsLoaded) return;

    const basePath = '/supertonic/onnx';

    console.log("[SUPERTONIC_WORKER_V16] Fetching config...");
    const configResp = await fetch('/supertonic/tts.json');
    if (!configResp.ok) throw new Error(`Failed to load tts.json: ${configResp.statusText}`);
    config = await configResp.json();

    console.log("[SUPERTONIC_WORKER_V16] Fetching indexer...");
    const indexerResp = await fetch('/supertonic/unicode_indexer.json');
    if (!indexerResp.ok) throw new Error(`Failed to load unicode_indexer.json: ${indexerResp.statusText}`);
    const indexerData = await indexerResp.json();
    processor = new UnicodeProcessor(indexerData);

    const options = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
    };

    console.log("[SUPERTONIC_WORKER_V16] Loading models sequentially (1 thread)...");

    console.log("[SUPERTONIC_WORKER_V16] Loading duration_predictor.onnx...");
    const dp = await ort.InferenceSession.create(`${basePath}/duration_predictor.onnx`, options);

    console.log("[SUPERTONIC_WORKER_V16] Loading text_encoder.onnx...");
    const textEnc = await ort.InferenceSession.create(`${basePath}/text_encoder.onnx`, options);

    console.log("[SUPERTONIC_WORKER_V16] Loading vector_estimator.onnx...");
    const vectorEst = await ort.InferenceSession.create(`${basePath}/vector_estimator.onnx`, options);

    console.log("[SUPERTONIC_WORKER_V16] Loading vocoder.onnx...");
    const vocoder = await ort.InferenceSession.create(`${basePath}/vocoder.onnx`, options);

    sessions = { dp, textEnc, vectorEst, vocoder };
    await loadVoiceEmbedding(currentVoice);

    modelsLoaded = true;
    console.log("[SUPERTONIC_WORKER_V16] Ready.");
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
    const cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    const { textIds, textMask } = processor.call([cleanText], 'en');
    const bsz = 1;

    const textIdsShape = [bsz, textIds[0].length];
    const textMaskShape = [bsz, 1, textMask[0][0].length];

    const dpOut = await sessions.dp.run({
        text_ids: intArrayToTensor(textIds, textIdsShape),
        style_dp: embeddings.styleDp,
        text_mask: arrayToTensor(textMask, textMaskShape)
    });

    const durOnnx = Array.from(dpOut.duration.data);
    const durReshaped = [[[durOnnx[0]]]];

    const textEncOut = await sessions.textEnc.run({
        text_ids: intArrayToTensor(textIds, textIdsShape),
        style_ttl: embeddings.styleTtl,
        text_mask: arrayToTensor(textMask, textMaskShape)
    });

    const { noisyLatent, latentMask } = sampleNoisyLatent(durReshaped, config);
    const latentDim = noisyLatent[0].length;
    const latentLen = noisyLatent[0][0].length;
    const latentShape = [bsz, latentDim, latentLen];
    const latentMaskShape = [bsz, 1, latentMask[0][0].length];

    const latentSize = bsz * latentDim * latentLen;
    const latentBuffer = new Float32Array(latentSize);
    let idx = 0;
    for (let d = 0; d < latentDim; d++) {
        for (let t = 0; t < latentLen; t++) {
            latentBuffer[idx++] = noisyLatent[0][d][t];
        }
    }

    const totalStep = 10;
    const scalarShape = [bsz];
    const totalStepTensor = arrayToTensor([totalStep], scalarShape);

    const textEmbTensor = textEncOut.text_emb;
    const latentMaskTensor = arrayToTensor(latentMask, latentMaskShape);
    const textMaskTensor = arrayToTensor(textMask, textMaskShape);

    for (let step = 0; step < totalStep; step++) {
        const currentStepTensor = arrayToTensor([step], scalarShape);
        const noisyLatentTensor = new ort.Tensor('float32', latentBuffer, latentShape);
        const out = await sessions.vectorEst.run({
            noisy_latent: noisyLatentTensor,
            text_emb: textEmbTensor,
            style_ttl: embeddings.styleTtl,
            text_mask: textMaskTensor,
            latent_mask: latentMaskTensor,
            total_step: totalStepTensor,
            current_step: currentStepTensor
        });
        latentBuffer.set(out.denoised_latent.data);
    }

    const vocoderOut = await sessions.vocoder.run({
        latent: new ort.Tensor('float32', latentBuffer, latentShape)
    });

    const wavBatch = vocoderOut.wav_tts.data;
    const sampleRate = config.ae.sample_rate;
    const wavLen = Math.floor(sampleRate * durOnnx[0]);

    return wavBatch.slice(0, wavLen);
}
