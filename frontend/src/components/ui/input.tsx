import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-9 w-full rounded-lg border border-input dark:border-slate-800 bg-background dark:bg-slate-900/60 px-3 py-1 text-sm shadow-sm transition-colors text-foreground dark:text-slate-100 placeholder:text-muted-foreground dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
