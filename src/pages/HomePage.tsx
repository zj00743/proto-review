import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Avatar } from '../components/Avatar';

export function HomePage() {
  const { user } = useUser();
  const { projects, loading, createProject, archiveProject, deleteProject } = useProjects();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeProjects = projects.filter(p => !p.is_archived);
  const archivedProjects = projects.filter(p => p.is_archived);
  const displayed = activeTab === 'active' ? activeProjects : archivedProjects;

  const handleCreate = async (name: string, url: string) => {
    if (!user) return;
    setCreateError(null);
    try {
      const project = await createProject(name, url, user);
      setShowCreate(false);
      navigate(`/project/${project.id}`);
    } catch (err: unknown) {
      const msg = (err && typeof err === 'object' && 'message' in err)
        ? (err as { message: string }).message
        : String(err);
      console.error('Failed to create project:', err);
      setCreateError(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/project/${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">ProtoPreview</span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} color={user.color} size="sm" />
              <span className="text-sm text-gray-600">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs + Create */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active ({activeProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'archived'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Archived ({archivedProjects.length})
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {activeTab === 'active' ? 'No projects yet' : 'No archived projects'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {activeTab === 'active'
                ? 'Create your first project to start reviewing prototypes.'
                : 'Archived projects will appear here.'}
            </p>
            {activeTab === 'active' && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => navigate(`/project/${project.id}`)}
                onArchive={() => archiveProject(project.id, !project.is_archived)}
                onDelete={() => setDeleteTarget(project.id)}
                onCopyLink={() => handleCopyLink(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast */}
      {copiedId && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg transition-opacity">
          Link copied to clipboard
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateProjectModal
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          error={createError}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Project"
          message="This will permanently delete the project and all its comments. This action cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
