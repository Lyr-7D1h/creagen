import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import dts from 'unplugin-dts/vite'
import { defineConfig, loadEnv } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  process.env = {
    ...loadEnv(mode, process.cwd()),
    ...process.env,
  }

  return {
    plugins: [
      // needed for opencv.js
      nodePolyfills(),
      dts({
        entryRoot: './src',
        outDirs: './dist',
        insertTypesEntry: true,
        bundleTypes: true,
        include: ['src/**/*'],
        beforeWriteFile(filePath, content) {
          if (!filePath.endsWith('creagen.d.ts')) {
            return
          }

          // include custom type declarations
          const ambientTypes = [
            './src/types/d3-quadtree.d.ts',
            './src/types/d3-delaunay.d.ts',
          ]
            .map((p) => readFileSync(resolve(p), 'utf-8'))
            .join('\n')

          // Fix the conflicting namespace issues, and prepend ambient module declarations
          return {
            content:
              ambientTypes +
              '\n' +
              content.replace(
                /export declare namespace Math_2 \{/g,
                'export declare namespace Math {',
              ),
          }
        },
      }),
    ],
    build: {
      lib: {
        entry: './src/index.ts',
        name: 'creagen',
        fileName: 'creagen',
        formats: ['es'],
      },
      sourcemap: true,
    },
    define: {
      CREAGEN_ASSERTS: JSON.stringify(isDev),
      CREAGEN_PRECISION: JSON.stringify(isDev ? 4 : 3),
    },
  }
})
