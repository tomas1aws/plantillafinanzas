import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <ProgressPrimitive.Root className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)} value={value}>
      <ProgressPrimitive.Indicator className="h-full bg-teal-600 transition-all" style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }} />
    </ProgressPrimitive.Root>
  );
}
