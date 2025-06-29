declare module 'react-native-share-menu' {
  interface SharedData {
    mimeType: string;
    data: string;
  }

  interface ShareMenu {
    getSharedData(): Promise<SharedData | null>;
    clearSharedData(): void;
  }

  const ShareMenu: ShareMenu;
  export default ShareMenu;
} 