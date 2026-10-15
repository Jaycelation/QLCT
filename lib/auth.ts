import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import { HttpError } from './http';
export const hashToken=(value:string)=>createHash('sha256').update(value).digest('hex');
const cookieName=process.env.NODE_ENV==='production'?'__Host-finora':'finora';
export async function currentUser(){const token=(await cookies()).get(cookieName)?.value;if(!token)return null;const s=await db.session.findUnique({where:{id:hashToken(token)},include:{user:{select:{id:true,name:true,email:true}}}});return s&&s.expiresAt>new Date()?s.user:null;}
export async function requireUser(){const user=await currentUser();if(!user)throw new HttpError(401,'UNAUTHENTICATED');return user;}
export async function createSession(userId:string){const token=randomBytes(32).toString('base64url');const expiresAt=new Date(Date.now()+7*86400000);await db.session.create({data:{id:hashToken(token),userId,expiresAt}});(await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',expires:expiresAt});}
export async function logout(){const jar=await cookies();const token=jar.get(cookieName)?.value;if(token)await db.session.deleteMany({where:{id:hashToken(token)}});jar.delete(cookieName);}
// Atomic database-backed window shared across server instances. No raw emails in rate-limit storage.
export async function rateLimit(key:string,max:number){const now=new Date();const expires=new Date(+now+15*60000);const rows=await db.$queryRaw<{attempts:number}[]>`INSERT INTO "RateLimit" ("key","attempts","expiresAt") VALUES (${hashToken(key)},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "attempts"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."attempts"+1 END, "expiresAt"=CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${expires} ELSE "RateLimit"."expiresAt" END RETURNING "attempts"`;if(rows[0].attempts>max)throw new HttpError(429,'TOO_MANY_ATTEMPTS');}
