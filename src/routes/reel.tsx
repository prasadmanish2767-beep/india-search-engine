// src/routes/reel.tsx
import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { brandImageMeta } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Play, Video, CheckCircle2, RotateCcw, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";

const description = "Download official 18-second launch and discovery Reel video of BharatKhoj — India's First Search Engine.";

export const Route = createFileRoute("/reel")({
  head: () => ({
    meta: [
      ...brandImageMeta,
      { title: "Official Reel Maker — BharatKhoj" },
      { name: "description", content: description },
      { property: "og:title", content: "Official Reel Maker — BharatKhoj" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/reel" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/reel" }],
  }),
  component: BharatKhojReelPage,
});

function BharatKhojReelPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const DURATION_SEC = 18; // Exact Reels duration
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Preload Brand Assets for crisp canvas render
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const iconImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const logo = new Image();
    logo.src = "/bharatkhoj-logo.png";
    logo.onload = () => { logoImgRef.current = logo; };

    const icon = new Image();
    icon.src = "/bharatkhoj-icon.png";
    icon.onload = () => { iconImgRef.current = icon; };
  }, []);

  // Draw 1 Frame of 18s BharatKhoj Discovery Video
  const drawFrame = (ctx: CanvasRenderingContext2D, time: number) => {
    const W = 1080;
    const H = 1920;

    // Background: Clean white with Tiranga (Saffron & Green) ambient glow
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    const saffronAura = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 750);
    saffronAura.addColorStop(0, "rgba(255, 107, 0, 0.14)");
    saffronAura.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = saffronAura;
    ctx.fillRect(0, 0, W, 750);

    const greenAura = ctx.createRadialGradient(W / 2, H, 50, W / 2, H, 750);
    greenAura.addColorStop(0, "rgba(22, 138, 69, 0.12)");
    greenAura.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = greenAura;
    ctx.fillRect(0, H - 750, W, 750);

    // Persistent Top Official Pill
    ctx.save();
    ctx.fillStyle = "#F8FAFC";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 270, 80, 540, 72, 36);
    ctx.fill();
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#FF6B00";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BharatKhoj 🇮🇳", W / 2 - 90, 128);

    ctx.fillStyle = "#168A45";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("India's First Search Engine", W / 2 + 120, 128);
    ctx.restore();

    // ====================================================
    // SCENE 1: 0.0s - 3.8s (Grand Reveal & Slogan Hook)
    // ====================================================
    if (time < 3.8) {
      ctx.save();
      const pulse = Math.sin(time * 5) * 12;

      // Pulsing Triple Tiranga Halo
      ctx.beginPath();
      ctx.arc(W / 2, 800, 180 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 107, 0, 0.25)";
      ctx.lineWidth = 14;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, 800, 220 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(22, 138, 69, 0.2)";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Main Logo Icon
      if (iconImgRef.current && iconImgRef.current.complete) {
        ctx.drawImage(iconImgRef.current, W / 2 - 130, 670, 260, 260);
      } else {
        ctx.fillStyle = "#FF6B00";
        ctx.beginPath();
        ctx.arc(W / 2, 800, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 100px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🇮🇳", W / 2, 835);
      }

      // Main Brand Name
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 82px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BharatKhoj", W / 2, 1100);

      // Slogan
      ctx.fillStyle = "#FF6B00";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("India's First Search Engine", W / 2, 1170);

      // National Pride Badge
      ctx.fillStyle = "#FFF7ED";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 320, 1240, 640, 80, 40);
      ctx.fill();
      ctx.strokeStyle = "#FDBA74";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#C2410C";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("✨ 100% Swadeshi • Independent • Free", W / 2, 1292);

      ctx.restore();
    }

    // ========================================================
    // SCENE 2: 3.8s - 7.5s (Homepage & Smooth Typing Search)
    // ========================================================
    else if (time < 7.5) {
      const typeTime = time - 3.8;
      const fullQuery = "BharatKhoj Search";
      const chars = Math.min(
        Math.floor((typeTime / 2.2) * fullQuery.length),
        fullQuery.length
      );
      const typed = fullQuery.slice(0, chars);

      ctx.save();
      // Center Logo Header
      if (logoImgRef.current && logoImgRef.current.complete) {
        ctx.drawImage(logoImgRef.current, W / 2 - 250, 520, 500, 140);
      } else {
        ctx.fillStyle = "#0F172A";
        ctx.font = "bold 64px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BharatKhoj", W / 2, 600);
      }

      ctx.fillStyle = "#64748B";
      ctx.font = "500 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Desh Ka Apna Search Engine", W / 2, 700);

      // Clean Modern Search Bar
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(37, 99, 235, 0.2)";
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.roundRect(80, 780, W - 160, 120, 60);
      ctx.fill();
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Typed Text with Saffron Blinking Cursor
      ctx.fillStyle = "#0F172A";
      ctx.font = "600 44px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(typed, 160, 855);

      const tw = ctx.measureText(typed).width;
      if (Math.floor(time * 3) % 2 === 0) {
        ctx.fillStyle = "#FF6B00";
        ctx.fillRect(166 + tw, 810, 4, 55);
      }

      // Search Action Button
      ctx.fillStyle = typeTime > 2.2 ? "#FF6B00" : "#2563EB";
      ctx.beginPath();
      ctx.roundRect(W - 250, 795, 150, 90, 45);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Khoj", W - 175, 852);

      // Feature Highlights row below search bar
      ctx.fillStyle = "#168A45";
      ctx.font = "600 28px sans-serif";
      ctx.fillText("⚡ Real Answers  •  🚫 No Ad Tracking  •  🌐 11 Languages", W / 2, 970);

      ctx.restore();
    }

    // ==========================================================
    // SCENE 3: 7.5s - 14.2s (Grounded Discovery Answer Bento)
    // ==========================================================
    else if (time < 14.2) {
      const cardY = 340;
      ctx.save();

      // Top Filter Chip
      ctx.fillStyle = "#EFF6FF";
      ctx.beginPath();
      ctx.roundRect(80, 230, W - 160, 80, 20);
      ctx.fill();
      ctx.strokeStyle = "#BFDBFE";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#1E40AF";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("🔍 Discover: BharatKhoj Knowledge Card", 110, 282);

      // Main Verified Card
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(15, 23, 42, 0.1)";
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.roundRect(70, cardY, W - 140, 960, 36);
      ctx.fill();
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Swadeshi Verified Badge
      ctx.fillStyle = "#DCFCE7";
      ctx.beginPath();
      ctx.roundRect(110, cardY + 40, 400, 52, 26);
      ctx.fill();
      ctx.fillStyle = "#166534";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("🇮🇳 Official National Discovery", 135, cardY + 76);

      // Title & Subtitle
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("BharatKhoj — Search Engine", 110, cardY + 145);

      ctx.fillStyle = "#64748B";
      ctx.font = "500 28px sans-serif";
      ctx.fillText("Created by Prem Prasad • Made for 1.4B Indians", 110, cardY + 190);

      // Featured Banner (Flag Colors Ambient)
      const bannerY = cardY + 235;
      const bGrad = ctx.createLinearGradient(110, bannerY, W - 110, bannerY + 260);
      bGrad.addColorStop(0, "#FF6B00");
      bGrad.addColorStop(0.5, "#FFFFFF");
      bGrad.addColorStop(1, "#168A45");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(110, bannerY, W - 220, 260, 24);
      ctx.fill();

      // Banner Inner Content
      ctx.fillStyle = "#0F172A";
      ctx.beginPath();
      ctx.roundRect(114, bannerY + 4, W - 228, 252, 20);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("India's Own Web Index 🌐", W / 2, bannerY + 110);

      ctx.fillStyle = "#CBD5E1";
      ctx.font = "500 28px sans-serif";
      ctx.fillText("Direct answers • Zero sponsored clutter", W / 2, bannerY + 170);

      // 3 Grounded Facts with Light-Blue Highlight
      const facts = [
        "⚡ Direct Grounded Answers — No paid ads or fake listings",
        "🌐 India's 11 Languages live — Hindi, Tamil, Telugu, etc.",
        "🔒 100% Free & Private — Fast, secure, open search for all"
      ];

      ctx.textAlign = "left";
      facts.forEach((fact, idx) => {
        const fy = bannerY + 295 + idx * 115;

        // Light-Blue Card
        ctx.fillStyle = "#F0F9FF";
        ctx.beginPath();
        ctx.roundRect(110, fy, W - 220, 92, 20);
        ctx.fill();
        ctx.strokeStyle = "#BAE6FD";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Blue Accent Bar
        ctx.fillStyle = "#0284C7";
        ctx.beginPath();
        ctx.roundRect(110, fy, 12, 92, 6);
        ctx.fill();

        // Fact Text
        ctx.fillStyle = "#0369A1";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(fact, 140, fy + 56);
      });

      // Bottom Trust Line
      ctx.fillStyle = "#168A45";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓ 100% Real Results • Websites open directly", W / 2, cardY + 920);

      ctx.restore();
    }

    // =========================================================
    // SCENE 4: 14.2s - 18.0s (National Call To Action & Outro)
    // =========================================================
    else {
      ctx.save();

      // Big Tiranga Badge
      ctx.fillStyle = "#FF6B00";
      ctx.beginPath();
      ctx.arc(W / 2, 680, 110, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 110px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🇮🇳", W / 2, 720);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 76px sans-serif";
      ctx.fillText("Switch To BharatKhoj", W / 2, 870);

      ctx.fillStyle = "#FF6B00";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText("India's First Search Engine", W / 2, 940);

      // Bullets
      ctx.fillStyle = "#475569";
      ctx.font = "500 32px sans-serif";
      ctx.fillText("Built with Pride by Prem Prasad for India", W / 2, 1025);

      // Huge Green CTA Button
      ctx.fillStyle = "#168A45";
      ctx.shadowColor = "rgba(22, 138, 69, 0.35)";
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 340, 1110, 680, 115, 58);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("Try BharatKhoj Now 🚀", W / 2, 1182);

      // Website URL
      ctx.fillStyle = "#0284C7";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText("india-search-engine.lovable.app", W / 2, 1310);

      ctx.fillStyle = "#64748B";
      ctx.font = "600 28px sans-serif";
      ctx.fillText("Share this with your friends and family!", W / 2, 1380);

      ctx.restore();
    }

    // Bottom Watermark
    ctx.fillStyle = "#94A3B8";
    ctx.font = "600 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BharatKhoj • India's First Search Engine • 100% Free", W / 2, H - 70);
  };

  // Live Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isPlaying) {
      startTimeRef.current = performance.now();
      const step = (now: number) => {
        const elapsed = (now - startTimeRef.current) / 1000;
        const currentSec = elapsed % DURATION_SEC;
        setProgress(Math.round((currentSec / DURATION_SEC) * 100));
        drawFrame(ctx, currentSec);
        animationFrameRef.current = requestAnimationFrame(step);
      };
      animationFrameRef.current = requestAnimationFrame(step);
    } else {
      drawFrame(ctx, 8.5); // Default Preview shows Discovery Bento
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // Record 18s and Export 1080x1920 MP4/WebM Video
  const handleRecordAndDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsRecording(true);
    setIsPlaying(false);
    setProgress(0);
    setDownloadUrl(null);

    const stream = canvas.captureStream(30);

    const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
      ? "video/mp4;codecs=avc1"
      : "video/webm;codecs=vp9";

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsRecording(false);
      setProgress(100);

      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const a = document.createElement("a");
      a.href = url;
      a.download = `BharatKhoj_Official_Reel_1080x1920.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    mediaRecorder.start();

    const totalFrames = DURATION_SEC * 30;
    let currentFrame = 0;

    const interval = setInterval(() => {
      currentFrame++;
      const currentTime = currentFrame / 30;
      setProgress(Math.round((currentTime / DURATION_SEC) * 100));
      drawFrame(ctx, currentTime);

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        mediaRecorder.stop();
      }
    }, 1000 / 30);
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <Button variant="outline" asChild size="sm">
          <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Search</Link>
        </Button>
        <span style={{ fontSize: "0.875rem", color: "#168A45", fontWeight: 700 }}>
          🇮🇳 Official BharatKhoj Reel Generator
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, color: "#0F172A", marginBottom: "0.4rem" }}>
          BharatKhoj 18s Discovery Reel Video
        </h1>
        <p style={{ color: "#64748B", fontSize: "1.05rem" }}>
          1080×1920 Full HD Instagram Reels & YouTube Shorts video for BharatKhoj.
        </p>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem", alignItems: "start" }}>
        {/* Left Card: Timeline Info & 1-Click Button */}
        <div style={{ background: "#F8FAFC", padding: "1.5rem", borderRadius: "1.25rem", border: "1px solid #E2E8F0" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.75rem", color: "#0F172A" }}>
            🎬 18-Second BharatKhoj Video Storyline
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
            <div style={{ padding: "0.75rem", background: "#FFFFFF", borderRadius: "0.6rem", border: "1px solid #E2E8F0" }}>
              <strong style={{ color: "#FF6B00" }}>0s – 3.8s: Grand Reveal Hook</strong>
              <div style={{ color: "#64748B", marginTop: "0.2rem" }}>
                3D Swadeshi Logo Animation + "India's First Search Engine" announcement.
              </div>
            </div>

            <div style={{ padding: "0.75rem", background: "#FFFFFF", borderRadius: "0.6rem", border: "1px solid #E2E8F0" }}>
              <strong style={{ color: "#2563EB" }}>3.8s – 7.5s: Search UI & Fast Typing</strong>
              <div style={{ color: "#64748B", marginTop: "0.2rem" }}>
                Homepage typing animation showing instant, ad-free search.
              </div>
            </div>

            <div style={{ padding: "0.75rem", background: "#FFFFFF", borderRadius: "0.6rem", border: "1px solid #E2E8F0" }}>
              <strong style={{ color: "#0284C7" }}>7.5s – 14.2s: Verified Discovery Card</strong>
              <div style={{ color: "#64748B", marginTop: "0.2rem" }}>
                3 Light-blue highlighted facts, Prem Prasad creation & 11 languages.
              </div>
            </div>

            <div style={{ padding: "0.75rem", background: "#FFFFFF", borderRadius: "0.6rem", border: "1px solid #E2E8F0" }}>
              <strong style={{ color: "#168A45" }}>14.2s – 18.0s: National Pride Outro</strong>
              <div style={{ color: "#64748B", marginTop: "0.2rem" }}>
                "Switch to BharatKhoj" call to action with website link.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Button
              size="lg"
              onClick={handleRecordAndDownload}
              disabled={isRecording}
              style={{
                backgroundColor: "#FF6B00",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "1.05rem",
                height: "3.4rem",
              }}
            >
              <Video className="mr-2 h-5 w-5" />
              {isRecording ? `Recording 1080×1920 Reel (${progress}%)...` : "🎬 Generate & Download Reel"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={isRecording}
              style={{ height: "3rem", fontWeight: 600 }}
            >
              {isPlaying ? <RotateCcw className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isPlaying ? "Stop Live Preview" : "▶️ Watch Live Preview"}
            </Button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download="BharatKhoj_Official_Reel_1080x1920.mp4"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.85rem",
                  background: "#DCFCE7",
                  border: "1px solid #86EFAC",
                  color: "#166534",
                  borderRadius: "0.5rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  marginTop: "0.5rem",
                }}
              >
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
                Download Ready! Click to Save Again
              </a>
            )}
          </div>
        </div>

        {/* Right Phone Mockup (360x640 preview of 1080x1920 canvas) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              width: "360px",
              height: "640px",
              borderRadius: "2.5rem",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
              border: "8px solid #0F172A",
              background: "#FFFFFF",
            }}
          >
            {/* Phone Notch */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "120px",
                height: "18px",
                backgroundColor: "#0F172A",
                borderRadius: "10px",
                zIndex: 10,
              }}
            />

            {/* High-Resolution Canvas */}
            <canvas
              ref={canvasRef}
              width={1080}
              height={1920}
              style={{ width: "100%", height: "100%", display: "block" }}
            />

            {/* Recording Overlay */}
            {isRecording && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(15, 23, 42, 0.78)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  zIndex: 20,
                  padding: "1.5rem",
                  textAlign: "center",
                }}
              >
                <Sparkles className="h-10 w-10 text-orange-400 mb-3 animate-pulse" />
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Recording BharatKhoj Reel...
                </h3>
                <div style={{ width: "80%", height: "10px", backgroundColor: "#334155", borderRadius: "5px", overflow: "hidden", margin: "1rem 0" }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      backgroundColor: "#FF6B00",
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>
                <p style={{ fontSize: "0.9rem", color: "#CBD5E1" }}>
                  {progress}% Complete (18 seconds HD)
                </p>
              </div>
            )}
          </div>

          <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#64748B", textAlign: "center" }}>
            Direct browser export • 1080×1920 Full HD (Instagram & Shorts Ready)
          </p>
        </div>
      </div>
    </div>
  );
}
