import "./styles.css";

import type {
  DockedShellMenuAnchor,
  DockedShellStateSnapshot,
  DockedShellTabSnapshot,
} from "../../electron/preload";

const TAB_PREFERRED_WIDTH = 220;
const TAB_MIN_WIDTH = 108;
const TAB_GAP = 4;

const tabsHost = document.getElementById("tabsHost") as HTMLDivElement;
const tabsEl = document.getElementById("tabs") as HTMLDivElement;
const addTabButton = document.getElementById(
  "addTabButton",
) as HTMLButtonElement;
const backButton = document.getElementById("backButton") as HTMLButtonElement;
const forwardButton = document.getElementById(
  "forwardButton",
) as HTMLButtonElement;
const reloadButton = document.getElementById(
  "reloadButton",
) as HTMLButtonElement;
const urlInput = document.getElementById("urlInput") as HTMLInputElement;
const goButton = document.getElementById("goButton") as HTMLButtonElement;
const statusText = document.getElementById("statusText") as HTMLDivElement;
const appMenuButton = document.getElementById(
  "appMenuButton",
) as HTMLButtonElement;

let currentState: DockedShellStateSnapshot = {
  tabs: [],
  activeTabId: null,
  devtoolsVisible: false,
  dockPosition: "bottom",
  runtimeInfo: {
    environmentLabel: "环境检测中",
    gpuMode: "hardware",
    gpuLabel: "GPU 自动",
    gpuReason: "等待运行时检测",
    dbusNoiseSuppressed: false,
  },
};
let isEditingUrl = false;
let lastAppliedTabId: string | null = null;
let visibleTabStart = 0;

function normalizeUrl(value: string) {
  const input = value.trim();
  if (!input) {
    return "";
  }
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/i.test(input)) {
    return input;
  }
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  return `https://${input}`;
}

function getActiveTab() {
  return (
    currentState.tabs.find((tab) => tab.id === currentState.activeTabId) ?? null
  );
}

function getDisplayHost(url: string) {
  if (/^chrome:\/\//i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return parsed.host || parsed.protocol.replace(":", "");
  } catch {
    return url || "当前标签";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getVisibleTabsLayout() {
  const tabsCount = currentState.tabs.length;

  if (tabsCount === 0) {
    visibleTabStart = 0;
    return {
      tabWidth: TAB_PREFERRED_WIDTH,
      visibleTabs: [] as DockedShellTabSnapshot[],
    };
  }

  const addButtonWidth = addTabButton.offsetWidth || 32;
  const trackWidth = tabsHost.clientWidth || 0;
  const availableTabsWidth = Math.max(0, trackWidth - addButtonWidth - TAB_GAP);
  const activeTabIndex = currentState.tabs.findIndex(
    (tab) => tab.id === currentState.activeTabId,
  );

  if (availableTabsWidth <= 0) {
    const fallbackStart = clamp(
      activeTabIndex >= 0 ? activeTabIndex : 0,
      0,
      Math.max(0, tabsCount - 1),
    );

    visibleTabStart = fallbackStart;
    return {
      tabWidth: TAB_MIN_WIDTH,
      visibleTabs: currentState.tabs.slice(fallbackStart, fallbackStart + 1),
    };
  }

  let visibleCount = tabsCount;
  let tabWidth = Math.floor(
    (availableTabsWidth - TAB_GAP * Math.max(0, tabsCount - 1)) / tabsCount,
  );

  if (tabWidth > TAB_PREFERRED_WIDTH) {
    tabWidth = TAB_PREFERRED_WIDTH;
  }

  if (tabWidth < TAB_MIN_WIDTH) {
    visibleCount = Math.max(
      1,
      Math.floor((availableTabsWidth + TAB_GAP) / (TAB_MIN_WIDTH + TAB_GAP)),
    );
    visibleCount = Math.min(visibleCount, tabsCount);
    tabWidth = Math.floor(
      (availableTabsWidth - TAB_GAP * Math.max(0, visibleCount - 1)) /
        visibleCount,
    );
    tabWidth = Math.max(72, Math.min(tabWidth, TAB_PREFERRED_WIDTH));
  }

  let nextVisibleStart = clamp(
    visibleTabStart,
    0,
    Math.max(0, tabsCount - visibleCount),
  );

  if (activeTabIndex >= 0) {
    if (activeTabIndex < nextVisibleStart) {
      nextVisibleStart = activeTabIndex;
    }

    if (activeTabIndex >= nextVisibleStart + visibleCount) {
      nextVisibleStart = activeTabIndex - visibleCount + 1;
    }
  }

  nextVisibleStart = clamp(
    nextVisibleStart,
    0,
    Math.max(0, tabsCount - visibleCount),
  );
  visibleTabStart = nextVisibleStart;

  return {
    tabWidth,
    visibleTabs: currentState.tabs.slice(
      nextVisibleStart,
      nextVisibleStart + visibleCount,
    ),
  };
}

function updateStatus() {
  const tab = getActiveTab();
  if (!tab) {
    statusText.textContent = "无活动标签";
    statusText.classList.remove("loading");
    return;
  }

  if (tab.isLoading) {
    statusText.textContent = `${getDisplayHost(tab.url)} · 加载中...`;
    statusText.classList.add("loading");
    return;
  }

  statusText.textContent = currentState.devtoolsVisible
    ? `${getDisplayHost(tab.url)} · DevTools ${currentState.dockPosition}`
    : `${getDisplayHost(tab.url)} · ${currentState.tabs.length} 个标签`;
  statusText.classList.remove("loading");
}

function updateNavigationButtons() {
  const tab = getActiveTab();
  backButton.disabled = !tab?.canGoBack;
  forwardButton.disabled = !tab?.canGoForward;
  reloadButton.disabled = !tab;
}

function createTabElement(tab: DockedShellTabSnapshot, tabWidth: number) {
  const tabEl = document.createElement("div");
  tabEl.className = `tab${tab.id === currentState.activeTabId ? " active" : ""}${tab.isLoading ? " loading" : ""}`;
  tabEl.style.width = `${tabWidth}px`;

  const metaEl = document.createElement("div");
  metaEl.className = "tab-meta";

  const titleEl = document.createElement("div");
  titleEl.className = "tab-title";
  titleEl.textContent = tab.title || tab.url || "新标签页";

  const closeEl = document.createElement("button");
  closeEl.className = "tab-close";
  closeEl.type = "button";
  closeEl.textContent = "×";
  closeEl.title = "关闭标签页";
  closeEl.disabled = currentState.tabs.length <= 1;
  closeEl.addEventListener("click", (event) => {
    event.stopPropagation();
    window.dockedShell.closeTab(tab.id);
  });

  tabEl.append(metaEl, titleEl, closeEl);
  tabEl.addEventListener("click", () => window.dockedShell.activateTab(tab.id));
  return tabEl;
}

function renderTabs() {
  const { visibleTabs, tabWidth } = getVisibleTabsLayout();

  tabsEl.replaceChildren(
    ...visibleTabs.map((tab) => createTabElement(tab, tabWidth)),
  );
}

function applyState(state: DockedShellStateSnapshot | null) {
  if (!state) {
    return;
  }

  const previousActiveTabId = currentState.activeTabId;
  currentState = state;
  const activeTab = getActiveTab();

  if (!isEditingUrl || previousActiveTabId !== activeTab?.id) {
    urlInput.value = activeTab?.url || "";
    lastAppliedTabId = activeTab?.id || null;
  }

  renderTabs();
  updateNavigationButtons();
  updateStatus();
}

addTabButton.addEventListener("click", () => {
  window.dockedShell.newTab("https://example.com/");
});

goButton.addEventListener("click", () => {
  const url = normalizeUrl(urlInput.value);
  if (url) {
    isEditingUrl = false;
    window.dockedShell.navigate(url);
  }
});

urlInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  const url = normalizeUrl(urlInput.value);
  if (url) {
    isEditingUrl = false;
    window.dockedShell.navigate(url);
  }
});

urlInput.addEventListener("focus", () => {
  isEditingUrl = true;
});

urlInput.addEventListener("blur", () => {
  isEditingUrl = false;
  const activeTab = getActiveTab();
  if (activeTab && lastAppliedTabId === activeTab.id) {
    urlInput.value = activeTab.url || "";
  }
});

backButton.addEventListener("click", () => window.dockedShell.goBack());
forwardButton.addEventListener("click", () => window.dockedShell.goForward());
reloadButton.addEventListener("click", () => window.dockedShell.reload());

appMenuButton.addEventListener("click", () => {
  const rect = appMenuButton.getBoundingClientRect();
  const anchor: DockedShellMenuAnchor = {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 6,
  };

  void window.dockedShell.showMenu("app", anchor);
});

new ResizeObserver(() => {
  renderTabs();
}).observe(tabsHost);

window.dockedShell.onStateChanged(applyState);
void window.dockedShell.getState().then(applyState);
