import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Brand } from "@/components/bharatkhoj/Brand";
import { LogoIntro } from "@/components/bharatkhoj/LogoIntro";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";
import { brandImageMeta, BRAND_LOGO_URL, BRAND_SITE_URL } from "@/lib/brand";

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
          <h1 id="home-title" className="sr-only">BharatKhoj — India's First Search Engine</h1>

          <SearchBox autoFocus={introFinished} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
