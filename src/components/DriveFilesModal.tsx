import React, { useEffect, useState } from 'react';
import { X, FolderOpen, Trash2, Clock, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { DriveFileItem } from '../types/mindmap';
import { GoogleDriveService } from '../services/googleDrive';
import { useTranslation } from '../i18n/LanguageContext';

interface DriveFilesModalProps {
  isOpen: boolean;
  onSelectFile: (fileId: string, fileName: string) => Promise<void>;
  onClose: () => void;
  onRequestConfirmDelete: (file: DriveFileItem) => void;
}

export const DriveFilesModal: React.FC<DriveFilesModalProps> = ({
  isOpen,
  onSelectFile,
  onClose,
  onRequestConfirmDelete,
}) => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await GoogleDriveService.listFiles();
      setFiles(list);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách file từ Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpen = async (file: DriveFileItem) => {
    setOpeningId(file.id);
    try {
      await onSelectFile(file.id, file.name);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        id="drive-files-modal"
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-base">{t('driveModalTitle')}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="btn-refresh-drive-files"
              onClick={fetchFiles}
              disabled={isLoading}
              title="Làm mới"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="btn-close-files-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
          {isLoading && files.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-sm">{t('driveModalLoading')}</p>
            </div>
          ) : error ? (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-800 mb-1">Lỗi tải danh sách</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                id="btn-retry-fetch-files"
                onClick={fetchFiles}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto stroke-1 text-slate-300 mb-2" />
              <p className="text-sm">{t('driveModalEmpty')}</p>
            </div>
          ) : (
            files.map(file => {
              const displayName = file.name.replace('.mindmap.json', '');
              const formattedDate = new Date(file.modifiedTime).toLocaleString();
              const isOpening = openingId === file.id;

              return (
                <div
                  key={file.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 rounded-lg group transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-800 truncate" title={file.name}>
                        {displayName}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{t('driveModalUpdated')} {formattedDate}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id={`btn-open-file-${file.id}`}
                      onClick={() => handleOpen(file)}
                      disabled={isOpening}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isOpening ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5" />
                      )}
                      <span>{t('driveModalSelect')}</span>
                    </button>
                    <button
                      id={`btn-delete-file-${file.id}`}
                      onClick={() => onRequestConfirmDelete(file)}
                      title="Xóa file khỏi Google Drive"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            id="btn-dismiss-files-modal"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
