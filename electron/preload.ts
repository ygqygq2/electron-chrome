import { contextBridge, ipcRenderer } from "electron";

export type DockedShellGpuMode = "hardware" | "compatibility" | "limited";

export interface DockedShellRuntimeInfoSnapshot {
  environmentLabel: string;
  gpuMode: DockedShellGpuMode;
  gpuLabel: string;
  gpuReason: string;
  dbusNoiseSuppressed: boolean;
}

export interface DockedShellTabSnapshot {
  id: string;
  title: string;
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface DockedShellStateSnapshot {
  activeTabId: string | null;
  devtoolsVisible: boolean;
  dockPosition: "bottom" | "left" | "right";
  runtimeInfo: DockedShellRuntimeInfoSnapshot;
  tabs: DockedShellTabSnapshot[];
}

export interface DockedShellMenuAnchor {
  x: number;
  y: number;
}

export type DockedShellMenuSection = "file" | "navigate" | "debug" | "app";

contextBridge.exposeInMainWorld("dockedShell", {
  getState: () =>
    ipcRenderer.invoke(
      "docked-shell:get-state",
    ) as Promise<DockedShellStateSnapshot | null>,
  newTab: (url?: string) => ipcRenderer.send("docked-shell:new-tab", url),
  activateTab: (tabId: string) =>
    ipcRenderer.send("docked-shell:activate-tab", tabId),
  closeTab: (tabId: string) =>
    ipcRenderer.send("docked-shell:close-tab", tabId),
  navigate: (url: string) => ipcRenderer.send("docked-shell:navigate", url),
  goBack: () => ipcRenderer.send("docked-shell:go-back"),
  goForward: () => ipcRenderer.send("docked-shell:go-forward"),
  reload: () => ipcRenderer.send("docked-shell:reload"),
  showMenu: (section: DockedShellMenuSection, anchor: DockedShellMenuAnchor) =>
    ipcRenderer.invoke("docked-shell:show-menu", { section, anchor }),
  onStateChanged: (callback: (state: DockedShellStateSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: DockedShellStateSnapshot,
    ) => callback(payload);
    ipcRenderer.on("docked-shell:state", listener);
    return () => ipcRenderer.removeListener("docked-shell:state", listener);
  },
});
