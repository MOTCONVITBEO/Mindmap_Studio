import { DriveFileItem, MindmapDataSchema } from '../types/mindmap';
import { getAccessToken } from './firebase';

export class GoogleDriveService {
  /**
   * List mindmap JSON files created by the application on Google Drive
   */
  public static async listFiles(): Promise<DriveFileItem[]> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No Google access token available. Please sign in.');
    }

    const query = "name contains '.mindmap.json' and trashed = false";
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to list files from Google Drive');
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Save a mindmap to Google Drive.
   * If existingFileId is passed, it updates the existing file.
   * Otherwise it creates a new file.
   */
  public static async saveFile(
    mindmapData: MindmapDataSchema,
    fileName: string,
    existingFileId?: string
  ): Promise<{ id: string; name: string }> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No Google access token available. Please sign in.');
    }

    // Ensure safe name ending with .mindmap.json
    const safeName = fileName.endsWith('.mindmap.json') ? fileName : `${fileName}.mindmap.json`;
    const jsonString = JSON.stringify(mindmapData, null, 2);

    const metadata = {
      name: safeName,
      mimeType: 'application/json',
      description: 'Mindmap Studio Diagram File',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonString +
      closeDelimiter;

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
      method = 'PATCH';
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to save file to Google Drive');
    }

    const result = await res.json();
    return {
      id: result.id,
      name: result.name,
    };
  }

  /**
   * Load and parse mindmap JSON from Google Drive
   */
  public static async loadFile(fileId: string): Promise<MindmapDataSchema> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No Google access token available. Please sign in.');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to download file from Google Drive');
    }

    const data: MindmapDataSchema = await res.json();
    return data;
  }

  /**
   * Delete file from Google Drive
   */
  public static async deleteFile(fileId: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No Google access token available. Please sign in.');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to delete file from Google Drive');
    }
  }
}
