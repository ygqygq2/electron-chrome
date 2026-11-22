import type {
  DockedShellMenuAnchor,
  DockedShellMenuSection,
  DockedShellStateSnapshot,
  DockedShellToolbarContextButtonId,
  DownloadsPopupStateSnapshot,
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
      quickFavoriteCurrentPage: () => void;
      goBack: () => void;
      goForward: () => void;
      reload: () => void;
      findInPage: (
        query: string,
        options?: { forward?: boolean; findNext?: boolean },
      ) => Promise<void>;
      hideFindBar: () => void;
      showTabContextMenu: (
        tabId: string,
        anchor: DockedShellMenuAnchor,
      ) => Promise<void>;
      closeOtherTabs: (tabId: string) => void;
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
      onFocusUrlInput: (callback: () => void) => () => void;
      onFindBarShown: (callback: () => void) => () => void;
      onFindBarResult: (
        callback: (result: {
          activeMatchOrdinal: number;
          matches: number;
        }) => void,
      ) => () => void;
    };

    downloadsPopup: {
      getState: () => Promise<DownloadsPopupStateSnapshot>;
      setThemeSource: (themeSource: "system" | "light" | "dark") => void;
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
