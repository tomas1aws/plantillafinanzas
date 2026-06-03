import * as React from "react";
import { cn } from "@/lib/utils";

export function SelectNative(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("flex h-10 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600", props.className)} />;
}
