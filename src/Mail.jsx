import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  Routes,
  Route,
  Navigate,
  NavLink
} from "react-router-dom";

import { api } from "./api";
import developer_api from "./developer_api";
import Mail from "./Mail";

import "./App.css";

// ==================================================
// CONSTANTS
// ==================================================

const USER_KEY = "user";
const TOKEN_KEY = "accessToken";
const PROJECTS_KEY = "uauth_projects";

// ==================================================
// HELPERS
// ==================================================

function isUmail(email) {
  return /^[a-zA-Z0-9._%+-]+@umail\.com$/.test(
    email.trim().toLowerCase()
  );
}

function saveUser(user) {
  if (!user) return;

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
}

function clearAuth() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

// ==================================================
// AUTH LAYOUT
// ==================================================

function AuthLayout({
  children,
  title,
  subtitle
}) {
  return (
    <div className="auth-page">

      <div className="auth-brand">
        <div className="brand-logo">
          U
        </div>

        <h1>UserAuth</h1>
      </div>

      <div className="auth-card">

        <h2>{title}</h2>

        <p className="subtitle">
          {subtitle}
        </p>

        {children}

      </div>

    </div>
  );
}

// ==================================================
// LOGIN
// ==================================================

function Login({
  onLogin,
  goSignup
}) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [twoFactorPin, setTwoFactorPin] =
    useState("");

  const [requiresTwoFactor, setRequiresTwoFactor] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showPin, setShowPin] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function submit(e) {

    e.preventDefault();

    if (loading) return;

    setError("");

    const cleanEmail =
      email.trim().toLowerCase();


    if (!isUmail(cleanEmail)) {

      setError(
        "Only @umail.com email addresses are allowed."
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

      const body = {
        email: cleanEmail,
        password
      };

      if (requiresTwoFactor) {
        body.twoFactorPin = twoFactorPin;
      }


      const data = await api(
        "/auth/signin",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );


      if (data.requiresTwoFactor) {

        setRequiresTwoFactor(true);
        setError("");
        setLoading(false);

        return;
      }


      if (!data.token) {
        throw new Error(
          "Login token was not returned."
        );
      }


      localStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      saveUser(data.user);

      onLogin(data.user);

    } catch (error) {

      setError(
        error.message ||
        "Login failed"
      );

    } finally {

      setLoading(false);

    }
  }


  function backToLogin() {

    setRequiresTwoFactor(false);
    setTwoFactorPin("");
    setShowPin(false);
    setError("");

  }


  return (

    <AuthLayout
      title={
        requiresTwoFactor
          ? "Two-factor verification"
          : "Sign in"
      }
      subtitle={
        requiresTwoFactor
          ? "Enter your 4-digit security PIN"
          : "Continue securely with UserAuth"
      }
    >

      <form onSubmit={submit}>

        {error && (
          <div className="alert error">
            <span>{error}</span>
          </div>
        )}


        {!requiresTwoFactor && (
          <>

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


            <label>
              Password
            </label>

            <div className="password-input">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    value => !value
                  )
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </>
        )}


        {requiresTwoFactor && (
          <>

            <label>
              4-digit 2FA PIN
            </label>

            <div className="password-input">

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
                autoComplete="one-time-code"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPin(
                    value => !value
                  )
                }
              >
                {showPin
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </>
        )}


        <button
          type="submit"
          className="primary full"
          disabled={loading}
        >
          {loading
            ? "Verifying..."
            : requiresTwoFactor
              ? "Verify PIN"
              : "Sign in"}
        </button>


        {requiresTwoFactor && (

          <button
            type="button"
            className="secondary full"
            onClick={backToLogin}
            disabled={loading}
          >
            Back to login
          </button>

        )}

      </form>


      {!requiresTwoFactor && (

        <p className="switch-text">

          Don't have an account?{" "}

          <button
            type="button"
            onClick={goSignup}
          >
            Create account
          </button>

        </p>

      )}

    </AuthLayout>
  );
}

// ==================================================
// SIGNUP
// ==================================================

function Signup({
  onLogin,
  goLogin
}) {

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function submit(e) {

    e.preventDefault();

    if (loading) return;

    setError("");


    const cleanEmail =
      email.trim().toLowerCase();

    const cleanName =
      name.trim();


    if (!cleanName) {

      setError(
        "Please enter your name."
      );

      return;
    }


    if (!isUmail(cleanEmail)) {

      setError(
        "Only @umail.com email addresses are allowed."
      );

      return;
    }


    if (password.length < 6) {

      setError(
        "Password must be at least 6 characters."
      );

      return;
    }


    setLoading(true);

    try {

      const data = await api(
        "/auth/signup",
        {
          method: "POST",

          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password
          })
        }
      );


      if (!data.token) {

        throw new Error(
          "Signup token was not returned."
        );
      }


      localStorage.setItem(
        TOKEN_KEY,
        data.token
      );

      saveUser(data.user);

      onLogin(data.user);

    } catch (error) {

      setError(
        error.message ||
        "Account creation failed"
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <AuthLayout
      title="Create account"
      subtitle="Create your secure UserAuth account"
    >

      <form onSubmit={submit}>

        {error && (
          <div className="alert error">
            {error}
          </div>
        )}


        <label>
          Full name
        </label>

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          autoComplete="name"
          required
        />


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

        <small className="mail-hint">
          Your email must end with @umail.com
        </small>


        <label>
          Password
        </label>

        <div className="password-input">

          <input
            type={
              showPassword
                ? "text"
                : "password"
            }
            placeholder="Minimum 6 characters"
            minLength={6}
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            autoComplete="new-password"
            required
          />

          <button
            type="button"
            className="password-toggle"
            onClick={() =>
              setShowPassword(
                value => !value
              )
            }
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>

        </div>


        <button
          type="submit"
          className="primary full"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : "Create account"}
        </button>

      </form>


      <p className="switch-text">

        Already have an account?{" "}

        <button
          type="button"
          onClick={goLogin}
        >
          Sign in
        </button>

      </p>

    </AuthLayout>
  );
}

// ==================================================
// PROFILE
// ==================================================

function Profile({
  user,
  updateUser,
  setMessage
}) {

  const [projects, setProjects] =
    useState(() => {

      try {

        const cached =
          sessionStorage.getItem(
            PROJECTS_KEY
          );

        return cached
          ? JSON.parse(cached)
          : [];

      } catch {

        return [];

      }

    });


  const [projectsLoading, setProjectsLoading] =
    useState(false);

  const [projectsError, setProjectsError] =
    useState("");


  const loadProjects =
    useCallback(
      async (signal) => {

        try {

          setProjectsLoading(true);
          setProjectsError("");


          const response =
            await developer_api.get(
              "/projects",
              {
                signal
              }
            );


          const newProjects =
            response.data.projects || [];


          setProjects(newProjects);


          try {

            sessionStorage.setItem(
              PROJECTS_KEY,
              JSON.stringify(
                newProjects
              )
            );

          } catch {}

        } catch (error) {

          if (
            error.name === "CanceledError" ||
            error.name === "AbortError" ||
            error.code === "ERR_CANCELED"
          ) {
            return;
          }


          setProjectsError(
            error.response?.data?.message ||
            error.message ||
            "Unable to load projects"
          );

        } finally {

          setProjectsLoading(false);

        }

      },
      []
    );


  useEffect(() => {

    if (!user?.id) return;

    const controller =
      new AbortController();

    loadProjects(
      controller.signal
    );

    return () =>
      controller.abort();

  }, [
    user?.id,
    loadProjects
  ]);


  async function updateProfile(e) {

    e.preventDefault();

    const form =
      e.currentTarget;


    try {

      const data =
        await api(
          "/auth/profile",
          {
            method: "PUT",

            body: JSON.stringify({

              name:
                form.name.value.trim(),

              phone:
                form.phone.value.trim(),

              address:
                form.address.value.trim()

            })
          }
        );


      updateUser(
        data.user
      );


      setMessage(
        "Profile updated successfully"
      );

    } catch (error) {

      setMessage(
        error.message ||
        "Failed to update profile"
      );

    }

  }


  return (

    <>

      <div className="page-title">

        <h1>
          Personal information
        </h1>

        <p>
          Manage your personal details
          and account information.
        </p>

      </div>


      <section className="card profile-summary">

        <div className="avatar profile-avatar">

          {user?.name?.[0]
            ?.toUpperCase() || "U"}

        </div>

        <div>

          <h2>
            {user?.name}
          </h2>

          <p>
            {user?.email}
          </p>

        </div>

      </section>


      <section className="card">

        <h2>
          Basic information
        </h2>


        <form onSubmit={updateProfile}>

          <label>
            Full name
          </label>

          <input
            name="name"
            defaultValue={
              user?.name || ""
            }
            required
          />


          <label>
            U-Mail address
          </label>

          <input
            value={
              user?.email || ""
            }
            disabled
            readOnly
          />


          <label>
            Phone number
          </label>

          <input
            name="phone"
            type="tel"
            placeholder="+91 98765 43210"
            defaultValue={
              user?.phone || ""
            }
          />


          <label>
            Home address
          </label>

          <textarea
            name="address"
            rows={4}
            placeholder="Enter your home address"
            defaultValue={
              user?.address || ""
            }
          />


          <button
            type="submit"
            className="primary"
          >
            Save changes
          </button>

        </form>

      </section>


      <section className="card">

        <h2>
          Account password
        </h2>


        <div className="password-display">

          <input
            type="text"
            value="••••••••••••"
            readOnly
          />


          <NavLink
            to="/security"
            className="console-btn"
          >
            Change
          </NavLink>

        </div>

      </section>


      <section className="card">

        <div className="section-heading">

          <div>

            <h2>
              Developer Console Projects
            </h2>

            <p className="muted">
              Projects created from your
              Developer Console account.
            </p>

          </div>


          <button
            type="button"
            className="console-btn"
            onClick={() => loadProjects()}
            disabled={projectsLoading}
          >
            {projectsLoading
              ? "Loading..."
              : "Refresh"}
          </button>

        </div>


        {projectsLoading && (
          <p className="muted">
            Loading projects...
          </p>
        )}


        {projectsError && (
          <div className="alert error">
            {projectsError}
          </div>
        )}


        {!projectsLoading &&
          !projectsError &&
          projects.length === 0 && (

            <div className="project-empty">

              <p>
                No Developer Console projects found.
              </p>

              <a
                href="https://developer-uauth.wuaze.com/"
                className="console-btn"
              >
                Open Developer Console
              </a>

            </div>

          )}


        {!projectsLoading &&
          projects.length > 0 && (

            <div className="project-list">

              {projects.map(
                (project) => (

                  <div
                    key={project._id}
                    className="project-account-row"
                  >

                    <div className="project-account-info">

                      <strong>
                        {project.name}
                      </strong>

                      <small>
                        Project ID:{" "}
                        {project._id}
                      </small>

                      <small>
                        Publishable Key:{" "}
                        {project.publishableKey}
                      </small>

                    </div>


                    <button
                      type="button"
                      className="console-btn"
                      onClick={() => {

                        window.location.href =
                          `https://developer-uauth.wuaze.com/?project=${project._id}`;

                      }}
                    >
                      Edit
                    </button>

                  </div>

                )
              )}

            </div>

          )}

      </section>

    </>
  );
}

// ==================================================
// SECURITY
// ==================================================

function Security({
  setMessage
}) {

  const [saving, setSaving] =
    useState(false);

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);


  async function changePassword(e) {

    e.preventDefault();

    if (saving) return;


    const form =
      e.currentTarget;

    const currentPassword =
      form.currentPassword.value;

    const newPassword =
      form.newPassword.value;


    if (newPassword.length < 6) {

      setMessage(
        "New password must be at least 6 characters."
      );

      return;
    }


    if (
      currentPassword ===
      newPassword
    ) {

      setMessage(
        "New password must be different from the current password."
      );

      return;
    }


    try {

      setSaving(true);


      const data =
        await api(
          "/auth/password",
          {
            method: "PUT",

            body: JSON.stringify({

              currentPassword,
              newPassword

            })
          }
        );


      form.reset();

      setShowCurrentPassword(false);
      setShowNewPassword(false);


      setMessage(
        data.message ||
        "Password updated successfully"
      );

    } catch (error) {

      setMessage(
        error.message ||
        "Failed to update password"
      );

    } finally {

      setSaving(false);

    }

  }


  return (

    <>

      <div className="page-title">

        <h1>
          Security
        </h1>

        <p>
          Manage your password and
          account security.
        </p>

      </div>


      <section className="card">

        <h2>
          Change password
        </h2>


        <form
          onSubmit={changePassword}
        >

          <label>
            Current password
          </label>

          <div className="password-input">

            <input
              name="currentPassword"
              type={
                showCurrentPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowCurrentPassword(
                  value => !value
                )
              }
            >
              {showCurrentPassword
                ? "Hide"
                : "Show"}
            </button>

          </div>


          <label>
            New password
          </label>

          <div className="password-input">

            <input
              name="newPassword"
              type={
                showNewPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={6}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowNewPassword(
                  value => !value
                )
              }
            >
              {showNewPassword
                ? "Hide"
                : "Show"}
            </button>

          </div>


          <button
            type="submit"
            className="primary"
            disabled={saving}
          >
            {saving
              ? "Updating..."
              : "Change password"}
          </button>

        </form>

      </section>

    </>
  );
}

// ==================================================
// PRIVACY
// ==================================================

function Privacy({
  user,
  updateUser,
  setMessage
}) {

  const [showModal, setShowModal] =
    useState(false);

  const [pin, setPin] =
    useState("");

  const [showPin, setShowPin] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const enabled =
    Boolean(
      user?.twoFactorEnabled
    );


  async function toggle2FA() {

    if (loading) return;

    setError("");


    if (enabled) {

      try {

        setLoading(true);

        const data =
          await api(
            "/auth/2fa/disable",
            {
              method: "PUT"
            }
          );


        updateUser({
          ...user,
          twoFactorEnabled: false
        });


        setMessage(
          data.message ||
          "Two-factor authentication disabled"
        );

      } catch (error) {

        setError(
          error.message ||
          "Unable to disable 2FA"
        );

      } finally {

        setLoading(false);

      }

      return;
    }


    setPin("");
    setShowPin(false);
    setError("");
    setShowModal(true);

  }


  async function enable2FA() {

    if (loading) return;


    if (!/^\d{4}$/.test(pin)) {

      setError(
        "PIN must be exactly 4 digits."
      );

      return;
    }


    try {

      setLoading(true);
      setError("");


      const data =
        await api(
          "/auth/2fa/enable",
          {
            method: "PUT",

            body: JSON.stringify({
              pin
            })
          }
        );


      updateUser({
        ...user,
        twoFactorEnabled: true
      });


      setShowModal(false);
      setPin("");
      setShowPin(false);


      setMessage(
        data.message ||
        "Two-factor authentication enabled"
      );

    } catch (error) {

      setError(
        error.message ||
        "Unable to enable 2FA"
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <>

      <div className="page-title">

        <h1>
          Privacy
        </h1>

        <p>
          Manage privacy and account
          security settings.
        </p>

      </div>


      <section className="card">

        <h2>
          Two-factor authentication
        </h2>

        <p className="muted">
          After enabling 2FA, your 4-digit
          PIN will be requested after your
          password during login.
        </p>


        <div className="setting-row">

          <div>

            <strong>
              Two-factor protection
            </strong>

            <small>
              {enabled
                ? "Enabled"
                : "Disabled"}
            </small>

          </div>


          <button
            type="button"
            className={
              enabled
                ? "toggle on"
                : "toggle"
            }
            onClick={toggle2FA}
            disabled={loading}
          >
            <span />
          </button>

        </div>

      </section>


      {showModal && (

        <div
          className="modal-backdrop"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget &&
              !loading
            ) {
              setShowModal(false);
            }

          }}
        >

          <div className="twofa-modal">

            <button
              type="button"
              className="modal-close"
              onClick={() => {

                if (!loading) {
                  setShowModal(false);
                }

              }}
            >
              ×
            </button>


            <h2>
              Enable 2FA
            </h2>


            <p className="muted">
              Create a 4-digit PIN that
              will be required after your
              password during login.
            </p>


            {error && (
              <div className="alert error">
                <span>{error}</span>
              </div>
            )}


            <label>
              4-digit PIN
            </label>


            <div className="password-input">

              <input
                type={
                  showPin
                    ? "text"
                    : "password"
                }
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={pin}
                onChange={(e) =>
                  setPin(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4)
                  )
                }
                autoFocus
              />


              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPin(
                    value => !value
                  )
                }
              >
                {showPin
                  ? "Hide"
                  : "Show"}
              </button>

            </div>


            <button
              type="button"
              className="primary full"
              onClick={enable2FA}
              disabled={
                loading ||
                pin.length !== 4
              }
            >
              {loading
                ? "Enabling..."
                : "Enable 2FA"}
            </button>

          </div>

        </div>

      )}

    </>
  );
}

// ==================================================
// DASHBOARD
// ==================================================

function Dashboard({
  user,
  onLogout,
  updateUser
}) {

  const [message, setMessage] =
    useState("");


  return (

    <div className="dashboard">

      <header className="topbar">

        <div className="top-brand">

          <div className="mini-logo">
            U
          </div>

          <strong>
            UserAuth
          </strong>

          <span>
            Account
          </span>

        </div>


        <div className="top-user">

          <NavLink
            to="/mail"
            className="console-btn"
          >
            U-Mail
          </NavLink>


          <a
            href="https://developer-uauth.wuaze.com/"
            className="console-btn"
          >
            Developer Console
          </a>


          <div className="avatar">
            {user?.name?.[0]
              ?.toUpperCase() || "U"}
          </div>

        </div>

      </header>


      <div className="dashboard-layout">

        <aside className="sidebar">

          <div className="user-box">

            <div className="avatar large">
              {user?.name?.[0]
                ?.toUpperCase() || "U"}
            </div>

            <strong>
              {user?.name}
            </strong>

            <small>
              {user?.email}
            </small>

          </div>


          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? "nav active"
                : "nav"
            }
          >
            Personal information
          </NavLink>


          <NavLink
            to="/security"
            className={({ isActive }) =>
              isActive
                ? "nav active"
                : "nav"
            }
          >
            Security
          </NavLink>


          <NavLink
            to="/privacy"
            className={({ isActive }) =>
              isActive
                ? "nav active"
                : "nav"
            }
          >
            Privacy
          </NavLink>


          <NavLink
            to="/mail"
            className={({ isActive }) =>
              isActive
                ? "nav active"
                : "nav"
            }
          >
            U-Mail
          </NavLink>


          <button
            type="button"
            className="nav logout"
            onClick={onLogout}
          >
            Sign out
          </button>

        </aside>


        <main className="content">

          {message && (

            <div className="alert success">

              <span>
                {message}
              </span>

              <button
                type="button"
                onClick={() =>
                  setMessage("")
                }
              >
                ×
              </button>

            </div>

          )}


          <Routes>

            <Route
              path="/"
              element={
                <Profile
                  user={user}
                  updateUser={updateUser}
                  setMessage={setMessage}
                />
              }
            />


            <Route
              path="/security"
              element={
                <Security
                  setMessage={setMessage}
                />
              }
            />


            <Route
              path="/privacy"
              element={
                <Privacy
                  user={user}
                  updateUser={updateUser}
                  setMessage={setMessage}
                />
              }
            />


            <Route
              path="/mail"
              element={
                <Mail />
              }
            />


            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

        </main>

      </div>

    </div>
  );
}

// ==================================================
// APP
// ==================================================

export default function App() {

  const [screen, setScreen] =
    useState("login");

  const [user, setUser] =
    useState(null);

  const [checking, setChecking] =
    useState(true);


  useEffect(() => {

    // Read localStorage once.
    const token =
      localStorage.getItem(
        TOKEN_KEY
      );

    const savedUser =
      localStorage.getItem(
        USER_KEY
      );


    // No login data.
    // Immediately show login.
    if (!token || !savedUser) {

      setChecking(false);

      return;

    }


    try {

      const parsedUser =
        JSON.parse(savedUser);


      if (!parsedUser) {
        throw new Error(
          "Invalid user"
        );
      }


      // IMPORTANT:
      // Do not wait for the backend here.
      //
      // Cached user is enough to render
      // the dashboard immediately.

      setUser(parsedUser);
      setScreen("dashboard");

    } catch {

      clearAuth();

      setUser(null);
      setScreen("login");

    } finally {

      setChecking(false);

    }

  }, []);


  const login =
    useCallback((userData) => {

      setUser(userData);

      saveUser(userData);

      setScreen("dashboard");

    }, []);


  const updateUser =
    useCallback((userData) => {

      setUser(userData);

      saveUser(userData);

    }, []);


  const logout =
    useCallback(() => {

      clearAuth();

      try {
        sessionStorage.removeItem(
          PROJECTS_KEY
        );
      } catch {}

      setUser(null);
      setScreen("login");

    }, []);


  // ==================================================
  // INITIAL LOADING
  // ==================================================

  if (checking) {

    return (

      <div className="loading">

        <div className="loading-spinner" />

        <span>
          Loading UserAuth...
        </span>

      </div>

    );

  }


  // ==================================================
  // LOGIN
  // ==================================================

  if (screen === "login") {

    return (

      <Login
        onLogin={login}
        goSignup={() =>
          setScreen("signup")
        }
      />

    );

  }


  // ==================================================
  // SIGNUP
  // ==================================================

  if (screen === "signup") {

    return (

      <Signup
        onLogin={login}
        goLogin={() =>
          setScreen("login")
        }
      />

    );

  }


  // ==================================================
  // DASHBOARD
  // ==================================================

  return (

    <Dashboard
      user={user}
      onLogout={logout}
      updateUser={updateUser}
    />

  );
}