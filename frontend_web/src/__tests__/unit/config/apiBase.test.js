import { getApiBase } from '../../../config/apiBase';

describe('getApiBase', () => {
  const original = process.env.REACT_APP_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.REACT_APP_API_URL;
    else process.env.REACT_APP_API_URL = original;
  });

  it('lit REACT_APP_API_URL', () => {
    process.env.REACT_APP_API_URL = 'https://api.example.com/api/';
    expect(getApiBase()).toBe('https://api.example.com/api');
  });

  it('sans variable retourne une chaîne vide', () => {
    delete process.env.REACT_APP_API_URL;
    expect(getApiBase()).toBe('');
  });
});
