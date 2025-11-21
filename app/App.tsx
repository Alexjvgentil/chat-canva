import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatNode } from './components/ChatNode';
import { GroupNode } from './components/GroupNode';
import FileNode from './components/FileNode';
import WebNode from './components/WebNode';
import { type Node, type Message, type Part, Role, NodeType, type Edge, type FileData } from './types';
import { generateText } from './services/geminiService';
import { ZoomInIcon, ZoomOutIcon, LocateIcon } from './components/Icons';
import { Sidebar } from './components/Sidebar';
import { WorkspaceHistorySidebar } from './components/WorkspaceHistorySidebar';
import ConnectionLine from './components/ConnectionLine';

const NODE_WIDTH = 352; // 22rem
const NODE_DEFAULT_HEIGHT = 450;
const NODE_SPACING = 64; // 4rem

const getDefaultTitle = (type: NodeType) => {
  switch (type) {
    case NodeType.CHAT:
      return 'Chat Node';
    case NodeType.IMAGE:
      return 'Image Node';
    case NodeType.AGENT:
      return 'Agent Node';
    case NodeType.FILE:
      return 'File Node';
    case NodeType.WEB:
      return 'Web Browser';
    case NodeType.GROUP:
      return 'Group';
    default:
      return 'Node';
  }
};

interface Workspace {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
}

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizingNode, setResizingNode] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const [edgeCreation, setEdgeCreation] = useState<{ sourceNodeId: string; sourceHandle: string; sourcePos: { x: number; y: number }; currentPos: { x: number; y: number }; } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const createInitialNode = useCallback((): Node => ({
    id: `node-${Date.now()}`,
    type: NodeType.CHAT,
    position: { x: 0, y: 0 },
    size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
    title: getDefaultTitle(NodeType.CHAT),
    messages: [{ role: Role.MODEL, parts: [{ text: 'Olá! Como posso te ajudar a explorar suas ideias hoje?' }] }],
    parentId: null,
    isLoading: false,
    isExecuted: true,
  }), []);

  const centerCanvas = useCallback((nodeId?: string, targetNodes?: Node[]) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const referenceNodes = targetNodes ?? nodes;
    let targetNode = referenceNodes.find(n => n.id === nodeId);
    if (!targetNode && referenceNodes.length > 0) {
      targetNode = referenceNodes[referenceNodes.length - 1];
    }

    if (targetNode) {
      const nodeWidth = targetNode.size?.width ?? NODE_WIDTH;
      const newTranslateX = width / 2 - (targetNode.position.x + nodeWidth / 2) * transform.scale;
      const newTranslateY = height / 2 - (targetNode.position.y) * transform.scale;
      setTransform(prev => ({ ...prev, translateX: newTranslateX, translateY: newTranslateY }));
    } else {
      setTransform(prev => ({ ...prev, translateX: width / 2 - (NODE_WIDTH / 2) * transform.scale, translateY: height / 4 }));
    }
  }, [nodes, transform.scale]);

  const handleCreateWorkspace = useCallback((rawName?: string) => {
    setWorkspaces(prev => {
      const timestamp = Date.now();
      const workspaceNodes = [createInitialNode()];
      const newWorkspace: Workspace = {
        id: `workspace-${timestamp}`,
        name: rawName?.trim() || `Canvas ${prev.length + 1}`,
        nodes: workspaceNodes,
        edges: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setActiveWorkspaceId(newWorkspace.id);
      setNodes(workspaceNodes);
      setEdges([]);
      centerCanvas(undefined, workspaceNodes);
      return [...prev, newWorkspace];
    });
  }, [centerCanvas, createInitialNode]);

  const handleSelectWorkspace = useCallback((workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) return;
    const workspace = workspaces.find(ws => ws.id === workspaceId);
    if (!workspace) return;
    setActiveWorkspaceId(workspaceId);
    setNodes(workspace.nodes);
    setEdges(workspace.edges ?? []);
    centerCanvas(workspace.nodes[workspace.nodes.length - 1]?.id, workspace.nodes);
  }, [activeWorkspaceId, centerCanvas, workspaces]);

  const handleRenameWorkspace = useCallback((workspaceId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWorkspaces(prev => prev.map(ws => ws.id === workspaceId ? { ...ws, name: trimmed, updatedAt: Date.now() } : ws));
  }, []);

  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces(prev => {
      const remaining = prev.filter(ws => ws.id !== workspaceId);
      if (remaining.length === prev.length) return prev;

      if (remaining.length === 0) {
        const timestamp = Date.now();
        const workspaceNodes = [createInitialNode()];
        const fallbackWorkspace: Workspace = {
          id: `workspace-${timestamp}`,
          name: 'Canvas 1',
          nodes: workspaceNodes,
          edges: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        setActiveWorkspaceId(fallbackWorkspace.id);
        setNodes(workspaceNodes);
        setEdges([]);
        centerCanvas(undefined, workspaceNodes);
        return [fallbackWorkspace];
      }

      if (workspaceId === activeWorkspaceId) {
        const nextWorkspace = remaining[0];
        setActiveWorkspaceId(nextWorkspace.id);
        setNodes(nextWorkspace.nodes);
        setEdges(nextWorkspace.edges ?? []);
        centerCanvas(nextWorkspace.nodes[nextWorkspace.nodes.length - 1]?.id, nextWorkspace.nodes);
      }

      return remaining;
    });
  }, [activeWorkspaceId, centerCanvas, createInitialNode]);

  useEffect(() => {
    if (workspaces.length === 0) {
      handleCreateWorkspace('Canvas 1');
    }
  }, [workspaces.length, handleCreateWorkspace]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setWorkspaces(prev => prev.map(ws => ws.id === activeWorkspaceId ? { ...ws, nodes, edges, updatedAt: Date.now() } : ws));
  }, [activeWorkspaceId, nodes, edges]);

  useEffect(() => {
    if (nodes.length === 1) {
      centerCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  const addNodeFromBranch = useCallback((parentId: string, sourceMessage: Message, type: 'chat' | 'image', parentMessageIndex: number) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
  
    const childNodes = nodes.filter(n => n.parentId === parentId);
    const parentWidth = parentNode.size?.width ?? NODE_WIDTH;
    const newPosition = {
      x: parentNode.position.x + parentWidth + NODE_SPACING,
      y: parentNode.position.y + (childNodes.length * (NODE_SPACING)),
    };
  
    const newNodeType = type === 'image' ? NodeType.IMAGE : NodeType.CHAT;
    
    if (newNodeType === NodeType.CHAT) {
        const newNodeId = `node-${Date.now()}`;
        const newNode: Node = {
            id: newNodeId,
            type: NodeType.CHAT,
            position: newPosition,
            size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
            title: getDefaultTitle(NodeType.CHAT),
            messages: [sourceMessage], 
            parentId: parentId,
            parentMessageIndex: parentMessageIndex,
            isLoading: false,
            isExecuted: true,
        };

        const newEdge: Edge = {
            id: `edge-${Date.now()}`,
            source: parentId,
            sourceHandle: 'output',
            target: newNodeId,
            targetHandle: 'input',
        };

        setNodes(prev => [...prev, newNode]);
        setEdges(prev => [...prev, newEdge]);
        centerCanvas(newNode.id);
        return;
    }
    
    // Original behavior for non-chat nodes (e.g., Image node)
    const initialParts = sourceMessage.parts;

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: newNodeType,
      position: newPosition,
      size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
      title: getDefaultTitle(newNodeType),
      messages: [{ role: Role.MODEL, parts: initialParts }],
      parentId: parentId,
      parentMessageIndex: parentMessageIndex,
      isLoading: false,
      isExecuted: false,
    };
  
    setNodes(prev => [...prev, newNode]);
    centerCanvas(newNode.id);
  
  }, [nodes, centerCanvas]);
  
  const addNodeFromMenu = (type: NodeType) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const nodeWidth = type === NodeType.GROUP ? 500 : NODE_WIDTH;
    const centerX = (width / 2 - transform.translateX) / transform.scale - nodeWidth / 2;
    const centerY = (height / 2 - transform.translateY) / transform.scale - 100;

    if (type === NodeType.GROUP) {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: NodeType.GROUP,
        position: { x: centerX, y: centerY },
        size: { width: 500, height: 400 },
        title: getDefaultTitle(NodeType.GROUP),
        parentId: null,
      };
      setNodes(prev => [...prev, newNode]);
      return;
    }

    if (type === NodeType.FILE) {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: NodeType.FILE,
        position: { x: centerX, y: centerY },
        size: { width: 420, height: 520 },
        title: getDefaultTitle(NodeType.FILE),
        parentId: null,
        isExecuted: true,
      };
      setNodes(prev => [...prev, newNode]);
      return;
    }

    if (type === NodeType.WEB) {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: NodeType.WEB,
        position: { x: centerX, y: centerY },
        size: { width: 520, height: 500 },
        title: getDefaultTitle(NodeType.WEB),
        parentId: null,
        isExecuted: true,
        web: { url: 'https://www.google.com' },
      };
      setNodes(prev => [...prev, newNode]);
      return;
    }

    let initialMessages: Message[] = [];
    if (type === NodeType.CHAT) {
        initialMessages = [{ role: Role.MODEL, parts: [{ text: "Comece uma nova conversa..." }] }];
    } else if (type === NodeType.IMAGE) {
        initialMessages = [{ role: Role.MODEL, parts: [{ text: "Envie uma imagem e faça uma pergunta sobre ela." }] }];
    } else if (type === NodeType.AGENT) {
        initialMessages = [{ role: Role.MODEL, parts: [{ text: "Configure e execute este agente." }] }];
    }

    const newNode: Node = {
        id: `node-${Date.now()}`,
        type: type,
        position: { x: centerX, y: centerY },
        size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
        title: getDefaultTitle(type),
        messages: initialMessages,
        parentId: null,
        isLoading: false,
        isExecuted: false,
        agentConfig: type === NodeType.AGENT ? { agentName: 'Novo Agente', dataSource: '', tools: [] } : undefined
    };
    setNodes(prev => [...prev, newNode]);
  }

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prevNodes => {
        const remainingNodes = prevNodes.filter(n => n.id !== nodeId);
        return remainingNodes.map(n => {
            if (n.parentId === nodeId) {
                return {
                    ...n,
                    parentId: null,
                    parentMessageIndex: undefined,
                    isOutOfSync: false,
                };
            }
            return n;
        });
    });
    setEdges(prevEdges => prevEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
  }, []);

  const handleUpdateFileNode = useCallback((nodeId: string, fileData: FileData | null) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, file: fileData ?? undefined } : node));
  }, []);

  const handleUpdateWebNode = useCallback((nodeId: string, url: string) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, web: { url } } : node));
  }, []);

  const handleRenameNode = useCallback((nodeId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, title: trimmed } : node));
  }, []);

  const handleResetCanvas = () => {
    const initialNode = createInitialNode();
    setNodes([initialNode]);
    setEdges([]);
    centerCanvas(initialNode.id, [initialNode]);
  }
  
  const handleRunNode = useCallback(async (nodeId: string, parts: Part[]) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      setNodes(prev => prev.map(n => n.id === nodeId ? { 
          ...n, 
          isLoading: true, 
          isExecuted: true,
          messages: [{ role: Role.USER, parts }]
      } : n));

      const parentNode = nodes.find(n => n.id === node.parentId);
      const history = parentNode?.messages?.slice(0, node.parentMessageIndex! + 1) ?? [];
      await handleSendMessage(nodeId, parts, history, true);

  }, [nodes]);

  const handleUpdateAgentConfig = useCallback((nodeId: string, newConfig: Partial<Node['agentConfig']>) => {
    setNodes(prev => prev.map(n => {
        if (n.id === nodeId && n.type === NodeType.AGENT && n.agentConfig) {
            return { ...n, agentConfig: { ...n.agentConfig, ...newConfig } };
        }
        return n;
    }));
  }, []);

  const handleSendMessage = useCallback(async (nodeId: string, parts: Part[], history?: Message[], isInitialRun: boolean = false) => {
    const userMessage: Message = { role: Role.USER, parts };
    
    setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
            const currentMessages = n.messages ?? [];
            return {
                ...n,
                isLoading: true,
                messages: isInitialRun ? currentMessages : [...currentMessages, userMessage],
            };
        }
        return n;
    }));
    
    try {
      const responseText = await generateText(parts, history ?? []);
      const newMessage: Message = { role: Role.MODEL, parts: [{ text: responseText }] };
       setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                const currentMessages = n.messages ?? [];
                const finalMessages = isInitialRun ? [...currentMessages, newMessage] : [...currentMessages, userMessage, newMessage];
                return { ...n, messages: finalMessages, isLoading: false };
            }
            return n;
        }));
    } catch (error) {
      console.error('Error generating text:', error);
      const errorMessage: Message = { role: Role.MODEL, parts: [{ text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' }] };
       setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                const currentMessages = n.messages ?? [];
                 const finalMessages = isInitialRun ? [...currentMessages, errorMessage] : [...currentMessages, userMessage, errorMessage];
                return { ...n, messages: finalMessages, isLoading: false };
            }
            return n;
        }));
    }
  }, []);

  const handleEditMessage = async (nodeId: string, messageIndex: number, newParts: Part[]) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.messages) return;

    // 1. Truncate conversation at the point of edit
    const truncatedMessages = node.messages.slice(0, messageIndex);
    const updatedMessage = { ...node.messages[messageIndex], parts: newParts };
    const newMessages = [...truncatedMessages, updatedMessage];
    
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, messages: newMessages, isLoading: true } : n));
    
    // 2. Re-run generation
    try {
        const history = newMessages;
        const responseText = await generateText(newParts, history.slice(0, -1));
        const newModelMessage: Message = { role: Role.MODEL, parts: [{ text: responseText }] };

        // 3. Update node and check for out-of-sync children
        setNodes(prev => {
            return prev.map(currentNode => {
                if (currentNode.id === nodeId) {
                    return { ...currentNode, messages: [...newMessages, newModelMessage], isLoading: false };
                }
                // Mark children as out of sync
                if (currentNode.parentId === nodeId && currentNode.parentMessageIndex === messageIndex + 1) {
                    return { ...currentNode, isOutOfSync: true };
                }
                return currentNode;
            });
        });

    } catch (error) {
        console.error('Error re-generating text:', error);
        const errorMessage: Message = { role: Role.MODEL, parts: [{ text: 'Erro ao gerar nova resposta.' }] };
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, messages: [...newMessages, errorMessage], isLoading: false } : n));
    }
  };

  const handleSyncNode = (nodeId: string) => {
    setNodes(prev => {
        const nodeToSync = prev.find(n => n.id === nodeId);
        if (!nodeToSync || nodeToSync.parentId === null || nodeToSync.parentMessageIndex === undefined || !nodeToSync.messages) return prev;

        const parentNode = prev.find(n => n.id === nodeToSync.parentId);
        if (!parentNode || !parentNode.messages) return prev;

        const newSourceMessage = parentNode.messages[nodeToSync.parentMessageIndex];
        if (!newSourceMessage) return prev;
        
        return prev.map(n => {
            if (n.id === nodeId) {
                return {
                    ...n,
                    messages: [{ ...n.messages![0], parts: newSourceMessage.parts }],
                    isExecuted: false,
                    isOutOfSync: false,
                }
            }
            return n;
        });
    });
  };

  const handleNodeResizeStart = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.size) return;

    setResizingNode({
        id: nodeId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: node.size.width,
        startHeight: node.size.height,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
     if (edgeCreation) {
        setEdgeCreation(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentPos: {
                    x: (e.clientX - transform.translateX) / transform.scale,
                    y: (e.clientY - transform.translateY) / transform.scale,
                }
            }
        });
        return;
    }
    if (resizingNode) {
        const dx = (e.clientX - resizingNode.startX) / transform.scale;
        const dy = (e.clientY - resizingNode.startY) / transform.scale;
        const newWidth = Math.max(300, resizingNode.startWidth + dx);
        const newHeight = Math.max(200, resizingNode.startHeight + dy);

        setNodes(nodes.map(n => 
            n.id === resizingNode.id ? { ...n, size: { width: newWidth, height: newHeight } } : n
        ));
        return;
    }
    if (draggingNode) {
        const newX = (e.clientX - transform.translateX) / transform.scale - draggingNode.offsetX;
        const newY = (e.clientY - transform.translateY) / transform.scale - draggingNode.offsetY;
        setNodes(nodes.map(n => n.id === draggingNode.id ? { ...n, position: { x: newX, y: newY } } : n));
        return;
    }
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setTransform(prev => ({
      ...prev,
      translateX: prev.translateX + dx,
      translateY: prev.translateY + dy,
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (edgeCreation) {
      setEdgeCreation(null);
    }
    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!canvasRef.current || (e.target as HTMLElement).closest('.node-interactive')) return;
    e.preventDefault();
    const scaleAmount = 1.1;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = e.deltaY > 0 ? transform.scale / scaleAmount : transform.scale * scaleAmount;
    
    const newTranslateX = mouseX - (mouseX - transform.translateX) * (newScale / transform.scale);
    const newTranslateY = mouseY - (mouseY - transform.translateY) * (newScale / transform.scale);

    setTransform({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
  };

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const offsetX = (e.clientX - transform.translateX) / transform.scale - node.position.x;
    const offsetY = (e.clientY - transform.translateY) / transform.scale - node.position.y;
    
    setDraggingNode({ id: nodeId, offsetX, offsetY });
  }

  const handleStartEdgeCreation = useCallback((e: React.MouseEvent, sourceNodeId: string, sourceHandle: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const sourcePos = getNodeAnchor(sourceNode, sourceHandle);
    
    const currentPos = {
        x: (e.clientX - transform.translateX) / transform.scale,
        y: (e.clientY - transform.translateY) / transform.scale,
    };

    setEdgeCreation({ sourceNodeId, sourceHandle, sourcePos, currentPos });
  }, [nodes, transform.scale, transform.translateX, transform.translateY]);

  const handleCompleteEdgeCreation = useCallback((targetNodeId: string, targetHandle: string) => {
      if (
        edgeCreation &&
        edgeCreation.sourceNodeId !== targetNodeId &&
        edgeCreation.sourceHandle === 'output' &&
        targetHandle === 'input'
      ) {
          const edgeExists = edges.some(edge => 
              edge.source === edgeCreation.sourceNodeId && edge.target === targetNodeId
          );

          if (!edgeExists) {
              const newEdge: Edge = {
                  id: `edge-${Date.now()}`,
                  source: edgeCreation.sourceNodeId,
                  sourceHandle: 'output',
                  target: targetNodeId,
                  targetHandle: 'input',
              };
              setEdges(prev => [...prev, newEdge]);
          }
      }
      setEdgeCreation(null);
  }, [edgeCreation, edges]);


  const zoom = (direction: 'in' | 'out') => {
    if (!canvasRef.current) return;
    const scaleAmount = 1.2;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = direction === 'out' ? transform.scale / scaleAmount : transform.scale * scaleAmount;
    
    const newTranslateX = centerX - (centerX - transform.translateX) * (newScale / transform.scale);
    const newTranslateY = centerY - (centerY - transform.translateY) * (newScale / transform.scale);

    setTransform({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
  }
  
  const getNodeAnchor = (node: Node, handle: 'input' | 'output' | string): { x: number; y: number } => {
    const isGroup = node.type === NodeType.GROUP;
    const width = node.size?.width ?? (isGroup ? 0 : NODE_WIDTH);
    const height = node.size?.height ?? (isGroup ? 0 : NODE_DEFAULT_HEIGHT);
    const yPos = node.position.y + height / 2;

    if (handle === 'output') { // Right side
        return { x: node.position.x + width, y: yPos };
    }
    // 'input' or default, left side
    return { x: node.position.x, y: yPos };
  };

  const renderLines = () => {
    return nodes.map(node => {
        if (!node.parentId || node.type === NodeType.GROUP) return null;
        const parentNode = nodes.find(n => n.id === node.parentId);
        if (!parentNode) return null;
        
        // Hide the default parent line if a manual edge exists
        const hasManualEdge = edges.some(edge => 
            (edge.source === node.parentId && edge.target === node.id) || 
            (edge.source === node.id && edge.target === node.parentId)
        );
        if (hasManualEdge) return null;

        const parentWidth = parentNode.size?.width ?? NODE_WIDTH;
        const parentHeight = parentNode.size?.height ?? NODE_DEFAULT_HEIGHT;
        const nodeHeight = node.size?.height ?? NODE_DEFAULT_HEIGHT;
        const startX = parentNode.position.x + parentWidth;
        const startY = parentNode.position.y + parentHeight / 2;
        const endX = node.position.x;
        const endY = node.position.y + nodeHeight / 2;
        
        const isOutOfSync = Boolean(node.isOutOfSync);

        return (
            <ConnectionLine
              key={`line-${node.id}`}
              sourceX={startX}
              sourceY={startY}
              targetX={endX}
              targetY={endY}
              color={isOutOfSync ? '#F59E0B' : '#4A5568'}
              dashed={isOutOfSync}
            />
        );
    });
  };
  
  const renderEdges = () => {
    const edgeElements = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return null;

        const sourcePos = getNodeAnchor(sourceNode, edge.sourceHandle);
        const targetPos = getNodeAnchor(targetNode, edge.targetHandle);
        
        const isOutOfSync = targetNode.parentId === sourceNode.id && targetNode.isOutOfSync;
        const strokeColor = isOutOfSync ? '#F59E0B' : '#6B7280';

        return (
            <ConnectionLine
              key={edge.id}
              sourceX={sourcePos.x}
              sourceY={sourcePos.y}
              targetX={targetPos.x}
              targetY={targetPos.y}
              color={strokeColor}
              dashed={isOutOfSync}
            />
        );
    });
    
    if (edgeCreation) {
        const { sourcePos, currentPos } = edgeCreation;
        edgeElements.push(
            <ConnectionLine
              key="preview-edge"
              sourceX={sourcePos.x}
              sourceY={sourcePos.y}
              targetX={currentPos.x}
              targetY={currentPos.y}
              color="#A78BFA"
              dashed
            />
        );
    }
    return edgeElements;
  }
  
  const groupNodes = nodes.filter(n => n.type === NodeType.GROUP);
  const chatLikeNodes = nodes.filter(n => n.type !== NodeType.GROUP);

  return (
    <div
      ref={canvasRef}
      className="w-screen h-screen overflow-hidden cursor-grab active:cursor-grabbing bg-gray-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <WorkspaceHistorySidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
      />
      <Sidebar onAddNode={addNodeFromMenu} onReset={handleResetCanvas} />
      <div className="absolute inset-0 bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:32px_32px]"></div>
      <div
        className="transform-gpu"
        style={{ transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`, transition: isPanning || draggingNode || resizingNode ? 'none' : 'transform 0.1s' }}
      >
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            {renderLines()}
            {renderEdges()}
        </svg>

        {groupNodes.map(node => (
            <GroupNode
                key={node.id}
                node={node}
                onDragStart={handleNodeDragStart}
                onResizeStart={handleNodeResizeStart}
                onDelete={handleDeleteNode}
                onStartEdgeCreation={handleStartEdgeCreation}
                onCompleteEdgeCreation={handleCompleteEdgeCreation}
                onRename={handleRenameNode}
            />
        ))}

        {chatLikeNodes.map(node => (
          <div
            key={node.id}
            className="absolute flex"
            style={{
              left: `${node.position.x}px`,
              top: `${node.position.y}px`,
              width: `${node.size?.width ?? NODE_WIDTH}px`,
              height: `${node.size?.height ?? NODE_DEFAULT_HEIGHT}px`,
            }}
          >
            {node.type === NodeType.FILE ? (
              <FileNode
                node={node}
                onDragStart={handleNodeDragStart}
                onDelete={handleDeleteNode}
                onStartEdgeCreation={handleStartEdgeCreation}
                onCompleteEdgeCreation={handleCompleteEdgeCreation}
                onResizeStart={handleNodeResizeStart}
                onRename={handleRenameNode}
                onFileChange={handleUpdateFileNode}
              />
            ) : node.type === NodeType.WEB ? (
              <WebNode
                node={node}
                onDragStart={handleNodeDragStart}
                onDelete={handleDeleteNode}
                onStartEdgeCreation={handleStartEdgeCreation}
                onCompleteEdgeCreation={handleCompleteEdgeCreation}
                onResizeStart={handleNodeResizeStart}
                onRename={handleRenameNode}
                onUrlChange={handleUpdateWebNode}
              />
            ) : (
              <ChatNode
                node={node}
                onSendMessage={(parts, history) => handleSendMessage(node.id, parts, history)}
                onBranch={addNodeFromBranch}
                onRun={handleRunNode}
                onDragStart={handleNodeDragStart}
                onEditMessage={handleEditMessage}
                onSync={handleSyncNode}
                onDelete={handleDeleteNode}
                onUpdateAgentConfig={(config) => handleUpdateAgentConfig(node.id, config)}
                onStartEdgeCreation={handleStartEdgeCreation}
                onCompleteEdgeCreation={handleCompleteEdgeCreation}
                onResizeStart={handleNodeResizeStart}
                onRename={handleRenameNode}
              />
            )}
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 p-2 bg-gray-800/50 backdrop-blur-sm rounded-lg">
        <button onClick={() => zoom('in')} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><ZoomInIcon/></button>
        <button onClick={() => zoom('out')} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><ZoomOutIcon/></button>
        <button onClick={() => centerCanvas()} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><LocateIcon/></button>
      </div>
       <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-gray-400">
            <span>Infinite Canvas</span>
        </div>
    </div>
  );
};

export default App;
