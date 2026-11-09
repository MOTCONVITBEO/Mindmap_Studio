import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Copy, Sparkles, BookOpen } from 'lucide-react';
import { translations, Language } from '../i18n/translations';

interface SourceTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceText: string;
  onSaveSourceText: (text: string) => void;
  language: Language;
}

export const SourceTextModal: React.FC<SourceTextModalProps> = ({
  isOpen,
  onClose,
  sourceText,
  onSaveSourceText,
  language,
}) => {
  const t = translations[language];
  const [text, setText] = useState(sourceText || '');
  const [copied, setCopied] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setText(sourceText || '');
  }, [sourceText, isOpen]);

  if (!isOpen) return null;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveSourceText(text);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 800);
  };

  return (
    <div
      id="source-text-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="source-text-modal-card"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {t.aiSourceTextModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.aiSourceTextModalDesc}
              </p>
            </div>
          </div>
          <button
            id="btn-close-source-text-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex gap-4">
              <span>{t.wordCountLabel} <strong className="text-slate-700 dark:text-slate-200 font-semibold">{wordCount}</strong></span>
              <span>{t.charCountLabel} <strong className="text-slate-700 dark:text-slate-200 font-semibold">{charCount}</strong></span>
            </div>
            {text.trim().length > 0 && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép văn bản'}
              </button>
            )}
          </div>

          <textarea
            id="source-text-editor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.textInputPlaceholder}
            rows={12}
            className="w-full p-4 text-sm font-sans rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none leading-relaxed"
          />

          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
            <span>
              {language === 'vi'
                ? 'AI Co-pilot sẽ dùng văn bản này làm nguồn sự thật (Grounding Context) để trả lời, phân tích hoặc bổ sung các node con khi bạn yêu cầu.'
                : 'AI Co-pilot uses this source text as grounding context to answer questions, analyze concepts, or add missing sub-branches.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            {t.cancelBtn}
          </button>
          
          <button
            id="btn-save-source-text"
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
          >
            {savedToast ? (
              <>
                <Check className="w-4 h-4" />
                {t.aiSaveSourceTextSuccess}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                {t.saveAndClose}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
