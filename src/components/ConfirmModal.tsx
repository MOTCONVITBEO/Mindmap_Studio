import React from 'react';
import { AlertTriangle, X, FolderTree, Trash2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // Node deletion with children choice options
  hasChildrenOptions?: boolean;
  keepChildrenLabel?: string;
  deleteAllLabel?: string;
  onConfirmKeepChildren?: () => void;
  onConfirmDeleteAll?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  isDestructive = false,
  onConfirm,
  onCancel,
  hasChildrenOptions = false,
  keepChildrenLabel = 'Giữ lại các nhánh con',
  deleteAllLabel = 'Xóa tất cả (Cả nhánh con)',
  onConfirmKeepChildren,
  onConfirmDeleteAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="confirm-dialog-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            {isDestructive ? (
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
            )}
            <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
          </div>
          <button
            id="btn-close-confirm"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-sm text-slate-600 leading-relaxed space-y-3">
          <p className="whitespace-pre-line">{message}</p>
          {hasChildrenOptions && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
              <FolderTree className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Lưu ý:</strong> Bạn có thể chọn <em>Giữ lại các nhánh con</em> (chúng sẽ được tự động nối vào node cha cấp trên) hoặc <em>Xóa toàn bộ cây con</em> bên dưới.
              </span>
            </div>
          )}
        </div>

        {hasChildrenOptions ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-5 py-4 bg-slate-50 border-t border-slate-100">
            <button
              id="btn-cancel-confirm-children"
              type="button"
              onClick={onCancel}
              className="order-3 sm:order-1 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-center cursor-pointer shadow-2xs"
            >
              {cancelLabel}
            </button>
            <button
              id="btn-confirm-delete-keep-children"
              type="button"
              onClick={onConfirmKeepChildren || onConfirm}
              className="order-1 sm:order-2 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FolderTree className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{keepChildrenLabel}</span>
            </button>
            <button
              id="btn-confirm-delete-all-subtree"
              type="button"
              onClick={onConfirmDeleteAll || onConfirm}
              className="order-2 sm:order-3 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/20 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>{deleteAllLabel}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
            <button
              id="btn-cancel-confirm"
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              id="btn-accept-confirm"
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors cursor-pointer ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 shadow-sm'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
