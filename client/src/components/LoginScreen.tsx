import { useState, type FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(username.trim(), password);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 503) {
          setError("The dashboard API cannot reach the database. It must run on the Prodjex server.");
        } else if (error.response?.status === 401) {
          setError("Invalid username or password.");
        } else {
          setError("Could not sign in. Check your connection and try again.");
        }
      } else {
        setError("Could not sign in. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">First Dealer Direct</p>
        <h1>Dashboard sign in</h1>
        <p className="subtitle">Enter your dashboard credentials to continue.</p>

        <label>
          Username
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <div className="error-banner">{error}</div> : null}

        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
