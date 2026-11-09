import React from 'react';
import {
  BrainCircuit,
  Workflow,
  ZoomIn,
  ZoomOut,
  Maximize,
  Scan,
  LogOut,
  Undo2,
  Redo2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useTranslation } from '../i18n/LanguageContext';
import { MindmapViewMode } from '../types/mindmap';

interface NavbarProps {
  mapTitle: string;
  onUpdateMapTitle: (title: string) => void;
  onOpenSidebarMenu: () => void;
  onOpenAICopilot?: () => void;
  viewMode: MindmapViewMode;
  onViewModeChange: (mode: MindmapViewMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCenterView: () => void;
  onFitScreen: () => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  isGoogleLoading: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mapTitle,
  onUpdateMapTitle,
  onOpenSidebarMenu,
  onOpenAICopilot,
  viewMode,
  onViewModeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onCenterView,
  onFitScreen,
  user,
  onGoogleSignIn,
  onGoogleSignOut,
  isGoogleLoading,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const { t } = useTranslation();

  return (
    <header
      id="app-navbar"
      className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none shadow-2xs"
    >
      {/* Left: Brand + Menu Button + Title + View Mode */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          id="btn-navbar-logo-menu"
          onClick={onOpenSidebarMenu}
          title={t('sidebarMenuTitle')}
          className="group flex items-center gap-2 pr-2 sm:pr-3 border-r border-slate-200 hover:opacity-90 transition-all text-left shrink-0 cursor-pointer"
        >
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all">
            <BrainCircuit className="w-4 h-4" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                {t('appTitle')}
              </h1>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600 border border-blue-200/60 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                Menu
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">{t('subtitle')}</p>
          </div>
        </button>

        {/* Mindmap Title (Editable) */}
        <input
          id="input-navbar-map-title"
          type="text"
          value={mapTitle}
          onChange={e => onUpdateMapTitle(e.target.value)}
          className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent hover:bg-slate-100 focus:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none transition-all max-w-[140px] sm:max-w-[220px] md:max-w-[320px] truncate"
          title="Bấm để đổi tên sơ đồ"
        />

        {/* View Mode Switcher: Node View vs Flow Chart */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
          <button
            id="btn-navbar-view-node"
            type="button"
            onClick={() => onViewModeChange('node')}
            title={t('nodeViewDesc')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === 'node'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('nodeView')}</span>
          </button>
          <button
            id="btn-navbar-view-flowchart"
            type="button"
            onClick={() => onViewModeChange('flowchart')}
            title={t('flowchartViewDesc')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              viewMode === 'flowchart'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('flowchartView')}</span>
          </button>
        </div>

        {/* Undo & Redo History Controls */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
          <button
            id="btn-navbar-undo"
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title={canUndo ? `${t('undoBtn')} (Ctrl+Z)` : `${t('undoBtn')} (Ctrl+Z)`}
            className={`p-1 sm:p-1.5 rounded-md transition-all ${
              canUndo
                ? 'text-slate-700 hover:text-blue-600 hover:bg-white shadow-2xs active:scale-95 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-navbar-redo"
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title={canRedo ? `${t('redoBtn')} (Ctrl+Y)` : `${t('redoBtn')} (Ctrl+Y)`}
            className={`p-1 sm:p-1.5 rounded-md transition-all ${
              canRedo
                ? 'text-slate-700 hover:text-blue-600 hover:bg-white shadow-2xs active:scale-95 cursor-pointer'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Zoom controls & Google Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Zoom Controls (Hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
          <button
            id="btn-navbar-fit-screen"
            onClick={onFitScreen}
            title={t('fitScreen')}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 rounded hover:bg-white transition-colors"
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Fit</span>
          </button>
          <div className="w-[1px] h-3.5 bg-slate-200/80 mx-0.5" />
          <button
            id="btn-navbar-zoom-out"
            onClick={onZoomOut}
            title={t('zoomOut')}
            className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-navbar-reset-zoom"
            onClick={onResetZoom}
            title={t('resetZoom')}
            className="px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600 hover:bg-white rounded transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            id="btn-navbar-zoom-in"
            onClick={onZoomIn}
            title={t('zoomIn')}
            className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-navbar-center-view"
            onClick={onCenterView}
            title={t('centerView')}
            className="p-1 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Google Authentication */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs"
              title={`${t('signedInAs')} ${user.email || user.displayName}`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google'}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user.email ? user.email[0].toUpperCase() : 'G'}
                </div>
              )}
              <span className="font-medium text-emerald-800 max-w-[100px] truncate hidden md:inline">
                {user.displayName || user.email}
              </span>
              <button
                id="btn-google-signout"
                onClick={onGoogleSignOut}
                title={t('signOut')}
                className="text-emerald-700 hover:text-red-600 p-0.5 rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            id="btn-google-signin"
            onClick={onGoogleSignIn}
            disabled={isGoogleLoading}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
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
            <span className="hidden sm:inline">{t('signInGoogle')}</span>
          </button>
        )}
      </div>
    </header>
  );
};
