import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/bharatkhoj-logo.png.asset.json";
import { cn } from "@/lib/utils";

type BrandProps = { compact?: boolean; className?: string; link?: boolean };

export function Brand({ compact = false, className, link = true }: BrandProps) {
  const content = (
    <span className={cn("inline-flex items-center", compact ? "gap-2" : "flex-col", className)}>
      <img
        src={logoAsset.url}
        alt="BharatKhoj"
        className={compact ? "h-10 w-14 object-cover object-top" : "h-auto w-full max-w-[24rem]"}
      />
      {compact && <span className="sr-only">BharatKhoj — India First Search Engine</span>}
    </span>
  );
  return link ? <Link to="/" aria-label="BharatKhoj home">{content}</Link> : content;
}
