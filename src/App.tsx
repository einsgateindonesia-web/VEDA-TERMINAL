/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { TacticalStats } from './components/TacticalStats';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { SourceMatrix } from './components/SourceMatrix';
import { ExecutionLogs } from './components/ExecutionLogs';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { AddSourceModal } from './components/AddSourceModal';
import { ArticleItem, SourceItem, SystemStats, FetchLog, ViewTab, DisplayMode, ThemeMode } from './types';
import { 
  Search, 
  LayoutGrid, 
  ListFilter, 
  Bookmark, 
  RefreshCw, 
  Radio,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('feed');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');

  // Theme Mode: Dark (Default Anime Noir) vs Light (Anime Blueprint)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('veda_theme') as ThemeMode;
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('veda_theme', next);
      } catch (e) {
        console.error('Failed to save theme:', e);
      }
      return next;
    });
  }, []);

  // Update <html> class when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<FetchLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(1800);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  // Modals & Inspection
  const [inspectedArticle, setInspectedArticle] = useState<ArticleItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Bookmarks in LocalStorage
  const [bookmarks, setBookmarks] = useState<Record<string, ArticleItem>>(() => {
    try {
      const saved = localStorage.getItem('veda_saved_articles');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleBookmark = useCallback((article: ArticleItem) => {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[article.hashId]) {
        delete next[article.hashId];
      } else {
        next[article.hashId] = article;
      }
      try {
        localStorage.setItem('veda_saved_articles', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save bookmark:', e);
      }
      return next;
    });
  }, []);

  // Fetch articles from API with anti-cache nonce
  const fetchArticles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedSourceId !== 'all') params.set('source', selectedSourceId);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '80');
      params.set('_t', Date.now().toString());

      const res = await fetch(`/api/articles?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error('[VEDA] Gagal mengambil artikel:', err);
    }
  }, [selectedCategory, selectedSourceId, searchQuery]);

  // Fetch sources
  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch(`/api/sources?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('[VEDA] Gagal mengambil sumber:', err);
    }
  }, []);

  // Manual Trigger Sync
  const triggerSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      await fetch('/api/sync', { method: 'POST', cache: 'no-store' });
    } catch (err) {
      console.error('[VEDA] Gagal trigger sync:', err);
    }
  }, []);

  // Fetch stats & telemetry, and compute dynamic countdown from real lastSyncAt
  const fetchTelemetry = useCallback(async () => {
    try {
      const nonce = Date.now();
      const [resStats, resLogs] = await Promise.all([
        fetch(`/api/stats?_t=${nonce}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
        }),
        fetch(`/api/logs?_t=${nonce}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' },
        }),
      ]);

      if (resStats.ok) {
        const s: SystemStats = await resStats.json();
        setStats(s);
        setIsSyncing(s.isSyncing || false);

        if (s.lastSyncAt) {
          const elapsed = Math.floor((Date.now() - new Date(s.lastSyncAt).getTime()) / 1000);
          const remaining = Math.max(0, 1800 - elapsed);
          setCountdownSeconds(remaining);

          // Jika sudah lebih dari 30 menit sejak sinkronisasi terakhir, pemicu otomatis
          if (elapsed >= 1800 && !s.isSyncing) {
            console.log('[VEDA] Data usang (> 30 menit). Memicu pembaruan otomatis...');
            triggerSync();
          }
        }
      }

      if (resLogs.ok) {
        const l = await resLogs.json();
        setLogs(l.logs || []);
      }
    } catch (err) {
      console.error('[VEDA] Gagal mengambil telemetri:', err);
    }
  }, [triggerSync]);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchArticles(), fetchSources(), fetchTelemetry()]);
      setLoading(false);
    }
    init();
  }, [fetchArticles, fetchSources, fetchTelemetry]);

  // Check on tab focus / wake from sleep
  useEffect(() => {
    const handleFocus = () => {
      fetchTelemetry();
      fetchArticles();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchTelemetry, fetchArticles]);

  // Dynamic Polling: poll every 3s if syncing, else every 15s
  useEffect(() => {
    const intervalTime = isSyncing ? 3000 : 15000;
    const timer = setInterval(() => {
      fetchTelemetry();
      fetchArticles();
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isSyncing, fetchTelemetry, fetchArticles]);

  // Local 1-second countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          triggerSync();
          return 1800;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [triggerSync]);

  const handleToggleSourceActive = async (id: string) => {
    try {
      await fetch(`/api/sources/${id}/toggle`, { method: 'PATCH' });
      await fetchSources();
      await fetchTelemetry();
    } catch (err) {
      console.error('[VEDA] Gagal toggle sumber:', err);
    }
  };

  const displayedArticles = useMemo(() => {
    if (showBookmarksOnly) {
      const bookmarkedList = Object.values(bookmarks);
      if (selectedCategory !== 'all') {
        return bookmarkedList.filter((a) => a.category.toLowerCase() === selectedCategory.toLowerCase());
      }
      return bookmarkedList;
    }
    return articles;
  }, [articles, bookmarks, showBookmarksOnly, selectedCategory]);

  const categoryList = [
    { id: 'all', label: 'ALL DISPATCHES' },
    { id: 'indonesia', label: 'INDONESIA' },
    { id: 'world', label: 'WORLD AFFAIRS' },
    { id: 'technology', label: 'TECHNOLOGY & AI' },
    { id: 'economy', label: 'ECONOMY & MARKETS' },
    { id: 'science', label: 'SCIENCE & SPACE' },
    { id: 'defense', label: 'DEFENSE & TACTICAL' },
    { id: 'cyber', label: 'CYBER SECURITY' },
  ];

  const isDark = theme === 'dark';

  const containerBg = isDark
    ? 'bg-black text-[#e5e5e5]'
    : 'bg-[#fafafa] text-[#0a0a0a]';

  const panelBg = isDark
    ? 'bg-black border-white/20'
    : 'bg-white border-black/20 shadow-sm';

  const inputBg = isDark
    ? 'bg-neutral-950 border-white/20 text-white placeholder-white/40 focus:border-white'
    : 'bg-neutral-50 border-black/20 text-black placeholder-black/40 focus:border-black';

  const bannerBg = isDark
    ? 'bg-white text-black border-b border-black'
    : 'bg-black text-white border-b border-white';

  const crosshair = isDark ? 'text-white/30' : 'text-black/30';

  return (
    <div className={`min-h-screen font-sans bg-veda-bw-grid pb-16 transition-colors ${containerBg}`}>
      {/* Top Navigation Bar with Theme Switch */}
      <TopBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isSyncing={isSyncing}
        onTriggerSync={triggerSync}
        countdownSeconds={countdownSeconds}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Live Sweep Indicator Banner when Syncing */}
      {isSyncing && (
        <div className={`font-mono text-xs font-bold py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-2 animate-pulse ${bannerBg}`}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>[ VEDA SWEEP IN PROGRESS: INGESTING LIVE TRANSMISSIONS ACROSS 103 GLOBAL NODES... ]</span>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Tactical Telemetry Strip */}
        <TacticalStats stats={stats} onRefresh={fetchTelemetry} theme={theme} />

        {/* VIEW 1: Intelligence Feed */}
        {currentTab === 'feed' && (
          <div className="space-y-6">
            
            {/* Filter and Control HUD Bar */}
            <div className={`border p-4 relative font-mono transition-colors ${panelBg}`}>
              <div className={`absolute top-1 left-1 text-[8px] ${crosshair}`}>+</div>
              <div className={`absolute top-1 right-1 text-[8px] ${crosshair}`}>+</div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Search Input */}
                <div className="relative flex-1 max-w-lg">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-white/50' : 'text-black/50'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="QUERY DISPATCH HEADLINES OR MEDIA NODES..."
                    className={`w-full border pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors font-mono ${inputBg}`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-60 hover:opacity-100"
                    >
                      [ CLEAR ]
                    </button>
                  )}
                </div>

                {/* Secondary Filters & View Controls */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap text-xs">
                  
                  {/* Source selector dropdown */}
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="opacity-50 text-[11px] hidden sm:inline">NODE:</span>
                    <select
                      value={selectedSourceId}
                      onChange={(e) => setSelectedSourceId(e.target.value)}
                      className={`border text-xs px-2.5 py-1.5 focus:outline-none font-mono max-w-[170px] truncate ${inputBg}`}
                    >
                      <option value="all">ALL 100+ FEEDS</option>
                      {sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bookmark Filter Toggle */}
                  <button
                    onClick={() => setShowBookmarksOnly((prev) => !prev)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showBookmarksOnly
                        ? isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black'
                        : isDark ? 'bg-black border-white/20 text-white/70 hover:text-white hover:border-white' : 'bg-white border-black/20 text-black/70 hover:text-black hover:border-black'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current' : ''}`} />
                    <span>SAVED ({Object.keys(bookmarks).length})</span>
                  </button>

                  {/* Theme Quick Toggle in Toolbar */}
                  <button
                    onClick={toggleTheme}
                    className={`p-1.5 border transition-colors cursor-pointer ${
                      isDark
                        ? 'border-white/20 hover:border-white text-white/70 hover:text-white'
                        : 'border-black/20 hover:border-black text-black/70 hover:text-black'
                    }`}
                    title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                  >
                    {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>

                  {/* View Mode Toggle (Grid vs Stream) */}
                  <div className={`flex items-center border p-0.5 ${
                    isDark ? 'bg-black border-white/20' : 'bg-white border-black/20'
                  }`}>
                    <button
                      onClick={() => setDisplayMode('grid')}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        displayMode === 'grid'
                          ? isDark ? 'bg-white text-black' : 'bg-black text-white'
                          : isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'
                      }`}
                      title="Tactical Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDisplayMode('stream')}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        displayMode === 'stream'
                          ? isDark ? 'bg-white text-black' : 'bg-black text-white'
                          : isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'
                      }`}
                      title="Dense Intel Stream"
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>

              {/* Category Inverted High-Contrast Buttons */}
              <div className={`mt-3 pt-3 border-t flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono ${
                isDark ? 'border-white/10' : 'border-black/10'
              }`}>
                {categoryList.map((cat) => {
                  const count = cat.id === 'all' 
                    ? stats?.totalArticles 
                    : stats?.categoryCounts?.[cat.id] || 0;
                  const isActive = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? isDark ? 'bg-white text-black font-bold border-white' : 'bg-black text-white font-bold border-black'
                          : isDark
                          ? 'bg-black text-white/70 hover:text-white border-white/20 hover:border-white/60'
                          : 'bg-white text-black/70 hover:text-black border-black/20 hover:border-black/60'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {count !== undefined && (
                        <span className={`text-[10px] tabular-nums ${
                          isActive
                            ? isDark ? 'text-black/70' : 'text-white/70'
                            : isDark ? 'text-white/40' : 'text-black/40'
                        }`}>
                          [{count}]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            {loading ? (
              <div className={`p-16 text-center border flex flex-col items-center justify-center space-y-3 font-mono ${panelBg}`}>
                <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-white' : 'text-black'}`} />
                <div className="text-sm font-bold tracking-widest">[ INTERCEPTING RSS WIRE BROADCASTS... ]</div>
                <div className="text-xs opacity-50">PARSING FEED SIGNALS · SANITIZING TELEMETRY · VERIFYING SHA256 HASHES</div>
              </div>
            ) : displayedArticles.length === 0 ? (
              <div className={`p-16 text-center border space-y-3 font-mono ${panelBg}`}>
                <div className="text-sm font-bold tracking-widest">[ NO MATCHING DISPATCHES DETECTED ]</div>
                <p className="text-xs opacity-60 max-w-md mx-auto font-sans">
                  {showBookmarksOnly
                    ? 'Belum ada dispatch yang tersimpan di memori lokal. Klik ikon bookmark pada kartu artikel untuk menyimpannya.'
                    : 'Coba ubah kueri pencarian atau pilih sektor lain. Tekan tombol "SCAN NOW" untuk memicu sinkronisasi manual.'}
                </p>
                <button
                  onClick={triggerSync}
                  className={`mt-3 px-4 py-2 font-bold cursor-pointer font-mono inline-flex items-center gap-2 ${
                    isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>[ COMMENCE SCAN NOW ]</span>
                </button>
              </div>
            ) : displayMode === 'grid' ? (
              /* Grid Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    mode="grid"
                    onSelect={setInspectedArticle}
                    isBookmarked={Boolean(bookmarks[article.hashId])}
                    onToggleBookmark={toggleBookmark}
                    theme={theme}
                  />
                ))}
              </div>
            ) : (
              /* Stream Mode */
              <div className={`border divide-y ${panelBg} ${isDark ? 'divide-white/10' : 'divide-black/10'}`}>
                {displayedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    mode="stream"
                    onSelect={setInspectedArticle}
                    isBookmarked={Boolean(bookmarks[article.hashId])}
                    onToggleBookmark={toggleBookmark}
                    theme={theme}
                  />
                ))}
              </div>
            )}

            {/* Quick Status Ticker Footer */}
            <div className={`pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono opacity-60 gap-2 ${
              isDark ? 'border-white/20' : 'border-black/20'
            }`}>
              <div className="flex items-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>[ VEDA CORE STATUS: ONLINE ]</span>
                <span aria-hidden="true" className="opacity-30">/</span>
                <span>AUTO-POLL CADENCE: 30 MINUTES</span>
              </div>
              <div>
                DISPLAYING <span className="font-bold opacity-100">{displayedArticles.length}</span> DISPATCHES
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: Source Health Matrix */}
        {currentTab === 'sources' && (
          <SourceMatrix
            sources={sources}
            onToggleActive={handleToggleSourceActive}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRefresh={fetchSources}
            theme={theme}
          />
        )}

        {/* VIEW 3: Execution Logs */}
        {currentTab === 'logs' && (
          <ExecutionLogs logs={logs} onRefresh={fetchTelemetry} theme={theme} />
        )}

        {/* VIEW 4: Architecture & CLI Docs */}
        {currentTab === 'architecture' && <ArchitectureDocs theme={theme} />}

      </main>

      {/* Article Detail Inspection Modal */}
      <ArticleDetailModal
        article={inspectedArticle}
        onClose={() => setInspectedArticle(null)}
        isBookmarked={Boolean(inspectedArticle && bookmarks[inspectedArticle.hashId])}
        onToggleBookmark={toggleBookmark}
        theme={theme}
      />

      {/* Add New Source Modal */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSourceAdded={async () => {
          await fetchSources();
          await fetchTelemetry();
        }}
        theme={theme}
      />
    </div>
  );
}
