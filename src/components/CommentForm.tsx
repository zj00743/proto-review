import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

interface CommentFormProps {
  clickPoint: { x: number; y: number };
  containerWidth: number;
  error?: string | null;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function CommentForm({ clickPoint, containerWidth, error, onSubmit, onCancel }: CommentFormProps) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) onSubmit(text.trim());
  };

  const formWidth = 256;
  const pinOffset = 20;
  const showLeft = clickPoint.x + pinOffset + formWidth + 12 > containerWidth;
  const formLeft = showLeft
    ? clickPoint.x - pinOffset - formWidth
    : clickPoint.x + pinOffset;
  const formTop = clickPoint.y - 16;

  return (
    <div
      className="absolute z-30 pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-64"
      style={{ left: formLeft, top: Math.max(formTop, 8) }}
      onClick={e => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit}>
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Leave a comment..."
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit(e);
            }
            if (e.key === 'Escape') onCancel();
          }}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1 break-words">{error}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-gray-400">⌘+Enter to send</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="p-1.5 text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
