import { parseApiError } from '../../../lib/apiErrors';

describe('parseApiError', () => {
  it('remplace le message Django Auth Account', () => {
    const err = {
      response: {
        data: {
          error: 'Un objet Auth Account avec ce champ email existe déjà.',
        },
      },
    };
    expect(parseApiError(err)).toMatch(/déjà associée à un compte/);
  });

  it('utilise data.error du backend', () => {
    const err = {
      response: {
        data: {
          error: 'Cette adresse email est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.',
        },
      },
    };
    expect(parseApiError(err)).toContain('Connectez-vous');
  });

  it('évite JSON.stringify brut', () => {
    const err = {
      response: { data: { email: ['Erreur champ'] } },
    };
    const msg = parseApiError(err, 'Fallback');
    expect(msg).not.toMatch(/^\{/);
    expect(msg).toBe('Erreur champ');
  });
});
