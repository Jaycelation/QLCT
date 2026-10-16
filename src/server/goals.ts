import "server-only";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { formatDateOnly, today as todayDate } from "@/lib/dates";
import { computeGoalProgress, type GoalProgress } from "@/lib/finance";
import { toBigInt, toNumber } from "@/lib/money";
import type { contributionSchema, goalSchema } from "@/lib/validation";
import { ConflictError, NotFoundError } from "./errors";

type GoalData = z.output<typeof goalSchema>;
type ContributionData = z.output<typeof contributionSchema>;

export interface GoalRow extends GoalProgress {
  id: string;
  name: string;
  color: string;
  icon: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  deadline: string | null;
  createdAt: string;
  contributions: { id: string; amount: number; date: string; note: string | null }[];
}

export async function listGoals(userId: string, now = todayDate()): Promise<GoalRow[]> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    include: { contributions: { orderBy: [{ date: "desc" }, { createdAt: "desc" }] } },
    orderBy: [{ status: "asc" }, { deadline: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  return goals.map((g) => {
    const saved = g.contributions.reduce((s, c) => s + toNumber(c.amount), 0);
    return {
      id: g.id,
      name: g.name,
      color: g.color,
      icon: g.icon,
      status: g.status,
      deadline: g.deadline ? formatDateOnly(g.deadline) : null,
      createdAt: g.createdAt.toISOString(),
      contributions: g.contributions.map((c) => ({
        id: c.id,
        amount: toNumber(c.amount),
        date: formatDateOnly(c.date),
        note: c.note,
      })),
      ...computeGoalProgress(toNumber(g.targetAmount), saved, g.deadline, now),
    };
  });
}

async function findGoal(userId: string, id: string) {
  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw new NotFoundError("goal");
  return goal;
}

async function savedAmount(goalId: string) {
  const agg = await prisma.goalContribution.aggregate({ where: { goalId }, _sum: { amount: true } });
  return toNumber(agg._sum.amount);
}

async function syncStatus(goalId: string) {
  const goal = await prisma.savingsGoal.findUniqueOrThrow({ where: { id: goalId } });
  if (goal.status === "ARCHIVED") return;
  const saved = await savedAmount(goalId);
  const status = saved >= toNumber(goal.targetAmount) ? "COMPLETED" : "ACTIVE";
  if (status !== goal.status) await prisma.savingsGoal.update({ where: { id: goalId }, data: { status } });
}

export async function createGoal(userId: string, data: GoalData) {
  return prisma.savingsGoal.create({
    data: { userId, name: data.name, targetAmount: toBigInt(data.targetAmount), deadline: data.deadline, color: data.color, icon: data.icon },
  });
}

export async function updateGoal(userId: string, id: string, data: GoalData) {
  await findGoal(userId, id);
  await prisma.savingsGoal.update({
    where: { id },
    data: { name: data.name, targetAmount: toBigInt(data.targetAmount), deadline: data.deadline, color: data.color, icon: data.icon },
  });
  await syncStatus(id);
}

export async function setGoalArchived(userId: string, id: string, archived: boolean) {
  await findGoal(userId, id);
  await prisma.savingsGoal.update({ where: { id }, data: { status: archived ? "ARCHIVED" : "ACTIVE" } });
  if (!archived) await syncStatus(id);
}

export async function deleteGoal(userId: string, id: string) {
  const { count } = await prisma.savingsGoal.deleteMany({ where: { id, userId } });
  if (count === 0) throw new NotFoundError("goal");
}

export async function addContribution(userId: string, data: ContributionData) {
  const goal = await findGoal(userId, data.goalId);
  if (goal.status === "ARCHIVED") throw new ConflictError("goalArchived");
  const signed = data.direction === "withdraw" ? -data.amount : data.amount;
  if (signed < 0 && (await savedAmount(goal.id)) + signed < 0) throw new ConflictError("withdrawTooLarge");
  await prisma.goalContribution.create({
    data: { goalId: goal.id, amount: toBigInt(signed), date: data.date, note: data.note ?? null },
  });
  await syncStatus(goal.id);
}

export async function deleteContribution(userId: string, contributionId: string) {
  // Ownership is checked through the parent goal.
  const c = await prisma.goalContribution.findFirst({ where: { id: contributionId, goal: { userId } } });
  if (!c) throw new NotFoundError("contribution");
  if ((await savedAmount(c.goalId)) - toNumber(c.amount) < 0) throw new ConflictError("withdrawTooLarge");
  await prisma.goalContribution.delete({ where: { id: c.id } });
  await syncStatus(c.goalId);
}

export async function goalsSummary(userId: string) {
  const [contrib, goals] = await Promise.all([
    prisma.goalContribution.aggregate({ where: { goal: { userId, status: { not: "ARCHIVED" } } }, _sum: { amount: true } }),
    prisma.savingsGoal.groupBy({ by: ["status"], where: { userId }, _count: { _all: true }, _sum: { targetAmount: true } }),
  ]);
  const active = goals.filter((g) => g.status !== "ARCHIVED");
  return {
    saved: toNumber(contrib._sum.amount),
    target: active.reduce((s, g) => s + toNumber(g._sum.targetAmount), 0),
    activeCount: goals.find((g) => g.status === "ACTIVE")?._count._all ?? 0,
    completedCount: goals.find((g) => g.status === "COMPLETED")?._count._all ?? 0,
  };
}
