import React, { useState } from 'react';
import { ThemeMode } from '../types';
import { X, Plus, AlertCircle } from 'lucide-react';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: () => void;
  theme: ThemeMode;
}

export const AddSourceModal: React.FC<AddSourceModalProps> = ({
  isOpen,
  onClose,
  onSourceAdded,
  theme,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('technology');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !url.trim()) {
      setError('Nama dan URL RSS wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          category,
          language,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menambahkan sumber RSS.');
      }

      onSourceAdded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menyimpan sumber.');
    } finally {
      setLoading(false);
    }
  };

  const modalBg = isDark
    ? 'bg-black border-white text-white shadow-[0_0_35px_rgba(255,255,255,0.15)]'
    : 'bg-white border-black text-black shadow-2xl';

  const inputBg = isDark
    ? 'bg-neutral-950 border-white/20 focus:border-white text-white'
    : 'bg-neutral-50 border-black/20 focus:border-black text-black';

  const divider = isDark ? 'border-white/20' : 'border-black/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div 
        className={`border rounded-none max-w-lg w-full p-6 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between pb-3 border-b text-xs ${divider}`}>
          <span className="font-bold tracking-widest">[ REGISTER NEW RSS NODE // VEDA ]</span>
          <button
            onClick={onClose}
            className={`p-1 border border-transparent transition-colors cursor-pointer ${
              isDark ? 'hover:border-white text-white/60 hover:text-white' : 'hover:border-black text-black/60 hover:text-black'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className={`mt-4 p-3 border text-xs flex items-center gap-2 ${
            isDark ? 'bg-neutral-950 border-white/40 text-white' : 'bg-neutral-100 border-black/40 text-black'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-mono">
          <div>
            <label className="block opacity-70 mb-1">[ NODE IDENTIFIER / NAME ] *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NHK World, Wired, Detikcom..."
              className={`w-full border p-2.5 focus:outline-none ${inputBg}`}
            />
          </div>

          <div>
            <label className="block opacity-70 mb-1">[ FEED BROADCAST URL (XML/ATOM) ] *</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/rss.xml"
              className={`w-full border p-2.5 focus:outline-none ${inputBg}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block opacity-70 mb-1">[ SECTOR ]</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full border p-2.5 focus:outline-none ${inputBg}`}
              >
                <option value="indonesia">Indonesia</option>
                <option value="world">World</option>
                <option value="technology">Technology</option>
                <option value="economy">Economy</option>
                <option value="science">Science</option>
                <option value="defense">Defense</option>
                <option value="cyber">Cyber Security</option>
              </select>
            </div>

            <div>
              <label className="block opacity-70 mb-1">[ LANGUAGE ]</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`w-full border p-2.5 focus:outline-none ${inputBg}`}
              >
                <option value="id">Bahasa Indonesia (id)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block opacity-70 mb-1">[ NODE REMARKS (OPTIONAL) ]</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational notes..."
              className={`w-full border p-2.5 focus:outline-none ${inputBg}`}
            />
          </div>

          <div className={`pt-4 border-t flex items-center justify-end gap-3 ${divider}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border cursor-pointer ${
                isDark ? 'border-white/20 text-white/60 hover:text-white hover:border-white' : 'border-black/20 text-black/60 hover:text-black hover:border-black'
              }`}
            >
              [ CANCEL ]
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 font-bold flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isDark ? 'bg-white hover:bg-neutral-200 text-black' : 'bg-black hover:bg-neutral-800 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'COMMITTING...' : '[ COMMIT NODE ]'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
