import React, { useState } from 'react';
import { SourceItem, ThemeMode } from '../types';
import { Search, Plus, Download, Power, ExternalLink, Trash2 } from 'lucide-react';

interface SourceMatrixProps {
  sources: SourceItem[];
  onToggleActive: (source: SourceItem) => Promise<void>;
  onDeleteCustomSource?: (sourceId: string) => Promise<void>;
  onOpenAddModal: () => void;
  onRefresh: () => void;
  theme: ThemeMode;
}

export const SourceMatrix: React.FC<SourceMatrixProps> = ({
  sources,
  onToggleActive,
  onDeleteCustomSource,
  onOpenAddModal,
  theme,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ONLINE' | 'ERROR'>('all');

  const isDark = theme === 'dark';
  const categories = ['all', 'indonesia', 'world', 'technology', 'economy', 'science', 'defense', 'cyber'];

  const filtered = sources.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || s.category.toLowerCase() === selectedCategory;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ONLINE' && s.lastStatus === 'ONLINE') ||
      (statusFilter === 'ERROR' && s.lastStatus === 'ERROR');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalOnline = sources.filter((s) => s.active && s.lastStatus === 'ONLINE').length;

  const panelBg = isDark ? 'bg-black border-white/20 text-white' : 'bg-white border-black/20 text-black shadow-sm';
  const inputBg = isDark
    ? 'bg-neutral-950 border-white/20 text-white placeholder-white/40 focus:border-white'
    : 'bg-neutral-50 border-black/20 text-black placeholder-black/40 focus:border-black';
  const headerBg = isDark ? 'bg-neutral-950 border-white/20 text-white/60' : 'bg-neutral-100 border-black/20 text-black/60';
  const divider = isDark ? 'divide-white/10' : 'divide-black/10';
  const hoverRow = isDark ? 'hover:bg-neutral-950' : 'hover:bg-neutral-50';

  const handleExportOpml = () => {
    const escapeXml = (unsafe: string) =>
      unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '&':
            return '&amp;';
          case "'":
            return '&apos;';
          case '"':
            return '&quot;';
          default:
            return c;
        }
      });

    const outlines = sources
      .map(
        (s) =>
          `    <outline text="${escapeXml(s.name)}" title="${escapeXml(s.name)}" type="rss" xmlUrl="${escapeXml(
            s.url
          )}" htmlUrl="" category="${escapeXml(s.category)}"/>`
      )
      .join('\n');

    const opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head>\n    <title>VEDA News Intelligence Feeds</title>\n    <dateCreated>${new Date().toUTCString()}</dateCreated>\n    <docs>http://opml.org/spec2.opml</docs>\n  </head>\n  <body>\n${outlines}\n  </body>\n</opml>`;

    const blob = new Blob([opml], { type: 'text/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'veda_feeds.opml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Controls Bar */}
      <div className={`border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${panelBg}`}>
        <div className="flex-1 max-w-md relative">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/50' : 'text-black/50'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="FILTER NODES OR RSS URLS..."
            className={`w-full border pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors font-mono ${inputBg}`}
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={onOpenAddModal}
            className={`px-3 py-2 font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-black hover:bg-neutral-800 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>[ + REGISTER RSS NODE ]</span>
          </button>

          <button
            type="button"
            onClick={handleExportOpml}
            className={`px-3 py-2 border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark ? 'bg-black border-white/30 hover:border-white text-white' : 'bg-white border-black/30 hover:border-black text-black'
            }`}
            title="Export all feeds as standard OPML XML"
          >
            <Download className="w-3.5 h-3.5" />
            <span>[ EXPORT OPML ]</span>
          </button>
        </div>
      </div>

      {/* Category & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 transition-colors whitespace-nowrap uppercase cursor-pointer border ${
                selectedCategory === cat
                  ? isDark
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-black text-white font-bold border-black'
                  : isDark
                  ? 'text-white/60 hover:text-white bg-black border-white/20 hover:border-white/50'
                  : 'text-black/60 hover:text-black bg-white border-black/20 hover:border-black/50'
              }`}
            >
              [ {cat === 'all' ? 'ALL SECTORS' : cat} ]
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-black/50'}`}>FILTER:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 text-[11px] border cursor-pointer ${
              statusFilter === 'all'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'border-white/20 text-white/60'
                : 'border-black/20 text-black/60'
            }`}
          >
            ALL ({sources.length})
          </button>
          <button
            onClick={() => setStatusFilter('ONLINE')}
            className={`px-2 py-1 text-[11px] border cursor-pointer ${
              statusFilter === 'ONLINE'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'border-white/20 text-white/60'
                : 'border-black/20 text-black/60'
            }`}
          >
            ONLINE ({totalOnline})
          </button>
          <button
            onClick={() => setStatusFilter('ERROR')}
            className={`px-2 py-1 text-[11px] border cursor-pointer ${
              statusFilter === 'ERROR'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'border-white/20 text-white/60'
                : 'border-black/20 text-black/60'
            }`}
          >
            ERR ({sources.filter((s) => s.lastStatus === 'ERROR').length})
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className={`border overflow-hidden ${panelBg}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className={`border-b uppercase tracking-wider text-[11px] ${headerBg}`}>
              <tr>
                <th className="py-2.5 px-4">Node / Source</th>
                <th className="py-2.5 px-4">Sector</th>
                <th className="py-2.5 px-4">Lang</th>
                <th className="py-2.5 px-4">Telemetry</th>
                <th className="py-2.5 px-4">Articles</th>
                <th className="py-2.5 px-4 text-center">Power</th>
                <th className="py-2.5 px-4 text-right">Endpoint</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divider}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-8 text-center ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                    NO MATCHING INTEL NODES FOUND.
                  </td>
                </tr>
              ) : (
                filtered.map((src) => (
                  <tr key={src.id} className={`transition-colors ${hoverRow} ${!src.active ? 'opacity-30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-sans text-sm ${isDark ? 'text-white' : 'text-black'}`}>
                          {src.name}
                        </span>
                        {src.isCloudCustom && (
                          <span className={`text-[10px] font-mono opacity-70`}>[ CLOUD ]</span>
                        )}
                      </div>
                      <div className={`text-[10px] truncate max-w-[260px] ${isDark ? 'text-white/40' : 'text-black/50'}`}>
                        {src.description || src.id}
                      </div>
                    </td>

                    <td className={`py-3 px-4 uppercase font-bold ${isDark ? 'text-white/80' : 'text-black/80'}`}>
                      {src.category}
                    </td>

                    <td className={`py-3 px-4 uppercase ${isDark ? 'text-white/60' : 'text-black/60'}`}>
                      {src.language}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {src.lastStatus === 'ONLINE' ? (
                          <>
                            <span className="font-bold">[ ONLINE ]</span>
                            {src.latencyMs ? (
                              <span className={`tabular-nums ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                                ({src.latencyMs}ms)
                              </span>
                            ) : null}
                          </>
                        ) : src.lastStatus === 'ERROR' ? (
                          <span
                            className={`font-bold border px-1 text-[10px] ${
                              isDark ? 'text-white/80 border-white/40' : 'text-black/80 border-black/40'
                            }`}
                          >
                            [ ERROR ]
                          </span>
                        ) : (
                          <span className="opacity-40">[ STANDBY ]</span>
                        )}
                      </div>
                      {src.lastError && (
                        <div className={`text-[10px] truncate max-w-[180px] ${isDark ? 'text-white/40' : 'text-black/40'}`} title={src.lastError}>
                          {src.lastError}
                        </div>
                      )}
                    </td>

                    <td className={`py-3 px-4 tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>
                      {src.articleCount ? src.articleCount.toLocaleString() : '0'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleActive(src)}
                          className={`p-1.5 border transition-colors cursor-pointer ${
                            src.active
                              ? isDark
                                ? 'bg-white text-black border-white'
                                : 'bg-black text-white border-black'
                              : isDark
                              ? 'border-white/20 text-white/40 hover:text-white hover:border-white'
                              : 'border-black/20 text-black/40 hover:text-black hover:border-black'
                          }`}
                          title={src.active ? 'Disable Feed' : 'Enable Feed'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        {src.isCloudCustom && onDeleteCustomSource && (
                          <button
                            onClick={() => onDeleteCustomSource(src.id)}
                            className={`p-1.5 border transition-colors cursor-pointer ${
                              isDark
                                ? 'border-white/20 text-white/60 hover:text-white hover:border-white'
                                : 'border-black/20 text-black/60 hover:text-black hover:border-black'
                            }`}
                            title="Remove Cloud Custom Feed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 hover:underline ${
                          isDark ? 'text-white/80 hover:text-white' : 'text-black/80 hover:text-black'
                        }`}
                        title={src.url}
                      >
                        <span className="truncate max-w-[130px]">{src.url.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
