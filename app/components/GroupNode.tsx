import React from 'react';
import { type Node } from '../types';
import { TrashIcon, PlusIcon } from './Icons';

interface GroupNodeProps {
  node: Node;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdgeCreation: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onCompleteEdgeCreation: (nodeId: string, handle: string) => void;
}

export const GroupNode: React.FC<GroupNodeProps> = ({ node, onDragStart, onResizeStart, onDelete, onStartEdgeCreation, onCompleteEdgeCreation }) => {
  return (
    <div
      onMouseDown={(e) => onDragStart(e, node.id)}
      className="node-interactive group absolute bg-gray-500/10 border-2 border-dashed border-gray-600 rounded-2xl shadow-lg cursor-move"
      style={{
        width: `${node.size?.width ?? 400}px`,
        height: `${node.size?.height ?? 300}px`,
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        zIndex: -1,
      }}
    >
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
          onMouseDown={(e) => onStartEdgeCreation(e, node.id, 'input')}
          onMouseUp={() => onCompleteEdgeCreation(node.id, 'input')}
          title="Input"
          className="node-interactive absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-gray-600 hover:bg-indigo-500 rounded-full cursor-pointer border-2 border-gray-800/80 transition-colors opacity-50 group-hover:opacity-100"
      />

      {/* Output Handle */}
      <div 
          onMouseDown={(e) => onStartEdgeCreation(e, node.id, 'output')}
          title="Output"
          className="node-interactive absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-indigo-600 hover:bg-indigo-500 rounded-full cursor-pointer border-2 border-gray-800/80 transition-colors opacity-50 group-hover:opacity-100"
      />

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
