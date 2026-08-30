"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Send,
  PlusCircle,
  MessageSquare,
  Trash2,
  Sparkles,
  Loader2,
  Filter,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { MessageItem, ChatMessage } from "./MessageItem";
import { SuggestedQuestions } from "./SuggestedQuestions";

const CATEGORIES = ["All Categories", "Academics", "Hostel", "Fees & Scholarships", "Placements", "General"];

export function ChatInterface() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load conversations for logged-in user
  useEffect(() => {
    if (session?.user) {
      loadConversations();
    }
  }, [session]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        if (conv && conv.messages) {
          const mapped: ChatMessage[] = conv.messages.map((m: any) => ({
            id: m.id,
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
            feedback: m.feedback?.rating || null,
            sources: (m.sources || []).map((s: any) => ({
              chunkId: s.documentChunkId,
              documentTitle: s.documentChunk?.document?.title || "College Document",
              category: s.documentChunk?.document?.category || "General",
              pageNumber: s.documentChunk?.pageNumber,
              sectionTitle: s.documentChunk?.sectionTitle,
              snippet: s.snippet,
              relevanceScore: s.relevanceScore,
            })),
          }));
          setMessages(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput("");

    // Add user message optimistically
    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const categoryParam = selectedCategory === "All Categories" ? undefined : selectedCategory;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          conversationId: activeConvId,
          category: categoryParam,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const botMsg: ChatMessage = {
        id: data.messageId,
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        usedFallback: data.usedFallback,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.conversationId && data.conversationId !== activeConvId) {
        setActiveConvId(data.conversationId);
        loadConversations();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, an error occurred while querying the college knowledge base. Please try again.",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Sidebar - Conversation History */}
      <div
        className={`relative flex flex-col border-r border-white/10 bg-slate-950/70 transition-all duration-300 ${
          sidebarOpen ? "w-72" : "w-0"
        } shrink-0 overflow-hidden`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <button
            onClick={startNewChat}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 px-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition"
          >
            <PlusCircle className="h-4 w-4" />
            New Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Past Questions
          </div>
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              No conversations yet. Ask a question to begin!
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${
                  activeConvId === conv.id
                    ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/30"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Chat Header / Controls */}
        <div className="h-14 border-b border-white/10 bg-slate-950/40 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Campus AI Assistant</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Grounded RAG Online
              </span>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center text-center space-y-6 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome to College AI Assistant
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Ask any questions regarding academic regulations, hostel policies, exams, grading, scholarships, or placements.
                </p>
              </div>

              <SuggestedQuestions onSelect={(q) => handleSendMessage(q)} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, idx) => (
                <MessageItem key={idx} message={msg} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 justify-start">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white animate-pulse">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="rounded-2xl p-4 glass-card border border-white/10 text-xs text-indigo-300 flex items-center gap-2">
                    <span>Searching official documents & synthesizing answer...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 backdrop-blur-md">
          <div className="max-w-3xl mx-auto flex items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about attendance rules, hostel curfews, exam schedules, scholarships..."
                disabled={isLoading}
                className="w-full rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10 shadow-inner"
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition shrink-0"
              title="Send question"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <div className="max-w-3xl mx-auto mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>RAG pipeline: pgvector similarity retrieval + anti-hallucination guard</span>
            <span>Zero hallucination policy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
