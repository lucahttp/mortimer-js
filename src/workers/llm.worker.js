/**
 * LLM Web Worker using Qwen3 WebGPU
 * Based on transformers.js qwen3-webgpu example
 */
import {
    AutoTokenizer,
    AutoModelForCausalLM,
    TextStreamer,
    InterruptableStoppingCriteria,
} from "@huggingface/transformers";

/**
 * Singleton pipeline factory for Qwen3
 */
class TextGenerationPipeline {
    static model_id = "onnx-community/Qwen3-0.6B-ONNX";
    static tokenizer = null;
    static model = null;

    static async getInstance(progressCallback = null) {
        if (!this.tokenizer) {
            this.tokenizer = AutoTokenizer.from_pretrained(this.model_id, {
                progress_callback: progressCallback,
            });
        }

        if (!this.model) {
            this.model = AutoModelForCausalLM.from_pretrained(this.model_id, {
                dtype: "q4f16",
                device: "webgpu",
                progress_callback: progressCallback,
            });
        }

        return Promise.all([this.tokenizer, this.model]);
    }
}

const stoppingCriteria = new InterruptableStoppingCriteria();

/**
 * Generate response for a given prompt
 */
async function generate({ prompt }) {
    const [tokenizer, model] = await TextGenerationPipeline.getInstance();

    // Create chat messages
    const messages = [
        { role: "system", content: "You are a helpful voice assistant. Keep responses concise and conversational." },
        { role: "user", content: prompt },
    ];

    const inputs = tokenizer.apply_chat_template(messages, {
        add_generation_prompt: true,
        return_dict: true,
    });

    let startTime = null;
    let numTokens = 0;
    let tps = 0;

    const tokenCallback = () => {
        startTime = startTime ?? performance.now();
        if (numTokens++ > 0) {
            tps = (numTokens / (performance.now() - startTime)) * 1000;
        }
    };

    const callback = (output) => {
        self.postMessage({
            status: "update",
            output,
            tps,
            numTokens,
        });
    };

    const streamer = new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: callback,
        token_callback_function: tokenCallback,
    });

    // Signal generation start
    self.postMessage({ status: "start" });

    try {
        const { sequences } = await model.generate({
            ...inputs,
            do_sample: true,
            top_k: 20,
            temperature: 0.7,
            max_new_tokens: 256,
            streamer,
            stopping_criteria: stoppingCriteria,
            return_dict_in_generate: true,
        });

        const decoded = tokenizer.batch_decode(sequences, {
            skip_special_tokens: true,
        });

        // Send complete result
        self.postMessage({
            status: "complete",
            output: decoded[0],
            tps,
            numTokens,
        });
    } catch (error) {
        self.postMessage({
            status: "error",
            data: { message: error.message },
        });
    }
}

/**
 * Load model and warm up
 */
async function load() {
    self.postMessage({
        status: "loading",
        data: "Loading Qwen3 model...",
    });

    const [tokenizer, model] = await TextGenerationPipeline.getInstance((x) => {
        self.postMessage(x);
    });

    self.postMessage({
        status: "loading",
        data: "Compiling shaders...",
    });

    // Warm up with dummy input
    const inputs = tokenizer("a");
    await model.generate({ ...inputs, max_new_tokens: 1 });

    self.postMessage({ status: "ready" });
}

// Handle messages from main thread
self.addEventListener("message", async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case "load":
            load();
            break;

        case "generate":
            stoppingCriteria.reset();
            generate(data);
            break;

        case "interrupt":
            stoppingCriteria.interrupt();
            break;
    }
});
