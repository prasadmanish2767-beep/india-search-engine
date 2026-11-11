import { useEffect, useState } from "react";

interface LogoIntroProps {
  onFinish?: () => void;
}

export function LogoIntro({ onFinish }: LogoIntroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Agar user pehle dekh chuka hai ya motion disabled hai, toh animation skip karein
    const alreadySeen = typeof window !== "undefined" && sessionStorage.getItem("bk_intro_seen");
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (alreadySeen || prefersReduced) {
      onFinish?.();
      return;
    }

    // Pehli baar aane par animation show karein aur flag set karein
    setVisible(true);
    sessionStorage.setItem("bk_intro_seen", "1");

    const timeout = window.setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [onFinish]);

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
