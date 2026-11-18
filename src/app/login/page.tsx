"use client";

import { useActionState, useState } from "react";
import {
  ArrowRightOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  LockOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { BRAND, BrandMark, BrandName } from "@/components/Brand";
import { login } from "./actions";
import "./login.css";

const FEATURES = [
  { icon: <FileTextOutlined />, title: "Digital Challans", sub: "Lump-wise meters with live totals" },
  { icon: <TeamOutlined />, title: "Jobber Tracking", sub: "Who holds what, per design and part" },
  { icon: <SwapOutlined />, title: "Transfers & Tasks", sub: "Full or lump-wise moves, reminders on phone" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="cf-login-page">
      <div className="cf-ambient-mesh">
        <div className="cf-glow-orb cf-orb-1" />
        <div className="cf-glow-orb cf-orb-2" />
      </div>
      <div className="cf-blueprint-grid" />

      <main className="cf-unified-card">
        <section className="cf-part-brand" aria-label={`${BRAND.name} ${BRAND.accent}`}>
          <div className="cf-brand-top">
            <div className="cf-brand-header-row">
              <div className="flex items-center gap-2.5">
                <BrandMark size={40} />
                <BrandName />
              </div>
              <div className="cf-status-pill">
                <span className="cf-pulse-green" />
                <span>Online</span>
              </div>
            </div>
            <h1 className="cf-brand-headline">
              Fabric challans for <span className="cf-headline-accent">every stitching jobber</span>
            </h1>
            <p className="cf-brand-description">
              Record lump-wise meters on every challan, see who holds which catalogue, and move work between jobbers in
              seconds.
            </p>
          </div>

          <div className="cf-brand-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="cf-feature-item">
                <div className="cf-feature-icon-box">{f.icon}</div>
                <div>
                  <span className="cf-feature-title">{f.title}</span>
                  <span className="cf-feature-sub">{f.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="cf-brand-footer">
            <span>🔒 Encrypted</span>
            <span>📱 Any phone</span>
            <span>🧾 No paper book</span>
          </div>
        </section>

        <section className="cf-part-auth" aria-label="Sign in">
          <div className="cf-auth-top-glow" />
          <div className="cf-mobile-brand-row">
            <div className="flex items-center gap-2">
              <BrandMark size={36} />
              <BrandName dark={false} />
            </div>
          </div>

          <header className="cf-auth-header">
            <div>
              <h2 className="cf-auth-title">Sign In</h2>
              <p className="cf-auth-subtitle">Enter your user ID and password to continue</p>
            </div>
            <div className="cf-auth-mark-box">
              <BrandMark size={44} />
            </div>
          </header>

          <form action={formAction}>
            <label className="cf-field-label" htmlFor="username">
              User ID
            </label>
            <div className="cf-custom-input">
              <UserOutlined className="cf-input-icon" />
              <input
                id="username"
                name="username"
                placeholder="Your user ID"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>

            <label className="cf-field-label" htmlFor="password">
              Password
            </label>
            <div className="cf-custom-input">
              <LockOutlined className="cf-input-icon" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="cf-eye-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              </button>
            </div>

            <div className="cf-options-row">
              <button type="button" className="cf-forgot-btn" onClick={() => setShowHelp((s) => !s)}>
                Forgot password?
              </button>
            </div>
            {showHelp && (
              <p className="cf-help">
                Accounts are managed by your <strong>admin</strong>. Ask them to reset your password from the Users
                screen.
              </p>
            )}
            {state?.error && <p className="error mb-3">{state.error}</p>}

            <button className="cf-submit-btn" disabled={pending}>
              <span>{pending ? "Signing in…" : "Sign In"}</span>
              <ArrowRightOutlined className="cf-btn-arrow" />
            </button>
          </form>

          <footer className="cf-auth-footer">
            <span>Accounts are created by your admin</span>
            <span>
              &copy; {new Date().getFullYear()} {BRAND.name} {BRAND.accent}
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}
