import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MindmapGraph } from '../models/MindmapGraph';
import { NodeModel } from '../models/NodeModel';
import { EdgeModel } from '../models/EdgeModel';
import { NodeView } from './NodeView';

interface MindmapCanvasProps {
  graph: MindmapGraph;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  onSelectNode: (nodeId: string | null, autoCenter?: boolean) => void;
  onOpenDetailModal: (nodeId: string) => void;
  onAddChildNode: (parentId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateNodeTitle: (nodeId: string, title: string) => void;
  onStartEditTitle: (nodeId: string) => void;
  onFinishEditTitle: (nodeId: string, title: string) => void;
  onCancelEditTitle: () => void;
  onReparent: (nodeId: string, newParentId: string | null) => boolean;
  onUpdateNodePosition: (nodeId: string, pos: { x: number; y: number }) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({
  graph,
  selectedNodeId,
  editingNodeId,
  zoom,
  pan,
  onSelectNode,
  onOpenDetailModal,
  onAddChildNode,
  onDeleteNode,
  onUpdateNodeTitle,
  onStartEditTitle,
  onFinishEditTitle,
  onCancelEditTitle,
  onReparent,
  onUpdateNodePosition,
  onPanChange,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state for nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [hoverTargetNodeId, setHoverTargetNodeId] = useState<string | null>(null);

  // Ref to track node drag gesture with threshold to prevent intercepting clicks/double-clicks
  const nodeDragRef = useRef<{
    nodeId: string;
    startClientX: number;
    startClientY: number;
    worldOffsetX: number;
    worldOffsetY: number;
    hasStartedDragging: boolean;
  } | null>(null);

  // Canvas panning state (Mouse & 1-finger touch)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 2-finger pinch-to-zoom touch state
  const touchStateRef = useRef<{
    mode: 'none' | 'pan' | 'pinch' | 'drag-node';
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    centerWorldPt: { x: number; y: number };
  }>({
    mode: 'none',
    initialDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    centerWorldPt: { x: 0, y: 0 },
  });

  const allNodes = graph.getAllNodes();
  const treeEdges = graph.getTreeRelations();
  const crossEdges = graph.getCrossRelations();

  // F2 keyboard shortcut to edit title of selected node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'F2' && selectedNodeId) {
        e.preventDefault();
        onStartEditTitle(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, onStartEditTitle]);

  // Helper: calculate distance between two touch points
  const getTouchDistance = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: calculate center point between two touches
  const getTouchCenter = (t1: React.Touch | Touch, t2: React.Touch | Touch) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  // Mouse wheel zoom (with focal point zooming under cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const cursorX = rect ? e.clientX - rect.left : e.clientX;
    const cursorY = rect ? e.clientY - rect.top : e.clientY;

    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3.0);

    // Keep world coordinate under cursor stable:
    // worldX = (cursorX - pan.x) / zoom = (cursorX - newPanX) / newZoom
    const newPanX = cursorX - ((cursorX - pan.x) / zoom) * newZoom;
    const newPanY = cursorY - ((cursorY - pan.y) / zoom) * newZoom;

    onZoomChange(newZoom);
    onPanChange({ x: newPanX, y: newPanY });
  };

  // Canvas pan start (Mouse)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan on left click or middle click directly on background
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
      onCancelEditTitle();
    }
  };

  // Node drag start (Mouse or Touch) - thresholded so clicks & double-clicks work smoothly!
  const handleStartDragNode = (e: React.MouseEvent | React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    const node = graph.getNode(nodeId);
    if (!node) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      touchStateRef.current.mode = 'drag-node';
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert mouse/touch screen coordinates to canvas world coordinates
    const worldX = (clientX - pan.x) / zoom;
    const worldY = (clientY - pan.y) / zoom;

    nodeDragRef.current = {
      nodeId,
      startClientX: clientX,
      startClientY: clientY,
      worldOffsetX: worldX - node.position.x,
      worldOffsetY: worldY - node.position.y,
      hasStartedDragging: false,
    };

    onSelectNode(nodeId, false);
  };

  // Touch start on canvas viewport
  const handleTouchStart = (e: React.TouchEvent) => {
    if (draggingNodeId) return;

    if (e.touches.length === 1) {
      // 1-finger touch: start panning canvas
      touchStateRef.current.mode = 'pan';
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
      onSelectNode(null);
    } else if (e.touches.length === 2) {
      // 2-finger touch: start pinch-to-zoom
      e.preventDefault();
      setIsPanning(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = getTouchDistance(t1, t2);
      const center = getTouchCenter(t1, t2);

      // Store center point in canvas world coordinates
      const centerWorldPt = {
        x: (center.x - pan.x) / zoom,
        y: (center.y - pan.y) / zoom,
      };

      touchStateRef.current = {
        mode: 'pinch',
        initialDistance: dist,
        initialZoom: zoom,
        initialPan: { ...pan },
        centerWorldPt,
      };
    }
  };

  // Touch move on canvas viewport
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStateRef.current.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = getTouchDistance(t1, t2);
      const currentCenter = getTouchCenter(t1, t2);

      if (touchStateRef.current.initialDistance > 0) {
        const scale = currentDist / touchStateRef.current.initialDistance;
        const targetZoom = Math.min(
          Math.max(touchStateRef.current.initialZoom * scale, 0.25),
          3.0
        );

        // Focal point zoom: adjust pan so the initial center point stays under current touch center
        const newPanX = currentCenter.x - touchStateRef.current.centerWorldPt.x * targetZoom;
        const newPanY = currentCenter.y - touchStateRef.current.centerWorldPt.y * targetZoom;

        onZoomChange(targetZoom);
        onPanChange({ x: newPanX, y: newPanY });
      }
      return;
    }

    if (touchStateRef.current.mode === 'pan' && e.touches.length === 1 && isPanning) {
      e.preventDefault();
      onPanChange({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y,
      });
      return;
    }

    if (touchStateRef.current.mode === 'drag-node' && nodeDragRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const drag = nodeDragRef.current;
      if (!drag.hasStartedDragging) {
        const moveDist = Math.hypot(touch.clientX - drag.startClientX, touch.clientY - drag.startClientY);
        if (moveDist > 6) {
          drag.hasStartedDragging = true;
          setDraggingNodeId(drag.nodeId);
        } else {
          return;
        }
      }

      e.preventDefault();
      const worldX = (touch.clientX - pan.x) / zoom;
      const worldY = (touch.clientY - pan.y) / zoom;
      const newX = Math.round(worldX - drag.worldOffsetX);
      const newY = Math.round(worldY - drag.worldOffsetY);

      onUpdateNodePosition(drag.nodeId, { x: newX, y: newY });

      // Check drop target
      const draggedNode = graph.getNode(drag.nodeId);
      if (!draggedNode) return;
      const draggedCenter = {
        x: newX + draggedNode.getWidth() / 2,
        y: newY + draggedNode.getHeight() / 2,
      };

      let targetFound: string | null = null;
      for (const targetNode of allNodes) {
        if (targetNode.id === drag.nodeId) continue;
        if (graph.isDescendant(drag.nodeId, targetNode.id)) continue;

        const targetLeft = targetNode.position.x - 20;
        const targetRight = targetNode.position.x + targetNode.getWidth() + 20;
        const targetTop = targetNode.position.y - 20;
        const targetBottom = targetNode.position.y + targetNode.getHeight() + 20;

        if (
          draggedCenter.x >= targetLeft &&
          draggedCenter.x <= targetRight &&
          draggedCenter.y >= targetTop &&
          draggedCenter.y <= targetBottom
        ) {
          targetFound = targetNode.id;
          break;
        }
      }
      setHoverTargetNodeId(targetFound);
    }
  };

  // Touch end / cancel handler
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      if (touchStateRef.current.mode === 'pan') {
        setIsPanning(false);
      }
      touchStateRef.current.mode = 'none';

      if (nodeDragRef.current) {
        const { nodeId, hasStartedDragging } = nodeDragRef.current;
        if (hasStartedDragging) {
          if (hoverTargetNodeId && hoverTargetNodeId !== nodeId) {
            onReparent(nodeId, hoverTargetNodeId);
          }
          setDraggingNodeId(null);
          setHoverTargetNodeId(null);
        }
        nodeDragRef.current = null;
      }
    } else if (e.touches.length === 1 && touchStateRef.current.mode === 'pinch') {
      // Transition from 2-finger pinch back to 1-finger pan smoothly
      touchStateRef.current.mode = 'pan';
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  // Mouse move handler (covers both canvas pan and node drag)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        onPanChange({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      if (nodeDragRef.current) {
        const drag = nodeDragRef.current;
        if (!drag.hasStartedDragging) {
          const moveDist = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY);
          if (moveDist > 4) {
            drag.hasStartedDragging = true;
            setDraggingNodeId(drag.nodeId);
          } else {
            return;
          }
        }

        const worldX = (e.clientX - pan.x) / zoom;
        const worldY = (e.clientY - pan.y) / zoom;
        const newX = Math.round(worldX - drag.worldOffsetX);
        const newY = Math.round(worldY - drag.worldOffsetY);

        onUpdateNodePosition(drag.nodeId, { x: newX, y: newY });

        // Check if cursor or dragged node is hovering over another node (drop target candidate)
        const draggedNode = graph.getNode(drag.nodeId);
        if (!draggedNode) return;
        const draggedCenter = {
          x: newX + draggedNode.getWidth() / 2,
          y: newY + draggedNode.getHeight() / 2,
        };

        let targetFound: string | null = null;
        for (const targetNode of allNodes) {
          if (targetNode.id === drag.nodeId) continue;
          // Disallow making parent of own descendant
          if (graph.isDescendant(drag.nodeId, targetNode.id)) continue;

          const targetLeft = targetNode.position.x - 20;
          const targetRight = targetNode.position.x + targetNode.getWidth() + 20;
          const targetTop = targetNode.position.y - 20;
          const targetBottom = targetNode.position.y + targetNode.getHeight() + 20;

          if (
            draggedCenter.x >= targetLeft &&
            draggedCenter.x <= targetRight &&
            draggedCenter.y >= targetTop &&
            draggedCenter.y <= targetBottom
          ) {
            targetFound = targetNode.id;
            break;
          }
        }
        setHoverTargetNodeId(targetFound);
      }
    },
    [isPanning, panStart, pan, zoom, onPanChange, onUpdateNodePosition, graph, allNodes]
  );

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (nodeDragRef.current) {
      const { nodeId, hasStartedDragging } = nodeDragRef.current;
      if (hasStartedDragging) {
        if (hoverTargetNodeId && hoverTargetNodeId !== nodeId) {
          // Perform reparenting
          onReparent(nodeId, hoverTargetNodeId);
        }
        setDraggingNodeId(null);
        setHoverTargetNodeId(null);
      }
      nodeDragRef.current = null;
    }
  }, [isPanning, hoverTargetNodeId, onReparent]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      id="mindmap-canvas-viewport"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative w-full h-full overflow-hidden bg-slate-50 select-none touch-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Zoom / Pan Transformer Layer */}
      <div
        id="mindmap-canvas-world"
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Layer for Tree Connections and Cross Links */}
        <svg
          className="absolute overflow-visible top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 1 }}
        >
          <defs>
            {/* Arrow marker for cross relations */}
            <marker
              id="arrowhead-cross"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
            </marker>
          </defs>

          {/* 1. Tree Branch Relations */}
          {treeEdges.map(edge => {
            const sourceNode = graph.getNode(edge.sourceId);
            const targetNode = graph.getNode(edge.targetId);
            if (!sourceNode || !targetNode) return null;

            const sourceCenter = sourceNode.getCenter();
            const targetCenter = targetNode.getCenter();
            const dx = targetCenter.x - sourceCenter.x;
            const dy = targetCenter.y - sourceCenter.y;

            let startPt: { x: number; y: number };
            let endPt: { x: number; y: number };

            if (Math.abs(dx) >= 30) {
              // Horizontal orientation: connect from right/left edge
              startPt = {
                x: sourceNode.position.x + (dx >= 0 ? sourceNode.getWidth() : 0),
                y: sourceCenter.y,
              };
              endPt = {
                x: targetNode.position.x + (dx >= 0 ? 0 : targetNode.getWidth()),
                y: targetCenter.y,
              };
            } else {
              // Vertical orientation: connect from top/bottom edge
              startPt = {
                x: sourceCenter.x,
                y: sourceNode.position.y + (dy >= 0 ? sourceNode.getHeight() : 0),
              };
              endPt = {
                x: targetCenter.x,
                y: targetNode.position.y + (dy >= 0 ? 0 : targetNode.getHeight()),
              };
            }

            const pathData = EdgeModel.calculateCurvePath(startPt, endPt, true);

            const edgeColor = edge.color || '#94a3b8';
            const edgeWidth = edge.width || 2.5;
            const markerStartId = `arrow-start-tree-${edge.id}`;
            const markerEndId = `arrow-end-tree-${edge.id}`;

            let dashArray = undefined;
            if (edge.style === 'dashed') {
              dashArray = '6 4';
            } else if (edge.style === 'dotted') {
              dashArray = '2 3';
            }

            const showStartArrow = edge.arrow === 'start' || edge.arrow === 'both';
            const showEndArrow = edge.arrow === 'end' || edge.arrow === 'both';

            return (
              <g key={edge.id} className="transition-all duration-150">
                <defs>
                  {showEndArrow && (
                    <marker
                      id={markerEndId}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill={edgeColor} />
                    </marker>
                  )}
                  {showStartArrow && (
                    <marker
                      id={markerStartId}
                      markerWidth="10"
                      markerHeight="7"
                      refX="1"
                      refY="3.5"
                      orient="auto-start-reverse"
                    >
                      <polygon points="10 0, 0 3.5, 10 7" fill={edgeColor} />
                    </marker>
                  )}
                </defs>

                <path
                  d={pathData}
                  fill="none"
                  stroke={edgeColor}
                  strokeWidth={edgeWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="round"
                  markerStart={showStartArrow ? `url(#${markerStartId})` : undefined}
                  markerEnd={showEndArrow ? `url(#${markerEndId})` : undefined}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
              </g>
            );
          })}

          {/* 2. Cross Links (Direct non-hierarchical relationships) */}
          {crossEdges.map(edge => {
            const sourceNode = graph.getNode(edge.sourceId);
            const targetNode = graph.getNode(edge.targetId);
            if (!sourceNode || !targetNode) return null;

            const startPt = sourceNode.getCenter();
            const endPt = targetNode.getCenter();
            const pathData = EdgeModel.calculateCurvePath(startPt, endPt, false);

            const midX = (startPt.x + endPt.x) / 2;
            const midY = (startPt.y + endPt.y) / 2 - 40;

            const edgeColor = edge.color || '#8b5cf6';
            const edgeWidth = edge.width || 2;
            const markerStartId = `arrow-start-${edge.id}`;
            const markerEndId = `arrow-end-${edge.id}`;

            // Determine strokeDasharray based on border style
            let dashArray = undefined;
            if (edge.style === 'dashed') {
              dashArray = '6 4';
            } else if (edge.style === 'dotted') {
              dashArray = '2 3';
            }

            const showStartArrow = edge.arrow === 'start' || edge.arrow === 'both';
            const showEndArrow = edge.arrow === 'end' || edge.arrow === 'both';

            return (
              <g key={edge.id} className="transition-all">
                <defs>
                  {showEndArrow && (
                    <marker
                      id={markerEndId}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill={edgeColor} />
                    </marker>
                  )}
                  {showStartArrow && (
                    <marker
                      id={markerStartId}
                      markerWidth="10"
                      markerHeight="7"
                      refX="1"
                      refY="3.5"
                      orient="auto-start-reverse"
                    >
                      <polygon points="10 0, 0 3.5, 10 7" fill={edgeColor} />
                    </marker>
                  )}
                </defs>

                <path
                  d={pathData}
                  fill="none"
                  stroke={edgeColor}
                  strokeWidth={edgeWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="round"
                  markerStart={showStartArrow ? `url(#${markerStartId})` : undefined}
                  markerEnd={showEndArrow ? `url(#${markerEndId})` : undefined}
                  className="opacity-85 hover:opacity-100 transition-opacity"
                />
                {edge.label && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-40"
                      y="-12"
                      width="80"
                      height="22"
                      rx="6"
                      fill="#ffffff"
                      stroke={edgeColor}
                      strokeWidth="1"
                      className="shadow-xs"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={edgeColor}
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute inset-0 pointer-events-auto">
          {allNodes.map(node => (
            <NodeView
              key={node.id}
              node={node}
              graph={graph}
              isSelected={selectedNodeId === node.id}
              isDragTarget={hoverTargetNodeId === node.id}
              isDragging={draggingNodeId === node.id}
              isEditingTitle={editingNodeId === node.id}
              isRoot={node.id === graph.rootId || node.parentId === null}
              onSelect={id => {
                onSelectNode(id);
                if (editingNodeId && editingNodeId !== id) {
                  onCancelEditTitle();
                }
              }}
              onOpenDetail={onOpenDetailModal}
              onAddChild={onAddChildNode}
              onDeleteNode={onDeleteNode}
              onStartDrag={handleStartDragNode}
              onStartEditTitle={onStartEditTitle}
              onFinishEditTitle={onFinishEditTitle}
              onCancelEditTitle={onCancelEditTitle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
