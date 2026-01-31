#!/usr/bin/env node
/**
 * Downloads large Supertonic TTS model files from Hugging Face
 * Run with: node scripts/download-models.cjs
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
    { file: 'tts.json', size: '9KB' },
    { file: 'unicode_indexer.json', size: '262KB' },
];

const VOICE_STYLES = ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5'];

const TARGET_DIR = path.join(__dirname, '..', 'public', 'supertonic');

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond < 1024) return bytesPerSecond.toFixed(0) + ' B/s';
    if (bytesPerSecond < 1024 * 1024) return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
    return (bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
}

function formatDuration(ms) {
    if (ms < 1000) return ms + 'ms';
    const seconds = ms / 1000;
    if (seconds < 60) return seconds.toFixed(1) + 's';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const startTime = Date.now();
        let downloaded = 0;

        const request = (urlToFetch) => {
            https.get(urlToFetch, (response) => {
                // Handle redirects (Hugging Face uses them)
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    request(response.headers.location);
                    return;
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                response.on('data', (chunk) => {
                    downloaded += chunk.length;
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    const elapsed = Date.now() - startTime;
                    const speed = downloaded / (elapsed / 1000);
                    resolve({ downloaded, elapsed, speed });
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

    let totalDownloaded = 0;
    let totalFiles = 0;
    const overallStart = Date.now();

    // Download model files
    for (const model of MODELS) {
        const dest = path.join(TARGET_DIR, model.file);

        if (fs.existsSync(dest)) {
            console.log(`✓ ${model.file} (${model.size}) - already exists, skipping`);
            continue;
        }

        process.stdout.write(`↓ ${model.file} (${model.size})... `);
        try {
            const { downloaded, elapsed, speed } = await download(`${HF_BASE}/${model.file}`, dest);
            console.log(`✓ ${formatBytes(downloaded)} in ${formatDuration(elapsed)} (${formatSpeed(speed)})`);
            totalDownloaded += downloaded;
            totalFiles++;
        } catch (err) {
            console.log(`✗ Error: ${err.message}`);
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

        process.stdout.write(`↓ ${file}... `);
        try {
            const { downloaded, elapsed, speed } = await download(`${HF_BASE}/${file}`, dest);
            console.log(`✓ ${formatBytes(downloaded)} in ${formatDuration(elapsed)} (${formatSpeed(speed)})`);
            totalDownloaded += downloaded;
            totalFiles++;
        } catch (err) {
            console.log(`✗ Error: ${err.message}`);
        }
    }

    const totalElapsed = Date.now() - overallStart;
    console.log('');
    if (totalFiles > 0) {
        const avgSpeed = totalDownloaded / (totalElapsed / 1000);
        console.log(`📦 Downloaded ${totalFiles} files (${formatBytes(totalDownloaded)}) in ${formatDuration(totalElapsed)}`);
        console.log(`⚡ Average speed: ${formatSpeed(avgSpeed)}`);
    }
    console.log('✅ Supertonic models download complete!');
}

main().catch(console.error);
