export type NodeShape = 'rounded-rect' | 'capsule' | 'rectangle' | 'diamond' | 'circle' | 'hexagon';

export type BorderStyle = 'solid' | 'dashed' | 'dotted';

export interface NodeStyle {
  shape: NodeShape;
  fillColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: BorderStyle;
  fontSize?: number;
}

export interface NodeChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type RelationArrowType = 'end' | 'both' | 'start' | 'none';

export interface LinkStyleConfig {
  color?: string;
  style?: BorderStyle;
  arrow?: RelationArrowType;
  width?: number;
}

export interface ScriptAnnotation {
  id: string;
  textBlockIndex: number;
  selectedText: string;
  labelKey: string;
  labelTitle: string;
  color: string;
  linkedNodeId?: string;
  createdAt: string;
}

export type NodeType = 'standard' | 'character_profile';

export interface CharacterColumnDef {
  key: string;
  label: string;
  isCustom?: boolean;
}

export interface CharacterProfileData {
  faction: string; // Phe
  roleType: string; // Tuyến Nhân vật
  name: string; // Tên
  strengths: string; // Điểm mạnh
  weaknesses: string; // Điểm yếu
  want: string; // Want (Muốn)
  need: string; // Need (Cần để thay đổi nội tâm)
  ghostWound: string; // Vết thương lòng/Bóng ma tâm lý (Ghost/Wound) (Sợ)
  theLie: string; // Lời nói dối nhân vật tin vào (The Lie)
  conflict: string; // Xung đột
  actionTendency: string; // Xu hướng action
  visualArchetype?: string; // Hình tượng
  customFields?: Record<string, string>; // Bất kỳ cột tùy biến nào khác (Key: Tên cột, Value: Giá trị)
  [key: string]: any;
}

export interface MindmapNodeData {
  id: string;
  title: string;
  content: string;
  contents?: string[];
  checklist?: NodeChecklistItem[];
  scriptAnnotations?: ScriptAnnotation[];
  nodeType?: NodeType;
  characterProfile?: CharacterProfileData;
  characterProfiles?: CharacterProfileData[];
  characterColumns?: CharacterColumnDef[];
  parentId: string | null;
  childrenIds: string[];
  position: { x: number; y: number };
  style: NodeStyle;
  parentLinkStyle?: LinkStyleConfig;
  isGroup?: boolean;
  completed?: boolean;
}

export interface MindmapRelationData {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  type: 'tree' | 'cross';
  color?: string;
  style?: BorderStyle;
  arrow?: RelationArrowType;
  width?: number;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  appliedChangesSummary?: string;
  actions?: any[];
}

export type MindmapViewMode = 'node' | 'flowchart';

export interface MindmapMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  authorEmail?: string;
  sourceText?: string;
  aiHistory?: AIChatMessage[];
  defaultViewMode?: MindmapViewMode;
}

export type AIGraphActionType =
  | 'add_node'
  | 'update_node'
  | 'delete_node'
  | 'reparent_node'
  | 'batch_add_children'
  | 'batch_replace_children'
  | 'auto_update_colors'
  | 'auto_layout';

export interface AIGraphActionNodeChild {
  title: string;
  content?: string;
  checklist?: string[];
  color?: string;
  shape?: NodeShape;
  children?: AIGraphActionNodeChild[];
}

export interface AIGraphAction {
  type: AIGraphActionType;
  nodeId?: string;
  parentId?: string;
  title?: string;
  content?: string;
  checklist?: string[];
  color?: string;
  shape?: NodeShape;
  children?: AIGraphActionNodeChild[];
}

export interface AIRefineResponseData {
  answer: string;
  actions: AIGraphAction[];
  summaryOfChanges?: string;
}

export interface MindmapDataSchema {
  meta: MindmapMetadata;
  rootId: string;
  nodes: Record<string, MindmapNodeData>;
  relations: MindmapRelationData[];
}

export interface DriveFileItem {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}
