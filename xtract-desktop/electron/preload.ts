import { contextBridge, ipcRenderer } from 'electron';

export interface Mp3File {
  name: string;
  path: string;
}

export interface ElectronAPI {
  getMp3Files: () => Promise<Mp3File[]>;
  getFileUrl: (filePath: string) => Promise<string>;
  exportFile: (filePath: string) => Promise<boolean>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getMp3Files: (): Promise<Mp3File[]> => ipcRenderer.invoke('get-mp3-files'),
  getFileUrl: (filePath: string): Promise<string> => ipcRenderer.invoke('get-file-url', filePath),
  exportFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('export-file', filePath),
} as ElectronAPI); 