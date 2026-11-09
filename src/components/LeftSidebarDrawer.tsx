import React from 'react';
import {
  X,
  Sparkles,
  FileText,
  PlusCircle,
  Plus,
  HardDrive,
  FolderOpen,
  LayoutGrid,
  Palette,
  Download,
  Upload,
  Globe,
  Info,
  Clock,
  Network,
  Layers,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Scan,
  LogIn,
  LogOut,
  User as UserIcon,
  Image as ImageIcon,
  FileType,
  FileCode,
  BrainCircuit,
  Workflow,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';
import { MindmapGraph } from '../models/MindmapGraph';
import { User } from 'firebase/auth';

interface LeftSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  graph: MindmapGraph;
  user: User | null;
  onOpenImportText: () => void;
  onOpenAICopilot: () => void;
  onOpenSourceText: () => void;
  onNewMindmap: () => void;
  onAddRootChild: () => void;
  onSaveToDrive: () => void;
  onLoadFromDrive: () => void;
  onAutoLayout: () => void;
  onAutoUpdateChildColors: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onExportTxt: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCenterView: () => void;
  onFitScreen: () => void;
  viewMode?: import('../types/mindmap').MindmapViewMode;
  onViewModeChange?: (mode: import('../types/mindmap').MindmapViewMode) => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  isGoogleLoading: boolean;
  onToggleLanguage: () => void;
  currentLang: string;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const LeftSidebarDrawer: React.FC<LeftSidebarDrawerProps> = ({
  isOpen,
  onClose,
  graph,
  user,
  onOpenImportText,
  onOpenAICopilot,
  onOpenSourceText,
  onNewMindmap,
  onAddRootChild,
  onSaveToDrive,
  onLoadFromDrive,
  onAutoLayout,
  onAutoUpdateChildColors,
  onExportJson,
  onImportJson,
  onExportPng,
  onExportPdf,
  onExportTxt,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onCenterView,
  onFitScreen,
  viewMode = 'node',
  onViewModeChange,
  onGoogleSignIn,
  onGoogleSignOut,
  isGoogleLoading,
  onToggleLanguage,
  currentLang,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const totalNodes = graph.getAllNodes().length;
  const totalRelations = graph.getAllRelations().length;
  const lastUpdated = graph.meta.updatedAt
    ? new Date(graph.meta.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div
      id="left-sidebar-drawer-overlay"
      className="fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        id="left-sidebar-drawer-panel"
        className="relative flex h-full w-full max-w-xs sm:max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-slate-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          id="sidebar-header"
          className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t('appTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('sidebarMenuTitle')}
              </p>
            </div>
          </div>
          <button
            id="btn-close-sidebar"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* AI Features Section */}
          <div id="section-ai-features" className="space-y-2.5">
            {/* AI Co-pilot Card */}
            <button
              id="btn-open-ai-copilot-drawer"
              onClick={() => {
                onClose();
                onOpenAICopilot();
              }}
              className="group relative w-full overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50/70 to-pink-50 p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-indigo-900/50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('aiCopilotTitle')}
                    </span>
                    <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Chat AI
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {t('aiCopilotSubtitle')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 self-center text-indigo-500 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* Import from Text (AI) */}
            <button
              id="btn-open-text-to-mindmap"
              onClick={() => {
                onClose();
                onOpenImportText();
              }}
              className="group relative w-full overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-purple-50 p-3.5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-blue-900/50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/20"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('importFromText')}
                    </span>
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      Import
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-1">
                    {t('importFromTextDesc')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 self-center text-blue-500 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>

          {/* Quick Actions List (Sơ đồ & Cây) */}
          <div id="section-quick-actions" className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t('quickActions')}
            </span>
            <div className="grid gap-1 pt-1">
              {/* Undo & Redo Quick Actions */}
              <div className="grid grid-cols-2 gap-1.5 mb-1">
                <button
                  id="btn-sidebar-undo"
                  type="button"
                  disabled={!canUndo}
                  onClick={() => {
                    onClose();
                    onUndo?.();
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                    canUndo
                      ? 'bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 cursor-pointer shadow-2xs'
                      : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-50'
                  }`}
                  title={`${t('undoBtn')} (Ctrl+Z)`}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>{t('undoBtn')}</span>
                </button>
                <button
                  id="btn-sidebar-redo"
                  type="button"
                  disabled={!canRedo}
                  onClick={() => {
                    onClose();
                    onRedo?.();
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                    canRedo
                      ? 'bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 cursor-pointer shadow-2xs'
                      : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-50'
                  }`}
                  title={`${t('redoBtn')} (Ctrl+Y)`}
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  <span>{t('redoBtn')}</span>
                </button>
              </div>

              <button
                id="btn-sidebar-add-node"
                onClick={() => {
                  onClose();
                  onAddRootChild();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>{t('addChildNodeMenu')}</span>
              </button>

              <button
                id="btn-sidebar-new-mindmap"
                onClick={() => {
                  onClose();
                  onNewMindmap();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('newMindmap')}</span>
              </button>

              <button
                id="btn-sidebar-autolayout"
                onClick={() => {
                  onClose();
                  onAutoLayout();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LayoutGrid className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>{t('autoLayout')}</span>
              </button>

              <button
                id="btn-sidebar-auto-update-child-colors"
                onClick={() => {
                  onClose();
                  onAutoUpdateChildColors();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Palette className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                <span>{t('autoUpdateChildColors')}</span>
              </button>
            </div>
          </div>

          {/* Storage & Data */}
          <div id="section-storage-actions" className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t('storageAndData')}
            </span>
            <div className="grid gap-1 pt-1">
              <button
                id="btn-sidebar-save-drive"
                onClick={() => {
                  onClose();
                  onSaveToDrive();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>{t('saveToDrive')}</span>
              </button>

              <button
                id="btn-sidebar-load-drive"
                onClick={() => {
                  onClose();
                  onLoadFromDrive();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>{t('loadFromDrive')}</span>
              </button>

              <button
                id="btn-sidebar-view-source-text"
                onClick={() => {
                  onClose();
                  onOpenSourceText();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{t('aiViewSourceText')}</span>
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  id="btn-sidebar-export-json"
                  onClick={() => {
                    onClose();
                    onExportJson();
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('exportJson')}</span>
                </button>
                <button
                  id="btn-sidebar-import-json"
                  onClick={() => {
                    onClose();
                    onImportJson();
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t('importJson')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Export Formats (Image, PDF, TXT Node Tree) */}
          <div id="section-export-formats" className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t('exportSectionTitle')}
            </span>
            <div className="grid gap-1.5 pt-1">
              {/* Export PNG Image */}
              <button
                id="btn-sidebar-export-png"
                onClick={() => {
                  onClose();
                  onExportPng();
                }}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-blue-900/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-blue-950/60 dark:text-blue-400">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('exportPng')}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {t('exportPngDesc')}
                    </div>
                  </div>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
              </button>

              {/* Export PDF Document */}
              <button
                id="btn-sidebar-export-pdf"
                onClick={() => {
                  onClose();
                  onExportPdf();
                }}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-rose-200 hover:bg-rose-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-rose-900/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors dark:bg-rose-950/60 dark:text-rose-400">
                    <FileType className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('exportPdf')}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {t('exportPdfDesc')}
                    </div>
                  </div>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-rose-600 transition-colors shrink-0 ml-2" />
              </button>

              {/* Export TXT Node Tree */}
              <button
                id="btn-sidebar-export-txt"
                onClick={() => {
                  onClose();
                  onExportTxt();
                }}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-emerald-900/50 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors dark:bg-emerald-950/60 dark:text-emerald-400">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t('exportTxt')}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {t('exportTxtDesc')}
                    </div>
                  </div>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* View & Canvas Zoom Controls */}
          <div id="section-view-controls" className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {t('viewMode')}
            </span>

            {/* View Mode Switcher */}
            {onViewModeChange && (
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange('node');
                    onClose();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'node'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold dark:bg-slate-700 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>{t('nodeView')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onViewModeChange('flowchart');
                    onClose();
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'flowchart'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold dark:bg-slate-700 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span>{t('flowchartView')}</span>
                </button>
              </div>
            )}

            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block pt-1">
              {t('viewControls')}
            </span>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-800 dark:bg-slate-800/60">
              <button
                id="btn-sidebar-fit-screen"
                onClick={() => {
                  onClose();
                  onFitScreen();
                }}
                title={t('fitScreen')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-white rounded-lg transition-colors dark:text-blue-400 dark:bg-slate-700"
              >
                <Scan className="h-3.5 w-3.5" />
                <span>Fit</span>
              </button>
              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <button
                id="btn-sidebar-zoom-out"
                onClick={onZoomOut}
                title={t('zoomOut')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                id="btn-sidebar-reset-zoom"
                onClick={onResetZoom}
                title={t('resetZoom')}
                className="px-2 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-white rounded-md transition-colors dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                id="btn-sidebar-zoom-in"
                onClick={onZoomIn}
                title={t('zoomIn')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                id="btn-sidebar-center-view"
                onClick={() => {
                  onClose();
                  onCenterView();
                }}
                title={t('centerView')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Current Mindmap Statistics Info Card */}
          <div
            id="section-map-stats"
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Info className="h-4 w-4 text-blue-500" />
              <span>{t('currentMindmapInfo')}</span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-900 line-clamp-1 dark:text-white">
              {graph.meta.title || 'Mindmap'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
                <span>
                  {t('totalNodesCount')}: <b className="text-slate-800 dark:text-slate-200">{totalNodes}</b>
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                <Network className="h-3.5 w-3.5 text-purple-500" />
                <span>
                  {t('crossLinksCount')}: <b className="text-slate-800 dark:text-slate-200">{totalRelations}</b>
                </span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="h-3 w-3" />
              <span>
                {t('lastSaved')}: {lastUpdated}
              </span>
            </div>
          </div>
        </div>

        {/* Footer: Language Switcher & Account */}
        <div
          id="sidebar-footer"
          className="flex flex-col gap-2.5 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
        >
          {/* Google Auth Row */}
          {user ? (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/80 p-2 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
              <div className="flex items-center gap-2 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                    {user.email ? user.email[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    {user.displayName || 'User'}
                  </p>
                  <p className="truncate text-[10px] text-emerald-600 dark:text-emerald-400">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                id="btn-sidebar-signout"
                onClick={() => {
                  onClose();
                  onGoogleSignOut();
                }}
                title={t('signOut')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 hover:text-red-600 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-sidebar-signin"
              onClick={() => {
                onClose();
                onGoogleSignIn();
              }}
              disabled={isGoogleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-98 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 10.02 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{t('signInGoogle')}</span>
            </button>
          )}

          {/* Language Switcher */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">Ngôn ngữ / Language:</span>
            <button
              id="btn-sidebar-toggle-lang"
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 rounded-lg bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>{currentLang === 'vi' ? 'Tiếng Việt (VI)' : 'English (EN)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

