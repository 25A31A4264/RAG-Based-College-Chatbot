"use client";

import { X, FileText, Bookmark, Percent, ExternalLink } from "lucide-react";

export interface SourceItem {
  chunkId: string;
  documentTitle: string;
  category: string;
  pageNumber?: number | null;
  sectionTitle?: string | null;
  snippet: string;
  relevanceScore: number;
}

interface SourceDrawerProps {
  sources: SourceItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function SourceDrawer({ sources, isOpen, onClose }: SourceDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl glass-panel border border-white/10 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Verified Grounding Sources</h3>
              <p className="text-xs text-slate-400">
                Official document chunks retrieved from pgvector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sources list */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-3 transition hover:border-indigo-500/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-sm text-slate-100">{src.documentTitle}</span>
                  <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300 border border-indigo-500/20">
                    {src.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {src.pageNumber && (
                    <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      Page {src.pageNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300 border border-emerald-500/20 font-mono font-medium">
                    <Percent className="h-3 w-3" />
                    {(src.relevanceScore * 100).toFixed(0)}% Match
                  </span>
                </div>
              </div>

              {src.sectionTitle && (
                <p className="text-xs font-medium text-indigo-300 italic">
                  Section: {src.sectionTitle}
                </p>
              )}

              <div className="rounded-lg bg-black/40 p-3 border border-white/5 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {src.snippet}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
          >
            Close Source Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
