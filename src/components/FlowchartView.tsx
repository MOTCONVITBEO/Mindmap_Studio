import React, { useState, useRef, useEffect } from 'react';
import {
  Workflow,
  Plus,
  Trash2,
  Maximize2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  FileText,
  Edit2,
  Check,
  X,
  Layers,
  Sparkles,
  MoveRight,
  GripVertical,
  ArrowUpDown,
  Columns,
  Columns3,
  Rows3,
  FoldVertical,
  FolderPlus,
  FolderTree,
  ChevronDown,
  ChevronUp,
  Unlink,
  Clapperboard,
  Film,
  User,
  Users,
} from 'lucide-react';
import { MindmapGraph } from '../models/MindmapGraph';
import { NodeModel } from '../models/NodeModel';
import { useTranslation } from '../i18n/LanguageContext';
import { ReorderColumnsModal } from './ReorderColumnsModal';
import { FilmScriptModal } from './FilmScriptModal';
import { formatCharacterSummary, getFactionColorScheme } from '../services/characterParser';

interface FlowchartViewProps {
  graph: MindmapGraph;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  zoom: number;
  onSelectNode: (nodeId: string | null) => void;
  onOpenDetailModal: (nodeId: string) => void;
  onAddChildNode: (parentId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateNodeTitle: (nodeId: string, title: string) => void;
  onStartEditTitle: (nodeId: string) => void;
  onFinishEditTitle: (nodeId: string, title: string) => void;
  onCancelEditTitle: () => void;
  onReparent: (nodeId: string, newParentId: string | null) => boolean;
  onReorderStages?: (newStageIds: string[]) => void;
  onShowToast?: (msg: string) => void;
  onUpdateGraph?: (graph: MindmapGraph) => void;
  onPushSnapshot?: () => void;
}

export const FlowchartView: React.FC<FlowchartViewProps> = ({
  graph,
  selectedNodeId,
  editingNodeId,
  zoom,
  onSelectNode,
  onOpenDetailModal,
  onAddChildNode,
  onDeleteNode,
  onUpdateNodeTitle,
  onStartEditTitle,
  onFinishEditTitle,
  onCancelEditTitle,
  onReparent,
  onReorderStages,
  onShowToast,
  onUpdateGraph,
  onPushSnapshot,
}) => {
  const { t } = useTranslation();
  const rootNode = graph.getNode(graph.rootId);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Drag over state for cards and columns
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [dragOverStageColumnId, setDragOverStageColumnId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Local title draft for editing
  const [inlineDraft, setInlineDraft] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNodeId) {
      const node = graph.getNode(editingNodeId);
      if (node) {
        setInlineDraft(node.title);
        setTimeout(() => {
          if (inlineInputRef.current) {
            inlineInputRef.current.focus();
            inlineInputRef.current.select();
          }
        }, 30);
      }
    }
  }, [editingNodeId, graph]);

  // Stage description expanded map (Requirement 3: collapsed by default)
  const [expandedStageDescMap, setExpandedStageDescMap] = useState<Record<string, boolean>>({});
  // Card content expanded map (Request 1: Xem thêm / thu gọn nội dung bên trong node)
  const [expandedCardContentMap, setExpandedCardContentMap] = useState<Record<string, boolean>>({});
  // Group collapse map (collapse group columns into 1-column stacked rows mode)
  const [collapsedGroupsMap, setCollapsedGroupsMap] = useState<Record<string, boolean>>({});
  // Stage cards collapse map when inside a collapsed group
  const [collapsedGroupStageCardsMap, setCollapsedGroupStageCardsMap] = useState<Record<string, boolean>>({});

  // Film Script (Kịch bản phim) Full Popup state
  const [filmScriptStageId, setFilmScriptStageId] = useState<string | null>(null);
  const [isFilmScriptModalOpen, setIsFilmScriptModalOpen] = useState(false);

  // Cross-link dropdown state
  const [openCrossLinkMenuCardId, setOpenCrossLinkMenuCardId] = useState<string | null>(null);

  // Group and Stage items definition (Requirement 1: Column Groups)
  interface ColumnGroupItem {
    type: 'group';
    groupNode: NodeModel;
    stages: NodeModel[];
  }

  interface StandaloneColumnItem {
    type: 'stage';
    stageNode: NodeModel;
  }

  type BoardItem = ColumnGroupItem | StandaloneColumnItem;

  const boardItems: BoardItem[] = (() => {
    if (!rootNode) return [];
    const items: BoardItem[] = [];

    rootNode.childrenIds.forEach(childId => {
      const node = graph.getNode(childId);
      if (!node) return;
      if (node.isGroup) {
        const groupStages = node.childrenIds
          .map(sId => graph.getNode(sId))
          .filter((s): s is NodeModel => !!s);
        items.push({
          type: 'group',
          groupNode: node,
          stages: groupStages,
        });
      } else {
        items.push({
          type: 'stage',
          stageNode: node,
        });
      }
    });

    return items;
  })();

  // All stage columns across groups and standalone
  const stages: NodeModel[] = boardItems.flatMap(item =>
    item.type === 'group' ? item.stages : [item.stageNode]
  );

  // Determine which stage contains the selected node
  const activeStageId = (() => {
    if (!selectedNodeId) return null;
    if (stages.some(s => s.id === selectedNodeId)) return selectedNodeId;
    const selected = graph.getNode(selectedNodeId);
    if (selected && selected.parentId && stages.some(s => s.id === selected.parentId)) {
      return selected.parentId;
    }
    return null;
  })();

  const handleFinishEditing = () => {
    if (editingNodeId) {
      const trimmed = inlineDraft.trim();
      if (trimmed) {
        onFinishEditTitle(editingNodeId, trimmed);
      } else {
        onCancelEditTitle();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEditTitle();
    }
  };

  // Add new Column Group (Requirement 1: Node nhóm các cột)
  const handleAddNewGroup = () => {
    if (!rootNode) return;
    onPushSnapshot?.();
    const groupCount = boardItems.filter(item => item.type === 'group').length + 1;

    // Check if user selected a standalone column under root
    let selectedStandaloneCol: NodeModel | null = null;
    if (selectedNodeId) {
      const sel = graph.getNode(selectedNodeId);
      if (sel) {
        if (sel.parentId === graph.rootId && !sel.isGroup) {
          selectedStandaloneCol = sel;
        } else if (sel.parentId) {
          const p = graph.getNode(sel.parentId);
          if (p && p.parentId === graph.rootId && !p.isGroup) {
            selectedStandaloneCol = p;
          }
        }
      }
    }

    const groupColors = [
      '#6366f1',
      '#8b5cf6',
      '#3b82f6',
      '#06b6d4',
      '#10b981',
      '#f59e0b',
      '#ec4899',
      '#f97316',
      '#14b8a6',
      '#e11d48',
    ];
    const chosenGroupColor = groupColors[(groupCount - 1) % groupColors.length];

    const newGroup = graph.addNode(graph.rootId, {
      title: `Nhóm Tiến Trình ${groupCount}`,
      isGroup: true,
      style: {
        shape: 'rounded-rect',
        fillColor: '#f8fafc',
        textColor: '#1e293b',
        borderColor: chosenGroupColor,
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 14,
      },
    });

    if (selectedStandaloneCol) {
      const colId = selectedStandaloneCol.id;
      rootNode.childrenIds = rootNode.childrenIds.filter(id => id !== colId && id !== newGroup.id);
      rootNode.childrenIds.push(newGroup.id);
      selectedStandaloneCol.parentId = newGroup.id;
      newGroup.childrenIds = [colId];
    } else {
      // Add initial first column inside this group (clean and empty, no auto-created card)
      const newStage = graph.addNode(newGroup.id, {
        title: `Tiến trình 01 (Nhóm ${groupCount})`,
        content: '',
        isGroup: false,
        childrenIds: [],
        style: {
          shape: 'rounded-rect',
          fillColor: '#ffffff',
          textColor: '#1e293b',
          borderColor: chosenGroupColor,
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 14,
        },
      });
      newStage.childrenIds = [];
    }

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(newGroup.id);
    onShowToast?.(`Đã tạo nhóm cột "${newGroup.title}"!`);

    setTimeout(() => {
      const el = document.getElementById(`flowchart-group-${newGroup.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
  };

  // Add stage to existing group
  const handleAddStageToGroup = (groupId: string) => {
    handleAddNewStage(groupId);
  };

  // Ungroup: dissolve group and move its columns to root
  const handleUngroup = (groupId: string) => {
    const groupNode = graph.getNode(groupId);
    if (!groupNode || !rootNode) return;
    onPushSnapshot?.();
    const groupIdx = rootNode.childrenIds.indexOf(groupId);
    if (groupIdx === -1) return;

    const stagesInGroup = [...groupNode.childrenIds];
    stagesInGroup.forEach(sId => {
      const stage = graph.getNode(sId);
      if (stage) {
        stage.setParent(graph.rootId);
      }
    });

    const newChildrenIds = [...rootNode.childrenIds];
    newChildrenIds.splice(groupIdx, 1, ...stagesInGroup);
    rootNode.childrenIds = newChildrenIds;

    graph.nodes.delete(groupId);
    for (const [rId, rel] of graph.relations.entries()) {
      if (rel.sourceId === groupId || rel.targetId === groupId) {
        graph.relations.delete(rId);
      }
    }
    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(null);
    onShowToast?.(t('ungroupSuccess'));
  };

  // Remove a stage from its group and place as standalone column
  const handleRemoveStageFromGroup = (stageId: string, currentGroupId: string) => {
    const stage = graph.getNode(stageId);
    const group = graph.getNode(currentGroupId);
    if (!stage || !group || !rootNode) return;
    onPushSnapshot?.();

    group.removeChild(stageId);
    stage.setParent(graph.rootId);

    const groupIdx = rootNode.childrenIds.indexOf(currentGroupId);
    if (groupIdx !== -1) {
      rootNode.childrenIds.splice(groupIdx + 1, 0, stageId);
    } else {
      rootNode.addChild(stageId);
    }

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(stageId);
    onShowToast?.(`Đã tách cột "${stage.title}" ra khỏi nhóm!`);
  };

  // Create a new column group from an existing standalone stage
  const handleCreateGroupFromStage = (stageId: string) => {
    const stage = graph.getNode(stageId);
    if (!stage || !rootNode) return;
    onPushSnapshot?.();
    const stageIdx = rootNode.childrenIds.indexOf(stageId);
    if (stageIdx === -1) return;

    const newGroup = graph.addNode(graph.rootId, {
      title: `Nhóm ${stage.title}`,
      isGroup: true,
      style: {
        shape: 'rounded-rect',
        fillColor: '#f8fafc',
        textColor: '#1e293b',
        borderColor: stage.style.borderColor || '#6366f1',
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 14,
      },
    });

    stage.setParent(newGroup.id);
    const newChildren = rootNode.childrenIds.filter(id => id !== stageId && id !== newGroup.id);
    newChildren.splice(stageIdx, 0, newGroup.id);
    rootNode.childrenIds = newChildren;
    newGroup.childrenIds = [stageId];

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(newGroup.id);
    onShowToast?.(`Đã tạo nhóm "${newGroup.title}" cho cột này!`);
  };

  // Reparent a stage column into an existing group
  const handleReparentStageToGroup = (stageId: string, targetGroupId: string) => {
    const stage = graph.getNode(stageId);
    const targetGroup = graph.getNode(targetGroupId);
    if (!stage || !targetGroup || !rootNode) return;
    if (stage.parentId === targetGroupId) return;
    onPushSnapshot?.();

    if (stage.parentId) {
      const oldParent = graph.getNode(stage.parentId);
      if (oldParent) {
        oldParent.removeChild(stageId);
      }
    }

    stage.setParent(targetGroupId);
    targetGroup.addChild(stageId);

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(stageId);
    onShowToast?.(`Đã đưa cột "${stage.title}" vào nhóm "${targetGroup.title}"!`);
  };

  // Convert a sub-node/card in a column into an independent column (Requirement 2)
  const handleConvertCardToColumn = (cardId: string, currentStageId: string) => {
    const cardNode = graph.getNode(cardId);
    if (!cardNode) return;
    const currentStage = graph.getNode(currentStageId);
    if (!currentStage) return;

    // Target parent is currentStage's parent (group or root)
    const targetParentId = currentStage.parentId || graph.rootId;
    const targetParent = graph.getNode(targetParentId);
    if (!targetParent) return;
    onPushSnapshot?.();

    // Remove from current parent
    if (cardNode.parentId) {
      const oldParent = graph.getNode(cardNode.parentId);
      if (oldParent) {
        oldParent.removeChild(cardId);
      }
    }

    // Set as column node
    cardNode.setParent(targetParentId);
    cardNode.isGroup = false;

    // Insert right after currentStage
    const currentIdx = targetParent.childrenIds.indexOf(currentStageId);
    if (currentIdx !== -1) {
      targetParent.childrenIds.splice(currentIdx + 1, 0, cardId);
    } else {
      targetParent.addChild(cardId);
    }

    // Give column styling
    cardNode.style.shape = 'rounded-rect';
    cardNode.style.borderWidth = 2;
    if (!cardNode.style.borderColor || cardNode.style.borderColor === '#3b82f6') {
      cardNode.style.borderColor = '#6366f1';
    }

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(cardId);
    onShowToast?.(t('convertCardToColumnSuccess', { title: cardNode.title }));
  };

  // Add new stage (supports inserting adjacent to selected column and into the same group)
  const handleAddNewStage = (targetParentId?: string, insertAfterId?: string) => {
    if (!rootNode) return;
    onPushSnapshot?.();

    let parentId = targetParentId;
    let insertAfter = insertAfterId;

    if (!parentId) {
      if (selectedNodeId) {
        const selected = graph.getNode(selectedNodeId);
        if (selected) {
          if (selected.isGroup) {
            // Group selected -> add new stage column inside this group
            parentId = selected.id;
          } else {
            // Trace up to find which stage column and group contain this node
            let stageCol: NodeModel | null = null;
            let groupParent: NodeModel | null = null;

            let curr: NodeModel | null = selected;
            while (curr && curr.parentId) {
              const p = graph.getNode(curr.parentId);
              if (!p) break;
              if (p.isGroup) {
                stageCol = curr;
                groupParent = p;
                break;
              } else if (p.id === graph.rootId) {
                stageCol = curr;
                groupParent = null;
                break;
              }
              curr = p;
            }

            if (groupParent) {
              parentId = groupParent.id;
              insertAfter = stageCol ? stageCol.id : selected.id;
            } else if (stageCol) {
              parentId = graph.rootId;
              insertAfter = stageCol.id;
            } else {
              parentId = selected.parentId || graph.rootId;
              insertAfter = selected.id;
            }
          }
        }
      }
    }

    // If still no parent specified, check if there's only 1 group on the board
    if (!parentId) {
      const groupsOnBoard = boardItems.filter(item => item.type === 'group');
      if (groupsOnBoard.length === 1) {
        parentId = groupsOnBoard[0].groupNode.id;
      } else {
        parentId = graph.rootId;
      }
    }

    const parentNode = graph.getNode(parentId);
    if (!parentNode) return;

    const countInParent = parentNode.childrenIds.length + 1;
    const stageIndex = stages.length + 1;
    const defaultColors = [
      '#3b82f6',
      '#10b981',
      '#8b5cf6',
      '#f59e0b',
      '#ec4899',
      '#06b6d4',
      '#f97316',
      '#6366f1',
      '#14b8a6',
      '#e11d48',
    ];
    const chosenColor = parentNode.isGroup
      ? (parentNode.style.borderColor || '#6366f1')
      : defaultColors[(stageIndex - 1) % defaultColors.length];

    const stageTitle = parentNode.isGroup
      ? `Tiến trình ${countInParent < 10 ? '0' + countInParent : countInParent}`
      : `${stageIndex < 10 ? '0' + stageIndex : stageIndex}. Tiến Trình ${stageIndex}`;

    // Create new stage column node strictly under parentNode (Group or Root)
    const newStage = graph.addNode(parentId, {
      title: stageTitle,
      content: '',
      isGroup: false,
      childrenIds: [],
      style: {
        shape: 'rounded-rect',
        fillColor: '#ffffff',
        textColor: '#0f172a',
        borderColor: chosenColor,
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 14,
      },
    });

    // Ensure empty children list for the new stage column
    newStage.childrenIds = [];

    // If insertAfter is specified and in parent's childrenIds, place immediately adjacent!
    if (insertAfter && parentNode.childrenIds.includes(insertAfter)) {
      const currentIdx = parentNode.childrenIds.indexOf(insertAfter);
      const withoutNew = parentNode.childrenIds.filter(id => id !== newStage.id);
      withoutNew.splice(currentIdx + 1, 0, newStage.id);
      parentNode.childrenIds = withoutNew;
    }

    // Clean up to guarantee no other stage column accidentally has newStage in its childrenIds
    stages.forEach(existingStage => {
      if (existingStage.id !== parentNode.id && existingStage.id !== newStage.id) {
        if (existingStage.childrenIds.includes(newStage.id)) {
          existingStage.removeChild(newStage.id);
        }
      }
    });

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(newStage.id);
    if (parentNode.isGroup) {
      onShowToast?.(`Đã thêm cột mới vào nhóm "${parentNode.title}"!`);
    } else {
      onShowToast?.(`Đã thêm cột tiến trình mới!`);
    }
  };

  // Reorder stage columns: move left or right within its respective container (group or root)
  const handleMoveStage = (stageId: string, direction: 'left' | 'right') => {
    if (!rootNode) return;
    const stageNode = graph.getNode(stageId);
    if (!stageNode) return;

    // The stage's parent can be a Group node OR the Root node
    const parentId = stageNode.parentId || graph.rootId;
    const parentNode = graph.getNode(parentId);
    if (!parentNode) return;

    const currentIdx = parentNode.childrenIds.indexOf(stageId);
    if (currentIdx === -1) return;
    const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= parentNode.childrenIds.length) return;

    onPushSnapshot?.();
    const newChildrenIds = [...parentNode.childrenIds];
    newChildrenIds.splice(currentIdx, 1);
    newChildrenIds.splice(targetIdx, 0, stageId);
    parentNode.childrenIds = newChildrenIds;

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(stageId);
  };

  // Create sample 4 stages if board is empty
  const handleCreateSampleStages = () => {
    onPushSnapshot?.();
    const sampleGraph = MindmapGraph.createFlowchartDefault(rootNode?.title || 'Quy Trình Triển Khai');
    graph.nodes = sampleGraph.nodes;
    graph.relations = sampleGraph.relations;
    graph.rootId = sampleGraph.rootId;
    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onSelectNode(null);
  };

  // Card movement across stages
  const handleMoveCardStage = (cardId: string, direction: 'prev' | 'next', currentStageId: string) => {
    const currentIdx = stages.findIndex(s => s.id === currentStageId);
    if (currentIdx === -1) return;

    const targetIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const targetStage = stages[targetIdx];
    onReparent(cardId, targetStage.id);
  };

  // Tự động tìm kiếm các node cha cấu hình nhân vật và tạo liên kết chéo với các node con của chúng
  const handleAutoLinkCharacterNodes = (targetNodeId: string) => {
    const targetNode = graph.getNode(targetNodeId);
    if (!targetNode) return;

    // 1. Tìm tất cả node cha ở flow chart đang ở dạng Node cấu hình nhân vật
    const allNodes = graph.getAllNodes();
    const characterParentNodes = allNodes.filter(
      n =>
        n.id !== targetNode.id &&
        (n.nodeType === 'character_profile' || (n.characterProfiles && n.characterProfiles.length > 0))
    );

    if (characterParentNodes.length === 0) {
      onShowToast?.('Không tìm thấy node cha nào đang ở dạng Node cấu hình nhân vật trong sơ đồ!');
      return;
    }

    onPushSnapshot?.();

    // 2. Thu thập tất cả các node con của các node cha cấu hình nhân vật đó (loại bỏ trùng lặp tuyệt đối)
    const characterChildNodes: NodeModel[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    const tryAddChild = (child: NodeModel | undefined | null) => {
      if (!child || child.id === targetNode.id) return;
      if (seenIds.has(child.id)) return;
      const cleanTitle = (child.title || '').trim().toLowerCase();
      if (cleanTitle && seenTitles.has(cleanTitle)) return;

      seenIds.add(child.id);
      if (cleanTitle) seenTitles.add(cleanTitle);
      characterChildNodes.push(child);
    };

    characterParentNodes.forEach(parentNode => {
      // Các node con đã có sẵn trong sơ đồ
      parentNode.childrenIds.forEach(cid => {
        tryAddChild(graph.getNode(cid));
      });

      // Nếu node cha có dữ liệu bảng nhân vật nhưng chưa bung thành các node con, tự động sinh node con
      const profiles = parentNode.getCharacterProfiles();
      if (parentNode.childrenIds.length === 0 && profiles.length > 0) {
        profiles.forEach((p, pIdx) => {
          const charName = p.name?.trim() || `Nhân vật ${pIdx + 1}`;
          const cleanName = charName.toLowerCase();
          if (seenTitles.has(cleanName)) return;

          const summary = formatCharacterSummary(p, pIdx, profiles.length);
          const colors = getFactionColorScheme(p.faction);
          const newChild = graph.addNode(parentNode.id, {
            title: charName,
            content: summary,
            contents: [summary],
            nodeType: 'character_profile',
            characterProfile: { ...p, name: charName },
            characterProfiles: [{ ...p, name: charName }],
            style: {
              shape: 'rounded-rect',
              fillColor: colors.fillColor,
              textColor: colors.textColor,
              borderColor: colors.borderColor,
              borderWidth: 2,
              borderStyle: 'solid',
              fontSize: 13,
            },
          });
          if (newChild) {
            tryAddChild(newChild);
          }
        });
      }
    });

    // Bổ sung các node nhân vật cá nhân trong sơ đồ
    allNodes.forEach(n => {
      if (n.id !== targetNode.id && (n.nodeType === 'character_profile' || n.characterProfile)) {
        if (n.parentId && characterParentNodes.some(p => p.id === n.parentId)) {
          tryAddChild(n);
        }
      }
    });

    if (characterChildNodes.length === 0) {
      onShowToast?.('Đã tìm thấy node cấu hình nhân vật nhưng chưa có node con nhân vật nào!');
      return;
    }

    // Dọn dẹp bất kỳ liên kết trùng lặp cũ nào trỏ tới targetNode
    const edgePairsSeen = new Set<string>();
    const dupEdgeIdsToDelete: string[] = [];
    graph.relations.forEach((rel, relId) => {
      if (rel.sourceId === targetNode.id || rel.targetId === targetNode.id) {
        const otherId = rel.sourceId === targetNode.id ? rel.targetId : rel.sourceId;
        if (edgePairsSeen.has(otherId)) {
          dupEdgeIdsToDelete.push(relId);
        } else {
          edgePairsSeen.add(otherId);
        }
      }
    });
    dupEdgeIdsToDelete.forEach(relId => graph.relations.delete(relId));

    // 3. Tự động tạo liên kết chéo với cột cha hiện tại với các node con đó
    let linkedCount = 0;
    characterChildNodes.forEach(childChar => {
      const edge = graph.addCrossLink(childChar.id, targetNode.id, 'Nhân vật', {
        color: '#8b5cf6',
        style: 'dashed',
        arrow: 'end',
        width: 2,
      });
      if (edge) linkedCount++;
    });

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onShowToast?.(
      `Đã tự động tạo liên kết chéo với ${characterChildNodes.length} node nhân vật vào cột "${targetNode.title}"!`
    );
  };

  // Drag and drop handlers for Cards
  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', cardId);
    setDraggingCardId(cardId);
  };

  const handleCardDragEnd = () => {
    setDraggingCardId(null);
    setDragOverStageId(null);
    setDragOverCardId(null);
  };

  const handleCardDragOver = (e: React.DragEvent, targetCardId: string) => {
    if (draggingCardId && draggingCardId !== targetCardId) {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverCardId !== targetCardId) {
        setDragOverCardId(targetCardId);
      }
    }
  };

  const handleCardDragLeave = (e: React.DragEvent, targetCardId: string) => {
    e.stopPropagation();
    if (dragOverCardId === targetCardId) {
      setDragOverCardId(null);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setDragOverStageId(null);
    const draggedId = e.dataTransfer.getData('text/plain') || draggingCardId;
    if (draggedId && draggedId !== targetCardId) {
      if (!graph.isDescendant(draggedId, targetCardId)) {
        onReparent(draggedId, targetCardId);
      }
    }
    setDraggingCardId(null);
  };

  // Drag and drop handlers for Stage Columns
  const handleStageDragStart = (e: React.DragEvent, stageId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/x-stage-id', stageId);
    setDraggingStageId(stageId);
  };

  const handleStageColumnDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggingStageId && draggingStageId !== stageId) {
      if (dragOverStageColumnId !== stageId) {
        setDragOverStageColumnId(stageId);
      }
    } else if (draggingCardId) {
      if (dragOverStageId !== stageId) {
        setDragOverStageId(stageId);
      }
    }
  };

  const handleStageColumnDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const draggedStageId = e.dataTransfer.getData('text/x-stage-id') || draggingStageId;
    if (draggedStageId && draggedStageId !== targetStageId && rootNode) {
      const draggedNode = graph.getNode(draggedStageId);
      const targetNode = graph.getNode(targetStageId);

      if (draggedNode && targetNode) {
        onPushSnapshot?.();
        const oldParentId = draggedNode.parentId || graph.rootId;
        const targetParentId = targetNode.parentId || graph.rootId;
        const oldParent = graph.getNode(oldParentId);
        const targetParent = graph.getNode(targetParentId);

        if (oldParent && targetParent) {
          if (oldParentId === targetParentId) {
            // Reorder within same parent
            const currentIdx = oldParent.childrenIds.indexOf(draggedStageId);
            const targetIdx = oldParent.childrenIds.indexOf(targetStageId);
            if (currentIdx !== -1 && targetIdx !== -1) {
              const newIds = [...oldParent.childrenIds];
              newIds.splice(currentIdx, 1);
              newIds.splice(targetIdx, 0, draggedStageId);
              oldParent.childrenIds = newIds;
            }
          } else {
            // Moving across groups or between root and group
            oldParent.removeChild(draggedStageId);
            draggedNode.setParent(targetParentId === graph.rootId ? graph.rootId : targetParentId);
            const targetIdx = targetParent.childrenIds.indexOf(targetStageId);
            if (targetIdx !== -1) {
              targetParent.childrenIds.splice(targetIdx, 0, draggedStageId);
            } else {
              targetParent.addChild(draggedStageId);
            }
          }

          graph.meta.updatedAt = new Date().toISOString();
          onUpdateGraph?.(graph);
          onSelectNode(draggedStageId);
        }
      }

      setDraggingStageId(null);
      setDragOverStageColumnId(null);
      return;
    }

    // Otherwise it's a card drop into this stage
    setDragOverStageId(null);
    setDragOverStageColumnId(null);
    const cardId = e.dataTransfer.getData('text/plain') || draggingCardId;
    if (cardId && cardId !== targetStageId) {
      onReparent(cardId, targetStageId);
    }
    setDraggingCardId(null);
    setDraggingStageId(null);
  };

  // Recursive renderer for cards and their child branches (to the right, in the same column)
  const renderCardBranch = (
    card: NodeModel,
    level: number = 0,
    cardIdx: number = 0,
    stageId: string,
    stageColor: string
  ): React.ReactNode => {
    const isCardSelected = selectedNodeId === card.id;
    const isCardDragTarget = dragOverCardId === card.id;
    const checklist = card.checklist || [];
    const completedCount = checklist.filter(c => c.completed).length;
    const firstContent = card.getFirstContent();
    const hasContent = !!(firstContent && firstContent.trim());
    const cardColor = card.style.borderColor || stageColor;
    const isCustomFill = card.style.fillColor && card.style.fillColor !== '#ffffff' && card.style.fillColor !== '#fff';
    const isCustomText = card.style.textColor && card.style.textColor !== '#0f172a';
    const stageIdx = stages.findIndex(s => s.id === stageId);

    // Get direct child cards of this card
    const childCards = card.childrenIds
      .map(id => graph.getNode(id))
      .filter((c): c is NodeModel => !!c);

    const cardElement = (
      <div
        key={card.id}
        id={`flowchart-card-${card.id}`}
        draggable={true}
        onDragStart={e => handleCardDragStart(e, card.id)}
        onDragEnd={handleCardDragEnd}
        onDragOver={e => handleCardDragOver(e, card.id)}
        onDragLeave={e => handleCardDragLeave(e, card.id)}
        onDrop={e => handleCardDrop(e, card.id)}
        onClick={e => {
          e.stopPropagation();
          onSelectNode(card.id);
        }}
        style={{
          backgroundColor: isCustomFill ? card.style.fillColor : '#ffffff',
          borderColor: isCardSelected ? undefined : (card.style.borderColor || undefined),
          borderWidth: card.style.borderWidth ? `${card.style.borderWidth}px` : undefined,
          borderStyle: card.style.borderStyle || undefined,
          color: isCustomText ? card.style.textColor : undefined,
          zIndex: openCrossLinkMenuCardId === card.id ? 40 : undefined,
        }}
        className={`group/card relative w-[288px] shrink-0 rounded-xl p-3 border transition-all cursor-pointer ${
          isCardDragTarget
            ? 'border-indigo-600 ring-4 ring-indigo-400/40 bg-indigo-50/70 shadow-lg scale-[1.02]'
            : isCardSelected
            ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20 bg-blue-50/20'
            : !card.style.borderColor
            ? 'border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300'
            : 'shadow-2xs hover:shadow-xs'
        }`}
      >
        {/* Drag-over drop target indicator */}
        {isCardDragTarget && (
          <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-2xs rounded-xl flex items-center justify-center border-2 border-dashed border-indigo-600 z-20 pointer-events-none">
            <span className="text-[11px] font-bold text-indigo-700 bg-white/95 px-2.5 py-1 rounded-lg shadow-xs">
              Thả để làm node con của thẻ này
            </span>
          </div>
        )}
        {/* Left Color Accent Bar */}
        <div
          className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full"
          style={{ backgroundColor: cardColor }}
        />

        {/* Card Header & Title */}
        <div className="pl-2">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <span className="font-semibold text-slate-500">
                {level === 0 ? `${t('flowchartStep')} ${cardIdx + 1}` : `Thẻ con ${cardIdx + 1}`}
              </span>
              <span>·</span>
              <span className="font-mono text-[9px] text-slate-400">[{card.id}]</span>
              {card.nodeType === 'character_profile' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 font-semibold flex items-center gap-0.5 border border-purple-200" title="Node cấu hình nhân vật">
                  <User className="w-2.5 h-2.5" />
                  <span>NV</span>
                </span>
              )}
              {(() => {
                const crossLinks = graph.getCrossLinksForNode(card.id);
                if (crossLinks.length === 0) return null;

                if (crossLinks.length === 1) {
                  const item = crossLinks[0];
                  return (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectNode(item.otherNode.id);
                        onShowToast?.(`Đã nhảy tới node liên kết [${item.otherNode.id}] ${item.otherNode.title}`);
                      }}
                      title={`Liên kết chéo ${item.isSource ? 'xuất tới' : 'nhận từ'} [${item.otherNode.id}] ${item.otherNode.title}`}
                      className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1 py-0.2 rounded transition-all cursor-pointer shadow-2xs"
                    >
                      <Unlink className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span>[{item.otherNode.id}]</span>
                    </button>
                  );
                }

                const isMenuOpen = openCrossLinkMenuCardId === card.id;

                return (
                  <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setOpenCrossLinkMenuCardId(prev => (prev === card.id ? null : card.id));
                      }}
                      title="Bấm để xem danh sách node liên kết chéo"
                      className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1.5 py-0.2 rounded transition-all cursor-pointer shadow-2xs select-none"
                    >
                      <Unlink className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                      <span>{crossLinks.length} LK</span>
                      <ChevronDown className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50 min-w-[170px] max-w-[240px] bg-white border border-purple-200 rounded-xl shadow-xl p-1 animate-in fade-in duration-100">
                        <div className="px-2 py-1 text-[9px] font-bold text-purple-700 uppercase border-b border-purple-100 flex items-center justify-between">
                          <span>Liên kết chéo ({crossLinks.length})</span>
                          <X
                            className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              setOpenCrossLinkMenuCardId(null);
                            }}
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto py-0.5 space-y-0.5">
                          {crossLinks.map((item, cIdx) => (
                            <button
                              key={`cross-item-${card.id}-${item.otherNode.id}-${cIdx}`}
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setOpenCrossLinkMenuCardId(null);
                                onSelectNode(item.otherNode.id);
                                onShowToast?.(`Đã nhảy tới node [${item.otherNode.id}] ${item.otherNode.title}`);
                              }}
                              className="w-full text-left px-2 py-1 text-[11px] text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer truncate"
                            >
                              <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-800 shrink-0">
                                [{item.otherNode.id}]
                              </span>
                              <span className="truncate">{item.otherNode.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Quick Stage Move Buttons (Prev / Next) - Only for top-level cards */}
            {level === 0 && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                {stageIdx > 0 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveCardStage(card.id, 'prev', stageId);
                    }}
                    title={t('flowchartMoveLeft')}
                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                )}
                {stageIdx < stages.length - 1 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveCardStage(card.id, 'next', stageId);
                    }}
                    title={t('flowchartMoveRight')}
                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Title (Editable on double click) */}
          {editingNodeId === card.id ? (
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineDraft}
              onChange={e => setInlineDraft(e.target.value)}
              onBlur={handleFinishEditing}
              onKeyDown={handleKeyDown}
              className="text-xs font-semibold text-slate-800 bg-white border border-blue-500 rounded px-1.5 py-0.5 focus:outline-none w-full"
            />
          ) : (
            <h5
              onDoubleClick={e => {
                e.stopPropagation();
                onStartEditTitle(card.id);
              }}
              style={{ color: isCustomText ? card.style.textColor : undefined }}
              className={`text-xs font-semibold leading-snug line-clamp-2 transition-colors ${
                !isCustomText ? 'text-slate-800 group-hover/card:text-blue-600' : ''
              }`}
            >
              {card.title}
            </h5>
          )}

          {/* Content Notes Snippet with Expandable 'Xem thêm' */}
          {(() => {
            const allBlocks = (card.contents && card.contents.length > 0 ? card.contents : [card.content || '']).filter(c => c && c.trim());
            if (allBlocks.length === 0) return null;

            const isContentExpanded = !!expandedCardContentMap[card.id];
            const firstBlock = allBlocks[0];
            const isExpandable = allBlocks.length > 1 || firstBlock.length > 60 || firstBlock.includes('\n');

            return (
              <div className="mt-1 pt-1 border-t border-slate-100/80 text-left">
                {isContentExpanded ? (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {allBlocks.map((block, bIdx) => (
                      <div
                        key={`card-${card.id}-block-${bIdx}`}
                        className="text-[11px] text-slate-600 leading-relaxed font-normal bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 whitespace-pre-wrap"
                      >
                        {allBlocks.length > 1 && (
                          <div className="text-[9px] font-bold text-indigo-600 mb-0.5 uppercase tracking-wider">
                            Nội dung {bIdx + 1}
                          </div>
                        )}
                        {block}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal line-clamp-2">
                    {firstBlock}
                  </p>
                )}

                {isExpandable && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setExpandedCardContentMap(prev => ({
                        ...prev,
                        [card.id]: !prev[card.id],
                      }));
                    }}
                    className="mt-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>
                      {isContentExpanded
                        ? (t('collapseDesc') || 'Thu gọn')
                        : allBlocks.length > 1
                        ? `Xem thêm (${allBlocks.length} nội dung)`
                        : (t('expandDesc') || 'Xem thêm')}
                    </span>
                    {isContentExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Checklist Progress */}
          {checklist.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1 font-medium">
                  <CheckSquare className="w-3 h-3 text-emerald-600" />
                  <span>Checklist</span>
                </span>
                <span>
                  {completedCount}/{checklist.length}
                </span>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${(completedCount / checklist.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Bottom Card Footer & Action Buttons */}
          <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              {/* Nút Check trạng thái Done (tròn Xanh Lá) hoặc Chưa */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onPushSnapshot?.();
                  const isDone = card.toggleCompleted();
                  graph.meta.updatedAt = new Date().toISOString();
                  onUpdateGraph?.(graph);
                  onShowToast?.(
                    isDone
                      ? `Đã hoàn thành thẻ: "${card.title}"!`
                      : `Chưa hoàn thành thẻ: "${card.title}"`
                  );
                }}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none ${
                  card.completed
                    ? 'bg-emerald-500 border-emerald-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/60'
                }`}
                title={
                  card.completed
                    ? 'Đã hoàn thành (Done) - Nhấp để chuyển sang Chưa'
                    : 'Chưa hoàn thành - Nhấp để đánh dấu Done'
                }
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    card.completed
                      ? 'bg-white text-emerald-600'
                      : 'border-2 border-slate-300 hover:border-emerald-500'
                  }`}
                >
                  {card.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span className="text-[10px] font-semibold leading-none">
                  {card.completed ? 'Done' : 'Chưa'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1 opacity-60 group-hover/card:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onAddChildNode(card.id);
                  onShowToast?.(`Đã tạo node con cho thẻ "${card.title}"!`);
                }}
                title={t('addSubNodeToCard') || 'Tạo node con'}
                className="p-1 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onStartEditTitle(card.id);
                }}
                title="Sửa tên thẻ"
                className="p-1 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenDetailModal(card.id);
                }}
                title="Mở chi tiết thẻ"
                className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleConvertCardToColumn(card.id, stageId);
                }}
                title={t('convertCardToColumn') || 'Biến thành 1 cột riêng'}
                className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              {onDeleteNode && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteNode(card.id);
                  }}
                  title="Xóa thẻ này"
                  className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    // If no child cards to the right, just return this card
    if (childCards.length === 0) {
      return cardElement;
    }

    // If there ARE child cards, place them to the RIGHT of this card inside the SAME column
    return (
      <div key={`branch-${card.id}`} className="flex items-center gap-1.5">
        {/* The Card */}
        {cardElement}

        {/* Stem from card to vertical connector line */}
        <div className="flex items-center shrink-0">
          <div className="w-3 h-0.5" style={{ backgroundColor: stageColor }} />
        </div>

        {/* Child Cards Stack with horizontal connector branch (inside same column) */}
        <div
          className="relative flex flex-col gap-2.5 border-l-2 pl-3 py-1"
          style={{ borderColor: stageColor }}
        >
          {childCards.map((childCard, childIdx) => (
            <div key={`child-wrap-${childCard.id}`} className="relative flex items-center">
              {/* Horizontal branch line from vertical border */}
              <div
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-0.5"
                style={{ backgroundColor: stageColor }}
              />
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex items-center">
                <ArrowRight className="w-3 h-3 stroke-[2.5]" style={{ color: stageColor }} />
              </div>
              <div className="pl-1">
                {renderCardBranch(childCard, level + 1, childIdx, stageId, stageColor)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render an individual stage column (can be standalone or inside a group)
  const renderStageColumn = (
    stage: NodeModel,
    stageIdx: number,
    parentGroupId?: string
  ): React.ReactNode => {
    const isStageSelected = selectedNodeId === stage.id;
    const isCardDragOver = dragOverStageId === stage.id;
    const isColumnDragOver = dragOverStageColumnId === stage.id;
    const stageColor = stage.style.borderColor || '#3b82f6';
    const isCustomStageFill =
      stage.style.fillColor &&
      stage.style.fillColor !== '#ffffff' &&
      stage.style.fillColor !== '#fff';
    const stageHeaderBg = isCustomStageFill ? stage.style.fillColor : '#ffffff';
    const stageTextColor = stage.style.textColor || '#0f172a';
    const childCards = stage.childrenIds
      .map(id => graph.getNode(id))
      .filter((c): c is NodeModel => !!c);

    // Calculate total cards in this stage including branches to the right
    const countAllStageCards = (stageNode: NodeModel): number => {
      let count = 0;
      const traverse = (nodeId: string) => {
        const node = graph.getNode(nodeId);
        if (!node) return;
        count++;
        node.childrenIds.forEach(traverse);
      };
      stageNode.childrenIds.forEach(traverse);
      return count;
    };
    const totalStageCards = countAllStageCards(stage);
    const hasStageContent = !!(stage.content && stage.content.trim());
    const isDescExpanded = !!expandedStageDescMap[stage.id];

    // Calculate maximum horizontal node columns (depth) in this stage
    const getMaxStageBranchDepth = (stageNode: NodeModel): number => {
      if (stageNode.childrenIds.length === 0) return 1;
      const getDepth = (nodeId: string): number => {
        const node = graph.getNode(nodeId);
        if (!node || node.childrenIds.length === 0) return 1;
        let maxChildDepth = 0;
        for (const childId of node.childrenIds) {
          maxChildDepth = Math.max(maxChildDepth, getDepth(childId));
        }
        return 1 + maxChildDepth;
      };
      let maxDepth = 1;
      for (const cardId of stageNode.childrenIds) {
        maxDepth = Math.max(maxDepth, getDepth(cardId));
      }
      return maxDepth;
    };

    const maxNodeColumns = getMaxStageBranchDepth(stage);
    // Width = (number of node columns * 288px) + (connectors between columns * 34px) + (padding 24px)
    const stageWidth = maxNodeColumns * 288 + (maxNodeColumns - 1) * 34 + 24;

    return (
      <div
        key={stage.id}
        id={`flowchart-stage-col-${stage.id}`}
        onDragOver={e => handleStageColumnDragOver(e, stage.id)}
        onDrop={e => handleStageColumnDrop(e, stage.id)}
        style={{
          width: `${stageWidth}px`,
          minWidth: `${stageWidth}px`,
          borderColor:
            isColumnDragOver || isCardDragOver || isStageSelected
              ? undefined
              : `${stageColor}40`,
        }}
        className={`shrink-0 flex flex-col bg-slate-50/90 rounded-2xl border-2 transition-all ${
          isColumnDragOver
            ? 'border-indigo-600 ring-4 ring-indigo-400/40 bg-indigo-50/60 shadow-xl scale-[1.01]'
            : isCardDragOver
            ? 'border-indigo-500 ring-2 ring-indigo-400/30 bg-indigo-50/30 shadow-md'
            : isStageSelected
            ? 'border-blue-500 shadow-md ring-2 ring-blue-400/30'
            : 'shadow-2xs hover:shadow-sm'
        }`}
      >
        {/* Top Color Accent Stripe */}
        <div
          className="h-1.5 w-full rounded-t-xl shrink-0"
          style={{ backgroundColor: stageColor }}
        />

        {/* Stage Header */}
        <div
          onClick={e => {
            e.stopPropagation();
            onSelectNode(stage.id);
          }}
          style={{
            backgroundColor: stageHeaderBg,
            color: stageTextColor,
          }}
          className="p-3 border-b border-slate-100 flex flex-col gap-2 cursor-pointer group"
        >
          {/* Top Row: Meta Badge, Count & Header Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Drag Handle to Reorder Column */}
              <div
                draggable={true}
                onDragStart={e => handleStageDragStart(e, stage.id)}
                onDragEnd={() => {
                  setDraggingStageId(null);
                  setDragOverStageColumnId(null);
                }}
                title={t('flowchartDragStageHint')}
                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors shrink-0"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Stage Number Badge */}
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-2xs shrink-0"
                style={{ backgroundColor: stageColor }}
              >
                {stageIdx + 1 < 10 ? `0${stageIdx + 1}` : stageIdx + 1}
              </div>

              {/* Sub-info: Card count & ID */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <span>{t('flowchartStepsCount', { count: totalStageCards })}</span>
                <span>·</span>
                <span className="font-mono text-[10px] text-slate-400">[{stage.id}]</span>
                {(() => {
                  const crossLinks = graph.getCrossLinksForNode(stage.id);
                  if (crossLinks.length === 0) return null;

                  if (crossLinks.length === 1) {
                    const item = crossLinks[0];
                    return (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectNode(item.otherNode.id);
                          onShowToast?.(`Đã nhảy tới node liên kết [${item.otherNode.id}] ${item.otherNode.title}`);
                        }}
                        title={`Liên kết chéo ${item.isSource ? 'xuất tới' : 'nhận từ'} [${item.otherNode.id}] ${item.otherNode.title}`}
                        className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1 py-0.2 rounded transition-all cursor-pointer shadow-2xs"
                      >
                        <Unlink className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                        <span>[{item.otherNode.id}]</span>
                      </button>
                    );
                  }

                  const isMenuOpen = openCrossLinkMenuCardId === stage.id;

                  return (
                    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setOpenCrossLinkMenuCardId(prev => (prev === stage.id ? null : stage.id));
                        }}
                        title="Bấm để xem danh sách node liên kết chéo"
                        className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1.5 py-0.2 rounded transition-all cursor-pointer shadow-2xs select-none"
                      >
                        <Unlink className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                        <span>{crossLinks.length} LK</span>
                        <ChevronDown className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute left-0 top-full mt-1 z-50 min-w-[170px] max-w-[240px] bg-white border border-purple-200 rounded-xl shadow-xl p-1 animate-in fade-in duration-100">
                          <div className="px-2 py-1 text-[9px] font-bold text-purple-700 uppercase border-b border-purple-100 flex items-center justify-between">
                            <span>Liên kết chéo ({crossLinks.length})</span>
                            <X
                              className="w-3 h-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                              onClick={e => {
                                e.stopPropagation();
                                setOpenCrossLinkMenuCardId(null);
                              }}
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto py-0.5 space-y-0.5">
                            {crossLinks.map((item, sIdx) => (
                              <button
                                key={`stage-cross-item-${stage.id}-${item.otherNode.id}-${sIdx}`}
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenCrossLinkMenuCardId(null);
                                  onSelectNode(item.otherNode.id);
                                  onShowToast?.(`Đã nhảy tới node [${item.otherNode.id}] ${item.otherNode.title}`);
                                }}
                                className="w-full text-left px-2 py-1 text-[11px] text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer truncate"
                              >
                                <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-800 shrink-0">
                                  [{item.otherNode.id}]
                                </span>
                                <span className="truncate">{item.otherNode.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              {/* Column Reorder Quick Move Left / Right Buttons */}
              <div className="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-0.5">
                {stageIdx > 0 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStage(stage.id, 'left');
                    }}
                    title={t('flowchartMoveStageLeft')}
                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {stageIdx < stages.length - 1 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleMoveStage(stage.id, 'right');
                    }}
                    title={t('flowchartMoveStageRight')}
                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Group management button for column */}
              {parentGroupId ? (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleRemoveStageFromGroup(stage.id, parentGroupId);
                  }}
                  title="Tách cột ra khỏi nhóm"
                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleCreateGroupFromStage(stage.id);
                  }}
                  title="Tạo nhóm cột mới từ cột này"
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Add Adjacent Column Button */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleAddNewStage(parentGroupId || graph.rootId, stage.id);
                }}
                title="Thêm cột tiến trình bên cạnh"
                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleAutoLinkCharacterNodes(stage.id);
                }}
                title="Tự động tạo liên kết node các nhân vật (tạo liên kết chéo với các node con nhân vật)"
                className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setFilmScriptStageId(stage.id);
                  setIsFilmScriptModalOpen(true);
                }}
                title="View dạng Kịch bản phim"
                className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              >
                <Clapperboard className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenDetailModal(stage.id);
                }}
                title="Xem chi tiết tiến trình"
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              {onDeleteNode && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteNode(stage.id);
                  }}
                  title="Xóa cột tiến trình này"
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Full-Width Stage Title Row */}
          <div className="w-full">
            {editingNodeId === stage.id ? (
              <input
                ref={inlineInputRef}
                type="text"
                value={inlineDraft}
                onChange={e => setInlineDraft(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={handleKeyDown}
                className="text-sm font-bold text-slate-800 bg-white border border-blue-500 rounded-lg px-2 py-1 focus:outline-none w-full shadow-2xs"
              />
            ) : (
              <h4
                onDoubleClick={e => {
                  e.stopPropagation();
                  onStartEditTitle(stage.id);
                }}
                className="text-sm font-bold text-slate-800 break-words leading-snug group-hover:text-blue-600 transition-colors"
                title="Nhấp đúp để đổi tên tiến trình"
              >
                {stage.title}
              </h4>
            )}
          </div>

          {/* Stage Description - Collapsed by default in header (Requirement 3) */}
          {hasStageContent && (
            <div className="w-full pt-1.5 border-t border-slate-100/90 text-left">
              <div
                onClick={e => {
                  e.stopPropagation();
                  setExpandedStageDescMap(prev => ({
                    ...prev,
                    [stage.id]: !prev[stage.id],
                  }));
                }}
                className="group/desc flex items-start justify-between gap-2 p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 transition-all cursor-pointer"
                title={isDescExpanded ? (t('collapseDesc') || 'Thu gọn mô tả') : (t('expandDesc') || 'Xem thêm mô tả')}
              >
                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover/desc:text-indigo-500 shrink-0 mt-0.5" />
                  <p
                    className={`text-[11px] text-slate-600 leading-relaxed font-normal ${
                      isDescExpanded ? 'whitespace-pre-wrap' : 'line-clamp-1 truncate'
                    }`}
                  >
                    {stage.content}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover/desc:text-indigo-600 font-medium shrink-0 mt-0.5">
                  <span>{isDescExpanded ? (t('collapseDesc') || 'Thu gọn') : (t('expandDesc') || 'Mô tả')}</span>
                  {isDescExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cards Stack */}
        <div className="p-3 space-y-2.5 min-h-[140px] flex-1">
          {childCards.length === 0 ? (
            <div className="h-28 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-3 text-center text-slate-400 text-xs">
              <Layers className="w-5 h-5 mb-1.5 text-slate-300" />
              <span>{t('flowchartEmptyStage')}</span>
            </div>
          ) : (
            childCards.map((card, cardIdx) =>
              renderCardBranch(card, 0, cardIdx, stage.id, stageColor)
            )
          )}
        </div>

        {/* Add Card Button (Bottom of column) */}
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onAddChildNode(stage.id);
            }}
            style={{
              borderColor: `${stageColor}50`,
              color: stageColor,
            }}
            className="w-full max-w-[288px] py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-dashed rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" style={{ color: stageColor }} />
            <span>{t('flowchartAddCard')}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      id="flowchart-board-container"
      ref={boardContainerRef}
      className="w-full h-full flex flex-col bg-slate-100/70 select-none overflow-hidden"
      onClick={() => {
        onSelectNode(null);
        if (editingNodeId) onCancelEditTitle();
      }}
    >
      {/* Top Process Flow Bar (Pipeline Sequence - Shows Groups & Standalone Columns) */}
      <div className="bg-white border-b border-slate-200/90 px-4 py-2.5 shadow-2xs shrink-0 flex items-center justify-between overflow-x-auto z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto">
          {/* Sequential Group / Stage Track (Full names, no count badges) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {boardItems.length === 0 ? (
              <span className="text-xs text-slate-400 italic">Chưa có nhóm hoặc cột tiến trình nào</span>
            ) : (
              boardItems.map((item, idx) => {
                if (item.type === 'group') {
                  const { groupNode, stages: groupStages } = item;
                  const isGroupActive =
                    selectedNodeId === groupNode.id ||
                    groupStages.some(
                      s => s.id === selectedNodeId || s.childrenIds.includes(selectedNodeId || '')
                    );
                  const groupColor = groupNode.style.borderColor || '#6366f1';

                  return (
                    <React.Fragment key={groupNode.id}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectNode(groupNode.id);
                          const el = document.getElementById(`flowchart-group-${groupNode.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                        }}
                        style={{
                          borderColor: groupColor,
                          backgroundColor: isGroupActive ? groupColor : `${groupColor}14`,
                          color: isGroupActive ? '#ffffff' : groupColor,
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border shadow-2xs hover:opacity-90"
                        title={groupNode.title}
                      >
                        <FolderTree
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: isGroupActive ? '#ffffff' : groupColor }}
                        />
                        <span className="font-bold whitespace-nowrap">{groupNode.title}</span>
                      </button>
                      {idx < boardItems.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                } else {
                  const stage = item.stageNode;
                  const isActive = activeStageId === stage.id;
                  return (
                    <React.Fragment key={stage.id}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectNode(stage.id);
                          const el = document.getElementById(`flowchart-stage-col-${stage.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                          isActive
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border-slate-200'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: stage.style.borderColor || '#3b82f6' }}
                        />
                        <span className="font-semibold whitespace-nowrap">{stage.title}</span>
                      </button>
                      {idx < boardItems.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                }
              })
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            {t('flowchartDragStageHint')}
          </span>
          {stages.length > 1 && (
            <button
              id="btn-flowchart-reorder-stages-top"
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsReorderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title={t('reorderStagesDesc')}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('reorderStagesBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Flowchart Columns Board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
        {boardItems.length === 0 ? (
          /* Empty Board State */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
              <Workflow className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {t('flowchartEmptyBoardTitle')}
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {t('flowchartEmptyBoardDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                onClick={handleAddNewStage}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('flowchartAddStage')}</span>
              </button>
              <button
                type="button"
                onClick={handleAddNewGroup}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>{t('addColumnGroupBtn')}</span>
              </button>
              <button
                type="button"
                onClick={handleCreateSampleStages}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{t('flowchartCreateSampleStages')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Columns Swimlane Layout with Column Groups */
          <div
            className="flex items-start gap-4 sm:gap-6 min-h-full pb-10 transition-transform origin-top-left"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {(() => {
              const hasAnyGroups = boardItems.some(i => i.type === 'group');

              return boardItems.map((item, itemIdx) => {
                if (item.type === 'group') {
                  const { groupNode, stages: groupStages } = item;
                  const isGroupSelected = selectedNodeId === groupNode.id;
                  const hasGroupContent = !!(groupNode.content && groupNode.content.trim());
                  const isGroupDescExpanded = !!expandedStageDescMap[groupNode.id];
                  const groupColor = groupNode.style.borderColor || '#6366f1';
                  const isCustomGroupFill =
                    groupNode.style.fillColor &&
                    groupNode.style.fillColor !== '#ffffff' &&
                    groupNode.style.fillColor !== '#fff' &&
                    groupNode.style.fillColor !== '#f1f5f9';
                  const groupBgColor = isCustomGroupFill ? groupNode.style.fillColor : '#ffffff';
                  const groupTextColor = groupNode.style.textColor || '#1e293b';

                  return (
                    <React.Fragment key={groupNode.id}>
                      {/* Column Group Container: Supports Multi-column Expanded mode & 1-column Stacked Rows Collapsed mode */}
                      <div
                        id={`flowchart-group-${groupNode.id}`}
                        onDragOver={e => {
                          if (draggingStageId) {
                            e.preventDefault();
                          }
                        }}
                        onDrop={e => {
                          const draggedStage = e.dataTransfer.getData('text/x-stage-id') || draggingStageId;
                          if (draggedStage && draggedStage !== groupNode.id) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleReparentStageToGroup(draggedStage, groupNode.id);
                            setDraggingStageId(null);
                            setDragOverStageColumnId(null);
                          }
                        }}
                        className="flex flex-col shrink-0 transition-all group/column-group"
                      >
                        {/* Group Header Bar with Title, Controls, and Collapse/Expand Mode Toggle */}
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            onSelectNode(groupNode.id);
                          }}
                          className="w-full mb-3 flex flex-col items-center justify-center relative cursor-pointer select-none group/group-section"
                        >
                          {/* Overhead Bracket Line across columns (when expanded) */}
                          {!collapsedGroupsMap[groupNode.id] && (
                            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                              <div
                                className="w-3 h-3.5 border-l-2 border-t-2 rounded-tl-sm shrink-0"
                                style={{ borderColor: groupColor }}
                              />
                              <div
                                className="flex-1 border-t-2"
                                style={{ borderColor: groupColor }}
                              />
                              <div
                                className="w-3 h-3.5 border-r-2 border-t-2 rounded-tr-sm shrink-0"
                                style={{ borderColor: groupColor }}
                              />
                            </div>
                          )}

                          {/* Center Group Capsule / Action Pill with Collapse button on the far left */}
                          <div
                            style={{
                              backgroundColor: isGroupSelected ? groupColor : groupBgColor,
                              borderColor: groupColor,
                              borderWidth: `${groupNode.style.borderWidth || 2}px`,
                              borderStyle: groupNode.style.borderStyle || 'solid',
                              color: isGroupSelected ? '#ffffff' : groupTextColor,
                            }}
                            className={`relative z-10 flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-all shadow-xs ${
                              isGroupSelected ? 'ring-2 ring-offset-1 shadow-md' : 'hover:shadow-sm'
                            }`}
                          >
                            {/* Far Left: Toggle Collapse/Expand Button */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setCollapsedGroupsMap(prev => ({
                                  ...prev,
                                  [groupNode.id]: !prev[groupNode.id],
                                }));
                                onShowToast?.(
                                  collapsedGroupsMap[groupNode.id]
                                    ? `Đã mở rộng các cột trong nhóm "${groupNode.title}"!`
                                    : `Đã thu gọn các cột trong nhóm "${groupNode.title}" thành 1 cột dạng hàng!`
                                );
                              }}
                              style={{
                                backgroundColor: isGroupSelected ? 'rgba(0,0,0,0.18)' : `${groupColor}14`,
                                color: isGroupSelected ? '#ffffff' : groupColor,
                                borderColor: isGroupSelected ? 'rgba(255,255,255,0.3)' : `${groupColor}40`,
                              }}
                              className="p-1.5 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                              title={
                                collapsedGroupsMap[groupNode.id]
                                  ? 'Mở rộng thành các cột ngang'
                                  : 'Thu gọn các cột thành 1 cột (dạng hàng)'
                              }
                            >
                              {collapsedGroupsMap[groupNode.id] ? (
                                <Columns3 className="w-3.5 h-3.5" />
                              ) : (
                                <FoldVertical className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Group Title and Icon */}
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <FolderTree
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: isGroupSelected ? '#ffffff' : groupColor }}
                              />

                              {editingNodeId === groupNode.id ? (
                                <input
                                  ref={inlineInputRef}
                                  type="text"
                                  value={inlineDraft}
                                  onChange={e => setInlineDraft(e.target.value)}
                                  onBlur={handleFinishEditing}
                                  onKeyDown={handleKeyDown}
                                  style={{ borderColor: groupColor }}
                                  className="text-xs font-bold text-slate-800 bg-white border-2 rounded px-1.5 py-0.5 focus:outline-none min-w-[120px]"
                                />
                              ) : (
                                <span
                                  onDoubleClick={e => {
                                    e.stopPropagation();
                                    onStartEditTitle(groupNode.id);
                                  }}
                                  style={{ color: isGroupSelected ? '#ffffff' : groupTextColor }}
                                  className="text-xs font-bold whitespace-nowrap cursor-pointer"
                                  title="Nhấp đúp để đổi tên nhóm"
                                >
                                  {groupNode.title}
                                </span>
                              )}
                            </div>

                            {/* Right Group Action Buttons: Add Stage, Edit, Detail, Ungroup, Delete */}
                            <div
                              className="flex items-center gap-0.5 ml-0.5 pl-1.5 border-l"
                              style={{
                                borderColor: isGroupSelected ? 'rgba(255,255,255,0.3)' : `${groupColor}35`,
                              }}
                            >
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleAddStageToGroup(groupNode.id);
                                }}
                                style={{ color: isGroupSelected ? '#ffffff' : groupColor }}
                                className="p-1 rounded-md hover:bg-black/10 transition-colors cursor-pointer"
                                title="Thêm cột vào nhóm này"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onStartEditTitle(groupNode.id);
                                }}
                                style={{ color: isGroupSelected ? '#ffffff' : undefined }}
                                title="Sửa tên nhóm"
                                className="p-1 rounded-md hover:bg-black/10 text-slate-500 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onOpenDetailModal(groupNode.id);
                                }}
                                style={{ color: isGroupSelected ? '#ffffff' : groupColor }}
                                title="Xem chi tiết & đổi màu nhóm"
                                className="p-1 rounded-md hover:bg-black/10 transition-colors cursor-pointer"
                              >
                                <Maximize2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleUngroup(groupNode.id);
                                }}
                                title={t('ungroupBtn')}
                                style={{ color: isGroupSelected ? '#fde047' : '#d97706' }}
                                className="p-1 rounded-md hover:bg-black/10 transition-colors cursor-pointer"
                              >
                                <Unlink className="w-3 h-3" />
                              </button>
                              {onDeleteNode && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    onDeleteNode(groupNode.id);
                                  }}
                                  title="Xóa nhóm cột này"
                                  style={{ color: isGroupSelected ? '#fca5a5' : '#dc2626' }}
                                  className="p-1 rounded-md hover:bg-red-500/20 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Mô tả nhóm (nếu có) */}
                          {hasGroupContent && (
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                setExpandedStageDescMap(prev => ({
                                  ...prev,
                                  [groupNode.id]: !prev[groupNode.id],
                                }));
                              }}
                              style={{ borderColor: `${groupColor}30` }}
                              className="mt-1 relative z-10 max-w-md px-2 py-0.5 rounded-md bg-white/95 border shadow-2xs text-center cursor-pointer hover:opacity-90 transition-colors"
                              title={isGroupDescExpanded ? (t('collapseDesc') || 'Thu gọn mô tả') : (t('expandDesc') || 'Xem thêm mô tả')}
                            >
                              <p className={`text-[10px] text-slate-500 font-normal leading-relaxed ${
                                isGroupDescExpanded ? 'whitespace-pre-wrap' : 'line-clamp-1 truncate'
                              }`}>
                                {groupNode.content}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Content Area: Collapsed 1-Column View OR Multi-Column Horizontal Swimlane */}
                        {collapsedGroupsMap[groupNode.id] ? (
                          /* 1-Column Collapsed Mode: All stages stacked vertically as rows */
                          <div
                            style={{
                              borderColor: `${groupColor}80`,
                              backgroundColor: isCustomGroupFill ? `${groupBgColor}15` : undefined,
                            }}
                            className="w-[320px] sm:w-[350px] shrink-0 flex flex-col bg-slate-50/95 rounded-2xl border-2 shadow-sm p-3 gap-3"
                          >
                            <div
                              className="flex items-center justify-between pb-2 border-b text-xs font-semibold"
                              style={{ borderColor: `${groupColor}30`, color: groupColor }}
                            >
                              <span className="flex items-center gap-1.5">
                                <Rows3 className="w-3.5 h-3.5" style={{ color: groupColor }} />
                                <span style={{ color: groupColor }}>{groupStages.length} Tiến trình (Dạng hàng thu gọn)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedGroupsMap(prev => ({ ...prev, [groupNode.id]: false }))
                                }
                                style={{ color: groupColor }}
                                className="text-[11px] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                              >
                                <span>Mở rộng</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            {groupStages.length === 0 ? (
                              <div
                                onClick={() => handleAddStageToGroup(groupNode.id)}
                                style={{ borderColor: `${groupColor}40`, color: groupColor }}
                                className="h-28 border-2 border-dashed bg-white rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer p-3 text-center hover:opacity-90"
                              >
                                <Plus className="w-5 h-5 mb-1" style={{ color: groupColor }} />
                                <span className="text-xs font-bold">Chưa có cột trong nhóm</span>
                                <span className="text-[10px] text-slate-400">Bấm để thêm cột</span>
                              </div>
                            ) : (
                              groupStages.map((stage, sIdx) => {
                                const stageColor = stage.style.borderColor || '#3b82f6';
                                const isStageActive = selectedNodeId === stage.id;
                                const isCardsCollapsed = !!collapsedGroupStageCardsMap[stage.id];
                                const childCards = stage.childrenIds
                                  .map(id => graph.getNode(id))
                                  .filter((c): c is NodeModel => !!c);

                                return (
                                  <div
                                    key={stage.id}
                                    id={`flowchart-stage-row-${stage.id}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      onSelectNode(stage.id);
                                    }}
                                    className={`bg-white rounded-xl border p-2.5 transition-all cursor-pointer ${
                                      isStageActive
                                        ? 'border-indigo-500 ring-2 ring-indigo-400/30 shadow-sm'
                                        : 'border-slate-200 shadow-2xs hover:border-indigo-200'
                                    }`}
                                  >
                                    {/* Stage Row Header */}
                                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                                          style={{ backgroundColor: stageColor }}
                                        >
                                          {sIdx + 1 < 10 ? `0${sIdx + 1}` : sIdx + 1}
                                        </div>
                                        <span
                                          onDoubleClick={e => {
                                            e.stopPropagation();
                                            onStartEditTitle(stage.id);
                                          }}
                                          className="text-xs font-bold text-slate-800 truncate"
                                        >
                                          {stage.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                          {childCards.length} thẻ
                                        </span>
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            setCollapsedGroupStageCardsMap(prev => ({
                                              ...prev,
                                              [stage.id]: !prev[stage.id],
                                            }));
                                          }}
                                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                                          title={isCardsCollapsed ? 'Hiện danh sách thẻ' : 'Thu gọn thẻ'}
                                        >
                                          {isCardsCollapsed ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          ) : (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleAddNewStage(groupNode.id, stage.id);
                                          }}
                                          className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                                          title="Thêm cột tiến trình bên cạnh"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={e => {
                                            e.stopPropagation();
                                            onAddChildNode(stage.id);
                                          }}
                                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                                          title="Thêm thẻ vào tiến trình này"
                                        >
                                          <Layers className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Stage Cards in Collapsed Row Mode */}
                                    {!isCardsCollapsed && (
                                      <div className="pt-2 space-y-2">
                                        {childCards.length === 0 ? (
                                          <div
                                            onClick={e => {
                                              e.stopPropagation();
                                              onAddChildNode(stage.id);
                                            }}
                                            className="py-2 px-2 border border-dashed border-slate-200 rounded-lg text-center text-[11px] text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
                                          >
                                            + Bấm để thêm thẻ đầu tiên
                                          </div>
                                        ) : (
                                          childCards.map((card, cIdx) => (
                                            <div key={card.id}>
                                              {renderCardBranch(card, 0, cIdx, stage.id, stageColor)}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}

                            {/* Add Column inside group button */}
                            <button
                              type="button"
                              onClick={() => handleAddStageToGroup(groupNode.id)}
                              className="w-full py-2 px-3 flex items-center justify-center gap-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 hover:border-indigo-400 rounded-xl transition-all cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Thêm cột vào nhóm này</span>
                            </button>
                          </div>
                        ) : (
                          /* Multi-Column Horizontal Swimlane Mode */
                          <div className="flex items-start gap-4">
                            {groupStages.length === 0 ? (
                              <div
                                onClick={() => handleAddStageToGroup(groupNode.id)}
                                className="w-72 h-44 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white/70 hover:bg-white rounded-2xl flex flex-col items-center justify-center text-indigo-600 transition-all cursor-pointer p-4 text-center group/empty"
                              >
                                <Plus className="w-6 h-6 mb-2 text-indigo-400 group-hover/empty:text-indigo-600" />
                                <span className="text-xs font-bold">Chưa có cột trong nhóm này</span>
                                <span className="text-[11px] text-slate-400 mt-1">Nhấp để thêm cột hoặc kéo thả cột vào đây</span>
                              </div>
                            ) : (
                              groupStages.map((stage, sIdx) => {
                                const globalIdx = stages.findIndex(s => s.id === stage.id);
                                return (
                                  <React.Fragment key={stage.id}>
                                    {renderStageColumn(stage, globalIdx >= 0 ? globalIdx : sIdx, groupNode.id)}
                                    {sIdx < groupStages.length - 1 && (
                                      <div className="self-center flex flex-col items-center justify-center shrink-0 px-0.5 text-slate-400">
                                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-500">
                                          <MoveRight className="w-3.5 h-3.5 text-indigo-500 stroke-[2.2]" />
                                        </div>
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Inter-Item Flow Arrow (between groups and standalone columns) */}
                      {itemIdx < boardItems.length - 1 && (
                        <div className={`self-center flex flex-col items-center justify-center shrink-0 px-1 text-slate-400 ${hasAnyGroups ? 'pt-10' : ''}`}>
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-500">
                            <MoveRight className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                } else {
                  // Standalone Column Item
                  const stage = item.stageNode;
                  const globalIdx = stages.findIndex(s => s.id === stage.id);

                  return (
                    <React.Fragment key={stage.id}>
                      <div className="flex flex-col shrink-0">
                        {hasAnyGroups && <div className="w-full h-[38px] mb-3 shrink-0" />}
                        {renderStageColumn(stage, globalIdx >= 0 ? globalIdx : itemIdx, undefined)}
                      </div>

                      {/* Inter-Item Flow Arrow */}
                      {itemIdx < boardItems.length - 1 && (
                        <div className={`self-center flex flex-col items-center justify-center shrink-0 px-1 text-slate-400 ${hasAnyGroups ? 'pt-10' : ''}`}>
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-500">
                            <MoveRight className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                }
              });
            })()}

            {/* Right End: Add Stage or Add Group Buttons */}
            <div className="w-64 shrink-0 flex flex-col gap-3">
              <button
                id="btn-flowchart-add-new-stage-column"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleAddNewStage();
                }}
                className="h-28 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white/60 hover:bg-white rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-1.5 transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">{t('flowchartAddStage')}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Thêm cột tiến trình mới</span>
              </button>

              <button
                id="btn-flowchart-add-new-column-group"
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleAddNewGroup();
                }}
                className="h-24 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl flex flex-col items-center justify-center text-indigo-600 hover:text-indigo-700 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 flex items-center justify-center mb-1 transition-colors">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">{t('addColumnGroupBtn')}</span>
                <span className="text-[10px] text-indigo-400 mt-0.5">Tạo nhóm bao gồm nhiều cột</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reorder Columns Modal */}
      <ReorderColumnsModal
        isOpen={isReorderModalOpen}
        stages={stages}
        onClose={() => setIsReorderModalOpen(false)}
        onApplyReorder={newStageIds => {
          if (onReorderStages) {
            onReorderStages(newStageIds);
          } else {
            graph.reorderChildren(graph.rootId, newStageIds);
          }
        }}
      />

      {/* Film Script (Kịch bản phim) Full Popup Modal */}
      <FilmScriptModal
        isOpen={isFilmScriptModalOpen}
        stageId={filmScriptStageId}
        graph={graph}
        onClose={() => {
          setIsFilmScriptModalOpen(false);
          setFilmScriptStageId(null);
        }}
        onSelectNode={onSelectNode}
        onOpenDetailModal={onOpenDetailModal}
        onUpdateGraph={onUpdateGraph}
        onPushSnapshot={onPushSnapshot}
        onShowToast={onShowToast}
        onStartEditTitle={onStartEditTitle}
        onDeleteNode={onDeleteNode}
        onAddChildNode={onAddChildNode}
      />
    </div>
  );
};
