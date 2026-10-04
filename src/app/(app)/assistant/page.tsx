"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, StopCircle, RefreshCcw, Sparkles, User, Bot, AlertTriangle, CloudRainWind } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

// Basic markdown parser for bold, italic, newlines
function parseMarkdown(text: string) {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong class='text-white'>$1</strong>") // Bold
    .replace(/\*(.*?)\*/g, "<em class='text-ink-2'>$1</em>")             // Italic
    .replace(/\n/g, "<br />");                       // Newlines
  return { __html: html };
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", role: "assistant", content: "Hello! I am AEGIS. I can analyze telemetry, monitor live weather models, and provide critical disaster management advice. How can I assist you today?" }
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
  }, [messages]);

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN"; // Use Indian English for better local accent recognition

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
        setMessages(JSON.parse(saved));
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
      recognitionRef.current.start();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (isListening) recognitionRef.current?.stop();

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
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
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#0b0c10] text-[#c5c6c7] font-sans relative overflow-hidden">
      
      {/* Premium Cinematic Background Elements removed for click fix */}

      {/* Modern Glass Header */}
      <header className="flex-none px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl z-20 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#66fcf1] to-[#45a29e] flex items-center justify-center shadow-[0_0_20px_rgba(102,252,241,0.3)]">
            <Sparkles className="h-5 w-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AEGIS AI
              <span className="px-2 py-0.5 rounded-full bg-[#66fcf1]/10 text-[#66fcf1] text-[10px] font-mono tracking-widest uppercase border border-[#66fcf1]/20">Pro</span>
            </h1>
            <p className="text-xs text-[#c5c6c7]/60 font-mono tracking-widest uppercase mt-0.5">Disaster Intelligence & Analytics</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const init = [{ id: "init", role: "assistant", content: "Hello! I am AEGIS. I can analyze telemetry, monitor live weather models, and provide critical disaster management advice. How can I assist you today?" }];
            setMessages(init as Message[]);
            sessionStorage.removeItem("aegis_chat_history");
          }} 
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300 text-white/50 hover:text-white group"
          title="Clear Chat"
        >
          <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 z-10 scroll-smooth" style={{ scrollbarWidth: 'thin', scrollbarColor: '#45a29e transparent' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            
            <div className={`flex gap-4 max-w-[90%] md:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              
              {/* Avatar */}
              <div className="flex-none mt-1">
                {msg.role === "assistant" ? (
                  <div className="h-8 w-8 rounded-full bg-[#1f2833] border border-[#45a29e]/30 flex items-center justify-center shadow-[0_0_10px_rgba(69,162,158,0.2)]">
                    <CloudRainWind className="h-4 w-4 text-[#66fcf1]" />
                  </div>
                ) : msg.role === "user" ? (
                  <div className="h-8 w-8 rounded-full bg-[#66fcf1] flex items-center justify-center shadow-[0_0_15px_rgba(102,252,241,0.4)]">
                    <User className="h-4 w-4 text-black" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div className={`p-5 rounded-2xl ${
                msg.role === "user" 
                  ? "bg-gradient-to-br from-[#1f2833] to-[#12161c] border border-white/5 text-white shadow-xl rounded-tr-sm" 
                  : msg.role === "system"
                  ? "bg-red-500/10 border border-red-500/30 text-red-200 rounded-tl-sm backdrop-blur-md"
                  : "bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-tl-sm text-[#c5c6c7]"
              }`}>
                <div 
                  className="text-[15px] leading-relaxed tracking-wide"
                  dangerouslySetInnerHTML={parseMarkdown(msg.content)}
                />
              </div>

            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-4">
              <div className="h-8 w-8 rounded-full bg-[#1f2833] border border-[#45a29e]/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#66fcf1] animate-pulse" />
              </div>
              <div className="p-5 rounded-2xl rounded-tl-sm bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-2xl">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#66fcf1] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#66fcf1] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#66fcf1] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* Premium Input Bar */}
      <div className="flex-none p-4 md:px-8 md:pb-8 md:pt-4 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
        <div className="max-w-4xl mx-auto">
          
          <div className={`relative flex items-end gap-2 bg-[#1f2833]/80 backdrop-blur-xl border ${isListening ? "border-[#66fcf1] shadow-[0_0_25px_rgba(102,252,241,0.2)]" : "border-white/10"} rounded-3xl p-2.5 px-3 transition-all duration-500 ease-out focus-within:border-white/30 focus-within:bg-[#1f2833] focus-within:shadow-[0_10px_40px_rgba(0,0,0,0.5)]`}>
            
            <button
              onClick={toggleListening}
              className={`p-3 mb-1 rounded-2xl flex-none transition-all duration-300 ${
                isListening 
                  ? "bg-[#66fcf1] text-black shadow-[0_0_20px_rgba(102,252,241,0.6)] animate-pulse scale-105" 
                  : "bg-white/5 text-white/50 hover:text-[#66fcf1] hover:bg-white/10"
              }`}
              title={isListening ? "Stop listening" : "Voice Input"}
            >
              {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={isListening ? "Listening to your voice..." : "Ask about weather, alerts, or emergency protocols..."}
              className="w-full bg-transparent border-none focus:outline-none resize-none text-[15px] text-white placeholder:text-white/30 py-3 px-1 max-h-32 leading-relaxed"
              style={{ scrollbarWidth: 'none' }}
              rows={Math.min(4, input.split("\n").length || 1)}
            />

            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-2xl bg-gradient-to-r from-[#66fcf1] to-[#45a29e] text-black disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(69,162,158,0.3)] flex-none h-[44px] w-[44px] flex items-center justify-center"
              >
                <Send size={18} className="translate-x-[1px]" />
              </button>
            </div>
            
          </div>
          
          {formError && <div className="text-center mt-2 text-red-400 text-[12px] font-semibold">{formError}</div>}
          <div className="text-center mt-3 text-[10px] uppercase font-mono tracking-widest text-white/30 flex items-center justify-center gap-2">
            {isListening ? (
              <span className="flex items-center gap-2 text-[#66fcf1]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#66fcf1] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#66fcf1]"></span>
                </span>
                Recording Active
              </span>
            ) : "AEGIS AI · Encrypted Telemetry · Verify Critical Alerts"}
          </div>

        </div>
      </div>
    </div>
  );
}
