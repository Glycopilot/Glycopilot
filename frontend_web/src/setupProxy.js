const { createProxyMiddleware } = require('http-proxy-middleware');

const API_TARGET = process.env.API_PROXY_TARGET || 'http://backend_local:8000';

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target: API_TARGET,
      changeOrigin: false,
      pathFilter: '/api',
      logLevel: 'warn',
    })
  );
};
