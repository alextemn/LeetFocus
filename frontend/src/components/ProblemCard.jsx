const C = {
  void: "#0B0B0E", elevated: "#16161A", steel: "#4A7A9B",
  steelMed: "#6B8AAE", steelTint: "rgba(74,122,155,0.1)",
  textPrimary: "#D4D3CF", textMuted: "#4A4A46", solved: "#5CB879",
};
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";
const SANS = "'IBM Plex Sans', -apple-system, sans-serif";

const DIFFICULTY_COLOR = {
  easy: "#5CB879",
  medium: C.steelMed,
  hard: "#E57373",
};

export default function ProblemCard({ problem, onVerify, verifying }) {
  return (
    <div style={{ background: C.elevated, borderRadius: 6, padding: "18px 20px", borderLeft: `2px solid ${problem.solved ? C.solved : C.steel}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, padding: "2px 8px", borderRadius: 3, background: C.steelTint, color: DIFFICULTY_COLOR[problem.problem_difficulty] ?? C.steelMed, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {problem.problem_difficulty}
        </span>
        {problem.solved && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.solved }}>✓ solved</span>
        )}
      </div>

      <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 500, color: C.textPrimary, marginBottom: 4 }}>
        {problem.problem_title}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted, marginBottom: 14 }}>
        {problem.assigned_date}
      </div>

      <a
        href={problem.problem_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ background: C.steel, color: C.void, borderRadius: 4, padding: "7px 16px", fontFamily: MONO, fontSize: 11, fontWeight: 500, cursor: "pointer", textDecoration: "none", display: "inline-block" }}
      >
        Open on LeetCode
      </a>
    </div>
  );
}
