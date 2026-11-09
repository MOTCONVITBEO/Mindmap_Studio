import React, { useState } from 'react';
import { X, CloudUpload, CheckCircle2, Loader2, HardDrive } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface DriveSaveModalProps {
  isOpen: boolean;
  currentTitle: string;
  existingFileId?: string;
  isSaving: boolean;
  onSave: (fileName: string, asNew: boolean) => Promise<void>;
  onClose: () => void;
}

export const DriveSaveModal: React.FC<DriveSaveModalProps> = ({
  isOpen,
  currentTitle,
  existingFileId,
  isSaving,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(currentTitle || 'My Mindmap');
  const [saveAsNew, setSaveAsNew] = useState(!existingFileId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;
    await onSave(name.trim(), saveAsNew);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        id="drive-save-modal"
        className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CloudUpload className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-base">{t('driveSaveModalTitle')}</h3>
          </div>
          <button
            id="btn-close-save-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {t('driveSaveNameLabel')}
            </label>
            <div className="relative">
              <input
                id="input-drive-filename"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                placeholder="Tên mindmap..."
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                .mindmap.json
              </span>
            </div>
          </div>

          {existingFileId && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 text-xs text-amber-800 space-y-2">
              <p className="font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                Sơ đồ này đã được liên kết với một file trên Google Drive.
              </p>
              <div className="space-y-1 pl-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveMode"
                    checked={!saveAsNew}
                    onChange={() => setSaveAsNew(false)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ghi đè lên file cũ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="saveMode"
                    checked={saveAsNew}
                    onChange={() => setSaveAsNew(true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Lưu thành bản sao mới (file mới)</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              id="btn-cancel-save-drive"
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              id="btn-submit-save-drive"
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('driveSaving')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('driveSaveBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
