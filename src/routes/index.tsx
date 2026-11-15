import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Brand } from "@/components/bharatkhoj/Brand";
import { LogoIntro } from "@/components/bharatkhoj/LogoIntro";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";
import { brandImageMeta, BRAND_LOGO_URL, BRAND_SITE_URL } from "@/lib/brand";
import { INDIAN_LANGUAGES, getCurrentLanguage, setLanguage, t, LanguageCode } from "@/lib/i18n";

const description = "BharatKhoj is India's First Search Engine — a clean, privacy-conscious gateway to finding information across the web.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      ...brandImageMeta,
      { title: "BharatKhoj — India's First Search Engine" },
      { name: "description", content: description },
      { property: "og:title", content: "BharatKhoj — India's First Search Engine" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "BharatKhoj",
          slogan: "India's First Search Engine",
          url: BRAND_SITE_URL,
          image: BRAND_LOGO_URL,
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [introFinished, setIntroFinished] = useState(false);
  const [lang, setLangState] = useState<LanguageCode>("en");

  useEffect(() => {
    setLangState(getCurrentLanguage());
    const onLangChange = () => setLangState(getCurrentLanguage());
    window.addEventListener("bharatkhoj_lang_change", onLangChange);
    return () => window.removeEventListener("bharatkhoj_lang_change", onLangChange);
  }, []);

  const handleSelectLang = (code: LanguageCode) => {
    setLanguage(code);
    setLangState(code);
  };

  return (
    <div className="home-page">
      <LogoIntro onFinish={() => setIntroFinished(true)} />
      <main
        className="home-main"
        style={{
          opacity: introFinished ? 1 : 0,
          transform: introFinished ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: introFinished ? "auto" : "none",
        }}
      >
        <section className="home-search" aria-labelledby="home-title">
          <Brand link={false} />
          <h1 id="home-title" className="sr-only">BharatKhoj — {t("tagline", lang)}</h1>

          <SearchBox autoFocus={introFinished} />

          <div
            className="home-languages"
            style={{
              marginTop: "1.75rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem 0.6rem",
              fontSize: "0.85rem",
              color: "var(--muted-foreground, #666)",
              maxWidth: "680px",
              marginInline: "auto",
            }}
          >
            <span style={{ fontWeight: 500 }}>{t("offeredIn", lang)}</span>
            {INDIAN_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => handleSelectLang(l.code)}
                style={{
                  background: lang === l.code ? "rgba(255, 107, 0, 0.12)" : "transparent",
                  color: lang === l.code ? "#FF6B00" : "#168A45",
                  fontWeight: lang === l.code ? 700 : 500,
                  border: lang === l.code ? "1px solid rgba(255, 107, 0, 0.3)" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "2px 7px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {l.nativeName}
              </button>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
