import React from 'react';
import { NodeType } from '../types';
import { MessageSquareIcon, ImageIcon, BotIcon, FilePlusIcon, SquareIcon } from './Icons';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddNode, onReset }) => {
  return (
    <div className="node-interactive fixed top-4 left-4 sm:left-72 z-10 bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50 p-2 flex flex-col gap-2 text-sm">
      <div className="px-2 pt-1 pb-2 text-xs font-semibold text-gray-400">Nodes</div>
      <button 
        onClick={() => onAddNode(NodeType.CHAT)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/70 rounded-md transition-colors"
      >
        <MessageSquareIcon className="w-5 h-5 text-indigo-400" />
        <span>Chat Node</span>
      </button>
      <button 
        onClick={() => onAddNode(NodeType.IMAGE)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/70 rounded-md transition-colors"
      >
        <ImageIcon className="w-5 h-5 text-teal-400" />
        <span>Image Node</span>
      </button>
      <button 
        onClick={() => onAddNode(NodeType.FILE)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/70 rounded-md transition-colors"
      >
        <FilePlusIcon className="w-5 h-5 text-sky-400" />
        <span>File Node</span>
      </button>
      <button 
        onClick={() => onAddNode(NodeType.AGENT)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/70 rounded-md transition-colors"
      >
        <BotIcon className="w-5 h-5 text-amber-400" />
        <span>Agent Node</span>
      </button>
       <button 
        onClick={() => onAddNode(NodeType.GROUP)}
        className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/70 rounded-md transition-colors"
      >
        <SquareIcon className="w-5 h-5 text-gray-400" />
        <span>Group</span>
      </button>
      
      <hr className="border-gray-700 my-2" />

      <button 
        onClick={onReset}
        className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700/70 rounded-md transition-colors"
      >
        <FilePlusIcon className="w-5 h-5" />
        <span>New Canvas</span>
      </button>
    </div>
  );
};
