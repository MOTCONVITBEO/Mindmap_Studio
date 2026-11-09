import React, { useState, useMemo } from 'react';
import {
  Film,
  Clapperboard,
  X,
  Plus,
  Trash2,
  Maximize2,
  Edit2,
  Check,
  CheckSquare,
  FileText,
  ChevronRight,
  ArrowRight,
  Layers,
  Sparkles,
  Unlink,
  Tag,
  Wand2,
  Highlighter,
  ExternalLink,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MindmapGraph } from '../models/MindmapGraph';
import { NodeModel } from '../models/NodeModel';
import { ScriptAnnotation } from '../types/mindmap';
import { useTranslation } from '../i18n/LanguageContext';
import { formatCharacterSummary, getFactionColorScheme } from '../services/characterParser';

interface FilmScriptModalProps {
  isOpen: boolean;
  stageId: string | null;
  graph: MindmapGraph;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onOpenDetailModal: (nodeId: string) => void;
  onUpdateGraph?: (graph: MindmapGraph) => void;
  onPushSnapshot?: () => void;
  onShowToast?: (msg: string) => void;
  onStartEditTitle?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onAddChildNode: (parentId: string) => void;
}

const LEVEL_COLORS = [
  { border: '#3b82f6', bg: 'bg-blue-50/70', headerBg: 'bg-blue-600', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  { border: '#6366f1', bg: 'bg-indigo-50/70', headerBg: 'bg-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  { border: '#10b981', bg: 'bg-emerald-50/70', headerBg: 'bg-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  { border: '#f59e0b', bg: 'bg-amber-50/70', headerBg: 'bg-amber-600', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  { border: '#ec4899', bg: 'bg-pink-50/70', headerBg: 'bg-pink-600', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-800' },
];

const SCRIPT_LABELS = [
  { key: 'inciting_incident', title: 'Biến cố kích hoạt', color: '#ef4444', icon: '💥' },
  { key: 'planting', title: 'Cài mìn / Manh mối', color: '#f59e0b', icon: '💣' },
  { key: 'because_but', title: 'Vì - Nhưng', color: '#3b82f6', icon: '🔄' },
  { key: 'plot_twist', title: 'Điểm lật kịch tính', color: '#8b5cf6', icon: '⚡' },
  { key: 'motivation', title: 'Động cơ nhân vật', color: '#10b981', icon: '🎯' },
  { key: 'conflict', title: 'Xung đột / Đối đầu', color: '#e11d48', icon: '⚔️' },
  { key: 'climax', title: 'Cao trào / Đỉnh điểm', color: '#ea580c', icon: '🔥' },
];

const CLASSIFICATION_PATTERNS = [
  {
    key: 'inciting_incident',
    title: 'Biến cố kích hoạt',
    color: '#ef4444',
    icon: '💥',
    keywords: [
      'bất ngờ', 'đột nhiên', 'bỗng nhiên', 'bỗng', 'đột ngột',
      'biến cố', 'sự cố', 'tai nạn', 'phát hiện ra', 'chứng kiến',
      'bị tấn công', 'nhận được tin', 'bắt đầu xảy ra', 'khởi đầu',
      'tiếng súng', 'tiếng nổ', 'mất tích', 'bị bắt cóc', 'bị giết',
      'tin dữ', 'cháy', 'sập', 'báo động', 'thảm họa'
    ],
  },
  {
    key: 'planting',
    title: 'Cài mìn / Manh mối',
    color: '#f59e0b',
    icon: '💣',
    keywords: [
      'manh mối', 'dấu vết', 'để lại', 'nhặt được', 'vật thể lạ',
      'dấu hiệu', 'ghi nhớ', 'chiếc chìa khóa', 'bức ảnh', 'lá thư',
      'bức thư', 'tin nhắn lạ', 'chiếc hộp', 'vết máu', 'vết tích',
      'điềm báo', 'chi tiết kỳ lạ', 'vật chứng', 'gợi ý', 'mật mã',
      'ký hiệu', 'máy ghi âm', 'nhật ký', 'vật gia truyền'
    ],
  },
  {
    key: 'because_but',
    title: 'Vì - Nhưng',
    color: '#3b82f6',
    icon: '🔄',
    keywords: [
      'tuy nhiên', 'nhưng mà', 'nhưng', 'mặc dù', 'cho dù',
      'thế nhưng', 'ngược lại', 'dù vậy', 'trái lại', 'không ngờ rằng',
      'định bụng nhưng', 'cố gắng nhưng', 'muốn nhưng'
    ],
  },
  {
    key: 'plot_twist',
    title: 'Điểm lật kịch tính',
    color: '#8b5cf6',
    icon: '⚡',
    keywords: [
      'thực chất', 'hóa ra', 'sự thật là', 'thực ra', 'không phải là',
      'lật ngược', 'trở mặt', 'phản bội', 'bị gài bẫy', 'bẫy',
      'bí mật bị lộ', 'danh tính thật', 'kẻ đứng sau', 'thủ phạm thực sự',
      'sự thật kinh hoàng', 'té ngửa', 'người giả mạo', 'hai mặt'
    ],
  },
  {
    key: 'motivation',
    title: 'Động cơ nhân vật',
    color: '#10b981',
    icon: '🎯',
    keywords: [
      'mục tiêu', 'động cơ', 'khao khát', 'mong muốn', 'quyết tâm',
      'bằng mọi giá', 'lên kế hoạch', 'để cứu', 'để bảo vệ', 'để trả thù',
      'để chuộc lỗi', 'trả thù', 'cứu sống', 'tìm kiếm sự thật',
      'hy sinh', 'muốn tìm', 'ước nguyện'
    ],
  },
  {
    key: 'conflict',
    title: 'Xung đột / Đối đầu',
    color: '#e11d48',
    icon: '⚔️',
    keywords: [
      'tranh cãi', 'đối đầu', 'mâu thuẫn', 'xung đột', 'ngăn cản',
      'chống lại', 'chiến đấu', 'xô xát', 'đe dọa', 'uy hiếp',
      'giằng co', 'khẩu chiến', 'đối mặt', 'chất vấn', 'bất hòa',
      'thách thức', 'tấn công', 'đánh nhau'
    ],
  },
  {
    key: 'climax',
    title: 'Cao trào / Đỉnh điểm',
    color: '#ea580c',
    icon: '🔥',
    keywords: [
      'cao trào', 'nguy kịch', 'cận kề cái chết', 'ngàn cân treo sợi tóc',
      'hết giờ', 'giây phút quyết định', 'sinh tử', 'bùng nổ',
      'quyết chiến', 'đỉnh điểm', 'không còn đường lui', 'tuyệt vọng',
      'bước ngoặt cuối cùng'
    ],
  },
];

const getMarkerLabel = (rawMarker: string) => {
  const m = rawMarker.toLowerCase();
  if (m.includes('vì') && !m.includes('nhưng')) {
    return { key: 'because_but', title: '🔄 Vì', color: '#3b82f6' };
  }
  if (m.includes('nhưng')) {
    return { key: 'because_but', title: '🔄 Nhưng', color: '#0284c7' };
  }
  if (m.includes('biến cố') || m.includes('sự cố')) {
    return { key: 'inciting_incident', title: '💥 Biến cố kích hoạt', color: '#ef4444' };
  }
  if (m.includes('cài mìn') || m.includes('manh mối') || m.includes('cài cắm') || m.includes('planting')) {
    return { key: 'planting', title: '💣 Cài mìn / Manh mối', color: '#f59e0b' };
  }
  if (m.includes('điểm lật') || m.includes('lật') || m.includes('twist')) {
    return { key: 'plot_twist', title: '⚡ Điểm lật kịch tính', color: '#8b5cf6' };
  }
  if (m.includes('động cơ') || m.includes('mục tiêu')) {
    return { key: 'motivation', title: '🎯 Động cơ nhân vật', color: '#10b981' };
  }
  if (m.includes('xung đột') || m.includes('đối đầu') || m.includes('mâu thuẫn')) {
    return { key: 'conflict', title: '⚔️ Xung đột / Đối đầu', color: '#e11d48' };
  }
  if (m.includes('cao trào') || m.includes('đỉnh điểm') || m.includes('climax')) {
    return { key: 'climax', title: '🔥 Cao trào / Đỉnh điểm', color: '#ea580c' };
  }
  return null;
};

export const FilmScriptModal: React.FC<FilmScriptModalProps> = ({
  isOpen,
  stageId,
  graph,
  onClose,
  onSelectNode,
  onOpenDetailModal,
  onUpdateGraph,
  onPushSnapshot,
  onShowToast,
  onStartEditTitle,
  onDeleteNode,
  onAddChildNode,
}) => {
  const { t } = useTranslation();
  const [editingTitleNodeId, setEditingTitleNodeId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  // Script Analysis state
  const [analyzingNodeId, setAnalyzingNodeId] = useState<string | null>(null);
  const [activeAnalysisNode, setActiveAnalysisNode] = useState<NodeModel | null>(null);
  const [activeAnalysisBlockIdx, setActiveAnalysisBlockIdx] = useState<number>(0);
  const [phraseInput, setPhraseInput] = useState<string>('');
  const [analysisLinkedNodeId, setAnalysisLinkedNodeId] = useState<string>('');
  const [selectedTextInfo, setSelectedTextInfo] = useState<{
    nodeId: string;
    blockIdx: number;
    text: string;
    position: { top: number; left: number };
  } | null>(null);
  const [selectedLinkedNodeId, setSelectedLinkedNodeId] = useState<string>('');
  const [inspectAnnotationInfo, setInspectAnnotationInfo] = useState<{
    node: NodeModel;
    annotation: ScriptAnnotation;
  } | null>(null);

  // Trigger cập nhật re-render ngay lập tức cho các cột bên ngoài khi thêm/xóa tag
  const [, setLocalVersion] = useState(0);

  // Cross-link character columns collapsed state (per column)
  const [collapsedCrossCols, setCollapsedCrossCols] = useState<Record<string, boolean>>({});
  // Parent columns fixed height expand/collapse state (per column)
  const [expandedParentCards, setExpandedParentCards] = useState<Record<string, boolean>>({});
  // Set các node nhân vật đang được tích chọn để highlight ở các cột tiếp theo
  const [selectedCharNodeIds, setSelectedCharNodeIds] = useState<Set<string>>(new Set());

  // Danh sách từ khóa/tên nhân vật được tích chọn để highlight ở các cột
  const selectedCharacterKeywords = useMemo(() => {
    const list: Array<{ id: string; name: string; color: string }> = [];
    const addedNames = new Set<string>();

    const GENERIC_EXCLUDE = new Set([
      'nhân vật', 'nhan vat', 'nv', 'cảnh sát', 'canh sat', 'tiến trình', 'tien trinh',
      'giai đoạn', 'giai doan', 'cột', 'thẻ', 'node', 'checklist', 'chi tiết', 'nội dung',
      'và', 'hoặc', 'của', 'ở', 'tại', 'trong', 'với', 'là', 'cho', 'để', 'nhưng', 'bởi',
      'the', 'and', 'or', 'in', 'at', 'on', 'of', 'to', 'for', 'with', 'cảnh', 'sát', 'nhân', 'vật'
    ]);

    const tryAdd = (id: string, rawName: string, color: string) => {
      const clean = (rawName || '').trim()
        .replace(/^[\d\s.\-:#*~()[\]{}]+/, '')
        .replace(/[\d\s.\-:#*~()[\]{}]+$/, '')
        .trim();
      if (!clean || clean.length < 2) return;
      const lower = clean.toLowerCase();
      if (addedNames.has(lower) || GENERIC_EXCLUDE.has(lower)) return;
      addedNames.add(lower);
      list.push({ id, name: clean, color });
    };

    const processRawTitle = (id: string, rawTitle: string, color: string) => {
      if (!rawTitle) return;
      // 1. Tên đầy đủ nguyên bản
      tryAdd(id, rawTitle, color);

      // 2. Bỏ các tiền tố như "Nhân vật: ", "NV: ", "01. "
      const withoutPrefix = rawTitle
        .replace(/^(nhân vật|nhan vat|nv|tiến trình|tien trinh|nhân vật chính|nhân vật phụ)[\s:.\-]+/i, '')
        .trim();
      tryAdd(id, withoutPrefix, color);

      // 3. Bóc tách ngoặc đơn: "Will Byers (Nam)" => "Will Byers", "Nam"
      const parenMatch = rawTitle.match(/\(([^)]+)\)/);
      if (parenMatch && parenMatch[1]) {
        tryAdd(id, parenMatch[1], color);
      }
      const withoutParen = rawTitle.replace(/\([^)]*\)/g, '').trim();
      tryAdd(id, withoutParen, color);

      // 4. Bóc tách dấu hai chấm: "Nhân vật: Will Byers" => "Will Byers"
      if (rawTitle.includes(':')) {
        const parts = rawTitle.split(':');
        tryAdd(id, parts[parts.length - 1], color);
      }

      // 5. Bóc tách dấu gạch chéo: "Eleven / El" => "Eleven", "El"
      if (rawTitle.includes('/')) {
        rawTitle.split('/').forEach(p => tryAdd(id, p, color));
      }

      // 6. Bóc tách dấu gạch ngang: "Will Byers - Cậu bé mất tích" => "Will Byers"
      if (rawTitle.includes('-') || rawTitle.includes('—')) {
        rawTitle.split(/[-—]/).forEach(p => tryAdd(id, p, color));
      }

      // 7. Tách từng từ đơn (First name, Last name, v.v. Ví dụ: "Will Byers" => tách thêm "Will" và "Byers")
      const currentTerms = [...list.filter(item => item.id === id).map(item => item.name)];
      currentTerms.forEach(term => {
        const words = term
          .split(/\s+/)
          .map(w => w.replace(/[.,;!?:"'()[\]{}]/g, '').trim())
          .filter(Boolean);

        if (words.length > 1) {
          words.forEach(w => {
            tryAdd(id, w, color);
          });
          if (words.length >= 3) {
            tryAdd(id, words.slice(0, 2).join(' '), color);
            tryAdd(id, words.slice(-2).join(' '), color);
          }
        }
      });
    };

    selectedCharNodeIds.forEach(id => {
      const n = graph.getNode(id);
      if (n) {
        const color = n.style.borderColor || '#8b5cf6';
        // Tiêu đề của node
        processRawTitle(id, n.title, color);

        // Tên nhân vật từ cấu trúc profile nếu có
        if (n.characterProfile?.name) {
          processRawTitle(id, n.characterProfile.name, color);
        }
        if (n.characterProfiles && n.characterProfiles.length > 0) {
          n.characterProfiles.forEach(p => {
            if (p.name) processRawTitle(id, p.name, color);
          });
        }
      }
    });

    // Sắp xếp độ dài giảm dần để ưu tiên từ khóa dài hơn khớp trước (Ví dụ: "Will Byers" trước "Will")
    return list.sort((a, b) => b.name.length - a.name.length);
  }, [selectedCharNodeIds, graph]);

  // Hàm highlight tên các nhân vật được tích chọn trong một chuỗi văn bản (Chỉ cần chứa tên là highlight)
  const renderTextWithCharacterHighlights = (
    text: string,
    keyPrefix: string
  ): React.ReactNode => {
    if (!text || selectedCharacterKeywords.length === 0) {
      return text;
    }

    try {
      const escaped = selectedCharacterKeywords
        .map(k => k.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      // Substring match: Chỉ cần chứa tên là khớp và highlight
      const regex = new RegExp(`(${escaped})`, 'giu');
      const parts = text.split(regex);

      if (parts.length <= 1) return text;

      return (
        <>
          {parts.map((part, pIdx) => {
            const matched = selectedCharacterKeywords.find(
              k => k.name.toLowerCase() === part.toLowerCase()
            );
            if (matched) {
              return (
                <mark
                  key={`${keyPrefix}-char-hl-${pIdx}`}
                  className="bg-amber-300 text-amber-950 font-black px-1.5 py-0.5 rounded-md border border-amber-500/80 shadow-xs ring-2 ring-amber-400/60 inline-flex items-center gap-1 mx-0.5 animate-pulse"
                  title={`Nhân vật đang được tích chọn: ${matched.name} [${matched.id}]`}
                >
                  <span>{part}</span>
                  <span className="text-[8px] bg-amber-700 text-white font-mono px-1 py-0.2 rounded-sm font-bold uppercase tracking-wider leading-none shrink-0">
                    NV
                  </span>
                </mark>
              );
            }
            return <span key={`${keyPrefix}-txt-${pIdx}`}>{part}</span>;
          })}
        </>
      );
    } catch {
      return text;
    }
  };

  if (!isOpen || !stageId) return null;

  const stageNode = graph.getNode(stageId);
  if (!stageNode) return null;

  const stageColor = stageNode.style.borderColor || '#3b82f6';
  const rootChildCards = stageNode.childrenIds
    .map(id => graph.getNode(id))
    .filter((c): c is NodeModel => !!c);

  const handleFinishEditingTitle = (nodeId: string) => {
    if (!titleDraft.trim()) {
      setEditingTitleNodeId(null);
      return;
    }
    const node = graph.getNode(nodeId);
    if (node) {
      onPushSnapshot?.();
      node.updateTitle(titleDraft.trim());
      graph.meta.updatedAt = new Date().toISOString();
      onUpdateGraph?.(graph);
      onShowToast?.(`Đã đổi tên thành: "${titleDraft.trim()}"`);
    }
    setEditingTitleNodeId(null);
  };

  // Handle text selection inside script block
  const handleMouseUpTextBlock = (nodeId: string, blockIdx: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text || text.length === 0) return;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedTextInfo({
        nodeId,
        blockIdx,
        text,
        position: {
          top: Math.max(20, rect.top - 90),
          left: Math.max(20, rect.left),
        },
      });
      setSelectedLinkedNodeId('');
    } catch (e) {
      console.error(e);
    }
  };

  // Apply script annotation
  const handleApplyAnnotation = (labelKey: string, labelTitle: string, color: string) => {
    if (!selectedTextInfo) return;
    const targetNode = graph.getNode(selectedTextInfo.nodeId);
    if (!targetNode) return;

    onPushSnapshot?.();
    targetNode.addScriptAnnotation({
      textBlockIndex: selectedTextInfo.blockIdx,
      selectedText: selectedTextInfo.text,
      labelKey,
      labelTitle,
      color,
      linkedNodeId: selectedLinkedNodeId || undefined,
    });

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    if (activeAnalysisNode && activeAnalysisNode.id === targetNode.id) {
      setActiveAnalysisNode(graph.getNode(targetNode.id) || targetNode);
    }
    setLocalVersion(v => v + 1);
    onShowToast?.(`Đã gán nhãn "${labelTitle}" cho đoạn kịch bản!`);
    setSelectedTextInfo(null);
    window.getSelection()?.removeAllRanges();
  };

  // Remove script annotation
  const handleRemoveAnnotation = (node: NodeModel, annotationId: string) => {
    onPushSnapshot?.();
    const targetNode = graph.getNode(node.id) || node;
    targetNode.removeScriptAnnotation(annotationId);
    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);

    // Refresh activeAnalysisNode reference so workbench updates immediately
    if (activeAnalysisNode && activeAnalysisNode.id === targetNode.id) {
      setActiveAnalysisNode(graph.getNode(targetNode.id) || targetNode);
    }
    setInspectAnnotationInfo(null);
    setLocalVersion(v => v + 1);
    onShowToast?.('Đã xóa nhãn phân tích kịch bản');
  };

  // Auto Tag Character Nodes in Script Text
  const handleAutoTagCharacterNodes = (node: NodeModel) => {
    if (!node) return;
    const targetNode = graph.getNode(node.id) || node;
    const allOtherNodes = graph
      .getAllNodes()
      .filter(n => n.id !== targetNode.id && n.title && n.title.trim().length >= 2);

    if (allOtherNodes.length === 0) {
      onShowToast?.('Không tìm thấy node nhân vật khác trong sơ đồ');
      return;
    }

    onPushSnapshot?.();
    let countAdded = 0;
    const contents =
      targetNode.contents && targetNode.contents.length > 0
        ? targetNode.contents
        : [targetNode.content || ''];

    contents.forEach((blockText, blockIdx) => {
      if (!blockText || !blockText.trim()) return;
      const lowerText = blockText.toLowerCase();

      allOtherNodes.forEach(otherNode => {
        // Collect candidate search terms from title and ID
        const candidateTerms: string[] = [otherNode.title.trim()];

        // If title contains parentheses e.g. "Tiến trình 01 (Nam)" -> extract "Nam"
        const parenMatch = otherNode.title.match(/\(([^)]+)\)/);
        if (parenMatch && parenMatch[1] && parenMatch[1].trim().length >= 2) {
          candidateTerms.push(parenMatch[1].trim());
        }

        // If title contains colon e.g. "Nhân vật: Hùng" -> extract "Hùng"
        if (otherNode.title.includes(':')) {
          const parts = otherNode.title.split(':');
          const afterColon = parts[parts.length - 1].trim();
          if (afterColon.length >= 2) {
            candidateTerms.push(afterColon);
          }
        }

        // If character profiles exist, extract character names as candidates
        if (otherNode.characterProfiles && otherNode.characterProfiles.length > 0) {
          otherNode.characterProfiles.forEach(p => {
            if (p.name && p.name.trim().length >= 2) {
              candidateTerms.push(p.name.trim());
            }
          });
        } else if (otherNode.characterProfile?.name && otherNode.characterProfile.name.trim().length >= 2) {
          candidateTerms.push(otherNode.characterProfile.name.trim());
        }

        // Tách thêm từng từ đơn của nhân vật (ví dụ "Will Byers" => tách thêm "Will" và "Byers")
        const currentCandidates = [...candidateTerms];
        currentCandidates.forEach(term => {
          const words = term.split(/\s+/).map(w => w.replace(/[.,;!?:"'()[\]{}]/g, '').trim()).filter(Boolean);
          if (words.length > 1) {
            words.forEach(w => {
              if (w.length >= 2 && !/^(nhân|vật|cảnh|sát|tiến|trình|giai|đoạn|và|của|ở|với)$/i.test(w)) {
                candidateTerms.push(w);
              }
            });
          }
        });

        // Sắp xếp dài trước ngắn sau
        const sortedTerms = Array.from(new Set(candidateTerms)).sort((a, b) => b.length - a.length);

        sortedTerms.forEach(term => {
          if (!term || term.length < 2) return;
          const lowerTerm = term.toLowerCase();

          if (lowerText.includes(lowerTerm)) {
            // Check if already tagged for this block
            const existing = (targetNode.scriptAnnotations || []).some(
              a => a.textBlockIndex === blockIdx && a.selectedText.toLowerCase() === lowerTerm
            );
            if (!existing) {
              targetNode.addScriptAnnotation({
                textBlockIndex: blockIdx,
                selectedText: term,
                labelKey: 'character_auto',
                labelTitle: term,
                color: otherNode.style.borderColor || '#8b5cf6',
                linkedNodeId: otherNode.id,
              });
              countAdded++;
            }
          }
        });
      });
    });

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);

    // Refresh activeAnalysisNode state reference so Workbench Modal updates immediately
    if (activeAnalysisNode && activeAnalysisNode.id === targetNode.id) {
      setActiveAnalysisNode(graph.getNode(targetNode.id) || targetNode);
    }
    setLocalVersion(v => v + 1);

    if (countAdded > 0) {
      onShowToast?.(`🤖 Đã tự động gán ${countAdded} tag tên nhân vật trong kịch bản!`);
    } else {
      onShowToast?.('Không phát hiện thêm tên nhân vật mới nào trong văn bản kịch bản');
    }
  };

  // Tự động phân loại và đánh nhãn các yếu tố kịch bản
  // Ưu tiên cao nhất: Dựa vào các key ghi sẵn theo quy ước kịch bản như [Vì], [Nhưng], [Biến cố kích hoạt], [Cài mìn], v.v.
  const handleAutoClassifyScript = (node: NodeModel | null) => {
    if (!node) return;
    const targetNode = graph.getNode(node.id) || node;
    const contents =
      targetNode.contents && targetNode.contents.length > 0
        ? targetNode.contents
        : [targetNode.content || ''];

    onPushSnapshot?.();
    let countAdded = 0;

    contents.forEach((blockText, blockIdx) => {
      if (!blockText || !blockText.trim()) return;

      // PASS 1: Ưu tiên nhận diện các Key ghi sẵn theo quy ước kịch bản như [Vì], [Nhưng], [Biến cố kích hoạt], [Cài mìn], [Điểm lật]...
      const BRACKETED_SCRIPT_KEY_REGEX =
        /([\[\(【](?:Vì|Nhưng|Biến cố kích hoạt|Biến cố|Cài mìn|Manh mối|Cài cắm|Điểm lật|Điểm lật kịch tính|Twist|Lật kèo|Động cơ|Động cơ nhân vật|Xung đột|Đối đầu|Cao trào|Đỉnh điểm)[\]\)】](?:\s*:\s*)?)([^\[\(【\n]+)?/gi;

      let bMatch: RegExpExecArray | null;
      while ((bMatch = BRACKETED_SCRIPT_KEY_REGEX.exec(blockText)) !== null) {
        const rawMarker = (bMatch[1] || '').trim();
        let content = (bMatch[2] || '').trim();
        // Cắt bỏ dấu phẩy hoặc chấm phẩy cuối cùng nếu có
        content = content.replace(/[,;]+$/, '').trim();

        const phrase = content ? `${rawMarker} ${content}`.replace(/\s+/g, ' ').trim() : rawMarker;
        const markerInfo = getMarkerLabel(rawMarker);

        if (markerInfo && phrase.length >= 2) {
          const lowerPhrase = phrase.toLowerCase();
          const existing = (targetNode.scriptAnnotations || []).some(
            a =>
              a.textBlockIndex === blockIdx &&
              (a.selectedText.toLowerCase().includes(lowerPhrase) ||
                lowerPhrase.includes(a.selectedText.toLowerCase()))
          );

          if (!existing) {
            targetNode.addScriptAnnotation({
              textBlockIndex: blockIdx,
              selectedText: phrase,
              labelKey: markerInfo.key,
              labelTitle: markerInfo.title,
              color: markerInfo.color,
            });
            countAdded++;
          }
        }
      }

      // PASS 2: Quét các từ khóa kịch tính tự nhiên (nếu chưa được gán nhãn ở Pass 1)
      const lowerText = blockText.toLowerCase();

      CLASSIFICATION_PATTERNS.forEach(pattern => {
        // Ưu tiên các từ khóa dài hơn khớp trước
        const sortedKeywords = [...pattern.keywords].sort((a, b) => b.length - a.length);

        for (const kw of sortedKeywords) {
          const lowerKw = kw.toLowerCase();
          let searchPos = 0;

          while (searchPos < lowerText.length) {
            const matchIdx = lowerText.indexOf(lowerKw, searchPos);
            if (matchIdx === -1) break;

            // Trích xuất vế câu có nghĩa xung quanh từ khóa
            const sub = blockText.substring(matchIdx);
            const punctMatch = sub.search(/[,.!?;:\n]/);
            let clause = '';
            if (punctMatch !== -1 && punctMatch >= kw.length) {
              clause = sub.substring(0, punctMatch).trim();
            } else {
              clause = sub.substring(0, 45).trim();
            }
            if (clause.length > 45) {
              const lastSpace = clause.substring(0, 45).lastIndexOf(' ');
              clause = lastSpace > kw.length ? clause.substring(0, lastSpace) : clause.substring(0, 45);
            }
            clause = clause.trim();

            if (clause.length >= kw.length) {
              const lowerClause = clause.toLowerCase();
              // Kiểm tra xem đoạn này đã được gán nhãn nào chưa
              const existing = (targetNode.scriptAnnotations || []).some(
                a =>
                  a.textBlockIndex === blockIdx &&
                  (a.selectedText.toLowerCase().includes(lowerClause) ||
                    lowerClause.includes(a.selectedText.toLowerCase()))
              );

              if (!existing) {
                targetNode.addScriptAnnotation({
                  textBlockIndex: blockIdx,
                  selectedText: clause,
                  labelKey: pattern.key,
                  labelTitle: `${pattern.icon} ${pattern.title}`,
                  color: pattern.color,
                });
                countAdded++;
              }
            }

            searchPos = matchIdx + Math.max(1, clause.length);
          }
        }
      });
    });

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);

    // Cập nhật lại state activeAnalysisNode và localVersion để modal cập nhật hiển thị ngay lập tức
    if (activeAnalysisNode && activeAnalysisNode.id === targetNode.id) {
      setActiveAnalysisNode(graph.getNode(targetNode.id) || targetNode);
    }
    setLocalVersion(v => v + 1);

    if (countAdded > 0) {
      onShowToast?.(`🏷️ Đã tự động phân loại và đánh ${countAdded} nhãn kịch bản!`);
    } else {
      onShowToast?.('Không phát hiện thêm yếu tố kịch bản mới nào cần đánh nhãn');
    }
  };

  // Tự động tìm kiếm các node cha cấu hình nhân vật và tạo liên kết chéo với các node con của chúng
  const handleAutoLinkCharacterNodes = (targetNodeId: string) => {
    const targetNode = graph.getNode(targetNodeId);
    if (!targetNode) return;

    // 1. Tìm tất cả node cha ở flow chart đang ở dạng Node cấu hình nhân vật
    const allNodes = graph.getAllNodes();
    const characterParentNodes = allNodes.filter(
      n =>
        n.id !== targetNode.id &&
        (n.nodeType === 'character_profile' || (n.characterProfiles && n.characterProfiles.length > 0))
    );

    if (characterParentNodes.length === 0) {
      onShowToast?.('Không tìm thấy node cha nào đang ở dạng Node cấu hình nhân vật trong sơ đồ!');
      return;
    }

    onPushSnapshot?.();

    // 2. Thu thập tất cả các node con của các node cha cấu hình nhân vật đó (loại bỏ trùng lặp tuyệt đối theo id và tên)
    const characterChildNodes: NodeModel[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    const tryAddChild = (child: NodeModel | undefined | null) => {
      if (!child || child.id === targetNode.id) return;
      if (seenIds.has(child.id)) return;
      const cleanTitle = (child.title || '').trim().toLowerCase();
      if (cleanTitle && seenTitles.has(cleanTitle)) return;

      seenIds.add(child.id);
      if (cleanTitle) seenTitles.add(cleanTitle);
      characterChildNodes.push(child);
    };

    characterParentNodes.forEach(parentNode => {
      // Các node con đã có sẵn trong sơ đồ
      parentNode.childrenIds.forEach(cid => {
        tryAddChild(graph.getNode(cid));
      });

      // Nếu node cha có dữ liệu bảng nhân vật nhưng chưa bung thành các node con, tự động sinh node con
      const profiles = parentNode.getCharacterProfiles();
      if (parentNode.childrenIds.length === 0 && profiles.length > 0) {
        profiles.forEach((p, pIdx) => {
          const charName = p.name?.trim() || `Nhân vật ${pIdx + 1}`;
          const cleanName = charName.toLowerCase();
          if (seenTitles.has(cleanName)) return;

          const summary = formatCharacterSummary(p, pIdx, profiles.length);
          const colors = getFactionColorScheme(p.faction);
          const newChild = graph.addNode(parentNode.id, {
            title: charName,
            content: summary,
            contents: [summary],
            nodeType: 'character_profile',
            characterProfile: { ...p, name: charName },
            characterProfiles: [{ ...p, name: charName }],
            style: {
              shape: 'rounded-rect',
              fillColor: colors.fillColor,
              textColor: colors.textColor,
              borderColor: colors.borderColor,
              borderWidth: 2,
              borderStyle: 'solid',
              fontSize: 13,
            },
          });
          if (newChild) {
            tryAddChild(newChild);
          }
        });
      }
    });

    // Bổ sung các node nhân vật cá nhân trong sơ đồ
    allNodes.forEach(n => {
      if (n.id !== targetNode.id && (n.nodeType === 'character_profile' || n.characterProfile)) {
        if (n.parentId && characterParentNodes.some(p => p.id === n.parentId)) {
          tryAddChild(n);
        }
      }
    });

    if (characterChildNodes.length === 0) {
      onShowToast?.('Đã tìm thấy node cấu hình nhân vật nhưng chưa có node con nhân vật nào!');
      return;
    }

    // Dọn dẹp bất kỳ liên kết trùng lặp cũ nào trỏ tới targetNode
    const edgePairsSeen = new Set<string>();
    const dupEdgeIdsToDelete: string[] = [];
    graph.relations.forEach((rel, relId) => {
      if (rel.sourceId === targetNode.id || rel.targetId === targetNode.id) {
        const otherId = rel.sourceId === targetNode.id ? rel.targetId : rel.sourceId;
        if (edgePairsSeen.has(otherId)) {
          dupEdgeIdsToDelete.push(relId);
        } else {
          edgePairsSeen.add(otherId);
        }
      }
    });
    dupEdgeIdsToDelete.forEach(relId => graph.relations.delete(relId));

    // 3. Tự động tạo liên kết chéo với cột cha hiện tại với các node con đó
    let linkedCount = 0;
    characterChildNodes.forEach(childChar => {
      const edge = graph.addCrossLink(childChar.id, targetNode.id, 'Nhân vật', {
        color: '#8b5cf6',
        style: 'dashed',
        arrow: 'end',
        width: 2,
      });
      if (edge) linkedCount++;
    });

    graph.meta.updatedAt = new Date().toISOString();
    onUpdateGraph?.(graph);
    onShowToast?.(
      `Đã tự động tạo liên kết chéo với ${characterChildNodes.length} node nhân vật vào cột "${targetNode.title}"!`
    );
  };

  // Render annotated text block with highlight & bold AND selected character highlights
  const renderAnnotatedText = (blockText: string, blockIdx: number, node: NodeModel) => {
    const annotations = (node.scriptAnnotations || []).filter(a => a.textBlockIndex === blockIdx);
    if (annotations.length === 0) {
      return renderTextWithCharacterHighlights(blockText, `plain-${node.id}-${blockIdx}`);
    }

    let parts: Array<{ text: string; annotation?: ScriptAnnotation }> = [{ text: blockText }];

    annotations.forEach(ann => {
      const targetPhrase = (ann.selectedText || '').trim();
      if (!targetPhrase) return;

      const nextParts: typeof parts = [];
      parts.forEach(part => {
        if (part.annotation || !part.text) {
          nextParts.push(part);
          return;
        }

        const lowerPart = part.text.toLowerCase();
        const lowerPhrase = targetPhrase.toLowerCase();
        const idx = lowerPart.indexOf(lowerPhrase);

        if (idx !== -1) {
          const before = part.text.substring(0, idx);
          const match = part.text.substring(idx, idx + targetPhrase.length);
          const after = part.text.substring(idx + targetPhrase.length);

          if (before) nextParts.push({ text: before });
          nextParts.push({ text: match, annotation: ann });
          if (after) nextParts.push({ text: after });
        } else {
          nextParts.push(part);
        }
      });
      parts = nextParts;
    });

    return (
      <>
        {parts.map((p, pIdx) => {
          if (!p.annotation) {
            return (
              <React.Fragment key={`text-part-${pIdx}`}>
                {renderTextWithCharacterHighlights(p.text, `ann-txt-${node.id}-${blockIdx}-${pIdx}`)}
              </React.Fragment>
            );
          }
          const ann = p.annotation;
          const linkedNode = ann.linkedNodeId ? graph.getNode(ann.linkedNodeId) : null;
          const labelBgColor = ann.color || '#8b5cf6';
          const isLinkedCharSelected =
            (ann.linkedNodeId && selectedCharNodeIds.has(ann.linkedNodeId)) ||
            selectedCharacterKeywords.some(
              k =>
                ann.selectedText.toLowerCase().includes(k.name.toLowerCase()) ||
                k.name.toLowerCase().includes(ann.selectedText.toLowerCase())
            );

          return (
            <mark
              key={`ann-span-${ann.id}-${pIdx}`}
              className={`font-bold underline px-1.5 py-0.5 rounded-md cursor-pointer transition-all inline-flex items-center gap-1 mx-0.5 my-0.5 shadow-2xs hover:brightness-95 ${
                isLinkedCharSelected
                  ? 'ring-3 ring-amber-400 font-extrabold shadow-md scale-[1.02] animate-pulse'
                  : ''
              }`}
              style={{
                backgroundColor: isLinkedCharSelected ? '#fde04750' : `${labelBgColor}30`,
                color: isLinkedCharSelected ? '#78350f' : labelBgColor,
                borderWidth: '1.5px',
                borderStyle: 'solid',
                borderColor: isLinkedCharSelected ? '#f59e0b' : labelBgColor,
              }}
              onClick={e => {
                e.stopPropagation();
                setInspectAnnotationInfo({ node, annotation: ann });
              }}
              title={`[${ann.labelTitle}] ${ann.selectedText} ${
                linkedNode ? `(Liên kết: [${linkedNode.id}] ${linkedNode.title})` : ''
              }`}
            >
              <span>{p.text}</span>
              <span
                className="text-[9px] font-mono px-1 py-0.2 rounded font-bold text-white shadow-2xs leading-none shrink-0"
                style={{ backgroundColor: isLinkedCharSelected ? '#d97706' : labelBgColor }}
              >
                {ann.labelTitle}
                {linkedNode ? ` 🔗[${linkedNode.id}]` : ''}
              </span>
            </mark>
          );
        })}
      </>
    );
  };

  // Xóa liên kết chéo giữa một node nhân vật và cột phân cảnh hiện tại
  const handleRemoveCrossLinkBetween = (charNodeId: string, colNodeId: string) => {
    onPushSnapshot?.();
    const removedRelIds: string[] = [];
    graph.relations.forEach((rel, relId) => {
      if (
        (rel.sourceId === charNodeId && rel.targetId === colNodeId) ||
        (rel.sourceId === colNodeId && rel.targetId === charNodeId)
      ) {
        removedRelIds.push(relId);
      }
    });

    if (removedRelIds.length > 0) {
      removedRelIds.forEach(id => graph.relations.delete(id));
      graph.meta.updatedAt = new Date().toISOString();
      onUpdateGraph?.(graph);
      const charNode = graph.getNode(charNodeId);
      onShowToast?.(`Đã xóa liên kết của nhân vật "${charNode?.title || charNodeId}" khỏi cột!`);
    }
  };

  // Helper to render a cross-link card stacked inside the single cross-link column
  const renderCrossNodeCard = (crossNode: NodeModel, crossIdx: number, parentColId: string) => {
    const isSelected = selectedCharNodeIds.has(crossNode.id);
    const checklist = crossNode.checklist || [];
    const completedCount = checklist.filter(c => c.completed).length;
    const allContents = (crossNode.contents && crossNode.contents.length > 0
      ? crossNode.contents
      : [crossNode.content || '']
    ).filter(c => c && c.trim());

    return (
      <div
        key={`cross-card-${crossNode.id}-${crossIdx}`}
        onClick={() => {
          setSelectedCharNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(crossNode.id)) {
              next.delete(crossNode.id);
            } else {
              next.add(crossNode.id);
            }
            return next;
          });
        }}
        className={`w-full rounded-xl border-2 shadow-2xs overflow-hidden p-3 flex flex-col gap-2 transition-all cursor-pointer select-none ${
          isSelected
            ? 'bg-purple-50/95 border-purple-600 ring-2 ring-purple-400 shadow-md'
            : 'bg-white border-purple-200 hover:border-purple-300 hover:bg-slate-50/50'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-purple-100">
          <div className="flex items-center gap-2 min-w-0">
            {/* Tích chọn indicator */}
            <div
              className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                isSelected
                  ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                  : 'border-slate-300 bg-white hover:border-purple-500'
              }`}
              title={isSelected ? 'Bỏ tích chọn nhân vật này' : 'Tích chọn để highlight tên nhân vật ở các cột'}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 shrink-0">
              [{crossNode.id}]
            </span>
            <h5
              className={`text-xs font-bold truncate ${isSelected ? 'text-purple-900 font-extrabold' : 'text-slate-800'}`}
              title={crossNode.title}
            >
              {crossNode.title}
            </h5>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isSelected && (
              <span className="text-[9px] bg-amber-200 text-amber-900 border border-amber-400 px-1.5 py-0.2 rounded-full font-bold">
                Highlight
              </span>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSelectNode(crossNode.id);
                onOpenDetailModal(crossNode.id);
              }}
              title="Mở popup chi tiết"
              className="p-1 text-purple-600 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleRemoveCrossLinkBetween(crossNode.id, parentColId);
              }}
              title="Xóa liên kết nhân vật này khỏi cột"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Done Toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onPushSnapshot?.();
              const isDone = crossNode.toggleCompleted();
              graph.meta.updatedAt = new Date().toISOString();
              onUpdateGraph?.(graph);
              onShowToast?.(
                isDone
                  ? `Đã hoàn thành: "${crossNode.title}"!`
                  : `Chưa hoàn thành: "${crossNode.title}"`
              );
            }}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] transition-all cursor-pointer select-none ${
              crossNode.completed
                ? 'bg-emerald-500 border-emerald-600 text-white font-bold'
                : 'bg-slate-50 border-slate-300 text-slate-600 hover:border-emerald-400'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center transition-all shrink-0 ${
                crossNode.completed ? 'bg-white text-emerald-600' : 'border border-slate-300'
              }`}
            >
              {crossNode.completed && <Check className="w-2 h-2 stroke-[3]" />}
            </div>
            <span className="font-semibold">{crossNode.completed ? 'Done' : 'Chưa xong'}</span>
          </button>
        </div>

        {/* All Content Blocks */}
        {allContents.length > 0 && (
          <div className="space-y-1.5">
            {allContents.map((block, bIdx) => (
              <div
                key={`cross-block-${crossNode.id}-${bIdx}`}
                className="p-2 bg-purple-50/60 rounded-lg border border-purple-100 text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap"
              >
                {allContents.length > 1 && (
                  <div className="text-[9px] font-bold text-purple-700 mb-0.5 uppercase tracking-wider">
                    Nội dung {bIdx + 1}
                  </div>
                )}
                {renderAnnotatedText(block, bIdx, crossNode)}
              </div>
            ))}
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px]">
            <div className="flex items-center justify-between font-semibold text-slate-600 mb-1">
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                <span>Checklist</span>
              </span>
              <span>{completedCount}/{checklist.length}</span>
            </div>
            <div className="space-y-0.5">
              {checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    onPushSnapshot?.();
                    crossNode.toggleChecklistItem(item.id);
                    graph.meta.updatedAt = new Date().toISOString();
                    onUpdateGraph?.(graph);
                  }}
                  className="flex items-center gap-1.5 text-slate-700 cursor-pointer hover:bg-white p-0.5 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {}}
                    className="rounded text-emerald-600 w-3 h-3 cursor-pointer"
                  />
                  <span className={`truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Cột Liên Kết Nhân Vật (Lùi xuống ngang các cột con)
  const renderCrossNodesColumn = (
    crossNodes: NodeModel[],
    parentNode: NodeModel
  ) => {
    if (crossNodes.length === 0) return null;
    const isCrossCollapsed = collapsedCrossCols[parentNode.id] ?? false;

    return (
      <div
        key={`script-single-cross-col-${parentNode.id}`}
        className={`${
          isCrossCollapsed ? 'w-[250px]' : 'w-[320px]'
        } shrink-0 flex flex-col gap-2.5 bg-purple-50/90 rounded-2xl border-2 border-purple-400 p-3 shadow-xl transition-all`}
      >
        {/* Column Header with Collapse Toggle */}
        <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs flex flex-col gap-1.5 select-none">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold flex items-center gap-1.5 truncate">
              <Users className="w-4 h-4 text-purple-200 shrink-0" />
              <span className="truncate">CỘT NHÂN VẬT</span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {selectedCharNodeIds.size > 0 && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedCharNodeIds(new Set());
                  }}
                  className="text-[10px] bg-purple-800 hover:bg-purple-900 text-purple-100 hover:text-white px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer"
                  title="Bỏ tích chọn tất cả để tắt highlight"
                >
                  Bỏ chọn ({selectedCharNodeIds.size})
                </button>
              )}
              <span className="text-[10px] bg-purple-700/80 font-mono px-1.5 py-0.5 rounded font-bold">
                {crossNodes.length} NV
              </span>
              {/* Nút thu gọn / mở rộng ở header để chỉ hiện tên NV dạng thu gọn */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setCollapsedCrossCols(prev => ({
                    ...prev,
                    [parentNode.id]: !prev[parentNode.id],
                  }));
                }}
                title={isCrossCollapsed ? 'Mở rộng thẻ chi tiết nhân vật' : 'Thu gọn chỉ hiện tên nhân vật'}
                className="p-1 rounded-md bg-purple-700 hover:bg-purple-800 text-purple-100 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
              >
                {isCrossCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Mở rộng</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Thu gọn</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="text-[10px] text-purple-200 truncate flex items-center justify-between">
            <span className="truncate">Liên kết cho: [{parentNode.id}] {parentNode.title}</span>
            {selectedCharNodeIds.size > 0 && (
              <span className="text-amber-300 font-bold shrink-0 ml-1">
                ✨ Đang highlight ({selectedCharNodeIds.size}) NV
              </span>
            )}
          </div>
        </div>

        {/* Stacked Cards: Dạng thu gọn (chỉ hiện tên nhân vật) hoặc dạng đầy đủ */}
        {isCrossCollapsed ? (
          <div className="flex flex-col gap-1.5 max-h-[75vh] overflow-y-auto pr-0.5">
            {crossNodes.map((crossNode, crossIdx) => {
              const isSelected = selectedCharNodeIds.has(crossNode.id);
              return (
                <div
                  key={`cross-card-compact-${crossNode.id}-${crossIdx}`}
                  onClick={() => {
                    setSelectedCharNodeIds(prev => {
                      const next = new Set(prev);
                      if (next.has(crossNode.id)) {
                        next.delete(crossNode.id);
                      } else {
                        next.add(crossNode.id);
                      }
                      return next;
                    });
                  }}
                  title={`[${crossNode.id}] ${crossNode.title} (Bấm để tích chọn highlight)`}
                  className={`w-full border-2 rounded-xl px-2.5 py-2 flex items-center justify-between gap-1.5 shadow-2xs transition-all cursor-pointer group select-none ${
                    isSelected
                      ? 'bg-purple-100/95 border-purple-600 ring-2 ring-purple-400 shadow-sm'
                      : 'bg-white hover:bg-purple-50 border-purple-200/90'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Checkbox tích chọn */}
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-slate-300 bg-white group-hover:border-purple-500'
                      }`}
                      title={isSelected ? 'Bỏ tích chọn' : 'Tích chọn để highlight'}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 shrink-0">
                      [{crossNode.id}]
                    </span>
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? 'text-purple-900 font-extrabold' : 'text-slate-800'
                      }`}
                    >
                      {crossNode.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <span className="text-[8px] bg-amber-300 text-amber-900 font-bold px-1 py-0.2 rounded">
                        Highlight
                      </span>
                    )}
                    {crossNode.completed && (
                      <div
                        className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs"
                        title="Đã xong"
                      >
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveCrossLinkBetween(crossNode.id, parentNode.id);
                      }}
                      title="Xóa liên kết nhân vật này khỏi cột"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onSelectNode(crossNode.id);
                        onOpenDetailModal(crossNode.id);
                      }}
                      title="Mở popup chi tiết"
                      className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-purple-600 transition-colors" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {crossNodes.map((crossNode, crossIdx) =>
              renderCrossNodeCard(crossNode, crossIdx, parentNode.id)
            )}
          </div>
        )}
      </div>
    );
  };

  // Recursive column renderer for script view
  const renderScriptColumn = (
    node: NodeModel,
    idx: number,
    depth: number = 0,
    visitedIds: Set<string> = new Set()
  ): React.ReactNode => {
    if (visitedIds.has(node.id)) return null;
    const currentVisited = new Set(visitedIds);
    currentVisited.add(node.id);

    const isEditing = editingTitleNodeId === node.id;
    const colorTheme = LEVEL_COLORS[depth % LEVEL_COLORS.length];
    const nodeBorderColor = node.style.borderColor || colorTheme.border;
    const childNodes = node.childrenIds
      .map(id => graph.getNode(id))
      .filter((c): c is NodeModel => !!c);

    // Get cross-linked nodes that should be placed alongside child columns
    const crossLinkRels = graph.getCrossLinksForNode(node.id);
    const seenColNodeIds = new Set<string>();
    const seenColTitles = new Set<string>();
    const preCrossLinkNodes: NodeModel[] = [];

    for (const rel of crossLinkRels) {
      const other = rel.otherNode;
      if (!other || currentVisited.has(other.id) || seenColNodeIds.has(other.id)) continue;

      const cleanTitle = (other.title || '').trim().toLowerCase();
      if (cleanTitle && seenColTitles.has(cleanTitle)) {
        currentVisited.add(other.id);
        seenColNodeIds.add(other.id);
        continue;
      }

      seenColNodeIds.add(other.id);
      if (cleanTitle) seenColTitles.add(cleanTitle);
      currentVisited.add(other.id);
      preCrossLinkNodes.push(other);
    }

    const isParent = childNodes.length > 0 || preCrossLinkNodes.length > 0;
    const isParentCardExpanded = expandedParentCards[node.id] ?? false;

    const checklist = node.checklist || [];
    const completedCount = checklist.filter(c => c.completed).length;
    const allContents = (node.contents && node.contents.length > 0
      ? node.contents
      : [node.content || '']
    ).filter(c => c && c.trim());

    return (
      <div key={`script-group-${node.id}`} className="flex gap-4 items-start shrink-0">
        {/* Main Node Column Container */}
        <div
          id={`script-col-${node.id}`}
          className="flex flex-col gap-3 shrink-0 items-start bg-white rounded-2xl border-2 p-3 shadow-xl transition-all"
          style={{ borderColor: nodeBorderColor }}
        >
          {/* Main Node Card (Cố định chiều cao khi là cột cha) */}
          <div
            className={`shrink-0 flex flex-col bg-slate-50/90 rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all ${
              isParent && !isParentCardExpanded
                ? 'w-full min-w-[320px] max-w-[420px] h-[220px]'
                : 'w-[320px]'
            }`}
          >
            {/* Column Accent Bar */}
            <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: nodeBorderColor }} />

            {/* Column Header */}
            <div className="p-3 border-b border-slate-200/80 bg-slate-100/80 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: nodeBorderColor }}
                  >
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${colorTheme.badge}`}>
                    Level {depth + 1} [{node.id}]
                  </span>
                  {isParent && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                      Cột cha
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isParent && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setExpandedParentCards(prev => ({
                          ...prev,
                          [node.id]: !prev[node.id],
                        }));
                      }}
                      title={isParentCardExpanded ? 'Thu gọn chiều cao cột cha' : 'Mở rộng chiều cao cột cha'}
                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {isParentCardExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleAutoLinkCharacterNodes(node.id);
                    }}
                    title="Tự động tạo liên kết node các nhân vật (hiển thị ở cột bên dưới ngang các cột con)"
                    className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onPushSnapshot?.();
                      onAddChildNode(node.id);
                      onShowToast?.(`Đã tạo node con cho phân cảnh "${node.title}"!`);
                    }}
                    title="Tạo node con / Cột con"
                    className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setEditingTitleNodeId(node.id);
                      setTitleDraft(node.title);
                    }}
                    title="Sửa tên phân cảnh"
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onSelectNode(node.id);
                      onOpenDetailModal(node.id);
                    }}
                    title="Mở popup chi tiết"
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {onDeleteNode && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteNode(node.id);
                      }}
                      title="Xóa phân cảnh này"
                      className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            {/* Title Edit or Display */}
            {isEditing ? (
              <input
                type="text"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={() => handleFinishEditingTitle(node.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleFinishEditingTitle(node.id);
                  if (e.key === 'Escape') setEditingTitleNodeId(null);
                }}
                className="text-sm font-bold text-slate-800 bg-white border-2 border-blue-500 rounded-lg px-2 py-1 focus:outline-none w-full shadow-2xs"
                autoFocus
              />
            ) : (
              <h4
                onDoubleClick={() => {
                  setEditingTitleNodeId(node.id);
                  setTitleDraft(node.title);
                }}
                className="text-sm font-bold text-slate-800 break-words leading-snug cursor-pointer hover:text-indigo-600 transition-colors line-clamp-2"
                title="Nhấp đúp để sửa tiêu đề"
              >
                {renderTextWithCharacterHighlights(node.title, `col-title-${node.id}`)}
              </h4>
            )}
          </div>

          {/* Column Card Body: All Content Blocks & Checklist (Cố định cuộn gọn khi là cột cha) */}
          <div
            className={`p-3 flex flex-col gap-2.5 ${
              isParent && !isParentCardExpanded ? 'flex-1 overflow-y-auto custom-scrollbar' : ''
            }`}
          >
            {/* 3 Nút Thao Tác Nhanh (Nhỏ gọn, cùng 1 hàng) */}
            <div className="grid grid-cols-3 gap-1.5 w-full items-center select-none">
              {/* 1. Nút Trạng thái: Chưa hoàn thành / Đã xong */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onPushSnapshot?.();
                  const isDone = node.toggleCompleted();
                  graph.meta.updatedAt = new Date().toISOString();
                  onUpdateGraph?.(graph);
                  onShowToast?.(
                    isDone
                      ? `Đã hoàn thành: "${node.title}"!`
                      : `Chưa hoàn thành: "${node.title}"`
                  );
                }}
                title={node.completed ? 'Đã hoàn thành (Bấm để chuyển thành Chưa hoàn thành)' : 'Chưa hoàn thành (Bấm để đánh dấu hoàn thành)'}
                className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer min-w-0 shadow-2xs ${
                  node.completed
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/70'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${
                    node.completed ? 'bg-white text-emerald-600' : 'border border-slate-400'
                  }`}
                >
                  {node.completed && <Check className="w-2 h-2 stroke-[3]" />}
                </div>
                <span className="truncate">{node.completed ? 'Đã xong' : 'Chưa xong'}</span>
              </button>

              {/* 2. Nút ✨ Phân tích */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setActiveAnalysisNode(node);
                  setActiveAnalysisBlockIdx(0);
                  setPhraseInput('');
                  setAnalysisLinkedNodeId('');
                }}
                className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg border border-purple-200 text-[10px] text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer font-semibold shadow-2xs min-w-0"
                title="Mở Khung Phân Tích & Gán Nhãn Kịch Bản"
              >
                <Wand2 className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="truncate">Phân tích</span>
              </button>

              {/* 3. Nút Liên kết nhân vật */}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleAutoLinkCharacterNodes(node.id);
                }}
                className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg border border-indigo-200 text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer font-semibold shadow-2xs min-w-0"
                title="Tự động tìm kiếm các node nhân vật và tạo liên kết chéo vào cột này"
              >
                <Users className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">Liên kết NV</span>
              </button>
            </div>

            {/* All Content Blocks */}
            {allContents.length > 0 ? (
              <div className="space-y-2">
                {allContents.map((block, bIdx) => (
                  <div
                    key={`script-block-${node.id}-${bIdx}`}
                    onMouseUp={() => handleMouseUpTextBlock(node.id, bIdx)}
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap shadow-2xs select-text cursor-text"
                  >
                    {allContents.length > 1 && (
                      <div className="text-[10px] font-bold text-indigo-600 mb-1 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>Ô nội dung {bIdx + 1}</span>
                        </span>
                      </div>
                    )}
                    {renderAnnotatedText(block, bIdx, node)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs italic bg-white">
                Chưa có nội dung chi tiết. Bấm nút xem chi tiết để bổ sung.
              </div>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Checklist</span>
                  </span>
                  <span>
                    {completedCount}/{checklist.length}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(completedCount / checklist.length) * 100}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {checklist.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onPushSnapshot?.();
                        node.toggleChecklistItem(item.id);
                        graph.meta.updatedAt = new Date().toISOString();
                        onUpdateGraph?.(graph);
                      }}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className={`truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                        {renderTextWithCharacterHighlights(item.text, `chk-${item.id}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sub-columns & Character column section (Lùi xuống ngang các cột con) */}
        {(preCrossLinkNodes.length > 0 || childNodes.length > 0) && (
          <div className="w-full pt-2 flex flex-col gap-2 border-t-2 border-indigo-200/80">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 uppercase tracking-wider px-1">
              <div className="flex items-center gap-2">
                {preCrossLinkNodes.length > 0 && (
                  <span className="flex items-center gap-1.5 text-purple-700 bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                    <Users className="w-3 h-3 text-purple-600" />
                    <span>Cột nhân vật ({preCrossLinkNodes.length})</span>
                  </span>
                )}
                {childNodes.length > 0 && (
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Cột con phân nhánh ({childNodes.length})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Side-by-side full-size sub-columns WITH CỘT NHÂN VẬT on the left */}
            <div className="flex gap-4 items-start shrink-0 pt-1">
              {/* 1. CỘT NHÂN VẬT: Lùi xuống ngang các cột con */}
              {renderCrossNodesColumn(preCrossLinkNodes, node)}

              {/* 2. CÁC CỘT CON */}
              {childNodes.map((childNode, childIdx) =>
                renderScriptColumn(childNode, childIdx, depth + 1, currentVisited)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Top Header Bar */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: stageColor }}
          >
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                KỊCH BẢN PHIM
              </span>
              <span className="text-xs text-slate-400 font-mono">[{stageNode.id}]</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{stageNode.title}</span>
            </h2>
          </div>
        </div>

        {/* Header Right Tools & Close */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleAutoLinkCharacterNodes(stageNode.id)}
            className="px-3.5 py-2 text-xs font-semibold text-purple-200 bg-purple-900/60 hover:bg-purple-800 hover:text-white border border-purple-500/50 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Tự động tìm kiếm tất cả các node cha ở flow chart đang ở dạng Node cấu hình nhân vật, sau đó tự động tạo liên kết chéo với cột cha hiện tại với các node con đó để hiển thị ở cột bên trái"
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>Tự động tạo liên kết node các nhân vật</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onPushSnapshot?.();
              onAddChildNode(stageNode.id);
              onShowToast?.(`Đã thêm phân cảnh mới vào kịch bản!`);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Phân Cảnh Cột Mới</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Đóng kịch bản phim"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Modal Main Board Body: Horizontal Scrolling Columns */}
      <div className="flex-1 overflow-auto p-6 bg-slate-900/50">
        {rootChildCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
              <Film className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Chưa có phân cảnh nào trong kịch bản này</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Hãy tạo các phân cảnh/node con đầu tiên. Chúng sẽ biến thành các cột kịch bản phân nhánh chuyên nghiệp.
            </p>
            <button
              type="button"
              onClick={() => {
                onPushSnapshot?.();
                onAddChildNode(stageNode.id);
                onShowToast?.(`Đã tạo phân cảnh đầu tiên!`);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo phân cảnh đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-6 items-start pb-8 min-w-max">
            {rootChildCards.map((cardNode, cardIdx) =>
              renderScriptColumn(cardNode, cardIdx, 0)
            )}
          </div>
        )}
      </div>

      {/* Floating Text Selection Annotation Menu */}
      {selectedTextInfo && (
        <div
          className="fixed z-50 bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex flex-col gap-2.5 max-w-sm animate-in fade-in duration-150"
          style={{
            top: `${selectedTextInfo.position.top}px`,
            left: `${selectedTextInfo.position.left}px`,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-700 pb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gán nhãn & Liên kết kịch bản</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedTextInfo(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] text-slate-300 italic bg-slate-800/80 p-2 rounded-lg border border-slate-700/80 truncate">
            "{selectedTextInfo.text}"
          </div>

          {/* Preset Labels */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              1. Chọn nhãn phân loại kịch bản
            </span>
            <div className="flex flex-wrap gap-1">
              {SCRIPT_LABELS.map(lbl => (
                <button
                  key={lbl.key}
                  type="button"
                  onClick={() => handleApplyAnnotation(lbl.key, lbl.title, lbl.color)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 hover:brightness-110 transition-all cursor-pointer shadow-2xs"
                  style={{ backgroundColor: lbl.color }}
                >
                  <span>{lbl.icon}</span>
                  <span>{lbl.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Select Linked Character / Cross Node */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              2. Liên kết nhân vật / node (Tùy chọn)
            </span>
            <select
              value={selectedLinkedNodeId}
              onChange={e => setSelectedLinkedNodeId(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Không liên kết nhân vật --</option>
              <optgroup label="Node liên kết chéo">
                {graph.getCrossLinksForNode(selectedTextInfo.nodeId).map(rel => (
                  <option key={`opt-cross-${rel.otherNode.id}`} value={rel.otherNode.id}>
                    🔗 [{rel.otherNode.id}] {rel.otherNode.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tất cả các node">
                {graph.getAllNodes().filter(n => n.id !== selectedTextInfo.nodeId).map(n => (
                  <option key={`opt-all-${n.id}`} value={n.id}>
                    [{n.id}] {n.title}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Confirm Apply Annotation Button */}
          <button
            type="button"
            onClick={() => {
              handleApplyAnnotation('tag_link', 'Liên kết kịch bản', '#8b5cf6');
            }}
            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gán Nhãn & Lưu Liên Kết</span>
          </button>
        </div>
      )}

      {/* Inspect Annotation Modal */}
      {inspectAnnotationInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setInspectAnnotationInfo(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-w-sm w-full space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Chi tiết gán nhãn kịch bản</span>
              </span>
              <button
                type="button"
                onClick={() => setInspectAnnotationInfo(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl border bg-slate-50 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-md font-bold text-white text-[10px]"
                  style={{ backgroundColor: inspectAnnotationInfo.annotation.color }}
                >
                  {inspectAnnotationInfo.annotation.labelTitle}
                </span>
              </div>
              <div className="font-bold text-slate-800 italic bg-white p-2 rounded-lg border border-slate-200">
                "{inspectAnnotationInfo.annotation.selectedText}"
              </div>
              {inspectAnnotationInfo.annotation.linkedNodeId && (() => {
                const linkedNode = graph.getNode(inspectAnnotationInfo.annotation.linkedNodeId);
                return (
                  <div className="flex items-center justify-between bg-purple-50 text-purple-900 p-2 rounded-lg border border-purple-200">
                    <span className="font-semibold text-[11px] truncate">
                      🔗 Nhân vật: [{inspectAnnotationInfo.annotation.linkedNodeId}] {linkedNode?.title || 'Node'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setInspectAnnotationInfo(null);
                        onSelectNode(inspectAnnotationInfo.annotation.linkedNodeId!);
                      }}
                      className="text-[10px] font-bold text-purple-700 underline flex items-center gap-0.5 shrink-0"
                    >
                      <span>Xem node</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleRemoveAnnotation(
                    inspectAnnotationInfo.node,
                    inspectAnnotationInfo.annotation.id
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa nhãn này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Script Analysis Workbench Dialog Modal */}
      {activeAnalysisNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActiveAnalysisNode(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-purple-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Workbench Header */}
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-700 flex items-center justify-center shrink-0">
                  <Wand2 className="w-4 h-4 text-purple-200" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase">
                    KHUNG PHÂN TÍCH KỊCH BẢN [{activeAnalysisNode.id}]
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeAnalysisNode.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* 🤖 Auto Tag Character Names Button */}
                <button
                  type="button"
                  onClick={() => handleAutoTagCharacterNodes(activeAnalysisNode)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Tự động quét kịch bản và gán tag màu cho các tên Nhân vật/Node xuất hiện trong văn bản"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Tự Động Tag Tên Nhân Vật</span>
                </button>

                {/* 🏷️ Auto Classify Script Elements Button */}
                <button
                  type="button"
                  onClick={() => handleAutoClassifyScript(activeAnalysisNode)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Tự động phân tích kịch bản và đánh nhãn các yếu tố: Biến cố kích hoạt, Cài cắm manh mối, Điểm lật kịch tính, Vì - Nhưng, Động cơ, Xung đột, Đỉnh điểm"
                >
                  <Tag className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Tự Động Đánh Nhãn Phân Loại Kịch Bản</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAnalysisNode(null)}
                  className="text-purple-300 hover:text-white p-1 rounded-lg hover:bg-purple-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Workbench Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Content Block Selector */}
              {(activeAnalysisNode.contents || [activeAnalysisNode.content || '']).map((blockText, blockIdx) => (
                <div key={`workbench-block-${blockIdx}`} className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ô nội dung kịch bản {blockIdx + 1}</span>
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold">
                      (Bôi đen văn bản bên dưới hoặc gõ cụm từ cần gán nhãn)
                    </span>
                  </div>

                  {/* Script Text Box with direct text selection */}
                  <div
                    onMouseUp={() => {
                      const sel = window.getSelection();
                      if (sel && !sel.isCollapsed) {
                        const txt = sel.toString().trim();
                        if (txt) {
                          setActiveAnalysisBlockIdx(blockIdx);
                          setPhraseInput(txt);
                        }
                      }
                    }}
                    className="p-3 bg-white rounded-lg border border-purple-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap select-text cursor-text min-h-[60px] shadow-2xs"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  >
                    {renderAnnotatedText(blockText, blockIdx, activeAnalysisNode)}
                  </div>
                </div>
              ))}

              {/* Phrase Input & Labeling Controls */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-3 shadow-md">
                <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <Highlighter className="w-4 h-4 text-indigo-400" />
                    <span>Cụm từ kịch bản được chọn để gán nhãn</span>
                  </span>
                </div>

                <input
                  type="text"
                  value={phraseInput}
                  onChange={e => setPhraseInput(e.target.value)}
                  placeholder="Bôi đen văn bản ở trên hoặc gõ cụm từ kịch bản cần gán nhãn..."
                  className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-semibold"
                />

                {/* Preset Label Buttons */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    1. Chọn nhãn phân loại kịch bản
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {SCRIPT_LABELS.map(lbl => (
                      <button
                        key={`wb-lbl-${lbl.key}`}
                        type="button"
                        onClick={() => {
                          if (!phraseInput.trim()) {
                            onShowToast?.('Vui lòng bôi đen văn bản hoặc nhập cụm từ kịch bản!');
                            return;
                          }
                          onPushSnapshot?.();
                          activeAnalysisNode.addScriptAnnotation({
                            textBlockIndex: activeAnalysisBlockIdx,
                            selectedText: phraseInput.trim(),
                            labelKey: lbl.key,
                            labelTitle: lbl.title,
                            color: lbl.color,
                            linkedNodeId: analysisLinkedNodeId || undefined,
                          });
                          graph.meta.updatedAt = new Date().toISOString();
                          onUpdateGraph?.(graph);
                          setActiveAnalysisNode(graph.getNode(activeAnalysisNode.id) || activeAnalysisNode);
                          setLocalVersion(v => v + 1);
                          onShowToast?.(`Đã gán nhãn "${lbl.title}" cho cụm từ!`);
                          setPhraseInput('');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1 hover:brightness-110 transition-all cursor-pointer shadow-sm"
                        style={{ backgroundColor: lbl.color }}
                      >
                        <span>{lbl.icon}</span>
                        <span>{lbl.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Character / Node Cross Link Dropdown */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    2. Liên kết nhân vật / node (Tùy chọn)
                  </span>
                  <select
                    value={analysisLinkedNodeId}
                    onChange={e => setAnalysisLinkedNodeId(e.target.value)}
                    className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Không liên kết nhân vật --</option>
                    <optgroup label="Node liên kết chéo">
                      {graph.getCrossLinksForNode(activeAnalysisNode.id).map(rel => (
                        <option key={`wb-cross-${rel.otherNode.id}`} value={rel.otherNode.id}>
                          🔗 [{rel.otherNode.id}] {rel.otherNode.title}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Tất cả các node">
                      {graph.getAllNodes().filter(n => n.id !== activeAnalysisNode.id).map(n => (
                        <option key={`wb-all-${n.id}`} value={n.id}>
                          [{n.id}] {n.title}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Existing Annotations List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between border-b border-slate-200 pb-1">
                  <span className="flex items-center gap-1 text-purple-900">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>Danh sách nhãn đã gán trong phân cảnh này ({activeAnalysisNode.scriptAnnotations.length})</span>
                  </span>
                </div>

                {activeAnalysisNode.scriptAnnotations.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-2 text-center bg-slate-50 rounded-lg">
                    Chưa có đoạn kịch bản nào được gán nhãn.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeAnalysisNode.scriptAnnotations.map(ann => {
                      const linkedNode = ann.linkedNodeId ? graph.getNode(ann.linkedNodeId) : null;
                      return (
                        <div
                          key={`wb-ann-item-${ann.id}`}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span
                              className="px-2 py-0.5 rounded font-bold text-white text-[10px] shrink-0"
                              style={{ backgroundColor: ann.color }}
                            >
                              {ann.labelTitle}
                            </span>
                            <span className="font-bold text-slate-800 italic truncate max-w-[180px]">
                              "{ann.selectedText}"
                            </span>
                            {linkedNode && (
                              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-mono font-semibold">
                                🔗 [{linkedNode.id}] {linkedNode.title}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAnnotation(activeAnalysisNode, ann.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Xóa nhãn này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
