const MONO = "'IBM Plex Mono', 'SF Mono', monospace";

export default function StreakBadge({ profile, streak }) {
  if (!profile) return null;

  if (streak !== null && streak !== undefined) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 11, color: "#4A7A9B" }}>
        {streak} day{streak !== 1 ? "s" : ""} streak
      </div>
    );
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div style={{ fontFamily: MONO, fontSize: 11, color: "#4A4A46" }}>
      {daysSince} day{daysSince !== 1 ? "s" : ""} in
    </div>
  );
}
