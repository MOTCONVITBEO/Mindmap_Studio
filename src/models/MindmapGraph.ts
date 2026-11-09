import { MindmapDataSchema, MindmapMetadata } from '../types/mindmap';
import { NodeModel } from './NodeModel';
import { EdgeModel } from './EdgeModel';

export class MindmapGraph {
  public meta: MindmapMetadata;
  public rootId: string;
  public nodes: Map<string, NodeModel>;
  public relations: Map<string, EdgeModel>;

  constructor(meta: MindmapMetadata, rootId: string) {
    this.meta = meta;
    this.rootId = rootId;
    this.nodes = new Map<string, NodeModel>();
    this.relations = new Map<string, EdgeModel>();
  }

  public getNode(id: string): NodeModel | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): NodeModel[] {
    return Array.from(this.nodes.values());
  }

  public getAllRelations(): EdgeModel[] {
    return Array.from(this.relations.values());
  }

  /**
   * Ensure bidirectional parent-child hierarchy consistency across all nodes.
   * Fixes any missing children IDs, orphan parentIds, or desynchronized parentLinkStyle colors.
   */
  public sanitizeHierarchy(): void {
    const root = this.nodes.get(this.rootId);
    if (!root) return;

    // 1. Root cannot have a parent
    root.parentId = null;

    // 2. Clean all childrenIds arrays from nonexistent node IDs or self-references
    for (const node of this.nodes.values()) {
      node.childrenIds = node.childrenIds.filter(
        cid => this.nodes.has(cid) && cid !== node.id
      );
    }

    // 3. Guarantee bidirectional consistency: node.parentId <-> parentNode.childrenIds
    for (const [nodeId, node] of this.nodes.entries()) {
      if (nodeId === this.rootId) continue;

      if (node.parentId && this.nodes.has(node.parentId)) {
        const parent = this.nodes.get(node.parentId)!;
        if (!parent.childrenIds.includes(nodeId)) {
          parent.childrenIds.push(nodeId);
        }
      } else {
        // Fallback orphan node to root
        node.parentId = this.rootId;
        if (!root.childrenIds.includes(nodeId)) {
          root.childrenIds.push(nodeId);
        }
      }
    }

    // 4. Ensure each non-root node has valid parentLinkStyle color matching parent dominant color
    for (const [nodeId, node] of this.nodes.entries()) {
      if (nodeId === this.rootId) continue;
      if (node.parentId && this.nodes.has(node.parentId)) {
        const parent = this.nodes.get(node.parentId)!;
        const parentFill = parent.style.fillColor;
        const parentBorder = parent.style.borderColor;
        const isWhiteOrLight =
          !parentFill ||
          parentFill === '#ffffff' ||
          parentFill.toLowerCase() === '#fff' ||
          parentFill === '#f8fafc' ||
          parentFill === '#f1f5f9';
        const dominantColor = isWhiteOrLight ? (parentBorder || '#3b82f6') : parentFill;

        if (!node.parentLinkStyle) {
          node.parentLinkStyle = {
            color: node.style.borderColor || dominantColor,
            width: 2.5,
            style: 'solid',
            arrow: 'none',
          };
        } else if (!node.parentLinkStyle.color) {
          node.parentLinkStyle.color = node.style.borderColor || dominantColor;
        }
      }
    }

    this.meta.updatedAt = new Date().toISOString();
  }

  public getTreeRelations(): EdgeModel[] {
    this.sanitizeHierarchy();
    const list: EdgeModel[] = [];
    for (const node of this.nodes.values()) {
      if (node.parentId && this.nodes.has(node.parentId)) {
        const parent = this.nodes.get(node.parentId)!;
        const parentFill = parent.style.fillColor;
        const parentBorder = parent.style.borderColor;
        const isWhiteOrLight =
          !parentFill ||
          parentFill === '#ffffff' ||
          parentFill.toLowerCase() === '#fff';
        const fallbackColor = isWhiteOrLight ? (parentBorder || '#3b82f6') : parentFill;

        list.push(
          new EdgeModel({
            id: `tree_${node.parentId}_${node.id}`,
            sourceId: node.parentId,
            targetId: node.id,
            type: 'tree',
            color: node.parentLinkStyle?.color || node.style.borderColor || fallbackColor,
            style: node.parentLinkStyle?.style || 'solid',
            arrow: node.parentLinkStyle?.arrow || 'none',
            width: node.parentLinkStyle?.width || 2.5,
          })
        );
      }
    }
    return list;
  }

  public getCrossRelations(): EdgeModel[] {
    return Array.from(this.relations.values()).filter(e => e.type === 'cross');
  }

  public getEdge(id: string): EdgeModel | undefined {
    return this.relations.get(id);
  }

  public generateNextNodeId(): string {
    let index = 1;
    while (this.nodes.has(`NODE-${index}`)) {
      index++;
    }
    return `NODE-${index}`;
  }

  public addNode(parentId?: string, initialData?: Partial<NodeModel>): NodeModel {
    const targetParentId = parentId && this.nodes.has(parentId) ? parentId : null;
    const parentNode = targetParentId ? this.nodes.get(targetParentId) : null;

    const newId = initialData?.id || this.generateNextNodeId();
    
    // Position default: offset from parent or canvas center
    let pos = { x: 500, y: 300 };
    if (parentNode) {
      const childCount = parentNode.childrenIds.length;
      const isRoot = parentNode.id === this.rootId;
      const isLeftSide = isRoot && childCount % 2 === 1;
      const horizontalOffset = isLeftSide ? -280 : 280;
      const verticalOffset = (childCount - Math.floor(childCount / 2)) * 105 * (childCount % 2 === 0 ? 1 : -1);

      if (isRoot) {
        pos = {
          x: parentNode.position.x + horizontalOffset,
          y: parentNode.position.y + verticalOffset,
        };
      } else {
        // Child of a group/stage/card: place cleanly to the right
        pos = {
          x: parentNode.position.x + 280,
          y: parentNode.position.y + childCount * 100,
        };
      }
    }

    const newNode = NodeModel.createDefault(
      newId,
      initialData?.title || `Node ${newId}`,
      initialData?.position || pos,
      targetParentId
    );

    // Color inheritance from parent: child node border matches parent's fill or border color
    if (parentNode) {
      const parentFill = parentNode.style.fillColor;
      const parentBorder = parentNode.style.borderColor;
      const isWhiteOrLightNeutral =
        !parentFill ||
        parentFill === '#ffffff' ||
        parentFill.toLowerCase() === '#fff' ||
        parentFill === '#f8fafc' ||
        parentFill === '#f1f5f9';
      const inheritedColor = isWhiteOrLightNeutral ? (parentBorder || '#3b82f6') : parentFill;

      newNode.style.borderColor = initialData?.style?.borderColor || inheritedColor;
      newNode.parentId = parentNode.id;
      
      // Default connection link to match branch theme color
      newNode.parentLinkStyle = {
        color: initialData?.parentLinkStyle?.color || inheritedColor,
        width: initialData?.parentLinkStyle?.width || 2.5,
        style: initialData?.parentLinkStyle?.style || 'solid',
        arrow: initialData?.parentLinkStyle?.arrow || 'none',
      };
    }

    if (initialData?.content) newNode.content = initialData.content;
    if (initialData?.contents) newNode.contents = [...initialData.contents];
    if (initialData?.nodeType) newNode.nodeType = initialData.nodeType;
    if (initialData?.characterProfile) newNode.characterProfile = { ...initialData.characterProfile };
    if (initialData?.characterProfiles) newNode.characterProfiles = initialData.characterProfiles.map(p => ({ ...p }));
    if (initialData?.style) newNode.updateStyle(initialData.style);
    if (initialData?.parentLinkStyle) newNode.updateParentLinkStyle(initialData.parentLinkStyle);
    if (initialData?.isGroup !== undefined) newNode.isGroup = initialData.isGroup;

    // If parent exists, register as child
    if (parentNode) {
      parentNode.addChild(newId);
    }

    this.nodes.set(newId, newNode);
    this.meta.updatedAt = new Date().toISOString();
    return newNode;
  }

  /**
   * Insert a new parent node above an existing node
   * The new parent takes the old parent of `nodeId` as its parent,
   * and `nodeId` becomes a child of the new parent.
   */
  public insertParent(nodeId: string, title?: string): NodeModel | null {
    const targetNode = this.nodes.get(nodeId);
    if (!targetNode) return null;

    // Determine old parent of targetNode
    const oldParentId = targetNode.parentId;
    const oldParent = oldParentId ? this.nodes.get(oldParentId) : null;

    // Generate unique ID
    let counter = this.nodes.size + 1;
    let newId = `N${counter}`;
    while (this.nodes.has(newId)) {
      counter++;
      newId = `N${counter}`;
    }

    // Position the new parent halfway between old parent and target node, or slightly above
    let newPos = { x: targetNode.position.x - 180, y: targetNode.position.y };
    if (oldParent) {
      newPos = {
        x: Math.round((oldParent.position.x + targetNode.position.x) / 2),
        y: Math.round((oldParent.position.y + targetNode.position.y) / 2) - 20,
      };
    } else {
      // If target is root or has no parent, shift new parent to the left
      newPos = {
        x: targetNode.position.x - 240,
        y: targetNode.position.y,
      };
    }

    // Create the new parent node
    const newParentNode = NodeModel.createDefault(
      newId,
      title || `Node Cha ${newId}`,
      newPos,
      oldParentId
    );

    // Color inheritance for the inserted parent
    const baseColorNode = oldParent || targetNode;
    if (baseColorNode) {
      const baseFill = baseColorNode.style.fillColor;
      const baseBorder = baseColorNode.style.borderColor;
      const isWhiteOrLight = !baseFill || baseFill === '#ffffff' || baseFill.toLowerCase() === '#fff';
      const inheritedColor = isWhiteOrLight ? (baseBorder || '#3b82f6') : baseFill;
      newParentNode.style.borderColor = inheritedColor;
      newParentNode.parentLinkStyle = {
        color: inheritedColor,
        width: 2.5,
        style: 'solid',
        arrow: 'none',
      };
    }

    // If target had a parent, replace target with newParent in oldParent's children
    if (oldParent) {
      oldParent.removeChild(nodeId);
      oldParent.addChild(newId);
    }

    // If target was root, the new parent becomes the new root
    if (nodeId === this.rootId) {
      this.rootId = newId;
    }

    // Link targetNode to newParent
    targetNode.setParent(newId);
    newParentNode.addChild(nodeId);

    this.nodes.set(newId, newParentNode);
    this.meta.updatedAt = new Date().toISOString();
    return newParentNode;
  }

  /**
   * Safe reparenting: changes parentId of node, prevents cycle
   */
  public reparent(nodeId: string, newParentId: string | null): boolean {
    if (nodeId === this.rootId && newParentId !== null) {
      // Root cannot be child of another node
      return false;
    }
    if (nodeId === newParentId) {
      return false;
    }
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    // Check for circular dependency
    if (newParentId) {
      if (this.isDescendant(nodeId, newParentId)) {
        return false; // Cannot make an ancestor a child of its own descendant
      }
      const newParent = this.nodes.get(newParentId);
      if (!newParent) return false;
    }

    // Remove from old parent
    if (node.parentId && this.nodes.has(node.parentId)) {
      this.nodes.get(node.parentId)!.removeChild(nodeId);
    }

    // Add to new parent
    node.setParent(newParentId);
    if (newParentId) {
      const parentNode = this.nodes.get(newParentId)!;
      parentNode.addChild(nodeId);

      // Harmonize node border and connection line with new parent
      const parentFill = parentNode.style.fillColor;
      const parentBorder = parentNode.style.borderColor;
      const isWhiteOrLight = !parentFill || parentFill === '#ffffff' || parentFill.toLowerCase() === '#fff';
      const inheritedColor = isWhiteOrLight ? (parentBorder || '#3b82f6') : parentFill;

      node.style.borderColor = inheritedColor;
      node.parentLinkStyle = {
        color: inheritedColor,
        width: 2.5,
        style: 'solid',
        arrow: 'none',
      };
    }

    this.meta.updatedAt = new Date().toISOString();
    return true;
  }

  public reorderChildren(parentId: string, newChildrenIds: string[]): boolean {
    const parent = this.nodes.get(parentId);
    if (!parent) return false;
    parent.reorderChildren(newChildrenIds);
    this.meta.updatedAt = new Date().toISOString();
    return true;
  }

  public moveChildIndex(parentId: string, childId: string, direction: 'left' | 'right' | number): boolean {
    const parent = this.nodes.get(parentId);
    if (!parent) return false;
    const currentIndex = parent.childrenIds.indexOf(childId);
    if (currentIndex === -1) return false;

    let targetIndex = currentIndex;
    if (direction === 'left') targetIndex = currentIndex - 1;
    else if (direction === 'right') targetIndex = currentIndex + 1;
    else targetIndex = direction;

    const res = parent.moveChild(childId, targetIndex);
    if (res) {
      this.meta.updatedAt = new Date().toISOString();
    }
    return res;
  }

  /**
   * Check if targetId is inside the subtree rooted at potentialAncestorId
   */
  public isDescendant(potentialAncestorId: string, targetId: string): boolean {
    if (potentialAncestorId === targetId) return true;
    const ancestor = this.nodes.get(potentialAncestorId);
    if (!ancestor) return false;

    for (const childId of ancestor.childrenIds) {
      if (childId === targetId || this.isDescendant(childId, targetId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Removes a node with option to keep or delete children
   * @param nodeId ID of node to remove
   * @param options.keepChildren If true, reparents children to parent of node. If false, recursively deletes entire subtree.
   */
  public removeNode(nodeId: string, options?: { keepChildren?: boolean }): void {
    if (nodeId === this.rootId) {
      // Prevent deleting root node directly
      return;
    }
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const keepChildren = options?.keepChildren ?? true;

    if (keepChildren) {
      // Reparent children to node's parent, or to root if none
      const fallbackParentId = node.parentId || this.rootId;
      const fallbackParent = this.nodes.get(fallbackParentId);

      for (const childId of [...node.childrenIds]) {
        const child = this.nodes.get(childId);
        if (child) {
          child.setParent(fallbackParentId);
          if (fallbackParent && !fallbackParent.childrenIds.includes(childId)) {
            fallbackParent.addChild(childId);
          }
        }
      }
    } else {
      // Recursively delete all descendant children
      const deleteSubtree = (targetId: string) => {
        const targetNode = this.nodes.get(targetId);
        if (!targetNode) return;

        for (const childId of [...targetNode.childrenIds]) {
          deleteSubtree(childId);
        }

        // Clean cross relations
        for (const [relId, rel] of this.relations.entries()) {
          if (rel.sourceId === targetId || rel.targetId === targetId) {
            this.relations.delete(relId);
          }
        }

        this.nodes.delete(targetId);
      };

      for (const childId of [...node.childrenIds]) {
        deleteSubtree(childId);
      }
    }

    // Remove from parent
    if (node.parentId && this.nodes.has(node.parentId)) {
      this.nodes.get(node.parentId)!.removeChild(nodeId);
    }

    // Remove cross relations referencing this node
    for (const [relId, rel] of this.relations.entries()) {
      if (rel.sourceId === nodeId || rel.targetId === nodeId) {
        this.relations.delete(relId);
      }
    }

    this.nodes.delete(nodeId);
    this.meta.updatedAt = new Date().toISOString();
  }

  public addCrossLink(
    sourceId: string,
    targetId: string,
    label?: string,
    options?: {
      color?: string;
      style?: import('../types/mindmap').BorderStyle;
      arrow?: import('../types/mindmap').RelationArrowType;
      width?: number;
    }
  ): EdgeModel | null {
    if (sourceId === targetId || !this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }

    // Check if relation already exists
    for (const rel of this.relations.values()) {
      if (
        (rel.sourceId === sourceId && rel.targetId === targetId) ||
        (rel.sourceId === targetId && rel.targetId === sourceId)
      ) {
        if (options) {
          rel.updateStyle(options);
        }
        if (label !== undefined) {
          rel.label = label;
        }
        return rel;
      }
    }

    const id = `cross_${sourceId}_${targetId}_${Date.now()}`;
    const edge = new EdgeModel({
      id,
      sourceId,
      targetId,
      label,
      type: 'cross',
      color: options?.color || '#8b5cf6',
      style: options?.style || 'dashed',
      arrow: options?.arrow || 'end',
      width: options?.width || 2,
    });
    this.relations.set(id, edge);
    this.meta.updatedAt = new Date().toISOString();
    return edge;
  }

  public updateCrossLink(
    edgeId: string,
    updates: {
      color?: string;
      style?: import('../types/mindmap').BorderStyle;
      arrow?: import('../types/mindmap').RelationArrowType;
      width?: number;
      label?: string;
    }
  ): boolean {
    const edge = this.relations.get(edgeId);
    if (!edge) return false;
    edge.updateStyle(updates);
    this.meta.updatedAt = new Date().toISOString();
    return true;
  }

  public removeCrossLink(edgeId: string): void {
    this.relations.delete(edgeId);
    this.meta.updatedAt = new Date().toISOString();
  }

  public getCrossLinksForNode(nodeId: string): Array<{
    edge: EdgeModel;
    otherNode: NodeModel;
    isSource: boolean;
  }> {
    const results: Array<{ edge: EdgeModel; otherNode: NodeModel; isSource: boolean }> = [];
    const seenOtherIds = new Set<string>();
    for (const rel of this.relations.values()) {
      if (rel.sourceId === nodeId) {
        const target = this.nodes.get(rel.targetId);
        if (target && !seenOtherIds.has(target.id)) {
          seenOtherIds.add(target.id);
          results.push({ edge: rel, otherNode: target, isSource: true });
        }
      } else if (rel.targetId === nodeId) {
        const source = this.nodes.get(rel.sourceId);
        if (source && !seenOtherIds.has(source.id)) {
          seenOtherIds.add(source.id);
          results.push({ edge: rel, otherNode: source, isSource: false });
        }
      }
    }
    return results;
  }

  /**
   * Automatically organize layout in a clean, non-overlapping horizontal mindmap tree.
   * Uses recursive subtree bounding box calculation to prevent any node overlaps.
   */
  public autoLayout(): void {
    const root = this.nodes.get(this.rootId);
    if (!root) return;

    // Place root in center
    const centerX = 600;
    const centerY = 450;
    root.setPosition(centerX, centerY);

    const children = root.childrenIds
      .map(id => this.nodes.get(id))
      .filter((n): n is NodeModel => !!n);

    if (children.length === 0) {
      this.meta.updatedAt = new Date().toISOString();
      return;
    }

    // Split children between right side and left side for a balanced mindmap
    const rightChildren = children.filter((_, idx) => idx % 2 === 0);
    const leftChildren = children.filter((_, idx) => idx % 2 === 1);

    const HORIZONTAL_GAP = 90; // distance between parent and child border
    const MIN_VERTICAL_GAP = 28; // minimum vertical padding between siblings

    /**
     * Compute total vertical height needed for the entire subtree rooted at `node`
     */
    const computeSubtreeHeight = (node: NodeModel): number => {
      const nodeChildren = node.childrenIds
        .map(id => this.nodes.get(id))
        .filter((n): n is NodeModel => !!n);

      const selfHeight = node.getHeight();

      if (nodeChildren.length === 0) {
        return selfHeight;
      }

      let childrenTotalHeight = 0;
      for (let i = 0; i < nodeChildren.length; i++) {
        const childH = computeSubtreeHeight(nodeChildren[i]);
        childrenTotalHeight += childH;
        if (i < nodeChildren.length - 1) {
          childrenTotalHeight += MIN_VERTICAL_GAP;
        }
      }

      return Math.max(selfHeight, childrenTotalHeight);
    };

    /**
     * Recursive layout placement guaranteeing non-overlapping bounding boxes
     */
    const layoutSubtreeRecursive = (
      node: NodeModel,
      parentRightOrLeftX: number,
      targetCenterY: number,
      direction: 1 | -1
    ) => {
      const selfWidth = node.getWidth();
      const selfHeight = node.getHeight();

      // Position current node
      let nodeX: number;
      if (direction === 1) {
        nodeX = parentRightOrLeftX + HORIZONTAL_GAP;
      } else {
        nodeX = parentRightOrLeftX - HORIZONTAL_GAP - selfWidth;
      }
      const nodeY = targetCenterY - selfHeight / 2;
      node.setPosition(nodeX, nodeY);

      const nodeChildren = node.childrenIds
        .map(id => this.nodes.get(id))
        .filter((n): n is NodeModel => !!n);

      if (nodeChildren.length === 0) return;

      // Calculate total height of all children subtrees
      const subtreeHeights = nodeChildren.map(c => computeSubtreeHeight(c));
      const totalChildrenHeight =
        subtreeHeights.reduce((acc, h) => acc + h, 0) +
        (nodeChildren.length - 1) * MIN_VERTICAL_GAP;

      // Start placing children centered around targetCenterY
      let currentY = targetCenterY - totalChildrenHeight / 2;
      const childAnchorX = direction === 1 ? nodeX + selfWidth : nodeX;

      for (let i = 0; i < nodeChildren.length; i++) {
        const child = nodeChildren[i];
        const childSubtreeH = subtreeHeights[i];
        const childCenterY = currentY + childSubtreeH / 2;

        layoutSubtreeRecursive(child, childAnchorX, childCenterY, direction);
        currentY += childSubtreeH + MIN_VERTICAL_GAP;
      }
    };

    // Layout right side
    if (rightChildren.length > 0) {
      const rightHeights = rightChildren.map(c => computeSubtreeHeight(c));
      const totalRightHeight =
        rightHeights.reduce((acc, h) => acc + h, 0) +
        (rightChildren.length - 1) * MIN_VERTICAL_GAP;

      let curY = centerY - totalRightHeight / 2;
      const rootRightX = centerX + root.getWidth();

      for (let i = 0; i < rightChildren.length; i++) {
        const child = rightChildren[i];
        const childSubtreeH = rightHeights[i];
        const childCenterY = curY + childSubtreeH / 2;

        layoutSubtreeRecursive(child, rootRightX, childCenterY, 1);
        curY += childSubtreeH + MIN_VERTICAL_GAP;
      }
    }

    // Layout left side
    if (leftChildren.length > 0) {
      const leftHeights = leftChildren.map(c => computeSubtreeHeight(c));
      const totalLeftHeight =
        leftHeights.reduce((acc, h) => acc + h, 0) +
        (leftChildren.length - 1) * MIN_VERTICAL_GAP;

      let curY = centerY - totalLeftHeight / 2;
      const rootLeftX = centerX;

      for (let i = 0; i < leftChildren.length; i++) {
        const child = leftChildren[i];
        const childSubtreeH = leftHeights[i];
        const childCenterY = curY + childSubtreeH / 2;

        layoutSubtreeRecursive(child, rootLeftX, childCenterY, -1);
        curY += childSubtreeH + MIN_VERTICAL_GAP;
      }
    }

    this.meta.updatedAt = new Date().toISOString();
  }

  /**
   * Recursively propagate parent node colors to all descendant children nodes and connection links.
   * If a parent has a colorful background, descendants inherit that color as their border and link color.
   * If a parent has a white/neutral background, descendants inherit its border color.
   */
  public autoUpdateChildColors(): number {
    const root = this.nodes.get(this.rootId);
    if (!root) return 0;

    let updatedCount = 0;

    // Palette of vibrant colors for level 1 root branches if they don't have one
    const defaultBranchColors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#8b5cf6', // purple
      '#f59e0b', // amber
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#e11d48', // rose
    ];

    const isLightOrWhite = (color?: string) => {
      if (!color) return true;
      const c = color.toLowerCase().trim();
      return c === '#ffffff' || c === '#fff' || c === '#f8fafc' || c === '#f1f5f9' || c === '#ffffff00';
    };

    const getDominantColor = (node: NodeModel, fallback: string): string => {
      const fill = node.style.fillColor;
      const border = node.style.borderColor;
      if (fill && !isLightOrWhite(fill)) return fill;
      if (border && !isLightOrWhite(border)) return border;
      return fallback;
    };

    // Recursive helper to update children
    const propagateColor = (parentNode: NodeModel, inheritedColor: string) => {
      for (const childId of parentNode.childrenIds) {
        const child = this.nodes.get(childId);
        if (!child) continue;

        // Apply inherited color to child's border and connection link
        child.style.borderColor = inheritedColor;
        child.parentLinkStyle = {
          color: inheritedColor,
          width: 2.5,
          style: child.parentLinkStyle?.style || 'solid',
          arrow: child.parentLinkStyle?.arrow || 'none',
        };
        updatedCount++;

        // Determine what color this child passes down to its own descendants
        const childColorForDescendants = getDominantColor(child, inheritedColor);
        propagateColor(child, childColorForDescendants);
      }
    };

    // For level 1 children of root: assign branch colors if root or branch needs them
    const rootChildren = root.childrenIds
      .map(id => this.nodes.get(id))
      .filter((n): n is NodeModel => !!n);

    rootChildren.forEach((child, index) => {
      const fallbackColor = defaultBranchColors[index % defaultBranchColors.length];
      const branchColor = getDominantColor(child, fallbackColor);

      // If level 1 child is default or white fill, give it the branch color on border
      if (isLightOrWhite(child.style.fillColor) && isLightOrWhite(child.style.borderColor)) {
        child.style.borderColor = branchColor;
      }
      child.parentLinkStyle = {
        color: branchColor,
        width: 2.5,
        style: child.parentLinkStyle?.style || 'solid',
        arrow: child.parentLinkStyle?.arrow || 'none',
      };
      updatedCount++;

      // Propagate down all descendants of this branch
      const descendantColor = getDominantColor(child, branchColor);
      propagateColor(child, descendantColor);
    });

    this.meta.updatedAt = new Date().toISOString();
    return updatedCount;
  }

  /**
   * Calculate bounding box enclosing all nodes with their widths and heights
   */
  public getBoundingBox(): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    if (this.nodes.size === 0) {
      return { minX: 0, minY: 0, maxX: 1200, maxY: 800, width: 1200, height: 800 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of this.nodes.values()) {
      const x1 = node.position.x;
      const y1 = node.position.y;
      const x2 = x1 + node.getWidth();
      const y2 = y1 + node.getHeight();

      if (x1 < minX) minX = x1;
      if (y1 < minY) minY = y1;
      if (x2 > maxX) maxX = x2;
      if (y2 > maxY) maxY = y2;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(maxX - minX, 100),
      height: Math.max(maxY - minY, 100),
    };
  }

  /**
   * Source Text Management
   */
  public setSourceText(text: string): void {
    this.meta.sourceText = text;
    this.meta.updatedAt = new Date().toISOString();
  }

  public getSourceText(): string {
    return this.meta.sourceText || '';
  }

  /**
   * AI Co-pilot Chat History
   */
  public getAiHistory(): import('../types/mindmap').AIChatMessage[] {
    return this.meta.aiHistory || [];
  }

  public addAiHistoryMessage(msg: import('../types/mindmap').AIChatMessage): void {
    if (!this.meta.aiHistory) {
      this.meta.aiHistory = [];
    }
    this.meta.aiHistory.push(msg);
    // Keep last 30 messages to avoid unbounded size
    if (this.meta.aiHistory.length > 30) {
      this.meta.aiHistory = this.meta.aiHistory.slice(-30);
    }
    this.meta.updatedAt = new Date().toISOString();
  }

  public clearAiHistory(): void {
    this.meta.aiHistory = [];
    this.meta.updatedAt = new Date().toISOString();
  }

  /**
   * Export structured outline text for Gemini context understanding
   */
  public exportHierarchyContext(maxDepth: number = 8): { outline: string; rawTree: any } {
    const root = this.nodes.get(this.rootId);
    if (!root) {
      return { outline: '(Empty Mindmap)', rawTree: null };
    }

    const lines: string[] = [];

    const buildSubtree = (nodeId: string, depth: number): any => {
      const node = this.nodes.get(nodeId);
      if (!node) return null;

      const indent = '  '.repeat(depth);
      let line = `${indent}- [ID: ${node.id}] ${node.title}`;
      if (node.content && node.content.trim()) {
        const shortContent = node.content.replace(/\n+/g, ' ').slice(0, 100);
        line += ` (Notes: ${shortContent}...)`;
      }
      if (node.checklist && node.checklist.length > 0) {
        line += ` [${node.checklist.length} checklist items]`;
      }
      lines.push(line);

      const childrenObj: any[] = [];
      if (depth < maxDepth) {
        for (const cId of node.childrenIds) {
          const childObj = buildSubtree(cId, depth + 1);
          if (childObj) childrenObj.push(childObj);
        }
      }

      return {
        id: node.id,
        title: node.title,
        content: node.content || undefined,
        checklistCount: node.checklist?.length || 0,
        children: childrenObj,
      };
    };

    const treeJson = buildSubtree(this.rootId, 0);

    return {
      outline: lines.join('\n'),
      rawTree: treeJson,
    };
  }

  /**
   * Generates a beautifully formatted text tree with Unicode branches and relational IDs for TXT export
   */
  public toTextTree(): string {
    const root = this.nodes.get(this.rootId);
    if (!root) return '=== SƠ ĐỒ TƯ DUY (Trống) ===';

    const out: string[] = [];
    out.push('================================================================');
    out.push(`SƠ ĐỒ TƯ DUY: ${this.meta.title.toUpperCase()}`);
    out.push(`ID Sơ đồ: ${this.meta.id} | Ngày tạo: ${new Date(this.meta.createdAt).toLocaleString()}`);
    out.push(`Tổng số Node: ${this.nodes.size} | Liên kết chéo: ${this.relations.size}`);
    out.push('================================================================\n');

    const renderTree = (nodeId: string, prefix: string, isLast: boolean, isRoot: boolean) => {
      const node = this.nodes.get(nodeId);
      if (!node) return;

      const branchMarker = isRoot ? '📌 ' : isLast ? '└── ' : '├── ';
      let nodeLine = `${prefix}${branchMarker}[${node.id}] ${node.title}`;
      if (node.style.shape && node.style.shape !== 'rounded-rect') {
        nodeLine += ` <shape: ${node.style.shape}>`;
      }
      out.push(nodeLine);

      const nextPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');

      // If node has content/notes, display indented
      if (node.content && node.content.trim()) {
        const contentLines = node.content.trim().split('\n');
        for (const cl of contentLines) {
          out.push(`${nextPrefix}    📝 ${cl}`);
        }
      }

      // If node has checklist items, display indented
      if (node.checklist && node.checklist.length > 0) {
        for (const item of node.checklist) {
          const status = item.completed ? '[x]' : '[ ]';
          out.push(`${nextPrefix}    ${status} ${item.text}`);
        }
      }

      // Render children
      const children = node.childrenIds
        .map(cid => this.nodes.get(cid))
        .filter((c): c is NodeModel => !!c);

      children.forEach((child, index) => {
        const isChildLast = index === children.length - 1;
        renderTree(child.id, nextPrefix, isChildLast, false);
      });
    };

    renderTree(this.rootId, '', true, true);

    // Cross Relations section
    const crossRels = this.getCrossRelations();
    if (crossRels.length > 0) {
      out.push('\n----------------------------------------------------------------');
      out.push('LIÊN KẾT CHÉO (CROSS RELATIONS):');
      out.push('----------------------------------------------------------------');
      for (const rel of crossRels) {
        const src = this.nodes.get(rel.sourceId);
        const tgt = this.nodes.get(rel.targetId);
        const labelStr = rel.label ? ` --[ ${rel.label} ]--> ` : ' -----> ';
        out.push(`- [${rel.sourceId}] "${src?.title || '?'}"${labelStr}[${rel.targetId}] "${tgt?.title || '?'}"`);
      }
    }

    out.push('\n================================================================');
    out.push(`Xuất bởi Mindmap Studio vào lúc: ${new Date().toLocaleString()}`);
    out.push('================================================================');

    return out.join('\n');
  }

  /**
   * Robust node resolver: Finds a node ID by exact ID, case-insensitive ID, ID pattern extraction,
   * exact title matching, or substring title matching.
   */
  public findNodeId(query?: string | null): string | null {
    if (!query) return null;
    const q = query.trim();
    if (!q) return null;

    // 1. Direct ID match
    if (this.nodes.has(q)) return q;

    // 2. Case-insensitive exact ID match
    const upperQ = q.toUpperCase();
    for (const id of this.nodes.keys()) {
      if (id.toUpperCase() === upperQ) return id;
    }

    // 3. Extract ID pattern: [ID: N2], ID: N2, (N2), N2, etc.
    const idMatch = q.match(/\b(ROOT|N\d+|NODE-\d+)\b/i);
    if (idMatch) {
      const candidateId = idMatch[1].toUpperCase();
      for (const id of this.nodes.keys()) {
        if (id.toUpperCase() === candidateId) return id;
      }
    }

    // 4. Exact Title Match (case-insensitive & trimmed)
    const lowerQ = q.toLowerCase();
    for (const node of this.nodes.values()) {
      if (node.title.trim().toLowerCase() === lowerQ) {
        return node.id;
      }
    }

    // 5. Title substring or inclusion match
    for (const node of this.nodes.values()) {
      const lowerTitle = node.title.trim().toLowerCase();
      if (lowerTitle && (lowerTitle.includes(lowerQ) || lowerQ.includes(lowerTitle))) {
        return node.id;
      }
    }

    return null;
  }

  /**
   * Apply AI Refinement Actions to the Graph (Object-Oriented Batch Modification)
   */
  public applyAIGraphActions(actions: import('../types/mindmap').AIGraphAction[]): {
    modifiedCount: number;
    summary: string[];
  } {
    let modifiedCount = 0;
    const summary: string[] = [];

    const recursivelyAddChildren = (
      parentId: string,
      childrenData: import('../types/mindmap').AIGraphActionNodeChild[]
    ) => {
      for (const item of childrenData) {
        if (!item || !item.title) continue;
        const newNode = this.addNode(parentId, {
          title: item.title,
          content: item.content || '',
        });
        if (item.shape) newNode.setShape(item.shape);
        if (item.color) {
          newNode.style.fillColor = item.color;
          newNode.style.textColor = '#ffffff';
          newNode.style.borderColor = item.color;
        }
        if (Array.isArray(item.checklist)) {
          item.checklist.forEach(chk => {
            if (chk) newNode.addChecklistItem(chk);
          });
        }
        modifiedCount++;

        if (Array.isArray(item.children) && item.children.length > 0) {
          recursivelyAddChildren(newNode.id, item.children);
        }
      }
    };

    for (const rawAct of actions) {
      const act = rawAct as any;
      try {
        const actionType = (act.type || act.action || '').trim();
        switch (actionType) {
          case 'add_node':
          case 'createNode':
          case 'create_node':
          case 'newNode':
          case 'add': {
            const parentQuery = act.parentId || act.nodeId;
            const targetParent = this.findNodeId(parentQuery) || this.rootId;
            const newNode = this.addNode(targetParent, {
              title: act.title || 'Node Mới',
              content: act.content || '',
            });
            if (act.shape) newNode.setShape(act.shape);
            if (act.color) {
              newNode.style.fillColor = act.color;
              newNode.style.textColor = '#ffffff';
              newNode.style.borderColor = act.color;
            }
            if (Array.isArray(act.checklist)) {
              act.checklist.forEach(chk => {
                if (chk) newNode.addChecklistItem(chk);
              });
            }
            modifiedCount++;

            // If action contains nested children, recursively instantiate them
            if (Array.isArray(act.children) && act.children.length > 0) {
              recursivelyAddChildren(newNode.id, act.children);
            }

            summary.push(`Thêm node: "${newNode.title}"`);
            break;
          }

          case 'update_node': {
            const targetId = this.findNodeId(act.nodeId || act.parentId);
            if (!targetId || !this.nodes.has(targetId)) break;
            const node = this.nodes.get(targetId)!;
            if (act.title !== undefined && act.title !== null) node.updateTitle(act.title);
            if (act.content !== undefined && act.content !== null) node.updateContent(act.content);
            if (act.shape) node.setShape(act.shape);
            if (act.color) {
              node.style.fillColor = act.color;
              node.style.textColor = '#ffffff';
              node.style.borderColor = act.color;
            }
            if (Array.isArray(act.checklist)) {
              node.checklist = act.checklist.map((c, i) => ({
                id: `chk_${Date.now()}_${i}`,
                text: c,
                completed: false,
              }));
            }
            modifiedCount++;
            summary.push(`Cập nhật node: "${node.title}"`);
            break;
          }

          case 'delete_node': {
            const targetId = this.findNodeId(act.nodeId);
            if (!targetId || targetId === this.rootId || !this.nodes.has(targetId)) break;
            const node = this.nodes.get(targetId)!;
            const title = node.title;
            this.removeNode(targetId);
            modifiedCount++;
            summary.push(`Xoá node: "${title}"`);
            break;
          }

          case 'reparent_node': {
            const targetId = this.findNodeId(act.nodeId);
            const parentId = this.findNodeId(act.parentId);
            if (!targetId || !parentId || !this.nodes.has(targetId) || !this.nodes.has(parentId)) break;
            this.reparent(targetId, parentId);
            modifiedCount++;
            summary.push(`Di chuyển node "${this.nodes.get(targetId)?.title}" sang cha mới`);
            break;
          }

          case 'batch_add_children': {
            const targetParent = this.findNodeId(act.nodeId || act.parentId) || this.rootId;
            if (Array.isArray(act.children) && act.children.length > 0) {
              recursivelyAddChildren(targetParent, act.children);
              summary.push(`Bổ sung ${act.children.length} node con cho "${this.nodes.get(targetParent)?.title || targetParent}"`);
            } else if (act.title) {
              const newNode = this.addNode(targetParent, {
                title: act.title,
                content: act.content || '',
              });
              modifiedCount++;
              summary.push(`Thêm node: "${newNode.title}"`);
            }
            break;
          }

          case 'batch_replace_children': {
            const targetParent = this.findNodeId(act.nodeId || act.parentId) || this.rootId;
            const parentNode = this.nodes.get(targetParent);
            if (!parentNode) break;

            // Remove existing direct children
            const existingChildren = [...parentNode.childrenIds];
            for (const childId of existingChildren) {
              this.removeNode(childId);
            }

            if (Array.isArray(act.children) && act.children.length > 0) {
              recursivelyAddChildren(targetParent, act.children);
            }
            modifiedCount += existingChildren.length + (act.children?.length || 0);
            summary.push(`Cấu trúc lại toàn bộ các nhánh con của "${parentNode.title}"`);
            break;
          }

          case 'auto_update_colors': {
            this.autoUpdateChildColors();
            modifiedCount++;
            summary.push('Tự động cập nhật màu sắc các nhánh con');
            break;
          }

          case 'auto_layout': {
            this.autoLayout();
            modifiedCount++;
            summary.push('Tự động sắp xếp lại vị trí các node');
            break;
          }
        }
      } catch (err) {
        console.error('Error applying AI action:', act, err);
      }
    }

    // Always ensure children colors and tidy layout are clean
    this.autoUpdateChildColors();
    this.autoLayout();

    this.meta.updatedAt = new Date().toISOString();
    return { modifiedCount, summary };
  }

  public toJSON(): MindmapDataSchema {
    const nodesObj: Record<string, any> = {};
    for (const [id, node] of this.nodes.entries()) {
      nodesObj[id] = node.toJSON();
    }

    const relationsArr = Array.from(this.relations.values()).map(r => r.toJSON());

    return {
      meta: { ...this.meta },
      rootId: this.rootId,
      nodes: nodesObj,
      relations: relationsArr,
    };
  }

  public static fromJSON(schema: MindmapDataSchema): MindmapGraph {
    const graph = new MindmapGraph(schema.meta, schema.rootId);

    if (schema.nodes) {
      for (const [id, nodeData] of Object.entries(schema.nodes)) {
        graph.nodes.set(id, new NodeModel(nodeData));
      }
    }

    if (schema.relations) {
      for (const relData of schema.relations) {
        graph.relations.set(relData.id, new EdgeModel(relData));
      }
    }

    // Safety fallback if root is missing
    if (!graph.nodes.has(graph.rootId)) {
      const defaultRoot = NodeModel.createDefault('ROOT', schema.meta.title || 'Main Topic', { x: 600, y: 400 });
      defaultRoot.style.fillColor = '#3b82f6';
      defaultRoot.style.textColor = '#ffffff';
      defaultRoot.style.borderColor = '#1d4ed8';
      graph.nodes.set('ROOT', defaultRoot);
      graph.rootId = 'ROOT';
    }

    // Sanitize parent-child consistency
    graph.sanitizeHierarchy();

    return graph;
  }

  public clone(): MindmapGraph {
    return MindmapGraph.fromJSON(this.toJSON());
  }

  public static createFlowchartDefault(title: string = 'Quy Trình Triển Khai Dự Án'): MindmapGraph {
    const now = new Date().toISOString();
    const meta: MindmapMetadata = {
      id: 'map_' + Math.random().toString(36).substring(2, 9),
      title,
      createdAt: now,
      updatedAt: now,
      defaultViewMode: 'flowchart',
    };

    const graph = new MindmapGraph(meta, 'ROOT');

    const stageIds = ['STAGE-1', 'STAGE-2', 'STAGE-3', 'STAGE-4'];

    const rootNode = new NodeModel({
      id: 'ROOT',
      title: title,
      content: 'Mô tả tổng quan quy trình và các giai đoạn tiến trình chính.',
      checklist: [],
      parentId: null,
      childrenIds: stageIds,
      position: { x: 500, y: 120 },
      style: {
        shape: 'capsule',
        fillColor: '#2563eb',
        textColor: '#ffffff',
        borderColor: '#1d4ed8',
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 16,
      },
    });
    graph.nodes.set('ROOT', rootNode);

    const stagesConfig = [
      {
        id: 'STAGE-1',
        title: '01. Khởi động & Khảo sát',
        color: '#2563eb',
        bg: '#eff6ff',
        text: '#1e3a8a',
        steps: [
          { id: 'STEP-1-1', title: 'Thu thập yêu cầu & Mục tiêu dự án', content: 'Làm việc với các bên liên quan để thống nhất mục tiêu cốt lõi.' },
          { id: 'STEP-1-2', title: 'Khảo sát khả thi & Đánh giá rủi ro', content: 'Phân tích các rào cản kỹ thuật và xây dựng phương án dự phòng.' },
        ],
      },
      {
        id: 'STAGE-2',
        title: '02. Lập kế hoạch & Thiết kế',
        color: '#7c3aed',
        bg: '#f5f3ff',
        text: '#4c1d95',
        steps: [
          { id: 'STEP-2-1', title: 'Thiết kế kiến trúc hệ thống & Luồng', content: 'Vẽ sơ đồ quy trình chi tiết và phân công nhiệm vụ từng thành viên.' },
          { id: 'STEP-2-2', title: 'Phác thảo giao diện Wireframe & UI', content: 'Tối ưu trải nghiệm người dùng và hoàn thiện kịch bản tương tác.' },
        ],
      },
      {
        id: 'STAGE-3',
        title: '03. Thực thi & Triển khai',
        color: '#059669',
        bg: '#ecfdf5',
        text: '#064e3b',
        steps: [
          { id: 'STEP-3-1', title: 'Lập trình tính năng cốt lõi (Core)', content: 'Triển khai mã nguồn theo chuẩn kiến trúc đã duyệt.' },
          { id: 'STEP-3-2', title: 'Kiểm thử tích hợp & Tối ưu hiệu năng', content: 'Đảm bảo hoạt động ổn định và xử lý toàn bộ lỗi phát sinh.' },
        ],
      },
      {
        id: 'STAGE-4',
        title: '04. Bàn giao & Vận hành',
        color: '#d97706',
        bg: '#fffbeb',
        text: '#78350f',
        steps: [
          { id: 'STEP-4-1', title: 'Bàn giao tài liệu & Đào tạo người dùng', content: 'Chuyển giao hướng dẫn sử dụng và tài liệu kỹ thuật hoàn chỉnh.' },
          { id: 'STEP-4-2', title: 'Nghiệm thu & Đánh giá kết quả (KPIs)', content: 'Tổng kết các chỉ số đo lường hiệu quả và mở rộng giai đoạn sau.' },
        ],
      },
    ];

    stagesConfig.forEach((stage, idx) => {
      const stepIds = stage.steps.map(s => s.id);
      const stageNode = new NodeModel({
        id: stage.id,
        title: stage.title,
        content: `Giai đoạn ${idx + 1} của tiến trình quy trình`,
        checklist: [],
        parentId: 'ROOT',
        childrenIds: stepIds,
        position: { x: 100 + idx * 340, y: 280 },
        style: {
          shape: 'rounded-rect',
          fillColor: stage.bg,
          textColor: stage.text,
          borderColor: stage.color,
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 14,
        },
        parentLinkStyle: {
          color: stage.color,
          width: 2.5,
          style: 'solid',
          arrow: 'end',
        },
      });
      graph.nodes.set(stage.id, stageNode);

      stage.steps.forEach((step, stepIdx) => {
        const stepNode = new NodeModel({
          id: step.id,
          title: step.title,
          content: step.content,
          checklist: [
            { id: `c-${step.id}-1`, text: 'Kiểm tra điều kiện bắt đầu', completed: true },
            { id: `c-${step.id}-2`, text: 'Thực hiện nội dung công việc', completed: false },
          ],
          parentId: stage.id,
          childrenIds: [],
          position: { x: 100 + idx * 340, y: 400 + stepIdx * 110 },
          style: {
            shape: 'rounded-rect',
            fillColor: '#ffffff',
            textColor: '#1e293b',
            borderColor: stage.color,
            borderWidth: 1.5,
            borderStyle: 'solid',
            fontSize: 13,
          },
          parentLinkStyle: {
            color: stage.color,
            width: 2,
            style: 'solid',
            arrow: 'end',
          },
        });
        graph.nodes.set(step.id, stepNode);
      });
    });

    // Add sequential cross links between consecutive stages
    for (let i = 0; i < stagesConfig.length - 1; i++) {
      graph.addCrossLink(stagesConfig[i].id, stagesConfig[i + 1].id, 'Tiếp theo', {
        color: '#64748b',
        style: 'dashed',
        arrow: 'end',
        width: 2,
      });
    }

    return graph;
  }

  public static createDefault(
    title: string = 'Kế Hoạch Dự Án',
    mode: import('../types/mindmap').MindmapViewMode = 'node'
  ): MindmapGraph {
    if (mode === 'flowchart') {
      return MindmapGraph.createFlowchartDefault(title);
    }

    const now = new Date().toISOString();
    const meta: MindmapMetadata = {
      id: 'map_' + Math.random().toString(36).substring(2, 9),
      title,
      createdAt: now,
      updatedAt: now,
      defaultViewMode: 'node',
    };

    const graph = new MindmapGraph(meta, 'ROOT');

    const rootNode = new NodeModel({
      id: 'ROOT',
      title: title,
      content: '',
      checklist: [],
      parentId: null,
      childrenIds: [],
      position: { x: 550, y: 350 },
      style: {
        shape: 'capsule',
        fillColor: '#2563eb',
        textColor: '#ffffff',
        borderColor: '#1e40af',
        borderWidth: 2,
        borderStyle: 'solid',
        fontSize: 16,
      },
    });

    graph.nodes.set('ROOT', rootNode);

    return graph;
  }
}
