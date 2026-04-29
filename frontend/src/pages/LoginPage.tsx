import { useMutation } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi, meApi, signupApi } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";

type AuthMode = "login" | "signup";

export const LoginPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { setUser } = useAuth();
  const navigate = useNavigate();

  const signupMutation = useMutation({
    mutationFn: signupApi,
    onSuccess: async (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      const me = await meApi();
      setUser(me);
      navigate("/clubs");
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not create account")
  });

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      const me = await meApi();
      setUser(me);
      navigate("/clubs");
    },
    onError: (err: any) => setError(err?.response?.data?.error?.message || "Could not login")
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      signupMutation.mutate({ collegeEmail, fullName, password });
      return;
    }

    loginMutation.mutate({ collegeEmail, password });
  };

  const busy = signupMutation.isPending || loginMutation.isPending;

  return (
    <div className="login-shell">
      <div className="ambient-orb orb-a" />
      <div className="ambient-orb orb-b" />
      <div className="ambient-orb orb-c" />

      <div className="login-card glass-lift">
        <div className="login-banner">
          <h2>ClubChain DAO</h2>
          <p>Govern student clubs with transparent voting, role-based access, and treasury visibility.</p>
          <div className="banner-pills">
            <span>Multi-club</span>
            <span>Secure auth</span>
            <span>Live governance</span>
          </div>
        </div>

        <div className="card auth-card">
          <div className="auth-switch">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Login
            </button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
              Sign Up
            </button>
          </div>

          <form onSubmit={onSubmit}>
            {mode === "signup" && (
              <>
                <label>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </>
            )}

            <label>College Email</label>
            <input
              type="email"
              value={collegeEmail}
              onChange={(e) => setCollegeEmail(e.target.value)}
              placeholder="name@students.mituniversity.edu.in"
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />

            <button type="submit" disabled={busy} className="auth-submit">
              {busy ? "Please wait..." : mode === "signup" ? "Create Account" : "Login"}
            </button>
          </form>

          {error && <div className="error-banner">{error}</div>}

          <p className="helper" style={{ marginTop: "0.8rem" }}>
            Allowed email suffix is controlled by backend `ALLOWED_EMAIL_DOMAIN`.
          </p>
        </div>
      </div>
    </div>
  );
};
