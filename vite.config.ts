import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'
  
  return {
    plugins: [
      vue(),
      dts({
        insertTypesEntry: true,
        include: ['src/**/*'],
        exclude: ['src/**/*.test.*', 'src/**/*.spec.*']
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        'vue': resolve(__dirname, 'node_modules/vue/dist/vue.esm.js')
      }
    },
    build: isLib ? {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'VueJsonUiEditor',
        formats: ['es', 'umd'],
        fileName: (format) => `vue-json-ui-editor.${format}.js`
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          globals: {
            vue: 'Vue'
          }
        }
      }
    } : {
      outDir: 'dist'
    },
    server: {
      port: 3000,
      open: true
    },
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false
    }
  }
})