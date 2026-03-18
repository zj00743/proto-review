import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateProjectModalProps {
  onSubmit: (name: string, url: string) => void | Promise<void>;
  onClose: () => void;
  error?: string | null;
}

export function CreateProjectModal({ onSubmit, onClose, error }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || submitting) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setSubmitting(true);
    await onSubmit(name.trim(), finalUrl);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">New Project</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="proj-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Project Name
            </label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dashboard Redesign"
              maxLength={100}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label htmlFor="proj-url" className="block text-sm font-medium text-gray-700 mb-1.5">
              Prototype URL
            </label>
            <input
              id="proj-url"
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://my-app.vercel.app"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Any publicly accessible URL — Vercel, Netlify, GitHub Pages, etc.
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !url.trim() || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
