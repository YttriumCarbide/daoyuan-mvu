import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 注入 Mvu mock 数据与全局依赖的插件
const mvuMockPlugin = () => {
  return {
    name: 'mvu-mock-plugin',
    apply: 'serve', // 仅在 dev 模式使用 (vite dev)
    transformIndexHtml(html) {
      return [
        {
          tag: 'script',
          attrs: { src: 'https://code.jquery.com/jquery-3.6.0.min.js' },
          injectTo: 'head-prepend'
        },
        {
          tag: 'script',
          attrs: { src: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js' },
          injectTo: 'head-prepend'
        },
        {
          tag: 'script',
          attrs: { src: '/mock.js' }, // 不加 type="module" 保证作为全局脚本先于 main.js 执行
          injectTo: 'head'
        }
      ];
    }
  }
};

export default defineConfig({
  root: 'src',
  plugins: [
    viteSingleFile(),
    mvuMockPlugin()
  ],
  build: {
    minify: false,
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
