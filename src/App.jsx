import { useEffect, useState, useMemo } from "react";
import "./App.css";

const AUTH_API =
  "https://tst-server-90.onrender.com/api";

function isUmail(email) {
  return /^[a-zA-Z0-9._%+-]+@umail\.com$/.test(
    email.trim().toLowerCase()
  );
}

function App() {
  const [mode, setMode] = useState("chooser");

  const [existingUser, setExistingUser] = useState(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [requiresTwoFactor, setRequiresTwoFactor] =
    useState(false);

  const [twoFactorPin, setTwoFactorPin] =
    useState("");

  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ============================================================
  // URL PARAMETERS
  // ============================================================

  const {
    apiKey,
    origin,
    clientName
  } = useMemo(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    return {
      apiKey: params.get("apiKey"),
      origin: params.get("origin"),
      clientName:
        params.get("clientName") ||
        "your application"
    };
  }, []);

  // ============================================================
  // CHECK SESSION
  // ============================================================

  useEffect(() => {
    const controller = new AbortController();

    checkExistingSession(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  async function checkExistingSession(signal) {
    const token =
      localStorage.getItem("accessToken");

    // No token = no need to call backend
    if (!token) {
      setExistingUser(null);
      setMode("login");
      setCheckingSession(false);
      return;
    }

    let parsedUser = null;

    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        parsedUser = null;
      }
    }

    try {
      const response = await fetch(
        `${AUTH_API}/auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal
        }
      );

      if (!response.ok) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem("user");

        setExistingUser(null);
        setMode("login");

        return;
      }

      const data = await response.json();

      const user =
        data.user ||
        data.data?.user ||
        parsedUser;

      if (!user?.email) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem("user");

        setExistingUser(null);
        setMode("login");

        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      setExistingUser(user);
      setMode("chooser");

    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }

      console.error(
        "Session check error:",
        err
      );

      setExistingUser(null);
      setMode("login");

    } finally {
      if (!signal.aborted) {
        setCheckingSession(false);
      }
    }
  }

  // ============================================================
  // SEND SUCCESS TO OPENER
  // ============================================================

  function sendSuccess(user, accessToken) {
    if (!window.opener) {
      setError(
        "Unable to return authentication result."
      );

      setLoading(false);

      return;
    }

    window.opener.postMessage(
      {
        type: "YOURAUTH_SUCCESS",
        user,
        accessToken
      },
      origin || "*"
    );

    window.close();
  }

  // ============================================================
  // CONTINUE WITH EXISTING ACCOUNT
  // ============================================================

  async function continueWithExistingAccount() {
    if (loading) return;

    const token =
      localStorage.getItem("accessToken");

    if (!token || !existingUser) {
      setMode("login");
      return;
    }

    if (!existingUser.email) {
      setError(
        "Account email is missing. Please sign in again."
      );

      return;
    }

    if (
      requiresTwoFactor &&
      !/^\d{4}$/.test(twoFactorPin)
    ) {
      setError(
        "Enter your 4-digit 2FA PIN."
      );

      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const body = {
        email:
          existingUser.email
            .trim()
            .toLowerCase(),

        continueWithSession: true
      };

      if (requiresTwoFactor) {
        body.twoFactorPin =
          twoFactorPin;
      }

      const response = await fetch(
        `${AUTH_API}/auth/signin`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

            "x-api-key":
              apiKey || ""
          },

          body: JSON.stringify(body)
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Authentication failed"
        );
      }

      if (
        data.requiresTwoFactor === true
      ) {
        setRequiresTwoFactor(true);
        setTwoFactorPin("");
        setShowPin(false);

        return;
      }

      const newToken =
        data.accessToken ||
        data.token ||
        token;

      if (
        data.accessToken ||
        data.token
      ) {
        localStorage.setItem(
          "accessToken",
          newToken
        );
      }

      const finalUser =
        data.user ||
        existingUser;

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      sendSuccess(
        finalUser,
        newToken
      );

    } catch (err) {
      console.error(
        "Continue authentication error:",
        err
      );

      setError(
        err.message ||
        "Authentication failed"
      );

      setLoading(false);
    }
  }

  // ============================================================
  // LOGIN / SIGNUP
  // ============================================================

  async function submit(e) {
    e.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (!isUmail(email)) {
      setError(
        "Only @umail.com email addresses are allowed."
      );

      return;
    }

    if (
      mode === "signup" &&
      !name.trim()
    ) {
      setError(
        "Name is required."
      );

      return;
    }

    if (
      !requiresTwoFactor &&
      password.length < 6
    ) {
      setError(
        "Password must be at least 6 characters."
      );

      return;
    }

    if (
      requiresTwoFactor &&
      !/^\d{4}$/.test(twoFactorPin)
    ) {
      setError(
        "Enter your 4-digit 2FA PIN."
      );

      return;
    }

    setLoading(true);

    try {
      const endpoint =
        mode === "signup"
          ? "/auth/signup"
          : "/auth/signin";

      let body;

      if (mode === "signup") {
        body = {
          name: name.trim(),

          email:
            email.trim().toLowerCase(),

          password
        };
      } else {
        body = {
          email:
            email.trim().toLowerCase(),

          password
        };

        if (requiresTwoFactor) {
          body.twoFactorPin =
            twoFactorPin;
        }
      }

      const response = await fetch(
        `${AUTH_API}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-api-key":
              apiKey || ""
          },

          body: JSON.stringify(body)
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Authentication failed"
        );
      }

      // ========================================================
      // 2FA REQUIRED
      // ========================================================

      if (
        data.requiresTwoFactor === true
      ) {
        setRequiresTwoFactor(true);

        setTwoFactorPin("");

        setShowPin(false);

        setLoading(false);

        return;
      }

      // ========================================================
      // TOKEN
      // ========================================================

      const accessToken =
        data.accessToken ||
        data.token;

      if (!accessToken) {
        throw new Error(
          "Authentication token was not returned."
        );
      }

      localStorage.setItem(
        "accessToken",
        accessToken
      );

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );
      }

      sendSuccess(
        data.user,
        accessToken
      );

    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setError(
        err.message ||
        "Authentication failed"
      );

      setLoading(false);
    }
  }

  // ============================================================
  // ANOTHER ACCOUNT
  // ============================================================

  function useAnotherAccount() {
    if (loading) return;

    setExistingUser(null);

    setMode("login");

    setRequiresTwoFactor(false);

    setTwoFactorPin("");

    setEmail("");

    setPassword("");

    setName("");

    setError("");

    setMessage("");
  }

  // ============================================================
  // SESSION LOADING
  // ============================================================

  if (checkingSession) {
    return (
      <div className="auth-page">

        <div className="auth-container">

          <div className="auth-card">

            <div className="session-loading">

              <div className="session-spinner"></div>

              <span>
                Checking your UserAuth account...
              </span>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // ============================================================
  // EXISTING ACCOUNT + 2FA
  // ============================================================

  if (
    mode === "chooser" &&
    existingUser &&
    requiresTwoFactor
  ) {
    return (
      <div className="auth-page">

        <div className="auth-container">

          <div className="auth-brand">

            <div className="brand-icon">
              U
            </div>

            <h1>
              UserAuth
            </h1>

            <p>
              Secure authentication
            </p>

          </div>

          <div className="auth-card">

            <h2>
              Continue with UserAuth
            </h2>

            <p className="description">
              Enter your 4-digit security PIN to continue.
            </p>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <div className="field">

              <label>
                4-digit 2FA PIN
              </label>

              <div className="password-wrapper">

                <input
                  type={
                    showPin
                      ? "text"
                      : "password"
                  }

                  inputMode="numeric"

                  maxLength={4}

                  placeholder="0000"

                  value={twoFactorPin}

                  onChange={(e) =>
                    setTwoFactorPin(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4)
                    )
                  }

                  autoFocus

                  required
                />

                <button
                  type="button"
                  className="show-password"

                  onClick={() =>
                    setShowPin(
                      !showPin
                    )
                  }
                >
                  {showPin
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

              <small className="email-hint">
                Two-factor authentication is enabled
                for {existingUser.email}
              </small>

            </div>

            <button
              type="button"
              className="submit-button"

              onClick={
                continueWithExistingAccount
              }

              disabled={
                loading ||
                twoFactorPin.length !== 4
              }
            >
              {loading
                ? "Verifying..."
                : "Continue"}
            </button>

            <button
              type="button"
              className="back-button"

              onClick={() => {

                if (loading) return;

                setRequiresTwoFactor(false);

                setTwoFactorPin("");

                setShowPin(false);

                setError("");

              }}

              disabled={loading}
            >
              ← Back
            </button>

          </div>

        </div>

      </div>
    );
  }

  // ============================================================
  // EXISTING ACCOUNT CHOOSER
  // ============================================================

  if (
    mode === "chooser" &&
    existingUser
  ) {
    return (
      <div className="auth-page">

        <div className="account-selector">

          <div className="selector-brand">

            <div className="selector-logo">
              U
            </div>

            <div>

              <strong>
                UserAuth
              </strong>

              <span>
                Secure sign-in
              </span>

            </div>

          </div>

          <div className="selector-header">

            <h1>
              Continue with UserAuth
            </h1>

            <p>
              Select an account to continue
            </p>

          </div>

          <div className="client-box">

            <div className="client-icon">
              U
            </div>

            <div className="client-details">

              <span>
                Continue to
              </span>

              <strong>
                {clientName}
              </strong>

            </div>

          </div>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            type="button"
            className="user-account-card"

            onClick={
              continueWithExistingAccount
            }

            disabled={loading}
          >

            <div className="user-avatar">

              {
                existingUser.name
                  ?.charAt(0)
                  ?.toUpperCase() ||

                existingUser.email
                  ?.charAt(0)
                  ?.toUpperCase() ||

                "U"
              }

            </div>

            <div className="user-account-info">

              <strong>
                {
                  existingUser.name ||
                  "UserAuth User"
                }
              </strong>

              <span>
                {existingUser.email}
              </span>

              <small>

                {loading
                  ? "Please wait..."
                  : "Continue with this account"}

              </small>

            </div>

            <div className="continue-icon">
              →
            </div>

          </button>

          <button
            type="button"
            className="other-account-btn"

            onClick={
              useAnotherAccount
            }

            disabled={loading}
          >

            <span className="other-account-icon">
              +
            </span>

            <span>
              Sign in with another account
            </span>

          </button>

          <div className="selector-security">
          </div>

        </div>

      </div>
    );
  }

  // ============================================================
  // MAIN LOGIN / SIGNUP
  // ============================================================

  return (
    <div className="auth-page">

      <div className="auth-container">

        <div className="auth-brand">

          <div className="brand-icon">
            U
          </div>

          <h1>
            UserAuth
          </h1>

          <p>
            Secure authentication
          </p>

        </div>

        <div className="auth-card">

          <h2>

            {
              requiresTwoFactor
                ? "Two-factor verification"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"
            }

          </h2>

          <p className="description">

            {
              requiresTwoFactor
                ? "Enter your 4-digit security PIN"
                : "Continue securely with UserAuth"
            }

          </p>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <form onSubmit={submit}>

            {!requiresTwoFactor && (
              <>

                {mode === "signup" && (
                  <div className="field">

                    <label>
                      Name
                    </label>

                    <input
                      type="text"
                      placeholder="Your name"

                      value={name}

                      onChange={(e) =>
                        setName(
                          e.target.value
                        )
                      }

                      autoComplete="name"

                      required
                    />

                  </div>
                )}

                <div className="field">

                  <label>
                    U-Mail address
                  </label>

                  <input
                    type="email"

                    placeholder="you@umail.com"

                    value={email}

                    onChange={(e) =>
                      setEmail(
                        e.target.value.toLowerCase()
                      )
                    }

                    autoComplete="email"

                    required
                  />

                </div>

                <div className="field">

                  <label>
                    Password
                  </label>

                  <div className="password-wrapper">

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }

                      placeholder="••••••••"

                      value={password}

                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }

                      minLength={6}

                      autoComplete={
                        mode === "login"
                          ? "current-password"
                          : "new-password"
                      }

                      required
                    />

                    <button
                      type="button"
                      className="show-password"

                      onClick={() =>
                        setShowPassword(
                          !showPassword
                        )
                      }
                    >
                      {
                        showPassword
                          ? "Hide"
                          : "Show"
                      }
                    </button>

                  </div>

                </div>

              </>
            )}

            {requiresTwoFactor && (

              <div className="field">

                <label>
                  4-digit 2FA PIN
                </label>

                <div className="password-wrapper">

                  <input
                    type={
                      showPin
                        ? "text"
                        : "password"
                    }

                    inputMode="numeric"

                    maxLength={4}

                    placeholder="0000"

                    value={twoFactorPin}

                    onChange={(e) =>
                      setTwoFactorPin(
                        e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4)
                      )
                    }

                    autoFocus

                    required
                  />

                  <button
                    type="button"
                    className="show-password"

                    onClick={() =>
                      setShowPin(
                        !showPin
                      )
                    }
                  >
                    {
                      showPin
                        ? "Hide"
                        : "Show"
                    }
                  </button>

                </div>

                <small className="email-hint">
                  Enter the 4-digit PIN
                  configured in UserAuth.
                </small>

              </div>
            )}

            <button
              type="submit"
              className="submit-button"

              disabled={loading}
            >

              {
                loading
                  ? "Please wait..."
                  : requiresTwoFactor
                    ? "Verify PIN"
                    : mode === "login"
                      ? "Sign in"
                      : "Create account"
              }

            </button>

            {requiresTwoFactor && (

              <button
                type="button"
                className="back-button"

                onClick={() => {

                  if (loading) return;

                  setRequiresTwoFactor(false);

                  setTwoFactorPin("");

                  setShowPin(false);

                  setError("");

                }}

                disabled={loading}
              >
                ← Back to login
              </button>

            )}

          </form>

          {!requiresTwoFactor && (

            <div className="switch-mode">

              {
                mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"
              }

              <button
                type="button"

                onClick={() => {

                  if (loading) return;

                  setMode(
                    mode === "login"
                      ? "signup"
                      : "login"
                  );

                  setError("");

                  setMessage("");

                  setPassword("");

                  setName("");

                  setRequiresTwoFactor(
                    false
                  );

                  setTwoFactorPin("");

                }}
              >
                {
                  mode === "login"
                    ? "Create account"
                    : "Sign in"
                }
              </button>

            </div>

          )}

        </div>

        <div className="footer">
          Secured by UserAuth
        </div>

      </div>

    </div>
  );
}

export default App;