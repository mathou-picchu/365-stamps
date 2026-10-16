import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it("affiche le nom de l'app", () => {
    render(<App />);
    expect(screen.getByText('365 Calendar')).toBeInTheDocument();
  });
});
