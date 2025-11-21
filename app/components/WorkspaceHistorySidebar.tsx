import React, { useMemo, useState } from 'react';
import type { Edge, Node } from '../types';
import { EditIcon, PlusIcon, TrashIcon } from './Icons';

interface WorkspaceHistorySidebarProps {
  workspaces: Array<{
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    createdAt: number;
    updatedAt: number;
  }>;
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name?: string) => void;
  onRenameWorkspace: (workspaceId: string, name: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
}

export const WorkspaceHistorySidebar: React.FC<WorkspaceHistorySidebarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
}) => {
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => b.updatedAt - a.updatedAt),
    [workspaces]
  );

  const handleCreateWorkspace = (event: React.FormEvent) => {
    event.preventDefault();
    onCreateWorkspace(newWorkspaceName.trim() || undefined);
    setNewWorkspaceName('');
  };

  const handleRenameSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    onRenameWorkspace(editingId, trimmed);
    setEditingId(null);
  };

  const startEditing = (workspaceId: string, name: string) => {
    setEditingId(workspaceId);
    setEditingName(name);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <aside className="node-interactive fixed inset-y-0 left-0 z-20 w-64 bg-gray-950/90 backdrop-blur-md border-r border-gray-800 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Histórico</p>
        <h2 className="text-sm font-semibold text-gray-100 mt-1">Workspaces & Canvas</h2>
        <p className="text-xs text-gray-400">Crie, renomeie e navegue entre suas ideias.</p>
      </div>

      <form onSubmit={handleCreateWorkspace} className="px-4 py-3 border-b border-gray-800 flex gap-2">
        <input
          type="text"
          className="flex-1 bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          placeholder="Nome do workspace"
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
        />
        <button
          type="submit"
          className="p-2 rounded-lg bg-indigo-600/80 text-white hover:bg-indigo-500 transition-colors"
          title="Criar novo workspace"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {sortedWorkspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspaceId;
          if (editingId === workspace.id) {
            return (
              <form
                key={workspace.id}
                onSubmit={handleRenameSubmit}
                className="border border-indigo-500/60 bg-gray-900/60 rounded-lg p-3 space-y-2"
              >
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full bg-gray-950/50 border border-gray-800 rounded-md px-2 py-1 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-xs rounded-md bg-gray-800/70 text-gray-300 hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs rounded-md bg-indigo-600/80 text-white hover:bg-indigo-500"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={workspace.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectWorkspace(workspace.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectWorkspace(workspace.id);
                }
              }}
              className={`rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                isActive
                  ? 'border-indigo-500/80 bg-indigo-500/10'
                  : 'border-transparent hover:border-gray-700 hover:bg-gray-900/60'
              }`}
            >
              <div className="flex items-center justify-between text-sm text-gray-100 gap-2">
                <span className="font-medium truncate">{workspace.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditing(workspace.id, workspace.name);
                    }}
                    className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
                    title="Renomear workspace"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (window.confirm(`Deseja realmente excluir "${workspace.name}"?`)) {
                        onDeleteWorkspace(workspace.id);
                      }
                    }}
                    className="p-1 rounded-md text-gray-400 hover:text-red-200 hover:bg-red-900/50"
                    title="Excluir workspace"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                <span>{workspace.nodes.length} nós</span>
                <span>{formatTimestamp(workspace.updatedAt)}</span>
              </div>
            </div>
          );
        })}

        {sortedWorkspaces.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-4">
            Crie seu primeiro workspace para começar.
          </p>
        )}
      </div>
    </aside>
  );
};
