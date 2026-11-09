import { MindmapGraph } from '../models/MindmapGraph';
import { NodeModel } from '../models/NodeModel';
import { NodeShape } from '../types/mindmap';

export interface AIMindmapOptions {
  detailLevel?: 'concise' | 'balanced' | 'detailed';
  mode: 'new_mindmap' | 'append_to_selected';
  targetNodeId?: string;
  onProgress?: (progress: {
    stage: 'analyzing' | 'chunking' | 'processing' | 'assembling' | 'completed' | 'error';
    currentChunk: number;
    totalChunks: number;
    messageKey: string;
    messageParams?: Record<string, string | number>;
  }) => void;
}

export interface GeneratedNodeItem {
  tempId: string;
  parentTempId?: string | null;
  title: string;
  content?: string;
  checklist?: string[];
  color?: string;
  shape?: NodeShape;
}

export interface GeneratedRelationItem {
  sourceTempId: string;
  targetTempId: string;
  label?: string;
}

export interface AIResponseData {
  title: string;
  rootTitle?: string;
  rootContent?: string;
  nodes: GeneratedNodeItem[];
  crossRelations?: GeneratedRelationItem[];
}

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#16a34a', // Green
];

export class AIMindmapService {
  /**
   * Count words accurately in text (handles Vietnamese & English spacing)
   */
  public static countWords(text: string): number {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * Intelligently split text into chunks if it exceeds maxWordsPerChunk (~3500 words)
   */
  public static splitTextIntoChunks(text: string, maxWordsPerChunk: number = 3500): string[] {
    const totalWords = this.countWords(text);
    if (totalWords <= maxWordsPerChunk) {
      return [text];
    }

    // Split text by structural markers: double newlines, headers, or markdown dividers
    const rawParagraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';
    let currentWordCount = 0;

    for (const paragraph of rawParagraphs) {
      const paragraphWordCount = this.countWords(paragraph);

      // If a single paragraph is colossal, break it by lines
      if (paragraphWordCount > maxWordsPerChunk) {
        const lines = paragraph.split('\n');
        for (const line of lines) {
          const lineWords = this.countWords(line);
          if (currentWordCount + lineWords > maxWordsPerChunk && currentChunk.trim()) {
            chunks.push(currentChunk.trim());
            currentChunk = line + '\n';
            currentWordCount = lineWords;
          } else {
            currentChunk += line + '\n';
            currentWordCount += lineWords;
          }
        }
      } else if (currentWordCount + paragraphWordCount > maxWordsPerChunk && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph + '\n\n';
        currentWordCount = paragraphWordCount;
      } else {
        currentChunk += paragraph + '\n\n';
        currentWordCount += paragraphWordCount;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Convert arbitrary text to MindmapGraph using Gemini AI
   */
  public static async convertTextToMindmap(
    text: string,
    existingGraph: MindmapGraph,
    options: AIMindmapOptions
  ): Promise<{ graph: MindmapGraph; rootOrTargetId: string }> {
    const chunks = this.splitTextIntoChunks(text, 3500);
    const totalChunks = chunks.length;

    options.onProgress?.({
      stage: 'chunking',
      currentChunk: 0,
      totalChunks,
      messageKey: 'aiProgressChunking',
      messageParams: { count: totalChunks },
    });

    const parsedResults: AIResponseData[] = [];
    let overallContextTopic = '';

    for (let i = 0; i < totalChunks; i++) {
      options.onProgress?.({
        stage: 'processing',
        currentChunk: i + 1,
        totalChunks,
        messageKey: 'aiProgressProcessing',
        messageParams: { current: i + 1, total: totalChunks },
      });

      const response = await fetch('/api/gemini/text-to-mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: chunks[i],
          contextTopic: overallContextTopic || undefined,
          isSubChunk: i > 0,
          chunkIndex: i,
          totalChunks,
          detailLevel: options.detailLevel || 'balanced',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Invalid AI response format');
      }

      const chunkData: AIResponseData = result.data;
      parsedResults.push(chunkData);

      if (i === 0) {
        overallContextTopic = chunkData.rootTitle || chunkData.title || '';
      }
    }

    options.onProgress?.({
      stage: 'assembling',
      currentChunk: totalChunks,
      totalChunks,
      messageKey: 'aiProgressAssembling',
    });

    // Assemble graph
    let targetGraph: MindmapGraph;
    let mainRootId: string;

    if (options.mode === 'append_to_selected' && options.targetNodeId && existingGraph.nodes.has(options.targetNodeId)) {
      targetGraph = existingGraph.clone();
      mainRootId = options.targetNodeId;
    } else {
      // Create new graph with AI title
      const mainTitle = parsedResults[0]?.title || parsedResults[0]?.rootTitle || 'Mindmap từ Văn bản';
      targetGraph = MindmapGraph.createDefault(mainTitle);
      mainRootId = targetGraph.rootId;
      const rootNode = targetGraph.getNode(mainRootId);
      if (rootNode) {
        if (parsedResults[0]?.rootContent) {
          rootNode.content = parsedResults[0].rootContent;
        }
      }
    }

    // Process nodes with unique ID mapping
    let branchColorIndex = 0;

    for (let cIdx = 0; cIdx < parsedResults.length; cIdx++) {
      const chunkResult = parsedResults[cIdx];
      const tempToRealIdMap = new Map<string, string>();

      // If chunk 0 and it's a new mindmap, update the root node title if provided
      if (cIdx === 0 && options.mode !== 'append_to_selected') {
        const rootNode = targetGraph.getNode(mainRootId);
        if (rootNode) {
          rootNode.title = chunkResult.rootTitle || chunkResult.title || rootNode.title;
        }
      }

      // If multi-chunk, create a Section node for subsequent chunks if appropriate
      let chunkParentId = mainRootId;
      if (cIdx > 0 && chunkResult.title && chunkResult.title !== overallContextTopic) {
        const sectionNode = targetGraph.addNode(mainRootId, { title: chunkResult.title });
        sectionNode.style.shape = 'capsule';
        sectionNode.style.fillColor = COLOR_PALETTE[(branchColorIndex++) % COLOR_PALETTE.length];
        sectionNode.style.textColor = '#ffffff';
        chunkParentId = sectionNode.id;
      }

      // Insert nodes using topological multi-pass resolution (ensures children whose parent appears later in array are linked correctly)
      const rawNodes = chunkResult.nodes || [];
      const pendingNodes = [...rawNodes];
      let maxPasses = 10;

      while (pendingNodes.length > 0 && maxPasses > 0) {
        maxPasses--;
        const nextPending: typeof rawNodes = [];

        for (const rawNode of pendingNodes) {
          // If node has parentTempId that hasn't been created yet in tempToRealIdMap, defer to next pass unless it's top-level or invalid
          if (rawNode.parentTempId && !tempToRealIdMap.has(rawNode.parentTempId) && pendingNodes.some(p => p.tempId === rawNode.parentTempId)) {
            nextPending.push(rawNode);
            continue;
          }

          let parentNodeId = chunkParentId;
          if (rawNode.parentTempId && tempToRealIdMap.has(rawNode.parentTempId)) {
            parentNodeId = tempToRealIdMap.get(rawNode.parentTempId)!;
          }

          const newNode = targetGraph.addNode(parentNodeId, { title: rawNode.title });
          tempToRealIdMap.set(rawNode.tempId, newNode.id);

          if (rawNode.content) {
            newNode.updateContent(rawNode.content);
          }

          if (Array.isArray(rawNode.checklist) && rawNode.checklist.length > 0) {
            rawNode.checklist.forEach(itemText => {
              if (itemText && typeof itemText === 'string') {
                newNode.addChecklistItem(itemText);
              }
            });
          }

          if (rawNode.shape) {
            newNode.setShape(rawNode.shape);
          }

          // Apply color if specified or assign consistent palette
          if (rawNode.color) {
            newNode.style.fillColor = rawNode.color;
            newNode.style.textColor = '#ffffff';
            newNode.style.borderColor = rawNode.color;
          } else if (parentNodeId === mainRootId) {
            const branchColor = COLOR_PALETTE[(branchColorIndex++) % COLOR_PALETTE.length];
            newNode.style.fillColor = branchColor;
            newNode.style.textColor = '#ffffff';
            newNode.style.borderColor = branchColor;
          } else {
            // Inherit parent's dominant branch color for border and link
            const parentNode = targetGraph.getNode(parentNodeId);
            if (parentNode) {
              const parentFill = parentNode.style.fillColor;
              const parentBorder = parentNode.style.borderColor;
              const isWhiteOrLight = !parentFill || parentFill === '#ffffff' || parentFill.toLowerCase() === '#fff';
              const branchColor = isWhiteOrLight ? (parentBorder || '#3b82f6') : parentFill;
              newNode.style.borderColor = branchColor;
              newNode.parentLinkStyle = {
                color: branchColor,
                width: 2.5,
                style: 'solid',
                arrow: 'none',
              };
            }
          }
        }

        // Break if no progress was made in this pass
        if (nextPending.length === pendingNodes.length) {
          // Force append remaining orphaned nodes under chunkParentId
          for (const rawNode of nextPending) {
            const newNode = targetGraph.addNode(chunkParentId, { title: rawNode.title });
            tempToRealIdMap.set(rawNode.tempId, newNode.id);
            if (rawNode.content) newNode.updateContent(rawNode.content);
            if (rawNode.shape) newNode.setShape(rawNode.shape);
          }
          break;
        }

        pendingNodes.length = 0;
        pendingNodes.push(...nextPending);
      }

      // Add cross-relations if returned
      if (Array.isArray(chunkResult.crossRelations)) {
        for (const rel of chunkResult.crossRelations) {
          const srcId = tempToRealIdMap.get(rel.sourceTempId);
          const tgtId = tempToRealIdMap.get(rel.targetTempId);
          if (srcId && tgtId && targetGraph.nodes.has(srcId) && targetGraph.nodes.has(tgtId)) {
            targetGraph.addCrossLink(srcId, tgtId, rel.label || undefined);
          }
        }
      }
    }

    // Save source text into graph metadata for future AI co-pilot context & review
    targetGraph.setSourceText(text);

    // Run auto-layout algorithm for balanced aesthetic placement
    targetGraph.autoLayout();

    options.onProgress?.({
      stage: 'completed',
      currentChunk: totalChunks,
      totalChunks,
      messageKey: 'aiProgressCompleted',
    });

    return {
      graph: targetGraph,
      rootOrTargetId: mainRootId,
    };
  }

  /**
   * AI Co-pilot: Refine, answer questions, and restructure mindmap nodes
   */
  public static async refineMindmap(params: {
    prompt: string;
    graph: MindmapGraph;
    selectedNodeId?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
  }): Promise<import('../types/mindmap').AIRefineResponseData> {
    const { prompt, graph, selectedNodeId, conversationHistory } = params;

    const sourceText = graph.getSourceText();
    const { outline } = graph.exportHierarchyContext();

    const selectedNode = selectedNodeId ? graph.getNode(selectedNodeId) : undefined;

    const response = await fetch('/api/gemini/refine-mindmap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        sourceText: sourceText || undefined,
        currentOutline: outline,
        selectedNodeId: selectedNodeId || undefined,
        selectedNodeTitle: selectedNode?.title || undefined,
        conversationHistory: conversationHistory || undefined,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid AI response format');
    }

    return result.data;
  }
}
