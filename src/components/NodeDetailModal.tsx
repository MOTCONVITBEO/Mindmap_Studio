import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Copy,
  Check,
  Plus,
  Trash2,
  GitBranch,
  Link as LinkIcon,
  CheckSquare,
  FileText,
  Tag,
  ArrowRight,
  Settings,
  Palette,
  AlertTriangle,
  User,
  Sparkles,
  Shield,
  Heart,
  Zap,
  Flame,
  Award,
  HelpCircle,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  ClipboardPaste,
  ListPlus,
} from 'lucide-react';
import { NodeModel } from '../models/NodeModel';
import { MindmapGraph } from '../models/MindmapGraph';
import { NodeShape, BorderStyle, RelationArrowType, LinkStyleConfig, NodeType, CharacterProfileData, CharacterColumnDef } from '../types/mindmap';
import { useTranslation } from '../i18n/LanguageContext';
import { LinkStyleControl } from './LinkStyleControl';
import { ConfirmModal } from './ConfirmModal';
import { CharacterQualityModal } from './CharacterQualityModal';
import {
  parseCharacterSheet,
  parseCharacterSheetWithColumns,
  DEFAULT_CHARACTER_COLUMNS,
  isCharacterProfileTable,
  formatCharacterSummary,
  getFactionColorScheme,
} from '../services/characterParser';

interface NodeDetailModalProps {
  isOpen: boolean;
  nodeId: string | null;
  graph: MindmapGraph;
  onClose: () => void;
  onUpdateNode: (node: NodeModel) => void;
  onReparent: (nodeId: string, newParentId: string | null) => boolean;
  onAddCrossLink: (
    sourceId: string,
    targetId: string,
    label?: string,
    options?: {
      color?: string;
      style?: BorderStyle;
      arrow?: RelationArrowType;
      width?: number;
    }
  ) => void;
  onUpdateCrossLink?: (
    edgeId: string,
    updates: {
      color?: string;
      style?: BorderStyle;
      arrow?: RelationArrowType;
      width?: number;
      label?: string;
    }
  ) => void;
  onRemoveCrossLink: (edgeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateGraph?: (graph: MindmapGraph) => void;
  onPushSnapshot?: () => void;
  onShowToast?: (msg: string) => void;
}

const COLOR_PRESETS = [
  { fill: '#ffffff', border: '#3b82f6', text: '#1e293b', label: 'Trắng / Xanh dương' },
  { fill: '#eff6ff', border: '#60a5fa', text: '#1e40af', label: 'Xanh da trời nhạt' },
  { fill: '#f0fdf4', border: '#4ade80', text: '#166534', label: 'Xanh lục dịu' },
  { fill: '#fefce8', border: '#facc15', text: '#854d0e', label: 'Vàng kem' },
  { fill: '#fff7ed', border: '#fb923c', text: '#9a3412', label: 'Cam phấn' },
  { fill: '#fef2f2', border: '#f87171', text: '#991b1b', label: 'Đỏ hồng' },
  { fill: '#faf5ff', border: '#c084fc', text: '#6b21a8', label: 'Tím mộng mơ' },
  { fill: '#fdf4ff', border: '#f472b6', text: '#86198f', label: 'Hồng phấn' },
  { fill: '#f8fafc', border: '#64748b', text: '#0f172a', label: 'Xám thanh lịch' },
  { fill: '#1e293b', border: '#475569', text: '#f8fafc', label: 'Tối sang trọng' },
];

const CROSSLINK_COLORS = [
  '#8b5cf6', // Tím
  '#3b82f6', // Xanh dương
  '#10b981', // Xanh lục
  '#f59e0b', // Cam / Amber
  '#ef4444', // Đỏ hồng
  '#64748b', // Xám
];

export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  isOpen,
  nodeId,
  graph,
  onClose,
  onUpdateNode,
  onReparent,
  onAddCrossLink,
  onUpdateCrossLink,
  onRemoveCrossLink,
  onDeleteNode,
  onUpdateGraph,
  onPushSnapshot,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'content' | 'config'>('content');
  const [copied, setCopied] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [targetLinkId, setTargetLinkId] = useState('');
  const [targetLinkLabel, setTargetLinkLabel] = useState('');
  const [linkStyle, setLinkStyle] = useState<BorderStyle>('dashed');
  const [linkColor, setLinkColor] = useState<string>('#8b5cf6');
  const [linkArrow, setLinkArrow] = useState<RelationArrowType>('end');
  const [linkWidth, setLinkWidth] = useState<number>(2);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [charViewMode, setCharViewMode] = useState<'table' | 'cards'>('table');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMode, setPasteMode] = useState<'update' | 'replace' | 'append'>('update');
  const [copiedTable, setCopiedTable] = useState(false);
  const [autoCreateChildNodes, setAutoCreateChildNodes] = useState(false);
  const [characterColumns, setCharacterColumns] = useState<CharacterColumnDef[]>([]);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractedItems, setExtractedItems] = useState<
    Array<{
      id: string;
      title: string;
      content: string;
      selected: boolean;
      profileData?: CharacterProfileData;
    }>
  >([]);
  const [clearSourceContentAfterExtract, setClearSourceContentAfterExtract] = useState(false);
  const [isConfirmDeleteAllCrossLinksOpen, setIsConfirmDeleteAllCrossLinksOpen] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  // Reset to content tab when opening a new node
  useEffect(() => {
    if (isOpen) {
      setActiveTab('content');
      setLinkError(null);
      if (nodeId) {
        const currentNode = graph.getNode(nodeId);
        if (currentNode) {
          setCharacterColumns(currentNode.getCharacterColumns());
          if (currentNode.childrenIds && currentNode.childrenIds.length > 0) {
            setAutoCreateChildNodes(true);
          }
        }
      }
    }
  }, [isOpen, nodeId]);

  if (!isOpen || !nodeId) return null;

  const node = graph.getNode(nodeId);
  if (!node) return null;

  const isRoot = node.id === graph.rootId;
  const allNodes = graph.getAllNodes();
  const crossRelations = graph
    .getAllRelations()
    .filter(r => r.sourceId === nodeId || r.targetId === nodeId);

  const handleCopyId = () => {
    navigator.clipboard.writeText(node.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    node.addChecklistItem(newChecklistText.trim());
    setNewChecklistText('');
    onUpdateNode(node);
  };

  const handleToggleChecklist = (itemId: string) => {
    node.toggleChecklistItem(itemId);
    onUpdateNode(node);
  };

  const handleDeleteChecklist = (itemId: string) => {
    node.removeChecklistItem(itemId);
    onUpdateNode(node);
  };

  const handleTitleChange = (val: string) => {
    node.updateTitle(val);
    onUpdateNode(node);
  };

  const syncProfilesSummary = () => {
    const profiles = node.getCharacterProfiles();
    if (profiles.length === 0) return;
    const summaries = profiles
      .map((p, i) => formatCharacterSummary(p, i, profiles.length))
      .join('\n\n');
    node.updateContentBlock(0, summaries);
  };

  // Tự động đồng bộ toàn bộ dữ liệu bảng từ node cha xuống các node con nhân vật ngoài sơ đồ
  const syncCharacterChildNodes = (forceCreateNewChildren: boolean = false) => {
    if (node.nodeType !== 'character_profile') return { updatedCount: 0, createdCount: 0 };
    const profiles = node.getCharacterProfiles();
    if (profiles.length === 0) return { updatedCount: 0, createdCount: 0 };

    const existingChildren = node.childrenIds
      .map(cid => graph.getNode(cid))
      .filter(Boolean) as NodeModel[];

    // Nếu đã có node con hoặc người dùng bật tạo mới thì tự động tạo/cập nhật
    const shouldCreateNew = forceCreateNewChildren || autoCreateChildNodes;
    if (existingChildren.length === 0 && !shouldCreateNew) {
      return { updatedCount: 0, createdCount: 0 };
    }

    let updatedCount = 0;
    let createdCount = 0;
    const matchedChildIds = new Set<string>();

    profiles.forEach((row, rIdx) => {
      const charName =
        row.name?.trim() ||
        `Nhân vật ${rIdx + 1}${row.roleType ? ` (${row.roleType})` : row.faction ? ` (${row.faction})` : ''}`;
      const summary = formatCharacterSummary(row, rIdx, profiles.length);
      const colors = getFactionColorScheme(row.faction);

      // Tìm node con tương ứng:
      // 1. Khớp theo tên nhân vật (cCharName hoặc cTitle)
      // 2. Khớp dự phòng theo vị trí index (rIdx) nếu node con đó chưa được ghép
      let matchingChild = existingChildren.find(c => {
        if (matchedChildIds.has(c.id)) return false;
        const cCharName = c.characterProfile?.name?.trim().toLowerCase();
        const cTitle = c.title.trim().toLowerCase();
        const targetLower = charName.toLowerCase();
        return (
          (cCharName && cCharName === row.name?.trim().toLowerCase()) ||
          cTitle === targetLower ||
          (row.name && row.name.trim().length >= 2 && cTitle.includes(row.name.trim().toLowerCase()))
        );
      });

      // Nếu tên thay đổi mà không tìm thấy theo tên, thử ghép theo index hàng tương ứng
      if (!matchingChild && existingChildren[rIdx] && !matchedChildIds.has(existingChildren[rIdx].id)) {
        matchingChild = existingChildren[rIdx];
      }

      if (matchingChild) {
        matchedChildIds.add(matchingChild.id);
        // Cập nhật toàn bộ thông tin mới nhất từ bảng vào node con
        matchingChild.title = charName;
        matchingChild.nodeType = 'character_profile';
        matchingChild.characterProfile = { ...row, name: charName };
        matchingChild.characterProfiles = [{ ...row, name: charName }];
        matchingChild.content = summary;
        matchingChild.contents = [summary];
        if (colors.borderColor) matchingChild.style.borderColor = colors.borderColor;
        matchingChild.style.borderWidth = 2;
        if (colors.fillColor) matchingChild.style.fillColor = colors.fillColor;
        if (colors.textColor) matchingChild.style.textColor = colors.textColor;
        updatedCount++;
      } else if (shouldCreateNew) {
        // Tạo mới node con
        const newChild = graph.addNode(node.id, {
          title: charName,
          content: summary,
          contents: [summary],
          nodeType: 'character_profile',
          characterProfile: { ...row, name: charName },
          characterProfiles: [{ ...row, name: charName }],
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
          matchedChildIds.add(newChild.id);
          createdCount++;
        }
      }
    });

    if (updatedCount > 0 || createdCount > 0) {
      graph.meta.updatedAt = new Date().toISOString();
      if (onUpdateGraph) {
        onUpdateGraph(graph);
      } else {
        onUpdateNode(node);
      }
    }

    return { updatedCount, createdCount };
  };

  const handleUpdateCharacterProfileRowField = (
    rIdx: number,
    field: string,
    val: string,
    customLabel?: string
  ) => {
    const list = node.getCharacterProfiles();
    const curr = list[rIdx];
    if (!curr) return;

    const updates: any = { [field]: val };
    if (customLabel) {
      updates.customFields = {
        ...(curr.customFields || {}),
        [customLabel]: val,
      };
    }
    node.updateCharacterProfileAtIndex(rIdx, updates);
    syncProfilesSummary();
    syncCharacterChildNodes(false);
    onUpdateNode(node);
  };

  const handleAddCustomColumn = () => {
    if (!newColumnName.trim()) return;
    const label = newColumnName.trim();
    const slug =
      'col_' +
      label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const newCol: CharacterColumnDef = {
      key: slug,
      label,
      isCustom: true,
    };
    node.addCharacterColumn(newCol);
    const updatedCols = node.getCharacterColumns();
    setCharacterColumns(updatedCols);
    setNewColumnName('');
    setShowAddColumnModal(false);
    onUpdateNode(node);
    onShowToast?.(`Đã thêm cột "${label}" vào bảng cấu hình!`);
  };

  const handleRemoveCustomColumn = (colKey: string, colLabel: string) => {
    node.removeCharacterColumn(colKey);
    const updatedCols = node.getCharacterColumns();
    setCharacterColumns(updatedCols);
    onUpdateNode(node);
    onShowToast?.(`Đã xóa cột "${colLabel}"!`);
  };

  const handleUpdateCharacterProfileField = (field: string, val: string) => {
    handleUpdateCharacterProfileRowField(0, field, val);
  };

  const handleAddCharacterRow = () => {
    node.addCharacterProfile({
      faction: 'Chánh diện',
      roleType: 'Nhân vật phụ',
      name: '',
    });
    syncProfilesSummary();
    if (autoCreateChildNodes || node.childrenIds.length > 0) {
      syncCharacterChildNodes(true);
    }
    onUpdateNode(node);
  };

  const handleRemoveCharacterRow = (rIdx: number) => {
    const list = node.getCharacterProfiles();
    if (list.length <= 1) {
      // If only 1 row left, reset fields
      node.updateCharacterProfileAtIndex(0, {
        faction: 'Chánh diện',
        roleType: 'Nhân vật chính',
        name: '',
        strengths: '',
        weaknesses: '',
        want: '',
        need: '',
        ghostWound: '',
        theLie: '',
        conflict: '',
        actionTendency: '',
        visualArchetype: '',
        customFields: {},
      });
    } else {
      node.removeCharacterProfileAtIndex(rIdx);
    }
    syncProfilesSummary();
    syncCharacterChildNodes(false);
    onUpdateNode(node);
  };

  const handleDuplicateCharacterRow = (rIdx: number) => {
    const list = node.getCharacterProfiles();
    const current = list[rIdx];
    if (!current) return;
    node.addCharacterProfile({
      ...current,
      name: current.name ? `${current.name} (Bản sao)` : '',
    });
    syncProfilesSummary();
    if (autoCreateChildNodes || node.childrenIds.length > 0) {
      syncCharacterChildNodes(true);
    }
    onUpdateNode(node);
  };

  const handleApplyPasteFromSheet = () => {
    if (!pasteText.trim()) return;
    const { profiles: newProfiles, columns: detectedColumns } = parseCharacterSheetWithColumns(pasteText);

    if (newProfiles.length === 0) {
      onShowToast?.('Không thể nhận diện bảng nhân vật từ dữ liệu đã dán. Vui lòng kiểm tra lại!');
      return;
    }

    // Auto merge any new columns from sheet into table
    let currentCols = node.getCharacterColumns();
    let newColsCount = 0;
    detectedColumns.forEach(dCol => {
      const exists = currentCols.some(
        c => c.key === dCol.key || c.label.trim().toLowerCase() === dCol.label.trim().toLowerCase()
      );
      if (!exists) {
        currentCols.push(dCol);
        newColsCount++;
      }
    });
    node.setCharacterColumns(currentCols);
    setCharacterColumns([...currentCols]);

    const currentProfiles = node.getCharacterProfiles();
    let finalProfiles: CharacterProfileData[] = [];
    let updatedCount = 0;
    let addedCount = 0;

    if (
      pasteMode === 'replace' ||
      currentProfiles.length === 0 ||
      (currentProfiles.length === 1 && !currentProfiles[0].name.trim() && !currentProfiles[0].want.trim())
    ) {
      // Ghi đè toàn bộ
      finalProfiles = newProfiles;
      addedCount = newProfiles.length;
    } else if (pasteMode === 'append') {
      // Thêm tiếp vào cuối bảng
      finalProfiles = [...currentProfiles, ...newProfiles];
      addedCount = newProfiles.length;
    } else {
      // Chế độ CẬP NHẬT & BỔ SUNG (Update & Merge theo Tên nhân vật)
      const mergedList = currentProfiles.map(p => ({ ...p }));

      newProfiles.forEach(newP => {
        const targetName = newP.name.trim().toLowerCase();
        const existingIdx = mergedList.findIndex(
          p =>
            p.name.trim().toLowerCase() === targetName ||
            (targetName.length >= 2 && p.name.trim().toLowerCase().includes(targetName)) ||
            (p.name.trim().length >= 2 && targetName.includes(p.name.trim().toLowerCase()))
        );

        if (existingIdx !== -1) {
          // Cập nhật thuộc tính dòng nhân vật cũ (nếu ô mới có nội dung thì cập nhật, nếu rỗng thì giữ nguyên)
          const old = mergedList[existingIdx];
          mergedList[existingIdx] = {
            ...old,
            ...newP,
            faction: newP.faction?.trim() || old.faction,
            roleType: newP.roleType?.trim() || old.roleType,
            name: newP.name?.trim() || old.name,
            strengths: newP.strengths?.trim() || old.strengths,
            weaknesses: newP.weaknesses?.trim() || old.weaknesses,
            want: newP.want?.trim() || old.want,
            need: newP.need?.trim() || old.need,
            ghostWound: newP.ghostWound?.trim() || old.ghostWound,
            theLie: newP.theLie?.trim() || old.theLie,
            conflict: newP.conflict?.trim() || old.conflict,
            actionTendency: newP.actionTendency?.trim() || old.actionTendency,
            visualArchetype: newP.visualArchetype?.trim() || old.visualArchetype,
            customFields: {
              ...(old.customFields || {}),
              ...(newP.customFields || {}),
            },
          };
          updatedCount++;
        } else {
          // Thêm nhân vật mới vào danh sách
          mergedList.push({ ...newP });
          addedCount++;
        }
      });

      finalProfiles = mergedList;
    }

    node.setCharacterProfiles(finalProfiles);
    if (finalProfiles.length === 1 && finalProfiles[0]?.name) {
      if (!node.title || node.title.startsWith('Node') || node.title.startsWith('Tiến trình')) {
        node.updateTitle(finalProfiles[0].name);
      }
    } else if (finalProfiles.length > 1) {
      if (!node.title || node.title.startsWith('Node') || node.title.startsWith('Tiến trình')) {
        node.updateTitle(`Danh sách nhân vật (${finalProfiles.length} NV)`);
      }
    }

    syncProfilesSummary();
    const { updatedCount: uChild, createdCount: cChild } = syncCharacterChildNodes(
      autoCreateChildNodes || node.childrenIds.length > 0
    );
    setShowPasteBox(false);
    setPasteText('');
    onUpdateNode(node);

    if (pasteMode === 'update') {
      const msg: string[] = [];
      if (updatedCount > 0) msg.push(`cập nhật ${updatedCount} nhân vật`);
      if (addedCount > 0) msg.push(`thêm mới ${addedCount} nhân vật`);
      if (newColsCount > 0) msg.push(`tự động thêm ${newColsCount} cột mới`);
      if (uChild > 0 || cChild > 0) msg.push(`(đồng bộ ${uChild} và tạo ${cChild} node con ngoài sơ đồ)`);
      const feedback = msg.length > 0 ? `Đã ${msg.join(', ')} thành công!` : 'Dữ liệu đã đồng bộ!';
      onShowToast?.(feedback);
    } else if (pasteMode === 'append') {
      const msg = [`Đã thêm nối tiếp ${addedCount} nhân vật vào cuối bảng`];
      if (newColsCount > 0) msg.push(`(tự động thêm ${newColsCount} cột mới)`);
      if (uChild > 0 || cChild > 0) msg.push(`(đồng bộ ${uChild} và tạo ${cChild} node con)`);
      onShowToast?.(msg.join(' '));
    } else {
      const msg = [`Đã ghi đè thành công ${finalProfiles.length} nhân vật vào bảng`];
      if (newColsCount > 0) msg.push(`(tự động thêm ${newColsCount} cột mới)`);
      if (uChild > 0 || cChild > 0) msg.push(`(đồng bộ ${uChild} và tạo ${cChild} node con)`);
      onShowToast?.(msg.join(' '));
    }
  };

  const handleCopyTableToClipboard = () => {
    const currentCols = node.getCharacterColumns();
    const headers = currentCols.map(c => c.label);
    const profiles = node.getCharacterProfiles();
    const rows = profiles.map(p =>
      currentCols
        .map(c => {
          let val = '';
          if (c.key === 'visualArchetype') {
            val = p.visualArchetype || p.customFields?.[c.label] || '';
          } else if (c.isCustom) {
            val = p.customFields?.[c.label] || p[c.key] || '';
          } else {
            val = p[c.key] || p.customFields?.[c.label] || '';
          }
          return val.includes('\t') || val.includes('\n') || val.includes('"')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join('\t')
    );
    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2000);
  };

  const handleSyncNameToTitle = (rIdx: number = 0) => {
    const list = node.getCharacterProfiles();
    if (list[rIdx]?.name?.trim()) {
      node.updateTitle(list[rIdx].name.trim());
      onUpdateNode(node);
    }
  };

  const handleUpdateCharacterFromQuality = (index: number, updatedChar: CharacterProfileData) => {
    onPushSnapshot?.();
    const profiles = node.getCharacterProfiles();
    if (index >= 0 && index < profiles.length) {
      profiles[index] = { ...profiles[index], ...updatedChar };
      node.setCharacterProfiles(profiles);
      syncProfilesSummary();
      onUpdateNode(node);
    }
  };

  const handleSaveAllFromQuality = (updatedList: CharacterProfileData[]) => {
    onPushSnapshot?.();
    node.setCharacterProfiles(updatedList);
    syncProfilesSummary();
    onUpdateNode(node);
    syncCharacterChildNodes(true);
  };

  const handleApplyAndCreateChildNodes = (closeModalAfter: boolean = true, forceCreate: boolean = false) => {
    // 1. Sync profiles summary to parent node content
    syncProfilesSummary();
    onUpdateNode(node);

    // 2. Tự động đồng bộ và tạo mới node con nếu có
    if (node.nodeType === 'character_profile') {
      onPushSnapshot?.();
      const shouldCreate = autoCreateChildNodes || forceCreate || node.childrenIds.length > 0;
      const { updatedCount, createdCount } = syncCharacterChildNodes(shouldCreate);

      const msg: string[] = [];
      if (createdCount > 0) msg.push(`Đã tạo mới ${createdCount} node con`);
      if (updatedCount > 0) msg.push(`tự động cập nhật ${updatedCount} node con`);
      const toastText =
        msg.length > 0
          ? `${msg.join(', ')} tương ứng cho nhân vật!`
          : 'Đã lưu cấu hình và tự động đồng bộ dữ liệu nhân vật!';
      onShowToast?.(toastText);
    } else {
      onShowToast?.('Đã lưu thành công!');
    }

    if (closeModalAfter) {
      onClose();
    }
  };

  const parseChildNodesFromContent = (): Array<{
    id: string;
    title: string;
    content: string;
    selected: boolean;
    profileData?: CharacterProfileData;
  }> => {
    const result: Array<{
      id: string;
      title: string;
      content: string;
      selected: boolean;
      profileData?: CharacterProfileData;
    }> = [];

    // 1. If character profile node and has rows
    if (node.nodeType === 'character_profile' && node.getCharacterProfiles().length > 0) {
      const profiles = node.getCharacterProfiles();
      profiles.forEach((p, idx) => {
        const charName =
          p.name?.trim() ||
          `Nhân vật ${idx + 1}${p.roleType ? ` (${p.roleType})` : p.faction ? ` (${p.faction})` : ''}`;
        const summary = formatCharacterSummary(p, idx, profiles.length);

        result.push({
          id: `ext-char-${idx}-${Date.now()}`,
          title: charName,
          content: summary,
          selected: true,
          profileData: { ...p, name: charName },
        });
      });
      return result;
    }

    // 2. Check if any content block contains a character table
    const allBlocks = (node.contents && node.contents.length > 0 ? node.contents : [node.content || '']).filter(
      b => b && b.trim()
    );

    const tableBlock = allBlocks.find(b => isCharacterProfileTable(b));
    if (tableBlock) {
      const parsedProfiles = parseCharacterSheet(tableBlock);
      if (parsedProfiles.length > 0) {
        parsedProfiles.forEach((p, idx) => {
          const charName =
            p.name?.trim() ||
            `Nhân vật ${idx + 1}${p.roleType ? ` (${p.roleType})` : p.faction ? ` (${p.faction})` : ''}`;
          const summary = formatCharacterSummary(p, idx, parsedProfiles.length);

          result.push({
            id: `ext-char-table-${idx}-${Date.now()}`,
            title: charName,
            content: summary,
            selected: true,
            profileData: { ...p, name: charName },
          });
        });
        return result;
      }
    }

    // 3. Standard content blocks
    allBlocks.forEach((block, bIdx) => {
      const lines = block
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      if (lines.length > 1) {
        lines.forEach((line, lIdx) => {
          const clean = line
            .replace(/^[-*+•–—]\s*/, '')
            .replace(/^(?:[0-9]+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[\.\)\/]\s*/, '')
            .replace(/^#+\s*/, '')
            .trim();

          if (!clean) return;

          if (clean.includes(':') || clean.includes(' - ') || clean.includes(' — ')) {
            const sep = clean.includes(':') ? ':' : clean.includes(' - ') ? ' - ' : ' — ';
            const parts = clean.split(sep);
            const t = parts[0].trim();
            const c = parts.slice(1).join(sep).trim();
            if (t) {
              result.push({
                id: `ext-${bIdx}-${lIdx}-${Date.now()}`,
                title: t,
                content: c,
                selected: true,
              });
              return;
            }
          }

          if (clean.length <= 60) {
            result.push({
              id: `ext-${bIdx}-${lIdx}-${Date.now()}`,
              title: clean,
              content: '',
              selected: true,
            });
          } else {
            const firstPunct = clean.search(/[.,!?;:]/);
            if (firstPunct > 5 && firstPunct < 60) {
              result.push({
                id: `ext-${bIdx}-${lIdx}-${Date.now()}`,
                title: clean.substring(0, firstPunct).trim(),
                content: clean.substring(firstPunct + 1).trim(),
                selected: true,
              });
            } else {
              result.push({
                id: `ext-${bIdx}-${lIdx}-${Date.now()}`,
                title: `${clean.substring(0, 45).trim()}...`,
                content: clean,
                selected: true,
              });
            }
          }
        });
      } else if (lines.length === 1) {
        const line = lines[0];
        const clean = line
          .replace(/^[-*+•–—]\s*/, '')
          .replace(/^(?:[0-9]+|[a-zA-Z])[\.\)\/]\s*/, '')
          .replace(/^#+\s*/, '')
          .trim();

        if (clean.includes(':') || clean.includes(' - ') || clean.includes(' — ')) {
          const sep = clean.includes(':') ? ':' : clean.includes(' - ') ? ' - ' : ' — ';
          const parts = clean.split(sep);
          result.push({
            id: `ext-${bIdx}-0-${Date.now()}`,
            title: parts[0].trim(),
            content: parts.slice(1).join(sep).trim(),
            selected: true,
          });
        } else if (clean.length <= 60) {
          result.push({
            id: `ext-${bIdx}-0-${Date.now()}`,
            title: clean,
            content: '',
            selected: true,
          });
        } else {
          const firstPunct = clean.search(/[.,!?;:]/);
          if (firstPunct > 5 && firstPunct < 60) {
            result.push({
              id: `ext-${bIdx}-0-${Date.now()}`,
              title: clean.substring(0, firstPunct).trim(),
              content: clean.substring(firstPunct + 1).trim(),
              selected: true,
            });
          } else {
            result.push({
              id: `ext-${bIdx}-0-${Date.now()}`,
              title: `${clean.substring(0, 45).trim()}...`,
              content: clean,
              selected: true,
            });
          }
        }
      }
    });

    return result;
  };

  const handleConvertContentToCharacterTable = (blockText: string) => {
    if (!blockText || !blockText.trim()) {
      node.updateNodeType('character_profile');
      if (node.getCharacterProfiles().length === 0) {
        node.addCharacterProfile({
          faction: 'Chánh diện',
          roleType: 'Nhân vật chính',
          name: '',
        });
      }
      onUpdateNode(node);
      onShowToast?.('Đã chuyển sang Bảng Cấu Hình Nhân Vật!');
      return;
    }

    const { profiles: parsed, columns: detectedColumns } = parseCharacterSheetWithColumns(blockText);
    if (parsed.length === 0) {
      node.updateNodeType('character_profile');
      if (node.getCharacterProfiles().length === 0) {
        node.addCharacterProfile({
          faction: 'Chánh diện',
          roleType: 'Nhân vật chính',
          name: '',
        });
      }
      onUpdateNode(node);
      onShowToast?.('Đã chuyển sang Bảng Cấu Hình Nhân Vật!');
      return;
    }

    node.updateNodeType('character_profile');

    // Auto merge any new columns
    let currentCols = node.getCharacterColumns();
    let newColsCount = 0;
    detectedColumns.forEach(dCol => {
      const exists = currentCols.some(
        c => c.key === dCol.key || c.label.trim().toLowerCase() === dCol.label.trim().toLowerCase()
      );
      if (!exists) {
        currentCols.push(dCol);
        newColsCount++;
      }
    });
    node.setCharacterColumns(currentCols);
    setCharacterColumns([...currentCols]);

    const existing = node.getCharacterProfiles();

    // Check if existing only contains an empty initial row
    const isExistingBlank =
      existing.length === 0 ||
      (existing.length === 1 && !existing[0].name?.trim() && !existing[0].want?.trim());

    if (!isExistingBlank) {
      const merged = existing.map(p => ({ ...p }));
      let updatedCount = 0;
      let addedCount = 0;
      parsed.forEach(newP => {
        const tName = newP.name.trim().toLowerCase();
        const idx = merged.findIndex(
          p =>
            p.name.trim().toLowerCase() === tName ||
            (tName.length >= 2 && p.name.trim().toLowerCase().includes(tName)) ||
            (p.name.trim().length >= 2 && tName.includes(p.name.trim().toLowerCase()))
        );
        if (idx !== -1) {
          const old = merged[idx];
          merged[idx] = {
            ...old,
            ...newP,
            faction: newP.faction?.trim() || old.faction,
            roleType: newP.roleType?.trim() || old.roleType,
            name: newP.name?.trim() || old.name,
            strengths: newP.strengths?.trim() || old.strengths,
            weaknesses: newP.weaknesses?.trim() || old.weaknesses,
            want: newP.want?.trim() || old.want,
            need: newP.need?.trim() || old.need,
            ghostWound: newP.ghostWound?.trim() || old.ghostWound,
            theLie: newP.theLie?.trim() || old.theLie,
            conflict: newP.conflict?.trim() || old.conflict,
            actionTendency: newP.actionTendency?.trim() || old.actionTendency,
            visualArchetype: newP.visualArchetype?.trim() || old.visualArchetype,
            customFields: {
              ...(old.customFields || {}),
              ...(newP.customFields || {}),
            },
          };
          updatedCount++;
        } else {
          merged.push({ ...newP });
          addedCount++;
        }
      });
      node.setCharacterProfiles(merged);
      const msg: string[] = [];
      if (updatedCount > 0) msg.push(`cập nhật ${updatedCount}`);
      if (addedCount > 0) msg.push(`thêm mới ${addedCount}`);
      if (newColsCount > 0) msg.push(`tự động thêm ${newColsCount} cột`);
      onShowToast?.(`Đã ${msg.join(', ')} vào bảng cấu hình!`);
    } else {
      node.setCharacterProfiles(parsed);
      const msg = [`Đã nạp thành công ${parsed.length} nhân vật vào Bảng Cấu Hình`];
      if (newColsCount > 0) msg.push(`(tự động thêm ${newColsCount} cột mới)`);
      onShowToast?.(msg.join(' ') + '!');
    }

    if (!node.title || node.title.startsWith('Node') || node.title.startsWith('Tiến trình')) {
      if (parsed.length === 1 && parsed[0].name?.trim()) {
        node.updateTitle(parsed[0].name.trim());
      } else {
        node.updateTitle(`Danh sách nhân vật (${node.getCharacterProfiles().length} NV)`);
      }
    }
    syncProfilesSummary();
    onUpdateNode(node);
  };

  const handleOpenExtractModal = () => {
    const items = parseChildNodesFromContent();
    if (items.length === 0) {
      onShowToast?.(
        'Không tìm thấy nội dung để trích xuất. Vui lòng nhập danh sách hoặc phân cảnh vào ô nội dung chi tiết!'
      );
      return;
    }
    setExtractedItems(items);
    setIsExtractModalOpen(true);
  };

  const handleConfirmExtract = () => {
    const toCreate = extractedItems.filter(item => item.selected && item.title.trim());
    if (toCreate.length === 0) {
      onShowToast?.('Chưa chọn mục nào để tạo node con!');
      return;
    }

    onPushSnapshot?.();

    const existingChildren = node.childrenIds
      .map(cid => graph.getNode(cid))
      .filter(Boolean) as NodeModel[];

    let createdCount = 0;
    let updatedCount = 0;

    toCreate.forEach(item => {
      const itemTitle = item.title.trim();
      const matchingChild = existingChildren.find(c => {
        const cCharName = c.characterProfile?.name?.trim().toLowerCase();
        const cTitle = c.title.trim().toLowerCase();
        return (
          (cCharName && cCharName === itemTitle.toLowerCase()) ||
          cTitle === itemTitle.toLowerCase() ||
          (item.profileData?.name && cTitle.includes(item.profileData.name.trim().toLowerCase()))
        );
      });

      if (matchingChild) {
        if (item.content.trim()) {
          matchingChild.updateContent(item.content.trim());
        }
        if (item.profileData) {
          matchingChild.nodeType = 'character_profile';
          matchingChild.characterProfile = { ...item.profileData, name: itemTitle };
          matchingChild.characterProfiles = [{ ...item.profileData, name: itemTitle }];
          const colors = getFactionColorScheme(item.profileData.faction);
          matchingChild.style.borderColor = colors.borderColor;
          matchingChild.style.borderWidth = 2;
          matchingChild.style.fillColor = colors.fillColor;
          matchingChild.style.textColor = colors.textColor;
        }
        updatedCount++;
      } else {
        if (item.profileData) {
          const colors = getFactionColorScheme(item.profileData.faction);
          graph.addNode(node.id, {
            title: itemTitle,
            content: item.content.trim(),
            contents: item.content.trim() ? [item.content.trim()] : [''],
            nodeType: 'character_profile',
            characterProfile: { ...item.profileData, name: itemTitle },
            characterProfiles: [{ ...item.profileData, name: itemTitle }],
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
        } else {
          graph.addNode(node.id, {
            title: itemTitle,
            content: item.content.trim(),
            contents: item.content.trim() ? [item.content.trim()] : [''],
          });
        }
        createdCount++;
      }
    });

    // If source had character profile table and user was in standard node, we can also sync parent node's characterProfiles
    if (toCreate.some(it => it.profileData)) {
      const extractedProfiles = toCreate
        .map(it => it.profileData)
        .filter(Boolean) as CharacterProfileData[];
      if (extractedProfiles.length > 0 && (!node.characterProfiles || node.characterProfiles.length === 0)) {
        node.nodeType = 'character_profile';
        node.setCharacterProfiles(extractedProfiles);
      }
    }

    if (clearSourceContentAfterExtract) {
      node.contents = [''];
      node.content = '';
    }

    graph.meta.updatedAt = new Date().toISOString();
    if (onUpdateGraph) {
      onUpdateGraph(graph);
    } else {
      onUpdateNode(node);
    }

    const msgParts: string[] = [];
    if (createdCount > 0) msgParts.push(`Đã tạo mới ${createdCount} node con`);
    if (updatedCount > 0) msgParts.push(`cập nhật ${updatedCount} node con`);
    onShowToast?.(`${msgParts.join(', ')} từ nội dung chi tiết!`);

    setIsExtractModalOpen(false);
  };

  const handleUpdateContentBlock = (index: number, val: string) => {
    node.updateContentBlock(index, val);
    onUpdateNode(node);
  };

  const handleAddContentBlock = () => {
    node.addContentBlock('');
    onUpdateNode(node);
  };

  const handleRemoveContentBlock = (index: number) => {
    node.removeContentBlock(index);
    onUpdateNode(node);
  };

  const handleUpdateStyle = (updates: Partial<NodeModel['style']>) => {
    node.updateStyle(updates);
    onUpdateNode(node);
  };

  const handleParentSelect = (newParentId: string) => {
    const targetParent = newParentId === '__ROOT_NONE__' ? null : newParentId;
    const success = onReparent(node.id, targetParent);
    if (!success) {
      alert(t('cyclePrevented'));
    }
  };

  const handleParentLinkStyleChange = (updated: LinkStyleConfig) => {
    node.updateParentLinkStyle(updated);
    onUpdateNode(node);
  };

  const handleCreateCrossLink = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    if (!targetLinkId) return;
    if (targetLinkId === node.id) {
      setLinkError('Không thể tạo liên kết đến chính nó');
      return;
    }
    onAddCrossLink(node.id, targetLinkId, targetLinkLabel.trim() || undefined, {
      color: linkColor,
      style: linkStyle,
      arrow: linkArrow,
      width: linkWidth,
    });
    setTargetLinkId('');
    setTargetLinkLabel('');
  };

  const { style } = node;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        id="node-detail-modal"
        className={`bg-white rounded-2xl shadow-2xl ${
          node.nodeType === 'character_profile' ? 'max-w-6xl xl:max-w-7xl' : 'max-w-2xl'
        } w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300`}
      >
        {/* Modal Header with ID & Tabs */}
        <div className="px-5 sm:px-6 pt-4 pb-0 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 border border-slate-300">
                  {node.id}
                </span>
                <button
                  id="btn-copy-node-id"
                  onClick={handleCopyId}
                  title="Sao chép ID"
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                  {node.title}
                </span>
              </div>
            </div>

            <button
              id="btn-close-detail-modal"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-1">
            <button
              id="tab-btn-content"
              type="button"
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'content'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('tabContent')}</span>
              {node.checklist.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {node.checklist.filter(c => c.completed).length}/{node.checklist.length}
                </span>
              )}
            </button>

            <button
              id="tab-btn-config"
              type="button"
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                activeTab === 'config'
                  ? 'bg-white text-blue-600 border-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('tabConfig')}</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Switch between 2 tabs */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white">
          {/* TAB 1: NỘI DUNG CHI TIẾT */}
          {activeTab === 'content' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Node Title & Done State */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {t('nodeTitleInput')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      node.toggleCompleted();
                      onUpdateNode(node);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      node.completed
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                        node.completed ? 'bg-white text-emerald-600' : 'border border-slate-400'
                      }`}
                    >
                      {node.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span>{node.completed ? 'Đã hoàn thành (Done)' : 'Chưa hoàn thành'}</span>
                  </button>
                </div>
                <input
                  id="input-node-title"
                  type="text"
                  value={node.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  placeholder="Nhập tiêu đề node..."
                />
              </div>

              {/* Node Type Selector */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                      {t('nodeTypeLabel')}
                    </span>
                    <span className="text-[11px] text-purple-700/80 truncate block">
                      {node.nodeType === 'character_profile' ? 'Hồ sơ thiết lập tâm lý & động cơ nhân vật' : 'Nội dung kịch bản & phân cảnh tiêu chuẩn'}
                    </span>
                  </div>
                </div>

                <select
                  id="select-node-type"
                  value={node.nodeType || 'standard'}
                  onChange={e => {
                    const newType = e.target.value as NodeType;
                    node.updateNodeType(newType);
                    onUpdateNode(node);
                  }}
                  className="text-xs font-bold bg-white border border-purple-300 text-purple-900 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer shadow-2xs transition-all shrink-0"
                >
                  <option value="standard">{t('nodeTypeStandard')}</option>
                  <option value="character_profile">{t('nodeTypeCharacterProfile')}</option>
                </select>
              </div>

              {/* CHARACTER PROFILE TABLE (When nodeType === 'character_profile') */}
              {node.nodeType === 'character_profile' ? (
                <div className="space-y-4">
                  <div className="border border-purple-200 rounded-2xl overflow-hidden shadow-2xs bg-white space-y-0">
                  {/* Table Control Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-700/80 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-200" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider">
                            {t('characterProfileTitle')}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-800 text-purple-200 font-mono font-semibold">
                            {node.getCharacterProfiles().length} nhân vật
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-200 font-mono font-semibold">
                            {characterColumns.length} cột
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-200/80 font-normal">
                          Bảng cấu hình hồ sơ nhân vật ({characterColumns.length} cột) • Tự động nhận diện mọi cột mới khi dán từ Google Sheets / Excel
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* Button Kiểm tra các nhân vật có "hay" không? */}
                      <button
                        type="button"
                        onClick={() => setShowQualityModal(true)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-amber-600/40"
                        title="Công thức 3 câu hỏi kiểm tra nhân vật chính có hay không: Want rõ ràng? Flaw là gì? Người phù hợp nhất?"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                        <span>Kiểm tra nhân vật có "hay" không?</span>
                      </button>

                      {/* Button Thêm Hàng / Nhân vật */}
                      <button
                        type="button"
                        onClick={handleAddCharacterRow}
                        className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Thêm một nhân vật / dòng mới vào bảng"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm nhân vật</span>
                      </button>

                      {/* Button Thêm Cột Thuộc Tính Mới */}
                      <button
                        type="button"
                        onClick={() => setShowAddColumnModal(prev => !prev)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs ${
                          showAddColumnModal
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                        title="Thêm một cột thuộc tính mới vào bảng (ví dụ: Hình tượng, Tuổi tác, Mối quan hệ...)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Thêm cột</span>
                      </button>

                      {/* Button Tạo node con cho node này */}
                      <button
                        type="button"
                        onClick={handleOpenExtractModal}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Tạo các node nhân vật con đâm nhánh trực tiếp từ node cha này trên sơ đồ"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        <span>Tạo node con cho node này ({node.getCharacterProfiles().length})</span>
                      </button>

                      {/* Button Dán từ Excel / Sheets */}
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(prev => !prev)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                          showPasteBox
                            ? 'bg-amber-400 text-slate-900 font-bold'
                            : 'bg-purple-800/80 hover:bg-purple-700 text-purple-100'
                        }`}
                        title="Dán dữ liệu bảng từ Excel / Google Sheets"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Dán từ Sheets</span>
                      </button>

                      {/* Button Sao chép bảng (TSV) */}
                      <button
                        type="button"
                        onClick={handleCopyTableToClipboard}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-purple-800/80 hover:bg-purple-700 text-purple-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sao chép toàn bộ bảng dưới định dạng TSV để dán vào Excel"
                      >
                        {copiedTable ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTable ? 'Đã chép TSV!' : 'Chép bảng'}</span>
                      </button>

                      {/* Button Đồng bộ node con ngoài sơ đồ */}
                      <button
                        type="button"
                        onClick={() => {
                          const res = syncCharacterChildNodes(true);
                          if (res.createdCount > 0 || res.updatedCount > 0) {
                            onShowToast?.(`Đã đồng bộ ${res.updatedCount} và tạo ${res.createdCount} node con nhân vật ngoài sơ đồ!`);
                          } else {
                            onShowToast?.('Dữ liệu các node con ngoài sơ đồ đã đồng bộ mới nhất!');
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-700/90 hover:bg-emerald-600 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Đồng bộ ngay lập tức dữ liệu bảng xuống tất cả các node con nhân vật ngoài sơ đồ"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Đồng bộ node con</span>
                      </button>

                      {/* View Mode Toggle: Table vs Cards */}
                      <div className="flex items-center bg-purple-900/90 border border-purple-700/80 rounded-lg p-0.5 ml-1">
                        <button
                          type="button"
                          onClick={() => setCharViewMode('table')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                            charViewMode === 'table'
                              ? 'bg-purple-600 text-white font-bold shadow-2xs'
                              : 'text-purple-200 hover:text-white'
                          }`}
                          title="Hiển thị dạng bảng (Table)"
                        >
                          <TableIcon className="w-3 h-3" />
                          <span>Bảng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCharViewMode('cards')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                            charViewMode === 'cards'
                              ? 'bg-purple-600 text-white font-bold shadow-2xs'
                              : 'text-purple-200 hover:text-white'
                          }`}
                          title="Hiển thị dạng thẻ (Cards)"
                        >
                          <LayoutGrid className="w-3 h-3" />
                          <span>Thẻ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Form Thêm Cột Mới */}
                  {showAddColumnModal && (
                    <div className="px-4 py-2 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 border-b border-indigo-700/80 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-xs text-indigo-100 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Thêm cột mới vào bảng:</span>
                      </span>
                      <input
                        type="text"
                        value={newColumnName}
                        onChange={e => setNewColumnName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddCustomColumn();
                          if (e.key === 'Escape') setShowAddColumnModal(false);
                        }}
                        placeholder="Nhập tên cột (VD: Hình tượng, Tuổi tác, Vũ khí...)"
                        className="px-3 py-1 text-xs text-white bg-indigo-950 border border-indigo-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-300 placeholder-indigo-300/60 w-64"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomColumn}
                        disabled={!newColumnName.trim()}
                        className="px-3 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        Thêm ngay
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddColumnModal(false)}
                        className="text-xs text-indigo-200 hover:text-white px-2 py-1 cursor-pointer"
                      >
                        Đóng
                      </button>
                    </div>
                  )}

                  {/* Optional Quick Paste Box */}
                  {showPasteBox && (
                    <div className="p-3.5 bg-gradient-to-b from-amber-50 to-amber-100/40 border-b border-amber-200 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-xs text-amber-950 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ClipboardPaste className="w-4 h-4 text-amber-700" />
                          <span>Dán dữ liệu bảng từ Excel / Google Sheets:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPasteBox(false)}
                          className="text-amber-700 hover:text-amber-950 text-xs px-2 py-0.5 rounded hover:bg-amber-200/60 cursor-pointer"
                        >
                          Đóng
                        </button>
                      </div>

                      {/* Paste Mode Selector */}
                      <div className="p-2 bg-amber-100/70 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-amber-950 font-bold">Chế độ nạp:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPasteMode('update')}
                            className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                              pasteMode === 'update'
                                ? 'bg-amber-600 text-white font-bold shadow-xs ring-1 ring-amber-700/30'
                                : 'bg-white/90 text-amber-900 hover:bg-white border border-amber-300'
                            }`}
                            title="Tự động cập nhật theo tên nhân vật (giữ nguyên dữ liệu cũ nếu ô mới trống) và thêm mới nếu chưa có"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>🔄 Cập nhật (Update)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPasteMode('append')}
                            className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                              pasteMode === 'append'
                                ? 'bg-amber-600 text-white font-bold shadow-xs ring-1 ring-amber-700/30'
                                : 'bg-white/90 text-amber-900 hover:bg-white border border-amber-300'
                            }`}
                            title="Thêm tiếp vào cuối bảng"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>➕ Thêm tiếp (Append)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPasteMode('replace')}
                            className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                              pasteMode === 'replace'
                                ? 'bg-amber-600 text-white font-bold shadow-xs ring-1 ring-amber-700/30'
                                : 'bg-white/90 text-amber-900 hover:bg-white border border-amber-300'
                            }`}
                            title="Xóa trắng và thay thế toàn bộ bảng"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>⚡ Ghi đè (Replace)</span>
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder="Dán các cột theo thứ tự: Phe | Tuyến | Tên | Điểm mạnh | Điểm yếu | Want | Need | Ghost/Wound | The Lie | Xung đột | Xu hướng action (mỗi dòng 1 nhân vật)..."
                        className="w-full p-2.5 text-xs font-mono bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] text-amber-900 font-medium">
                          Bảng hiện có: <strong>{node.getCharacterProfiles().length}</strong> nhân vật
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPasteText('');
                              setShowPasteBox(false);
                            }}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyPasteFromSheet}
                            disabled={!pasteText.trim()}
                            className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>
                              {pasteMode === 'update'
                                ? 'Cập nhật vào bảng'
                                : pasteMode === 'append'
                                ? 'Thêm tiếp vào bảng'
                                : 'Ghi đè vào bảng'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW 1: DẠNG BẢNG (TABLE VIEW) */}
                  {charViewMode === 'table' ? (
                    <div className="overflow-x-auto w-full max-h-[62vh] overflow-y-auto">
                      {(() => {
                        const currentTableCols = node.getCharacterColumns();
                        return (
                          <table className="w-full text-xs text-left border-collapse bg-white" style={{ minWidth: `${Math.max(2000, currentTableCols.length * 175 + 120)}px` }}>
                            <thead className="bg-purple-950 text-white font-bold text-[11px] uppercase tracking-wider sticky top-0 z-20 shadow-xs">
                              <tr>
                                <th className="py-2.5 px-2 text-center w-12 border-b border-purple-800 bg-purple-950 sticky left-0 z-20">#</th>
                                {currentTableCols.map(col => {
                                  if (col.key === 'faction') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[140px] border-b border-purple-800">1. {t('charFaction')}</th>;
                                  }
                                  if (col.key === 'roleType') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[150px] border-b border-purple-800">2. {t('charRoleType')}</th>;
                                  }
                                  if (col.key === 'name') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[160px] border-b border-purple-800">3. {t('charName')}</th>;
                                  }
                                  if (col.key === 'strengths') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[170px] border-b border-purple-800">4. {t('charStrengths')}</th>;
                                  }
                                  if (col.key === 'weaknesses') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[170px] border-b border-purple-800">5. {t('charWeaknesses')}</th>;
                                  }
                                  if (col.key === 'want') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[180px] border-b border-purple-800">6. {t('charWant')}</th>;
                                  }
                                  if (col.key === 'need') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[180px] border-b border-purple-800">7. {t('charNeed')}</th>;
                                  }
                                  if (col.key === 'ghostWound') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[210px] border-b border-purple-800">8. {t('charGhostWound')}</th>;
                                  }
                                  if (col.key === 'theLie') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[190px] border-b border-purple-800">9. {t('charTheLie')}</th>;
                                  }
                                  if (col.key === 'conflict') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[180px] border-b border-purple-800">10. {t('charConflict')}</th>;
                                  }
                                  if (col.key === 'actionTendency') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[180px] border-b border-purple-800">11. {t('charActionTendency')}</th>;
                                  }
                                  if (col.key === 'visualArchetype') {
                                    return <th key={col.key} className="py-2.5 px-3 min-w-[190px] border-b border-purple-800">12. Hình tượng</th>;
                                  }
                                  return (
                                    <th key={col.key} className="py-2.5 px-3 min-w-[180px] border-b border-purple-800 bg-purple-900/60">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-amber-300 font-bold truncate flex items-center gap-1" title={col.label}>
                                          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                                          <span>{col.label}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCustomColumn(col.key, col.label)}
                                          title={`Xóa cột "${col.label}" khỏi bảng`}
                                          className="text-purple-300 hover:text-rose-400 hover:bg-purple-800 p-0.5 rounded cursor-pointer transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </th>
                                  );
                                })}
                                <th className="py-2.5 px-2 text-center w-24 border-b border-purple-800 bg-purple-950 sticky right-0 z-20 border-l border-purple-800">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-100">
                              {node.getCharacterProfiles().map((row, rIdx) => (
                                <tr
                                  key={`char-row-${rIdx}`}
                                  className="hover:bg-purple-50/40 transition-colors group align-top"
                                >
                                  {/* Column #: STT */}
                                  <td className="p-2 text-center font-mono font-bold text-slate-500 bg-slate-50/80 sticky left-0 z-10 border-r border-slate-200">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-900 text-xs">
                                      {rIdx + 1}
                                    </span>
                                  </td>

                                  {/* Dynamic Cells */}
                                  {currentTableCols.map(col => {
                                    if (col.key === 'faction') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[140px]">
                                          <input
                                            type="text"
                                            value={row.faction || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'faction', e.target.value)}
                                            placeholder="Phe..."
                                            className="w-full px-2 py-1.5 text-xs text-slate-800 font-semibold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500 transition-all"
                                          />
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {['Chánh diện', 'Phản diện', 'Trung lập', 'Đồng minh'].map(opt => (
                                              <button
                                                key={`r${rIdx}-fac-${opt}`}
                                                type="button"
                                                onClick={() => handleUpdateCharacterProfileRowField(rIdx, 'faction', opt)}
                                                className="text-[9px] px-1 py-0.2 rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-600 cursor-pointer"
                                              >
                                                {opt}
                                              </button>
                                            ))}
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (col.key === 'roleType') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[150px]">
                                          <input
                                            type="text"
                                            value={row.roleType || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'roleType', e.target.value)}
                                            placeholder="Tuyến..."
                                            className="w-full px-2 py-1.5 text-xs text-slate-800 font-semibold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500 transition-all"
                                          />
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {['Nhân vật chính', 'Phản diện chính', 'Cố vấn', 'Trợ thủ'].map(opt => (
                                              <button
                                                key={`r${rIdx}-role-${opt}`}
                                                type="button"
                                                onClick={() => handleUpdateCharacterProfileRowField(rIdx, 'roleType', opt)}
                                                className="text-[9px] px-1 py-0.2 rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-600 cursor-pointer"
                                              >
                                                {opt}
                                              </button>
                                            ))}
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (col.key === 'name') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[160px]">
                                          <input
                                            type="text"
                                            value={row.name || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'name', e.target.value)}
                                            placeholder="Tên nhân vật..."
                                            className="w-full px-2 py-1.5 text-xs font-bold text-purple-950 bg-purple-50/60 hover:bg-white focus:bg-white border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 transition-all"
                                          />
                                          {row.name?.trim() && (
                                            <button
                                              type="button"
                                              onClick={() => handleSyncNameToTitle(rIdx)}
                                              className="mt-1 text-[9px] text-purple-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                              title="Gán tên này làm tiêu đề node"
                                            >
                                              <RefreshCw className="w-2.5 h-2.5" />
                                              <span>Gán làm tiêu đề</span>
                                            </button>
                                          )}
                                        </td>
                                      );
                                    }

                                    if (col.key === 'strengths') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[170px]">
                                          <textarea
                                            rows={2}
                                            value={row.strengths || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'strengths', e.target.value)}
                                            placeholder="Kỹ năng, trí tuệ..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'weaknesses') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[170px]">
                                          <textarea
                                            rows={2}
                                            value={row.weaknesses || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'weaknesses', e.target.value)}
                                            placeholder="Nóng nảy, cố chấp..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'want') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[180px]">
                                          <textarea
                                            rows={2}
                                            value={row.want || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'want', e.target.value)}
                                            placeholder="Mục tiêu hữu hình..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-blue-50/40 hover:bg-white focus:bg-white border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'need') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[180px]">
                                          <textarea
                                            rows={2}
                                            value={row.need || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'need', e.target.value)}
                                            placeholder="Bài học nội tâm..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-indigo-50/40 hover:bg-white focus:bg-white border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'ghostWound') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[210px]">
                                          <textarea
                                            rows={2}
                                            value={row.ghostWound || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'ghostWound', e.target.value)}
                                            placeholder="Nỗi sợ sâu thẳm, biến cố..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-red-50/40 hover:bg-white focus:bg-white border border-red-200 rounded-lg focus:outline-none focus:border-red-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'theLie') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[190px]">
                                          <textarea
                                            rows={2}
                                            value={row.theLie || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'theLie', e.target.value)}
                                            placeholder="Lời nói dối nhân vật tin vào..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-amber-50/40 hover:bg-white focus:bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'conflict') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[180px]">
                                          <textarea
                                            rows={2}
                                            value={row.conflict || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'conflict', e.target.value)}
                                            placeholder="Mâu thuẫn Want vs Need..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'actionTendency') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[180px]">
                                          <textarea
                                            rows={2}
                                            value={row.actionTendency || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'actionTendency', e.target.value)}
                                            placeholder="Hành vi khi bị dồn vào chân tường..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-purple-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    if (col.key === 'visualArchetype') {
                                      return (
                                        <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[190px]">
                                          <textarea
                                            rows={2}
                                            value={row.visualArchetype || row.customFields?.[col.label] || ''}
                                            onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'visualArchetype', e.target.value)}
                                            placeholder="Dáng vẻ, phong cách, diện mạo..."
                                            className="w-full p-1.5 text-xs text-slate-800 bg-violet-50/40 hover:bg-white focus:bg-white border border-violet-200 rounded-lg focus:outline-none focus:border-violet-500 transition-all resize-y"
                                          />
                                        </td>
                                      );
                                    }

                                    // Custom column cell
                                    return (
                                      <td key={`r${rIdx}-col-${col.key}`} className="p-2 min-w-[180px]">
                                        <textarea
                                          rows={2}
                                          value={row.customFields?.[col.label] || row[col.key] || ''}
                                          onChange={e => handleUpdateCharacterProfileRowField(rIdx, col.key, e.target.value, col.label)}
                                          placeholder={`${col.label}...`}
                                          className="w-full p-1.5 text-xs text-slate-800 bg-amber-50/30 hover:bg-white focus:bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500 transition-all resize-y"
                                        />
                                      </td>
                                    );
                                  })}

                                  {/* Column: Thao tác */}
                                  <td className="p-2 text-center w-24 sticky right-0 z-10 bg-slate-50/90 border-l border-slate-200">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleDuplicateCharacterRow(rIdx)}
                                        title="Nhân bản dòng này"
                                        className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCharacterRow(rIdx)}
                                        title={node.getCharacterProfiles().length > 1 ? 'Xóa nhân vật này' : 'Xóa trắng thông tin'}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  ) : (
                    /* VIEW 2: DẠNG THẺ (CARD VIEW) */
                    <div className="p-4 space-y-4 max-h-[62vh] overflow-y-auto bg-slate-50/60">
                      {(() => {
                        const currentCardCols = node.getCharacterColumns();
                        const customCols = currentCardCols.filter(c => c.isCustom);
                        return node.getCharacterProfiles().map((row, rIdx) => (
                          <div
                            key={`card-profile-${rIdx}`}
                            className="p-4 bg-white rounded-xl border border-purple-200/90 shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-purple-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                                  #{rIdx + 1}
                                </span>
                                <span className="font-bold text-xs text-purple-950">
                                  {row.name || `Nhân vật #${rIdx + 1}`}
                                </span>
                                {row.faction && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                                    {row.faction}
                                  </span>
                                )}
                                {row.roleType && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                                    {row.roleType}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {row.name?.trim() && (
                                  <button
                                    type="button"
                                    onClick={() => handleSyncNameToTitle(rIdx)}
                                    className="text-[10px] text-purple-700 hover:underline flex items-center gap-1 cursor-pointer mr-2"
                                    title="Gán tên làm tiêu đề node"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Gán làm tiêu đề</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateCharacterRow(rIdx)}
                                  className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-100 rounded cursor-pointer"
                                  title="Nhân bản"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCharacterRow(rIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Row: Phe, Tuyến, Tên */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                  1. {t('charFaction')}
                                </label>
                                <input
                                  type="text"
                                  value={row.faction || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'faction', e.target.value)}
                                  placeholder="Phe..."
                                  className="w-full px-2.5 py-1.5 text-xs text-slate-800 font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:border-purple-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                  2. {t('charRoleType')}
                                </label>
                                <input
                                  type="text"
                                  value={row.roleType || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'roleType', e.target.value)}
                                  placeholder="Tuyến..."
                                  className="w-full px-2.5 py-1.5 text-xs text-slate-800 font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:border-purple-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-purple-900 uppercase mb-1">
                                  3. {t('charName')}
                                </label>
                                <input
                                  type="text"
                                  value={row.name || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'name', e.target.value)}
                                  placeholder="Tên nhân vật..."
                                  className="w-full px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-purple-50/50 border border-purple-300 rounded-lg focus:border-purple-500 focus:bg-white"
                                />
                              </div>
                            </div>

                            {/* Row: Điểm mạnh & Điểm yếu */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-emerald-600" />
                                  <span>4. {t('charStrengths')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.strengths || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'strengths', e.target.value)}
                                  placeholder="Ưu điểm, kỹ năng..."
                                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:border-emerald-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>5. {t('charWeaknesses')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.weaknesses || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'weaknesses', e.target.value)}
                                  placeholder="Nhược điểm, thói xấu..."
                                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:border-amber-500 focus:bg-white"
                                />
                              </div>
                            </div>

                            {/* Row: Want & Need */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-blue-900 uppercase mb-1 flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-blue-600" />
                                  <span>6. {t('charWant')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.want || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'want', e.target.value)}
                                  placeholder="Mục tiêu hữu hình..."
                                  className="w-full p-2 text-xs bg-blue-50/30 border border-blue-200 rounded-lg focus:border-blue-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-indigo-900 uppercase mb-1 flex items-center gap-1">
                                  <Heart className="w-3 h-3 text-indigo-600" />
                                  <span>7. {t('charNeed')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.need || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'need', e.target.value)}
                                  placeholder="Bài học nội tâm..."
                                  className="w-full p-2 text-xs bg-indigo-50/30 border border-indigo-200 rounded-lg focus:border-indigo-500 focus:bg-white"
                                />
                              </div>
                            </div>

                            {/* Row: Ghost/Wound & The Lie */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-red-900 uppercase mb-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  <span>8. {t('charGhostWound')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.ghostWound || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'ghostWound', e.target.value)}
                                  placeholder="Nỗi sợ, biến cố đau buồn..."
                                  className="w-full p-2 text-xs bg-red-50/30 border border-red-200 rounded-lg focus:border-red-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3 text-amber-600" />
                                  <span>9. {t('charTheLie')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.theLie || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'theLie', e.target.value)}
                                  placeholder="Lời nói dối nhân vật tin vào..."
                                  className="w-full p-2 text-xs bg-amber-50/30 border border-amber-200 rounded-lg focus:border-amber-500 focus:bg-white"
                                />
                              </div>
                            </div>

                            {/* Row: Xung đột & Xu hướng action */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1 flex items-center gap-1">
                                  <Flame className="w-3 h-3 text-orange-600" />
                                  <span>10. {t('charConflict')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.conflict || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'conflict', e.target.value)}
                                  placeholder="Mâu thuẫn Want vs Need..."
                                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:border-purple-500 focus:bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1 flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-purple-600" />
                                  <span>11. {t('charActionTendency')}</span>
                                </label>
                                <textarea
                                  rows={2}
                                  value={row.actionTendency || ''}
                                  onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'actionTendency', e.target.value)}
                                  placeholder="Hành vi khi bị dồn vào chân tường..."
                                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:border-purple-500 focus:bg-white"
                                />
                              </div>
                            </div>

                            {/* Row: Hình tượng (visualArchetype) */}
                            <div>
                              <label className="block text-[11px] font-bold text-violet-900 uppercase mb-1 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-violet-600" />
                                <span>12. Hình tượng</span>
                              </label>
                              <textarea
                                rows={2}
                                value={row.visualArchetype || row.customFields?.['Hình tượng'] || ''}
                                onChange={e => handleUpdateCharacterProfileRowField(rIdx, 'visualArchetype', e.target.value)}
                                placeholder="Dáng vẻ, phong cách, quần áo, diện mạo..."
                                className="w-full p-2 text-xs bg-violet-50/30 border border-violet-200 rounded-lg focus:border-violet-500 focus:bg-white"
                              />
                            </div>

                            {/* Dynamic Custom Fields in Card View */}
                            {customCols.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-dashed border-purple-200">
                                {customCols.map(c => (
                                  <div key={`card-${rIdx}-custom-${c.key}`}>
                                    <label className="block text-[11px] font-bold text-amber-900 uppercase mb-1 flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <Tag className="w-3 h-3 text-amber-600" />
                                        <span>{c.label}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomColumn(c.key, c.label)}
                                        className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                                      >
                                        Xóa cột
                                      </button>
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={row.customFields?.[c.label] || row[c.key] || ''}
                                      onChange={e => handleUpdateCharacterProfileRowField(rIdx, c.key, e.target.value, c.label)}
                                      placeholder={`${c.label}...`}
                                      className="w-full p-2 text-xs bg-amber-50/30 border border-amber-200 rounded-lg focus:border-amber-500 focus:bg-white"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Table Footer with Add button, Check quality button & Extract button */}
                  <div className="px-4 py-2.5 bg-purple-50/80 border-t border-purple-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAddCharacterRow}
                        className="px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Thêm nhân vật</span>
                      </button>

                      {/* Button Kiểm tra các nhân vật có "hay" không? */}
                      <button
                        type="button"
                        onClick={() => setShowQualityModal(true)}
                        className="px-3 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer border border-amber-500/50"
                        title="Công thức 3 câu hỏi kiểm tra nhân vật chính có hay không: Want rõ ràng? Flaw là gì? Người phù hợp nhất cho câu chuyện?"
                      >
                        <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                        <span>Kiểm tra các nhân vật có "hay" không?</span>
                      </button>

                      {/* Button Thêm ô nội dung chi tiết */}
                      <button
                        type="button"
                        onClick={handleAddContentBlock}
                        className="px-3 py-1.5 text-xs font-bold text-purple-800 hover:text-purple-950 bg-white hover:bg-purple-100 border border-purple-300 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Thêm thêm một ô nội dung chi tiết cho node này"
                      >
                        <Plus className="w-4 h-4 text-purple-600" />
                        <span>+ Thêm ô nội dung</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenExtractModal}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Xem trước & trích xuất danh sách nhân vật thành các node con"
                    >
                      <ListPlus className="w-4 h-4 shrink-0" />
                      <span>Tự động trích xuất node con từ nội dung chi tiết</span>
                    </button>
                  </div>
                </div>

                {/* Multiple Content Blocks for Character Configuration Node */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-purple-200/80">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Các ô nội dung chi tiết & Ghi chú ({node.contents.length} ô)
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddContentBlock}
                      className="px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Thêm thêm một ô nội dung chi tiết cho node này"
                    >
                      <Plus className="w-3.5 h-3.5 text-purple-600" />
                      <span>+ Thêm ô nội dung</span>
                    </button>
                  </div>

                  {node.contents.map((blockText, idx) => (
                    <div
                      key={`char-node-content-block-${idx}`}
                      className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className={`w-3.5 h-3.5 ${idx === 0 ? 'text-purple-500' : 'text-indigo-500'}`} />
                          <span>
                            {idx === 0
                              ? 'Ô nội dung chi tiết 1 (Tóm tắt danh sách nhân vật / Ghi chú)'
                              : `Ô nội dung chi tiết ${idx + 1}`}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] text-slate-400 font-normal lowercase tracking-normal">
                              (hiển thị ngoài thẻ)
                            </span>
                          )}
                        </label>

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContentBlock(idx)}
                            title="Xóa ô nội dung này"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        id={`textarea-node-char-content-${idx}`}
                        rows={idx === 0 ? 4 : 3}
                        value={blockText}
                        onChange={e => handleUpdateContentBlock(idx, e.target.value)}
                        placeholder={idx === 0 ? 'Tóm tắt nhân vật hoặc nội dung tổng quan...' : `Nhập nội dung cho ô ${idx + 1}...`}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all leading-relaxed resize-y shadow-2xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
                /* STANDARD NODE CONTENT / MULTIPLE CONTENT BLOCKS */
                <div className="space-y-3">
                  {node.contents.map((blockText, idx) => (
                    <div
                      key={`content-block-${idx}`}
                      className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className={`w-3.5 h-3.5 ${idx === 0 ? 'text-blue-500' : 'text-indigo-500'}`} />
                          <span>
                            {idx === 0
                              ? (t('nodeContentInput') || 'Nội dung chi tiết (Ô 1)')
                              : `Ô nội dung chi tiết ${idx + 1}`}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] text-slate-400 font-normal lowercase tracking-normal">
                              (hiển thị ngoài thẻ)
                            </span>
                          )}
                        </label>

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContentBlock(idx)}
                            title="Xóa ô nội dung này"
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        id={`textarea-node-content-${idx}`}
                        rows={idx === 0 ? 5 : 4}
                        value={blockText}
                        onChange={e => handleUpdateContentBlock(idx, e.target.value)}
                        placeholder={idx === 0 ? t('nodeContentPlaceholder') : `Nhập nội dung cho ô ${idx + 1}...`}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-700 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed resize-y shadow-2xs"
                      />
                    </div>
                  ))}

                  {/* Single Row Action Bar below Content */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                    <button
                      id="btn-convert-character-table"
                      type="button"
                      onClick={() => {
                        const targetBlock =
                          node.contents.find(b => isCharacterProfileTable(b)) ||
                          node.contents[0] ||
                          node.content ||
                          '';
                        handleConvertContentToCharacterTable(targetBlock);
                      }}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                        node.contents.some(b => isCharacterProfileTable(b))
                          ? 'bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-300'
                          : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200'
                      }`}
                      title="Chuyển đổi nội dung sang bảng cấu hình 11 thuộc tính nhân vật"
                    >
                      <TableIcon className="w-4 h-4 shrink-0" />
                      <span>Chuyển sang bảng cấu hình nv</span>
                      {node.contents.some(b => isCharacterProfileTable(b)) && (
                        <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" title="Phát hiện dữ liệu bảng" />
                      )}
                    </button>

                    <button
                      id="btn-extract-child-nodes"
                      type="button"
                      onClick={handleOpenExtractModal}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                      title="Tự động trích xuất các node con từ nội dung chi tiết"
                    >
                      <ListPlus className="w-4 h-4 shrink-0" />
                      <span>Tự động trích xuất node con từ nội dung chi tiết</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddContentBlock}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer sm:ml-auto"
                      title="Thêm thêm một ô nội dung chi tiết"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Thêm ô nội dung</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Checklist items */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    {t('checklistSection')}
                  </span>
                  <span className="text-xs text-slate-500 normal-case font-normal">
                    {node.checklist.filter(c => c.completed).length}/{node.checklist.length} hoàn thành
                  </span>
                </label>

                <form onSubmit={handleAddChecklist} className="flex gap-2 mb-3">
                  <input
                    id="input-new-checklist"
                    type="text"
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    placeholder={t('addChecklistPlaceholder')}
                    className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  />
                  <button
                    id="btn-add-checklist-item"
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addChecklistBtn')}</span>
                  </button>
                </form>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {node.checklist.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">Chưa có công việc nào được tạo.</p>
                  ) : (
                    node.checklist.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(item.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              item.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                            }`}
                          >
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteChecklist(item.id)}
                          className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CẤU HÌNH NODE */}
          {activeTab === 'config' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 1. Appearance & Styling Section */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-600" />
                  {t('appearanceSection')}
                </h4>

                {/* Shape Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('shapeLabel')}:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'rounded-rect', label: 'Bo góc' },
                      { id: 'capsule', label: 'Pill' },
                      { id: 'rectangle', label: 'Vuông' },
                      { id: 'diamond', label: 'Thoi' },
                      { id: 'circle', label: 'Tròn' },
                      { id: 'hexagon', label: 'Lục giác' },
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateStyle({ shape: s.id as NodeShape })}
                        className={`py-1.5 px-2 text-xs rounded-lg font-medium border text-center transition-all ${
                          style.shape === s.id
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Presets */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t('colorPresetLabel')}:
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {COLOR_PRESETS.map((cp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          handleUpdateStyle({
                            fillColor: cp.fill,
                            borderColor: cp.border,
                            textColor: cp.text,
                          })
                        }
                        title={cp.label}
                        className={`h-8 rounded-lg border-2 transition-transform hover:scale-105 shadow-2xs flex items-center justify-center ${
                          style.fillColor === cp.fill && style.borderColor === cp.border
                            ? 'ring-2 ring-blue-500 ring-offset-1'
                            : ''
                        }`}
                        style={{ backgroundColor: cp.fill, borderColor: cp.border }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: cp.text }}>
                          Aa
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                  {/* Fill Color */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs font-medium text-slate-700">{t('fillColor')}</span>
                    <input
                      id="modal-color-fill"
                      type="color"
                      value={style.fillColor}
                      onChange={e => handleUpdateStyle({ fillColor: e.target.value })}
                      className="w-7 h-7 rounded-md cursor-pointer border border-slate-300 p-0 bg-transparent"
                    />
                  </div>

                  {/* Border Color */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs font-medium text-slate-700">{t('borderColor')}</span>
                    <input
                      id="modal-color-border"
                      type="color"
                      value={style.borderColor}
                      onChange={e => handleUpdateStyle({ borderColor: e.target.value })}
                      className="w-7 h-7 rounded-md cursor-pointer border border-slate-300 p-0 bg-transparent"
                    />
                  </div>

                  {/* Text Color */}
                  <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-xs font-medium text-slate-700">{t('textColor')}</span>
                    <input
                      id="modal-color-text"
                      type="color"
                      value={style.textColor}
                      onChange={e => handleUpdateStyle({ textColor: e.target.value })}
                      className="w-7 h-7 rounded-md cursor-pointer border border-slate-300 p-0 bg-transparent"
                    />
                  </div>
                </div>

                {/* Border Style & Width */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('borderStyle')}
                    </label>
                    <select
                      id="modal-select-border-style"
                      value={style.borderStyle}
                      onChange={e => handleUpdateStyle({ borderStyle: e.target.value as BorderStyle })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="solid">{t('borderSolid')}</option>
                      <option value="dashed">{t('borderDashed')}</option>
                      <option value="dotted">{t('borderDotted')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('borderWidth')}
                    </label>
                    <select
                      id="modal-select-border-width"
                      value={style.borderWidth}
                      onChange={e => handleUpdateStyle({ borderWidth: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value={1}>1px - Mảnh</option>
                      <option value={2}>2px - Vừa</option>
                      <option value={3}>3px - Dày</option>
                      <option value={4}>4px - Rất dày</option>
                      <option value={5}>5px - Nổi bật</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Relational Structure & IDs */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                  {t('relationshipsSection')}
                </h4>

                {/* Parent Node Select */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      {t('parentNodeLabel')}
                    </label>
                    <select
                      id="select-parent-node"
                      disabled={isRoot}
                      value={node.parentId || '__ROOT_NONE__'}
                      onChange={e => handleParentSelect(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      {isRoot ? (
                        <option value="__ROOT_NONE__">{t('noParent')}</option>
                      ) : (
                        <>
                          <option value="__ROOT_NONE__">-- Chọn node cha --</option>
                          {allNodes
                            .filter(n => n.id !== node.id && !graph.isDescendant(node.id, n.id))
                            .map(n => (
                              <option key={n.id} value={n.id}>
                                [{n.id}] {n.title}
                              </option>
                            ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Children Badges */}
                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">
                      {t('childNodesLabel')} ({node.childrenIds.length})
                    </label>
                    <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-white border border-slate-200 rounded-lg max-h-24 overflow-y-auto">
                      {node.childrenIds.length === 0 ? (
                        <span className="text-xs text-slate-400">{t('noChildren')}</span>
                      ) : (
                        node.childrenIds.map(childId => {
                          const childNode = graph.getNode(childId);
                          return (
                            <span
                              key={childId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono font-medium border border-blue-200"
                            >
                              {childId} {childNode ? `- ${childNode.title}` : ''}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Parent Link Style Config (for non-root nodes with parent) */}
                {!isRoot && node.parentId && (
                  <div className="pt-2">
                    <LinkStyleControl
                      title={t('parentLinkConfig')}
                      value={node.parentLinkStyle || {
                        arrow: 'none',
                        style: 'solid',
                        width: 2,
                        color: '#94a3b8',
                      }}
                      onChange={handleParentLinkStyleChange}
                    />
                  </div>
                )}

                {/* Cross Links Section */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-purple-600" />
                      {t('crossLinksLabel')} ({crossRelations.length})
                    </span>
                    {crossRelations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsConfirmDeleteAllCrossLinksOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 transition-colors cursor-pointer font-medium shadow-2xs"
                        title="Xóa nhanh toàn bộ liên kết chéo của node này"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                        <span>Xóa tất cả ({crossRelations.length})</span>
                      </button>
                    )}
                  </div>

                  {/* Existing cross links list */}
                  <div className="space-y-2 mb-3">
                    {crossRelations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">{t('noCrossLinks')}</p>
                    ) : (
                      crossRelations.map(rel => {
                        const isSource = rel.sourceId === node.id;
                        const sourceNode = graph.getNode(rel.sourceId);
                        const targetNode = graph.getNode(rel.targetId);
                        const edgeModel = rel || graph.getEdge(rel.id);
                        const currentLinkStyle: LinkStyleConfig = {
                          arrow: edgeModel?.arrow || rel.arrow || 'end',
                          style: edgeModel?.style || rel.style || 'dashed',
                          color: edgeModel?.color || rel.color || '#8b5cf6',
                          width: edgeModel?.width || rel.width || 2,
                        };

                        return (
                          <div
                            key={rel.id}
                            className="p-2.5 bg-white border border-purple-200/80 rounded-xl text-xs space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-slate-700 flex-wrap">
                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${isSource ? 'text-purple-700 bg-purple-100 border border-purple-200' : 'text-slate-700 bg-slate-100'}`}>
                                  [{rel.sourceId}]
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${!isSource ? 'text-purple-700 bg-purple-100 border border-purple-200' : 'text-slate-700 bg-slate-100'}`}>
                                  [{rel.targetId}]
                                </span>
                                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                  {isSource ? 'Xuất đi ➔' : 'Nhận về ⬅'}
                                </span>
                                <span className="text-slate-500 italic truncate max-w-[140px]">
                                  ({isSource ? targetNode?.title : sourceNode?.title})
                                </span>
                                {rel.label && (
                                  <span className="text-purple-600 bg-purple-50/80 px-2 py-0.5 rounded-full border border-purple-200">
                                    {rel.label}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => onRemoveCrossLink(rel.id)}
                                className="text-slate-400 hover:text-red-600 p-1 transition-colors rounded-md hover:bg-red-50"
                                title="Xóa liên kết"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Unified style control for existing crosslink */}
                            {onUpdateCrossLink && (
                              <LinkStyleControl
                                compact
                                value={currentLinkStyle}
                                onChange={newStyle => onUpdateCrossLink(rel.id, newStyle)}
                              />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add New Cross-link Form */}
                  <form onSubmit={handleCreateCrossLink} className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2.5">
                    <div className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-purple-600" />
                      {t('addCrossLinkBtn')}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        id="select-target-crosslink"
                        value={targetLinkId}
                        onChange={e => setTargetLinkId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- {t('selectTargetNode')} --</option>
                        {allNodes
                          .filter(n => n.id !== node.id)
                          .map(n => (
                            <option key={n.id} value={n.id}>
                              [{n.id}] {n.title}
                            </option>
                          ))}
                      </select>
                      <input
                        id="input-crosslink-label"
                        type="text"
                        value={targetLinkLabel}
                        onChange={e => setTargetLinkLabel(e.target.value)}
                        placeholder={t('relationLabelInput')}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg text-slate-800 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Shared Link Style Controls: Arrow Type, Line Style, Width, Color */}
                    <LinkStyleControl
                      value={{
                        arrow: linkArrow,
                        style: linkStyle,
                        width: linkWidth,
                        color: linkColor,
                      }}
                      onChange={cfg => {
                        if (cfg.arrow) setLinkArrow(cfg.arrow);
                        if (cfg.style) setLinkStyle(cfg.style);
                        if (cfg.width !== undefined) setLinkWidth(cfg.width);
                        if (cfg.color) setLinkColor(cfg.color);
                      }}
                    />

                    {linkError && <p className="text-xs text-red-500 font-medium">{linkError}</p>}
                    <div className="flex justify-end pt-1">
                      <button
                        id="btn-create-crosslink"
                        type="submit"
                        disabled={!targetLinkId}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('createLinkBtn')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* 3. Dangerous Zone: Delete Node */}
              {!isRoot && onDeleteNode && (
                <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-800 font-medium">Xóa node này khỏi sơ đồ?</span>
                  </div>
                  <button
                    id="btn-delete-node-modal"
                    type="button"
                    onClick={() => {
                      onDeleteNode(node.id);
                      onClose();
                    }}
                    className="px-3 py-1 text-xs font-semibold text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('deleteNode')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono">
              {node.id} {isRoot ? '(Root)' : ''}
            </span>
            {node.nodeType === 'character_profile' && (
              <label className="flex items-center gap-2 text-xs text-purple-900 font-semibold cursor-pointer select-none bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition-colors">
                <input
                  type="checkbox"
                  checked={autoCreateChildNodes}
                  onChange={e => setAutoCreateChildNodes(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer accent-purple-600"
                />
                <span>Đồng thời tạo node con ra ngoài sơ đồ khi Lưu</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Đóng
            </button>

            {node.nodeType === 'character_profile' ? (
              <button
                id="btn-apply-save-modal"
                type="button"
                onClick={() => handleApplyAndCreateChildNodes(true)}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{autoCreateChildNodes ? 'Lưu & Tạo node con ngoài sơ đồ' : 'Lưu cấu hình'}</span>
              </button>
            ) : (
              <button
                id="btn-done-modal"
                type="button"
                onClick={() => {
                  onUpdateNode(node);
                  onClose();
                }}
                className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {t('saveAndClose') || 'Lưu & Đóng'}
              </button>
            )}
          </div>
        </div>

        {/* Extraction Preview Modal */}
        {isExtractModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-indigo-200 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Extraction Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <ListPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      Tự động trích xuất node con từ nội dung chi tiết
                    </h3>
                    <p className="text-xs text-indigo-200">
                      Đã phát hiện {extractedItems.length} mục có thể chuyển thành node con trực thuộc node "{node.title}"
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExtractModalOpen(false)}
                  className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-indigo-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Extraction Body List */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs text-slate-600 pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = extractedItems.every(i => i.selected);
                        setExtractedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                      }}
                      className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      {extractedItems.every(i => i.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <span>·</span>
                    <span>
                      Đã chọn: <strong className="text-indigo-700">{extractedItems.filter(i => i.selected).length}</strong>/{extractedItems.length} node
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Bạn có thể sửa tiêu đề & nội dung trước khi tạo
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {extractedItems.map((item, idx) => (
                    <div
                      key={item.id || `ext-${idx}`}
                      className={`p-3 rounded-xl border transition-all ${
                        item.selected
                          ? 'bg-white border-indigo-300 shadow-2xs'
                          : 'bg-slate-100/70 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={e => {
                            const checked = e.target.checked;
                            setExtractedItems(prev =>
                              prev.map((it, i) => (i === idx ? { ...it, selected: checked } : it))
                            );
                          }}
                          className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600"
                        />
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          {item.profileData && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                                🎭 {item.profileData.faction || 'Hồ sơ nhân vật'}
                              </span>
                              {item.profileData.roleType && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                                  {item.profileData.roleType}
                                </span>
                              )}
                              {item.profileData.want && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 truncate max-w-[200px]" title={`Want: ${item.profileData.want}`}>
                                  🎯 {item.profileData.want}
                                </span>
                              )}
                            </div>
                          )}
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => {
                              const val = e.target.value;
                              setExtractedItems(prev =>
                                prev.map((it, i) => (i === idx ? { ...it, title: val } : it))
                              );
                            }}
                            placeholder="Tiêu đề node con..."
                            className="w-full px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                          />
                          {item.content && (
                            <textarea
                              rows={2}
                              value={item.content}
                              onChange={e => {
                                const val = e.target.value;
                                setExtractedItems(prev =>
                                  prev.map((it, i) => (i === idx ? { ...it, content: val } : it))
                                );
                              }}
                              placeholder="Nội dung chi tiết của node con..."
                              className="w-full p-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white resize-y"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setExtractedItems(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Xóa mục này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extraction Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clearSourceContentAfterExtract}
                    onChange={e => setClearSourceContentAfterExtract(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer accent-indigo-600"
                  />
                  <span>Xóa nội dung đã trích xuất khỏi node cha sau khi tạo</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExtractModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    id="btn-confirm-extract-child-nodes"
                    type="button"
                    onClick={handleConfirmExtract}
                    disabled={extractedItems.filter(i => i.selected).length === 0}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      Xác nhận tạo ({extractedItems.filter(i => i.selected).length}) node con
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Confirm Modal for Delete All Cross Links */}
        <ConfirmModal
          isOpen={isConfirmDeleteAllCrossLinksOpen}
          title="Xác nhận xóa toàn bộ liên kết chéo"
          message={`Bạn có chắc chắn muốn xóa toàn bộ ${crossRelations.length} liên kết chéo của node [${node.id}] "${node.title}"? Hành động này sẽ gỡ bỏ tất cả các đường liên kết chéo liên quan khỏi sơ đồ.`}
          confirmLabel={`Xóa tất cả (${crossRelations.length})`}
          cancelLabel="Hủy bỏ"
          isDestructive={true}
          onConfirm={() => {
            const count = crossRelations.length;
            onPushSnapshot?.();
            crossRelations.forEach(rel => onRemoveCrossLink(rel.id));
            onShowToast?.(`Đã xóa toàn bộ ${count} liên kết chéo của node!`);
            setIsConfirmDeleteAllCrossLinksOpen(false);
          }}
          onCancel={() => setIsConfirmDeleteAllCrossLinksOpen(false)}
        />
        {/* Character Quality Check Modal (3 Key Screenplay Questions) */}
        <CharacterQualityModal
          isOpen={showQualityModal}
          onClose={() => setShowQualityModal(false)}
          characters={node.getCharacterProfiles()}
          onUpdateCharacter={handleUpdateCharacterFromQuality}
          onSaveAll={handleSaveAllFromQuality}
          onShowToast={onShowToast}
        />
      </div>
    </div>
  );
};
