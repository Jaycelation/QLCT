import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// A valid hash of a random string, compared against when the email is unknown so that
// login timing does not reveal which emails are registered.
const DUMMY_HASH = "$2b$12$sB5/tMdZ/NsLkPUDWZ6.iOA/YqxKmdFZ.JsG1z3GlvNqRwQQSmKZO";

export async function verifyAgainstDummy(password: string): Promise<false> {
  await bcrypt.compare(password, DUMMY_HASH);
  return false;
}
