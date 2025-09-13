// Reusable loading spinner component for messaging
import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  text?: string;
}

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-6 w-6',
  large: 'h-8 w-8'
};

export const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'medium',
  className,
  text
}) => {
  const spinnerClasses = cn(
    'animate-spin rounded-full border-2 border-primary/20 border-t-primary',
    sizeClasses[size],
    className
  );

  if (text) {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <div className={spinnerClasses} />
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    );
  }

  return <div className={spinnerClasses} />;
});

LoadingSpinner.displayName = 'LoadingSpinner';