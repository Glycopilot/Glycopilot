const mockCreateProxyMiddleware = jest.fn((config) => ({ proxy: true, config }));

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: mockCreateProxyMiddleware,
}));

describe('setupProxy', () => {
  const originalTarget = process.env.API_PROXY_TARGET;

  beforeEach(() => {
    mockCreateProxyMiddleware.mockImplementation((config) => ({ proxy: true, config }));
  });

  afterEach(() => {
    jest.resetModules();
    mockCreateProxyMiddleware.mockClear();
    if (originalTarget === undefined) delete process.env.API_PROXY_TARGET;
    else process.env.API_PROXY_TARGET = originalTarget;
  });

  it('installe le proxy /api avec la cible par défaut', () => {
    delete process.env.API_PROXY_TARGET;
    const setupProxy = require('../../setupProxy');
    const app = { use: jest.fn() };

    setupProxy(app);

    expect(mockCreateProxyMiddleware).toHaveBeenCalledWith({
      target: 'http://backend_local:8000',
      changeOrigin: false,
      pathFilter: '/api',
      logLevel: 'warn',
    });
    expect(app.use).toHaveBeenCalledWith({ proxy: true, config: expect.any(Object) });
  });

  it('respecte API_PROXY_TARGET si défini', () => {
    process.env.API_PROXY_TARGET = 'http://api.local:9000';
    const setupProxy = require('../../setupProxy');

    setupProxy({ use: jest.fn() });

    expect(mockCreateProxyMiddleware).toHaveBeenCalledWith(expect.objectContaining({
      target: 'http://api.local:9000',
    }));
  });
});
