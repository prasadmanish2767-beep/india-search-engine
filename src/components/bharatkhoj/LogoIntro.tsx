import { useEffect, useState } from "react";

export function LogoIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), 3400);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="logo-intro" aria-hidden="true">
      <div className="logo-intro-stage">
        <img className="logo-intro-icon" src="/anim-logo-icon.png" alt="" width={1370} height={1148} />
        <img className="logo-intro-full" src="/anim-logo-full.png" alt="" width={1774} height={887} />
      </div>
    </div>
  );
}