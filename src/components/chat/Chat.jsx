import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { MathJaxContext, MathJax } from "better-react-mathjax";

function render(text) {
    if (!text) return "";
    text = text.replace(/\\([\[\]\(\)])/g, "\\\\$1");
    const result = DOMPurify.sanitize(
        marked.parse(text, {
            async: false,
            breaks: true,
        }),
    );
    return result;
}

function Message({ role, content, thought }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand when thought starts
    useEffect(() => {
        if (thought && thought.length > 0) {
            setIsExpanded(true);
        }
    }, [!!thought]);

    const isThinking = thought && thought.length > 0 && (!content || content.length === 0);

    if (role === "user") {
        return (
            <div className="border-l-2 border-zinc-700 pl-4 py-1">
                <p className="text-lg leading-relaxed text-zinc-100">
                    {content}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Thinking Block */}
            {thought && thought.length > 0 && (
                <div className="rounded-sm border border-zinc-800 bg-zinc-900/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[10px] font-bold text-yellow-500 uppercase tracking-tighter flex items-center gap-2 hover:text-yellow-400 transition-colors"
                        >
                            <div className={`h-1.5 w-1.5 rounded-full bg-yellow-500 ${isThinking ? "animate-pulse" : ""}`}></div>
                            {isThinking ? "Processing Thought Chain..." : "Thought Chain Complete"}
                            <span className="text-zinc-600 ml-2 uppercase text-[9px] tracking-widest">{isExpanded ? "Hide" : "Show"}</span>
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="text-xs leading-relaxed text-zinc-500 italic font-mono">
                            <MathJax dynamic>
                                <span
                                    className="markdown"
                                    dangerouslySetInnerHTML={{
                                        __html: render(thought),
                                    }}
                                />
                            </MathJax>
                            {isThinking && <span className="inline-block w-2 h-4 bg-yellow-500/50 animate-caret align-middle ml-1"></span>}
                        </div>
                    )}
                    {!isExpanded && (
                        <p className="text-xs leading-relaxed text-zinc-600 italic truncate font-mono">
                            {thought.slice(0, 50)}...
                        </p>
                    )}
                </div>
            )}

            {/* Answer Block */}
            {(content.length > 0 || !thought) && (
                <div className="text-base text-zinc-300 leading-relaxed font-sans">
                    <MathJax dynamic>
                        <span
                            className="markdown prose prose-invert prose-zinc max-w-none"
                            dangerouslySetInnerHTML={{
                                __html: render(content),
                            }}
                        />
                    </MathJax>

                    {/* Fallback loading indicator if no thought and no answer yet */}
                    {!thought && !content && (
                        <div className="flex gap-1 h-4 items-center">
                            <div className="w-1 bg-yellow-500 animate-[wave_0.5s_infinite]"></div>
                            <div className="w-1 bg-yellow-500 animate-[wave_0.8s_infinite]"></div>
                            <div className="w-1 bg-yellow-500 animate-[wave_0.6s_infinite]"></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Chat({ messages, isGenerating }) {
    const empty = messages.length === 0;

    return (
        <div className="w-full">
            <MathJaxContext>
                {empty ? (
                    <div className="flex flex-col items-center justify-center opacity-50 py-10">
                        <div className="text-yellow-500 mb-4 opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 256 256"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7L40.12,130.83a8,8,0,0,0,5,13.65l57.6,11.61L88.06,229.43a8,8,0,0,0,13.69,7l114-120.26A8,8,0,0,0,215.79,118.17Z"></path></svg>
                        </div>
                        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">System Ready. Awaiting Input.</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {messages.map((msg, i) => <Message key={`message-${i}`} {...msg} />)}
                    </div>
                )}
            </MathJaxContext>
        </div>
    );
}
