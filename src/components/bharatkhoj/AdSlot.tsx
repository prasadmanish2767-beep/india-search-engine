import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdSlot({ position, className }: { position: "top" | "results"; className?: string }) {
  return (
    <aside
      className={cn("ad-slot", position === "results" && "ad-slot-results", className)}
      aria-label="Advertisement placeholder"
    >
      <Megaphone aria-hidden="true" />
      <span>Ad Space — Your advertisement here</span>
    </aside>
  );
}
