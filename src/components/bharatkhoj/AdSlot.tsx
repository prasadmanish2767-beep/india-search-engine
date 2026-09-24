import { Link } from "@tanstack/react-router";
import { Megaphone, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BharatKhoj ad templates. Until a paid advertiser or ad network is connected,
 * each slot shows an honest BharatKhoj "Advertise here" house ad that leads to
 * the contact page, so real advertisers can book the space.
 */
export function AdSlot({ position, className }: { position: "top" | "results" | "inline"; className?: string }) {
  if (position === "top") {
    return (
      <aside className={cn("ad-slot ad-top", className)} aria-label="Advertisement">
        <span className="ad-tag">Ad · BharatKhoj Ads</span>
        <Megaphone aria-hidden="true" />
        <p><strong>Apna business yahan dikhayein.</strong> Reach people searching on BharatKhoj.</p>
        <Link to="/contact" className="ad-cta">Advertise</Link>
      </aside>
    );
  }
  if (position === "inline") {
    return (
      <aside className={cn("ad-slot ad-inline", className)} aria-label="Advertisement">
        <span className="ad-tag">Sponsored · BharatKhoj Ads</span>
        <h3><Target aria-hidden="true" /> Your ad could appear right here</h3>
        <p>Show a text ad next to real search results for the keywords your customers use.</p>
        <Link to="/contact" className="ad-cta">Book this ad space</Link>
      </aside>
    );
  }
  return (
    <aside className={cn("ad-slot ad-side", className)} aria-label="Advertisement">
      <span className="ad-tag">Ad · BharatKhoj Ads</span>
      <TrendingUp aria-hidden="true" />
      <h3>Grow with BharatKhoj</h3>
      <p>Local businesses, startups and brands — reach Indian searchers at the moment they look for you.</p>
      <Link to="/contact" className="ad-cta">Start advertising</Link>
    </aside>
  );
}
