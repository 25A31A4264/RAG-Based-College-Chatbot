"use client";

import { X, Layers, Hash, BookOpen } from "lucide-react";

interface ChunkViewerModalProps {
  document: {
    id: string;
    title: string;
    category: string;
    chunks: {
      id: string;
      chunkIndex: number;
      pageNumber?: number | null;
      sectionTitle?: string | null;
      tokenCount: number;
      content: string;
    }[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChunkViewerModal({ document, isOpen, onClose }: ChunkViewerModalProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl glass-panel border border-white/10 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Indexed Chunks: {document.title}
              </h3>
              <p className="text-xs text-slate-400">
                {document.chunks.length} total chunks stored in pgvector ({document.category})
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

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {document.chunks.map((chunk) => (
            <div
              key={chunk.id}
              className="rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 font-mono font-medium text-purple-300 border border-purple-500/20">
                    <Hash className="h-3 w-3" /> Chunk #{chunk.chunkIndex + 1}
                  </span>
                  {chunk.sectionTitle && (
                    <span className="text-indigo-300 font-medium truncate max-w-xs">
                      {chunk.sectionTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  {chunk.pageNumber && <span>Page {chunk.pageNumber}</span>}
                  <span>~{chunk.tokenCount} tokens</span>
                </div>
              </div>

              <div className="rounded-lg bg-black/40 p-3 border border-white/5 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {chunk.content}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
