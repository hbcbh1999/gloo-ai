import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, onChange, ...props }, ref) => {
    const [val, setVal] = React.useState(value);

    React.useEffect(() => {
      if (value !== val) setVal(value);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
        value={val}
        onChange={(event) => {
          const v = event.target.value;
          /* Make update synchronous, to avoid caret jumping when the value doesn't change asynchronously */
          setVal(v);
          /* Make the real update afterwards */
          if (onChange) onChange(event);
        }}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
