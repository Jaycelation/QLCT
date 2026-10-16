"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, Wallet2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, registerAction } from "@/actions/auth";
import { fieldErrors as toFieldErrors, loginSchema, registerSchema, type FieldErrors } from "@/lib/validation";
import { FormField } from "./form-field";

function PasswordInput({ id, value, onChange, invalid, autoComplete }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoComplete: string;
}) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className="pr-10"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center"
        aria-label={visible ? t("hidePassword") : t("showPassword")}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 space-y-2">
      <span className="bg-primary text-primary-foreground mb-4 flex size-10 items-center justify-center rounded-xl shadow-sm lg:hidden">
        <Wallet2 className="size-5" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await loginAction({ email, password }, next);
      // On success the action redirects, so we only get here on failure.
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t("errors.unexpected"));
      }
    });
  }

  return (
    <>
      <Header title={t("auth.loginTitle")} subtitle={t("auth.loginSubtitle")} />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <FormError message={formError} />
        <FormField id="email" label={t("auth.email")} error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email || undefined} required autoFocus />
        </FormField>
        <FormField id="password" label={t("auth.password")} error={errors.password}>
          <PasswordInput id="password" value={password} onChange={setPassword} invalid={!!errors.password} autoComplete="current-password" />
        </FormField>
        <Button type="submit" className="mt-2 h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t("auth.login")}
        </Button>
      </form>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          {t("auth.register")}
        </Link>
      </p>
      <p className="bg-muted text-muted-foreground mt-6 rounded-lg px-3 py-2 text-center text-xs">{t("auth.demoHint")}</p>
    </>
  );
}

export function RegisterForm() {
  const t = useTranslations();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(t.has(`errors.${result.error}`) ? t(`errors.${result.error}`) : t("errors.unexpected"));
      }
    });
  }

  return (
    <>
      <Header title={t("auth.registerTitle")} subtitle={t("auth.registerSubtitle")} />
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <FormError message={formError} />
        <FormField id="name" label={t("auth.name")} error={errors.name}>
          <Input id="name" autoComplete="name" value={values.name} onChange={set("name")} aria-invalid={!!errors.name || undefined} required autoFocus />
        </FormField>
        <FormField id="email" label={t("auth.email")} error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!errors.email || undefined} required />
        </FormField>
        <FormField id="password" label={t("auth.password")} error={errors.password} hint={t("auth.passwordHint")}>
          <PasswordInput id="password" value={values.password} onChange={(v) => setValues((s) => ({ ...s, password: v }))} invalid={!!errors.password} autoComplete="new-password" />
        </FormField>
        <Button type="submit" className="mt-2 h-10" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t("auth.register")}
        </Button>
      </form>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          {t("auth.login")}
        </Link>
      </p>
    </>
  );
}
