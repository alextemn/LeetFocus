import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  void: "#0B0B0E", surface: "#101014", elevated: "#16161A", hover: "#1E1E22",
  border: "#2A2A2E", steel: "#4A7A9B", steelMed: "#6B8AAE", steelLight: "#8FACC4",
  textPrimary: "#D4D3CF", textSecondary: "#8A8984", textMuted: "#4A4A46", solved: "#5CB879",
};
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";
const SANS = "'IBM Plex Sans', -apple-system, sans-serif";

function DotGrid() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const spacing = 40;
    const baseRadius = 0.6;
    const glowRadius = 120;
    let w = 0, h = 0, cols = 0, rows = 0;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = document.documentElement.scrollHeight;
      cols = Math.ceil(w / spacing);
      rows = Math.ceil(h / spacing);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const mx = mouse.current.x;
      const my = mouse.current.y + window.scrollY;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * spacing + spacing / 2;
          const y = r * spacing + spacing / 2;
          const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
          const t = Math.max(0, 1 - dist / glowRadius);
          const radius = baseRadius + t * 1.8;
          const alpha = 0.08 + t * 0.45;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.round(74 + t * 67)},${Math.round(74 + t * 96)},${Math.round(74 + t * 122)},${alpha})`;
          ctx.fill();
        }
      }
      raf.current = requestAnimationFrame(draw);
    }
    draw();

    const handleMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.7s cubic-bezier(.22,.61,.36,1) ${delay}s, transform 0.7s cubic-bezier(.22,.61,.36,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

function LiveTimer() {
  const [s, setS] = useState(547);
  useEffect(() => { const i = setInterval(() => setS((v) => v + 1), 1000); return () => clearInterval(i); }, []);
  return <span>{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>;
}

function Nav({ onSignIn }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: scrolled ? "rgba(11,11,14,0.92)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? `0.5px solid ${C.border}` : "0.5px solid transparent", transition: "all 0.3s ease" }}>
      <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 3, color: C.textMuted }}>leetfocus</div>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <a href="#how" style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, textDecoration: "none" }}>how it works</a>
        <a href="#pricing" style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, textDecoration: "none" }}>pricing</a>
        <a href="/sign-in" style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, textDecoration: "none" }}>sign in</a>
        <button onClick={onSignIn} style={{ background: C.steel, color: C.void, border: "none", borderRadius: 4, padding: "7px 18px", fontFamily: MONO, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
          Start free trial
        </button>
      </div>
    </nav>
  );
}

function Hero({ onSignIn }) {
  return (
    <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 32px 80px", textAlign: "center", position: "relative", zIndex: 2 }}>
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: "min(700px, 90vw)", height: 500, background: "radial-gradient(ellipse at center, rgba(74,122,155,0.06) 0%, transparent 65%)", pointerEvents: "none", zIndex: -1 }} />
      <FadeIn>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3, color: C.textMuted, textTransform: "uppercase", marginBottom: 28, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.steel, display: "inline-block", animation: "pulse 2.5s infinite" }} />
          your browser is locked
        </div>
      </FadeIn>
      <FadeIn delay={0.1}>
        <h1 style={{ fontFamily: SANS, fontSize: "clamp(36px, 5.5vw, 64px)", fontWeight: 500, color: C.textPrimary, lineHeight: 1.1, maxWidth: 680, marginBottom: 20, letterSpacing: "-0.02em" }}>
          Solve the problem.<br />
          <span style={{ color: C.textMuted }}>Then you can browse.</span>
        </h1>
      </FadeIn>
      <FadeIn delay={0.2}>
        <p style={{ fontFamily: SANS, fontSize: 16, color: C.textSecondary, maxWidth: 440, lineHeight: 1.6, marginBottom: 36 }}>
          A Chrome extension that locks your entire browser until you solve today's LeetCode problem. No workarounds. No snooze button.
        </p>
      </FadeIn>
      <FadeIn delay={0.3}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 52 }}>
          <button onClick={onSignIn} style={{ background: C.steel, color: C.void, border: "none", borderRadius: 4, padding: "11px 28px", fontFamily: MONO, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            Start free trial →
          </button>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>7 days free, then $10/mo</span>
        </div>
      </FadeIn>
      <FadeIn delay={0.4}>
        <div style={{ background: `linear-gradient(170deg, ${C.surface} 0%, ${C.void} 100%)`, border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "22px 26px", maxWidth: 400, width: "100%", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
              <rect x="6" y="14" width="20" height="14" rx="3" stroke={C.steel} strokeWidth="2" />
              <path d="M11 14V10a5 5 0 0 1 10 0v4" stroke={C.steel} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>locked · <LiveTimer /></span>
          </div>
          <div style={{ background: C.elevated, borderRadius: 5, padding: "14px 16px", borderLeft: `2px solid ${C.steel}` }}>
            <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, color: C.textPrimary, marginBottom: 3 }}>3. Longest Substring Without Repeating Characters</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>medium · sliding window</div>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            {["youtube.com", "twitter.com", "reddit.com"].map((site) => (
              <div key={site} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderRadius: 3, background: "rgba(74,122,155,0.04)" }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.border }}>{site}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.steel, opacity: 0.5 }}>→ redirected</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: "01", title: "Create an account", desc: "Sign up and start your 7-day free trial. No charge until the trial ends — cancel anytime." },
    { num: "02", title: "Install the extension", desc: "Add LeetFocus to Chrome. Every morning, one problem is assigned based on your difficulty." },
    { num: "03", title: "Try to go anywhere else", desc: "YouTube, Twitter, Reddit — every tab redirects to your problem. There's no override." },
    { num: "04", title: "Solve it. Get your browser back.", desc: "Submit a passing solution on LeetCode. The lock lifts instantly. That's it." },
  ];
  return (
    <section id="how" style={{ padding: "100px 32px", maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 2 }}>
      <FadeIn><div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: C.textMuted, textTransform: "uppercase", marginBottom: 32 }}>how it works</div></FadeIn>
      {steps.map((step, i) => (
        <FadeIn key={i} delay={i * 0.08}>
          <div style={{ display: "flex", gap: 20, padding: "24px 0", borderTop: i === 0 ? `0.5px solid ${C.border}` : "none", borderBottom: `0.5px solid ${C.border}` }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.steel, minWidth: 24, paddingTop: 2 }}>{step.num}</div>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: C.textPrimary, marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>{step.desc}</div>
            </div>
          </div>
        </FadeIn>
      ))}
    </section>
  );
}

function Pricing({ onSignIn }) {
  return (
    <section id="pricing" style={{ padding: "80px 32px", maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 2 }}>
      <FadeIn><div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: C.textMuted, textTransform: "uppercase", marginBottom: 32 }}>pricing</div></FadeIn>
      <FadeIn delay={0.08}>
        <div style={{ background: C.surface, borderRadius: 6, padding: "28px 28px", border: `0.5px solid ${C.steel}`, position: "relative", overflow: "hidden", maxWidth: 400 }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C.steel}, transparent)` }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
            <span style={{ fontFamily: SANS, fontSize: 28, fontWeight: 500, color: C.textPrimary }}>$10</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>/mo</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.solved, marginBottom: 20 }}>7-day free trial — cancel anytime</div>
          {[
            "Daily problem assigned at midnight",
            "Browser locked until it's solved",
            "All difficulty levels including Hard",
            "Adaptive problem selection",
            "Streak tracking & analytics",
            "Topic filters",
            "3 skips per month",
          ].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: C.steel }} />
              <span style={{ fontFamily: SANS, fontSize: 12, color: C.textSecondary }}>{f}</span>
            </div>
          ))}
          <button onClick={onSignIn} style={{ width: "100%", marginTop: 20, background: C.steel, color: C.void, border: "none", borderRadius: 4, padding: "10px 0", fontFamily: MONO, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
            start free trial →
          </button>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, textAlign: "center", marginTop: 10 }}>
            no charge for 7 days · then $10/month
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const openSignIn = () => navigate("/sign-in");
  const openSignUp = () => navigate("/sign-up");

  return (
    <div style={{ background: C.void, minHeight: "100vh", color: C.textPrimary, overflowX: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        button { transition: opacity 0.15s, transform 0.15s; }
        button:hover { opacity: 0.88; transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        a:hover { color: ${C.steelMed} !important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <DotGrid />
      </div>

      <Nav onSignIn={openSignUp} />
      <Hero onSignIn={openSignUp} />
      <HowItWorks />
      <Pricing onSignIn={openSignUp} />

      <footer style={{ padding: "24px 32px", borderTop: `0.5px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, letterSpacing: 1 }}>leetfocus</div>
        <div style={{ display: "flex", gap: 20 }}>
          {["privacy", "terms", "support"].map((l) => (
            <a key={l} href="#" style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
