const { createProxyMiddleware } = require('http-proxy-middleware');

const API_TARGET = process.env.API_PROXY_TARGET;

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target: API_TARGET,
      changeOrigin: false,
      pathFilter: '/api',
      logLevel: 'warn',
    })
  );

  app.use(
    '/geo-api',
    createProxyMiddleware({
      target: 'https://geo.api.gouv.fr',
      changeOrigin: true,
      pathRewrite: { '^/geo-api': '' },
      logLevel: 'warn',
    })
  );

  app.use(
    '/adresse-api',
    createProxyMiddleware({
      target: 'https://api-adresse.data.gouv.fr',
      changeOrigin: true,
      pathRewrite: { '^/adresse-api': '' },
      logLevel: 'warn',
    })
  );
};
