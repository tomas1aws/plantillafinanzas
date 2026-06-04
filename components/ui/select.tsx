import * as React from "react";
import { cn } from "@/lib/utils";

export function SelectNative(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("flex h-10 w-full rounded-xl border bg-[var(--input)] px-3 py-2 text-sm outline-none transition-colors duration-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20", props.className)} />;
}
