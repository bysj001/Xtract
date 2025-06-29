export interface Mp3File {
  name: string;
  path: string;
}

export interface ElectronAPI {
  getMp3Files: () => Promise<Mp3File[]>;
  getFileUrl: (filePath: string) => Promise<string>;
  exportFile: (filePath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 