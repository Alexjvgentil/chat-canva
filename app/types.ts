export enum Role {
    USER = 'user',
    MODEL = 'model',
}

export enum NodeType {
    CHAT = 'chat',
    IMAGE = 'image',
    AGENT = 'agent',
    GROUP = 'group',
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 string
  };
}


export interface Message {
    role: Role;
    parts: Part[];
}

export interface Node {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    size?: { width: number; height: number };
    messages?: Message[];
    parentId: string | null;
    parentMessageIndex?: number;
    isOutOfSync?: boolean;
    isLoading?: boolean;
    isExecuted?: boolean;
    agentConfig?: {
        agentName: string;
        dataSource: string;
        tools: string[];
    };
}

export interface Edge {
    id: string;
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
}