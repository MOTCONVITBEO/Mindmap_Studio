import { CharacterProfileData, CharacterColumnDef } from '../types/mindmap';

export const DEFAULT_CHARACTER_COLUMNS: CharacterColumnDef[] = [
  { key: 'faction', label: '1. Phe/ góc nhìn' },
  { key: 'roleType', label: '2. Tuyến Nhân vật' },
  { key: 'name', label: '3. Tên' },
  { key: 'strengths', label: '4. Điểm mạnh' },
  { key: 'weaknesses', label: '5. Điểm yếu' },
  { key: 'want', label: '6. Want (Muốn)' },
  { key: 'need', label: '7. Need (Cần thay đổi nội tâm)' },
  { key: 'ghostWound', label: '8. Ghost/Wound (Sợ)' },
  { key: 'theLie', label: '9. The Lie (Lời nói dối)' },
  { key: 'conflict', label: '10. Xung đột' },
  { key: 'actionTendency', label: '11. Xu hướng action' },
  { key: 'visualArchetype', label: '12. Hình tượng' },
];

/**
 * Robust parser for character profile tables copied from Excel, Google Sheets,
 * Markdown tables, or plain text with tab/comma/pipe delimiters.
 * Automatically detects:
 * - Known standard columns (including 'Hình tượng' / Visual Archetype)
 * - ANY custom/extra columns added by the user in Google Sheets / Excel
 * - Multiline cells with quotes (RFC-4180)
 * - Blank/merged cell inheritance (group members inheriting Faction/Role)
 * - Header row detection
 */
export function parseCharacterSheetWithColumns(text: string): {
  profiles: CharacterProfileData[];
  columns: CharacterColumnDef[];
} {
  if (!text || !text.trim()) {
    return { profiles: [], columns: [...DEFAULT_CHARACTER_COLUMNS] };
  }

  const rawText = text.trim();
  const hasTabs = rawText.includes('\t');
  const hasPipes = !hasTabs && rawText.includes('|');
  const delimiter = hasTabs ? '\t' : hasPipes ? '|' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotedCell = false;

  let i = 0;
  const len = rawText.length;

  while (i < len) {
    const char = rawText[i];
    const nextChar = i + 1 < len ? rawText[i + 1] : '';

    if (currentCell.length === 0 && char === '"') {
      inQuotedCell = true;
      i++;
      continue;
    }

    if (inQuotedCell) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i += 2;
          continue;
        }
        let lookAhead = i + 1;
        while (lookAhead < len && rawText[lookAhead] === ' ') {
          lookAhead++;
        }
        if (
          lookAhead >= len ||
          rawText[lookAhead] === delimiter ||
          rawText[lookAhead] === '\r' ||
          rawText[lookAhead] === '\n'
        ) {
          inQuotedCell = false;
          i = lookAhead;
          continue;
        }
      }
      currentCell += char;
      i++;
      continue;
    }

    if (char === delimiter) {
      currentRow.push(cleanCell(currentCell));
      currentCell = '';
      i++;
      continue;
    }

    if (char === '\r' || char === '\n') {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(cleanCell(currentCell));
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      i++;
      continue;
    }

    currentCell += char;
    i++;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(cleanCell(currentCell));
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  function cleanCell(c: string): string {
    let s = c.trim();
    if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) {
      s = s.slice(1, -1).trim();
    }
    return s.replace(/""/g, '"');
  }

  function slugify(s: string): string {
    return (
      'col_' +
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    );
  }

  // Identify header row
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rows.length, 3); r++) {
    const row = rows[r];
    const joined = row.join(' ').toLowerCase();
    if (
      (joined.includes('tên') || joined.includes('name')) &&
      (joined.includes('phe') || joined.includes('tuyến') || joined.includes('want') || joined.includes('mạnh'))
    ) {
      headerRowIndex = r;
      break;
    }
  }

  const columns: CharacterColumnDef[] = [];
  const colMappings: Array<{ key: string; label: string; isCustom: boolean }> = [];

  if (headerRowIndex !== -1) {
    const headerRow = rows[headerRowIndex];
    headerRow.forEach((rawCol, idx) => {
      const col = rawCol.trim();
      const lower = col.toLowerCase();
      let key = '';
      let isCustom = false;

      if (lower.includes('phe') || lower.includes('góc nhìn') || lower.includes('faction')) {
        key = 'faction';
      } else if (lower.includes('tuyến') || lower.includes('role')) {
        key = 'roleType';
      } else if ((lower.includes('tên') || lower.includes('name')) && !lower.includes('nội tâm')) {
        key = 'name';
      } else if (lower.includes('mạnh') || lower.includes('strength')) {
        key = 'strengths';
      } else if (lower.includes('yếu') || lower.includes('weakness')) {
        key = 'weaknesses';
      } else if (lower.includes('want') || lower.includes('muốn')) {
        key = 'want';
      } else if (lower.includes('need') || lower.includes('cần')) {
        key = 'need';
      } else if (
        lower.includes('vết thương') ||
        lower.includes('bóng ma') ||
        lower.includes('ghost') ||
        lower.includes('wound') ||
        lower.includes('sợ')
      ) {
        key = 'ghostWound';
      } else if (lower.includes('nói dối') || lower.includes('the lie') || lower.includes('lie')) {
        key = 'theLie';
      } else if (lower.includes('xung đột') || lower.includes('conflict')) {
        key = 'conflict';
      } else if (lower.includes('action') || lower.includes('xu hướng') || lower.includes('hành động')) {
        key = 'actionTendency';
      } else if (
        lower.includes('hình tượng') ||
        lower.includes('ngoại hình') ||
        lower.includes('archetype') ||
        lower.includes('visual') ||
        lower.includes('diện mạo')
      ) {
        key = 'visualArchetype';
      } else {
        key = slugify(col || `cột_${idx + 1}`);
        isCustom = true;
      }

      colMappings.push({ key, label: col || `Cột ${idx + 1}`, isCustom });
      columns.push({ key, label: col || `Cột ${idx + 1}`, isCustom });
    });
  } else {
    // Default standard columns
    DEFAULT_CHARACTER_COLUMNS.forEach(c => {
      colMappings.push({ ...c, isCustom: false });
      columns.push({ ...c, isCustom: false });
    });
  }

  const profiles: CharacterProfileData[] = [];
  let lastFaction = 'Phe chính diện';
  let lastRoleType = 'Nhân vật chính';

  rows.forEach((cols, rIdx) => {
    if (rIdx === headerRowIndex) return;

    const prof: CharacterProfileData = {
      faction: '',
      roleType: '',
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
    };

    cols.forEach((val, cIdx) => {
      const mapping = colMappings[cIdx];
      if (!mapping) {
        // Extra column beyond header length
        const extraKey = `col_${cIdx + 1}`;
        const extraLabel = `Cột ${cIdx + 1}`;
        if (!prof.customFields) prof.customFields = {};
        prof.customFields[extraLabel] = val;
        prof[extraKey] = val;
        if (!columns.some(c => c.key === extraKey)) {
          columns.push({ key: extraKey, label: extraLabel, isCustom: true });
        }
        return;
      }

      if (mapping.isCustom) {
        if (!prof.customFields) prof.customFields = {};
        prof.customFields[mapping.label] = val;
        prof[mapping.key] = val;
      } else {
        prof[mapping.key] = val;
      }
    });

    // Smart name resolution:
    // If name is empty, but roleType has content (e.g. "Nancy Wheeler và Jonathan Byers" or "Will")
    if (!prof.name && prof.roleType) {
      prof.name = prof.roleType;
      if (prof.strengths && prof.strengths.toLowerCase().includes('học đường')) {
        prof.roleType = 'Tầng lớp học đường 1980s';
      }
    }

    // Inherit faction if empty
    if (prof.faction) {
      lastFaction = prof.faction;
    } else {
      prof.faction = lastFaction;
    }

    // Inherit roleType if empty and name is present (e.g. Lucas and Dustin in Mike's group)
    if (prof.roleType) {
      lastRoleType = prof.roleType;
    } else if (prof.name) {
      prof.roleType = lastRoleType;
    }

    // If still no name and all core fields are empty, skip row
    if (
      !prof.name &&
      !prof.strengths &&
      !prof.weaknesses &&
      !prof.want &&
      !prof.ghostWound &&
      !prof.visualArchetype &&
      (!prof.customFields || Object.keys(prof.customFields).length === 0)
    ) {
      return;
    }

    // Clean up name if it has surrounding quotes or notes
    prof.name = prof.name.replace(/^["'\s]+|["'\s]+$/g, '');
    if (!prof.name) {
      prof.name = `Nhân vật #${profiles.length + 1}`;
    }

    profiles.push(prof);
  });

  return { profiles, columns };
}

/**
 * Convenience wrapper returning only profiles
 */
export function parseCharacterSheet(text: string): CharacterProfileData[] {
  return parseCharacterSheetWithColumns(text).profiles;
}

/**
 * Check if text contains structured character table data
 */
export function isCharacterProfileTable(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const hasHeaders =
    (lower.includes('phe') && (lower.includes('tuyến') || lower.includes('tên'))) ||
    (lower.includes('want') && lower.includes('need')) ||
    (lower.includes('điểm mạnh') && lower.includes('điểm yếu')) ||
    (lower.includes('hình tượng') || lower.includes('bóng ma tâm lý') || lower.includes('vết thương lòng'));

  const hasTabsOrPipes = (text.includes('\t') || text.includes('|')) && text.split(/\r?\n/).length >= 2;

  return hasHeaders || (hasTabsOrPipes && lower.includes('nhân vật'));
}

/**
 * Format full Vietnamese character profile summary
 */
export function formatCharacterSummary(
  profile: CharacterProfileData,
  index?: number,
  total?: number
): string {
  const numStr = total && total > 1 && typeof index === 'number' ? ` #${index + 1}` : '';
  const lines = [
    `【HỒ SƠ NHÂN VẬT${numStr}】`,
    `• Tên: ${profile.name || ''}`,
    `• Phe: ${profile.faction || ''} | Tuyến: ${profile.roleType || ''}`,
    `• Điểm mạnh: ${profile.strengths || ''}`,
    `• Điểm yếu: ${profile.weaknesses || ''}`,
    `• Want (Muốn): ${profile.want || ''}`,
    `• Need (Cần thay đổi nội tâm): ${profile.need || ''}`,
    `• Ghost/Wound (Bóng ma tâm lý): ${profile.ghostWound || ''}`,
    `• The Lie (Lời nói dối tin vào): ${profile.theLie || ''}`,
    `• Xung đột: ${profile.conflict || ''}`,
    `• Xu hướng action: ${profile.actionTendency || ''}`,
  ];

  if (profile.visualArchetype && profile.visualArchetype.trim()) {
    lines.push(`• Hình tượng: ${profile.visualArchetype.trim()}`);
  }

  if (profile.customFields && typeof profile.customFields === 'object') {
    Object.entries(profile.customFields).forEach(([label, val]) => {
      if (val && String(val).trim()) {
        lines.push(`• ${label}: ${String(val).trim()}`);
      }
    });
  }

  return lines.join('\n');
}

/**
 * Get color scheme based on character faction
 */
export function getFactionColorScheme(faction: string): {
  borderColor: string;
  fillColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
} {
  const f = (faction || '').toLowerCase();
  if (
    f.includes('phản') ||
    f.includes('quái vật') ||
    f.includes('kẻ thù') ||
    f.includes('hiểm hoạ') ||
    f.includes('hiểm họa')
  ) {
    return {
      borderColor: '#ef4444', // Red
      fillColor: '#fef2f2',
      textColor: '#7f1d1d',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
    };
  }
  if (f.includes('công lý') || f.includes('cảnh sát')) {
    return {
      borderColor: '#4f46e5', // Indigo
      fillColor: '#eef2ff',
      textColor: '#1e1b4b',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
    };
  }
  if (f.includes('vũ khí') || f.includes('nạn nhân') || f.includes('thí nghiệm')) {
    return {
      borderColor: '#9333ea', // Purple
      fillColor: '#faf5ff',
      textColor: '#3b0764',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
    };
  }
  if (f.includes('trung lập')) {
    return {
      borderColor: '#f59e0b', // Amber
      fillColor: '#fffbeb',
      textColor: '#78350f',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
    };
  }
  // Default: Chánh diện / Đồng minh
  return {
    borderColor: '#2563eb', // Blue
    fillColor: '#eff6ff',
    textColor: '#1e3a8a',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
  };
}
