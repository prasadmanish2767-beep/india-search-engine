import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./SiteChrome";

export function ContentLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="site-page">
      <SiteHeader />
      <main className="content-main">
        <header className="content-heading"><h1>{title}</h1><p>{intro}</p></header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
