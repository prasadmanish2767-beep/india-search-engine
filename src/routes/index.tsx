import { createFileRoute } from "@tanstack/react-router";
import { AdSlot } from "@/components/bharatkhoj/AdSlot";
import { Brand } from "@/components/bharatkhoj/Brand";
import { SearchBox } from "@/components/bharatkhoj/SearchBox";
import { SiteFooter } from "@/components/bharatkhoj/SiteChrome";

const description = "BharatKhoj is India First Search Engine — a clean, privacy-conscious gateway to finding information across the web.";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BharatKhoj — India First Search Engine" },
      { name: "description", content: description },
      { property: "og:title", content: "BharatKhoj — India First Search Engine" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "BharatKhoj", slogan: "India First Search Engine", url: "/" }) }],
  }),
  component: HomePage,
});
function HomePage() {
  return (
    <div className="home-page">
      <main className="home-main">
        <AdSlot position="top" />
        <section className="home-search" aria-labelledby="home-title">
          <Brand link={false} />
          <h1 id="home-title" className="sr-only">BharatKhoj — India First Search Engine</h1>

          <SearchBox autoFocus />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
