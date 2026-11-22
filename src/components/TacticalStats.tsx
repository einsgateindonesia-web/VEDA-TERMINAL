import React from 'react';
import { SystemStats, ThemeMode } from '../types';
import { ShieldCheck, Activity, Database, Clock } from 'lucide-react';

interface TacticalStatsProps {
  stats: SystemStats | null;
  onRefresh: () => void;
  theme: ThemeMode;
}

export const TacticalStats: React.FC<TacticalStatsProps> = ({ stats, theme }) => {
  const isDark = theme === 'dark';

  const formatTime = (iso?: string | null) => {
    if (!iso) return 'INITIALIZING';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  const cardBase = isDark
    ? 'bg-black border-white/20 hover:border-white/60 text-white'
    : 'bg-white border-black/20 hover:border-black/60 text-black shadow-sm';

  const iconBase = isDark
    ? 'border-white/30 text-white group-hover:bg-white group-hover:text-black'
    : 'border-black/30 text-black group-hover:bg-black group-hover:text-white';

  const crosshair = isDark ? 'text-white/30' : 'text-black/30';
  const labelMuted = isDark ? 'text-white/50' : 'text-black/50';
  const subMuted = isDark ? 'text-white/40' : 'text-black/40';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 font-mono">
      {/* Metric 1: Ingested Articles */}
      <div className={`border transition-colors p-3.5 flex items-center justify-between relative group ${cardBase}`}>
        <div className={`absolute top-1 left-1 text-[8px] ${crosshair}`}>+</div>
        <div className={`absolute top-1 right-1 text-[8px] ${crosshair}`}>+</div>
        <div>
          <div className={`text-[10px] uppercase tracking-widest ${labelMuted}`}>
            [ INGESTED INTEL ]
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums mt-1 tracking-tight">
            {stats ? stats.totalArticles.toLocaleString() : '---'}
          </div>
          <div className={`text-[10px] mt-0.5 ${subMuted}`}>
            DEDUPLICATED DISPATCHES
          </div>
        </div>
        <div className={`w-9 h-9 border flex items-center justify-center shrink-0 transition-colors ${iconBase}`}>
          <Database className="w-4 h-4" />
        </div>
      </div>

      {/* Metric 2: Active Feeds */}
      <div className={`border transition-colors p-3.5 flex items-center justify-between relative group ${cardBase}`}>
        <div className={`absolute top-1 left-1 text-[8px] ${crosshair}`}>+</div>
        <div className={`absolute top-1 right-1 text-[8px] ${crosshair}`}>+</div>
        <div>
          <div className={`text-[10px] uppercase tracking-widest ${labelMuted}`}>
            [ MONITORED NODES ]
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums mt-1 tracking-tight">
            {stats ? `${stats.activeSources} / ${stats.totalSources}` : '---'}
          </div>
          <div className={`text-[10px] mt-0.5 ${subMuted}`}>
            SECTORS: GLOBAL RSS
          </div>
        </div>
        <div className={`w-9 h-9 border flex items-center justify-center shrink-0 transition-colors ${iconBase}`}>
          <Activity className="w-4 h-4" />
        </div>
      </div>

      {/* Metric 3: Integrity */}
      <div className={`border transition-colors p-3.5 flex items-center justify-between relative group ${cardBase}`}>
        <div className={`absolute top-1 left-1 text-[8px] ${crosshair}`}>+</div>
        <div className={`absolute top-1 right-1 text-[8px] ${crosshair}`}>+</div>
        <div>
          <div className={`text-[10px] uppercase tracking-widest ${labelMuted}`}>
            [ UPLINK INTEGRITY ]
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums mt-1 tracking-tight">
            {stats ? `${stats.healthRate}%` : '---'}
          </div>
          <div className={`text-[10px] mt-0.5 ${subMuted}`}>
            {stats && stats.onlineSources ? `${stats.onlineSources} NODES ONLINE` : 'NOMINAL STATUS'}
          </div>
        </div>
        <div className={`w-9 h-9 border flex items-center justify-center shrink-0 transition-colors ${iconBase}`}>
          <ShieldCheck className="w-4 h-4" />
        </div>
      </div>

      {/* Metric 4: Last Sync */}
      <div className={`border transition-colors p-3.5 flex items-center justify-between relative group ${cardBase}`}>
        <div className={`absolute top-1 left-1 text-[8px] ${crosshair}`}>+</div>
        <div className={`absolute top-1 right-1 text-[8px] ${crosshair}`}>+</div>
        <div>
          <div className={`text-[10px] uppercase tracking-widest ${labelMuted}`}>
            [ LAST SCAN CYCLE ]
          </div>
          <div className="text-xl sm:text-2xl font-bold tabular-nums mt-1 tracking-tight">
            {formatTime(stats?.lastSyncAt)}
          </div>
          <div className={`text-[10px] mt-0.5 ${subMuted}`}>
            {stats?.isSyncing ? 'SCANNING ACTIVE...' : '30-MIN INTERVAL'}
          </div>
        </div>
        <div className={`w-9 h-9 border flex items-center justify-center shrink-0 transition-colors ${iconBase}`}>
          <Clock className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
