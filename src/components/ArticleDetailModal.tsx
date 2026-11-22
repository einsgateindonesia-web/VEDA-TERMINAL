import React, { useEffect } from 'react';
import { ArticleItem, ThemeMode } from '../types';
import { X, ExternalLink, Bookmark, Copy, Check, Clock } from 'lucide-react';

interface ArticleDetailModalProps {
  article: ArticleItem | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (article: ArticleItem) => void;
  theme: ThemeMode;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  article,
  onClose,
  isBookmarked,
  onToggleBookmark,
  theme,
}) => {
  const [copied, setCopied] = React.useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(article.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatUtcDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toUTCString();
    } catch {
      return iso;
    }
  };

  const modalBg = isDark
    ? 'bg-black border-white text-white shadow-[0_0_40px_rgba(255,255,255,0.15)]'
    : 'bg-white border-black text-black shadow-2xl';

  const bodyBg = isDark
    ? 'bg-neutral-950 border-white/20 text-neutral-300'
    : 'bg-neutral-50 border-black/20 text-neutral-800';

  const hashBg = isDark
    ? 'bg-neutral-950 border-white/10 text-white/40'
    : 'bg-neutral-50 border-black/10 text-black/50';

  const divider = isDark ? 'border-white/20' : 'border-black/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono animate-fade-in">
      <div 
        className={`border rounded-none max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header telemetry */}
        <div className={`flex items-center justify-between pb-3 border-b text-xs font-mono ${divider}`}>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest">[ VEDA // DISPATCH INSPECTION ]</span>
            <span className={`inline-block w-1.5 h-2.5 animate-cursor-blink ${isDark ? 'bg-white' : 'bg-black'}`}></span>
          </div>

          <button
            onClick={onClose}
            className={`p-1 border border-transparent transition-colors cursor-pointer ${
              isDark ? 'hover:border-white text-white/60 hover:text-white' : 'hover:border-black text-black/60 hover:text-black'
            }`}
            title="Close [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unboxed Metadata */}
        <div className={`flex flex-wrap items-center gap-2 text-xs font-mono mt-4 ${isDark ? 'text-white/60' : 'text-black/60'}`}>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>{article.sourceName}</span>
          <span aria-hidden="true" className="opacity-30">/</span>
          <span className="uppercase opacity-80">{article.category}</span>
          <span aria-hidden="true" className="opacity-30">/</span>
          <span className="flex items-center gap-1 tabular-nums opacity-60">
            <Clock className="w-3 h-3 opacity-60" />
            {formatUtcDate(article.publishedAt)}
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-bold mt-3 leading-snug font-sans">
          {article.title}
        </h2>

        {/* Summary Body */}
        <div className={`mt-5 p-4 border text-sm leading-relaxed font-sans ${bodyBg}`}>
          {article.summary ? (
            <p className="whitespace-pre-line">{article.summary}</p>
          ) : (
            <p className="italic opacity-50">
              Ringkasan artikel tidak disertakan dalam sinyal RSS. Silakan buka tautan sumber resmi di bawah untuk membaca artikel lengkap.
            </p>
          )}
        </div>

        {/* Telemetry hash */}
        <div className={`mt-4 p-2.5 border text-[10px] font-mono truncate ${hashBg}`}>
          <span className="font-semibold opacity-70">[ SHA256 HASH ]: </span>
          <span className="opacity-90">{article.hashId}</span>
        </div>

        {/* Action Buttons */}
        <div className={`mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${divider}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(article)}
              className={`px-3 py-1.5 border flex items-center gap-1.5 transition-colors cursor-pointer font-bold ${
                isBookmarked
                  ? isDark
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-white border-black'
                  : isDark
                  ? 'bg-black border-white/30 text-white/70 hover:text-white hover:border-white'
                  : 'bg-white border-black/30 text-black/70 hover:text-black hover:border-black'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{isBookmarked ? '[ SAVED ]' : '[ SAVE DISPATCH ]'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-black border-white/30 text-white/70 hover:text-white hover:border-white'
                  : 'bg-white border-black/30 text-black/70 hover:text-black hover:border-black'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '[ COPIED ]' : '[ COPY LINK ]'}</span>
            </button>
          </div>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isDark
                ? 'bg-white hover:bg-neutral-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'bg-black hover:bg-neutral-800 text-white shadow-sm'
            }`}
          >
            <span>OPEN ORIGINAL SOURCE</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
