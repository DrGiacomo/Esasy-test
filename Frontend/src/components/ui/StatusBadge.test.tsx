import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('traduce el estado a algo legible', () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText('Terminada')).toBeInTheDocument();
  });

  it('usa el color semántico del fallo, no el rojo de la marca', () => {
    render(<StatusBadge status="FAILED" />);
    const etiqueta = screen.getByText('Falló');
    expect(etiqueta.className).toContain('text-fallo-500');
    // El sangre es el color de la marca y está en el botón de Entrar: si un fallo lo
    // usara, «Entrar» y «Falló» se verían igual.
    expect(etiqueta.className).not.toContain('sangre');
  });

  it('conserva el valor técnico en el título, para poder buscarlo', () => {
    render(<StatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pendiente de aprobar')).toHaveAttribute('title', 'PENDING_APPROVAL');
  });

  it('un estado desconocido se enseña tal cual, sin inventarle traducción', () => {
    render(<StatusBadge status="WAT" />);
    const etiqueta = screen.getByText('WAT');
    expect(etiqueta.className).toContain('text-texto-tenue');
    expect(etiqueta).not.toHaveAttribute('title');
  });
});
