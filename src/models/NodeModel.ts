import { MindmapNodeData, NodeChecklistItem, NodeShape, NodeStyle, LinkStyleConfig, ScriptAnnotation, NodeType, CharacterProfileData, CharacterColumnDef } from '../types/mindmap';

export class NodeModel {
  public id: string;
  public title: string;
  public content: string;
  public contents: string[];
  public checklist: NodeChecklistItem[];
  public scriptAnnotations: ScriptAnnotation[];
  public nodeType: NodeType;
  public characterProfile?: CharacterProfileData;
  public characterProfiles?: CharacterProfileData[];
  public characterColumns?: CharacterColumnDef[];
  public parentId: string | null;
  public childrenIds: string[];
  public position: { x: number; y: number };
  public style: NodeStyle;
  public parentLinkStyle?: LinkStyleConfig;
  public isGroup?: boolean;
  public completed?: boolean;

  constructor(data: MindmapNodeData) {
    this.id = data.id;
    this.title = data.title;
    this.content = data.content || '';
    if (data.contents && Array.isArray(data.contents) && data.contents.length > 0) {
      this.contents = [...data.contents];
      this.content = this.contents[0] || '';
    } else if (data.content) {
      this.contents = [data.content];
    } else {
      this.contents = [''];
    }
    this.checklist = data.checklist || [];
    this.scriptAnnotations = data.scriptAnnotations ? [...data.scriptAnnotations] : [];
    this.nodeType = data.nodeType || 'standard';
    if (data.characterProfiles && Array.isArray(data.characterProfiles) && data.characterProfiles.length > 0) {
      this.characterProfiles = data.characterProfiles.map(p => ({ ...p }));
      this.characterProfile = { ...this.characterProfiles[0] };
    } else if (data.characterProfile) {
      this.characterProfile = { ...data.characterProfile };
      this.characterProfiles = [{ ...data.characterProfile }];
    } else {
      this.characterProfiles = [];
    }
    this.characterColumns = data.characterColumns && Array.isArray(data.characterColumns)
      ? data.characterColumns.map(c => ({ ...c }))
      : undefined;
    this.parentId = data.parentId;
    this.childrenIds = [...(data.childrenIds || [])];
    this.position = { ...data.position };
    this.style = { ...data.style };
    this.isGroup = !!data.isGroup;
    this.completed = !!data.completed;
    if (data.parentLinkStyle) {
      this.parentLinkStyle = { ...data.parentLinkStyle };
    }
  }

  public toggleCompleted(): boolean {
    this.completed = !this.completed;
    return this.completed;
  }

  public setCompleted(completed: boolean): void {
    this.completed = completed;
  }

  public updateParentLinkStyle(linkUpdates: Partial<LinkStyleConfig>): void {
    this.parentLinkStyle = {
      ...(this.parentLinkStyle || {}),
      ...linkUpdates,
    };
  }

  public updateTitle(newTitle: string): void {
    this.title = newTitle;
  }

  public updateContent(newContent: string, index: number = 0): void {
    if (!this.contents || this.contents.length === 0) {
      this.contents = [newContent];
    } else {
      if (index >= 0 && index < this.contents.length) {
        this.contents[index] = newContent;
      } else {
        this.contents.push(newContent);
      }
    }
    this.content = this.contents[0] || '';
  }

  public addContentBlock(text: string = ''): number {
    if (!this.contents) {
      this.contents = [];
    }
    this.contents.push(text);
    this.content = this.contents[0] || '';
    return this.contents.length - 1;
  }

  public updateContentBlock(index: number, text: string): void {
    if (!this.contents) {
      this.contents = [text];
    } else if (index >= 0 && index < this.contents.length) {
      this.contents[index] = text;
    } else {
      this.contents.push(text);
    }
    this.content = this.contents[0] || '';
  }

  public removeContentBlock(index: number): void {
    if (!this.contents || this.contents.length <= 1) {
      this.contents = [''];
    } else {
      this.contents.splice(index, 1);
    }
    this.content = this.contents[0] || '';
  }

  public getFirstContent(): string {
    return (this.contents && this.contents[0]) ? this.contents[0] : (this.content || '');
  }

  public setPosition(x: number, y: number): void {
    this.position = { x, y };
  }

  public updateStyle(styleUpdates: Partial<NodeStyle>): void {
    this.style = {
      ...this.style,
      ...styleUpdates,
    };
  }

  public setShape(shape: NodeShape): void {
    this.style.shape = shape;
  }

  public setColors(fillColor: string, borderColor?: string, textColor?: string): void {
    this.style.fillColor = fillColor;
    if (borderColor) this.style.borderColor = borderColor;
    if (textColor) this.style.textColor = textColor;
  }

  public setBorder(width: number, borderStyle: NodeStyle['borderStyle'], color?: string): void {
    this.style.borderWidth = width;
    this.style.borderStyle = borderStyle;
    if (color) this.style.borderColor = color;
  }

  public addChild(childId: string): void {
    if (!this.childrenIds.includes(childId)) {
      this.childrenIds.push(childId);
    }
  }

  public removeChild(childId: string): void {
    this.childrenIds = this.childrenIds.filter(id => id !== childId);
  }

  public reorderChildren(newChildrenIds: string[]): void {
    this.childrenIds = [...newChildrenIds];
  }

  public moveChild(childId: string, targetIndex: number): boolean {
    const currentIndex = this.childrenIds.indexOf(childId);
    if (currentIndex === -1) return false;
    const clampedIndex = Math.max(0, Math.min(targetIndex, this.childrenIds.length - 1));
    if (currentIndex === clampedIndex) return false;
    const arr = [...this.childrenIds];
    arr.splice(currentIndex, 1);
    arr.splice(clampedIndex, 0, childId);
    this.childrenIds = arr;
    return true;
  }

  public setParent(parentId: string | null): void {
    this.parentId = parentId;
  }

  public addChecklistItem(text: string): void {
    this.checklist.push({
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      text,
      completed: false,
    });
  }

  public toggleChecklistItem(itemId: string): void {
    const item = this.checklist.find(i => i.id === itemId);
    if (item) {
      item.completed = !item.completed;
    }
  }

  public removeChecklistItem(itemId: string): void {
    this.checklist = this.checklist.filter(i => i.id !== itemId);
  }

  public getWidth(): number {
    switch (this.style.shape) {
      case 'diamond':
        return 180;
      case 'circle':
        return 150;
      case 'capsule':
        return 190;
      case 'hexagon':
        return 190;
      default:
        return 200;
    }
  }

  public getHeight(): number {
    switch (this.style.shape) {
      case 'diamond':
        return 110;
      case 'circle':
        return 150;
      case 'capsule':
        return 80;
      case 'hexagon':
        return 86;
      default:
        return 90;
    }
  }

  public getCenter(): { x: number; y: number } {
    return {
      x: this.position.x + this.getWidth() / 2,
      y: this.position.y + this.getHeight() / 2,
    };
  }

  public addScriptAnnotation(data: Omit<ScriptAnnotation, 'id' | 'createdAt'>): ScriptAnnotation {
    const newAnn: ScriptAnnotation = {
      ...data,
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    if (!this.scriptAnnotations) this.scriptAnnotations = [];
    this.scriptAnnotations.push(newAnn);
    return newAnn;
  }

  public removeScriptAnnotation(annotationId: string): void {
    if (!this.scriptAnnotations) return;
    this.scriptAnnotations = this.scriptAnnotations.filter(a => a.id !== annotationId);
  }

  public getScriptAnnotations(): ScriptAnnotation[] {
    return this.scriptAnnotations || [];
  }

  public updateNodeType(type: NodeType): void {
    this.nodeType = type;
    if (type === 'character_profile') {
      if (!this.characterProfiles || this.characterProfiles.length === 0) {
        const defaultProfile: CharacterProfileData = {
          faction: 'Chánh diện',
          roleType: 'Nhân vật chính',
          name: this.title || '',
          strengths: '',
          weaknesses: '',
          want: '',
          need: '',
          ghostWound: '',
          theLie: '',
          conflict: '',
          actionTendency: '',
        };
        this.characterProfiles = [defaultProfile];
        this.characterProfile = defaultProfile;
      } else if (!this.characterProfile) {
        this.characterProfile = this.characterProfiles[0];
      }
    }
  }

  public getCharacterProfiles(): CharacterProfileData[] {
    if (this.characterProfiles && this.characterProfiles.length > 0) {
      return this.characterProfiles;
    }
    if (this.characterProfile) {
      this.characterProfiles = [{ ...this.characterProfile }];
      return this.characterProfiles;
    }
    return [];
  }

  public setCharacterProfiles(profiles: CharacterProfileData[]): void {
    this.characterProfiles = profiles.map(p => ({ ...p }));
    this.characterProfile = this.characterProfiles[0] || undefined;
  }

  public addCharacterProfile(initial?: Partial<CharacterProfileData>): CharacterProfileData {
    const newProf: CharacterProfileData = {
      faction: initial?.faction || 'Chánh diện',
      roleType: initial?.roleType || 'Nhân vật chính',
      name: initial?.name || '',
      strengths: initial?.strengths || '',
      weaknesses: initial?.weaknesses || '',
      want: initial?.want || '',
      need: initial?.need || '',
      ghostWound: initial?.ghostWound || '',
      theLie: initial?.theLie || '',
      conflict: initial?.conflict || '',
      actionTendency: initial?.actionTendency || '',
    };
    if (!this.characterProfiles) {
      this.characterProfiles = [];
    }
    this.characterProfiles.push(newProf);
    if (!this.characterProfile) {
      this.characterProfile = newProf;
    }
    return newProf;
  }

  public updateCharacterProfileAtIndex(index: number, updates: Partial<CharacterProfileData>): void {
    const list = this.getCharacterProfiles();
    if (index >= 0 && index < list.length) {
      list[index] = {
        ...list[index],
        ...updates,
      };
      this.characterProfiles = [...list];
      this.characterProfile = this.characterProfiles[0];

      // If updating first row and name changed
      if (index === 0 && updates.name && (!this.title || this.title.startsWith('Node') || this.title.startsWith('Tiến trình'))) {
        this.title = updates.name;
      }
    }
  }

  public removeCharacterProfileAtIndex(index: number): void {
    if (!this.characterProfiles || index < 0 || index >= this.characterProfiles.length) return;
    this.characterProfiles.splice(index, 1);
    this.characterProfile = this.characterProfiles[0] || undefined;
  }

  public updateCharacterProfile(updates: Partial<CharacterProfileData>): void {
    this.updateCharacterProfileAtIndex(0, updates);
  }

  public getCharacterProfileSummary(): string {
    const profiles = this.getCharacterProfiles();
    if (profiles.length === 0) return '';
    return profiles.map(p => `[${p.faction || 'Phe'} | ${p.roleType || 'Tuyến'}]: ${p.name || ''}`).join('; ');
  }

  public getCharacterColumns(): CharacterColumnDef[] {
    if (this.characterColumns && this.characterColumns.length > 0) {
      return this.characterColumns;
    }
    return [
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
  }

  public setCharacterColumns(cols: CharacterColumnDef[]): void {
    this.characterColumns = cols.map(c => ({ ...c }));
  }

  public addCharacterColumn(col: CharacterColumnDef): void {
    const current = this.getCharacterColumns();
    if (!current.some(c => c.key === col.key)) {
      this.characterColumns = [...current, { ...col, isCustom: col.isCustom ?? true }];
    }
  }

  public removeCharacterColumn(columnKey: string): void {
    const current = this.getCharacterColumns();
    this.characterColumns = current.filter(c => c.key !== columnKey);
    if (this.characterProfiles) {
      this.characterProfiles.forEach(p => {
        delete p[columnKey];
        if (p.customFields) {
          delete p.customFields[columnKey];
        }
      });
    }
  }

  public toJSON(): MindmapNodeData {
    return {
      id: this.id,
      title: this.title,
      content: this.getFirstContent(),
      contents: this.contents ? [...this.contents] : [this.content || ''],
      checklist: this.checklist,
      scriptAnnotations: this.scriptAnnotations ? [...this.scriptAnnotations] : [],
      nodeType: this.nodeType,
      characterProfile: this.characterProfile ? { ...this.characterProfile } : undefined,
      characterProfiles: this.characterProfiles && this.characterProfiles.length > 0 ? this.characterProfiles.map(p => ({ ...p })) : undefined,
      characterColumns: this.characterColumns && this.characterColumns.length > 0 ? this.characterColumns.map(c => ({ ...c })) : undefined,
      parentId: this.parentId,
      childrenIds: [...this.childrenIds],
      position: { ...this.position },
      style: { ...this.style },
      parentLinkStyle: this.parentLinkStyle ? { ...this.parentLinkStyle } : undefined,
      isGroup: this.isGroup,
      completed: this.completed,
    };
  }

  public static createDefault(
    id: string,
    title: string,
    position: { x: number; y: number },
    parentId: string | null = null,
    isGroup: boolean = false
  ): NodeModel {
    return new NodeModel({
      id,
      title,
      content: '',
      checklist: [],
      parentId,
      childrenIds: [],
      position,
      isGroup,
      style: {
        shape: isGroup ? 'capsule' : 'rounded-rect',
        fillColor: isGroup ? '#f8fafc' : '#ffffff',
        textColor: '#1e293b',
        borderColor: isGroup ? '#6366f1' : '#3b82f6',
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 14,
      },
    });
  }
}
