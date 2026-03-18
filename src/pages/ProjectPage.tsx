import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquarePlus, Share2, X,
  PanelRightOpen, PanelRightClose,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../hooks/useUser';
import { useComments } from '../hooks/useComments';
import { CommentPin } from '../components/CommentPin';
import { CommentPopup } from '../components/CommentPopup';
import { CommentForm } from '../components/CommentForm';
import { CommentSidebar } from '../components/CommentSidebar';
import type { Project, Comment, Anchor, PinPosition } from '../types';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [isCommentMode, setIsCommentMode] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  // Bridge state
  const [bridgeReady, setBridgeReady] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState<Anchor | null>(null);
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number } | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [pinPositions, setPinPositions] = useState<Record<string, PinPosition>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);

  const { comments, addComment, resolveComment, deleteComment } = useComments(id!);

  // The proxied iframe URL
  const proxyUrl = useMemo(() =>
    project ? `/api/proxy?url=${encodeURIComponent(project.url)}` : null,
    [project]
  );

  // Currently selected comment (must be visible)
  const selectedComment = useMemo(() => {
    if (!selectedCommentId) return null;
    const comment = comments.find(c => c.id === selectedCommentId);
    if (!comment) return null;
    const pos = pinPositions[comment.id];
    if (!pos?.visible) return null;
    return comment;
  }, [comments, selectedCommentId, pinPositions]);

  // Fetch project
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        navigate('/');
        return;
      }
      setProject(data as Project);
      setProjectLoading(false);
    })();
  }, [id, navigate]);

  // Keep a ref to the current project id for the message handler
  const projectIdRef = useRef<string | undefined>(id);
  projectIdRef.current = id;

  // Listen for bridge messages
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (!e.data || typeof e.data.type !== 'string') return;
      switch (e.data.type) {
        case 'pp-bridge-ready':
          setBridgeReady(true);
          if (e.data.route) setCurrentRoute(e.data.route);
          break;
        case 'pp-route-changed':
          setCurrentRoute(e.data.route);
          break;
        case 'pp-element-clicked':
          setPendingAnchor(e.data.anchor as Anchor);
          setPendingClick({ x: e.data.clickX ?? 0, y: e.data.clickY ?? 0 });
          setPendingRoute(e.data.route ?? null);
          break;
        case 'pp-positions-update': {
          const map: Record<string, PinPosition> = {};
          for (const p of e.data.positions) {
            map[p.commentId] = { visible: p.visible, rect: p.rect };
          }
          setPinPositions(map);
          break;
        }
        case 'pp-screenshot-captured': {
          if (!e.data.dataUrl || !projectIdRef.current) break;
          try {
            await supabase
              .from('projects')
              .update({ cover_url: e.data.dataUrl })
              .eq('id', projectIdRef.current);
            setProject(prev => prev ? { ...prev, cover_url: e.data.dataUrl } : prev);
          } catch (err) {
            console.error('Cover save failed:', err);
          }
          break;
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Send comment mode state to bridge — exit when form is showing so highlight/capture stops
  useEffect(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w || !bridgeReady) return;
    const active = isCommentMode && !pendingAnchor;
    w.postMessage({
      type: active ? 'pp-enter-comment-mode' : 'pp-exit-comment-mode',
    }, '*');
  }, [isCommentMode, pendingAnchor, bridgeReady]);

  // Only send anchors for comments on the current route to the bridge
  useEffect(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w || !bridgeReady) return;
    const anchors = comments
      .filter(c => c.anchor && (!c.page_url || c.page_url === currentRoute))
      .map(c => ({ commentId: c.id, anchor: c.anchor }));
    w.postMessage({ type: 'pp-watch-anchors', anchors }, '*');
  }, [comments, bridgeReady, currentRoute]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingAnchor) { setPendingAnchor(null); setPendingClick(null); }
        else if (isCommentMode) setIsCommentMode(false);
        else if (selectedCommentId) setSelectedCommentId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCommentMode, pendingAnchor, selectedCommentId]);

  // (Cover screenshot is auto-captured by the bridge when the page settles — handled in pp-screenshot-captured message)

  // Iframe load timeout
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(() => {
      if (iframeLoading) {
        setIframeError(true);
        setIframeLoading(false);
      }
    }, 25000);
    return () => clearTimeout(t);
  }, [project, iframeLoading]);

  const handleSubmitComment = useCallback(async (text: string) => {
    if (!user || !pendingAnchor) return;
    setSaveError(null);
    try {
      await addComment(pendingAnchor, text, user, undefined, pendingRoute ?? currentRoute ?? undefined);
      setPendingAnchor(null);
      setPendingClick(null);
      setPendingRoute(null);
      setIsCommentMode(false);
      setSidebarOpen(true);
    } catch (err: unknown) {
      const msg = (err && typeof err === 'object' && 'message' in err)
        ? (err as { message: string }).message
        : String(err);
      console.error('Failed to add comment:', err);
      setSaveError(msg);
    }
  }, [user, pendingAnchor, pendingRoute, currentRoute, addComment]);

  const handlePinClick = useCallback((comment: Comment) => {
    setSelectedCommentId(prev => prev === comment.id ? null : comment.id);
    setSidebarOpen(true);
    setTimeout(() => {
      document.getElementById(`comment-${comment.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }, []);

  const handleSidebarCommentClick = useCallback((comment: Comment) => {
    setSelectedCommentId(prev => prev === comment.id ? null : comment.id);
    // Ask bridge to scroll to the element
    const w = iframeRef.current?.contentWindow;
    if (w && comment.anchor) {
      w.postMessage({ type: 'pp-scroll-to', anchor: comment.anchor }, '*');
    }
  }, []);

  const handleReply = useCallback(async (parentId: string, text: string) => {
    if (!user) return;
    const parent = comments.find(c => c.id === parentId);
    if (!parent) return;
    try {
      await addComment(parent.anchor, text, user, parentId, parent.page_url ?? undefined);
    } catch (err) {
      console.error('Failed to add reply:', err);
    }
  }, [user, comments, addComment]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerWidth = overlayRef.current?.offsetWidth ?? 800;

  // Comments that have a visible position from the bridge
  const visibleComments = useMemo(() =>
    comments.filter(c => pinPositions[c.id]?.visible),
    [comments, pinPositions]
  );

  if (projectLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
      </div>
    );
  }

  if (!project || !proxyUrl) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      <header className="relative h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/"
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="font-semibold text-gray-900 truncate">{project.name}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Share'}
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen
              ? <PanelRightClose className="w-5 h-5" />
              : <PanelRightOpen className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Comment mode banner */}
      {isCommentMode && !pendingAnchor && (
        <div className="relative bg-gray-900 text-white text-sm text-center py-1.5 px-4 shrink-0 z-30" role="status" aria-live="polite">
          Hover over elements in the prototype and click to add a comment.{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono ml-1">Esc</kbd> to cancel
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Viewer */}
        <div className="flex-1 relative isolate">
          <iframe
            ref={iframeRef}
            src={proxyUrl}
            className="absolute inset-0 w-full h-full border-0 bg-white"
            title={project.name}
            onLoad={() => { setIframeLoading(false); setIframeError(false); }}
            onError={() => { setIframeError(true); setIframeLoading(false); }}
          />

          {/* Loading */}
          {iframeLoading && !iframeError && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-gray-900 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Loading prototype...</p>
            </div>
          )}

          {/* Error */}
          {iframeError && (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10 p-8">
              <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Unable to load prototype</h3>
              <p className="text-sm text-gray-500 text-center max-w-md mb-2">
                The site couldn't be loaded. Check the URL and try again.
              </p>
              <p className="text-xs text-gray-400 text-center max-w-md mb-5 font-mono bg-gray-50 px-3 py-1.5 rounded">
                {project.url}
              </p>
              <div className="flex gap-3">
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Open in new tab
                </a>
                <button
                  onClick={() => { setIframeLoading(true); setIframeError(false); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Pin overlay (pointer-events-none so clicks pass to iframe; pins are pointer-events-auto) */}
          <div
            ref={overlayRef}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            {visibleComments.map(comment => {
              const pos = pinPositions[comment.id];
              if (!pos?.visible || !pos.rect) return null;
              const ox = comment.anchor?.clickOffsetX;
              const oy = comment.anchor?.clickOffsetY;
              const pinX = ox != null ? pos.rect.left + pos.rect.width * ox : pos.rect.left + pos.rect.width;
              const pinY = oy != null ? pos.rect.top + pos.rect.height * oy : pos.rect.top;
              return (
                <CommentPin
                  key={comment.id}
                  author={comment.author}
                  x={pinX}
                  y={pinY}
                  resolved={comment.resolved}
                  selected={selectedCommentId === comment.id}
                  onClick={() => handlePinClick(comment)}
                />
              );
            })}
          </div>

          {/* Popup and form rendered OUTSIDE the pointer-events-none overlay so they're fully interactive */}
          {selectedComment && !isCommentMode && pinPositions[selectedComment.id]?.rect && user && (() => {
            const sRect = pinPositions[selectedComment.id]!.rect;
            const sox = selectedComment.anchor?.clickOffsetX;
            const soy = selectedComment.anchor?.clickOffsetY;
            const popupX = sox != null ? sRect.left + sRect.width * sox : sRect.left + sRect.width;
            const popupY = soy != null ? sRect.top + sRect.height * soy : sRect.top;
            return (
            <>
              <div className="absolute inset-0 z-30" onClick={() => setSelectedCommentId(null)} />
              <CommentPopup
                comment={selectedComment}
                x={popupX}
                y={popupY}
                containerWidth={containerWidth}
                user={user}
                onClose={() => setSelectedCommentId(null)}
                onResolve={(id, resolved) => {
                  resolveComment(id, resolved).catch(err => console.error('Failed to resolve:', err));
                }}
                onDelete={(id) => {
                  deleteComment(id).catch(err => console.error('Failed to delete:', err));
                }}
                onReply={handleReply}
              />
            </>
            );
          })()}

          {pendingAnchor && pendingClick && user && (
            <>
              <div className="absolute inset-0 z-20" onClick={() => { setPendingAnchor(null); setPendingClick(null); setPendingRoute(null); setSaveError(null); }} />
              <CommentPin
                author={user.name}
                x={pendingClick.x}
                y={pendingClick.y}
                resolved={false}
                selected={true}
                onClick={() => {}}
              />
              <CommentForm
                clickPoint={pendingClick}
                containerWidth={containerWidth}
                error={saveError}
                onSubmit={handleSubmitComment}
                onCancel={() => { setPendingAnchor(null); setPendingClick(null); setPendingRoute(null); setSaveError(null); }}
              />
            </>
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && user && (
          <CommentSidebar
            comments={comments}
            selectedCommentId={selectedCommentId}
            user={user}
            onCommentClick={handleSidebarCommentClick}
            onResolve={(id, resolved) => {
              resolveComment(id, resolved).catch(err => console.error('Failed to resolve:', err));
            }}
            onDelete={(id) => {
              deleteComment(id).catch(err => console.error('Failed to delete:', err));
            }}
            onReply={handleReply}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Floating comment button */}
      <button
        onClick={() => {
          const next = !isCommentMode;
          setIsCommentMode(next);
          if (!next) { setPendingAnchor(null); setPendingClick(null); }
        }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-full shadow-lg transition-all ${
          isCommentMode
            ? 'bg-gray-900 text-white hover:bg-black'
            : 'bg-gray-900 text-white hover:bg-black shadow-xl'
        }`}
      >
        {isCommentMode ? <X className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
        {isCommentMode ? 'Cancel' : 'Comment'}
      </button>
    </div>
  );
}
