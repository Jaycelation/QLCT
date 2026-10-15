"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Laptop, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, updateProfileAction } from "@/actions/settings";
import { FormField } from "@/components/forms/form-field";
import { useSwitchLocale } from "@/components/layout/preferences-menu";
import { PageHeader } from "@/components/shared/page-header";
import { useMounted } from "@/components/shared/use-mounted";
import { useAction } from "@/components/shared/use-action";
import { fieldErrors as toFieldErrors, passwordChangeSchema, profileSchema, type FieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function SettingsView({ user }: { user: { name: string; email: string; currency: string } }) {
  const t = useTranslations("settings");
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ProfileCard user={user} />
      <PreferencesCard currency={user.currency} />
      <PasswordCard />
    </div>
  );
}

function ProfileCard({ user }: { user: { name: string; email: string } }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const { pending, run } = useAction();
  const [name, setName] = useState(user.name);
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse({ name });
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    run(() => updateProfileAction({ name }), { success: t("profileSaved"), onError: setErrors });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:max-w-md" noValidate>
          <FormField id="s-name" label={ta("name")} error={errors.name}>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
          </FormField>
          <FormField id="s-email" label={ta("email")} hint={t("emailReadonly")}>
            <Input id="s-email" value={user.email} readOnly disabled />
          </FormField>
          <div>
            <Button type="submit" disabled={pending || name.trim() === user.name}>
              {pending && <Loader2 className="animate-spin" />}
              {tc("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/8 text-primary" : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function PreferencesCard({ currency }: { currency: string }) {
  const t = useTranslations("settings");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { theme: rawTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const theme = mounted ? rawTheme : undefined;
  const { switchTo, pending } = useSwitchLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("preferences")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label>{t("language")}</Label>
          <div role="radiogroup" aria-label={t("language")} className={cn("grid grid-cols-2 gap-2 sm:max-w-md", pending && "opacity-60")}>
            <Choice active={locale === "vi"} onClick={() => switchTo("vi")}>
              🇻🇳 Tiếng Việt
            </Choice>
            <Choice active={locale === "en"} onClick={() => switchTo("en")}>
              🇬🇧 English
            </Choice>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t("theme")}</Label>
          <div role="radiogroup" aria-label={t("theme")} className="grid grid-cols-3 gap-2 sm:max-w-md">
            <Choice active={theme === "light"} onClick={() => setTheme("light")}>
              <Sun className="size-4" /> {tn("light")}
            </Choice>
            <Choice active={theme === "dark"} onClick={() => setTheme("dark")}>
              <Moon className="size-4" /> {tn("dark")}
            </Choice>
            <Choice active={theme === "system"} onClick={() => setTheme("system")}>
              <Laptop className="size-4" /> {tn("system")}
            </Choice>
          </div>
        </div>
        <div className="grid gap-1">
          <Label>{t("currency")}</Label>
          <p className="text-muted-foreground text-sm">{currency === "VND" ? "Việt Nam Đồng (₫, VND)" : currency}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const t = useTranslations("settings");
  const { pending, run } = useAction();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { currentPassword, newPassword };
    const parsed = passwordChangeSchema.safeParse(input);
    if (!parsed.success) return setErrors(toFieldErrors(parsed.error));
    setErrors({});
    run(() => changePasswordAction(input), {
      success: t("passwordChanged"),
      onSuccess: () => {
        setCurrent("");
        setNew("");
      },
      onError: setErrors,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("security")}</CardTitle>
        <CardDescription>{t("changePassword")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:max-w-md" noValidate>
          <FormField id="s-current" label={t("currentPassword")} error={errors.currentPassword}>
            <Input id="s-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
          </FormField>
          <FormField id="s-new" label={t("newPassword")} error={errors.newPassword}>
            <Input id="s-new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
          </FormField>
          <div>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {t("changePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
