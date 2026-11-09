import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Target,
  Heart,
  ShieldAlert,
  Zap,
  Check,
  Save,
  HelpCircle,
  User,
  ArrowRight,
  BookOpen,
  Award,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { CharacterProfileData } from '../types/mindmap';
import { getFactionColorScheme } from '../services/characterParser';

interface CharacterQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterProfileData[];
  onUpdateCharacter: (index: number, updatedChar: CharacterProfileData) => void;
  onSaveAll: (updatedList: CharacterProfileData[]) => void;
  onShowToast?: (msg: string) => void;
}

export const CharacterQualityModal: React.FC<CharacterQualityModalProps> = ({
  isOpen,
  onClose,
  characters,
  onUpdateCharacter,
  onSaveAll,
  onShowToast,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [charList, setCharList] = useState<CharacterProfileData[]>(characters || []);

  // Update internal state when characters prop changes
  React.useEffect(() => {
    setCharList(characters || []);
    if (selectedIdx >= (characters || []).length) {
      setSelectedIdx(0);
    }
  }, [characters, isOpen]);

  const activeChar = charList[selectedIdx] || null;

  // Evaluation criteria for active character
  const evaluation = useMemo(() => {
    if (!activeChar) return null;

    // 1. Want Evaluation
    const hasWant = Boolean(activeChar.want && activeChar.want.trim().length >= 5);
    const wantLength = (activeChar.want || '').trim().length;

    // 2. Flaw Evaluation
    const hasWeaknesses = Boolean(activeChar.weaknesses && activeChar.weaknesses.trim().length >= 3);
    const hasGhostWound = Boolean(activeChar.ghostWound && activeChar.ghostWound.trim().length >= 3);
    const hasTheLie = Boolean(activeChar.theLie && activeChar.theLie.trim().length >= 3);
    const hasFlaw = hasWeaknesses || hasGhostWound || hasTheLie;

    // 3. Perfect Fit / Torture in Story Evaluation
    const hasConflict = Boolean(activeChar.conflict && activeChar.conflict.trim().length >= 3);
    const hasNeed = Boolean(activeChar.need && activeChar.need.trim().length >= 3);
    const hasContrast = Boolean(
      (activeChar.contrastTrait && activeChar.contrastTrait.trim().length >= 2) ||
      (activeChar.identity && activeChar.identity.trim().length >= 2)
    );
    const isPerfectFit = hasConflict || hasNeed || hasContrast;

    let score = 0;
    if (hasWant) score += 1;
    if (hasFlaw) score += 1;
    if (isPerfectFit) score += 1;

    return {
      hasWant,
      wantLength,
      hasWeaknesses,
      hasGhostWound,
      hasTheLie,
      hasFlaw,
      hasConflict,
      hasNeed,
      hasContrast,
      isPerfectFit,
      score,
    };
  }, [activeChar]);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof CharacterProfileData, val: string) => {
    if (selectedIdx < 0 || selectedIdx >= charList.length) return;
    const updated = [...charList];
    updated[selectedIdx] = {
      ...updated[selectedIdx],
      [field]: val,
    };
    setCharList(updated);
    onUpdateCharacter(selectedIdx, updated[selectedIdx]);
  };

  const handleSaveAndClose = () => {
    onSaveAll(charList);
    onShowToast?.('Đã lưu toàn bộ đánh giá & cập nhật hồ sơ nhân vật!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-purple-200">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/80 border border-purple-400/50 flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 flex-wrap">
                <span>Công thức 3 Câu Hỏi Kiểm Tra Nhân Vật Chính Có "HAY" Không?</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold uppercase tracking-wider">
                  Kịch Bản Chuẩn
                </span>
              </h3>
              <p className="text-xs text-purple-200/90 font-normal mt-0.5">
                Sau khi đã ghép được danh tính và tính từ tương phản, hãy trả lời 3 câu hỏi này để chắc chắn nhân vật của mình đủ mạnh và có chiều sâu kịch tính.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-purple-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-0 bg-slate-50/50">
          {/* Left Sidebar: Character Selector */}
          <div className="w-full md:w-72 p-3 bg-slate-100/70 overflow-y-auto shrink-0 flex md:flex-col gap-2">
            <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Danh sách nhân vật ({charList.length})</span>
            </div>

            {charList.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
                Chưa có nhân vật nào trong bảng cấu hình.
              </div>
            ) : (
              <div className="flex md:flex-col gap-1.5 w-full overflow-x-auto md:overflow-visible pb-1">
                {charList.map((char, idx) => {
                  const colors = getFactionColorScheme(char.faction);
                  const isSelected = selectedIdx === idx;
                  const name = (char.name || `Nhân vật ${idx + 1}`).trim();
                  const hasWant = Boolean(char.want && char.want.trim().length >= 5);
                  const hasFlaw = Boolean(
                    (char.weaknesses && char.weaknesses.trim().length >= 3) ||
                    (char.ghostWound && char.ghostWound.trim().length >= 3) ||
                    (char.theLie && char.theLie.trim().length >= 3)
                  );
                  const hasFit = Boolean(
                    (char.conflict && char.conflict.trim().length >= 3) ||
                    (char.need && char.need.trim().length >= 3)
                  );
                  let charScore = 0;
                  if (hasWant) charScore += 1;
                  if (hasFlaw) charScore += 1;
                  if (hasFit) charScore += 1;

                  return (
                    <button
                      key={`char-eval-tab-${idx}`}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={`text-left p-2.5 rounded-xl transition-all cursor-pointer border flex items-center justify-between gap-2 shrink-0 md:shrink md:w-full ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-400/40 font-bold'
                          : 'bg-white text-slate-700 hover:bg-purple-50/70 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: colors.borderColor }}
                          />
                          <span className="text-xs truncate font-bold">
                            {name}
                          </span>
                        </div>
                        <div className="text-[10px] opacity-80 truncate mt-0.5">
                          {char.identity || char.role || 'Chưa đặt danh tính'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                            isSelected
                              ? 'bg-purple-800 text-purple-100'
                              : charScore === 3
                              ? 'bg-emerald-100 text-emerald-800'
                              : charScore >= 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {charScore}/3
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-200' : 'text-slate-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Main Content: 3 Questions Evaluation */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-white">
            {activeChar && evaluation ? (
              <>
                {/* Character Summary Header Card */}
                <div className="p-4 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-slate-50 border border-purple-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                      {activeChar.name ? activeChar.name.charAt(0).toUpperCase() : 'NV'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-slate-900">
                          {activeChar.name || `Nhân vật ${selectedIdx + 1}`}
                        </h4>
                        {activeChar.role && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold">
                            {activeChar.role}
                          </span>
                        )}
                        {activeChar.faction && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold">
                            Phe: {activeChar.faction}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span>
                          <strong>Danh tính:</strong> {activeChar.identity || 'Chưa điền'}
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Tính từ tương phản:</strong> {activeChar.contrastTrait || 'Chưa điền'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score Badge */}
                  <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-purple-200 shadow-2xs">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Độ Hay & Chiều Sâu
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {evaluation.score === 3
                          ? '🌟 Đạt chuẩn 3/3 (Rất mạnh)'
                          : evaluation.score === 2
                          ? '⚡ Đạt 2/3 (Cần bổ sung)'
                          : '⚠️ Đạt ' + evaluation.score + '/3 (Cần củng cố)'}
                      </div>
                    </div>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white ${
                        evaluation.score === 3
                          ? 'bg-emerald-500'
                          : evaluation.score === 2
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      {evaluation.score}/3
                    </div>
                  </div>
                </div>

                {/* Question 1: Want (Khao khát) */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  evaluation.hasWant
                    ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-300/40'
                    : 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-300/40'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>1. Nhân vật có Khao khát (Want) rõ ràng không?</span>
                          {evaluation.hasWant ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ĐÃ CÓ KHAO KHÁT</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>THIẾU KHAO KHÁT RÕ RÀNG</span>
                            </span>
                          )}
                        </h5>
                        <p className="text-xs text-slate-600 mt-0.5">
                          (Họ muốn tiền, muốn cứu người, muốn trả thù, hay muốn danh vọng?). <strong>Nhân vật chính không được thụ động</strong>, họ phải là người đưa ra quyết định thúc đẩy câu chuyện.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-3 pt-3 border-t border-slate-200/80">
                    <label className="block text-[11px] font-bold text-blue-900 uppercase">
                      🎯 Khao khát hữu hình (Want) hiện tại của {activeChar.name}:
                    </label>
                    <textarea
                      rows={2}
                      value={activeChar.want || ''}
                      onChange={e => handleFieldChange('want', e.target.value)}
                      placeholder="Nhập mục tiêu hành động cụ thể của nhân vật (Ví dụ: Tìm mọi cách giải cứu đứa con bị bắt cóc trước 24h)..."
                      className="w-full p-2.5 text-xs text-slate-800 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium leading-relaxed"
                    />

                    {/* Self-check hints */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5 p-2 bg-white/80 rounded-lg border border-slate-200">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Mục tiêu cụ thể & đo lường được</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 bg-white/80 rounded-lg border border-slate-200">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Chủ động hành động, không thụ động</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 bg-white/80 rounded-lg border border-slate-200">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Có động cơ sống còn (High stakes)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question 2: Flaw / Ghost Wound (Khuyết điểm) */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  evaluation.hasFlaw
                    ? 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-300/40'
                    : 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-300/40'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>2. Khuyết điểm (Flaw) của họ là gì?</span>
                          {evaluation.hasFlaw ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>CÓ KHUYẾT ĐIỂM / VẾT THƯƠNG</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>QUÁ HOÀN HẢO (THIẾU FLAW)</span>
                            </span>
                          )}
                        </h5>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Khán giả <strong>không thích người hoàn hảo</strong>. Một nhân vật có vết sẹo tâm lý, ích kỷ, nhút nhát hay kiêu ngạo sẽ thực tế và đáng xem hơn.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Điểm yếu / Thói xấu:</span>
                      </label>
                      <textarea
                        rows={2}
                        value={activeChar.weaknesses || ''}
                        onChange={e => handleFieldChange('weaknesses', e.target.value)}
                        placeholder="Nóng nảy, ích kỷ, nghiện rượu..."
                        className="w-full p-2 text-xs bg-white border border-amber-200 rounded-lg focus:border-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-red-900 uppercase mb-1 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-600" />
                        <span>Vết thương quá khứ (Ghost):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={activeChar.ghostWound || ''}
                        onChange={e => handleFieldChange('ghostWound', e.target.value)}
                        placeholder="Mất người thân, bị phản bội..."
                        className="w-full p-2 text-xs bg-white border border-red-200 rounded-lg focus:border-red-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-purple-600" />
                        <span>Lời nói dối tin vào (The Lie):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={activeChar.theLie || ''}
                        onChange={e => handleFieldChange('theLie', e.target.value)}
                        placeholder="Tôi không thể tin tưởng bất kỳ ai..."
                        className="w-full p-2 text-xs bg-white border border-purple-200 rounded-lg focus:border-purple-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Question 3: Is this the "Most Suitable Person" for this story? */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  evaluation.isPerfectFit
                    ? 'bg-purple-50/40 border-purple-200 ring-1 ring-purple-300/40'
                    : 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-300/40'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>3. Họ có phải là "người phù hợp nhất" cho câu chuyện này?</span>
                          {evaluation.isPerfectFit ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>HOÀN CẢNH ÉP THAY ĐỔI TRIỆT ĐỂ</span>
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>CHƯA RÕ SỰ TƯƠNG PHẢN</span>
                            </span>
                          )}
                        </h5>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <strong>"Phù hợp nhất"</strong> ở đây nghĩa là đặt họ vào câu chuyện này sẽ <strong>khiến họ đau khổ và phải thay đổi nhiều nhất</strong>. (Ví dụ: Đặt một người sợ độ cao vào tình huống phải sinh tồn trên đỉnh tòa nhà chọc trời).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-purple-600" />
                        <span>Mâu thuẫn Want vs Need (Đau khổ & Biến chuyển):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={activeChar.conflict || ''}
                        onChange={e => handleFieldChange('conflict', e.target.value)}
                        placeholder="Muốn giữ an toàn nhưng bắt buộc phải liều mạng cứu người..."
                        className="w-full p-2 text-xs bg-white border border-purple-200 rounded-lg focus:border-purple-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-indigo-900 uppercase mb-1 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-indigo-600" />
                        <span>Bài học chân lý nội tâm (Need):</span>
                      </label>
                      <textarea
                        rows={2}
                        value={activeChar.need || ''}
                        onChange={e => handleFieldChange('need', e.target.value)}
                        placeholder="Học cách mở lòng và tha thứ cho chính mình..."
                        className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Final Verdict Summary Card */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-6 h-6 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Kết Luận Đánh Giá Kịch Bản:
                      </div>
                      <div className="text-xs text-slate-200 mt-0.5">
                        {evaluation.score === 3 ? (
                          <span>🎉 Nhân vật <strong>{activeChar.name}</strong> đã hội tụ đủ 3 yếu tố then chốt (Khao khát mạnh mẽ, Khuyết điểm chân thực, Hoàn cảnh ép buộc thay đổi sâu sắc)!</span>
                        ) : (
                          <span>⚠️ Hãy bổ sung thêm các trường còn thiếu ở trên để đảm bảo nhân vật có đủ sức nặng dẫn dắt cốt truyện.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedIdx < charList.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedIdx(prev => Math.min(charList.length - 1, prev + 1))}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>Nhân vật tiếp</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">
                Vui lòng chọn một nhân vật từ danh sách bên trái để tiến hành kiểm tra.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Được thiết kế dựa trên quy chuẩn xây dựng nhân vật kịch tính kinh điển</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu & Cập nhật hồ sơ nhân vật</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
