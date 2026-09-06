import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/**
 * Los cuatro botones, con la paleta de `index.css`.
 *
 * `danger` usa `fallo` y NO `sangre`, aunque los dos sean rojos: el sangre es el color de
 * la marca —está en el botón de Entrar, que es la acción más normal del mundo— y el fallo
 * es un dato. Si compartieran color, «Entrar» y «Eliminar» se verían igual.
 */
const variantClass: Record<Variant, string> = {
  primary: 'bg-sangre-600 text-oro-100 hover:bg-sangre-500 disabled:bg-sangre-400',
  secondary: 'bg-tinta-50 text-tinta-700 border border-tinta-300 hover:bg-tinta-100',
  danger: 'bg-fallo-500 text-white hover:bg-fallo-500/90 disabled:opacity-60',
  ghost: 'text-tinta-600 hover:bg-tinta-200',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      // El píxel de subida es el de Alma. `transition-all` en vez de `transition-colors`
      // porque ahora también se mueve; 120 ms, el tiempo rápido del tema.
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-[120ms] hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
