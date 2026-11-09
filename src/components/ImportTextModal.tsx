import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  RotateCcw,
  Zap,
  BookOpen,
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { AIMindmapService, AIMindmapOptions } from '../services/aiMindmapService';

interface ImportTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (
    text: string,
    options: {
      mode: 'new_mindmap' | 'append_to_selected';
      detailLevel: 'concise' | 'balanced' | 'detailed';
      onProgress: AIMindmapOptions['onProgress'];
    }
  ) => Promise<void>;
  selectedNodeTitle?: string;
  hasSelectedNode: boolean;
}

const SAMPLE_TEXT_VI = `# Kế hoạch Xây dựng Hệ thống Thương mại Điện tử Đa kênh

1. Phân hệ Khách hàng (Customer Experience)
- Giao diện Web App tối ưu di động và ứng dụng Mobile iOS/Android.
- Tính năng tìm kiếm thông minh với bộ lọc đa tiêu chí (giá, thương hiệu, đánh giá).
- Giỏ hàng linh hoạt, lưu trữ giỏ hàng bỏ quên và gợi ý sản phẩm liên quan.
- Tích hợp cổng thanh toán đa dạng: Thẻ tín dụng quốc tế, VNPay, MoMo, ZaloPay và COD.

2. Phân hệ Quản trị & Vận hành (Admin & Operations)
- Quản lý danh mục hàng hóa, quản lý kho thời gian thực với cảnh báo tồn kho tối thiểu.
- Xử lý đơn hàng tự động: Đồng bộ trạng thái đơn với đối tác vận chuyển (GHTK, GHN, ViettelPost).
- Báo cáo doanh thu thời gian thực, phân tích chân dung khách hàng và hiệu suất sản phẩm.

3. Hạ tầng Kỹ thuật & Bảo mật (Infrastructure & Security)
- Hệ thống Cloud chạy trên Google Cloud Platform với khả năng tự động co giãn (Auto-scaling).
- Cơ sở dữ liệu phân tán PostgreSQL kết hợp Redis Cache tăng tốc độ phản hồi.
- Bảo mật xác thực 2 lớp (2FA), mã hóa dữ liệu đầu cuối và tuân thủ chứng chỉ bảo mật PCI-DSS.

4. Chiến lược Marketing & Chăm sóc khách hàng
- Hệ thống tích điểm thành viên (Loyalty program), voucher khuyến mãi theo phân khúc.
- Chatbot AI hỗ trợ giải đáp 24/7 và chuyển tiếp tư vấn viên khi có yêu cầu phức tạp.
- Email marketing tự động chăm sóc sau mua và khảo sát độ hài lòng (CSAT).`;

const SAMPLE_TEXT_EN = `# Comprehensive AI Product Launch Strategy

1. Core Architecture & Model Integration
- Multi-modal LLM reasoning engine with real-time response streaming.
- Vector database integration for semantic knowledge search and retrieval augmented generation (RAG).
- Serverless API layer with rate limiting, telemetry monitoring, and fallback routing.

2. User Experience & Design System
- Adaptive responsive layout with accessible contrast and dark/light theme switching.
- Interactive canvas workspace with drag-and-drop hierarchy reorganization.
- Real-time collaborative workspace synchronization across team members.

3. Marketing & Go-To-Market
- Developer documentation with interactive playground examples and quickstart guides.
- Tiered subscription model with self-serve billing and usage-based analytics.
- Community Discord and GitHub open-source showcase projects.

4. Compliance & Enterprise Security
- End-to-end data encryption at rest and in transit (AES-256 / TLS 1.3).
- Role-based access control (RBAC) with Google Workspace Single Sign-On (SSO).
- Automated backup routines with point-in-time recovery and 99.99% SLA uptime.`;

export const ImportTextModal: React.FC<ImportTextModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  selectedNodeTitle,
  hasSelectedNode,
}) => {
  const { t, language } = useTranslation();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'new_mindmap' | 'append_to_selected'>('new_mindmap');
  const [detailLevel, setDetailLevel] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState<{
    stage: string;
    currentChunk: number;
    totalChunks: number;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wordCount = useMemo(() => AIMindmapService.countWords(text), [text]);
  const charCount = text.length;

  const chunksCount = useMemo(() => {
    return AIMindmapService.splitTextIntoChunks(text, 3500).length;
  }, [text]);

  if (!isOpen) return null;

  const handleUseSample = () => {
    setText(language === 'vi' ? SAMPLE_TEXT_VI : SAMPLE_TEXT_EN);
    setErrorMessage(null);
  };

  const handleClear = () => {
    setText('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMessage(t('emptyTextWarning'));
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressState({
      stage: 'chunking',
      currentChunk: 0,
      totalChunks: chunksCount,
      message: t('aiProgressChunking', { count: chunksCount }),
    });

    try {
      await onGenerate(text, {
        mode,
        detailLevel,
        onProgress: progress => {
          let translatedMessage = '';
          if (progress.messageKey === 'aiProgressChunking') {
            translatedMessage = t('aiProgressChunking', { count: progress.totalChunks });
          } else if (progress.messageKey === 'aiProgressProcessing') {
            translatedMessage = t('aiProgressProcessing', {
              current: progress.currentChunk,
              total: progress.totalChunks,
            });
          } else if (progress.messageKey === 'aiProgressAssembling') {
            translatedMessage = t('aiProgressAssembling');
          } else if (progress.messageKey === 'aiProgressCompleted') {
            translatedMessage = t('aiProgressCompleted');
          }

          setProgressState({
            stage: progress.stage,
            currentChunk: progress.currentChunk,
            totalChunks: progress.totalChunks,
            message: translatedMessage,
          });
        },
      });

      onClose();
    } catch (err: any) {
      console.error('Error generating mindmap from text:', err);
      setErrorMessage(t('importTextError', { error: err.message || 'Unknown error' }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="import-text-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={isProcessing ? undefined : onClose}
    >
      <div
        id="import-text-modal-container"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl transition-all dark:bg-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          id="import-text-header"
          className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t('importTextModalTitle')}
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('importTextModalSubtitle')}
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              id="btn-close-import-text-modal"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-6 py-5 space-y-4">
          {/* Action Toolbar above textarea */}
          <div className="flex items-center justify-between">
            <label
              htmlFor="textarea-import-text"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>{t('textInputLabel')}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-sample-text"
                onClick={handleUseSample}
                disabled={isProcessing}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>{t('sampleTextBtn')}</span>
              </button>
              {text && (
                <button
                  type="button"
                  id="btn-clear-text"
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{t('clearTextBtn')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              id="textarea-import-text"
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={isProcessing}
              placeholder={t('textInputPlaceholder')}
              rows={9}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:bg-slate-900"
            />
            {/* Stats pill at bottom right of textarea */}
            <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-xs backdrop-blur-xs dark:bg-slate-800/90 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
              <span>
                {t('wordCountLabel')}{' '}
                <b className="text-slate-800 dark:text-slate-200">{wordCount.toLocaleString()}</b>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>
                {t('charCountLabel')}{' '}
                <b className="text-slate-800 dark:text-slate-200">{charCount.toLocaleString()}</b>
              </span>
            </div>
          </div>

          {/* Large text notice banner if word count > 4000 or multiple chunks */}
          {chunksCount > 1 && (
            <div
              id="large-text-chunk-notice"
              className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
            >
              <Zap className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">{t('largeTextNotice', { chunks: chunksCount })}</p>
              </div>
            </div>
          )}

          {/* Mode & Configuration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Generation Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('modeLabel')}
              </label>
              <div className="space-y-1.5">
                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-all ${
                    mode === 'new_mindmap'
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="gen-mode"
                    value="new_mindmap"
                    checked={mode === 'new_mindmap'}
                    onChange={() => setMode('new_mindmap')}
                    disabled={isProcessing}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{t('modeNewMindmap')}</span>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-all ${
                    mode === 'append_to_selected'
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-medium dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="gen-mode"
                    value="append_to_selected"
                    checked={mode === 'append_to_selected'}
                    onChange={() => setMode('append_to_selected')}
                    disabled={isProcessing}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">
                    {hasSelectedNode && selectedNodeTitle
                      ? t('modeAppendSelected', { title: selectedNodeTitle })
                      : t('modeAppendNoSelection')}
                  </span>
                </label>
              </div>
            </div>

            {/* Detail Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('detailLevelLabel')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailLevel('concise')}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                    detailLevel === 'concise'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold shadow-xs dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs">{t('detailConcise')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailLevel('balanced')}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                    detailLevel === 'balanced'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold shadow-xs dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs">{t('detailBalanced')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailLevel('detailed')}
                  disabled={isProcessing}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                    detailLevel === 'detailed'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-semibold shadow-xs dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xs">{t('detailInDepth')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Progress Visualizer during processing */}
          {isProcessing && progressState && (
            <div
              id="ai-generation-progress"
              className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 p-4 dark:border-indigo-900/40 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
                  <span>{progressState.message}</span>
                </div>
                {progressState.totalChunks > 1 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {progressState.currentChunk}/{progressState.totalChunks}
                  </span>
                )}
              </div>
              {/* Progress bar line */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/60 dark:bg-indigo-900/40">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                  style={{
                    width: `${
                      progressState.totalChunks > 0
                        ? Math.max(15, (progressState.currentChunk / progressState.totalChunks) * 100)
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div
              id="import-text-error-banner"
              className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="btn-cancel-import-text"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('cancelBtn')}
            </button>

            <button
              type="submit"
              id="btn-submit-import-text"
              disabled={isProcessing || !text.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:shadow-none"
            >
              {isProcessing ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t('generatingBtn')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('generateBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
