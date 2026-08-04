/**
 * Camera Helper — Centralized abstraction for photo capture and image picking
 * Works in both web browser and native Capacitor WebView
 */

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface CapturedImage {
  webPath: string;
  base64Data: string;
  format: string;
  filePath?: string;
}

export class CameraHelper {
  /**
   * Check if camera is available (always true on native, limited on web)
   */
  static isAvailable(): boolean {
    return true;
  }

  /**
   * Check if running in native platform
   */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Capture a photo using the device camera
   */
  static async takePhoto(): Promise<CapturedImage | null> {
    try {
      if (!this.isNative()) {
        return null;
      }

      const image: Photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        correctOrientation: true,
      });

      // Save to filesystem for persistence
      let filePath: string | undefined;
      try {
        const fileName = `photo_${Date.now()}.${image.format}`;
        const savedFile = await Filesystem.writeFile({
          path: `SMugFlex/captures/${fileName}`,
          data: image.base64String || '',
          directory: Directory.Data,
        });
        filePath = savedFile.uri;
      } catch {
        // Filesystem write failed — still have webPath and base64
      }

      return {
        webPath: image.webPath || '',
        base64Data: image.base64String || '',
        format: image.format || 'jpeg',
        filePath,
      };
    } catch (error: any) {
      // User cancelled or camera unavailable
      if (error?.message?.includes('cancel') || error?.message?.includes('User')) {
        return null;
      }
      console.error('Camera capture failed:', error);
      return null;
    }
  }

  /**
   * Pick an image from the device gallery
   */
  static async pickFromGallery(): Promise<CapturedImage | null> {
    try {
      if (!this.isNative()) {
        return null;
      }

      const image: Photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024,
        correctOrientation: true,
      });

      let filePath: string | undefined;
      try {
        const fileName = `gallery_${Date.now()}.${image.format}`;
        const savedFile = await Filesystem.writeFile({
          path: `SMugFlex/captures/${fileName}`,
          data: image.base64String || '',
          directory: Directory.Data,
        });
        filePath = savedFile.uri;
      } catch {
        // Filesystem write failed
      }

      return {
        webPath: image.webPath || '',
        base64Data: image.base64String || '',
        format: image.format || 'jpeg',
        filePath,
      };
    } catch (error: any) {
      if (error?.message?.includes('cancel') || error?.message?.includes('User')) {
        return null;
      }
      console.error('Gallery pick failed:', error);
      return null;
    }
  }

  /**
   * Let user choose between camera and gallery
   */
  static async pickImage(): Promise<CapturedImage | null> {
    try {
      if (!this.isNative()) {
        return null;
      }

      const image: Photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        width: 1024,
        height: 1024,
        correctOrientation: true,
      });

      let filePath: string | undefined;
      try {
        const fileName = `capture_${Date.now()}.${image.format}`;
        const savedFile = await Filesystem.writeFile({
          path: `SMugFlex/captures/${fileName}`,
          data: image.base64String || '',
          directory: Directory.Data,
        });
        filePath = savedFile.uri;
      } catch {
        // Filesystem write failed
      }

      return {
        webPath: image.webPath || '',
        base64Data: image.base64String || '',
        format: image.format || 'jpeg',
        filePath,
      };
    } catch (error: any) {
      if (error?.message?.includes('cancel') || error?.message?.includes('User')) {
        return null;
      }
      console.error('Image pick failed:', error);
      return null;
    }
  }

  /**
   * Convert captured image to File object for upload
   */
  static capturedImageToFile(captured: CapturedImage, filename?: string): File | null {
    try {
      const byteCharacters = atob(captured.base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${captured.format}` });
      return new File(
        [blob],
        filename || `photo_${Date.now()}.${captured.format}`,
        { type: `image/${captured.format}` }
      );
    } catch {
      return null;
    }
  }

  /**
   * Web fallback: trigger native file input for image upload
   */
  static pickFromWebInput(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = () => {
        const file = input.files?.[0] || null;
        resolve(file);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
