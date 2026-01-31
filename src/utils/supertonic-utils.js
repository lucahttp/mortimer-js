
// Supertonic TTS Utilities
// Extracted from script.js

export class UnicodeProcessor {
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
                // Check if character is supported (not -1, undefined, or null)
                if (indexValue === undefined || indexValue === null || indexValue === -1) {
                    unsupportedChars.add(processedTexts[i][j]);
                    row[j] = 0; // Use 0 as fallback
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

export const AVAILABLE_LANGS = ["en", "ko", "es", "pt", "fr"];

/**
 * Language detection based on character patterns and language-specific markers
 * Returns the detected language code or null if uncertain
 */
export function detectLanguage(text) {
    if (!text || text.trim().length < 3) {
        return null;
    }

    // Only consider last 100 characters for efficiency
    const sampleText = text.length > 100 ? text.substring(text.length - 100) : text;

    // Normalize text for analysis
    const normalizedText = sampleText.normalize('NFC').toLowerCase();

    // Korean detection: Hangul characters (most reliable)
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/g;
    const koreanMatches = normalizedText.match(koreanRegex) || [];
    if (koreanMatches.length >= 2) {
        return 'ko';
    }

    // Scoring system for Latin-based languages
    const scores = { en: 0, es: 0, fr: 0, pt: 0 };

    // 1. Highly distinctive characters (definitive markers)
    if (/ñ/.test(normalizedText)) scores.es += 15;
    if (/[¿¡]/.test(normalizedText)) scores.es += 12;
    if (/ã/.test(normalizedText)) scores.pt += 15;
    if (/õ/.test(normalizedText)) scores.pt += 15;
    if (/œ/.test(normalizedText)) scores.fr += 15;
    if (/[ùû]/.test(normalizedText)) scores.fr += 10;

    // ç is shared between French and Portuguese
    if (/ç/.test(normalizedText)) {
        scores.fr += 4;
        scores.pt += 4;
    }

    // French-specific accent patterns
    if (/[èêë]/.test(normalizedText)) scores.fr += 5;
    if (/[àâ]/.test(normalizedText)) scores.fr += 3;
    if (/[îï]/.test(normalizedText)) scores.fr += 4;
    if (/ô/.test(normalizedText)) scores.fr += 3;

    // 2. Exclusive stopwords (words unique to one language)
    const exclusiveWords = {
        en: ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'will', 'would', 'could', 'should', 'this', 'that', 'with', 'from', 'they', 'what', 'which', 'there', 'their', 'about', 'these', 'other', 'into', 'just', 'your', 'some', 'than', 'them', 'then', 'only', 'being', 'through', 'after', 'before'],
        es: ['el', 'los', 'las', 'es', 'está', 'están', 'porque', 'pero', 'muy', 'también', 'más', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'yo', 'tú', 'nosotros', 'ellos', 'ellas', 'hola', 'gracias', 'buenos', 'buenas', 'ahora', 'siempre', 'nunca', 'todo', 'nada', 'algo', 'alguien'],
        fr: ['le', 'les', 'est', 'sont', 'dans', 'ce', 'cette', 'ces', 'il', 'elle', 'ils', 'elles', 'je', 'tu', 'nous', 'vous', 'avec', 'sur', 'ne', 'pas', 'plus', 'tout', 'bien', 'fait', 'être', 'avoir', 'donc', 'car', 'ni', 'jamais', 'toujours', 'rien', 'quelque', 'encore', 'aussi', 'très', 'peu', 'ici'],
        pt: ['os', 'as', 'é', 'são', 'está', 'estão', 'não', 'na', 'no', 'da', 'do', 'das', 'dos', 'ao', 'aos', 'ele', 'ela', 'eles', 'elas', 'eu', 'nós', 'você', 'vocês', 'seu', 'sua', 'seus', 'suas', 'muito', 'também', 'já', 'foi', 'só', 'mesmo', 'ter', 'até', 'isso', 'olá', 'obrigado', 'obrigada', 'bom', 'boa', 'agora', 'sempre', 'nunca', 'tudo', 'nada', 'algo', 'alguém']
    };

    // Extract words from text
    const words = normalizedText.match(/[a-záàâãäåçéèêëíìîïñóòôõöúùûüýÿœæ]+/g) || [];

    for (const word of words) {
        for (const [lang, wordList] of Object.entries(exclusiveWords)) {
            if (wordList.includes(word)) {
                scores[lang] += 3;
            }
        }
    }

    // Return highest score language if significant
    let maxScore = 0;
    let detectedLang = null;

    for (const [lang, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detectedLang = lang;
        }
    }

    if (maxScore >= 4) {
        return detectedLang;
    }

    return null;
}

export function preprocessText(text, lang = null) {
    // Normalize unicode characters
    text = text.normalize('NFKD');

    // Remove emojis
    text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu, '');

    // Replace various dashes and symbols
    const replacements = {
        "–": "-",
        "‑": "-",
        "—": "-",
        "_": " ",
        "\u201C": '"',  // "
        "\u201D": '"',  // "
        "\u2018": "'",  // '
        "\u2019": "'",  // '
        "´": "'",
        "`": "'",
        "[": " ",
        "]": " ",
        "|": " ",
        "/": " ",
        "#": " ",
        "→": " ",
        "←": " ",
    };

    for (const [k, v] of Object.entries(replacements)) {
        text = text.replaceAll(k, v);
    }

    // Remove special symbols
    text = text.replace(/[♥☆♡©\\]/g, "");

    // Replace known expressions
    const exprReplacements = {
        "@": " at ",
        "e.g.,": "for example,",
        "i.e.,": "that is,",
    };

    for (const [k, v] of Object.entries(exprReplacements)) {
        text = text.replaceAll(k, v);
    }

    // Fix spacing around punctuation
    text = text.replace(/ ,/g, ",");
    text = text.replace(/ \./g, ".");
    text = text.replace(/ !/g, "!");
    text = text.replace(/ \?/g, "?");
    text = text.replace(/ ;/g, ";");
    text = text.replace(/ :/g, ":");
    text = text.replace(/ '/g, "'");

    // Remove duplicate quotes
    while (text.includes('""')) {
        text = text.replace(/""/g, '"');
    }
    while (text.includes("''")) {
        text = text.replace(/''/g, "'");
    }
    while (text.includes("``")) {
        text = text.replace(/``/g, "`");
    }

    // Remove extra spaces
    text = text.replace(/\s+/g, " ").trim();

    // If text doesn't end with punctuation, quotes, or closing brackets, add a period
    if (!/[.!?;:,'"')\]}…。」』】〉》›»]$/.test(text)) {
        text += ".";
    }

    // Add language tags
    if (lang !== null) {
        if (!AVAILABLE_LANGS.includes(lang)) {
            // throw new Error(`Invalid language: ${lang}`);
            // Use fallback
            text = `<${lang}>` + text + `</${lang}>`;
        } else {
            text = `<${lang}>` + text + `</${lang}>`;
        }
    } else {
        text = `<na>` + text + `</na>`;
    }

    return text;
}

export function textToUnicodeValues(text) {
    return Array.from(text).map(char => char.charCodeAt(0));
}

export function lengthToMask(lengths, maxLen = null) {
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

export function getTextMask(textIdsLengths) {
    return lengthToMask(textIdsLengths);
}

export function getLatentMask(wavLengths, cfgs) {
    const baseChunkSize = cfgs.ae.base_chunk_size;
    const chunkCompressFactor = cfgs.ttl.chunk_compress_factor;
    const latentSize = baseChunkSize * chunkCompressFactor;
    const latentLengths = wavLengths.map(len =>
        Math.floor((len + latentSize - 1) / latentSize)
    );
    return lengthToMask(latentLengths);
}

export function sampleNoisyLatent(duration, cfgs) {
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

// Helper to parse WAV for reference embeddings
export function parseWavFile(buffer) {
    const view = new DataView(buffer);

    // Check RIFF header
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== 'RIFF') {
        throw new Error('Not a valid WAV file');
    }

    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== 'WAVE') {
        throw new Error('Not a valid WAV file');
    }

    let offset = 12;
    let fmtChunk = null;
    let dataChunk = null;

    while (offset < buffer.byteLength) {
        const chunkId = String.fromCharCode(
            view.getUint8(offset),
            view.getUint8(offset + 1),
            view.getUint8(offset + 2),
            view.getUint8(offset + 3)
        );
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
            fmtChunk = {
                audioFormat: view.getUint16(offset + 8, true),
                numChannels: view.getUint16(offset + 10, true),
                sampleRate: view.getUint32(offset + 12, true),
                bitsPerSample: view.getUint16(offset + 22, true)
            };
        } else if (chunkId === 'data') {
            dataChunk = {
                offset: offset + 8,
                size: chunkSize
            };
            break;
        }

        offset += 8 + chunkSize;
    }

    if (!fmtChunk || !dataChunk) {
        throw new Error('Invalid WAV file format');
    }

    const bytesPerSample = fmtChunk.bitsPerSample / 8;
    const numSamples = Math.floor(dataChunk.size / (bytesPerSample * fmtChunk.numChannels));
    const audioData = new Float32Array(numSamples);

    if (fmtChunk.bitsPerSample === 16) {
        for (let i = 0; i < numSamples; i++) {
            let sample = 0;
            for (let ch = 0; ch < fmtChunk.numChannels; ch++) {
                const sampleOffset = dataChunk.offset + (i * fmtChunk.numChannels + ch) * 2;
                sample += view.getInt16(sampleOffset, true);
            }
            audioData[i] = (sample / fmtChunk.numChannels) / 32768.0;
        }
    } else {
        // Fallback for demo logic if needed (simplified)
        for (let i = 0; i < numSamples; i++) {
            audioData[i] = 0;
        }
    }

    return {
        sampleRate: fmtChunk.sampleRate,
        audioData: audioData
    };
}
