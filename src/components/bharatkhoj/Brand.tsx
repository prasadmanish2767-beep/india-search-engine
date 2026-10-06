import { Link } from "@tanstack/react-router";
import { BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandProps = { compact?: boolean; className?: string; link?: boolean };

export function Brand({ compact = false, className, link = true }: BrandProps) {
  const content = (
    <span className={cn("inline-flex items-center", compact ? "gap-2" : "flex-col", className)}>
      <img
        src={BRAND_LOGO_PATH}
        alt="BharatKhoj"
        width={1122}
        height={791}
        className={compact ? "h-auto w-24 object-contain" : "h-auto w-full max-w-[24rem]"}
      />
      {compact && <span className="sr-only">BharatKhoj — India's First Search Engine</span>}
    </span>
  );
  return link ? <Link to="/" aria-label="BharatKhoj home">{content}</Link> : content;
}
