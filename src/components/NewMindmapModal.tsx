import React, { useState } from 'react';
import { CloudUpload, FilePlus, AlertCircle, ArrowRight, X, Loader2, BrainCircuit, Workflow, Check } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { MindmapViewMode } from '../types/mindmap';

interface NewMindmapModalProps {
  isOpen: boolean;
  currentTitle: string;
  isLoggedIn: boolean;
  onClose: () => void;
  onSaveToCloudAndCreateNew: (fileName: string, newTitle: string, viewMode: MindmapViewMode) => Promise<void>;
  onDiscardAndCreateNew: (newTitle: string, viewMode: MindmapViewMode) => void;
}

export const NewMindmapModal: React.FC<NewMindmapModalProps> = ({
  isOpen,
  currentTitle,
  isLoggedIn,
  onClose,
  onSaveToCloudAndCreateNew,
  onDiscardAndCreateNew,
}) => {
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<MindmapViewMode>('node');
  const [newTitle, setNewTitle] = useState('Dự Án Mới');
  const [saveName, setSaveName] = useState(currentTitle || 'My Mindmap');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleModeChange = (mode: MindmapViewMode) => {
    setSelectedMode(mode);
    if (newTitle === 'Dự Án Mới' || newTitle === 'Quy Trình Dự Án' || newTitle === 'My Mindmap') {
      setNewTitle(mode === 'flowchart' ? 'Quy Trình Triển Khai' : 'Dự Án Mới');
    }
  };

  const handleSaveAndNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const finalTitle = newTitle.trim() || (selectedMode === 'flowchart' ? 'Quy Trình Triển Khai' : 'Dự Án Mới');
      await onSaveToCloudAndCreateNew(saveName.trim(), finalTitle, selectedMode);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndCreate = () => {
    const finalTitle = newTitle.trim() || (selectedMode === 'flowchart' ? 'Quy Trình Triển Khai' : 'Dự Án Mới');
    onDiscardAndCreateNew(finalTitle, selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        id="new-mindmap-confirm-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <FilePlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
                {t('newMindmapConfirmTitle')}
              </h3>
              <p className="text-[11px] text-slate-500">{t('newMindmapSubtitle')}</p>
            </div>
          </div>
          <button
            id="btn-close-new-mindmap-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Choose View Mode / Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t('selectViewMode')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option: Node View */}
              <div
                id="select-mode-node-view"
                onClick={() => handleModeChange('node')}
                className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'node'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        selectedMode === 'node'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">{t('nodeView')}</span>
                  </div>
                  {selectedMode === 'node' && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                  {t('nodeViewDesc')}
                </p>
                {/* Mini graphical preview */}
                <div className="h-8 w-full bg-white/80 rounded-md border border-slate-200/60 flex items-center justify-center gap-2 px-2 pointer-events-none">
                  <div className="w-4 h-4 rounded-full bg-blue-600" />
                  <div className="w-2.5 h-[1.5px] bg-slate-300" />
                  <div className="flex flex-col gap-1">
                    <div className="w-6 h-2 rounded-xs bg-blue-100 border border-blue-300" />
                    <div className="w-6 h-2 rounded-xs bg-indigo-100 border border-indigo-300" />
                  </div>
                </div>
              </div>

              {/* Option: Flow Chart */}
              <div
                id="select-mode-flowchart-view"
                onClick={() => handleModeChange('flowchart')}
                className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedMode === 'flowchart'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        selectedMode === 'flowchart'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Workflow className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">{t('flowchartView')}</span>
                  </div>
                  {selectedMode === 'flowchart' && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                  {t('flowchartViewDesc')}
                </p>
                {/* Mini graphical preview */}
                <div className="h-8 w-full bg-white/80 rounded-md border border-slate-200/60 flex items-center justify-between px-2 gap-1 pointer-events-none">
                  <div className="flex-1 h-5 rounded-xs bg-blue-50 border border-blue-200 flex flex-col justify-center px-1">
                    <div className="w-3 h-1 bg-blue-400 rounded-2xs" />
                  </div>
                  <span className="text-[10px] text-slate-400">→</span>
                  <div className="flex-1 h-5 rounded-xs bg-indigo-50 border border-indigo-200 flex flex-col justify-center px-1">
                    <div className="w-3 h-1 bg-indigo-400 rounded-2xs" />
                  </div>
                  <span className="text-[10px] text-slate-400">→</span>
                  <div className="flex-1 h-5 rounded-xs bg-emerald-50 border border-emerald-200 flex flex-col justify-center px-1">
                    <div className="w-3 h-1 bg-emerald-400 rounded-2xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: New Mindmap Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('newMindmapTitleLabel')}
            </label>
            <input
              id="input-new-mindmap-custom-title"
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder={t('newMindmapNamePlaceholder')}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Section 3: Cloud Save Alert Notice */}
          <div className="flex items-start gap-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-800 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 mb-0.5">{t('newMindmapCloudNoticeTitle')}</p>
              <p>{t('newMindmapCloudNoticeDesc')}</p>
            </div>
          </div>

          {/* Option: Save current map to Cloud first, then create new */}
          <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  {t('newMindmapSaveOption')}
                </span>
              </div>
              {!isLoggedIn && (
                <span className="text-[10px] text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-full font-medium">
                  {t('googleAuthRequiredShort')}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveAndNew} className="space-y-2.5">
              <div className="relative">
                <input
                  id="input-new-mindmap-save-name"
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  disabled={isSaving}
                  placeholder="Tên sơ đồ hiện tại cần lưu..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-28"
                />
                <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400 font-mono pointer-events-none">
                  .mindmap.json
                </span>
              </div>

              <button
                id="btn-save-cloud-and-create-new"
                type="submit"
                disabled={isSaving || !saveName.trim()}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('driveSaving')}</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{t('newMindmapSaveAndCreateBtn')}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer (Discard & Cancel actions) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-t border-slate-100">
          <button
            id="btn-discard-and-create-new"
            type="button"
            onClick={handleDiscardAndCreate}
            disabled={isSaving}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {t('newMindmapDiscardAndCreateBtn')}
          </button>

          <button
            id="btn-cancel-new-mindmap"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t('cancelBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};

