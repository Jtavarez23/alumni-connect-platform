import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  description?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, touched, required, description, className, ...props }, ref) => {
    const hasError = touched && error;
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(required && "after:content-['*'] after:text-error after:ml-1")}>
            {label}
          </Label>
        )}
        
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            hasError && "border-error focus:ring-error",
            className
          )}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={
            description ? `${inputId}-description` : 
            hasError ? `${inputId}-error` : undefined
          }
          {...props}
        />
        
        {description && !hasError && (
          <p id={`${inputId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        
        {hasError && (
          <Alert variant="destructive" className="py-2" id={`${inputId}-error`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';