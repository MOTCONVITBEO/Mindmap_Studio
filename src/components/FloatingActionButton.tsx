import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  FilePlus,
  FolderPlus,
  ArrowUpCircle,
  CircleDot,
  Trash2,
  Sparkles,
  Workflow,
  Layers,
  FolderTree,
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { MindmapViewMode } from '../types/mindmap';

interface FloatingActionButtonProps {
  onNewMindmap: () => void;
  onAddNode: () => void;
  onAddChild: () => void;
  onAddParent: () => void;
  onDeleteNode?: () => void;
  onOpenAICopilot?: () => void;
  selectedNodeTitle?: string | null;
  hasSelectedNode: boolean;
  isSelectedNodeRoot?: boolean;
  viewMode?: MindmapViewMode;
  onAddStage?: () => void;
  onAddGroup?: () => void;
  onAddCard?: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onNewMindmap,
  onAddNode,
  onAddChild,
  onAddParent,
  onDeleteNode,
  onOpenAICopilot,
  selectedNodeTitle,
  hasSelectedNode,
  isSelectedNodeRoot = false,
  viewMode = 'node',
  onAddStage,
  onAddGroup,
  onAddCard,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  const isFlowchart = viewMode === 'flowchart';

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Sub-menu options (Speed Dial Menu) */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Option: Trợ lý AI */}
          {onOpenAICopilot && (
            <button
              id="fab-btn-ai-copilot"
              type="button"
              onClick={() => handleAction(onOpenAICopilot)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full shadow-lg border border-indigo-400/30 hover:opacity-95 transition-all group cursor-pointer"
            >
              <span className="text-xs font-semibold whitespace-nowrap text-white">
                {t('aiCopilotTitle')}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center transition-colors shadow-2xs">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
            </button>
          )}

          {/* Flowchart-Specific Menu Options */}
          {isFlowchart ? (
            <>
              {/* Option: Thêm nhóm cột mới */}
              <button
                id="fab-btn-add-group"
                type="button"
                onClick={() => handleAction(onAddGroup || onAddNode)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-indigo-200/90 hover:bg-indigo-50/70 hover:border-indigo-300 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold whitespace-nowrap text-indigo-700 group-hover:text-indigo-800 transition-colors">
                    {t('addColumnGroupBtn')}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-normal truncate max-w-[150px]">
                    tạo nhóm chứa các cột
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
              </button>

              {/* Option: Thêm cột tiến trình */}
              <button
                id="fab-btn-add-stage"
                type="button"
                onClick={() => handleAction(onAddStage || onAddNode)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-blue-200/90 hover:bg-blue-50/70 hover:border-blue-300 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold whitespace-nowrap text-blue-700 group-hover:text-blue-800 transition-colors">
                    {t('flowchartAddStage')}
                  </span>
                  <span className="text-[10px] text-blue-400 font-normal truncate max-w-[150px]">
                    {hasSelectedNode && selectedNodeTitle ? `cạnh "${selectedNodeTitle}"` : 'thêm cột tiến trình'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                  <Plus className="w-4 h-4" />
                </div>
              </button>

              {/* Option: Thêm thẻ bước */}
              <button
                id="fab-btn-add-card"
                type="button"
                onClick={() => handleAction(onAddCard || onAddChild)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-emerald-200/90 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold whitespace-nowrap text-emerald-700 group-hover:text-emerald-800 transition-colors">
                    {t('flowchartAddCard')}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-normal truncate max-w-[150px]">
                    {hasSelectedNode && selectedNodeTitle ? `vào "${selectedNodeTitle}"` : 'vào cột tiến trình'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                  <Layers className="w-4 h-4" />
                </div>
              </button>
            </>
          ) : (
            /* Standard Node Mode Menu Options */
            <>
              {/* Option: Sơ đồ mới */}
              <button
                id="fab-btn-new-mindmap"
                type="button"
                onClick={() => handleAction(onNewMindmap)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group cursor-pointer"
              >
                <span className="text-xs font-semibold whitespace-nowrap text-slate-700 group-hover:text-blue-600 transition-colors">
                  {t('newMindmap')}
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                  <FilePlus className="w-4 h-4" />
                </div>
              </button>

              {/* Option: Node mới */}
              <button
                id="fab-btn-add-node"
                type="button"
                onClick={() => handleAction(onAddNode)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold whitespace-nowrap text-slate-700 group-hover:text-amber-600 transition-colors">
                    {t('newNode')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                    {hasSelectedNode && selectedNodeTitle ? `nhánh cùng cấp "${selectedNodeTitle}"` : 'node mới trên canvas'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-2xs">
                  <CircleDot className="w-4 h-4" />
                </div>
              </button>

              {/* Option: Node con mới */}
              <button
                id="fab-btn-add-child"
                type="button"
                onClick={() => handleAction(onAddChild)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold whitespace-nowrap text-slate-700 group-hover:text-emerald-600 transition-colors">
                    {t('newChildNode')}
                  </span>
                  {hasSelectedNode && selectedNodeTitle && (
                    <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                      dưới &quot;{selectedNodeTitle}&quot;
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                  <FolderPlus className="w-4 h-4" />
                </div>
              </button>

              {/* Option: Node cha mới */}
              <button
                id="fab-btn-add-parent"
                type="button"
                onClick={() => handleAction(onAddParent)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold whitespace-nowrap text-slate-700 group-hover:text-purple-600 transition-colors">
                    {t('newParentNode')}
                  </span>
                  {hasSelectedNode && selectedNodeTitle && (
                    <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                      trên &quot;{selectedNodeTitle}&quot;
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-2xs">
                  <ArrowUpCircle className="w-4 h-4" />
                </div>
              </button>
            </>
          )}

          {/* Option: Sơ đồ mới (Flowchart mode) */}
          {isFlowchart && (
            <button
              id="fab-btn-new-flowchart"
              type="button"
              onClick={() => handleAction(onNewMindmap)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-800 rounded-full shadow-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all group cursor-pointer"
            >
              <span className="text-xs font-semibold whitespace-nowrap text-slate-700 group-hover:text-blue-600 transition-colors">
                {t('newMindmap')}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                <FilePlus className="w-4 h-4" />
              </div>
            </button>
          )}

          {/* Option: Xóa node đang chọn (nếu có node được chọn và không phải Root) */}
          {hasSelectedNode && !isSelectedNodeRoot && onDeleteNode && (
            <button
              id="fab-btn-delete-node"
              type="button"
              onClick={() => handleAction(onDeleteNode)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-red-600 rounded-full shadow-lg border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all group cursor-pointer"
            >
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold whitespace-nowrap text-red-600 group-hover:text-red-700 transition-colors">
                  {t('deleteNode')}
                </span>
                {selectedNodeTitle && (
                  <span className="text-[10px] text-red-400 font-normal truncate max-w-[140px]">
                    &quot;{selectedNodeTitle}&quot;
                  </span>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors shadow-2xs">
                <Trash2 className="w-4 h-4" />
              </div>
            </button>
          )}
        </div>
      )}

      {/* Main Big Round Floating Action Button */}
      <button
        id="fab-main-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Đóng menu' : 'Thao tác nhanh'}
        aria-label="Thao tác nhanh"
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-all duration-300 transform active:scale-95 cursor-pointer ${
          isOpen
            ? 'bg-slate-800 rotate-45 hover:bg-slate-900 shadow-slate-900/20'
            : isFlowchart
            ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 shadow-indigo-600/30'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-blue-600/30'
        }`}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>
  );
};
