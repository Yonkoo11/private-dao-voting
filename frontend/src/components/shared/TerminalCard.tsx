import type { ReactNode } from 'react';

interface TerminalCardProps {
  title: string;
  children: ReactNode;
  variant?: 'default' | 'voting' | 'success' | 'error';
  className?: string;
}

export function TerminalCard({
  title,
  children,
  variant = 'default',
  className = ''
}: TerminalCardProps) {
  return (
    <div className={`zen-card ${variant} ${className}`}>
      <div className="zen-card-header">
        <span className="zen-card-title">{title}</span>
      </div>
      <div className="zen-card-body">
        {children}
      </div>
    </div>
  );
}

// Alias for backwards compatibility during transition
export { TerminalCard as ZenCard };
