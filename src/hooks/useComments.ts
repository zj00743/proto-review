import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Anchor, Comment, User } from '../types';

function organizeComments(comments: Comment[]): Comment[] {
  const topLevel = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  const organized = topLevel.map((comment, index) => ({
    ...comment,
    pin_number: index + 1,
    replies: replies
      .filter(r => r.parent_id === comment.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }));

  organized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return organized;
}

export function useComments(projectId: string) {
  const [rawComments, setRawComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch comments:', error);
    } else {
      setRawComments(data ?? []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`,
        },
        () => { fetchComments(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, fetchComments]);

  const addComment = useCallback(async (
    anchor: Anchor | null,
    text: string,
    user: User,
    parentId?: string,
    pageUrl?: string,
  ): Promise<Comment> => {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        project_id: projectId,
        x_percent: 0,
        y_percent: 0,
        anchor,
        text,
        author: user.name,
        author_id: user.id,
        parent_id: parentId ?? null,
        page_url: pageUrl ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  }, [projectId]);

  const resolveComment = useCallback(async (id: string, resolved: boolean) => {
    const prev = rawComments;
    setRawComments(c => c.map(x => x.id === id ? { ...x, resolved } : x));
    const { error } = await supabase
      .from('comments')
      .update({ resolved })
      .eq('id', id);
    if (error) {
      setRawComments(prev);
      throw error;
    }
  }, [rawComments]);

  const deleteComment = useCallback(async (id: string) => {
    const prev = rawComments;
    setRawComments(c => c.filter(x => x.id !== id));
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);
    if (error) {
      setRawComments(prev);
      throw error;
    }
  }, [rawComments]);

  const comments = organizeComments(rawComments);

  return { comments, loading, addComment, resolveComment, deleteComment };
}
