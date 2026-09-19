import { Link } from "@tanstack/react-router";
import { Menu, Settings } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand compact />
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/about" activeProps={{ className: "nav-active" }}>About</Link>
          <Link to="/privacy" activeProps={{ className: "nav-active" }}>Privacy</Link>
          <Link to="/contact" activeProps={{ className: "nav-active" }}>Contact</Link>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings" aria-label="Search settings"><Settings /></Link>
          </Button>
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Open navigation"><Menu /></summary>
          <div>
            <Link to="/about">About</Link><Link to="/privacy">Privacy</Link>
            <Link to="/contact">Contact</Link><Link to="/settings">Settings</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>© 2026 BharatKhoj. All rights reserved.</p>
        <nav aria-label="Footer navigation">
          <Link to="/about">About</Link><Link to="/privacy">Privacy Policy</Link><Link to="/contact">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}

export function AccentLine() {
  return <div className="accent-line" aria-hidden="true"><span /><span /></div>;
}
