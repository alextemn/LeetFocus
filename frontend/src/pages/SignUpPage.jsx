import { SignUp } from "@clerk/clerk-react";

const clerkAppearance = {
  variables: {
    colorPrimary: "#4A7A9B",
    colorBackground: "#101014",
    colorText: "#D4D3CF",
    colorTextSecondary: "#8A8984",
    colorInputBackground: "#16161A",
    colorInputText: "#D4D3CF",
    colorNeutral: "#4A4A46",
    borderRadius: "4px",
    fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
    fontSize: "13px",
  },
  elements: {
    card: {
      background: "#101014",
      border: "0.5px solid #2A2A2E",
      boxShadow: "none",
    },
    headerTitle: { color: "#D4D3CF", fontWeight: 500 },
    headerSubtitle: { color: "#8A8984" },
    socialButtonsBlockButton: {
      background: "#16161A",
      border: "0.5px solid #2A2A2E",
      color: "#D4D3CF",
    },
    dividerLine: { background: "#2A2A2E" },
    dividerText: { color: "#4A4A46" },
    formFieldInput: {
      background: "#16161A",
      border: "0.5px solid #2A2A2E",
      color: "#D4D3CF",
    },
    formButtonPrimary: {
      background: "#4A7A9B",
      color: "#0B0B0E",
      fontWeight: 500,
    },
    footerActionLink: { color: "#6B8AAE" },
  },
};

export default function SignUpPage() {
  return (
    <div style={{
      background: "#0B0B0E",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: 3, color: "#4A4A46", marginBottom: 32 }}>
        leetfocus
      </div>

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </div>
  );
}
