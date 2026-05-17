describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.resetModules();
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true,
    });
    jest.restoreAllMocks();
  });

  function loadLoggerWithEnv(env) {
    jest.resetModules();
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: env,
      configurable: true,
    });
    return require('../../../lib/logger');
  }

  it('écrit les logs en environnement de développement/test', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { devLog, devWarn, devError } = loadLoggerWithEnv('test');

    devLog('log');
    devWarn('warn');
    devError('error');

    expect(log).toHaveBeenCalledWith('log');
    expect(warn).toHaveBeenCalledWith('warn');
    expect(error).toHaveBeenCalledWith('error');
  });

  it('reste silencieux en production', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { devLog, devWarn, devError } = loadLoggerWithEnv('production');

    devLog('log');
    devWarn('warn');
    devError('error');

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
