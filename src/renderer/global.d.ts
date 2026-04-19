import type {
  DownloadsPopupStateSnapshot,
  DockedShellMenuAnchor,
  DockedShellMenuSection,
  DockedShellStateSnapshot,
  DockedShellToolbarContextButtonId,
} from "../../electron/preload";

declare global {
  interface Window {
    dockedShell: {
      getState: () => Promise<DockedShellStateSnapshot | null>;
      newTab: (url?: string) => void;
      activateTab: (tabId: string) => void;
      closeTab: (tabId: string) => void;
      restoreClosedTab: () => void;
      navigate: (url: string) => void;
      openHome: () => void;
      goBack: () => void;
      goForward: () => void;
      reload: () => void;
      openDownloadsPopup: () => void;
      minimizeWindow: () => void;
      toggleMaximizeWindow: () => void;
      closeWindow: () => void;
      showMenu: (
        section: DockedShellMenuSection,
        anchor: DockedShellMenuAnchor,
      ) => Promise<void>;
      showToolbarButtonContextMenu: (
        buttonId: DockedShellToolbarContextButtonId,
        anchor: DockedShellMenuAnchor,
      ) => Promise<void>;
      onStateChanged: (
        callback: (state: DockedShellStateSnapshot) => void,
      ) => () => void;
    };

    downloadsPopup: {
      getState: () => Promise<DownloadsPopupStateSnapshot>;
      openItem: (id: string) => Promise<boolean>;
      showItemInFolder: (id: string) => Promise<boolean>;
      retryDownload: (id: string) => Promise<boolean>;
      clearCompleted: () => void;
      removeItem: (id: string) => void;
      openDownloadsPage: () => void;
      openDownloadsSettings: () => void;
      onStateChanged: (
        callback: (state: DownloadsPopupStateSnapshot) => void,
      ) => () => void;
    };
  }
}

export {};
