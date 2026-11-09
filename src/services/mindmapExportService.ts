/**
 * Utility for exporting Mindmap to various formats (PNG Image, PDF, Formatted Node Tree TXT)
 * Works directly in the browser with high performance and zero external dependencies.
 */
import { MindmapGraph } from '../models/MindmapGraph';

export class MindmapExportService {
  /**
   * Export the mindmap to formatted Node Tree text file (.txt)
   */
  public static exportToTxt(graph: MindmapGraph): void {
    const textContent = graph.toTextTree();
    const title = graph.meta.title || 'mindmap';
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}_node_tree.txt`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Renders the mindmap canvas directly to an HTML5 Canvas element
   * to produce pixel-perfect PNG or PDF without blurry screenshot distortions.
   */
  public static async renderGraphToCanvas(graph: MindmapGraph, padding = 80): Promise<HTMLCanvasElement> {
    const nodes = graph.getAllNodes();
    if (nodes.length === 0) {
      const emptyCanvas = document.createElement('canvas');
      emptyCanvas.width = 800;
      emptyCanvas.height = 600;
      const ctx = emptyCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 600);
      return emptyCanvas;
    }

    // Calculate bounding box of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Estimate node size (default node width ~ 200, height ~ 60)
    const nodeWidth = 180;
    const nodeHeight = 55;

    for (const node of nodes) {
      const nx = node.position.x;
      const ny = node.position.y;
      if (nx - nodeWidth / 2 < minX) minX = nx - nodeWidth / 2;
      if (ny - nodeHeight / 2 < minY) minY = ny - nodeHeight / 2;
      if (nx + nodeWidth / 2 > maxX) maxX = nx + nodeWidth / 2;
      if (ny + nodeHeight / 2 > maxY) maxY = ny + nodeHeight / 2;
    }

    const contentWidth = Math.max(600, maxX - minX + padding * 2);
    const contentHeight = Math.max(400, maxY - minY + padding * 2);

    const scale = 2; // 2x high-resolution rendering
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(contentWidth * scale);
    canvas.height = Math.round(contentHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context from canvas');

    ctx.scale(scale, scale);

    // 1. Draw smooth background
    ctx.fillStyle = '#f8fafc'; // light slate neutral background
    ctx.fillRect(0, 0, contentWidth, contentHeight);

    // Draw subtle grid pattern
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 28;
    for (let x = 0; x < contentWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, contentHeight);
      ctx.stroke();
    }
    for (let y = 0; y < contentHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(contentWidth, y);
      ctx.stroke();
    }

    const offsetX = padding - minX;
    const offsetY = padding - minY;

    // Helper: draw bezier curved edge
    const drawEdge = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      width: number,
      style: string,
      label?: string
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color || '#94a3b8';
      ctx.lineWidth = Math.max(1.5, width || 2);

      if (style === 'dashed') {
        ctx.setLineDash([6, 6]);
      } else if (style === 'dotted') {
        ctx.setLineDash([2, 4]);
      } else {
        ctx.setLineDash([]);
      }

      const dx = Math.abs(x2 - x1) * 0.45;
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
      ctx.stroke();

      // If label exists, draw badge in center
      if (label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        const metrics = ctx.measureText(label);
        const bw = metrics.width + 16;
        const bh = 22;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = color || '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.roundRect(mx - bw / 2, my - bh / 2, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color || '#475569';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, mx, my);
      }

      ctx.restore();
    };

    // 2. Draw tree edges
    const treeEdges = graph.getTreeRelations();
    for (const edge of treeEdges) {
      const srcNode = graph.getNode(edge.sourceId);
      const tgtNode = graph.getNode(edge.targetId);
      if (!srcNode || !tgtNode) continue;

      const x1 = srcNode.position.x + offsetX;
      const y1 = srcNode.position.y + offsetY;
      const x2 = tgtNode.position.x + offsetX;
      const y2 = tgtNode.position.y + offsetY;

      const edgeColor = edge.color || srcNode.style.fillColor || '#3b82f6';
      drawEdge(x1, y1, x2, y2, edgeColor, edge.width || 2.5, edge.style || 'solid');
    }

    // 3. Draw cross relations
    const crossEdges = graph.getCrossRelations();
    for (const edge of crossEdges) {
      const srcNode = graph.getNode(edge.sourceId);
      const tgtNode = graph.getNode(edge.targetId);
      if (!srcNode || !tgtNode) continue;

      const x1 = srcNode.position.x + offsetX;
      const y1 = srcNode.position.y + offsetY;
      const x2 = tgtNode.position.x + offsetX;
      const y2 = tgtNode.position.y + offsetY;

      const edgeColor = edge.color || '#ec4899';
      drawEdge(x1, y1, x2, y2, edgeColor, edge.width || 2, edge.style || 'dashed', edge.label);
    }

    // 4. Draw Nodes
    for (const node of nodes) {
      const cx = node.position.x + offsetX;
      const cy = node.position.y + offsetY;
      const isRoot = node.id === graph.rootId || node.parentId === null;

      const nw = isRoot ? 190 : 160;
      const nh = isRoot ? 54 : 44;
      const left = cx - nw / 2;
      const top = cy - nh / 2;

      ctx.save();

      // Node Shadow
      ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      const shape = node.style.shape || 'rounded-rect';
      const fill = node.style.fillColor || (isRoot ? '#2563eb' : '#ffffff');
      const textColor = node.style.textColor || (isRoot ? '#ffffff' : '#1e293b');
      const borderColor = node.style.borderColor || (isRoot ? '#1d4ed8' : '#cbd5e1');
      const borderWidth = node.style.borderWidth || 2;

      ctx.fillStyle = fill;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;

      if (node.style.borderStyle === 'dashed') {
        ctx.setLineDash([5, 5]);
      } else if (node.style.borderStyle === 'dotted') {
        ctx.setLineDash([2, 3]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      if (shape === 'capsule') {
        ctx.roundRect(left, top, nw, nh, nh / 2);
      } else if (shape === 'rectangle') {
        ctx.rect(left, top, nw, nh);
      } else if (shape === 'circle') {
        const radius = Math.max(nw, nh) / 2;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      } else if (shape === 'diamond') {
        ctx.moveTo(cx, top - 6);
        ctx.lineTo(left + nw + 6, cy);
        ctx.lineTo(cx, top + nh + 6);
        ctx.lineTo(left - 6, cy);
        ctx.closePath();
      } else {
        // default rounded-rect
        ctx.roundRect(left, top, nw, nh, 12);
      }

      ctx.fill();
      ctx.shadowColor = 'transparent'; // reset shadow before stroke
      ctx.stroke();

      // Draw Title text
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = isRoot
        ? 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      // Truncate text if too long
      let displayTitle = node.title || `Node ${node.id}`;
      const maxTextWidth = nw - 24;
      if (ctx.measureText(displayTitle).width > maxTextWidth) {
        while (displayTitle.length > 3 && ctx.measureText(displayTitle + '...').width > maxTextWidth) {
          displayTitle = displayTitle.slice(0, -1);
        }
        displayTitle += '...';
      }

      ctx.fillText(displayTitle, cx, cy);

      // Node ID indicator pill (top-left or bottom)
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = textColor;
      ctx.globalAlpha = 0.75;
      ctx.fillText(node.id, cx, top + 10);
      ctx.globalAlpha = 1.0;

      ctx.restore();
    }

    // 5. Draw Watermark & Title header at bottom right
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    const dateStr = new Date().toLocaleDateString();
    ctx.fillText(`${graph.meta.title || 'Mindmap'} • Created with Mindmap Studio • ${dateStr}`, contentWidth - 24, contentHeight - 16);
    ctx.restore();

    return canvas;
  }

  /**
   * Export the mindmap to high-res PNG image (.png)
   */
  public static async exportToPng(graph: MindmapGraph): Promise<void> {
    const canvas = await this.renderGraphToCanvas(graph);
    const title = graph.meta.title || 'mindmap';
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.png`;

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export the mindmap to PDF (.pdf) via native browser print container
   * providing instant, crystal-clear vector and full-page layout without bulky external libraries.
   */
  public static async exportToPdf(graph: MindmapGraph): Promise<void> {
    const canvas = await this.renderGraphToCanvas(graph);
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const title = graph.meta.title || 'mindmap';

    // Create a hidden print iframe to render pixel-perfect printable PDF page
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Cannot create PDF print frame');
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #ffffff;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            h1 {
              font-size: 20px;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            p {
              font-size: 11px;
              color: #64748b;
              margin: 0;
            }
            .image-container {
              width: 100%;
              max-height: 85vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            img {
              max-width: 100%;
              max-height: 80vh;
              object-fit: contain;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p>Mindmap Architecture • Exported on ${new Date().toLocaleString()}</p>
          </div>
          <div class="image-container">
            <img src="${dataUrl}" alt="${title}" />
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Wait for image inside iframe to load then trigger system print dialog
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 2000);
    }, 400);
  }
}
