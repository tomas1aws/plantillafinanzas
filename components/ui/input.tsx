import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("flex h-10 w-full rounded-xl border bg-[var(--input)] px-3 py-2 text-sm outline-none ring-offset-[var(--input)] transition-colors duration-200 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20", className)} {...props} />
));
Input.displayName = "Input";
export { Input };
