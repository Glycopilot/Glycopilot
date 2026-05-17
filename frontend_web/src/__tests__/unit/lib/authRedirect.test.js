describe('auth-redirect', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('exécute le handler par défaut sans lever d\'exception', () => {
    const { triggerAuthRedirect } = require('../../../lib/auth-redirect');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => triggerAuthRedirect()).not.toThrow();

    consoleError.mockRestore();
  });

  it('utilise le handler enregistré', () => {
    const { registerAuthRedirect, triggerAuthRedirect } = require('../../../lib/auth-redirect');
    const handler = jest.fn();

    registerAuthRedirect(handler);
    triggerAuthRedirect();

    expect(handler).toHaveBeenCalled();
  });
});
