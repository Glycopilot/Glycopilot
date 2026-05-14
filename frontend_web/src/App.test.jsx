import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./services/authService', () => ({
  __esModule: true,
  default: {
    isAuthenticated: () => false,
    getApiClient: () => ({ get: jest.fn(), post: jest.fn() }),
    getStoredUser: () => null,
  },
}));

test('renders the login screen at startup when not authenticated', async () => {
  render(<App />);
  await waitFor(() =>
    expect(screen.getAllByText(/connexion/i).length).toBeGreaterThanOrEqual(1)
  );
});

