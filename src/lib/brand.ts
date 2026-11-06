// Public files are served by every host, without a platform-specific asset proxy.
export const BRAND_LOGO_PATH = "/bharatkhoj-logo.png";
export const BRAND_ICON_PATH = "/bharatkhoj-icon.png";
export const BRAND_SITE_URL = "https://bharatkhoj.vercel.app";
export const BRAND_LOGO_URL = `${BRAND_SITE_URL}${BRAND_LOGO_PATH}`;
export const brandImageMeta = [
  { property: "og:image", content: BRAND_LOGO_URL },
  { property: "og:image:alt", content: "BharatKhoj — India's First Search Engine" },
  { name: "twitter:image", content: BRAND_LOGO_URL },
  { name: "twitter:image:alt", content: "BharatKhoj — India's First Search Engine" },
];