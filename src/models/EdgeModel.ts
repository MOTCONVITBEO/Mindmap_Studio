import { MindmapRelationData, BorderStyle, RelationArrowType } from '../types/mindmap';

export class EdgeModel {
  public id: string;
  public sourceId: string;
  public targetId: string;
  public label?: string;
  public type: 'tree' | 'cross';
  public color: string;
  public style: BorderStyle;
  public arrow: RelationArrowType;
  public width: number;

  constructor(data: MindmapRelationData) {
    this.id = data.id;
    this.sourceId = data.sourceId;
    this.targetId = data.targetId;
    this.label = data.label;
    this.type = data.type;
    this.color = data.color || (data.type === 'tree' ? '#94a3b8' : '#8b5cf6');
    this.style = data.style || (data.type === 'tree' ? 'solid' : 'dashed');
    this.arrow = data.arrow || (data.type === 'cross' ? 'end' : 'none');
    this.width = data.width || 2;
  }

  public updateStyle(updates: {
    color?: string;
    style?: BorderStyle;
    arrow?: RelationArrowType;
    width?: number;
    label?: string;
  }): void {
    if (updates.color !== undefined) this.color = updates.color;
    if (updates.style !== undefined) this.style = updates.style;
    if (updates.arrow !== undefined) this.arrow = updates.arrow;
    if (updates.width !== undefined) this.width = updates.width;
    if (updates.label !== undefined) this.label = updates.label;
  }

  public toJSON(): MindmapRelationData {
    return {
      id: this.id,
      sourceId: this.sourceId,
      targetId: this.targetId,
      label: this.label,
      type: this.type,
      color: this.color,
      style: this.style,
      arrow: this.arrow,
      width: this.width,
    };
  }

  /**
   * Generates a smooth cubic bezier SVG path between source and target points
   */
  public static calculateCurvePath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    isTree: boolean = true
  ): string {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (isTree) {
      if (Math.abs(dx) >= 30) {
        // Horizontal bezier curve
        const offsetX = Math.max(Math.abs(dx) * 0.45, 40);
        const cp1x = start.x + (dx >= 0 ? offsetX : -offsetX);
        const cp1y = start.y;
        const cp2x = end.x - (dx >= 0 ? offsetX : -offsetX);
        const cp2y = end.y;
        return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
      } else {
        // Vertical bezier curve
        const offsetY = Math.max(Math.abs(dy) * 0.45, 30);
        const cp1x = start.x;
        const cp1y = start.y + (dy >= 0 ? offsetY : -offsetY);
        const cp2x = end.x;
        const cp2y = end.y - (dy >= 0 ? offsetY : -offsetY);
        return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
      }
    } else {
      // Cross-link: arched curve
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2 - 40;
      return `M ${start.x} ${start.y} Q ${midX} ${midY}, ${end.x} ${end.y}`;
    }
  }
}
