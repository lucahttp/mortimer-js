#!/usr/bin/env node
/**
 * Downloads large Supertonic TTS model files from Hugging Face
 * Run with: node scripts/download-models.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const HF_BASE = 'https://huggingface.co/Supertone/supertonic-2/resolve/main';

const MODELS = [
    { file: 'onnx/duration_predictor.onnx', size: '1.5MB' },
    { file: 'onnx/text_encoder.onnx', size: '27MB' },
    { file: 'onnx/vector_estimator.onnx', size: '132MB' },
    { file: 'onnx/vocoder.onnx', size: '101MB' },
    { file: 'onnx/tts.json', size: '9KB' },
    { file: 'onnx/unicode_indexer.json', size: '262KB' },
    { file: 'tts.json', size: '9KB' },
    { file: 'unicode_indexer.json', size: '262KB' },
];

const VOICE_STYLES = ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'];

const TARGET_DIR = path.join(__dirname, '..', 'public', 'supertonic');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);

        const request = (urlToFetch) => {
            https.get(urlToFetch, (response) => {
                // Handle redirects (Hugging Face uses them)
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    request(response.headers.location);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                    return;
                }

                const total = parseInt(response.headers['content-length'], 10);
                let downloaded = 0;

                response.on('data', (chunk) => {
                    downloaded += chunk.length;
                    if (total) {
                        const percent = ((downloaded / total) * 100).toFixed(1);
                        process.stdout.write(`\r  Progress: ${percent}%`);
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log(' Done!');
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => { });
                reject(err);
            });
        };

        request(url);
    });
}

async function main() {
    console.log('🎤 Downloading Supertonic TTS models from Hugging Face...\n');

    // Create directories
    const onnxDir = path.join(TARGET_DIR, 'onnx');
    const voiceDir = path.join(TARGET_DIR, 'voice_styles');

    fs.mkdirSync(onnxDir, { recursive: true });
    fs.mkdirSync(voiceDir, { recursive: true });

    // Download model files
    for (const model of MODELS) {
        const dest = path.join(TARGET_DIR, model.file);

        if (fs.existsSync(dest)) {
            console.log(`✓ ${model.file} (${model.size}) - already exists, skipping`);
            continue;
        }

        console.log(`↓ ${model.file} (${model.size})`);
        try {
            await download(`${HF_BASE}/${model.file}`, dest);
        } catch (err) {
            console.error(`  Error: ${err.message}`);
        }
    }

    // Download voice styles
    for (const voice of VOICE_STYLES) {
        const file = `voice_styles/${voice}.json`;
        const dest = path.join(TARGET_DIR, file);

        if (fs.existsSync(dest)) {
            console.log(`✓ ${file} - already exists, skipping`);
            continue;
        }

        console.log(`↓ ${file}`);
        try {
            await download(`${HF_BASE}/${file}`, dest);
        } catch (err) {
            console.error(`  Error: ${err.message}`);
        }
    }

    console.log('\n✅ Supertonic models download complete!');
}

main().catch(console.error);
