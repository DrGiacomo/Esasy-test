interface BadgeProps {
  label: string;
  color?: 'gray' | 'indigo' | 'emerald' | 'red' | 'yellow';
}

const colorMap = {
  gray: 'bg-superficie-2 text-texto-tenue',
  indigo: 'bg-sangre-100 text-sangre-700',
  emerald: 'bg-paso-100 text-paso-500',
  red: 'bg-fallo-100 text-fallo-500',
  yellow: 'bg-espera-100 text-espera-500',
};

export function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[color]}`}
    >
      {label}
    </span>
  );
}
