import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";

  return {
    plugins: [
      vue(),
      ...(isLib
        ? [
            dts({
              insertTypesEntry: true,
              include: ["src/**/*"],
              exclude: ["src/**/*.test.*", "src/**/*.spec.*"],
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    // Library build: bundle src/index.ts from the project root.
    // Demo/dev: serve the self-contained example/ app (index.html + main.ts
    // live there), so root points at example/ in non-lib modes.
    root: isLib ? undefined : resolve(__dirname, "example"),
    build: isLib
      ? {
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "VueJsonUiEditor",
            formats: ["es", "umd"],
            fileName: (format) => `vue-json-ui-editor.${format}.js`,
          },
          rollupOptions: {
            external: ["vue"],
            output: {
              // src/index.ts ships both a default and named exports. "named"
              // keeps the default reachable as `.default` for CJS consumers
              // (matching the main/module split) and silences Rollup's mixed
              // exports warning.
              exports: "named",
              globals: {
                vue: "Vue",
              },
            },
          },
        }
      : {
          // root is example/, so emit docs/ at the project root
          outDir: resolve(__dirname, "docs"),
          sourcemap: false,
        },
    server: {
      port: 3000,
      open: true,
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    },
  };
});
