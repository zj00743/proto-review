import { useState } from 'react';
import type { Comment, User } from '../types';
import { Avatar } from './Avatar';
import { generateColor, formatRelativeTime } from '../lib/utils';
import { Check, Trash2, Reply, X, CheckCircle, Circle, MessageSquare } from 'lucide-react';

type FilterType = 'all' | 'unresolved' | 'resolved';

interface CommentSidebarProps {
  comments: Comment[];
  selectedCommentId: string | null;
  user: User;
  onCommentClick: (comment: Comment) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onReply: (parentId: string, text: string) => void;
  onClose: () => void;
}

export function CommentSidebar({
  comments,
  selectedCommentId,
  user,
  onCommentClick,
  onResolve,
  onDelete,
  onReply,
  onClose,
}: CommentSidebarProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = comments.filter(c => {
    if (filter === 'unresolved') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const handleSubmitReply = (parentId: string) => {
    if (!replyText.trim()) return;
    onReply(parentId, replyText.trim());
    setReplyText('');
    setReplyingTo(null);
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-sm text-gray-900">Comments</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-gray-100 flex gap-1 shrink-0">
        {(['all', 'unresolved', 'resolved'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
              filter === f
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {filter === 'all' ? 'No comments yet' : `No ${filter} comments`}
            </p>
          </div>
        ) : (
          filtered.map(comment => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`border-b border-gray-100 transition-colors ${
                selectedCommentId === comment.id ? 'bg-gray-100/70' : 'hover:bg-gray-50'
              }`}
            >
              {/* Comment body */}
              <div className="px-4 py-3 cursor-pointer" onClick={() => onCommentClick(comment)}>
                <div className="flex items-start gap-2.5">
                  <Avatar name={comment.author} color={generateColor(comment.author)} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{comment.author}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      comment.resolved ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}>
                      {comment.text}
                    </p>
                    {comment.anchor?.textSnippet && (
                      <span className="inline-block mt-1 text-[10px] font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={comment.anchor.textSnippet}>
                        on: {comment.anchor.tag}{comment.anchor.id ? `#${comment.anchor.id}` : ''} "{comment.anchor.textSnippet.slice(0, 30)}"
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center mt-2 ml-10">
                  {comment.author_id === user.id && (
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(comment.id); }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                    >
                      <Reply className="w-3 h-3" /> Reply
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onResolve(comment.id, !comment.resolved); }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-green-600 rounded hover:bg-green-50"
                    >
                      {comment.resolved
                        ? <><Circle className="w-3 h-3" /> Reopen</>
                        : <><CheckCircle className="w-3 h-3" /> Resolve</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-14 mr-4 mb-2 space-y-2">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex items-start gap-2">
                      <Avatar name={reply.author} color={generateColor(reply.author)} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-900">{reply.author}</span>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(reply.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{reply.text}</p>
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

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="ml-14 mr-4 mb-3 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    maxLength={2000}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSubmitReply(comment.id);
                      if (e.key === 'Escape') { setReplyingTo(null); setReplyText(''); }
                    }}
                  />
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText.trim()}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
