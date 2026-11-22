import React from 'react';
import { ArticleItem, DisplayMode, ThemeMode } from '../types';
import { ExternalLink, Bookmark, Clock, ArrowUpRight } from 'lucide-react';

interface ArticleCardProps {
  article: ArticleItem;
  mode: DisplayMode;
  onSelect: (article: ArticleItem) => void;
  isBookmarked: boolean;
  onToggleBookmark: (article: ArticleItem) => void;
  theme: ThemeMode;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  mode,
  onSelect,
  isBookmarked,
  onToggleBookmark,
  theme,
}) => {
  const isDark = theme === 'dark';

  const getRelativeTimeInfo = (iso: string) => {
    try {
      const pubTime = new Date(iso).getTime();
      const diff = Math.max(0, Date.now() - pubTime);
      const isFresh = diff < 2 * 60 * 60 * 1000;
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 60) return { label: `${mins}M AGO`, isFresh };
      const hours = Math.floor(mins / 60);
      if (hours < 24) return { label: `${hours}H AGO`, isFresh };
      const days = Math.floor(hours / 24);
      return { label: `${days}D AGO`, isFresh: false };
    } catch {
      return { label: 'RECENT', isFresh: false };
    }
  };

  const { label: timeLabel, isFresh } = getRelativeTimeInfo(article.publishedAt);

  if (mode === 'stream') {
    return (
      <div
        className={`group border-b transition-colors py-3 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono ${
          isDark
            ? 'border-white/10 hover:bg-neutral-950 text-white'
            : 'border-black/10 hover:bg-neutral-100 text-black'
        }`}
      >
        <div className="flex-1 min-w-0 pr-4">
          {/* Unboxed metadata line with typographic separators */}
          <div className={`flex items-center gap-2 text-[11px] mb-1 ${isDark ? 'text-white/50' : 'text-black/50'}`}>
            <span className={`font-bold ${isDark ? 'text-white' : 'text-black'}`}>{article.sourceName}</span>
            <span aria-hidden="true" className={isDark ? 'text-white/30' : 'text-black/30'}>/</span>
            <span className={`uppercase tracking-wider ${isDark ? 'text-white/80' : 'text-black/80'}`}>
              {article.category}
            </span>
            <span aria-hidden="true" className={isDark ? 'text-white/30' : 'text-black/30'}>/</span>
            <span className={`tabular-nums flex items-center gap-1 ${isDark ? 'text-white/70' : 'text-black/70'}`}>
              <Clock className={`w-2.5 h-2.5 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
              {timeLabel}
            </span>
            {isFresh && (
              <span className={`font-bold px-1 text-[9px] tracking-wider ml-1 ${
                isDark ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                NEW
              </span>
            )}
          </div>

          <button
            onClick={() => onSelect(article)}
            className={`text-left font-sans font-medium transition-colors line-clamp-1 cursor-pointer focus:outline-none text-sm hover:underline ${
              isDark ? 'text-white' : 'text-black'
            }`}
          >
            {article.title}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article);
            }}
            className={`p-1.5 border transition-colors cursor-pointer ${
              isBookmarked
                ? isDark
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-black'
                : isDark
                ? 'border-white/20 text-white/50 hover:text-white hover:border-white'
                : 'border-black/20 text-black/50 hover:text-black hover:border-black'
            }`}
            title={isBookmarked ? 'Saved to memory' : 'Save to memory'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`p-1.5 border transition-colors cursor-pointer ${
              isDark
                ? 'border-white/20 hover:border-white text-white/50 hover:text-white'
                : 'border-black/20 hover:border-black text-black/50 hover:text-black'
            }`}
            title="Open original dispatch"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Grid Mode Card
  const cardBg = isDark
    ? 'bg-black border-white/20 hover:border-white text-white'
    : 'bg-white border-black/20 hover:border-black text-black shadow-sm';

  const crosshair = isDark ? 'text-white/30' : 'text-black/30';
  const metaMuted = isDark ? 'text-white/50' : 'text-black/50';
  const metaCategory = isDark ? 'text-white/80' : 'text-black/80';
  const bodyText = isDark ? 'text-white/60' : 'text-black/70';
  const divider = isDark ? 'border-white/10' : 'border-black/10';

  return (
    <div className={`border transition-all duration-150 p-4 flex flex-col justify-between group relative ${cardBg}`}>
      {/* Anime corner crosshairs */}
      <div className={`absolute top-1 left-1 text-[8px] font-mono ${crosshair}`}>+</div>
      <div className={`absolute top-1 right-1 text-[8px] font-mono ${crosshair}`}>+</div>
      <div className={`absolute bottom-1 left-1 text-[8px] font-mono ${crosshair}`}>+</div>
      <div className={`absolute bottom-1 right-1 text-[8px] font-mono ${crosshair}`}>+</div>

      <div>
        {/* Unboxed Metadata Strip */}
        <div className={`flex items-center justify-between text-[11px] mb-2 font-mono ${metaMuted}`}>
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className={`font-bold truncate max-w-[130px] ${isDark ? 'text-white' : 'text-black'}`}>
              {article.sourceName}
            </span>
            <span aria-hidden="true" className={crosshair}>/</span>
            <span className={`uppercase tracking-wider ${metaCategory}`}>
              {article.category}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isFresh && (
              <span className={`font-bold px-1 text-[9px] tracking-wider ${
                isDark ? 'bg-white text-black' : 'bg-black text-white'
              }`}>
                NEW
              </span>
            )}
            <span className={`tabular-nums ${isDark ? 'text-white/60' : 'text-black/60'}`}>
              {timeLabel}
            </span>
          </div>
        </div>

        {/* Primary Headline */}
        <button
          onClick={() => onSelect(article)}
          className={`text-left font-sans font-bold transition-colors line-clamp-2 text-base leading-snug cursor-pointer focus:outline-none mb-2 hover:underline ${
            isDark ? 'text-white' : 'text-black'
          }`}
        >
          {article.title}
        </button>

        {/* Excerpt Summary */}
        <p className={`text-xs line-clamp-3 leading-relaxed mb-4 font-sans ${bodyText}`}>
          {article.summary || 'Summary unavailable from RSS transmission. Click dispatch to inspect full telemetry and external link.'}
        </p>
      </div>

      {/* Card Action Footer */}
      <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono ${divider}`}>
        <button
          onClick={() => onSelect(article)}
          className={`px-2 py-1 border transition-colors flex items-center gap-1 text-[10px] tracking-wider cursor-pointer font-bold ${
            isDark
              ? 'text-white hover:bg-white hover:text-black border-white/30'
              : 'text-black hover:bg-black hover:text-white border-black/30'
          }`}
        >
          <span>INSPECT INTEL</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleBookmark(article)}
            className={`p-1.5 border transition-colors cursor-pointer ${
              isBookmarked
                ? isDark
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-black'
                : isDark
                ? 'border-white/20 text-white/50 hover:text-white hover:border-white'
                : 'border-black/20 text-black/50 hover:text-black hover:border-black'
            }`}
            title={isBookmarked ? 'Remove from saved' : 'Save dispatch'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-1.5 border transition-colors cursor-pointer ${
              isDark
                ? 'border-white/20 hover:border-white text-white/50 hover:text-white'
                : 'border-black/20 hover:border-black text-black/50 hover:text-black'
            }`}
            title="Read at original source"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
