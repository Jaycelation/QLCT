import { prisma } from "@/lib/db";
import { provisionNewUser } from "@/server/categories";

let counter = 0;

/** Creates a fresh user with default categories and a cash account. */
export async function createUser(name = "User") {
  counter += 1;
  const user = await prisma.user.create({
    data: { email: `${name.toLowerCase()}-${Date.now()}-${counter}@test.local`, name, passwordHash: "x" },
  });
  await provisionNewUser(user.id);
  const [account, food, salary] = await Promise.all([
    prisma.account.findFirstOrThrow({ where: { userId: user.id } }),
    prisma.category.findFirstOrThrow({ where: { userId: user.id, key: "food" } }),
    prisma.category.findFirstOrThrow({ where: { userId: user.id, key: "salary" } }),
  ]);
  return { user, account, food, salary };
}

export async function resetDb() {
  await prisma.user.deleteMany();
}
