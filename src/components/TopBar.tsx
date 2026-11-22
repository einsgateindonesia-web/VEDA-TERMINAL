import React from 'react';
import { ViewTab, ThemeMode } from '../types';
import { RefreshCw, Sun, Moon } from 'lucide-react';

interface TopBarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  countdownSeconds: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onTabChange,
  isSyncing,
  onTriggerSync,
  countdownSeconds,
  theme,
  onToggleTheme,
}) => {
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-40 bg-black/95 dark:bg-black/95 light:bg-white/95 backdrop-blur-md border-b border-white/20 dark:border-white/20 light:border-black/20 transition-colors">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: VEDA Anime Wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-none border border-white dark:border-white light:border-black flex items-center justify-center bg-black dark:bg-black light:bg-white text-white dark:text-white light:text-black font-mono font-bold text-sm tracking-wider shadow-sm transition-colors">
            V
          </div>
          <button
            onClick={() => onTabChange('feed')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <div className="text-base sm:text-lg font-bold tracking-widest text-white dark:text-white light:text-black font-mono uppercase transition-colors">
              VEDA <span className="opacity-40">//</span> TERMINAL
            </div>
            <div className="text-[10px] font-mono tracking-widest text-white/60 dark:text-white/60 light:text-black/60 flex items-center gap-1.5 -mt-0.5 transition-colors">
              <span>CB-MAINFRAME-2307</span>
              <span className="inline-block w-1.5 h-2.5 bg-white dark:bg-white light:bg-black animate-cursor-blink"></span>
              <span className="hidden sm:inline opacity-40">[LVL.7]</span>
            </div>
          </button>
        </div>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-mono tracking-wider">
          <button
            onClick={() => onTabChange('feed')}
            className={`whitespace-nowrap shrink-0 transition-all py-1.5 px-3 border cursor-pointer ${
              currentTab === 'feed'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'text-white/70 hover:text-white border-transparent hover:border-white/30'
                : 'text-black/70 hover:text-black border-transparent hover:border-black/30'
            }`}
          >
            [ INTELLIGENCE FEED ]
          </button>
          <button
            onClick={() => onTabChange('sources')}
            className={`whitespace-nowrap shrink-0 transition-all py-1.5 px-3 border cursor-pointer ${
              currentTab === 'sources'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'text-white/70 hover:text-white border-transparent hover:border-white/30'
                : 'text-black/70 hover:text-black border-transparent hover:border-black/30'
            }`}
          >
            [ SOURCE MATRIX ]
          </button>
          <button
            onClick={() => onTabChange('logs')}
            className={`whitespace-nowrap shrink-0 transition-all py-1.5 px-3 border cursor-pointer ${
              currentTab === 'logs'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'text-white/70 hover:text-white border-transparent hover:border-white/30'
                : 'text-black/70 hover:text-black border-transparent hover:border-black/30'
            }`}
          >
            [ EXECUTION LOGS ]
          </button>
          <button
            onClick={() => onTabChange('architecture')}
            className={`whitespace-nowrap shrink-0 transition-all py-1.5 px-3 border cursor-pointer ${
              currentTab === 'architecture'
                ? isDark
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-black text-white font-bold border-black'
                : isDark
                ? 'text-white/70 hover:text-white border-transparent hover:border-white/30'
                : 'text-black/70 hover:text-black border-transparent hover:border-black/30'
            }`}
          >
            [ SPECS & CLI ]
          </button>
        </nav>

        {/* Zone 3: Countdown + Scan Now + Theme Switch */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mode Switch Button */}
          <button
            onClick={onToggleTheme}
            className={`px-2.5 py-1.5 text-xs font-mono font-bold border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-black text-white border-white/30 hover:border-white'
                : 'bg-white text-black border-black/30 hover:border-black'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-white" /> : <Moon className="w-3.5 h-3.5 text-black" />}
            <span className="hidden sm:inline">{isDark ? '[ LIGHT ]' : '[ DARK ]'}</span>
          </button>

          <div className="hidden sm:flex flex-col text-right font-mono text-[10px] leading-tight">
            <span className={isDark ? 'text-white/50' : 'text-black/50'}>NEXT REFRESH</span>
            <span className={`font-bold tabular-nums tracking-widest ${isDark ? 'text-white' : 'text-black'}`}>
              {formatCountdown(countdownSeconds)}
            </span>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className={`px-3 py-1.5 text-xs font-mono font-bold border transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
              isSyncing
                ? isDark
                  ? 'bg-neutral-800 text-white border-white/50 animate-pulse'
                  : 'bg-neutral-200 text-black border-black/50 animate-pulse'
                : isDark
                ? 'bg-white hover:bg-neutral-200 text-black border-white active:scale-95 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'bg-black hover:bg-neutral-800 text-white border-black active:scale-95 shadow-sm'
            }`}
            title="Trigger immediate feed scan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'SCANNING...' : 'SCAN NOW'}</span>
          </button>
        </div>

      </div>

      {/* Mobile nav drawer */}
      <div className={`md:hidden flex items-center justify-around border-t px-2 py-1.5 text-xs font-mono ${
        isDark ? 'border-white/10 bg-black' : 'border-black/10 bg-white'
      }`}>
        <button
          onClick={() => onTabChange('feed')}
          className={`px-2 py-1 ${
            currentTab === 'feed'
              ? isDark ? 'bg-white text-black font-bold' : 'bg-black text-white font-bold'
              : isDark ? 'text-white/70' : 'text-black/70'
          }`}
        >
          FEED
        </button>
        <button
          onClick={() => onTabChange('sources')}
          className={`px-2 py-1 ${
            currentTab === 'sources'
              ? isDark ? 'bg-white text-black font-bold' : 'bg-black text-white font-bold'
              : isDark ? 'text-white/70' : 'text-black/70'
          }`}
        >
          SOURCES
        </button>
        <button
          onClick={() => onTabChange('logs')}
          className={`px-2 py-1 ${
            currentTab === 'logs'
              ? isDark ? 'bg-white text-black font-bold' : 'bg-black text-white font-bold'
              : isDark ? 'text-white/70' : 'text-black/70'
          }`}
        >
          LOGS
        </button>
        <button
          onClick={() => onTabChange('architecture')}
          className={`px-2 py-1 ${
            currentTab === 'architecture'
              ? isDark ? 'bg-white text-black font-bold' : 'bg-black text-white font-bold'
              : isDark ? 'text-white/70' : 'text-black/70'
          }`}
        >
          DOCS
        </button>
      </div>
    </header>
  );
};
