import { z } from "zod";
import {
  ACCOUNT_TYPES,
  CATEGORY_ICONS,
  FREQUENCIES,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
} from "./constants";
import { MAX_AMOUNT } from "./money";
import { parseDateOnly } from "./dates";

// Error messages are i18n keys under `validation.*`; the UI translates them.

const id = z.string().trim().min(1, "required").max(64, "invalid");
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalidColor");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .optional()
    .transform((v) => (v ? v : undefined));

export const dateOnly = z
  .string()
  .refine((v) => parseDateOnly(v) !== null, "invalidDate")
  .transform((v) => parseDateOnly(v)!);

const positiveAmount = z.coerce
  .number({ error: "invalidAmount" })
  .int("invalidAmount")
  .positive("amountPositive")
  .max(MAX_AMOUNT, "amountTooLarge");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  email: z.email("invalidEmail").trim().toLowerCase().max(254, "tooLong"),
  password: z
    .string()
    .min(8, "passwordTooShort")
    .max(128, "tooLong")
    .regex(/[A-Za-z]/, "passwordWeak")
    .regex(/[0-9]/, "passwordWeak"),
});

export const loginSchema = z.object({
  email: z.email("invalidEmail").trim().toLowerCase(),
  password: z.string().min(1, "required").max(128, "tooLong"),
});

export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: positiveAmount,
  date: dateOnly,
  accountId: id,
  categoryId: id,
  paymentMethod: z.enum(PAYMENT_METHODS),
  note: optionalText(500),
});
export type TransactionInput = z.input<typeof transactionSchema>;

export const transactionFilterSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  type: z.enum(TRANSACTION_TYPES).optional().catch(undefined),
  categoryId: z.string().max(64).optional().catch(undefined),
  accountId: z.string().max(64).optional().catch(undefined),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().catch(undefined),
  from: dateOnly.optional().catch(undefined),
  to: dateOnly.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(20).default(20),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).catch("date_desc").default("date_desc"),
});
export type TransactionFilter = z.output<typeof transactionFilterSchema>;

export const accountSchema = z.object({
  name: z.string().trim().min(1, "required").max(60, "tooLong"),
  type: z.enum(ACCOUNT_TYPES),
  initialBalance: z.coerce
    .number({ error: "invalidAmount" })
    .int("invalidAmount")
    .min(-MAX_AMOUNT, "amountTooLarge")
    .max(MAX_AMOUNT, "amountTooLarge"),
  color: hexColor,
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "required").max(40, "tooLong"),
  type: z.enum(TRANSACTION_TYPES),
  icon: z.enum(CATEGORY_ICONS),
  color: hexColor,
});

export const budgetSchema = z.object({
  categoryId: z
    .string()
    .max(64)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  amount: positiveAmount,
  alertThreshold: z.coerce.number().int().min(1, "invalidThreshold").max(100, "invalidThreshold"),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  targetAmount: positiveAmount,
  deadline: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = parseDateOnly(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "invalidDate" });
        return z.NEVER;
      }
      return d;
    }),
  color: hexColor,
  icon: z.enum(CATEGORY_ICONS),
});

export const contributionSchema = z.object({
  goalId: id,
  amount: positiveAmount,
  direction: z.enum(["deposit", "withdraw"]),
  date: dateOnly,
  note: optionalText(200),
});

export const recurringSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: positiveAmount,
    accountId: id,
    categoryId: id,
    paymentMethod: z.enum(PAYMENT_METHODS),
    note: optionalText(500),
    frequency: z.enum(FREQUENCIES),
    interval: z.coerce.number().int().min(1, "invalidInterval").max(365, "invalidInterval"),
    startDate: dateOnly,
    endDate: z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (!v) return null;
        const d = parseDateOnly(v);
        if (!d) {
          ctx.addIssue({ code: "custom", message: "invalidDate" });
          return z.NEVER;
        }
        return d;
      }),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: "endBeforeStart", path: ["endDate"] });

export const profileSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "required").max(128),
    newPassword: registerSchema.shape.password,
  })
  .refine((v) => v.currentPassword !== v.newPassword, { message: "passwordSame", path: ["newPassword"] });

export type FieldErrors = Record<string, string>;

/** Flattens a Zod error into `{ field: messageKey }` (first issue per field). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
