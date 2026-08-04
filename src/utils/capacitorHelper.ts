/**
 * Capacitor Helper — Centralized abstraction for file operations
 * Works in both web browser and native Capacitor WebView
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

export class CapacitorHelper {
  /**
   * Check if running in native Capacitor shell
   */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get current platform
   */
  static getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Download a file — works in both web and native
   * In web: uses anchor click (existing behavior)
   * In native: writes to filesystem then shares
   */
  static async downloadFile(
    content: Blob | string,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<void> {
    if (!this.isNative()) {
      // Web fallback — use existing anchor click pattern
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Native: convert to base64 and write to filesystem
    let base64Data: string;
    if (content instanceof Blob) {
      const arrayBuffer = await content.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    } else {
      base64Data = btoa(unescape(encodeURIComponent(content)));
    }

    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    // Share the file
    await Share.share({
      title: filename,
      files: [result.uri],
    });
  }

  /**
   * Download CSV content
   */
  static async downloadCSV(csvContent: string, filename: string): Promise<void> {
    await this.downloadFile(csvContent, filename, 'text/csv');
  }

  /**
   * Download JSON backup
   */
  static async downloadJSON(data: any, filename: string): Promise<void> {
    const jsonStr = JSON.stringify(data, null, 2);
    await this.downloadFile(jsonStr, filename, 'application/json');
  }

  /**
   * Download PDF (from jsPDF output)
   */
  static async downloadPDF(pdfBlob: Blob, filename: string): Promise<void> {
    await this.downloadFile(pdfBlob, filename, 'application/pdf');
  }

  /**
   * Open URL — works in both web and native
   */
  static async openUrl(url: string): Promise<void> {
    if (!this.isNative()) {
      window.open(url, '_blank');
      return;
    }

    await Browser.open({ url });
  }

  /**
   * Share content
   */
  static async share(options: {
    title?: string;
    text?: string;
    url?: string;
    files?: { blob: Blob; filename: string; mimeType: string }[];
  }): Promise<void> {
    if (!this.isNative()) {
      // Web: use Web Share API if available, otherwise fallback
      if (navigator.share) {
        const shareData: ShareData = {
          title: options.title,
          text: options.text,
          url: options.url,
        };
        await navigator.share(shareData);
      }
      return;
    }

    const shareOptions: any = {
      title: options.title,
      text: options.text,
      url: options.url,
    };

    if (options.files && options.files.length > 0) {
      const files: { url: string; type: string }[] = [];
      for (const file of options.files) {
        const base64Data = await this.blobToBase64(file.blob);
        const result = await Filesystem.writeFile({
          path: file.filename,
          data: base64Data,
          directory: Directory.Cache,
        });
        files.push({ url: result.uri, type: file.mimeType });
      }
      shareOptions.files = files;
    }

    await Share.share(shareOptions);
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<void> {
    if (!this.isNative()) {
      await navigator.clipboard.writeText(text);
      return;
    }

    await Clipboard.write({ string: text });
  }

  /**
   * Print content — opens native print dialog on mobile
   */
  static async print(htmlContent?: string): Promise<void> {
    if (!this.isNative()) {
      window.print();
      return;
    }

    // On native: open URL in browser for printing
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      await Browser.open({ url });
    }
  }

  /**
   * Helper: Convert Blob to base64
   */
  private static async blobToBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export default CapacitorHelper;
