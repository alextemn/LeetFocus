import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useApi } from "./hooks/useApi";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Settings from "./pages/Settings";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";

// Sends the Clerk token to the Chrome extension via postMessage.
// The extension's content script listens for this event — it's instant and
// works across SPA navigation since it fires on every auth state change.
function ExtensionBridge() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function postToken() {
      const token = await getToken();
      if (token) {
        window.postMessage({ type: "__LEETFOCUS_TOKEN__", token }, "*");
      }
    }

    postToken();
    const id = setInterval(postToken, 50_000);

    function onVisible() {
      if (document.visibilityState === "visible") postToken();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isLoaded, isSignedIn]);

  return null;
}

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

function SyncUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const api = useApi();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    api.post("/auth/sync/", { email }).catch(() => {
      // Profile may already exist — safe to ignore
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}

export default function App() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  return (
    <>
      <SyncUser />
      <ExtensionBridge />
      <Routes>
        <Route
          path="/"
          element={isSignedIn ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        <Route
          path="/sign-in/*"
          element={isSignedIn ? <Navigate to="/dashboard" replace /> : <SignInPage />}
        />
        <Route
          path="/sign-up/*"
          element={isSignedIn ? <Navigate to="/dashboard" replace /> : <SignUpPage />}
        />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
