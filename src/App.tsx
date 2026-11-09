import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { MindmapGraph } from './models/MindmapGraph';
import { NodeModel } from './models/NodeModel';
import { MindmapDataSchema, DriveFileItem, MindmapViewMode } from './types/mindmap';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import { Navbar } from './components/Navbar';
import { MindmapCanvas } from './components/MindmapCanvas';
import { FlowchartView } from './components/FlowchartView';
import { NodeDetailModal } from './components/NodeDetailModal';
import { FloatingActionButton } from './components/FloatingActionButton';
import { DriveSaveModal } from './components/DriveSaveModal';
import { DriveFilesModal } from './components/DriveFilesModal';
import { ConfirmModal } from './components/ConfirmModal';
import { NewMindmapModal } from './components/NewMindmapModal';
import { LeftSidebarDrawer } from './components/LeftSidebarDrawer';
import { ImportTextModal } from './components/ImportTextModal';
import { AICoPilotDrawer } from './components/AICoPilotDrawer';
import { SourceTextModal } from './components/SourceTextModal';
import { AIMindmapService, AIMindmapOptions } from './services/aiMindmapService';
import { MindmapExportService } from './services/mindmapExportService';
import { initAuth, googleSignIn, logout } from './services/firebase';
import { GoogleDriveService } from './services/googleDrive';

const MindmapApp: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  // Graph state (Object-Oriented model)
  const [graph, setGraph] = useState<MindmapGraph>(() => {
    // Attempt to load from localStorage backup
    const saved = localStorage.getItem('mindmap_local_backup');
    if (saved) {
      try {
        const parsed: MindmapDataSchema = JSON.parse(saved);
        return MindmapGraph.fromJSON(parsed);
      } catch (e) {
        console.error('Failed to load local backup:', e);
      }
    }
    return MindmapGraph.createDefault();
  });

  // Auto-save to localStorage whenever graph changes (including text import, node edit, autolayout, etc.)
  useEffect(() => {
    try {
      localStorage.setItem('mindmap_local_backup', JSON.stringify(graph.toJSON()));
    } catch (err) {
      console.error('Failed to auto-save to localStorage:', err);
    }
  }, [graph]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Drive modals state
  const [isSaveDriveModalOpen, setIsSaveDriveModalOpen] = useState(false);
  const [isLoadDriveModalOpen, setIsLoadDriveModalOpen] = useState(false);
  const [isNewMindmapModalOpen, setIsNewMindmapModalOpen] = useState(false);
  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [activeDriveFileId, setActiveDriveFileId] = useState<string | undefined>(undefined);

  // Left Sidebar Drawer & AI Import from Text modals state
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false);
  const [isImportTextModalOpen, setIsImportTextModalOpen] = useState(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [isSourceTextModalOpen, setIsSourceTextModalOpen] = useState(false);

  // Undo stack for AI modifications
  const [aiUndoStack, setAiUndoStack] = useState<MindmapDataSchema[]>([]);
  // History stacks for user modifications (Undo / Redo)
  const [undoStack, setUndoStack] = useState<MindmapDataSchema[]>([]);
  const [redoStack, setRedoStack] = useState<MindmapDataSchema[]>([]);

  // Generic Confirm dialog state (supports custom children options for node deletions)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    hasChildrenOptions?: boolean;
    keepChildrenLabel?: string;
    deleteAllLabel?: string;
    onConfirmKeepChildren?: () => void;
    onConfirmDeleteAll?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });

  // Refs to track latest pan/zoom to avoid stale closures in animation frames
  const panAnimationRef = useRef<number | null>(null);
  const currentPanRef = useRef(pan);
  currentPanRef.current = pan;
  const currentZoomRef = useRef(zoom);
  currentZoomRef.current = zoom;

  // Google Auth user state
  const [user, setUser] = useState<User | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // View Mode: 'node' (radial mindmap canvas) or 'flowchart' (sequential process stage columns)
  const [viewMode, setViewMode] = useState<MindmapViewMode>(() => {
    const saved = localStorage.getItem('mindmap_view_mode') as MindmapViewMode;
    return saved === 'flowchart' ? 'flowchart' : 'node';
  });

  // Node title inline editing state & cooldown ref to prevent Enter from creating new nodes
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const lastEditFinishedTimeRef = useRef<number>(0);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Cancel any ongoing smooth pan animation
  const cancelPanAnimation = useCallback(() => {
    if (panAnimationRef.current !== null) {
      cancelAnimationFrame(panAnimationRef.current);
      panAnimationRef.current = null;
    }
  }, []);

  const handlePanChange = useCallback(
    (newPan: { x: number; y: number }) => {
      cancelPanAnimation();
      setPan(newPan);
    },
    [cancelPanAnimation]
  );

  const handleZoomChange = useCallback(
    (newZoom: number) => {
      cancelPanAnimation();
      setZoom(newZoom);
    },
    [cancelPanAnimation]
  );

  // Smoothly center the canvas on a given node
  const centerOnNode = useCallback(
    (nodeId: string, smooth: boolean = true, targetGraph?: MindmapGraph) => {
      const g = targetGraph || graph;
      const targetNode = g.getNode(nodeId);
      if (!targetNode) return;

      const canvasEl = document.getElementById('mindmap-canvas-viewport');
      const vw = canvasEl ? canvasEl.clientWidth : window.innerWidth;
      const vh = canvasEl ? canvasEl.clientHeight : window.innerHeight;

      const curZoom = currentZoomRef.current;
      const curPan = currentPanRef.current;

      // Center point of node in world space
      const cx = targetNode.position.x + targetNode.getWidth() / 2;
      const cy = targetNode.position.y + targetNode.getHeight() / 2;

      // Target pan to position (cx, cy) at viewport center
      const targetPanX = Math.round(vw / 2 - cx * curZoom);
      const targetPanY = Math.round(vh / 2 - cy * curZoom);

      cancelPanAnimation();

      if (!smooth) {
        setPan({ x: targetPanX, y: targetPanY });
        return;
      }

      const startX = curPan.x;
      const startY = curPan.y;
      const dx = targetPanX - startX;
      const dy = targetPanY - startY;

      // If already within 3px of target center, no animation needed
      if (Math.hypot(dx, dy) < 3) {
        setPan({ x: targetPanX, y: targetPanY });
        return;
      }

      const duration = 280; // ms
      const startTime = performance.now();

      const animateStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic: 1 - (1 - t)^3
        const ease = 1 - Math.pow(1 - progress, 3);

        const newX = Math.round(startX + dx * ease);
        const newY = Math.round(startY + dy * ease);

        setPan({ x: newX, y: newY });

        if (progress < 1) {
          panAnimationRef.current = requestAnimationFrame(animateStep);
        } else {
          panAnimationRef.current = null;
        }
      };

      panAnimationRef.current = requestAnimationFrame(animateStep);
    },
    [graph, cancelPanAnimation]
  );

  // Smoothly fit the entire mindmap within the screen with main root node centered
  const handleFitScreen = useCallback(
    (targetGraph?: MindmapGraph, smooth: boolean = true) => {
      const g = targetGraph || graph;
      const rootNode = g.getNode(g.rootId);
      if (!rootNode) return;

      const canvasEl = document.getElementById('mindmap-canvas-viewport');
      const vw = canvasEl ? canvasEl.clientWidth : window.innerWidth;
      const vh = canvasEl ? canvasEl.clientHeight : window.innerHeight;

      // Available padded dimensions for mindmap content
      const PADDING = 80;
      const availableW = Math.max(vw - PADDING * 2, 200);
      const availableH = Math.max(vh - PADDING * 2, 200);

      // Get bounding box of all nodes
      const bbox = g.getBoundingBox();

      // Main root center in world space
      const rootCenterX = rootNode.position.x + rootNode.getWidth() / 2;
      const rootCenterY = rootNode.position.y + rootNode.getHeight() / 2;

      // Max distance from root center to any bounding box edge
      const maxDistX = Math.max(rootCenterX - bbox.minX, bbox.maxX - rootCenterX);
      const maxDistY = Math.max(rootCenterY - bbox.minY, bbox.maxY - rootCenterY);

      // Symmetric span needed around root to fit all nodes without clipping
      const requiredW = Math.max(maxDistX * 2, bbox.width, 200);
      const requiredH = Math.max(maxDistY * 2, bbox.height, 200);

      // Calculate target zoom scale
      const zoomX = availableW / requiredW;
      const zoomY = availableH / requiredH;
      const targetZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.25), 1.3);

      // Target pan positioning main root node exactly at screen center
      const targetPanX = Math.round(vw / 2 - rootCenterX * targetZoom);
      const targetPanY = Math.round(vh / 2 - rootCenterY * targetZoom);

      cancelPanAnimation();

      if (!smooth) {
        setZoom(targetZoom);
        setPan({ x: targetPanX, y: targetPanY });
        return;
      }

      const startZoom = currentZoomRef.current;
      const startPanX = currentPanRef.current.x;
      const startPanY = currentPanRef.current.y;

      const dZoom = targetZoom - startZoom;
      const dPanX = targetPanX - startPanX;
      const dPanY = targetPanY - startPanY;

      const duration = 320; // ms
      const startTime = performance.now();

      const animateStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        const newZoom = Number((startZoom + dZoom * ease).toFixed(4));
        const newPanX = Math.round(startPanX + dPanX * ease);
        const newPanY = Math.round(startPanY + dPanY * ease);

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });

        if (progress < 1) {
          panAnimationRef.current = requestAnimationFrame(animateStep);
        } else {
          panAnimationRef.current = null;
        }
      };

      panAnimationRef.current = requestAnimationFrame(animateStep);
    },
    [graph, cancelPanAnimation]
  );

  // Center view on canvas (Root or Selected Node)
  const handleCenterView = useCallback(() => {
    const targetId = selectedNodeId || graph.rootId;
    centerOnNode(targetId, true);
  }, [selectedNodeId, graph.rootId, centerOnNode]);

  // Handle selecting a node (with auto-centering)
  const handleSelectNode = useCallback(
    (nodeId: string | null, autoCenter: boolean = true) => {
      setSelectedNodeId(nodeId);
      if (nodeId && autoCenter) {
        centerOnNode(nodeId, true);
      }
    },
    [centerOnNode]
  );

  // Initial center on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenterView();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleCenterView]);

  // Google Sign In handler
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        showToast(`Đã đăng nhập Google: ${res.user.email || res.user.displayName}`);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      showToast('Đăng nhập Google không thành công. Vui lòng thử lại.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Google Sign Out handler
  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setActiveDriveFileId(undefined);
      showToast('Đã đăng xuất Google.');
    } catch (err) {
      console.error(err);
    }
  };

  // Graph mutations
  const updateGraph = useCallback((newGraph: MindmapGraph) => {
    setGraph(newGraph.clone());
  }, []);

  // Push a snapshot of the graph before mutating (supports Undo/Redo)
  const pushSnapshot = useCallback(() => {
    const currentData = graph.toJSON();
    setUndoStack(prev => {
      const next = [...prev, currentData];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
    setRedoStack([]); // Clear redo stack on new user operation
  }, [graph]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousSnapshot = undoStack[undoStack.length - 1];
    const currentSnapshot = graph.toJSON();

    setRedoStack(prev => [...prev, currentSnapshot]);
    setUndoStack(prev => prev.slice(0, -1));

    const restoredGraph = MindmapGraph.fromJSON(previousSnapshot);
    setGraph(restoredGraph);

    // Validate selected node still exists in restored graph
    if (selectedNodeId && !restoredGraph.nodes.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
    if (detailNodeId && !restoredGraph.nodes.has(detailNodeId)) {
      setIsDetailModalOpen(false);
      setDetailNodeId(null);
    }
    setEditingNodeId(null);

    showToast(t('undoSuccess'));
  }, [undoStack, graph, selectedNodeId, detailNodeId, showToast, t]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    const currentSnapshot = graph.toJSON();

    setUndoStack(prev => [...prev, currentSnapshot]);
    setRedoStack(prev => prev.slice(0, -1));

    const restoredGraph = MindmapGraph.fromJSON(nextSnapshot);
    setGraph(restoredGraph);

    // Validate selected node still exists in restored graph
    if (selectedNodeId && !restoredGraph.nodes.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
    if (detailNodeId && !restoredGraph.nodes.has(detailNodeId)) {
      setIsDetailModalOpen(false);
      setDetailNodeId(null);
    }
    setEditingNodeId(null);

    showToast(t('redoSuccess'));
  }, [redoStack, graph, selectedNodeId, detailNodeId, showToast, t]);

  const handleUpdateTitle = (title: string) => {
    if (graph.meta.title !== title) {
      pushSnapshot();
      graph.meta.title = title;
      const root = graph.getNode(graph.rootId);
      if (root) {
        root.updateTitle(title);
      }
      updateGraph(graph);
    }
  };

  const handleUpdateNodeTitle = useCallback((nodeId: string, newTitle: string) => {
    const node = graph.getNode(nodeId);
    if (node && node.title !== newTitle) {
      pushSnapshot();
      node.updateTitle(newTitle);
      updateGraph(graph);
    }
  }, [graph, pushSnapshot, updateGraph]);

  const handleStartEditTitle = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId);
    centerOnNode(nodeId, true);
  }, [centerOnNode]);

  const handleFinishEditTitle = useCallback((nodeId: string, newTitle: string) => {
    lastEditFinishedTimeRef.current = Date.now();
    handleUpdateNodeTitle(nodeId, newTitle);
    setEditingNodeId(null);
  }, [handleUpdateNodeTitle]);

  const handleCancelEditTitle = useCallback(() => {
    lastEditFinishedTimeRef.current = Date.now();
    setEditingNodeId(null);
  }, []);

  const handleUpdateNodePosition = (nodeId: string, pos: { x: number; y: number }) => {
    const node = graph.getNode(nodeId);
    if (node) {
      node.setPosition(pos.x, pos.y);
      updateGraph(graph);
    }
  };

  const handleAddChildNode = useCallback((parentId: string) => {
    pushSnapshot();
    const newNode = graph.addNode(parentId);
    updateGraph(graph);
    setSelectedNodeId(newNode.id);
    centerOnNode(newNode.id, true, graph);
  }, [graph, pushSnapshot, updateGraph, centerOnNode]);

  const handleAddNewNode = useCallback(() => {
    // If a node is selected, add as a sibling (same parent), or under group/root
    let parentId: string = graph.rootId;
    if (selectedNodeId) {
      const current = graph.getNode(selectedNodeId);
      if (current) {
        if (current.isGroup) {
          parentId = current.id;
        } else if (current.parentId) {
          parentId = current.parentId;
        }
      }
    }
    pushSnapshot();
    const newNode = graph.addNode(parentId);
    updateGraph(graph);
    setSelectedNodeId(newNode.id);
    centerOnNode(newNode.id, true, graph);
    showToast(`Đã thêm node mới [${newNode.id}]`);
  }, [graph, selectedNodeId, pushSnapshot, updateGraph, centerOnNode, showToast]);

  const handleAddParentNode = useCallback(() => {
    const targetNodeId = selectedNodeId || graph.rootId;
    pushSnapshot();
    const newParent = graph.insertParent(targetNodeId);
    if (newParent) {
      updateGraph(graph);
      setSelectedNodeId(newParent.id);
      centerOnNode(newParent.id, true, graph);
      showToast(`Đã chèn node cha [${newParent.id}] trên node [${targetNodeId}]`);
    }
  }, [graph, selectedNodeId, pushSnapshot, updateGraph, centerOnNode, showToast]);

  const handleAddRootChild = useCallback(() => {
    const targetParent = selectedNodeId || graph.rootId;
    handleAddChildNode(targetParent);
  }, [selectedNodeId, graph.rootId, handleAddChildNode]);

  const handleReparent = (nodeId: string, newParentId: string | null): boolean => {
    pushSnapshot();
    const success = graph.reparent(nodeId, newParentId);
    if (success) {
      updateGraph(graph);
      centerOnNode(nodeId, true, graph);
      showToast(`Đã chuyển node [${nodeId}] làm con của [${newParentId || 'Gốc'}]`);
    }
    return success;
  };

  const handleReorderStages = useCallback(
    (newStageIds: string[]) => {
      pushSnapshot();
      graph.reorderChildren(graph.rootId, newStageIds);
      // Re-align horizontal positions for stages
      newStageIds.forEach((id, idx) => {
        const node = graph.getNode(id);
        if (node) {
          node.setPosition(100 + idx * 340, node.position.y);
        }
      });
      updateGraph(graph);
      showToast(t('stageReorderedSuccess'));
    },
    [graph, pushSnapshot, updateGraph, showToast, t]
  );

  // Flowchart-Specific Add Stage / Column Handler
  const handleAddNewFlowchartStage = useCallback(
    (targetParentId?: string, insertAfterId?: string) => {
      pushSnapshot();
      let parentId = targetParentId;
      let insertAfter = insertAfterId;

      if (!parentId) {
        if (selectedNodeId) {
          const selected = graph.getNode(selectedNodeId);
          if (selected) {
            if (selected.isGroup) {
              parentId = selected.id;
            } else {
              // Trace up to check if contained in a group or root
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

      if (!parentId) {
        const rootChildren = graph.getChildren(graph.rootId);
        const groups = rootChildren.filter(c => c.isGroup);
        if (groups.length === 1) {
          parentId = groups[0].id;
        } else {
          parentId = graph.rootId;
        }
      }

      const parentNode = graph.getNode(parentId);
      if (!parentNode) return;

      const countInParent = parentNode.childrenIds.length + 1;
      const stageIndex = graph.nodes.size;
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
        : `${countInParent < 10 ? '0' + countInParent : countInParent}. Tiến Trình ${countInParent}`;

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

      newStage.childrenIds = [];

      if (insertAfter && parentNode.childrenIds.includes(insertAfter)) {
        const currentIdx = parentNode.childrenIds.indexOf(insertAfter);
        const withoutNew = parentNode.childrenIds.filter(id => id !== newStage.id);
        withoutNew.splice(currentIdx + 1, 0, newStage.id);
        parentNode.childrenIds = withoutNew;
      }

      // Guarantee no other node has newStage in its childrenIds
      graph.getAllNodes().forEach(n => {
        if (n.id !== parentNode.id && n.id !== newStage.id && n.childrenIds.includes(newStage.id)) {
          n.removeChild(newStage.id);
        }
      });

      graph.meta.updatedAt = new Date().toISOString();
      updateGraph(graph);
      setSelectedNodeId(newStage.id);
      if (parentNode.isGroup) {
        showToast(`Đã thêm cột mới vào nhóm "${parentNode.title}"!`);
      } else {
        showToast(`Đã thêm cột tiến trình mới!`);
      }
    },
    [graph, selectedNodeId, pushSnapshot, updateGraph, showToast]
  );

  // Flowchart-Specific Add Group Handler
  const handleAddNewFlowchartGroup = useCallback(() => {
    pushSnapshot();
    const rootNode = graph.getNode(graph.rootId);
    if (!rootNode) return;

    const rootChildren = graph.getChildren(graph.rootId);
    const existingGroups = rootChildren.filter(c => c.isGroup);
    const groupCount = existingGroups.length + 1;

    // Check if user selected a standalone column under root
    let selectedStandaloneCol: NodeModel | null = null;
    if (selectedNodeId) {
      const sel = graph.getNode(selectedNodeId);
      if (sel) {
        if (sel.parentId === graph.rootId && !sel.isGroup) {
          selectedStandaloneCol = sel;
        } else if (sel.parentId) {
          // Card under standalone column
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
      // Move the selected standalone column into the new group!
      const colId = selectedStandaloneCol.id;
      // Remove column from root's childrenIds
      rootNode.childrenIds = rootNode.childrenIds.filter(id => id !== colId && id !== newGroup.id);
      // Insert newGroup into root's childrenIds
      rootNode.childrenIds.push(newGroup.id);
      // Set column parent to newGroup
      selectedStandaloneCol.parentId = newGroup.id;
      newGroup.childrenIds = [colId];
    } else {
      // Add initial clean column inside this new group
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
    updateGraph(graph);
    setSelectedNodeId(newGroup.id);
    showToast(`Đã tạo nhóm cột "${newGroup.title}"!`);

    setTimeout(() => {
      const el = document.getElementById(`flowchart-group-${newGroup.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
  }, [graph, selectedNodeId, pushSnapshot, updateGraph, showToast]);

  // Flowchart-Specific Add Card Handler
  const handleAddNewFlowchartCard = useCallback(() => {
    let targetStageId: string | null = null;
    if (selectedNodeId) {
      const sel = graph.getNode(selectedNodeId);
      if (sel) {
        if (sel.isGroup) {
          // If group is selected, pick its first stage column or create first stage column in this group
          if (sel.childrenIds.length > 0) {
            targetStageId = sel.childrenIds[0];
          } else {
            const newStage = graph.addNode(sel.id, {
              title: `Tiến trình 01 (${sel.title})`,
              isGroup: false,
              style: {
                shape: 'rounded-rect',
                fillColor: '#ffffff',
                textColor: '#1e293b',
                borderColor: sel.style.borderColor || '#6366f1',
                borderWidth: 2,
                borderStyle: 'solid',
                fontSize: 14,
              },
            });
            targetStageId = newStage.id;
          }
        } else if (sel.parentId && graph.getNode(sel.parentId)?.isGroup) {
          // Selected node is a stage column inside a group
          targetStageId = sel.id;
        } else if (sel.parentId === graph.rootId && !sel.isGroup) {
          // Selected node is a standalone stage column under root
          targetStageId = sel.id;
        } else {
          // Selected node is a card or sub-card -> trace upward to find its stage column
          let curr: NodeModel | null = sel;
          while (curr && curr.parentId) {
            const p = graph.getNode(curr.parentId);
            if (!p) break;
            if (p.isGroup || p.id === graph.rootId) {
              targetStageId = curr.id;
              break;
            }
            curr = p;
          }
          if (!targetStageId) {
            targetStageId = sel.parentId || sel.id;
          }
        }
      }
    }

    if (!targetStageId) {
      const rootChildren = graph.getChildren(graph.rootId);
      for (const child of rootChildren) {
        if (child.isGroup && child.childrenIds.length > 0) {
          targetStageId = child.childrenIds[0];
          break;
        } else if (!child.isGroup) {
          targetStageId = child.id;
          break;
        }
      }
    }

    if (targetStageId) {
      const stageNode = graph.getNode(targetStageId);
      const stageColor = stageNode?.style.borderColor || '#3b82f6';
      pushSnapshot();
      const newCard = graph.addNode(targetStageId, {
        title: `Thẻ mới ${(stageNode?.childrenIds.length || 0) + 1}`,
        style: {
          shape: 'rounded-rect',
          fillColor: '#ffffff',
          textColor: '#1e293b',
          borderColor: stageColor,
          borderWidth: 1.5,
          borderStyle: 'solid',
          fontSize: 13,
        },
        parentLinkStyle: {
          color: stageColor,
          width: 2.5,
          style: 'solid',
          arrow: 'none',
        },
      });
      updateGraph(graph);
      setSelectedNodeId(newCard.id);
      showToast(`Đã thêm thẻ mới vào "${stageNode?.title || 'tiến trình'}"!`);
    } else {
      handleAddNewFlowchartStage();
    }
  }, [graph, selectedNodeId, pushSnapshot, updateGraph, showToast, handleAddNewFlowchartStage]);

  const handleViewModeChange = useCallback(
    (mode: MindmapViewMode) => {
      setViewMode(mode);
      localStorage.setItem('mindmap_view_mode', mode);

      if (mode === 'node') {
        // Enforce parent-child hierarchy:
        // 1. Root children: can be Groups or Stages
        // 2. If Group: its children are Stages
        // 3. Stages contain Cards
        // 4. All sub-cards maintain parentId recursively
        const root = graph.getNode(graph.rootId);
        if (root) {
          const syncStageNode = (stageNode: NodeModel, expectedParentId: string) => {
            if (stageNode.parentId !== expectedParentId) {
              stageNode.setParent(expectedParentId);
            }
            stageNode.childrenIds.forEach(cardId => {
              const cardNode = graph.getNode(cardId);
              if (cardNode) {
                if (cardNode.parentId !== stageNode.id) {
                  cardNode.setParent(stageNode.id);
                }
                const syncDescendants = (parentNode: NodeModel) => {
                  parentNode.childrenIds.forEach(childId => {
                    const childNode = graph.getNode(childId);
                    if (childNode) {
                      if (childNode.parentId !== parentNode.id) {
                        childNode.setParent(parentNode.id);
                      }
                      syncDescendants(childNode);
                    }
                  });
                };
                syncDescendants(cardNode);
              }
            });
          };

          root.childrenIds.forEach(childId => {
            const childNode = graph.getNode(childId);
            if (!childNode) return;
            if (childNode.parentId !== graph.rootId) {
              childNode.setParent(graph.rootId);
            }
            if (childNode.isGroup) {
              childNode.childrenIds.forEach(stageId => {
                const stageNode = graph.getNode(stageId);
                if (stageNode) {
                  syncStageNode(stageNode, childNode.id);
                }
              });
            } else {
              syncStageNode(childNode, graph.rootId);
            }
          });
        }

        // Auto layout and update child colors so that in Node view all branches expand cleanly
        graph.autoLayout();
        graph.autoUpdateChildColors();
        updateGraph(graph);

        setTimeout(() => {
          handleFitScreen(graph, true);
        }, 80);

        showToast(t('switchViewModeAutoReparent'));
      } else {
        showToast('Đã chuyển sang chế độ Flow Chart!');
      }
    },
    [graph, updateGraph, handleFitScreen, showToast, t]
  );

  const handleDeleteNode = useCallback(
    (nodeIdToDelete?: string) => {
      const targetId = nodeIdToDelete || selectedNodeId;
      if (!targetId) return;

      if (targetId === graph.rootId) {
        showToast(t('rootCannotDelete'));
        return;
      }

      const node = graph.getNode(targetId);
      if (!node) return;

      const executeDelete = (keepChildren: boolean) => {
        pushSnapshot();
        const childCount = node.childrenIds.length;
        const nodeTitle = node.title;
        graph.removeNode(targetId, { keepChildren });
        updateGraph(graph);
        if (selectedNodeId === targetId) {
          setSelectedNodeId(null);
        }
        if (detailNodeId === targetId) {
          setIsDetailModalOpen(false);
          setDetailNodeId(null);
        }

        if (childCount > 0) {
          if (keepChildren) {
            showToast(t('deleteKeepChildrenSuccess', { title: nodeTitle }));
          } else {
            showToast(t('deleteAllSubtreeSuccess', { title: nodeTitle, count: childCount }));
          }
        } else {
          showToast(`Đã xóa node "${nodeTitle}"`);
        }
      };

      const hasChildren = node.childrenIds.length > 0;

      if (hasChildren) {
        setConfirmConfig({
          isOpen: true,
          title: t('deleteNodeConfirmTitle'),
          message: t('deleteNodeWithChildrenConfirmDesc', {
            id: node.id,
            title: node.title,
            count: node.childrenIds.length,
          }),
          hasChildrenOptions: true,
          keepChildrenLabel: t('deleteKeepChildrenBtn'),
          deleteAllLabel: t('deleteAllSubtreeBtn'),
          cancelLabel: t('cancelBtn'),
          isDestructive: true,
          onConfirm: () => {
            executeDelete(true);
            setConfirmConfig(c => ({ ...c, isOpen: false }));
          },
          onConfirmKeepChildren: () => {
            executeDelete(true);
            setConfirmConfig(c => ({ ...c, isOpen: false }));
          },
          onConfirmDeleteAll: () => {
            executeDelete(false);
            setConfirmConfig(c => ({ ...c, isOpen: false }));
          },
        });
      } else {
        setConfirmConfig({
          isOpen: true,
          title: t('deleteNodeConfirmTitle'),
          message: t('deleteNodeConfirmDesc', {
            id: node.id,
            title: node.title,
          }),
          confirmLabel: t('deleteNode'),
          cancelLabel: t('cancelBtn'),
          isDestructive: true,
          onConfirm: () => {
            executeDelete(true);
            setConfirmConfig(c => ({ ...c, isOpen: false }));
          },
        });
      }
    },
    [selectedNodeId, graph, detailNodeId, updateGraph, t, showToast]
  );

  const handleAutoLayout = () => {
    pushSnapshot();
    graph.autoLayout();
    updateGraph(graph);
    handleFitScreen(graph, true);
    showToast(t('autoLayout'));
  };

  const handleAutoUpdateChildColors = () => {
    pushSnapshot();
    const count = graph.autoUpdateChildColors();
    updateGraph(graph);
    showToast(t('autoUpdateColorsSuccess'));
  };

  // AI Text to Mindmap Generator Handler
  const handleGenerateMindmapFromText = useCallback(
    async (
      text: string,
      options: {
        mode: 'new_mindmap' | 'append_to_selected';
        detailLevel: 'concise' | 'balanced' | 'detailed';
        onProgress: AIMindmapOptions['onProgress'];
      }
    ) => {
      const res = await AIMindmapService.convertTextToMindmap(text, graph, {
        mode: options.mode,
        detailLevel: options.detailLevel,
        targetNodeId: selectedNodeId || graph.rootId,
        onProgress: options.onProgress,
      });

      // Synchronously write to localStorage to guarantee safety
      try {
        localStorage.setItem('mindmap_local_backup', JSON.stringify(res.graph.toJSON()));
      } catch (e) {
        console.error('Error saving local backup on text import:', e);
      }

      updateGraph(res.graph);
      setSelectedNodeId(res.rootOrTargetId);
      handleFitScreen(res.graph, true);
      showToast(t('importTextSuccess'));
    },
    [graph, selectedNodeId, updateGraph, handleFitScreen, showToast, t]
  );

  // AI Co-pilot Handlers
  const handleSaveSourceText = useCallback(
    (text: string) => {
      const cloned = graph.clone();
      cloned.setSourceText(text);
      updateGraph(cloned);
      showToast(t('aiSaveSourceTextSuccess'));
    },
    [graph, updateGraph, showToast, t]
  );

  const handleGraphUpdatedByAI = useCallback(() => {
    // Save snapshot to undo stack before updating
    setAiUndoStack(prev => [...prev.slice(-10), graph.toJSON()]);
    const cloned = graph.clone();
    updateGraph(cloned);
    handleFitScreen(cloned, true);
    showToast('Đã áp dụng thay đổi cấu trúc từ AI!');
  }, [graph, updateGraph, handleFitScreen, showToast]);

  const handleUndoLastAIAction = useCallback(() => {
    if (aiUndoStack.length === 0) return;
    const lastSnapshot = aiUndoStack[aiUndoStack.length - 1];
    setAiUndoStack(prev => prev.slice(0, -1));
    const restored = MindmapGraph.fromJSON(lastSnapshot);
    updateGraph(restored);
    handleFitScreen(restored, true);
    showToast(t('aiUndoneSuccess'));
  }, [aiUndoStack, updateGraph, handleFitScreen, showToast, t]);

  const handleNewMindmap = () => {
    setIsNewMindmapModalOpen(true);
  };

  const handleResetToNewMindmap = (
    newTitle: string = 'Dự Án Mới',
    newMode: MindmapViewMode = 'node'
  ) => {
    const newG = MindmapGraph.createDefault(newTitle, newMode);
    setGraph(newG);
    setSelectedNodeId(null);
    setActiveDriveFileId(undefined);
    setViewMode(newMode);
    localStorage.setItem('mindmap_view_mode', newMode);
    showToast(
      newMode === 'flowchart'
        ? 'Đã khởi tạo sơ đồ Flow Chart mới!'
        : 'Đã khởi tạo sơ đồ Node mới!'
    );
    setTimeout(() => handleCenterView(), 100);
  };

  const handleSaveToCloudAndCreateNew = async (
    fileName: string,
    newTitle: string,
    newMode: MindmapViewMode
  ) => {
    if (!user) {
      showToast('Vui lòng đăng nhập Google để lưu sơ đồ lên Google Drive!');
      const res = await googleSignIn();
      if (!res) {
        throw new Error('Chưa đăng nhập Google');
      }
      setUser(res.user);
    }

    try {
      await GoogleDriveService.saveFile(graph.toJSON(), fileName);
      showToast(t('driveSaveSuccess'));
      handleResetToNewMindmap(newTitle, newMode);
    } catch (err: any) {
      console.error(err);
      alert(err.message || t('driveSaveError'));
      throw err;
    }
  };

  // Cross relations
  const handleAddCrossLink = (
    sourceId: string,
    targetId: string,
    label?: string,
    options?: {
      color?: string;
      style?: import('./types/mindmap').BorderStyle;
      arrow?: import('./types/mindmap').RelationArrowType;
      width?: number;
    }
  ) => {
    pushSnapshot();
    const edge = graph.addCrossLink(sourceId, targetId, label, options);
    if (edge) {
      updateGraph(graph);
      showToast(`Đã tạo liên kết [${sourceId}] ➜ [${targetId}]`);
    }
  };

  const handleUpdateCrossLink = (
    edgeId: string,
    updates: {
      color?: string;
      style?: import('./types/mindmap').BorderStyle;
      arrow?: import('./types/mindmap').RelationArrowType;
      width?: number;
      label?: string;
    }
  ) => {
    pushSnapshot();
    const success = graph.updateCrossLink(edgeId, updates);
    if (success) {
      updateGraph(graph);
    }
  };

  const handleRemoveCrossLink = (edgeId: string) => {
    pushSnapshot();
    graph.removeCrossLink(edgeId);
    updateGraph(graph);
  };

  // Node details modal
  const handleOpenDetailModal = (nodeId: string) => {
    setDetailNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setIsDetailModalOpen(true);
    centerOnNode(nodeId, true);
  };

  const handleUpdateNode = (updatedNode: NodeModel) => {
    pushSnapshot();
    graph.nodes.set(updatedNode.id, updatedNode);

    // Propagate updated color to children nodes and connection links if node is group/stage
    const nodeFill = updatedNode.style.fillColor;
    const nodeBorder = updatedNode.style.borderColor;
    const isLightOrWhite =
      !nodeFill ||
      nodeFill === '#ffffff' ||
      nodeFill.toLowerCase() === '#fff' ||
      nodeFill === '#f8fafc' ||
      nodeFill === '#f1f5f9';
    const dominantColor = isLightOrWhite ? (nodeBorder || '#3b82f6') : nodeFill;

    // Harmonize own parentLinkStyle
    if (updatedNode.parentLinkStyle) {
      updatedNode.parentLinkStyle.color = dominantColor;
    }

    const propagateChildColor = (parentNode: NodeModel, color: string) => {
      parentNode.childrenIds.forEach(cId => {
        const child = graph.getNode(cId);
        if (child) {
          const childFill = child.style.fillColor;
          const isChildLight =
            !childFill ||
            childFill === '#ffffff' ||
            childFill.toLowerCase() === '#fff' ||
            childFill === '#f8fafc' ||
            childFill === '#f1f5f9';
          if (isChildLight) {
            child.style.borderColor = color;
          }
          if (child.parentLinkStyle) {
            child.parentLinkStyle.color = color;
          }
          propagateChildColor(child, color);
        }
      });
    };
    propagateChildColor(updatedNode, dominantColor);

    graph.sanitizeHierarchy();
    updateGraph(graph);
  };

  // Drive Save & Load
  const handleSaveToDrive = async (fileName: string, asNew: boolean) => {
    setIsSavingDrive(true);
    try {
      const fileIdToUpdate = asNew ? undefined : activeDriveFileId;
      const result = await GoogleDriveService.saveFile(graph.toJSON(), fileName, fileIdToUpdate);
      setActiveDriveFileId(result.id);
      setIsSaveDriveModalOpen(false);
      showToast(t('driveSaveSuccess'));
    } catch (err: any) {
      console.error(err);
      alert(err.message || t('driveSaveError'));
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleSelectDriveFile = async (fileId: string, fileName: string) => {
    try {
      const data = await GoogleDriveService.loadFile(fileId);
      const newGraph = MindmapGraph.fromJSON(data);
      setGraph(newGraph);
      setActiveDriveFileId(fileId);
      setSelectedNodeId(null);
      if (data.meta?.defaultViewMode) {
        setViewMode(data.meta.defaultViewMode);
        localStorage.setItem('mindmap_view_mode', data.meta.defaultViewMode);
      }
      showToast(`Đã mở sơ đồ: ${fileName.replace('.mindmap.json', '')}`);
      setTimeout(() => handleCenterView(), 100);
    } catch (err: any) {
      console.error(err);
      alert('Không thể tải file này từ Google Drive: ' + err.message);
    }
  };

  const handleRequestConfirmDeleteDriveFile = (file: DriveFileItem) => {
    setConfirmConfig({
      isOpen: true,
      title: t('driveDeleteConfirmTitle'),
      message: t('driveDeleteConfirmDesc', { name: file.name }),
      confirmLabel: 'Xóa vĩnh viễn',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await GoogleDriveService.deleteFile(file.id);
          if (activeDriveFileId === file.id) {
            setActiveDriveFileId(undefined);
          }
          setConfirmConfig(c => ({ ...c, isOpen: false }));
          showToast(`Đã xóa file ${file.name}`);
        } catch (err: any) {
          alert('Lỗi xóa file: ' + err.message);
        }
      },
    });
  };

  // JSON, Image, PDF, TXT Import & Export
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graph.toJSON(), null, 2));
    const downloadAnchor = document.createElement('a');
    const safeTitle = (graph.meta.title || 'mindmap').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${safeTitle}.mindmap.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải file JSON về máy!');
  };

  const handleExportPng = async () => {
    try {
      await MindmapExportService.exportToPng(graph);
      showToast(t('exportSuccessPng'));
    } catch (err: any) {
      console.error('Export PNG error:', err);
      showToast('Lỗi khi xuất ảnh PNG: ' + (err.message || ''));
    }
  };

  const handleExportPdf = async () => {
    try {
      await MindmapExportService.exportToPdf(graph);
      showToast(t('exportSuccessPdf'));
    } catch (err: any) {
      console.error('Export PDF error:', err);
      showToast('Lỗi khi xuất PDF: ' + (err.message || ''));
    }
  };

  const handleExportTxt = () => {
    try {
      MindmapExportService.exportToTxt(graph);
      showToast(t('exportSuccessTxt'));
    } catch (err: any) {
      console.error('Export TXT error:', err);
      showToast('Lỗi khi xuất TXT: ' + (err.message || ''));
    }
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        const schema: MindmapDataSchema = JSON.parse(content);
        const importedGraph = MindmapGraph.fromJSON(schema);
        setGraph(importedGraph);
        setSelectedNodeId(null);
        setActiveDriveFileId(undefined);
        if (schema.meta?.defaultViewMode) {
          setViewMode(schema.meta.defaultViewMode);
          localStorage.setItem('mindmap_view_mode', schema.meta.defaultViewMode);
        }
        showToast(t('importSuccess'));
        setTimeout(() => handleCenterView(), 100);
      } catch (err) {
        alert(t('importError'));
      }
    };
    reader.readAsText(file);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Undo / Redo Shortcut handling (Ctrl+Z, Cmd+Z, Ctrl+Y, Cmd+Y, Ctrl+Shift+Z, Cmd+Shift+Z)
      const isZ = e.key === 'z' || e.key === 'Z';
      const isY = e.key === 'y' || e.key === 'Y';
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        // If focus is in an input or textarea, let native browser text undo happen
        const isTextInputActive =
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA';

        if (!isTextInputActive && !isDetailModalOpen) {
          if (isZ) {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            return;
          } else if (isY) {
            e.preventDefault();
            handleRedo();
            return;
          }
        }
      }

      // Ignore standard node manipulation shortcuts if focus is in an input or textarea, modal is open, or title was recently being edited
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        isDetailModalOpen ||
        editingNodeId !== null ||
        Date.now() - lastEditFinishedTimeRef.current < 400
      ) {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (viewMode === 'flowchart') {
          handleAddNewFlowchartCard();
        } else {
          if (selectedNodeId) {
            handleAddChildNode(selectedNodeId);
          } else {
            handleAddChildNode(graph.rootId);
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (viewMode === 'flowchart') {
          if (selectedNodeId && selectedNodeId !== graph.rootId) {
            const selNode = graph.getNode(selectedNodeId);
            if (selNode) {
              const isStageColumn =
                (selNode.parentId === graph.rootId && !selNode.isGroup) ||
                (selNode.parentId && graph.getNode(selNode.parentId)?.isGroup);

              if (isStageColumn) {
                // Pressing Enter on a column adds a card inside this column!
                handleAddChildNode(selNode.id);
              } else if (selNode.isGroup) {
                // Pressing Enter on a group adds a column into the group
                handleAddNewFlowchartStage(selNode.id);
              } else if (selNode.parentId) {
                // Pressing Enter on a card adds a sibling card in the same stage column
                handleAddChildNode(selNode.parentId);
              }
            }
          } else {
            handleAddNewFlowchartCard();
          }
        } else {
          if (selectedNodeId && selectedNodeId !== graph.rootId) {
            const selNode = graph.getNode(selectedNodeId);
            if (selNode?.parentId) {
              handleAddChildNode(selNode.parentId);
            }
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && selectedNodeId !== graph.rootId) {
          e.preventDefault();
          handleDeleteNode(selectedNodeId);
        }
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    graph,
    isDetailModalOpen,
    editingNodeId,
    handleDeleteNode,
    handleAddChildNode,
    handleUndo,
    handleRedo,
  ]);

  const selectedNode = selectedNodeId ? graph.getNode(selectedNodeId) || null : null;

  return (
    <div id="mindmap-app-root" className="w-screen h-screen flex flex-col overflow-hidden bg-slate-50 font-sans">
      {/* Top Navbar */}
      <Navbar
        mapTitle={graph.meta.title}
        onUpdateMapTitle={handleUpdateTitle}
        onOpenSidebarMenu={() => setIsSidebarDrawerOpen(true)}
        onOpenAICopilot={() => setIsAICopilotOpen(true)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z * 1.15, 2.5))}
        onZoomOut={() => setZoom(z => Math.max(z * 0.85, 0.3))}
        onResetZoom={() => setZoom(1)}
        onCenterView={handleCenterView}
        onFitScreen={() => handleFitScreen(graph, true)}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        isGoogleLoading={isGoogleLoading}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Interactive Canvas / Flowchart Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        {viewMode === 'node' ? (
          <MindmapCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            editingNodeId={editingNodeId}
            zoom={zoom}
            pan={pan}
            onSelectNode={handleSelectNode}
            onOpenDetailModal={handleOpenDetailModal}
            onAddChildNode={handleAddChildNode}
            onDeleteNode={handleDeleteNode}
            onUpdateNodeTitle={handleUpdateNodeTitle}
            onStartEditTitle={handleStartEditTitle}
            onFinishEditTitle={handleFinishEditTitle}
            onCancelEditTitle={handleCancelEditTitle}
            onReparent={handleReparent}
            onUpdateNodePosition={handleUpdateNodePosition}
            onPanChange={handlePanChange}
            onZoomChange={handleZoomChange}
          />
        ) : (
          <FlowchartView
            graph={graph}
            selectedNodeId={selectedNodeId}
            editingNodeId={editingNodeId}
            zoom={zoom}
            onSelectNode={handleSelectNode}
            onOpenDetailModal={handleOpenDetailModal}
            onAddChildNode={handleAddChildNode}
            onDeleteNode={handleDeleteNode}
            onUpdateNodeTitle={handleUpdateNodeTitle}
            onStartEditTitle={handleStartEditTitle}
            onFinishEditTitle={handleFinishEditTitle}
            onCancelEditTitle={handleCancelEditTitle}
            onReparent={handleReparent}
            onReorderStages={handleReorderStages}
            onUpdateGraph={updateGraph}
            onPushSnapshot={pushSnapshot}
          />
        )}

        {/* Floating Action Button (FAB) for Quick Operations */}
        <FloatingActionButton
          viewMode={viewMode}
          onNewMindmap={handleNewMindmap}
          onAddNode={handleAddNewNode}
          onAddChild={() => {
            const targetParent = selectedNodeId || graph.rootId;
            handleAddChildNode(targetParent);
          }}
          onAddParent={handleAddParentNode}
          onAddStage={handleAddNewFlowchartStage}
          onAddGroup={handleAddNewFlowchartGroup}
          onAddCard={handleAddNewFlowchartCard}
          onDeleteNode={() => handleDeleteNode(selectedNodeId || undefined)}
          onOpenAICopilot={() => setIsAICopilotOpen(true)}
          selectedNodeTitle={selectedNode?.title}
          hasSelectedNode={!!selectedNodeId}
          isSelectedNodeRoot={selectedNodeId === graph.rootId}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-150">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Full Popup Detail Modal */}
      <NodeDetailModal
        isOpen={isDetailModalOpen}
        nodeId={detailNodeId}
        graph={graph}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailNodeId(null);
        }}
        onUpdateNode={handleUpdateNode}
        onReparent={handleReparent}
        onAddCrossLink={handleAddCrossLink}
        onUpdateCrossLink={handleUpdateCrossLink}
        onRemoveCrossLink={handleRemoveCrossLink}
        onDeleteNode={handleDeleteNode}
        onUpdateGraph={updateGraph}
        onPushSnapshot={pushSnapshot}
        onShowToast={showToast}
      />

      {/* Save to Drive Modal */}
      <DriveSaveModal
        isOpen={isSaveDriveModalOpen}
        currentTitle={graph.meta.title}
        existingFileId={activeDriveFileId}
        isSaving={isSavingDrive}
        onSave={handleSaveToDrive}
        onClose={() => setIsSaveDriveModalOpen(false)}
      />

      {/* New Mindmap with Cloud Save Prompt Modal */}
      <NewMindmapModal
        isOpen={isNewMindmapModalOpen}
        currentTitle={graph.meta.title}
        isLoggedIn={!!user}
        onClose={() => setIsNewMindmapModalOpen(false)}
        onSaveToCloudAndCreateNew={handleSaveToCloudAndCreateNew}
        onDiscardAndCreateNew={handleResetToNewMindmap}
      />

      {/* Load from Drive Modal */}
      <DriveFilesModal
        isOpen={isLoadDriveModalOpen}
        onSelectFile={handleSelectDriveFile}
        onClose={() => setIsLoadDriveModalOpen(false)}
        onRequestConfirmDelete={handleRequestConfirmDeleteDriveFile}
      />

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel={confirmConfig.cancelLabel}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(c => ({ ...c, isOpen: false }))}
      />

      {/* Left Sidebar Drawer (opened when clicking Brand Logo) */}
      <LeftSidebarDrawer
        isOpen={isSidebarDrawerOpen}
        onClose={() => setIsSidebarDrawerOpen(false)}
        graph={graph}
        user={user}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenImportText={() => setIsImportTextModalOpen(true)}
        onOpenAICopilot={() => setIsAICopilotOpen(true)}
        onOpenSourceText={() => setIsSourceTextModalOpen(true)}
        onNewMindmap={handleNewMindmap}
        onAddRootChild={handleAddRootChild}
        onSaveToDrive={() => {
          if (!user) {
            handleGoogleSignIn();
          } else {
            setIsSaveDriveModalOpen(true);
          }
        }}
        onLoadFromDrive={() => {
          if (!user) {
            handleGoogleSignIn();
          } else {
            setIsLoadDriveModalOpen(true);
          }
        }}
        onAutoLayout={handleAutoLayout}
        onAutoUpdateChildColors={handleAutoUpdateChildColors}
        onExportJson={handleExportJson}
        onImportJson={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) handleImportJson(file);
          };
          input.click();
        }}
        onExportPng={handleExportPng}
        onExportPdf={handleExportPdf}
        onExportTxt={handleExportTxt}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(z * 1.15, 2.5))}
        onZoomOut={() => setZoom(z => Math.max(z * 0.85, 0.3))}
        onResetZoom={() => setZoom(1)}
        onCenterView={handleCenterView}
        onFitScreen={() => handleFitScreen(graph, true)}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        isGoogleLoading={isGoogleLoading}
        onToggleLanguage={() => {
          setLanguage(language === 'vi' ? 'en' : 'vi');
        }}
        currentLang={language}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* AI Text to Mindmap Import Modal */}
      <ImportTextModal
        isOpen={isImportTextModalOpen}
        onClose={() => setIsImportTextModalOpen(false)}
        onGenerate={handleGenerateMindmapFromText}
        selectedNodeTitle={selectedNode?.title}
        hasSelectedNode={!!selectedNodeId}
      />

      {/* AI Mindmap Co-pilot Drawer (Q&A & Structure Refinement) */}
      <AICoPilotDrawer
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        graph={graph}
        selectedNodeId={selectedNodeId}
        onGraphUpdated={handleGraphUpdatedByAI}
        onUndoLastAIAction={handleUndoLastAIAction}
        canUndo={aiUndoStack.length > 0}
        onOpenSourceTextModal={() => setIsSourceTextModalOpen(true)}
        language={language}
      />

      {/* Source Text Context Modal */}
      <SourceTextModal
        isOpen={isSourceTextModalOpen}
        onClose={() => setIsSourceTextModalOpen(false)}
        sourceText={graph.getSourceText()}
        onSaveSourceText={handleSaveSourceText}
        language={language}
      />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <MindmapApp />
    </LanguageProvider>
  );
}
