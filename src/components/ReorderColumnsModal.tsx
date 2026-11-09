import React, { useState, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  X,
  Check,
  Workflow,
} from 'lucide-react';
import { NodeModel } from '../models/NodeModel';
import { useTranslation } from '../i18n/LanguageContext';

interface ReorderColumnsModalProps {
  isOpen: boolean;
  stages: NodeModel[];
  onClose: () => void;
  onApplyReorder: (newStageIds: string[]) => void;
}

export const ReorderColumnsModal: React.FC<ReorderColumnsModalProps> = ({
  isOpen,
  stages,
  onClose,
  onApplyReorder,
}) => {
  const { t } = useTranslation();
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOrderedIds(stages.map(s => s.id));
    }
  }, [isOpen, stages]);

  if (!isOpen) return null;

  const stageMap = new Map<string, NodeModel>(stages.map(s => [s.id, s]));

  const handleMove = (index: number, direction: 'up' | 'down' | 'first' | 'last') => {
    const newIds = [...orderedIds];
    const [item] = newIds.splice(index, 1);

    if (direction === 'up') {
      newIds.splice(Math.max(0, index - 1), 0, item);
    } else if (direction === 'down') {
      newIds.splice(Math.min(newIds.length, index + 1), 0, item);
    } else if (direction === 'first') {
      newIds.unshift(item);
    } else if (direction === 'last') {
      newIds.push(item);
    }

    setOrderedIds(newIds);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    if (sourceId && sourceId !== targetId) {
      const sourceIdx = orderedIds.indexOf(sourceId);
      const targetIdx = orderedIds.indexOf(targetId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const newIds = [...orderedIds];
        const [removed] = newIds.splice(sourceIdx, 1);
        newIds.splice(targetIdx, 0, removed);
        setOrderedIds(newIds);
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleApply = () => {
    onApplyReorder(orderedIds);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {t('reorderStagesTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('reorderStagesDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Column List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2">
          {orderedIds.map((id, index) => {
            const stage = stageMap.get(id);
            if (!stage) return null;

            const isDragging = draggedId === id;
            const isDragOver = dragOverId === id;
            const color = stage.style.borderColor || '#3b82f6';
            const cardCount = stage.childrenIds.length;

            return (
              <div
                key={id}
                draggable
                onDragStart={e => handleDragStart(e, id)}
                onDragOver={e => handleDragOver(e, id)}
                onDrop={e => handleDrop(e, id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all select-none ${
                  isDragging
                    ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50/30'
                    : isDragOver
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-400/40'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Drag Handle */}
                  <div
                    className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 transition-colors"
                    title={t('flowchartDragStageHint')}
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Stage Order Badge */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: color }}
                  >
                    {index + 1 < 10 ? `0${index + 1}` : index + 1}
                  </div>

                  {/* Title & Stats */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                      {stage.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{t('flowchartStepsCount', { count: cardCount })}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px]">[{stage.id}]</span>
                    </div>
                  </div>
                </div>

                {/* Move Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'first')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={t('moveStageToFirst')}
                  >
                    <ChevronsUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={t('moveStageUp')}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === orderedIds.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={t('moveStageDown')}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'last')}
                    disabled={index === orderedIds.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={t('moveStageToLast')}
                  >
                    <ChevronsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            {t('cancelBtn')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs hover:shadow cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('saveStageOrder')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
