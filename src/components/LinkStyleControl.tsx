import React from 'react';
import { BorderStyle, RelationArrowType, LinkStyleConfig } from '../types/mindmap';
import { useTranslation } from '../i18n/LanguageContext';

export const LINK_COLOR_PRESETS = [
  '#94a3b8', // Xám chuẩn slate
  '#3b82f6', // Xanh dương
  '#8b5cf6', // Tím
  '#10b981', // Xanh lục
  '#f59e0b', // Cam / Amber
  '#ef4444', // Đỏ hồng
  '#0f172a', // Đen / Xanh đen
];

interface LinkStyleControlProps {
  value: LinkStyleConfig;
  onChange: (updated: LinkStyleConfig) => void;
  title?: string;
  className?: string;
  compact?: boolean;
}

export const LinkStyleControl: React.FC<LinkStyleControlProps> = ({
  value,
  onChange,
  title,
  className = '',
  compact = false,
}) => {
  const { t } = useTranslation();

  const arrow = value.arrow || 'none';
  const style = value.style || 'solid';
  const width = value.width || 2;
  const color = value.color || '#94a3b8';

  if (compact) {
    return (
      <div className={`pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 ${className}`}>
        {/* Arrow type */}
        <div className="flex items-center gap-1">
          <span>{t('crossLinkArrow')}</span>
          <select
            value={arrow}
            onChange={e => onChange({ ...value, arrow: e.target.value as RelationArrowType })}
            className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-[11px]"
          >
            <option value="none">— {t('arrowNone')}</option>
            <option value="end">➜ {t('arrowEnd')}</option>
            <option value="both">⬌ {t('arrowBoth')}</option>
            <option value="start">⬅ {t('arrowStart')}</option>
          </select>
        </div>

        {/* Line style */}
        <div className="flex items-center gap-1">
          <span>{t('crossLinkLineStyle')}</span>
          <select
            value={style}
            onChange={e => onChange({ ...value, style: e.target.value as BorderStyle })}
            className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-[11px]"
          >
            <option value="solid">{t('lineSolid')}</option>
            <option value="dashed">{t('lineDashed')}</option>
            <option value="dotted">{t('lineDotted')}</option>
          </select>
        </div>

        {/* Line width */}
        <div className="flex items-center gap-1">
          <span>{t('crossLinkWidth')}</span>
          <select
            value={width}
            onChange={e => onChange({ ...value, width: Number(e.target.value) })}
            className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-[11px]"
          >
            <option value={1}>1px</option>
            <option value={2}>2px</option>
            <option value={2.5}>2.5px</option>
            <option value={3}>3px</option>
            <option value={4}>4px</option>
          </select>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          <span>{t('crossLinkColor')}</span>
          <div className="flex items-center gap-1">
            {LINK_COLOR_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...value, color: c })}
                className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                  color.toLowerCase() === c.toLowerCase()
                    ? 'scale-125 ring-1.5 ring-blue-500 border-white'
                    : 'border-black/10 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => onChange({ ...value, color: e.target.value })}
              className="w-4 h-4 p-0 border-0 rounded cursor-pointer bg-transparent"
              title="Màu tùy chỉnh"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 bg-white/90 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs ${className}`}>
      {title && (
        <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-8 h-1 rounded"
              style={{
                backgroundColor: color,
                borderTop: style === 'dashed' ? '2px dashed' : style === 'dotted' ? '2px dotted' : undefined,
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        {/* 1. Loại mũi tên */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            {t('crossLinkArrow')}
          </label>
          <select
            value={arrow}
            onChange={e => onChange({ ...value, arrow: e.target.value as RelationArrowType })}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="none">— {t('arrowNone')}</option>
            <option value="end">➜ {t('arrowEnd')}</option>
            <option value="both">⬌ {t('arrowBoth')}</option>
            <option value="start">⬅ {t('arrowStart')}</option>
          </select>
        </div>

        {/* 2. Kiểu nét nối */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            {t('crossLinkLineStyle')}
          </label>
          <select
            value={style}
            onChange={e => onChange({ ...value, style: e.target.value as BorderStyle })}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="solid">{t('lineSolid')}</option>
            <option value="dashed">{t('lineDashed')}</option>
            <option value="dotted">{t('lineDotted')}</option>
          </select>
        </div>

        {/* 3. Độ dày nét */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            {t('crossLinkWidth')} ({width}px)
          </label>
          <select
            value={width}
            onChange={e => onChange({ ...value, width: Number(e.target.value) })}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value={1}>1px (Mảnh)</option>
            <option value={2}>2px (Chuẩn)</option>
            <option value={2.5}>2.5px (Vừa)</option>
            <option value={3}>3px (Đậm)</option>
            <option value={4}>4px (Rất đậm)</option>
          </select>
        </div>
      </div>

      {/* 4. Chọn màu nét */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <span className="text-[11px] font-medium text-slate-600">
          {t('crossLinkColor')}
        </span>
        <div className="flex items-center gap-1.5">
          {LINK_COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...value, color: c })}
              className={`w-5 h-5 rounded-full border transition-all ${
                color.toLowerCase() === c.toLowerCase()
                  ? 'scale-125 ring-2 ring-blue-500 border-white shadow-xs'
                  : 'border-black/15 opacity-80 hover:opacity-100 hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={e => onChange({ ...value, color: e.target.value })}
            className="w-5 h-5 p-0 border-0 rounded cursor-pointer bg-transparent"
            title="Màu tùy chỉnh"
          />
        </div>
      </div>
    </div>
  );
};
