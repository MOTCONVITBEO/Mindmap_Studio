import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Undo2,
  Trash2,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Focus,
  Layers,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { MindmapGraph } from '../models/MindmapGraph';
import { AIChatMessage } from '../types/mindmap';
import { AIMindmapService } from '../services/aiMindmapService';
import { translations, Language } from '../i18n/translations';

interface AICoPilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graph: MindmapGraph;
  selectedNodeId?: string | null;
  onGraphUpdated: () => void;
  onUndoLastAIAction?: () => void;
  canUndo?: boolean;
  onOpenSourceTextModal: () => void;
  language: Language;
}

export const AICoPilotDrawer: React.FC<AICoPilotDrawerProps> = ({
  isOpen,
  onClose,
  graph,
  selectedNodeId,
  onGraphUpdated,
  onUndoLastAIAction,
  canUndo = false,
  onOpenSourceTextModal,
  language,
}) => {
  const t = translations[language];
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync messages from graph on open or change
  useEffect(() => {
    if (isOpen) {
      setMessages(graph.getAiHistory());
    }
  }, [isOpen, graph]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const sourceText = graph.getSourceText();
  const sourceWordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0;
  const selectedNode = selectedNodeId ? graph.getNode(selectedNodeId) : null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || prompt).trim();
    if (!textToSend || isLoading) return;

    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    // Append to local state and graph
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    graph.addAiHistoryMessage(userMsg);
    setPrompt('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const historyForApi = updatedMessages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const result = await AIMindmapService.refineMindmap({
        prompt: textToSend,
        graph,
        selectedNodeId: selectedNodeId || undefined,
        conversationHistory: historyForApi,
      });

      let appliedSummary: string | undefined = undefined;

      // Apply graph actions if any
      if (result.actions && result.actions.length > 0) {
        const { modifiedCount, summary } = graph.applyAIGraphActions(result.actions);
        if (modifiedCount > 0) {
          appliedSummary = summary.join(' • ') || result.summaryOfChanges || `Đã cập nhật ${modifiedCount} node`;
          onGraphUpdated();
        }
      }

      const assistantMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: result.answer || 'Đã hoàn tất xử lý yêu cầu của bạn.',
        timestamp: new Date().toISOString(),
        appliedChangesSummary: appliedSummary,
        actions: result.actions,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      graph.addAiHistoryMessage(assistantMsg);
    } catch (error: any) {
      console.error('AI refinement error:', error);
      const errorMsg: AIChatMessage = {
        id: `ai_err_${Date.now()}`,
        role: 'assistant',
        text: `⚠️ ${language === 'vi' ? 'Lỗi kết nối AI' : 'AI Error'}: ${error.message || 'Không thể xử lý yêu cầu.'}`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);
      graph.addAiHistoryMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm(t.aiClearChatConfirm)) {
      graph.clearAiHistory();
      setMessages([]);
    }
  };

  const suggestions = [
    t.aiSuggestion1,
    t.aiSuggestion2,
    t.aiSuggestion3,
    t.aiSuggestion4,
    t.aiSuggestion5,
  ];

  return (
    <div
      id="ai-copilot-drawer-container"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] md:w-[500px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 animate-slide-left"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-xl shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {t.aiCopilotTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {t.aiCopilotSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              title={t.aiClearChat}
              className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            id="btn-close-ai-copilot"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Context Badge Bar */}
      <div className="px-5 py-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100/70 dark:border-indigo-900/30 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 truncate">
          {selectedNode ? (
            <>
              <Focus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400">{t.aiSelectedNode}</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-200 truncate max-w-[150px]">
                "{selectedNode.title}"
              </span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400">{t.aiSelectedNode}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t.aiAllMindmap}</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenSourceTextModal}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0 transition shadow-2xs"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {sourceWordCount > 0
            ? t.aiSourceTextAvailable.replace('{words}', String(sourceWordCount))
            : t.aiSourceTextEmpty}
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4 pt-2">
            {/* Welcome Greeting */}
            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 text-left">
              <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                {t.aiCopilotWelcomeTitle}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.aiCopilotWelcomeDesc}
              </p>
            </div>

            {/* Quick Suggestion Chips */}
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                {language === 'vi' ? 'Gợi ý câu lệnh nhanh' : 'Quick Prompt Suggestions'}
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(sug)}
                    className="text-left text-xs font-medium px-3.5 py-2.5 rounded-xl bg-slate-100/70 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition flex items-center justify-between group"
                  >
                    <span>{sug}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/10'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/70 dark:border-slate-700/70'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* If AI performed graph changes, show a nice structured summary */}
                {msg.appliedChangesSummary && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{t.aiChangesApplied}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 font-normal pl-5">
                      {msg.appliedChangesSummary}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>{t.aiProcessing}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Undo Banner if available */}
      {canUndo && onUndoLastAIAction && (
        <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <span>{language === 'vi' ? 'Vừa có thay đổi sơ đồ' : 'Mindmap updated'}</span>
          <button
            type="button"
            onClick={onUndoLastAIAction}
            className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 hover:underline hover:text-amber-900 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            {t.aiUndoChanges}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition"
        >
          <textarea
            ref={textareaRef}
            id="ai-prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.aiPromptPlaceholder}
            rows={2}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none px-2 py-1 max-h-32 min-h-[44px]"
          />
          <button
            id="btn-send-ai-prompt"
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 transition-all active:scale-95 shrink-0 flex items-center justify-center shadow-md shadow-indigo-600/20 disabled:shadow-none"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span>Enter để gửi • Shift+Enter để xuống dòng</span>
          <button
            type="button"
            onClick={onOpenSourceTextModal}
            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" />
            {t.aiEditSourceText}
          </button>
        </div>
      </div>
    </div>
  );
};
