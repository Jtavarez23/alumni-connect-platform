import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface MobileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, type, ...props }, ref) => {
    const isMobile = useIsMobile();
    
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Mobile optimizations
          isMobile && "h-12 text-base", // Larger height and font size for mobile
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
MobileInput.displayName = "MobileInput";

export { MobileInput };