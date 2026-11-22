import React from 'react';
import { ThemeMode } from '../types';
import { Terminal, Database, Shield, Cpu, CheckCircle } from 'lucide-react';

interface ArchitectureDocsProps {
  theme: ThemeMode;
}

export const ArchitectureDocs: React.FC<ArchitectureDocsProps> = ({ theme }) => {
  const isDark = theme === 'dark';

  const panelBg = isDark ? 'bg-black border-white/20 text-white' : 'bg-white border-black/20 text-black shadow-sm';
  const cardBg = isDark ? 'bg-black border-white/40 text-white' : 'bg-white border-black/30 text-black shadow-sm';
  const codeBg = isDark ? 'bg-neutral-950 border-white/20 text-white' : 'bg-neutral-100 border-black/20 text-black';

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Anime Interface Banner */}
      <div className={`border p-6 relative overflow-hidden flex flex-col lg:flex-row items-center gap-6 ${panelBg}`}>
        <div className="flex-1 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 text-[11px] opacity-70 mb-2">
            <Cpu className="w-4 h-4" />
            <span>VEDA MAINFRAME // CELESTIAL BEING QUANTUM OPERATING SYSTEM</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest uppercase">
            [ MONOCHROME ANIME INTERFACE ARCHITECTURE ]
          </h2>
          <p className="text-xs opacity-80 mt-2 leading-relaxed font-sans">
            Antarmuka VEDA kini dilengkapi dengan <strong>Dark Mode (Anime VEDA Core Noir)</strong> dan <strong>Light Mode (Anime Blueprint Lab)</strong>. Keduanya mempertahankan prinsip monokrom murni dengan tipografi data monospace tabular, bracket tags teknis, dan blok pemilih terbalik berdaya kontras tinggi.
          </p>
        </div>

        <div className={`w-full lg:w-72 shrink-0 border overflow-hidden p-1 ${
          isDark ? 'border-white/30 bg-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-black/30 bg-white shadow-md'
        }`}>
          <img
            src="/src/assets/images/veda_monochrome_anime_1792376712910.jpg"
            alt="VEDA Monochrome Quantum State Monitor"
            className="w-full h-auto object-cover grayscale contrast-125"
            referrerPolicy="no-referrer"
          />
          <div className={`p-1.5 text-center text-[9px] border-t mt-1 ${isDark ? 'text-white/50 border-white/10' : 'text-black/50 border-black/10'}`}>
            [ VEDA QUANTUM STATE MONITOR // GUNDAM 00 ]
          </div>
        </div>
      </div>

      {/* Fase Roadmap Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`border p-4 ${cardBg}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>[ FASE 1: FONDASI ]</span>
          </div>
          <p className="text-[11px] opacity-70 mt-2 font-sans">
            Konfigurasi sumber <code className={isDark ? 'text-white' : 'text-black'}>sources.json</code>, skema SQLite <code className={isDark ? 'text-white' : 'text-black'}>database.py</code>, dan engine fetcher <code className={isDark ? 'text-white' : 'text-black'}>fetcher.py</code> dengan timeout 10s dan auto-retry 2x.
          </p>
        </div>

        <div className={`border p-4 ${cardBg}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>[ FASE 2: OTOMATISASI ]</span>
          </div>
          <p className="text-[11px] opacity-70 mt-2 font-sans">
            Penjadwalan 30 menit via interval server & APScheduler, REST API (<code className={isDark ? 'text-white' : 'text-black'}>/api/articles</code>, <code className={isDark ? 'text-white' : 'text-black'}>/api/sources</code>, <code className={isDark ? 'text-white' : 'text-black'}>/api/stats</code>, <code className={isDark ? 'text-white' : 'text-black'}>/api/sync</code>).
          </p>
        </div>

        <div className={`border p-4 ${cardBg}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>[ FASE 3: DUAL THEME ]</span>
          </div>
          <p className="text-[11px] opacity-70 mt-2 font-sans">
            Tampilan Dark Mode & Light Mode anime Gundam 00 (pitch black & pure white blueprint), monospace brackets, scanlines, dan AJAX auto-refresh 30 menit.
          </p>
        </div>

        <div className={`border p-4 ${cardBg}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle className="w-4 h-4" />
            <span>[ FASE 4: 100+ RSS SKALA ]</span>
          </div>
          <p className="text-[11px] opacity-70 mt-2 font-sans">
            103 sumber RSS aktif (Nasional, Dunia, Tech, Economy, Science, Defense, Cyber), pencarian instan, filter kategori, export OPML, dan drawer log.
          </p>
        </div>
      </div>

      {/* Python Quickstart Commands */}
      <div className={`border p-5 ${panelBg}`}>
        <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4" />
          <span>[ MENJALANKAN STANDALONE PYTHON BACKEND SECARA MANDIRI ]</span>
        </h3>

        <div className="space-y-4 text-xs font-mono">
          <div>
            <div className="opacity-70 mb-1">1. Masuk ke direktori dan install paket:</div>
            <div className={`border p-3 overflow-x-auto ${codeBg}`}>
              <code>cd veda-news/backend<br />pip install -r requirements.txt</code>
            </div>
          </div>

          <div>
            <div className="opacity-70 mb-1">2. Jalankan pengambilan berita manual (Fase 1):</div>
            <div className={`border p-3 overflow-x-auto ${codeBg}`}>
              <code>python fetcher.py</code>
            </div>
            <div className="opacity-50 mt-1 text-[11px]">
              Skrip akan mengeksekusi feed secara paralel, membuat database SQLite <code className={isDark ? 'text-white' : 'text-black'}>veda-news/data/veda.db</code>, dan mencatat riwayat ke <code className={isDark ? 'text-white' : 'text-black'}>veda-news/logs/fetch.log</code>.
            </div>
          </div>

          <div>
            <div className="opacity-70 mb-1">3. Jalankan server Flask & scheduler 30 menit (Fase 2):</div>
            <div className={`border p-3 overflow-x-auto ${codeBg}`}>
              <code>python api.py</code>
            </div>
          </div>
        </div>
      </div>

      {/* Database Schema & Deduplication Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`border p-5 text-xs font-mono ${panelBg}`}>
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <Database className="w-4 h-4" />
            <span>[ SKEMA DATABASE (SQLITE) ]</span>
          </h4>
          <p className="opacity-70 mb-3">Tiga tabel relasional terstruktur:</p>
          <ul className="space-y-2 opacity-80">
            <li>
              <strong className={isDark ? 'text-white' : 'text-black'}>articles:</strong> id, hash_id (UNIQUE SHA-256), title, summary, link, source_id, category, language, published_at, fetched_at.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-black'}>sources:</strong> id, name, url, category, language, active, last_fetched_at, last_status, error_count.
            </li>
            <li>
              <strong className={isDark ? 'text-white' : 'text-black'}>fetch_logs:</strong> id, timestamp, total_sources, successful_sources, failed_sources, new_articles, duration_seconds, status, details.
            </li>
          </ul>
        </div>

        <div className={`border p-5 text-xs font-mono ${panelBg}`}>
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span>[ PRINSIP SISTEM OPERASI VEDA ]</span>
          </h4>
          <ul className="space-y-2 opacity-80">
            <li>
              <strong>Deduplikasi SHA-256:</strong> Setiap artikel menghasilkan hash unik berdasarkan link dan judul, mencegah duplikasi artikel berulang.
            </li>
            <li>
              <strong>Isolasi Kegagalan:</strong> Timeout 4.5 detik per sumber. Kegagalan satu feed tidak pernah memblokir sumber lain.
            </li>
            <li>
              <strong>Concurrency Pool 12:</strong> Pengambilan paralel terkontrol kilat (~20-25 detik untuk 103 feed).
            </li>
            <li>
              <strong>Pembersihan HTML:</strong> Ringkasan RSS dibersihkan dari tag HTML dan entitas berbahaya demi keamanan dan estetika.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
