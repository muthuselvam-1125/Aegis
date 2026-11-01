"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { Send, Mic, StopCircle, RefreshCcw, Sparkles, User, AlertTriangle, CloudRainWind, Compass } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

// Inline markdown span parser (bold, italic, inline code)
function renderInlineSpans(text: string): ReactNode {
  const parts: ReactNode[] = [];
  // Tokenize regex for **bold**, `code`, *italic*
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const segments = text.split(tokenRegex);

  segments.forEach((seg, idx) => {
    if (!seg) return;
    if (seg.startsWith("**") && seg.endsWith("**")) {
      parts.push(
        <strong key={idx} className="font-semibold text-ink">
          {seg.slice(2, -2)}
        </strong>
      );
    } else if (seg.startsWith("`") && seg.endsWith("`")) {
      parts.push(
        <code key={idx} className="rounded border border-line bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-ink">
          {seg.slice(1, -1)}
        </code>
      );
    } else if (seg.startsWith("*") && seg.endsWith("*")) {
      parts.push(
        <em key={idx} className="italic text-ink-2">
          {seg.slice(1, -1)}
        </em>
      );
    } else {
      parts.push(seg);
    }
  });

  return parts;
}

// Structured, token-safe markdown renderer
function renderFormattedContent(text: string, isUser: boolean) {
  if (isUser) {
    return <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</div>;
  }

  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let codeBlockLines: string[] | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === "ul") {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-0.5">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-live" />
                <span className="flex-1">{renderInlineSpans(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-0.5">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed text-ink-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-surface-3 font-mono text-[10px] font-bold text-ink">
                  {idx + 1}
                </span>
                <span className="flex-1">{renderInlineSpans(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const flushCodeBlock = () => {
    if (codeBlockLines !== null) {
      elements.push(
        <pre key={`code-${elements.length}`} className="my-2.5 overflow-x-auto rounded border border-line bg-surface-3 p-3 font-mono text-xs text-ink">
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
      codeBlockLines = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code block fence ```
    if (trimmed.startsWith("```")) {
      if (codeBlockLines !== null) {
        flushCodeBlock();
      } else {
        flushList();
        codeBlockLines = [];
      }
      continue;
    }

    if (codeBlockLines !== null) {
      codeBlockLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet item (- or * or •)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered item (1. or 2.)
    const numberMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numberMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Regular line -> flush list
    flushList();

    // Headings (### Header or ## Header or # Header)
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      elements.push(
        <h4 key={`h-${elements.length}`} className="mb-1 mt-3 font-display text-base font-semibold text-ink">
          {renderInlineSpans(headerMatch[1])}
        </h4>
      );
      continue;
    }

    // Standalone bold line acting as section title
    const boldHeaderMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
    if (boldHeaderMatch) {
      elements.push(
        <div key={`bh-${elements.length}`} className="mb-1 mt-2.5 font-sans text-sm font-bold text-ink">
          {boldHeaderMatch[1]}
        </div>
      );
      continue;
    }

    // Callout / Warning box
    if (trimmed.startsWith("⚠️") || trimmed.startsWith("[WARNING]") || trimmed.startsWith("Warning:")) {
      elements.push(
        <div key={`alert-${elements.length}`} className="my-2 rounded border border-warning/40 bg-warning/10 p-2.5 text-xs text-ink leading-relaxed">
          {renderInlineSpans(trimmed)}
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${elements.length}`} className="my-1 text-sm leading-relaxed text-ink-2">
        {renderInlineSpans(trimmed)}
      </p>
    );
  }

  flushList();
  flushCodeBlock();

  return <div className="space-y-0.5">{elements}</div>;
}

const QUICK_PROMPTS = [
  { label: "🌤️ Weather at my place", prompt: "How is the current weather and air quality at my saved location?" },
  { label: "🌧️ Rainfall forecast", prompt: "What is the rainfall forecast for the coming days?" },
  { label: "🚨 Active warnings", prompt: "Are there any active disaster or weather warnings right now?" },
  { label: "📉 Recent earthquakes", prompt: "What was the most recent earthquake in India?" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I am AEGIS, your Disaster & Hazard Intelligence Assistant. I am grounded in live meteorological telemetry, official warnings, and seismic records. How can I help you today?"
    }
  ]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [formError, setFormError] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (e: any) => {
          console.error("Speech recognition error", e);
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }
          if (finalTranscript) {
            setInput((prev) => (prev + " " + finalTranscript).trim());
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Load chat history from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("aegis_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Failed to parse chat history");
      }
    }
    setIsInitialized(true);
  }, []);

  // Save chat history on every message update
  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem("aegis_chat_history", JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        setFormError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
        return;
      }
      setFormError("");
      recognitionRef.current.start();
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;
    
    if (isListening) recognitionRef.current?.stop();

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}: Failed to connect to AI`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantMsg = "";
      const msgId = "msg-" + Date.now();
      
      setMessages((prev) => [...prev, { id: msgId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMsg += decoder.decode(value, { stream: true });
        
        setMessages((prev) => 
          prev.map((msg) => msg.id === msgId ? { ...msg, content: assistantMsg } : msg)
        );
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "system", content: "Error: " + (err.message || "An error occurred connecting to AEGIS.") }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-3.5rem)] bg-paper text-ink font-sans relative overflow-hidden">
      
      {/* Header */}
      <header className="flex-none px-4 md:px-6 py-3 border-b border-line bg-surface/90 backdrop-blur-md z-20 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-line bg-surface-2 flex items-center justify-center text-live shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              AEGIS AI
              <span className="px-1.5 py-0.5 rounded bg-live/10 text-live text-[10px] font-mono tracking-wider uppercase border border-live/20">Telemetry Guard</span>
            </h1>
            <p className="text-xs text-muted font-mono tracking-tight">Disaster Intelligence · Grounded Telemetry</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const init: Message[] = [{
              id: "init",
              role: "assistant",
              content: "Hello! I am AEGIS, your Disaster & Hazard Intelligence Assistant. I am grounded in live meteorological telemetry, official warnings, and seismic records. How can I help you today?"
            }];
            setMessages(init);
            sessionStorage.removeItem("aegis_chat_history");
          }} 
          className="p-2 rounded border border-line bg-surface hover:bg-surface-2 transition-colors text-ink-2 hover:text-ink group"
          title="Clear Conversation History"
          aria-label="Clear chat"
        >
          <RefreshCcw size={15} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 z-10 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-300`}>
            
            <div className={`flex gap-3 max-w-[92%] md:max-w-[78%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              
              {/* Avatar */}
              <div className="flex-none mt-1">
                {msg.role === "assistant" ? (
                  <div className="h-7 w-7 rounded-full border border-line bg-surface-2 flex items-center justify-center text-live shadow-xs">
                    <CloudRainWind className="h-3.5 w-3.5" />
                  </div>
                ) : msg.role === "user" ? (
                  <div className="h-7 w-7 rounded-full border border-line bg-surface-3 flex items-center justify-center text-ink shadow-xs">
                    <User className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full border border-warning/40 bg-warning/10 flex items-center justify-center text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div className={`p-4 rounded-xl border ${
                msg.role === "user" 
                  ? "bg-surface-2 border-line text-ink rounded-tr-xs shadow-xs" 
                  : msg.role === "system"
                  ? "bg-warning/10 border-warning/30 text-ink rounded-tl-xs"
                  : "bg-surface border-line text-ink rounded-tl-xs shadow-xs"
              }`}>
                {renderFormattedContent(msg.content, msg.role === "user")}
              </div>

            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start w-full animate-in fade-in duration-200">
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full border border-line bg-surface-2 flex items-center justify-center text-live">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-xl rounded-tl-xs border border-line bg-surface flex items-center gap-2 shadow-xs">
                <div className="flex gap-1.5 items-center">
                  <span className="text-xs text-muted font-mono mr-1">Querying telemetry</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-live animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-live animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-live animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion Chips (when only greeting is shown) */}
        {messages.length <= 1 && !isLoading && (
          <div className="pt-2 pb-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
              <Compass size={13} className="text-live" /> Suggested Inquiries
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp.prompt)}
                  className="text-left text-xs p-2.5 rounded-lg border border-line bg-surface hover:bg-surface-2 text-ink-2 hover:text-ink transition-colors shadow-2xs flex items-center justify-between group"
                >
                  <span>{qp.label}</span>
                  <span className="text-muted group-hover:text-live text-[11px] font-mono">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Input Bar Container */}
      <div className="flex-none p-3 md:px-6 md:pb-5 md:pt-3 bg-surface/90 border-t border-line backdrop-blur-md z-20">
        <div className="max-w-4xl mx-auto pr-14 md:pr-16 lg:pr-0">
          
          <div className={`relative flex items-end gap-2 bg-surface-2 border ${isListening ? "border-live shadow-[0_0_15px_rgba(207,122,18,0.25)]" : "border-line"} rounded-2xl p-2 px-3 transition-all focus-within:border-line-strong focus-within:ring-1 focus-within:ring-live/20`}>
            
            <button
              onClick={toggleListening}
              className={`p-2.5 mb-0.5 rounded-xl flex-none transition-all ${
                isListening 
                  ? "bg-live text-paper shadow-xs animate-pulse scale-105" 
                  : "bg-surface text-muted hover:text-ink hover:bg-surface-3 border border-line"
              }`}
              title={isListening ? "Stop listening" : "Voice Input"}
              aria-label={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <StopCircle size={18} /> : <Mic size={18} />}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening to your voice..." : "Ask about weather, rainfall, active warnings, or seismic activity..."}
              className="w-full bg-transparent border-none focus:outline-none resize-none text-sm text-ink placeholder:text-muted py-2.5 px-1 max-h-32 leading-relaxed"
              style={{ scrollbarWidth: "none" }}
              rows={Math.min(4, input.split("\n").length || 1)}
            />

            <div className="flex items-center gap-2 mb-0.5">
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-live text-paper font-semibold disabled:opacity-30 disabled:grayscale hover:opacity-90 active:scale-95 transition-all shadow-2xs flex-none h-[40px] w-[40px] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                title="Send message"
                aria-label="Send message"
              >
                <Send size={16} className="translate-x-[0.5px]" />
              </button>
            </div>
            
          </div>
          
          {formError && <div className="text-center mt-1.5 text-warning text-xs font-semibold">{formError}</div>}
          <div className="text-center mt-2 text-[10px] uppercase font-mono tracking-wider text-muted flex items-center justify-center gap-2 pb-0.5">
            {isListening ? (
              <span className="flex items-center gap-1.5 text-live">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
                </span>
                Voice Recording Active
              </span>
            ) : "AEGIS AI · Grounded Telemetry · Token-Capped Engine"}
          </div>

        </div>
      </div>
    </div>
  );
}
