import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MindmapGraph } from '../models/MindmapGraph';

export interface ExportImageOptions {
  scale?: number;
  backgroundColor?: string;
}

export class ExportService {
  /**
   * Export the Mindmap Canvas to PNG image file
   */
  public static async exportToPNG(graph: MindmapGraph, options?: ExportImageOptions): Promise<void> {
    const canvasElement = document.getElementById('mindmap-canvas-container');
    if (!canvasElement) {
      throw new Error('Canvas container element not found.');
    }

    const scale = options?.scale || 2; // 2x high resolution
    const bgColor = options?.backgroundColor || '#f8fafc';

    // Save temporary overflow & scroll state
    const originalTransform = canvasElement.style.transform;
    
    // We target the world container or canvas container
    const canvas = await html2canvas(canvasElement, {
      scale: scale,
      backgroundColor: bgColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
      ignoreElements: (element) => {
        // Exclude floating menus or editor overlays if any
        return element.id === 'floating-action-button-container' || element.classList.contains('no-export');
      }
    });

    const safeTitle = (graph.meta.title || 'mindmap').replace(/[^a-zA-Z0-9_-]/g, '_');
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `${safeTitle}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Export the Mindmap Canvas to PDF file
   */
  public static async exportToPDF(graph: MindmapGraph): Promise<void> {
    const canvasElement = document.getElementById('mindmap-canvas-container');
    if (!canvasElement) {
      throw new Error('Canvas container element not found.');
    }

    const canvas = await html2canvas(canvasElement, {
      scale: 2,
      backgroundColor: '#f8fafc',
      useCORS: true,
      allowTaint: true,
      logging: false,
      ignoreElements: (element) => {
        return element.id === 'floating-action-button-container' || element.classList.contains('no-export');
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const isLandscape = canvas.width >= canvas.height;
    
    // Create jsPDF instance
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    
    const safeTitle = (graph.meta.title || 'mindmap').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeTitle}.pdf`);
  }

  /**
   * Export Mindmap to TXT Outline (Node Tree structure)
   */
  public static exportToTxtTree(graph: MindmapGraph): void {
    const textContent = graph.toTextTree();
    const safeTitle = (graph.meta.title || 'mindmap').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `${safeTitle}_tree.txt`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
