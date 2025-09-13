import React, { forwardRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle, Eye, EyeOff, Search } from 'lucide-react';

interface OptimizedFormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  isLoading?: boolean;
  showPasswordToggle?: boolean;
  multiline?: boolean;
  rows?: number;
  debounceMs?: number;
  onDebouncedChange?: (value: string) => void;
}

const OptimizedFormInput = React.memo(
  forwardRef<HTMLInputElement | HTMLTextAreaElement, OptimizedFormInputProps>(
    ({
      label,
      error,
      helperText,
      variant = 'default',
      size = 'md',
      startIcon,
      endIcon,
      isLoading,
      showPasswordToggle,
      multiline = false,
      rows = 3,
      className,
      type = 'text',
      debounceMs,
      onDebouncedChange,
      onChange,
      ...props
    }, ref) => {
      const [showPassword, setShowPassword] = React.useState(false);
      const [internalValue, setInternalValue] = React.useState(props.value || props.defaultValue || '');

      // Debounced change handler
      const debouncedChangeRef = React.useRef<NodeJS.Timeout>();

      const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const value = e.target.value;
          setInternalValue(value);

          // Call original onChange immediately
          onChange?.(e as any);

          // Handle debounced change
          if (debounceMs && onDebouncedChange) {
            if (debouncedChangeRef.current) {
              clearTimeout(debouncedChangeRef.current);
            }

            debouncedChangeRef.current = setTimeout(() => {
              onDebouncedChange(value);
            }, debounceMs);
          }
        },
        [onChange, onDebouncedChange, debounceMs]
      );

      // Cleanup timeout on unmount
      React.useEffect(() => {
        return () => {
          if (debouncedChangeRef.current) {
            clearTimeout(debouncedChangeRef.current);
          }
        };
      }, []);

      const inputType = useMemo(() => {
        if (type === 'password' && showPassword) return 'text';
        return type;
      }, [type, showPassword]);

      const sizeClasses = {
        sm: 'h-8 text-sm',
        md: 'h-9',
        lg: 'h-11 text-lg',
      };

      const variantClasses = {
        default: '',
        destructive: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500',
      };

      const togglePasswordVisibility = useCallback(() => {
        setShowPassword(prev => !prev);
      }, []);

      const inputClasses = cn(
        sizeClasses[size],
        variantClasses[variant],
        startIcon && 'pl-10',
        (endIcon || showPasswordToggle || isLoading) && 'pr-10',
        className
      );

      const InputComponent = multiline ? Textarea : Input;
      const inputProps = {
        ref: ref as any,
        type: multiline ? undefined : inputType,
        className: inputClasses,
        onChange: handleChange,
        ...props,
        ...(multiline && { rows }),
      };

      return (
        <div className="space-y-2">
          {label && (
            <Label htmlFor={props.id} className={error ? 'text-destructive' : ''}>
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          )}

          <div className="relative">
            {startIcon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                {startIcon}
              </div>
            )}

            <InputComponent {...inputProps} />

            {(endIcon || showPasswordToggle || isLoading) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                )}

                {showPasswordToggle && type === 'password' && (
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}

                {endIcon}
              </div>
            )}
          </div>

          {(error || helperText) && (
            <div className="flex items-start gap-2 text-sm">
              {error && <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />}
              <span className={error ? 'text-destructive' : 'text-muted-foreground'}>
                {error || helperText}
              </span>
            </div>
          )}
        </div>
      );
    }
  )
);

OptimizedFormInput.displayName = 'OptimizedFormInput';

// Specialized search input component
const SearchInput = React.memo<OptimizedFormInputProps>(({
  placeholder = "Search...",
  debounceMs = 300,
  ...props
}) => {
  return (
    <OptimizedFormInput
      type="search"
      placeholder={placeholder}
      startIcon={<Search className="w-4 h-4" />}
      debounceMs={debounceMs}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

// Specialized password input component
const PasswordInput = React.memo<OptimizedFormInputProps>((props) => {
  return (
    <OptimizedFormInput
      type="password"
      showPasswordToggle
      {...props}
    />
  );
});

PasswordInput.displayName = 'PasswordInput';

export { OptimizedFormInput, SearchInput, PasswordInput };
export type { OptimizedFormInputProps };