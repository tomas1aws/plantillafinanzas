import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ring-offset-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-600", className)} {...props} />
));
Input.displayName = "Input";
export { Input };
