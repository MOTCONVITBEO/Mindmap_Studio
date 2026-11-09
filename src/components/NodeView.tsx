import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Trash2, Plus, ChevronDown, ChevronUp, FolderTree, Check, Unlink, User } from 'lucide-react';
import { NodeModel } from '../models/NodeModel';
import { MindmapGraph } from '../models/MindmapGraph';
import { useTranslation } from '../i18n/LanguageContext';

interface NodeViewProps {
  node: NodeModel;
  graph?: MindmapGraph;
  isSelected: boolean;
  isDragTarget: boolean;
  isDragging: boolean;
  isEditingTitle: boolean;
  isRoot?: boolean;
  onSelect: (nodeId: string) => void;
  onOpenDetail: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onStartDrag: (e: React.MouseEvent | React.TouchEvent, nodeId: string) => void;
  onStartEditTitle: (nodeId: string) => void;
  onFinishEditTitle: (nodeId: string, newTitle: string) => void;
  onCancelEditTitle: () => void;
}

export const NodeView: React.FC<NodeViewProps> = ({
  node,
  graph,
  isSelected,
  isDragTarget,
  isDragging,
  isEditingTitle,
  isRoot = false,
  onSelect,
  onOpenDetail,
  onAddChild,
  onDeleteNode,
  onStartDrag,
  onStartEditTitle,
  onFinishEditTitle,
  onCancelEditTitle,
}) => {
  const { t } = useTranslation();
  const [titleDraft, setTitleDraft] = useState(node.title);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastClickRef = useRef<number>(0);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setTitleDraft(node.title);
  }, [node.title]);

  useEffect(() => {
    if (isEditingTitle) {
      setTitleDraft(node.title);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isEditingTitle, node.title]);

  const handleFinishEditing = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== node.title) {
      onFinishEditTitle(node.id, trimmed);
    } else {
      onCancelEditTitle();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop all key events inside the input from bubbling to parent or window
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // Do not submit while typing with IME (Vietnamese Telex, etc.)
    if (e.nativeEvent.isComposing || (e as any).keyCode === 229) {
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTitleDraft(node.title);
      onCancelEditTitle();
    }
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('button, input')) return;
    onSelect(node.id);

    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 350;
    if (now - lastClickRef.current < DOUBLE_CLICK_DELAY) {
      onStartEditTitle(node.id);
      lastClickRef.current = 0;
      return;
    }
    lastClickRef.current = now;
  };

  const handleNodeDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('button, input')) return;
    onStartEditTitle(node.id);
  };

  const handleNodeTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.stopPropagation();
      onStartEditTitle(node.id);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    if (!isEditingTitle) {
      onStartDrag(e, node.id);
    }
  };

  const width = node.getWidth();
  const height = node.getHeight();
  const { shape, fillColor, borderColor, borderWidth, borderStyle, textColor } = node.style;

  // Compute shape styles & CSS
  let shapeClass = 'rounded-xl';
  let clipPathStyle: React.CSSProperties = {};

  if (shape === 'rounded-rect') {
    shapeClass = 'rounded-2xl';
  } else if (shape === 'capsule') {
    shapeClass = 'rounded-full';
  } else if (shape === 'rectangle') {
    shapeClass = 'rounded-xs';
  } else if (shape === 'circle') {
    shapeClass = 'rounded-full';
  } else if (shape === 'diamond') {
    shapeClass = 'rounded-lg';
    clipPathStyle = {
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    };
  } else if (shape === 'hexagon') {
    shapeClass = 'rounded-md';
    clipPathStyle = {
      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    };
  }

  return (
    <div
      id={`node-container-${node.id}`}
      data-node-id={node.id}
      className={`absolute group select-none transition-shadow ${
        isDragging
          ? 'opacity-40 scale-95 pointer-events-none'
          : isEditingTitle
          ? 'cursor-text'
          : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{
        transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: isEditingTitle ? 40 : isSelected ? 30 : isDragTarget ? 25 : 10,
      }}
      onClick={handleNodeClick}
      onDoubleClick={handleNodeDoubleClick}
      onMouseDown={e => {
        // Only start node drag if not clicking directly on expand button or editing input
        if ((e.target as HTMLElement).closest('button, input')) return;
        if (isEditingTitle) return;
        onStartDrag(e, node.id);
      }}
      onTouchStart={handleNodeTouchStart}
    >
      {/* Drop Target Indicator Overlay */}
      {isDragTarget && (
        <div className="absolute -inset-3 rounded-2xl border-2 border-emerald-500 border-dashed bg-emerald-500/15 animate-pulse z-40 pointer-events-none flex items-center justify-center">
          <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap max-w-[200px] truncate">
            {t('dropToMakeChildOf')} "{node.title}"
          </span>
        </div>
      )}

      {/* Main Node Shell: Clean & Minimalist */}
      <div
        className={`w-full h-full flex items-center justify-center relative transition-all duration-150 p-2 ${shapeClass} ${
          isSelected ? 'ring-3 ring-blue-500 ring-offset-2 shadow-lg' : 'shadow-sm hover:shadow-md'
        }`}
        style={{
          backgroundColor: fillColor,
          borderColor: borderColor,
          borderWidth: `${borderWidth}px`,
          borderStyle: borderStyle,
          color: textColor,
          ...clipPathStyle,
        }}
      >
        {/* ID & Cross-link badges ở góc trên bên trái */}
        <div className="absolute top-1 left-1.5 flex items-center gap-1 z-20 font-mono text-[9px] opacity-80">
          <span className="font-bold font-mono">[{node.id}]</span>
          {(() => {
            if (!graph) return null;
            const crossLinks = graph.getCrossLinksForNode(node.id);
            if (crossLinks.length === 0) return null;
            if (crossLinks.length === 1) {
              const linked = crossLinks[0].otherNode;
              return (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onSelect(linked.id);
                  }}
                  title={`Liên kết chéo tới [${linked.id}] ${linked.title}`}
                  className="inline-flex items-center gap-0.5 font-mono font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1 py-0.2 rounded transition-all cursor-pointer shadow-2xs"
                >
                  <Unlink className="w-2.5 h-2.5 text-purple-600" />
                  <span>[{linked.id}]</span>
                </button>
              );
            }
            return (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenDetail(node.id);
                }}
                title={`${crossLinks.length} liên kết chéo`}
                className="inline-flex items-center gap-0.5 font-mono font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 border border-purple-300 px-1 py-0.2 rounded transition-all cursor-pointer shadow-2xs"
              >
                <Unlink className="w-2.5 h-2.5 text-purple-600" />
                <span>{crossLinks.length} LK</span>
              </button>
            );
          })()}
        </div>

        {/* Action buttons ở góc trên bên phải */}
        <div className="absolute top-1 right-1 flex items-center gap-0.5 z-20">
          {/* Nút thêm node con nhanh */}
          <button
            id={`btn-add-child-${node.id}`}
            type="button"
            onClick={e => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            onTouchStart={e => e.stopPropagation()}
            title={t('newChildNode')}
            className="p-1 rounded-md text-current opacity-60 hover:opacity-100 hover:bg-black/10 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Nút xóa node (chỉ hiện cho node không phải root) */}
          {!isRoot && onDeleteNode && (
            <button
              id={`btn-delete-node-${node.id}`}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDeleteNode(node.id);
              }}
              onTouchStart={e => e.stopPropagation()}
              title={t('deleteNode')}
              className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50/90 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Nút mở rộng chi tiết */}
          <button
            id={`btn-expand-${node.id}`}
            type="button"
            onClick={e => {
              e.stopPropagation();
              onSelect(node.id);
              onOpenDetail(node.id);
            }}
            onTouchStart={e => e.stopPropagation()}
            title={t('expandPopup')}
            className="p-1 rounded-md text-current opacity-60 hover:opacity-100 hover:bg-black/10 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nội dung thu gọn ở trung tâm (Double click để sửa nhanh) */}
        <div
          className="w-full text-center px-3 z-10"
          onDoubleClick={e => {
            e.stopPropagation();
            if ((e.target as HTMLElement).closest('button, input')) return;
            onStartEditTitle(node.id);
          }}
        >
          {isEditingTitle ? (
            <input
              ref={inputRef}
              id={`input-title-${node.id}`}
              type="text"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleFinishEditing}
              onKeyDown={handleKeyDown}
              onKeyUp={e => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onKeyPress={e => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onDoubleClick={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              className="w-full text-center text-xs sm:text-sm font-bold bg-white text-slate-900 px-2 py-1 rounded-lg border-2 border-blue-500 ring-2 ring-blue-100 focus:outline-none shadow-md"
              placeholder={node.title}
              autoFocus
            />
          ) : (
            <div
              className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 break-words select-none cursor-pointer flex items-center justify-center gap-1.5"
              title={`${node.title} • ${t('doubleClickToEdit')}`}
            >
              {node.isGroup && (
                <FolderTree className="w-3.5 h-3.5 shrink-0 opacity-80" />
              )}
              {node.nodeType === 'character_profile' && (
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs" title="Node cấu hình nhân vật">
                  <User className="w-2.5 h-2.5" />
                </span>
              )}
              {node.completed && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
              <span className={node.completed ? 'line-through opacity-85' : ''}>{node.title}</span>
            </div>
          )}

          {/* Node Content / Notes snippet with 'Xem thêm' */}
          {(() => {
            const allBlocks = (node.contents && node.contents.length > 0 ? node.contents : [node.content || '']).filter(c => c && c.trim());
            if (allBlocks.length === 0 || isEditingTitle) return null;

            const firstBlock = allBlocks[0];
            const isExpandable = allBlocks.length > 1 || firstBlock.length > 35 || firstBlock.includes('\n');

            return (
              <div className="mt-1 pt-1 border-t border-current/20 text-left w-full">
                {isContentExpanded ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {allBlocks.map((block, bIdx) => (
                      <div key={`node-${node.id}-block-${bIdx}`} className="text-[10px] opacity-85 leading-relaxed font-normal whitespace-pre-wrap">
                        {allBlocks.length > 1 && (
                          <span className="font-semibold underline mr-1">#{bIdx + 1}:</span>
                        )}
                        {block}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] opacity-85 leading-relaxed font-normal line-clamp-1 truncate">
                    {firstBlock}
                  </p>
                )}

                {isExpandable && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setIsContentExpanded(prev => !prev);
                    }}
                    onTouchStart={e => e.stopPropagation()}
                    className="mt-0.5 text-[9px] font-semibold opacity-90 hover:opacity-100 underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>
                      {isContentExpanded
                        ? (t('collapseDesc') || 'Thu gọn')
                        : allBlocks.length > 1
                        ? `Xem thêm (${allBlocks.length})`
                        : (t('expandDesc') || 'Xem thêm')}
                    </span>
                    {isContentExpanded ? (
                      <ChevronUp className="w-2.5 h-2.5" />
                    ) : (
                      <ChevronDown className="w-2.5 h-2.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
