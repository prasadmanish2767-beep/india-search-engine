import { Link } from "@tanstack/react-router";
import { BRAND_ICON_PATH, BRAND_LOGO_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandProps = { compact?: boolean; className?: string; link?: boolean };

export function Brand({ compact = false, className, link = true }: BrandProps) {
  const content = compact ? (
    <span className={cn("inline-flex items-center", className)}>
      <img src={BRAND_ICON_PATH} alt="BharatKhoj" width={1370} height={1148} className="h-10 w-auto object-contain" />
      <span className="sr-only">BharatKhoj — India's First Search Engine</span>
    </span>
  ) : (
    <span className={cn("inline-flex flex-col items-center", className)}>
      <img src={BRAND_LOGO_PATH} alt="BharatKhoj — India's First Search Engine" width={1774} height={887} className="hidden h-auto w-full max-w-[28rem] object-contain sm:block" />
      <img src={BRAND_ICON_PATH} alt="BharatKhoj" width={1370} height={1148} className="h-auto w-32 object-contain sm:hidden" />
    </span>
  );
  return link ? <Link to="/" aria-label="BharatKhoj home">{content}</Link> : content;
}
