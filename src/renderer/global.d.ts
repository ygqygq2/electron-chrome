import type {
  DockedShellMenuAnchor,
  DockedShellMenuSection,
  DockedShellStateSnapshot,
} from "../../electron/preload";

declare global {
  interface Window {
    dockedShell: {
      getState: () => Promise<DockedShellStateSnapshot | null>;
      newTab: (url?: string) => void;
      activateTab: (tabId: string) => void;
      closeTab: (tabId: string) => void;
      navigate: (url: string) => void;
      goBack: () => void;
      goForward: () => void;
      reload: () => void;
      showMenu: (
        section: DockedShellMenuSection,
        anchor: DockedShellMenuAnchor,
      ) => Promise<void>;
      onStateChanged: (
        callback: (state: DockedShellStateSnapshot) => void,
      ) => () => void;
    };
  }
}

export {};
