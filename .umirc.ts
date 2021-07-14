import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  define: {
    APP_SIGN: 'doladola',
    SOCKET_URI: 'http://127.0.0.1:10996',
  },
  fastRefresh: {},
  hash: true,
  esbuild: {},
  favicon: '/favicon.ico',
  locale: {
    default: 'zh-CN',
    antd: true,
  },
  ignoreMomentLocale: true,
  theme: {
    "primary-color": "#000000",
  },

  // 配置 external
  externals: {
    'react': 'window.React',
    'react-dom': 'window.ReactDOM',
  },

  // 引入被 external 库的 scripts
  // 区分 development 和 production，使用不同的产物
  scripts: process.env.NODE_ENV === 'development' ? [
    'https://gw.alipayobjects.com/os/lib/react/17.0.2/umd/react.development.js',
    'https://gw.alipayobjects.com/os/lib/react-dom/17.0.2/umd/react-dom.development.js',
  ] : [
    'https://gw.alipayobjects.com/os/lib/react/17.0.2/umd/react.production.min.js',
    'https://gw.alipayobjects.com/os/lib/react-dom/17.0.2/umd/react-dom.production.min.js',
  ],

});
