import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[VEDA ERROR BOUNDARY]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const rawMessage = this.state.error?.message || 'Unknown terminal fault.';
    let parsedFirestore: {
      error?: string;
      operationType?: string;
      path?: string | null;
      authInfo?: { userId?: string | null; email?: string | null };
    } | null = null;

    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed && typeof parsed === 'object' && 'operationType' in parsed) {
        parsedFirestore = parsed;
      }
    } catch {
      // Non-JSON runtime error
    }

    const effectiveError = parsedFirestore?.error || rawMessage;
    const isQuotaExceeded = effectiveError.toLowerCase().includes('quota exceeded');
    const isSpecificDailyQuota = effectiveError.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );

    const quotaUpgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6">
        <div className="max-w-2xl w-full border border-white/40 bg-neutral-950 p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/20 pb-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <div className="text-sm font-bold tracking-widest">
                [ VEDA SYSTEM EXCEPTION // INTERRUPT ]
              </div>
              <div className="text-[11px] text-white/60">
                CB-MAINFRAME-2307 · FIREBASE / RUNTIME DIAGNOSTIC
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 border border-white/20 bg-black break-words">
              <div className="text-white/50 mb-1">[ MESSAGE ]</div>
              <div className="font-bold">{effectiveError}</div>
            </div>

            {parsedFirestore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 border border-white/20 bg-black">
                  <div className="text-white/50">OPERATION</div>
                  <div className="uppercase font-bold">{parsedFirestore.operationType}</div>
                </div>
                <div className="p-2.5 border border-white/20 bg-black truncate">
                  <div className="text-white/50">PATH</div>
                  <div className="font-bold truncate">{parsedFirestore.path || 'N/A'}</div>
                </div>
              </div>
            )}

            {isQuotaExceeded && (
              <div className="p-3 border border-white/40 bg-black text-white/90 space-y-1">
                <div className="font-bold">[ FIRESTORE QUOTA EXCEEDED ]</div>
                <p className="text-white/70">
                  Kuota harian gratis Firestore tercapai dan akan di-reset keesokan harinya. Detail kuota tersedia di kolom Spark plan (Enterprise edition) pada halaman harga Firebase Firestore.
                </p>
                {isSpecificDailyQuota && (
                  <a
                    href={quotaUpgradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block underline font-bold mt-1"
                  >
                    Buka Pengaturan Database Firestore &rarr;
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/20 flex flex-wrap gap-3 justify-end">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 border border-white/40 hover:border-white text-xs cursor-pointer"
            >
              [ DISMISS &amp; RETRY ]
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-black font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-neutral-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>[ REBOOT TERMINAL ]</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
