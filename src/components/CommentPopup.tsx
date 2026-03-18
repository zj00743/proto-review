import { useState } from 'react';
import type { Comment, User } from '../types';
import { Avatar } from './Avatar';
import { generateColor, formatRelativeTime } from '../lib/utils';
import { CheckCircle, Circle, X, Trash2, Reply, Check } from 'lucide-react';

interface CommentPopupProps {
  comment: Comment;
  x: number;
  y: number;
  containerWidth: number;
  user: User;
  onClose: () => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (parentId: string, text: string) => void;
}

export function CommentPopup({
  comment, x, y, containerWidth, user,
  onClose, onResolve, onDelete, onReply,
}: CommentPopupProps) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const formWidth = 288;
  const showLeft = x + formWidth + 20 > containerWidth;

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setReplying(false);
  };

  return (
    <div
      className="absolute z-40 pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72"
      style={{
        left: showLeft ? x - formWidth - 12 : x + 12,
        top: Math.max(y - 40, 8),
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={comment.author} color={generateColor(comment.author)} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-semibold text-gray-900 truncate">{comment.author}</span>
            <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className={`text-sm leading-relaxed ${comment.resolved ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
            {comment.text}
          </p>
        </div>
        <button onClick={onClose} className="p-0.5 text-gray-400 hover:text-gray-600 rounded shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 space-y-2 max-h-40 overflow-y-auto">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex items-start gap-2">
              <Avatar name={reply.author} color={generateColor(reply.author)} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-900">{reply.author}</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(reply.created_at)}</span>
                </div>
                <p className="text-xs text-gray-600">{reply.text}</p>
              </div>
              {reply.author_id === user.id && (
                <button
                  onClick={() => onDelete(reply.id)}
                  className="p-0.5 text-gray-300 hover:text-red-500 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {replying && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            maxLength={2000}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmitReply();
              if (e.key === 'Escape') { setReplying(false); setReplyText(''); }
            }}
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim()}
            className="px-2 py-1.5 text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center mt-3 pt-2 border-t border-gray-100">
        {comment.author_id === user.id && (
          <button
            onClick={() => { onDelete(comment.id); onClose(); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => { setReplying(!replying); setReplyText(''); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Reply className="w-3 h-3" /> Reply
          </button>
          <button
            onClick={() => onResolve(comment.id, !comment.resolved)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
          >
            {comment.resolved
              ? <><Circle className="w-3 h-3" /> Reopen</>
              : <><CheckCircle className="w-3 h-3" /> Resolve</>}
          </button>
        </div>
      </div>
    </div>
  );
}
