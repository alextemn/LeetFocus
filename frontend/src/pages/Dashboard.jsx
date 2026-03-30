import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProblemCard from "../components/ProblemCard";
import StreakBadge from "../components/StreakBadge";
import { useApi } from "../hooks/useApi";

const C = {
  void: "#0B0B0E", surface: "#101014", elevated: "#16161A",
  border: "#2A2A2E", steel: "#4A7A9B", steelMed: "#6B8AAE", steelTint: "rgba(74,122,155,0.1)",
  textPrimary: "#D4D3CF", textSecondary: "#8A8984", textMuted: "#4A4A46", solved: "#5CB879",
  warning: "#E5A773",
};
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

function Timer({ startSeconds }) {
  const [seconds, setSeconds] = useState(startSeconds);
  useEffect(() => { const i = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(i); }, []);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return <span>{h}:{m}:{s}</span>;
}

export default function Dashboard() {
  const api = useApi();
  const { user } = useUser();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [primary, setPrimary] = useState(null);
  const [punishment, setPunishment] = useState(null);
  const [isPunishmentDay, setIsPunishmentDay] = useState(false);
  const [dayFullySolved, setDayFullySolved] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(null);
  const [skipsRemaining, setSkipsRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [changing, setChanging] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);
  const timerStart = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, statusRes] = await Promise.all([
          api.get("/profile/"),
          api.get("/today/status/"),
        ]);
        setProfile(profileRes.data);
        const s = statusRes.data;
        setPrimary(s.primary);
        setPunishment(s.punishment);
        setIsPunishmentDay(s.is_punishment_day);
        setDayFullySolved(s.day_fully_solved);
        setCurrentStreak(s.current_streak);
        setSkipsRemaining(s.skips_remaining);
        if (s.primary?.solved_at) {
          const solvedAt = new Date(s.primary.solved_at).getTime();
          timerStart.current = Math.floor((Date.now() - solvedAt) / 1000);
        }
      } catch (e) {
        setError(e?.response?.data?.error ?? "Failed to load. Try refreshing.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleChange() {
    setChanging(true);
    setError(null);
    try {
      const res = await api.post("/today/change/");
      setPrimary(res.data);
      timerStart.current = 0;
    } catch (e) {
      setError(e?.response?.data?.error ?? "Could not change problem.");
    } finally {
      setChanging(false);
    }
  }

  async function handleVerify(problemId = null) {
    setVerifying(true);
    try {
      const body = problemId ? { problem_id: problemId } : {};
      const res = await api.post("/today/verify/", body);
      const updated = res.data;
      if (updated.is_punishment) {
        setPunishment(updated);
      } else {
        setPrimary(updated);
      }
      // Refresh status to update day_fully_solved / streak
      const statusRes = await api.get("/today/status/");
      const s = statusRes.data;
      setDayFullySolved(s.day_fully_solved);
      setCurrentStreak(s.current_streak);
    } catch (e) {
      setError(e?.response?.data?.error ?? "Could not mark as solved.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleAssign() {
    setAssigning(true);
    setError(null);
    try {
      await api.post("/today/assign/");
      const statusRes = await api.get("/today/status/");
      const s = statusRes.data;
      setPrimary(s.primary);
      setPunishment(s.punishment);
      setIsPunishmentDay(s.is_punishment_day);
      setDayFullySolved(s.day_fully_solved);
      setCurrentStreak(s.current_streak);
      setSkipsRemaining(s.skips_remaining);
    } catch (e) {
      setError(e?.response?.data?.error ?? "Could not assign problem.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleSkip() {
    setSkipping(true);
    setError(null);
    try {
      const res = await api.post("/today/skip/");
      setPrimary(res.data.primary);
      setSkipsRemaining(res.data.skips_remaining);
      setDayFullySolved(true);
      if (punishment) setPunishment({ ...punishment, solved: true, skipped: true });
    } catch (e) {
      setError(e?.response?.data?.error ?? "Could not skip day.");
    } finally {
      setSkipping(false);
    }
  }

  const initials =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    "?";

  const isPro = profile?.is_premium ?? false;
  const canSkip = isPro && skipsRemaining > 0 && !dayFullySolved;

  if (loading) {
    return (
      <div style={{ background: C.void, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>loading...</span>
      </div>
    );
  }

  return (
    <div style={{ background: C.void, minHeight: "100vh", color: C.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        button:hover { opacity: 0.88; }
      `}</style>

      <div style={{ padding: "32px 28px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 3, color: C.textMuted }}>leetfocus</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StreakBadge profile={profile} streak={currentStreak} />
            <button
              onClick={() => navigate("/settings")}
              style={{ width: 28, height: 28, borderRadius: 4, background: C.elevated, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.textSecondary, fontFamily: MONO, border: "none", cursor: "pointer" }}
            >
              {initials}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: "#E57373", marginBottom: 20, padding: "10px 14px", background: "rgba(229,115,115,0.08)", borderRadius: 4, border: "0.5px solid rgba(229,115,115,0.2)" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 10, textTransform: "uppercase" }}>today</div>

          {isPunishmentDay && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.warning, marginBottom: 10, padding: "8px 12px", background: "rgba(229,167,115,0.08)", borderRadius: 4, border: "0.5px solid rgba(229,167,115,0.2)" }}>
              missed yesterday — solve both to unlock
            </div>
          )}

          {primary ? (
            <>
              <ProblemCard problem={primary} onVerify={() => handleVerify(null)} verifying={verifying} />

              {isPunishmentDay && punishment && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 8, textTransform: "uppercase" }}>punishment</div>
                  <ProblemCard problem={punishment} onVerify={() => handleVerify(punishment.id)} verifying={verifying} />
                </div>
              )}

              {!primary.solved && !isPunishmentDay && (
                <button
                  onClick={handleChange}
                  disabled={changing}
                  style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, color: C.textMuted, background: "none", border: "none", cursor: changing ? "default" : "pointer", textDecoration: "underline", padding: 0, opacity: changing ? 0.5 : 1 }}
                >
                  {changing ? "changing..." : "change problem"}
                </button>
              )}

              {canSkip && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={handleSkip}
                    disabled={skipping}
                    style={{ fontFamily: MONO, fontSize: 10, color: C.steel, background: "none", border: `0.5px solid ${C.steel}`, borderRadius: 4, padding: "6px 12px", cursor: skipping ? "default" : "pointer", opacity: skipping ? 0.5 : 1 }}
                  >
                    {skipping ? "skipping..." : "skip day"}
                  </button>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>
                    {skipsRemaining} skip{skipsRemaining !== 1 ? "s" : ""} left this month
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ background: C.elevated, borderRadius: 6, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.textSecondary }}>
                no problem assigned — your browser is unlocked
              </div>
              <button
                onClick={handleAssign}
                disabled={assigning}
                style={{ alignSelf: "flex-start", fontFamily: MONO, fontSize: 11, color: C.void, background: C.steel, border: "none", borderRadius: 4, padding: "8px 16px", cursor: assigning ? "default" : "pointer", opacity: assigning ? 0.6 : 1 }}
              >
                {assigning ? "assigning..." : "assign problem"}
              </button>
            </div>
          )}
        </div>

        {primary && !dayFullySolved && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.textMuted, marginBottom: 10, textTransform: "uppercase" }}>time elapsed</div>
            <div style={{ background: C.surface, borderRadius: 6, padding: "14px 18px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.steel, display: "inline-block", animation: "pulse 2.5s infinite" }} />
              <span style={{ fontFamily: MONO, fontSize: 20, color: C.textPrimary, letterSpacing: 2 }}>
                <Timer startSeconds={timerStart.current} />
              </span>
            </div>
          </div>
        )}

        {dayFullySolved && (
          <div style={{ marginBottom: 32, background: "rgba(92,184,121,0.06)", borderRadius: 6, padding: "14px 18px", border: "0.5px solid rgba(92,184,121,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.solved, display: "inline-block" }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.solved }}>solved — browser unlocked</span>
          </div>
        )}

        {profile && (
          <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>
              difficulty: <span style={{ color: C.steelMed }}>{profile.difficulty_preference}</span>
            </div>
            <button
              onClick={() => navigate("/settings")}
              style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
