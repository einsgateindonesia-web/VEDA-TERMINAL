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
import { useFirebase } from './components/FirebaseContext';
import { DEFAULT_SOURCES_CATALOG } from './data/sourcesCatalog';
import {
  ArticleItem,
  SourceItem,
  SystemStats,
  FetchLog,
  ViewTab,
  DisplayMode,
  ThemeMode,
} from './types';
import {
  Search,
  LayoutGrid,
  ListFilter,
  Bookmark,
  RefreshCw,
  Radio,
  Sun,
  Moon,
  Cloud,
  AlertCircle,
} from 'lucide-react';

interface SafeFetchResult<T> {
  ok: boolean;
  data?: T;
  isHtmlFallback?: boolean;
}

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(url, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return { ok: false, isHtmlFallback: true };
    }
    const data = (await res.json()) as T;
    if (!res.ok) {
      return { ok: false, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

const FALLBACK_CATALOG_SOURCES: SourceItem[] = DEFAULT_SOURCES_CATALOG.map((s) => ({
  id: String(s.id),
  name: String(s.name),
  url: String(s.url),
  category: String(s.category),
  language: String(s.language || 'en'),
  active: s.active ?? true,
  description: s.description ? String(s.description) : undefined,
  lastStatus: 'PENDING' as const,
  articleCount: 0,
}));

export default function App() {
  const {
    user,
    authError,
    userProfile,
    cloudBookmarks,
    cloudCustomSources,
    toggleBookmarkInFirestore,
    toggleCustomSourceInFirestore,
    deleteCustomSourceInFirestore,
    updatePreferencesInFirestore,
  } = useFirebase();

  const [currentTab, setCurrentTab] = useState<ViewTab>('feed');
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    try {
      return localStorage.getItem('veda_display_mode') === 'stream' ? 'stream' : 'grid';
    } catch {
      return 'grid';
    }
  });

  // Theme Mode: Dark (Default Anime Noir) vs Light (Anime Blueprint)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('veda_theme') as ThemeMode;
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Sync theme & displayMode from Firestore profile when authenticated
  useEffect(() => {
    if (!userProfile) return;
    setTheme(userProfile.theme);
    setDisplayMode(userProfile.displayMode);
    try {
      localStorage.setItem('veda_theme', userProfile.theme);
      localStorage.setItem('veda_display_mode', userProfile.displayMode);
    } catch {
      // Ignore localStorage restrictions
    }
  }, [userProfile]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('veda_theme', next);
      } catch (e) {
        console.error('Failed to save theme:', e);
      }
      if (user) {
        updatePreferencesInFirestore({ theme: next }).catch((err) =>
          console.error('[VEDA] Gagal sinkronisasi tema ke Firebase:', err)
        );
      }
      return next;
    });
  }, [user, updatePreferencesInFirestore]);

  const handleDisplayModeChange = useCallback(
    (nextMode: DisplayMode) => {
      setDisplayMode(nextMode);
      try {
        localStorage.setItem('veda_display_mode', nextMode);
      } catch {
        // Ignore storage errors
      }
      if (user) {
        updatePreferencesInFirestore({ displayMode: nextMode }).catch((err) =>
          console.error('[VEDA] Gagal sinkronisasi layout ke Firebase:', err)
        );
      }
    },
    [user, updatePreferencesInFirestore]
  );

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
  const [backendSources, setBackendSources] = useState<SourceItem[]>(FALLBACK_CATALOG_SOURCES);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<FetchLog[]>([]);
  const [apiUnavailable, setApiUnavailable] = useState(false);

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

  // Bookmarks in LocalStorage (used when signed out)
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, ArticleItem>>(() => {
    try {
      const saved = localStorage.getItem('veda_saved_articles');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Active bookmarks: Firestore when signed in, LocalStorage when anonymous
  const activeBookmarks = user ? cloudBookmarks : localBookmarks;

  const toggleBookmark = useCallback(
    (article: ArticleItem) => {
      const key = article.hashId || article.id;
      if (user) {
        const currentlySaved = Boolean(cloudBookmarks[key]);
        toggleBookmarkInFirestore(article, currentlySaved).catch((err) =>
          console.error('[VEDA] Gagal memperbarui bookmark di Firebase:', err)
        );
        return;
      }

      setLocalBookmarks((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
        } else {
          next[key] = article;
        }
        try {
          localStorage.setItem('veda_saved_articles', JSON.stringify(next));
        } catch (e) {
          console.error('Failed to save bookmark:', e);
        }
        return next;
      });
    },
    [user, cloudBookmarks, toggleBookmarkInFirestore]
  );

  // Merge backend/catalog sources with authenticated user's Firestore customSources
  const sources = useMemo(() => {
    if (!user || cloudCustomSources.length === 0) {
      return backendSources;
    }
    const cloudByUrl = new Map<string, SourceItem>();
    for (const cs of cloudCustomSources) {
      cloudByUrl.set(cs.url.toLowerCase(), cs);
    }
    const baseFiltered = backendSources.filter((bs) => !cloudByUrl.has(bs.url.toLowerCase()));
    return [...cloudCustomSources, ...baseFiltered];
  }, [backendSources, cloudCustomSources, user]);

  // Fetch articles from API with safe JSON check
  const fetchArticles = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedSourceId !== 'all') params.set('source', selectedSourceId);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    params.set('limit', '80');
    params.set('_t', Date.now().toString());

    const result = await safeFetchJson<{ articles?: ArticleItem[] }>(`/api/articles?${params.toString()}`, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    });

    if (result.ok && result.data) {
      setArticles(result.data.articles || []);
      setApiUnavailable(false);
    } else if (result.isHtmlFallback) {
      setApiUnavailable(true);
    }
  }, [selectedCategory, selectedSourceId, searchQuery]);

  // Fetch sources with safe JSON check & catalog fallback
  const fetchSources = useCallback(async () => {
    const result = await safeFetchJson<{ sources?: SourceItem[] }>(`/api/sources?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    });

    if (result.ok && result.data) {
      setBackendSources(result.data.sources || FALLBACK_CATALOG_SOURCES);
      setApiUnavailable(false);
    } else if (result.isHtmlFallback) {
      setApiUnavailable(true);
    }
  }, []);

  // Manual Trigger Sync
  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    const result = await safeFetchJson<{ status?: string }>('/api/sync', {
      method: 'POST',
      cache: 'no-store',
    });
    if (!result.ok) {
      setIsSyncing(false);
      if (result.isHtmlFallback) {
        setApiUnavailable(true);
      }
    }
  }, []);

  // Fetch stats & telemetry safely
  const fetchTelemetry = useCallback(async () => {
    const nonce = Date.now();
    const [resStats, resLogs] = await Promise.all([
      safeFetchJson<SystemStats>(`/api/stats?_t=${nonce}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      }),
      safeFetchJson<{ logs?: FetchLog[] }>(`/api/logs?_t=${nonce}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      }),
    ]);

    if (resStats.ok && resStats.data) {
      const s = resStats.data;
      setStats(s);
      setIsSyncing(s.isSyncing || false);
      setApiUnavailable(false);

      if (s.lastSyncAt) {
        const elapsed = Math.floor((Date.now() - new Date(s.lastSyncAt).getTime()) / 1000);
        const remaining = Math.max(0, 1800 - elapsed);
        setCountdownSeconds(remaining);

        if (elapsed >= 1800 && !s.isSyncing) {
          triggerSync();
        }
      }
    } else if (resStats.isHtmlFallback) {
      setApiUnavailable(true);
      setIsSyncing(false);
    }

    if (resLogs.ok && resLogs.data) {
      setLogs(resLogs.data.logs || []);
    }
  }, [triggerSync]);

  // Initial load
  useEffect(() => {
    let active = true;
    async function init() {
      setLoading(true);
      await Promise.all([fetchArticles(), fetchSources(), fetchTelemetry()]);
      if (active) setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, [fetchArticles, fetchSources, fetchTelemetry]);

  // Check on tab focus / wake from sleep (properly cleaned up)
  useEffect(() => {
    const handleFocus = () => {
      fetchTelemetry();
      fetchArticles();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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

  const handleToggleSourceActive = async (source: SourceItem) => {
    if (source.isCloudCustom && user) {
      await toggleCustomSourceInFirestore(source.id, !source.active);
      return;
    }

    const res = await safeFetchJson(`/api/sources/${source.id}/toggle`, { method: 'PATCH' });
    if (res.ok) {
      await fetchSources();
      await fetchTelemetry();
    } else {
      setBackendSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, active: !s.active } : s))
      );
    }
  };

  const handleDeleteCustomSource = async (sourceId: string) => {
    if (!user) return;
    await deleteCustomSourceInFirestore(sourceId);
  };

  const effectiveStats: SystemStats | null = useMemo(() => {
    if (stats) {
      const customCount = user ? cloudCustomSources.length : 0;
      if (customCount === 0) return stats;
      return {
        ...stats,
        totalSources: Math.max(stats.totalSources, sources.length),
        activeSources: Math.max(stats.activeSources, sources.filter((s) => s.active).length),
      };
    }
    return {
      totalArticles: Object.keys(activeBookmarks).length,
      totalSources: sources.length,
      activeSources: sources.filter((s) => s.active).length,
      onlineSources: sources.filter((s) => s.active && s.lastStatus === 'ONLINE').length,
      healthRate: 0,
      lastSyncAt: null,
      isSyncing: false,
      nextSyncMinutes: 30,
      categoryCounts: {},
      recentLog: null,
    };
  }, [stats, sources, user, cloudCustomSources.length, activeBookmarks]);

  const displayedArticles = useMemo(() => {
    if (showBookmarksOnly) {
      const bookmarkedList = Object.values(activeBookmarks);
      if (selectedCategory !== 'all') {
        return bookmarkedList.filter((a) => a.category.toLowerCase() === selectedCategory.toLowerCase());
      }
      return bookmarkedList;
    }
    return articles;
  }, [articles, activeBookmarks, showBookmarksOnly, selectedCategory]);

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

  const containerBg = isDark ? 'bg-black text-[#e5e5e5]' : 'bg-[#fafafa] text-[#0a0a0a]';

  const panelBg = isDark ? 'bg-black border-white/20' : 'bg-white border-black/20 shadow-sm';

  const inputBg = isDark
    ? 'bg-neutral-950 border-white/20 text-white placeholder-white/40 focus:border-white'
    : 'bg-neutral-50 border-black/20 text-black placeholder-black/40 focus:border-black';

  const bannerBg = isDark
    ? 'bg-white text-black border-b border-black'
    : 'bg-black text-white border-b border-white';

  const crosshair = isDark ? 'text-white/30' : 'text-black/30';

  return (
    <div className={`min-h-screen font-sans bg-veda-bw-grid pb-16 transition-colors ${containerBg}`}>
      {/* Top Navigation Bar with Firebase Auth & Theme Switch */}
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
        <div
          className={`font-mono text-xs font-bold py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-2 animate-pulse ${bannerBg}`}
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>[ VEDA SWEEP IN PROGRESS: INGESTING LIVE TRANSMISSIONS ACROSS {sources.length} GLOBAL NODES... ]</span>
        </div>
      )}

      {/* Firebase Auth Error Notice */}
      {authError && (
        <div
          className={`font-mono text-xs py-2 px-4 border-b flex items-center justify-center gap-2 ${
            isDark ? 'bg-neutral-950 border-white/30 text-white' : 'bg-neutral-100 border-black/30 text-black'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>[ AUTH FAULT: {authError} ]</span>
        </div>
      )}

      {/* Main Viewport Container */}
      <main className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Tactical Telemetry Strip */}
        <TacticalStats stats={effectiveStats} onRefresh={fetchTelemetry} theme={theme} />

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
                  <Search
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                      isDark ? 'text-white/50' : 'text-black/50'
                    }`}
                  />
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
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
                        ? isDark
                          ? 'bg-white text-black border-white'
                          : 'bg-black text-white border-black'
                        : isDark
                        ? 'bg-black border-white/20 text-white/70 hover:text-white hover:border-white'
                        : 'bg-white border-black/20 text-black/70 hover:text-black hover:border-black'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current' : ''}`} />
                    <span>SAVED ({Object.keys(activeBookmarks).length})</span>
                    {user && <Cloud className="w-3 h-3 opacity-70" />}
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
                  <div
                    className={`flex items-center border p-0.5 ${
                      isDark ? 'bg-black border-white/20' : 'bg-white border-black/20'
                    }`}
                  >
                    <button
                      onClick={() => handleDisplayModeChange('grid')}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        displayMode === 'grid'
                          ? isDark
                            ? 'bg-white text-black'
                            : 'bg-black text-white'
                          : isDark
                          ? 'text-white/50 hover:text-white'
                          : 'text-black/50 hover:text-black'
                      }`}
                      title="Tactical Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDisplayModeChange('stream')}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        displayMode === 'stream'
                          ? isDark
                            ? 'bg-white text-black'
                            : 'bg-black text-white'
                          : isDark
                          ? 'text-white/50 hover:text-white'
                          : 'text-black/50 hover:text-black'
                      }`}
                      title="Dense Intel Stream"
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Inverted High-Contrast Buttons */}
              <div
                className={`mt-3 pt-3 border-t flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono ${
                  isDark ? 'border-white/10' : 'border-black/10'
                }`}
              >
                {categoryList.map((cat) => {
                  const count =
                    cat.id === 'all' ? effectiveStats?.totalArticles : effectiveStats?.categoryCounts?.[cat.id] || 0;
                  const isActive = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? isDark
                            ? 'bg-white text-black font-bold border-white'
                            : 'bg-black text-white font-bold border-black'
                          : isDark
                          ? 'bg-black text-white/70 hover:text-white border-white/20 hover:border-white/60'
                          : 'bg-white text-black/70 hover:text-black border-black/20 hover:border-black/60'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {count !== undefined && (
                        <span
                          className={`text-[10px] tabular-nums ${
                            isActive
                              ? isDark
                                ? 'text-black/70'
                                : 'text-white/70'
                              : isDark
                              ? 'text-white/40'
                              : 'text-black/40'
                          }`}
                        >
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
              <div
                className={`p-16 text-center border flex flex-col items-center justify-center space-y-3 font-mono ${panelBg}`}
              >
                <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-white' : 'text-black'}`} />
                <div className="text-sm font-bold tracking-widest">[ INTERCEPTING RSS WIRE BROADCASTS... ]</div>
                <div className="text-xs opacity-50">
                  PARSING FEED SIGNALS · SANITIZING TELEMETRY · VERIFYING SHA256 HASHES
                </div>
              </div>
            ) : displayedArticles.length === 0 ? (
              <div className={`p-16 text-center border space-y-3 font-mono ${panelBg}`}>
                <div className="text-sm font-bold tracking-widest">
                  {apiUnavailable && !showBookmarksOnly
                    ? '[ RSS FEED SERVER OFFLINE OR REBOOTING ]'
                    : '[ NO MATCHING DISPATCHES DETECTED ]'}
                </div>
                <p className="text-xs opacity-60 max-w-md mx-auto font-sans">
                  {showBookmarksOnly
                    ? user
                      ? 'Belum ada dispatch tersimpan di Firebase Firestore Anda. Klik ikon bookmark pada kartu artikel untuk menyinkronkannya.'
                      : 'Belum ada dispatch tersimpan di memori lokal. Login via Google atau klik ikon bookmark pada artikel untuk menyimpannya.'
                    : apiUnavailable
                    ? 'Endpoint backend RSS (/api/*) belum merespons JSON. Anda masih dapat mengakses bookmark Firebase dan daftar 100+ sumber RSS di tab Source Matrix.'
                    : 'Coba ubah kueri pencarian atau pilih sektor lain. Tekan tombol "SCAN NOW" untuk memicu sinkronisasi manual.'}
                </p>
                <button
                  onClick={() => {
                    fetchArticles();
                    fetchSources();
                    fetchTelemetry();
                    if (!apiUnavailable) triggerSync();
                  }}
                  className={`mt-3 px-4 py-2 font-bold cursor-pointer font-mono inline-flex items-center gap-2 ${
                    isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{apiUnavailable ? '[ RETRY UPLINK ]' : '[ COMMENCE SCAN NOW ]'}</span>
                </button>
              </div>
            ) : displayMode === 'grid' ? (
              /* Grid Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedArticles.map((article) => {
                  const key = article.hashId || article.id;
                  return (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      mode="grid"
                      onSelect={setInspectedArticle}
                      isBookmarked={Boolean(activeBookmarks[key])}
                      onToggleBookmark={toggleBookmark}
                      theme={theme}
                    />
                  );
                })}
              </div>
            ) : (
              /* Stream Mode */
              <div className={`border divide-y ${panelBg} ${isDark ? 'divide-white/10' : 'divide-black/10'}`}>
                {displayedArticles.map((article) => {
                  const key = article.hashId || article.id;
                  return (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      mode="stream"
                      onSelect={setInspectedArticle}
                      isBookmarked={Boolean(activeBookmarks[key])}
                      onToggleBookmark={toggleBookmark}
                      theme={theme}
                    />
                  );
                })}
              </div>
            )}

            {/* Quick Status Ticker Footer */}
            <div
              className={`pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono opacity-60 gap-2 ${
                isDark ? 'border-white/20' : 'border-black/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>[ VEDA CORE STATUS: {apiUnavailable ? 'CLOUD-STANDBY' : 'ONLINE'} ]</span>
                <span aria-hidden="true" className="opacity-30">
                  /
                </span>
                <span>AUTO-POLL CADENCE: 30 MINUTES</span>
                {user && (
                  <>
                    <span aria-hidden="true" className="opacity-30">
                      /
                    </span>
                    <span>FIREBASE SYNC: ACTIVE</span>
                  </>
                )}
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
            onDeleteCustomSource={user ? handleDeleteCustomSource : undefined}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onRefresh={fetchSources}
            theme={theme}
          />
        )}

        {/* VIEW 3: Execution Logs */}
        {currentTab === 'logs' && <ExecutionLogs logs={logs} onRefresh={fetchTelemetry} theme={theme} />}

        {/* VIEW 4: Architecture & CLI Docs */}
        {currentTab === 'architecture' && <ArchitectureDocs theme={theme} />}
      </main>

      {/* Article Detail Inspection Modal */}
      <ArticleDetailModal
        article={inspectedArticle}
        onClose={() => setInspectedArticle(null)}
        isBookmarked={Boolean(inspectedArticle && activeBookmarks[inspectedArticle.hashId || inspectedArticle.id])}
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
