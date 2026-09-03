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

function isUmail(email) {
  return /^[a-zA-Z0-9._%+-]+@umail\.com$/.test(
    email.trim().toLowerCase()
  );
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

        <h1>
          UserAuth
        </h1>

      </div>

      <div className="auth-card">

        <h2>
          {title}
        </h2>

        <p className="subtitle">
          {subtitle}
        </p>

        {children}

      </div>

    </div>
  );
}

// ==================================================
// ACCOUNT DATA PRELOAD
// ==================================================

async function preloadAccountData(user) {
  if (!user?.id) {
    return;
  }

  /*
    Fetch everything required by the dashboard
    at the same time.

    Promise.all prevents unnecessary waterfalls.
  */

  await Promise.allSettled([
    developer_api.get("/projects")
  ]);
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


  const submit = useCallback(
    async (e) => {
      e.preventDefault();

      if (loading) {
        return;
      }

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
        !/^\d{4}$/.test(
          twoFactorPin
        )
      ) {

        setError(
          "Enter your 4-digit 2FA PIN."
        );

        return;
      }


      setLoading(true);


      try {

        // ==========================================
        // LOGIN / 2FA
        // ==========================================

        const data =
          await api(
            "/auth/signin",
            {
              method: "POST",

              body: JSON.stringify({

                email:
                  cleanEmail,

                password,

                ...(requiresTwoFactor
                  ? {
                      twoFactorPin
                    }
                  : {})

              })
            }
          );


        // ==========================================
        // FIRST STEP OF LOGIN
        // ==========================================

        if (
          data.requiresTwoFactor
        ) {

          setRequiresTwoFactor(
            true
          );

          setTwoFactorPin("");

          setError("");

          /*
            Do not remove loading here until
            the request is completely finished.
          */

          return;
        }


        // ==========================================
        // LOGIN COMPLETE
        // ==========================================

        if (!data.token) {

          throw new Error(
            "Login token was not returned."
          );

        }


        localStorage.setItem(
          "accessToken",
          data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );


        // ==========================================
        // PRELOAD ACCOUNT DATA
        // ==========================================

        await preloadAccountData(
          data.user
        );


        /*
          Only after authentication AND
          account data loading is complete,
          enter the dashboard.
        */

        onLogin(
          data.user
        );

      } catch (error) {

        setError(
          error.message ||
          "Login failed"
        );

      } finally {

        setLoading(false);

      }

    },
    [
      email,
      password,
      twoFactorPin,
      requiresTwoFactor,
      loading,
      onLogin
    ]
  );


  const togglePassword =
    useCallback(() => {

      setShowPassword(
        value => !value
      );

    }, []);


  const togglePin =
    useCallback(() => {

      setShowPin(
        value => !value
      );

    }, []);


  const backToLogin =
    useCallback(() => {

      if (loading) {
        return;
      }

      setRequiresTwoFactor(
        false
      );

      setTwoFactorPin("");

      setShowPin(false);

      setError("");

    }, [loading]);


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

            <span>
              {error}
            </span>

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
              pattern="^[a-zA-Z0-9._%+-]+@umail\.com$"
              title="Only @umail.com email addresses are allowed"
              autoComplete="email"
              disabled={loading}
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

                disabled={loading}

                required
              />


              <button
                type="button"
                className="password-toggle"
                onClick={togglePassword}
                disabled={loading}
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

                pattern="\d{4}"

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

                disabled={loading}

                required
              />


              <button
                type="button"
                className="password-toggle"
                onClick={togglePin}
                disabled={loading}
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
            ? requiresTwoFactor
              ? "Verifying..."
              : "Signing in..."
            : requiresTwoFactor
              ? "Verify PIN"
              : "Sign in"}

        </button>


        {requiresTwoFactor && (

          <button
            type="button"
            className="secondary full"
            disabled={loading}
            onClick={backToLogin}
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
            disabled={loading}
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


  const submit = useCallback(
    async (e) => {

      e.preventDefault();

      if (loading) {
        return;
      }

      setError("");


      const cleanName =
        name.trim();

      const cleanEmail =
        email.trim().toLowerCase();


      if (!isUmail(cleanEmail)) {

        setError(
          "Only @umail.com email addresses are allowed."
        );

        return;
      }


      if (
        password.length < 6
      ) {

        setError(
          "Password must be at least 6 characters."
        );

        return;
      }


      setLoading(true);


      try {

        const data =
          await api(
            "/auth/signup",
            {
              method: "POST",

              body: JSON.stringify({

                name:
                  cleanName,

                email:
                  cleanEmail,

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
          "accessToken",
          data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );


        // Preload data before dashboard
        await preloadAccountData(
          data.user
        );


        onLogin(
          data.user
        );

      } catch (error) {

        setError(
          error.message ||
          "Account creation failed"
        );

      } finally {

        setLoading(false);

      }

    },
    [
      name,
      email,
      password,
      loading,
      onLogin
    ]
  );


  const togglePassword =
    useCallback(() => {

      setShowPassword(
        value => !value
      );

    }, []);


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
            setName(
              e.target.value
            )
          }
          autoComplete="name"
          disabled={loading}
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
          pattern="^[a-zA-Z0-9._%+-]+@umail\.com$"
          title="Only @umail.com email addresses are allowed"
          autoComplete="email"
          disabled={loading}
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
            disabled={loading}
            required
          />


          <button
            type="button"
            className="password-toggle"
            onClick={togglePassword}
            disabled={loading}
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
          disabled={loading}
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
    useState([]);

  const [projectsLoading, setProjectsLoading] =
    useState(false);

  const [projectsError, setProjectsError] =
    useState("");


  const loadProjects =
    useCallback(
      async () => {

        if (!user?.id) {
          return;
        }

        try {

          setProjectsLoading(
            true
          );

          setProjectsError("");


          const response =
            await developer_api.get(
              "/projects"
            );


          setProjects(
            response.data.projects ||
            []
          );

        } catch (error) {

          console.error(
            "Projects error:",
            error
          );


          setProjectsError(
            error.response?.data?.message ||
            error.message ||
            "Unable to load projects"
          );

        } finally {

          setProjectsLoading(
            false
          );

        }

      },
      [user?.id]
    );


  useEffect(() => {

    loadProjects();

  }, [loadProjects]);


  const updateProfile =
    useCallback(
      async (e) => {

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
                    form.name.value,

                  phone:
                    form.phone.value,

                  address:
                    form.address.value

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

      },
      [
        updateUser,
        setMessage
      ]
    );


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


        <form
          onSubmit={updateProfile}
        >

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
            onClick={loadProjects}
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
                project => (

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


  const changePassword =
    useCallback(
      async (e) => {

        e.preventDefault();

        if (saving) {
          return;
        }


        const form =
          e.currentTarget;


        const currentPassword =
          form.currentPassword.value;

        const newPassword =
          form.newPassword.value;


        if (
          newPassword.length < 6
        ) {

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

          setShowCurrentPassword(
            false
          );

          setShowNewPassword(
            false
          );


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

      },
      [
        saving,
        setMessage
      ]
    );


  const toggleCurrentPassword =
    useCallback(() => {

      setShowCurrentPassword(
        value => !value
      );

    }, []);


  const toggleNewPassword =
    useCallback(() => {

      setShowNewPassword(
        value => !value
      );

    }, []);


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
              disabled={saving}
              required
            />


            <button
              type="button"
              className="password-toggle"
              onClick={
                toggleCurrentPassword
              }
              disabled={saving}
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
              disabled={saving}
              required
            />


            <button
              type="button"
              className="password-toggle"
              onClick={
                toggleNewPassword
              }
              disabled={saving}
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


  const toggle2FA =
    useCallback(
      async () => {

        if (loading) {
          return;
        }

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

              twoFactorEnabled:
                false

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

      },
      [
        loading,
        enabled,
        user,
        updateUser,
        setMessage
      ]
    );


  const enable2FA =
    useCallback(
      async () => {

        if (loading) {
          return;
        }


        if (
          !/^\d{4}$/.test(pin)
        ) {

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

            twoFactorEnabled:
              true

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

      },
      [
        loading,
        pin,
        user,
        updateUser,
        setMessage
      ]
    );


  const togglePin =
    useCallback(() => {

      setShowPin(
        value => !value
      );

    }, []);


  const closeModal =
    useCallback(() => {

      if (!loading) {
        setShowModal(false);
      }

    }, [loading]);


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
              onClick={closeModal}
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

                <span>
                  {error}
                </span>

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
                pattern="\d{4}"
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
                disabled={loading}
              />


              <button
                type="button"
                className="password-toggle"
                onClick={togglePin}
                disabled={loading}
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


  const clearMessage =
    useCallback(() => {

      setMessage("");

    }, []);


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
                onClick={clearMessage}
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
// FULL ACCOUNT LOADING SCREEN
// ==================================================

function AccountLoading() {
  return (
    <div className="loading">

      <div className="loading-spinner" />

      <span>
        Loading your account...
      </span>

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


  // ==================================================
  // STARTUP
  // ==================================================

  useEffect(() => {

    let active = true;


    async function restoreSession() {

      const savedUser =
        localStorage.getItem(
          "user"
        );

      const token =
        localStorage.getItem(
          "accessToken"
        );


      if (
        !savedUser ||
        !token
      ) {

        if (active) {
          setChecking(false);
        }

        return;
      }


      try {

        const parsedUser =
          JSON.parse(
            savedUser
          );


        if (!parsedUser) {
          throw new Error(
            "Invalid user"
          );
        }


        /*
          Keep loading screen visible while
          all required account data is fetched.
        */

        await preloadAccountData(
          parsedUser
        );


        if (!active) {
          return;
        }


        setUser(
          parsedUser
        );

        setScreen(
          "dashboard"
        );

      } catch {

        localStorage.removeItem(
          "user"
        );

        localStorage.removeItem(
          "accessToken"
        );

      } finally {

        if (active) {
          setChecking(false);
        }

      }

    }


    restoreSession();


    return () => {

      active = false;

    };

  }, []);


  // ==================================================
  // LOGIN
  // ==================================================

  const login =
    useCallback(
      (userData) => {

        setUser(
          userData
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            userData
          )
        );

        setScreen(
          "dashboard"
        );

      },
      []
    );


  // ==================================================
  // UPDATE USER
  // ==================================================

  const updateUser =
    useCallback(
      (userData) => {

        setUser(
          userData
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            userData
          )
        );

      },
      []
    );


  // ==================================================
  // LOGOUT
  // ==================================================

  const logout =
    useCallback(
      () => {

        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "user"
        );

        setUser(null);

        setScreen(
          "login"
        );

      },
      []
    );


  // ==================================================
  // NAVIGATION
  // ==================================================

  const goSignup =
    useCallback(() => {

      setScreen(
        "signup"
      );

    }, []);


  const goLogin =
    useCallback(() => {

      setScreen(
        "login"
      );

    }, []);


  // ==================================================
  // INITIAL ACCOUNT LOADING
  // ==================================================

  if (checking) {

    return (
      <AccountLoading />
    );

  }


  // ==================================================
  // LOGIN
  // ==================================================

  if (
    screen === "login"
  ) {

    return (

      <Login
        onLogin={login}
        goSignup={goSignup}
      />

    );

  }


  // ==================================================
  // SIGNUP
  // ==================================================

  if (
    screen === "signup"
  ) {

    return (

      <Signup
        onLogin={login}
        goLogin={goLogin}
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