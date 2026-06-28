import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('muestra el texto del estado', () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('aplica la clase de color de un estado conocido', () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText('FAILED').className).toContain('text-red-700');
  });

  it('usa el color por defecto para un estado desconocido', () => {
    render(<StatusBadge status="WAT" />);
    expect(screen.getByText('WAT').className).toContain('text-gray-600');
  });
});
