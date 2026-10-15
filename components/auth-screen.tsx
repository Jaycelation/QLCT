"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  Sprout,
  Globe,
  ChartNoAxesCombined,
  Wallet,
  Target,
} from "lucide-react";
import { Button } from "./ui/button";
import { copy } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
export function AuthScreen({
  lang,
  setLang,
  onLogin,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  onLogin: () => Promise<void>;
}) {
  const t = copy[lang];
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = Object.fromEntries(new FormData(e.currentTarget));
      const res = await fetch(
        "/api/auth/" + (register ? "register" : "login"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error === "INVALID_CREDENTIALS"
            ? lang === "vi"
              ? "Email hoặc mật khẩu không đúng."
              : "Incorrect email or password."
            : data.error === "ALREADY_EXISTS"
              ? lang === "vi"
                ? "Không thể tạo tài khoản với email này."
                : "Unable to register with this email."
              : data.error === "TOO_MANY_ATTEMPTS"
                ? lang === "vi"
                  ? "Quá nhiều yêu cầu. Thử lại sau 15 phút."
                  : "Too many attempts. Try again in 15 minutes."
                : t.setup,
        );
      await onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-icon">
            <Sprout size={24} />
          </span>
          finora<span className="brand-dot">.</span>
        </div>
        <div className="auth-story-body">
          <span className="eyebrow">
            A LITTLE CLARITY. A LOT OF POSSIBILITY.
          </span>
          <h1>
            {t.welcome.split("\n").map((s, i) => (
              <span key={i}>
                {s}
                <br />
              </span>
            ))}
          </h1>
          <p>
            {lang === "vi"
              ? "Từ những khoản chi nhỏ đến những ước mơ lớn. Tất cả, trong một không gian."
              : "From everyday spending to your biggest dreams. Everything, in one place."}
          </p>
          <div className="auth-orbit">
            <div className="orbit-ring" />
            <div className="orbit-center">
              <Sprout size={72} strokeWidth={1} />
            </div>
            <div className="orbit-chip chip-one">
              <Wallet size={22} />
              {t.balance}
            </div>
            <div className="orbit-chip chip-two">
              <Target size={22} />
              {t.goals}
            </div>
            <div className="orbit-chip chip-three">
              <ChartNoAxesCombined size={22} />
              {t.cashflow}
            </div>
          </div>
        </div>
        <div className="auth-foot">
          FINORA PERSONAL FINANCE <span>DESIGNED FOR PEACE OF MIND</span>
        </div>
      </section>
      <section className="auth-main">
        <Button
          variant="ghost"
          className="language-switch"
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
        >
          <Globe size={16} />
          {lang === "vi" ? "English" : "Tiếng Việt"}
        </Button>
        <div className="auth-form">
          <div className="small-leaf">
            <Sprout size={26} />
          </div>
          <h2>{register ? t.register : t.login}</h2>
          <p className="muted">{register ? t.registerSub : t.loginSub}</p>
          <form onSubmit={submit}>
            {register && (
              <label className="field">
                <span>{t.yourName}</span>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
            )}
            <label className="field">
              <span>{t.email}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </label>
            <label className="field">
              <span>{t.password}</span>
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={12}
                maxLength={72}
              />
            </label>
            {register && <p className="form-help">{t.passwordHint}</p>}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy} className="auth-submit">
              {busy ? t.loading : register ? t.register : t.login}
              <ArrowUpRight size={18} />
            </Button>
          </form>
          <p className="auth-toggle">
            {register ? t.hasAccount : t.noAccount}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? t.login : t.register}
            </button>
          </p>
          <div className="secure-note">
            <ShieldCheck size={16} />
            {t.secure}
          </div>
        </div>
        <div className="auth-bottom">© {new Date().getFullYear()} Finora</div>
      </section>
    </div>
  );
}
