import type { Project } from '../types';
import { Archive, ArchiveRestore, Trash2, Link as LinkIcon, Globe } from 'lucide-react';
import { Avatar } from './Avatar';
import { generateColor } from '../lib/utils';

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

export function ProjectCard({ project, onOpen, onArchive, onDelete, onCopyLink }: ProjectCardProps) {
  const date = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
    >
      {/* Cover */}
      <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
        {project.cover_url ? (
          <img
            src={project.cover_url}
            alt={`${project.name} preview`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Globe className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-gray-900 transition-colors mb-2">
          {project.name}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={project.created_by} color={generateColor(project.created_by)} size="sm" />
            <span className="text-sm text-gray-500 truncate">{project.created_by}</span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-sm text-gray-400 shrink-0">{date}</span>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onArchive(); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title={project.is_archived ? 'Unarchive' : 'Archive'}
            >
              {project.is_archived
                ? <ArchiveRestore className="w-4 h-4" />
                : <Archive className="w-4 h-4" />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCopyLink(); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Copy link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
