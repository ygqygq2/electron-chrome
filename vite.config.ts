import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

const require = createRequire(import.meta.url);

function isElectronRuntimeReady() {
  let electronPackageRoot: string;

  try {
    electronPackageRoot = path.dirname(
      require.resolve("electron/package.json", {
        paths: [__dirname],
      }),
    );
  } catch {
    return false;
  }

  const pathFile = path.join(electronPackageRoot, "path.txt");

  if (!fs.existsSync(pathFile)) {
    return false;
  }

  const electronBinaryRelativePath = fs.readFileSync(pathFile, "utf8").trim();

  if (!electronBinaryRelativePath) {
    return false;
  }

  return fs.existsSync(
    path.join(electronPackageRoot, "dist", electronBinaryRelativePath),
  );
}

export default defineConfig(({ command }) => {
  const shouldUseElectron = command !== "serve" || isElectronRuntimeReady();

  if (command === "serve" && !shouldUseElectron) {
    console.warn(
      "[vite] Electron runtime 未完整安装，dev 模式将回退到浏览器预览。修复 electron 后会自动恢复桌面模式。",
    );
  }

  return {
    root: path.join(__dirname, "src/renderer"),
    build: {
      outDir: path.join(__dirname, "dist"),
      emptyOutDir: true,
    },
    plugins: [
      ...(shouldUseElectron
        ? [
            electron({
              main: {
                entry: path.join(__dirname, "electron/main.ts"),
                vite: {
                  build: {
                    outDir: path.join(__dirname, "dist-electron"),
                  },
                },
              },
              preload: {
                input: path.join(__dirname, "electron/preload.ts"),
                vite: {
                  build: {
                    outDir: path.join(__dirname, "dist-electron"),
                    rollupOptions: {
                      output: {
                        format: "es",
                        inlineDynamicImports: true,
                        entryFileNames: "[name].mjs",
                        chunkFileNames: "[name].mjs",
                        assetFileNames: "[name].[ext]",
                      },
                    },
                  },
                },
              },
              renderer: {},
            }),
          ]
        : []),
    ],
  };
});
