import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-800 text-gray-300',
    success: 'bg-green-900/30 text-green-400 border border-green-900',
    warning: 'bg-yellow-900/30 text-yellow-400 border border-yellow-900',
    danger: 'bg-red-900/30 text-red-400 border border-red-900',
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};