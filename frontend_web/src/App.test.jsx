import { render, screen } from '@testing-library/react';
import App from './App';

test('render login screen', () => {
  render(<App />);
  expect(screen.getAllByText(/connexion/i).length).toBeGreaterThanOrEqual(1);
});