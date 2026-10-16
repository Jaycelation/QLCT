import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type AppLocale } from "@/lib/constants";

export function resolveLocale(value: string | undefined): AppLocale {
  return LOCALES.includes(value as AppLocale) ? (value as AppLocale) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);
  return {
    locale,
    timeZone: process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
