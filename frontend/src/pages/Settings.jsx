import { useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const C = {
  void: "#0B0B0E", surface: "#101014", elevated: "#16161A",
  border: "#2A2A2E", steel: "#4A7A9B", steelMed: "#6B8AAE", steelTint: "rgba(74,122,155,0.1)",
  textPrimary: "#D4D3CF", textSecondary: "#8A8984", textMuted: "#4A4A46", solved: "#5CB879",
};
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";
const SANS = "'IBM Plex Sans', -apple-system, sans-serif";

const DIFFICULTIES = ["easy", "medium", "hard"];

const TOPIC_TAGS = [
  "Array", "String", "Hash Table", "Dynamic Programming", "Math",
  "Sorting", "Greedy", "Depth-First Search", "Binary Search", "Tree",
  "Breadth-First Search", "Matrix", "Bit Manipulation", "Two Pointers",
  "Stack", "Heap", "Graph", "Backtracking", "Sliding Window", "Linked List",
  "Recursion", "Queue", "Divide and Conquer", "Trie", "Binary Search Tree",
];

export default function Settings() {
  const api = useApi();
  const { signOut } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [selected, setSelected] = useState("medium");
  const [topicPrefs, setTopicPrefs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Stripe state
  const [upgradedBanner, setUpgradedBanner] = useState(false);
  const [activatingPro, setActivatingPro] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justUpgraded = params.get("upgraded") === "true";
    const sessionId = params.get("session_id");

    if (justUpgraded) {
      setUpgradedBanner(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    async function loadProfile() {
      const res = await api.get("/profile/");
      setProfile(res.data);
      setSelected(res.data.difficulty_preference);
      setTopicPrefs(res.data.topic_preferences ?? []);
      return res.data;
    }

    async function init() {
      try {
        if (justUpgraded && sessionId) {
          setActivatingPro(true);
          await api.post("/stripe/verify-session/", { session_id: sessionId });
          await loadProfile();
          setActivatingPro(false);
        } else if (justUpgraded) {
          // Fallback: poll until webhook fires (up to 30s)
          setActivatingPro(true);
          let data = await loadProfile();
          let attempts = 0;
          while (!data.is_premium && attempts < 30) {
            await new Promise((r) => setTimeout(r, 1000));
            data = await loadProfile();
            attempts++;
          }
          setActivatingPro(false);
        } else {
          await loadProfile();
        }
      } catch {
        setError("Failed to load profile.");
        setActivatingPro(false);
      }
    }

    init();
  }, []);

  function toggleTopic(tag) {
    setTopicPrefs((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await api.patch("/profile/", {
        difficulty_preference: selected,
        topic_preferences: topicPrefs,
      });
      setProfile(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpgrade() {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await api.post("/stripe/checkout/");
      const checkoutUrl = res.data.checkout_url;
      console.log("Stripe checkout URL:", checkoutUrl);
      window.location.href = checkoutUrl;
    } catch (e) {
      console.error("Stripe checkout error:", e);
      setError("Could not start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await api.post("/stripe/portal/");
      window.location.href = res.data.portal_url;
    } catch (e) {
      console.error("Stripe portal error:", e);
      setError("Could not open billing portal. Please try again.");
      setPortalLoading(false);
    }
  }

  const isPro = profile?.is_premium ?? false;
  const difficultyChanged = selected !== profile?.difficulty_preference;
  const topicsChanged = JSON.stringify(topicPrefs.sort()) !== JSON.stringify([...(profile?.topic_preferences ?? [])].sort());
  const hasChanges = difficultyChanged || topicsChanged;

  return (
    <div style={{ background: C.void, minHeight: "100vh", color: C.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        button:hover { opacity: 0.88; }
        input:focus { outline: none; border-color: #4A7A9B !important; }
      `}</style>

      <div style={{ padding: "32px 28px", maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, background: "none", border: "none", cursor: "pointer" }}
          >
            ← dashboard
          </button>
          <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 3, color: C.textMuted }}>settings</div>
        </div>

        {/* Banners */}
        {activatingPro && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, marginBottom: 20, padding: "10px 14px", background: C.surface, borderRadius: 4, border: `0.5px solid ${C.border}` }}>
            activating pro...
          </div>
        )}
        {upgradedBanner && !activatingPro && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.solved, marginBottom: 20, padding: "10px 14px", background: "rgba(92,184,121,0.08)", borderRadius: 4, border: "0.5px solid rgba(92,184,121,0.2)" }}>
            welcome to pro — all features unlocked ✓
          </div>
        )}
        {error && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#E57373", marginBottom: 20, padding: "10px 14px", background: "rgba(229,115,115,0.08)", borderRadius: 4 }}>
            {error}
          </div>
        )}

        {/* Account */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 12, textTransform: "uppercase" }}>account</div>
          <div style={{ background: C.surface, borderRadius: 6, padding: "16px 18px", border: `0.5px solid ${C.border}` }}>
            <div style={{ fontFamily: SANS, fontSize: 13, color: C.textSecondary, marginBottom: 4 }}>
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>
              member since {profile ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div style={{ marginBottom: 32 }}>
          {isPro ? (
            <>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 12, textTransform: "uppercase" }}>subscription</div>
              <div style={{ background: C.surface, borderRadius: 6, padding: "16px 18px", border: `0.5px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 12, color: C.solved, marginBottom: 4 }}>pro — active</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>
                    all difficulties · adaptive selection · streak tracking · topic filters · 3 skips/month
                  </div>
                </div>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  style={{ fontFamily: MONO, fontSize: 10, color: C.steel, background: "none", border: `0.5px solid ${C.steel}`, borderRadius: 4, padding: "6px 12px", cursor: portalLoading ? "default" : "pointer", opacity: portalLoading ? 0.5 : 1, whiteSpace: "nowrap", marginLeft: 16 }}
                >
                  {portalLoading ? "loading..." : "manage"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 12, textTransform: "uppercase" }}>7-day free trial — then $10/mo</div>
              <div style={{ background: C.surface, borderRadius: 6, padding: "16px 18px", border: `0.5px solid ${C.border}` }}>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary, marginBottom: 12, lineHeight: 1.6 }}>
                  all difficulties · adaptive selection · streak tracking · topic filters · 3 skips/month
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  style={{ fontFamily: MONO, fontSize: 11, color: C.void, background: C.steel, border: "none", borderRadius: 4, padding: "8px 16px", cursor: checkoutLoading ? "default" : "pointer", opacity: checkoutLoading ? 0.5 : 1 }}
                >
                  {checkoutLoading ? "loading..." : "upgrade →"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 12, textTransform: "uppercase" }}>daily difficulty</div>
          <div style={{ display: "flex", gap: 8 }}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setSelected(d)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 4,
                  border: selected === d ? `1px solid ${C.steel}` : `0.5px solid ${C.border}`,
                  background: selected === d ? C.steelTint : C.surface,
                  color: selected === d ? C.steelMed : C.textMuted,
                  fontFamily: MONO, fontSize: 11, cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, marginTop: 8 }}>
            problems will be selected from the <span style={{ color: C.steelMed }}>{selected}</span> pool
          </div>
        </div>

        {/* Topic filters — Pro only */}
        {isPro && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 12, textTransform: "uppercase" }}>topic filters</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TOPIC_TAGS.map((tag) => {
                const active = topicPrefs.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTopic(tag)}
                    style={{
                      fontFamily: MONO, fontSize: 10, padding: "4px 10px", borderRadius: 4,
                      border: active ? `1px solid ${C.steel}` : `0.5px solid ${C.border}`,
                      background: active ? C.steelTint : C.surface,
                      color: active ? C.steelMed : C.textMuted,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, marginTop: 8 }}>
              {topicPrefs.length === 0
                ? "no filter — all topics eligible"
                : `${topicPrefs.length} topic${topicPrefs.length !== 1 ? "s" : ""} selected`}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 4,
            background: saved ? "rgba(92,184,121,0.15)" : C.steel,
            color: saved ? C.solved : C.void,
            border: saved ? "0.5px solid rgba(92,184,121,0.3)" : "none",
            fontFamily: MONO, fontSize: 11, fontWeight: 500,
            cursor: saving ? "default" : "pointer",
            opacity: (saving || !hasChanges) && !saved ? 0.5 : 1,
          }}
        >
          {saved ? "saved ✓" : saving ? "saving..." : "save changes"}
        </button>

        {/* Sign out */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `0.5px solid ${C.border}` }}>
          <button
            onClick={() => signOut(() => navigate("/"))}
            style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            sign out
          </button>
        </div>

      </div>
    </div>
  );
}
