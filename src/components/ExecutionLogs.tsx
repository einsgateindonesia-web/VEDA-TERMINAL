import React from 'react';
import { FetchLog, ThemeMode } from '../types';
import { Terminal, Clock } from 'lucide-react';

interface ExecutionLogsProps {
  logs: FetchLog[];
  onRefresh: () => void;
  theme: ThemeMode;
}

export const ExecutionLogs: React.FC<ExecutionLogsProps> = ({ logs, theme }) => {
  const isDark = theme === 'dark';

  const panelBg = isDark ? 'bg-black border-white/20 text-white' : 'bg-white border-black/20 text-black shadow-sm';
  const itemBg = isDark ? 'bg-black border-white/20 hover:border-white' : 'bg-white border-black/20 hover:border-black shadow-sm';
  const divider = isDark ? 'border-white/10' : 'border-black/10';
  const detailBg = isDark ? 'bg-neutral-950 text-white/50' : 'bg-neutral-100 text-black/60';

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header */}
      <div className={`border p-4 flex items-center justify-between ${panelBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 border flex items-center justify-center ${
            isDark ? 'border-white text-white bg-black' : 'border-black text-black bg-white'
          }`}>
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-widest">[ VEDA // SWEEP TELEMETRY LOGS ]</h3>
            <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-black/50'}`}>
              Historical feed intake cycles, article ingestion count, and node diagnostics.
            </p>
          </div>
        </div>

        <div className={`text-[11px] ${isDark ? 'text-white/70' : 'text-black/70'}`}>
          LOG ENTRIES: <span className="font-bold">{logs.length}</span>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2.5">
        {logs.length === 0 ? (
          <div className={`p-8 text-center border ${panelBg} opacity-50`}>
            NO TELEMETRY LOGS RECORDED. TRIGGER "SCAN NOW" TO COMMENCE FIRST SWEEP CYCLE.
          </div>
        ) : (
          logs.map((log) => {
            const date = new Date(log.timestamp);
            const isSuccess = log.status === 'SUCCESS';

            return (
              <div
                key={log.id}
                className={`border transition-colors p-3.5 relative ${itemBg}`}
              >
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b ${divider}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold tracking-wider px-1.5 py-0.5 text-[10px] ${
                        isSuccess
                          ? isDark ? 'bg-white text-black' : 'bg-black text-white'
                          : isDark ? 'border border-white text-white' : 'border border-black text-black'
                      }`}
                    >
                      [ {log.status} ]
                    </span>
                    <span className="opacity-30">/</span>
                    <span className="flex items-center gap-1 text-[11px] opacity-70">
                      <Clock className="w-3 h-3 opacity-60" />
                      {date.toLocaleDateString()} {date.toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] opacity-70">
                    <span>
                      DURATION: <span className="font-bold">{((log.durationMs || 0) / 1000).toFixed(1)}S</span>
                    </span>
                    <span>/</span>
                    <span>
                      NEW: <span className="font-bold">+{log.newArticles} ITEMS</span>
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="opacity-50">NODES POLLED: </span>
                    <span className="font-bold">{log.totalSources}</span>
                  </div>
                  <div>
                    <span className="opacity-50">NOMINAL: </span>
                    <span className="font-bold">{log.successfulSources}</span>
                  </div>
                  <div>
                    <span className="opacity-50">DEGRADED: </span>
                    <span className="font-bold opacity-80">{log.failedSources}</span>
                  </div>
                  <div>
                    <span className="opacity-50">RATIO: </span>
                    <span className="font-bold">
                      {log.totalSources > 0 ? Math.round((log.successfulSources / log.totalSources) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {log.details && (
                  <div className={`mt-2 pt-2 border-t text-[10px] p-2 truncate ${divider} ${detailBg}`}>
                    <span className="opacity-50">[ DIAGNOSTIC ]: </span>
                    {log.details}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
