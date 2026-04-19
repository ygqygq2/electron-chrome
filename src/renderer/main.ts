import "./styles.css";

import type {
  DockedShellMenuAnchor,
  DockedShellMenuSection,
  DockedShellStateSnapshot,
  DockedShellTabSnapshot,
  DockedShellToolbarContextButtonId,
} from "../../electron/preload";

const TAB_PREFERRED_WIDTH = 182;
const TAB_MIN_WIDTH = 108;
const TAB_GAP = 0;

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
const homeButton = document.getElementById("homeButton") as HTMLButtonElement;
const leftToolbarActions = document.getElementById(
  "leftToolbarActions",
) as HTMLDivElement;
const urlInput = document.getElementById("urlInput") as HTMLInputElement;
const statusStack = document.querySelector(".status-stack") as HTMLDivElement;
const statusText = document.getElementById("statusText") as HTMLDivElement;
const rightToolbarActions = document.getElementById(
  "rightToolbarActions",
) as HTMLDivElement;
const restoreTabButton = document.getElementById(
  "restoreTabButton",
) as HTMLButtonElement;
const favoritesButton = document.getElementById(
  "favoritesButton",
) as HTMLButtonElement;
const downloadsButton = document.getElementById(
  "downloadsButton",
) as HTMLButtonElement;
const extensionsButton = document.getElementById(
  "extensionsButton",
) as HTMLButtonElement;
const appMenuButton = document.getElementById(
  "appMenuButton",
) as HTMLButtonElement;
const minimizeWindowButton = document.getElementById(
  "minimizeWindowButton",
) as HTMLButtonElement;
const maximizeWindowButton = document.getElementById(
  "maximizeWindowButton",
) as HTMLButtonElement;
const closeWindowButton = document.getElementById(
  "closeWindowButton",
) as HTMLButtonElement;

const ICON_MARKUP: Record<string, string> = {
  "icon-add":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  "icon-back":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  "icon-forward":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  "icon-reload":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"/><path d="M16 3h5v5"/></svg>',
  "icon-home":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
  "icon-restore-tab":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 14-5-5 5-5"/><path d="M20 20a8 8 0 0 0-8-8H4"/></svg>',
  "icon-favorites":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.7 2.53 5.13 5.67.82-4.1 4 .97 5.65L12 16.43 6.93 19.3l.97-5.65-4.1-4 5.67-.82z"/></svg>',
  "icon-downloads":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>',
  "icon-extensions":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.75 4.75h5.5v5.5h-5.5z"/><path d="M13.75 4.75h5.5v5.5h-5.5z"/><path d="M4.75 13.75h5.5v5.5h-5.5z"/><path d="M13.75 13.75h5.5v5.5h-5.5z"/></svg>',
  "icon-menu":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>',
  "icon-minimize":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  "icon-maximize":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5z"/></svg>',
  "icon-restore-window":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h11v11H8z"/><path d="M5 16V5h11"/></svg>',
  "icon-close":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>',
  "icon-close-small":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10"/><path d="M17 7 7 17"/></svg>',
  "icon-globe":
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>',
};

function ensureButtonIcon(button: HTMLButtonElement, iconClass: string) {
  let iconEl = button.querySelector(".toolbar-icon") as HTMLSpanElement | null;

  if (!iconEl) {
    iconEl = document.createElement("span");
    iconEl.className = "toolbar-icon";
    iconEl.setAttribute("aria-hidden", "true");
    button.replaceChildren(iconEl);
  }

  iconEl.className = `toolbar-icon ${iconClass}`;
  iconEl.innerHTML = ICON_MARKUP[iconClass] ?? "";
  return iconEl;
}

function createTabIconElement(tab: DockedShellTabSnapshot) {
  const iconWrap = document.createElement("span");
  iconWrap.className = "tab-icon";

  const fallbackIcon = document.createElement("span");
  fallbackIcon.className = "tab-icon-fallback";
  fallbackIcon.innerHTML = ICON_MARKUP["icon-globe"] ?? "";

  const resolvedUrl = tab.iconUrl;

  if (!resolvedUrl) {
    iconWrap.append(fallbackIcon);
    return iconWrap;
  }

  const iconImg = document.createElement("img");
  iconImg.className = "tab-icon-image";
  iconImg.alt = `${tab.title || tab.url || "标签页"} 图标`;
  iconImg.decoding = "async";
  iconImg.loading = "eager";
  iconImg.src = resolvedUrl;

  const showFallback = () => {
    if (!fallbackIcon.isConnected) {
      iconWrap.replaceChildren(fallbackIcon);
    }
  };

  iconImg.addEventListener("error", () => {
    showFallback();
  });

  iconWrap.append(iconImg);
  return iconWrap;
}

let currentState: DockedShellStateSnapshot = {
  tabs: [],
  activeTabId: null,
  canRestoreClosedTab: false,
  devtoolsVisible: false,
  dockPosition: "bottom",
  theme: {
    source: "system",
    resolved: "light",
  },
  toolbarPreferences: {
    home: {
      visible: true,
    },
    restoreClosedTab: {
      visible: true,
      placement: "right",
    },
    favorites: {
      visible: true,
      placement: "right",
    },
    downloads: {
      visible: true,
    },
    extensions: {
      visible: true,
    },
  },
  windowState: {
    isMaximized: false,
  },
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

function applyTheme() {
  document.documentElement.dataset.theme = currentState.theme.resolved;
  document.documentElement.dataset.themeSource = currentState.theme.source;
}

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
    statusText.textContent = "";
    statusStack.classList.add("hidden");
    statusText.classList.remove("loading");
    return;
  }

  if (tab.isLoading) {
    statusText.textContent = "加载中…";
    statusStack.classList.remove("hidden");
    statusText.classList.add("loading");
    return;
  }

  if (currentState.devtoolsVisible) {
    statusText.textContent = `开发者工具 · ${currentState.dockPosition}`;
    statusStack.classList.remove("hidden");
  } else {
    statusText.textContent = "";
    statusStack.classList.add("hidden");
  }

  statusText.classList.remove("loading");
}

function updateNavigationButtons() {
  const tab = getActiveTab();
  backButton.disabled = !tab?.canGoBack;
  forwardButton.disabled = !tab?.canGoForward;
  homeButton.disabled = !tab;
  reloadButton.disabled = !tab;
  restoreTabButton.disabled = !currentState.canRestoreClosedTab;
}

function updateWindowControls() {
  ensureButtonIcon(
    maximizeWindowButton,
    currentState.windowState.isMaximized
      ? "icon-restore-window"
      : "icon-maximize",
  );
  maximizeWindowButton.title = currentState.windowState.isMaximized
    ? "还原"
    : "最大化";
  maximizeWindowButton.setAttribute(
    "aria-label",
    currentState.windowState.isMaximized ? "还原" : "最大化",
  );
}

function toggleToolbarButtonVisibility(
  button: HTMLButtonElement,
  visible: boolean,
) {
  button.hidden = !visible;
}

function renderToolbarPreferences() {
  const preferences = currentState.toolbarPreferences;

  toggleToolbarButtonVisibility(homeButton, preferences.home.visible);
  toggleToolbarButtonVisibility(downloadsButton, preferences.downloads.visible);
  toggleToolbarButtonVisibility(
    extensionsButton,
    preferences.extensions.visible,
  );

  const leftButtons: HTMLButtonElement[] = [];
  const rightButtons: HTMLButtonElement[] = [];

  if (preferences.restoreClosedTab.visible) {
    (preferences.restoreClosedTab.placement === "left"
      ? leftButtons
      : rightButtons
    ).push(restoreTabButton);
  }

  if (preferences.favorites.visible) {
    (preferences.favorites.placement === "left"
      ? leftButtons
      : rightButtons
    ).push(favoritesButton);
  }

  if (preferences.downloads.visible) {
    rightButtons.push(downloadsButton);
  }

  if (preferences.extensions.visible) {
    rightButtons.push(extensionsButton);
  }

  leftToolbarActions.replaceChildren(...leftButtons);
  rightToolbarActions.replaceChildren(...rightButtons);
}

function createTabDivider(visible: boolean) {
  const dividerEl = document.createElement("div");
  dividerEl.className = `tab-divider${visible ? "" : " hidden"}`;
  return dividerEl;
}

function createTabElement(tab: DockedShellTabSnapshot, tabWidth: number) {
  const tabEl = document.createElement("div");
  tabEl.className = `tab${tab.id === currentState.activeTabId ? " active" : ""}${tab.isLoading ? " loading" : ""}`;
  tabEl.style.width = `${tabWidth}px`;
  tabEl.title = tab.title || tab.url || "新标签页";

  const iconEl = createTabIconElement(tab);

  const titleEl = document.createElement("div");
  titleEl.className = "tab-title";
  titleEl.textContent = tab.title || tab.url || "新标签页";

  const closeEl = document.createElement("button");
  closeEl.className = "tab-close";
  closeEl.type = "button";
  closeEl.title = "关闭标签页";
  closeEl.setAttribute(
    "aria-label",
    `关闭 ${tab.title || tab.url || "标签页"}`,
  );
  closeEl.append(ensureButtonIcon(closeEl, "icon-close-small"));
  closeEl.disabled = currentState.tabs.length <= 1;
  closeEl.addEventListener("click", (event) => {
    event.stopPropagation();
    window.dockedShell.closeTab(tab.id);
  });

  tabEl.append(iconEl, titleEl, closeEl);
  tabEl.addEventListener("click", () => window.dockedShell.activateTab(tab.id));
  return tabEl;
}

function renderTabs() {
  const { visibleTabs, tabWidth } = getVisibleTabsLayout();
  const children: HTMLElement[] = [];

  visibleTabs.forEach((tab, index) => {
    if (index > 0) {
      const previousTab = visibleTabs[index - 1];
      const shouldShowDivider =
        previousTab != null &&
        previousTab.id !== currentState.activeTabId &&
        tab.id !== currentState.activeTabId;
      children.push(createTabDivider(shouldShowDivider));
    }

    children.push(createTabElement(tab, tabWidth));
  });

  tabsEl.replaceChildren(...children);
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

  applyTheme();
  renderToolbarPreferences();
  renderTabs();
  updateNavigationButtons();
  updateStatus();
  updateWindowControls();
}

function showAnchoredMenu(
  button: HTMLButtonElement,
  section: DockedShellMenuSection,
) {
  const rect = button.getBoundingClientRect();
  const anchor: DockedShellMenuAnchor = {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 6,
  };

  void window.dockedShell.showMenu(section, anchor);
}

function showToolbarButtonContextMenu(
  button: HTMLButtonElement,
  buttonId: DockedShellToolbarContextButtonId,
) {
  const rect = button.getBoundingClientRect();
  const anchor: DockedShellMenuAnchor = {
    x: rect.left + rect.width / 2,
    y: rect.bottom + 6,
  };

  void window.dockedShell.showToolbarButtonContextMenu(buttonId, anchor);
}

addTabButton.addEventListener("click", () => {
  window.dockedShell.newTab();
});

homeButton.addEventListener("click", () => {
  window.dockedShell.openHome();
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
restoreTabButton.addEventListener("click", () => {
  window.dockedShell.restoreClosedTab();
});
restoreTabButton.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  showToolbarButtonContextMenu(restoreTabButton, "restoreClosedTab");
});
favoritesButton.addEventListener("click", () => {
  showAnchoredMenu(favoritesButton, "favorites");
});
favoritesButton.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  showToolbarButtonContextMenu(favoritesButton, "favorites");
});
downloadsButton.addEventListener("click", () => {
  showAnchoredMenu(downloadsButton, "downloads");
});
extensionsButton.addEventListener("click", () => {
  isEditingUrl = false;
  window.dockedShell.navigate("chrome://extensions");
});

appMenuButton.addEventListener("click", () => {
  showAnchoredMenu(appMenuButton, "app");
});

minimizeWindowButton.addEventListener("click", () => {
  window.dockedShell.minimizeWindow();
});

maximizeWindowButton.addEventListener("click", () => {
  window.dockedShell.toggleMaximizeWindow();
});

closeWindowButton.addEventListener("click", () => {
  window.dockedShell.closeWindow();
});

new ResizeObserver(() => {
  renderTabs();
}).observe(tabsHost);

ensureButtonIcon(addTabButton, "icon-add");
ensureButtonIcon(backButton, "icon-back");
ensureButtonIcon(forwardButton, "icon-forward");
ensureButtonIcon(reloadButton, "icon-reload");
ensureButtonIcon(homeButton, "icon-home");
ensureButtonIcon(restoreTabButton, "icon-restore-tab");
ensureButtonIcon(favoritesButton, "icon-favorites");
ensureButtonIcon(downloadsButton, "icon-downloads");
ensureButtonIcon(extensionsButton, "icon-extensions");
ensureButtonIcon(appMenuButton, "icon-menu");
ensureButtonIcon(minimizeWindowButton, "icon-minimize");
ensureButtonIcon(closeWindowButton, "icon-close");

window.dockedShell.onStateChanged(applyState);
void window.dockedShell.getState().then(applyState);
