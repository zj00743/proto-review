import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Project, User } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch projects:', error);
    } else {
      setProjects(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (name: string, url: string, user: User): Promise<Project> => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, url, created_by: user.name, created_by_id: user.id })
      .select()
      .single();

    if (error) throw error;
    const project = data as Project;
    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  const archiveProject = useCallback(async (id: string, archive: boolean) => {
    const { error } = await supabase
      .from('projects')
      .update({ is_archived: archive })
      .eq('id', id);

    if (error) throw error;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, is_archived: archive } : p));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateCover = useCallback(async (id: string, coverUrl: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ cover_url: coverUrl })
      .eq('id', id);

    if (error) throw error;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, cover_url: coverUrl } : p));
  }, []);

  return { projects, loading, createProject, archiveProject, deleteProject, updateCover, refetch: fetchProjects };
}
