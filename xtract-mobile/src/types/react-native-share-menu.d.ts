declare module 'react-native-share-menu' {
  export interface SharedItem {
    mimeType: string;
    data: string;
    extraData?: any;
  }

  export type ShareCallback = (item: SharedItem | null) => void;

  interface ShareMenuStatic {
    /** @deprecated Use getInitialShare instead */
    getSharedText(callback: ShareCallback): void;
    getInitialShare(callback: ShareCallback): void;
    addNewShareListener(callback: ShareCallback): { remove: () => void };
  }

  export interface ShareMenuReactViewStatic {
    dismissExtension(error?: string | null): void;
    openApp(): void;
    continueInApp(extraData?: any): void;
    data(): Promise<SharedItem | null>;
  }

  export const ShareMenuReactView: ShareMenuReactViewStatic;

  const ShareMenu: ShareMenuStatic;
  export default ShareMenu;
} 