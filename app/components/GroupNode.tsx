import React, { useState, useEffect } from 'react';
import { type Node } from '../types';
import { TrashIcon, PlusIcon } from './Icons';

interface GroupNodeProps {
  node: Node;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdgeCreation: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onCompleteEdgeCreation: (nodeId: string, handle: string) => void;
  onRename: (nodeId: string, title: string) => void;
}

export const GroupNode: React.FC<GroupNodeProps> = ({ node, onDragStart, onResizeStart, onDelete, onStartEdgeCreation, onCompleteEdgeCreation, onRename }) => {
  const [draftName, setDraftName] = useState(node.title ?? 'Group');

  useEffect(() => {
    setDraftName(node.title ?? 'Group');
  }, [node.title]);
  return (
    <div
      onMouseDown={(e) => onDragStart(e, node.id)}
      onMouseUpCapture={() => onCompleteEdgeCreation(node.id, 'input')}
      className="node-interactive group absolute bg-gray-500/10 border-2 border-dashed border-gray-600 rounded-2xl shadow-lg cursor-move"
      style={{
        width: `${node.size?.width ?? 400}px`,
        height: `${node.size?.height ?? 300}px`,
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        zIndex: -1,
      }}
    >
      <div className="absolute top-2 left-2 right-2" onMouseDown={(e) => e.stopPropagation()}>
        <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Nome do grupo</label>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => {
            const trimmed = draftName.trim();
            if (!trimmed) {
              setDraftName(node.title ?? 'Group');
              return;
            }
            if (!node.title || trimmed !== node.title) {
              onRename(node.id, trimmed);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              setDraftName(node.title ?? 'Group');
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-full bg-gray-900/70 text-gray-100 px-3 py-1.5 text-sm rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <button
          onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
          }}
          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete Group"
      >
          <TrashIcon className="w-4 h-4" />
      </button>

      {/* Input Handle */}
      <div 
          onMouseUp={(e) => {
              e.stopPropagation();
              onCompleteEdgeCreation(node.id, 'input');
          }}
          title="Input"
          className="node-interactive absolute top-1/2 -translate-y-1/2 -left-6 w-8 h-12 flex items-center justify-center cursor-pointer"
      >
          <div className="w-4 h-4 bg-gray-600 hover:bg-indigo-500 rounded-full border-2 border-gray-800/80 transition-colors opacity-50 group-hover:opacity-100" />
      </div>

      {/* Output Handle */}
      <div 
          onMouseDown={(e) => onStartEdgeCreation(e, node.id, 'output')}
          title="Output"
          className="node-interactive absolute top-1/2 -translate-y-1/2 -right-6 w-8 h-12 flex items-center justify-center cursor-pointer"
      >
          <div className="w-4 h-4 bg-indigo-600 hover:bg-indigo-500 rounded-full border-2 border-gray-800/80 transition-colors opacity-50 group-hover:opacity-100" />
      </div>

      <div
        onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, node.id)
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-600/50 hover:bg-gray-500 rounded-br-2xl"
        style={{ transform: 'translate(2px, 2px)'}}
      ></div>
    </div>
  );
};
