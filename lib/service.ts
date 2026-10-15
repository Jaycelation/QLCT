import { Prisma } from '@prisma/client';
import { db } from './db';
import { accountSchema,budgetSchema,categorySchema,goalSchema,recurringSchema,transactionSchema } from './validation';
import { HttpError } from './http';
import { nextOccurrence,today } from './finance';
type Tx=Prisma.TransactionClient;
export async function verifyReferences(tx:Tx,userId:string,accountId:string,categoryId:string,type:string){const [a,c]=await Promise.all([tx.account.findFirst({where:{id:accountId,userId}}),tx.category.findFirst({where:{id:categoryId,userId,type}})]);if(!a||!c)throw new HttpError(404,'NOT_FOUND');}
export async function readFinance(userId:string){const [accounts,categories,transactions,budgets,goals,recurring]=await db.$transaction([db.account.findMany({where:{userId},orderBy:{name:'asc'}}),db.category.findMany({where:{userId},orderBy:{name:'asc'}}),db.transaction.findMany({where:{userId},orderBy:[{date:'desc'},{id:'desc'}]}),db.budget.findMany({where:{userId},orderBy:{month:'desc'}}),db.goal.findMany({where:{userId},orderBy:{deadline:'asc'}}),db.recurring.findMany({where:{userId},orderBy:{nextDate:'asc'}})]);return {accounts,categories,transactions,budgets,goals,recurring};}
export async function mutate(userId:string,resource:string,id:string|undefined,method:string,input:unknown){return db.$transaction(async tx=>{
const table=resource==='transactions'?tx.transaction:resource==='accounts'?tx.account:resource==='categories'?tx.category:resource==='budgets'?tx.budget:resource==='goals'?tx.goal:resource==='recurring'?tx.recurring:null;
if(!table)throw new HttpError(404,'NOT_FOUND');
// Every lookup and write is owner-scoped, including nested foreign keys.
if(method!=='POST'){if(!id)throw new HttpError(400,'ID_REQUIRED');const record=await (table.findFirst as Function)({where:{id,userId}});if(!record)throw new HttpError(404,'NOT_FOUND');}
if(method==='DELETE'){await (table.deleteMany as Function)({where:{id,userId}});return {ok:true}}
let data:Record<string,unknown>;
if(resource==='transactions'){const p=transactionSchema.parse(input);if(p.date>today())throw new HttpError(400,'FUTURE_DATE_USE_RECURRING');await verifyReferences(tx,userId,p.accountId,p.categoryId,p.type);data={...p,amount:BigInt(p.amount)};}
else if(resource==='recurring'){const p=recurringSchema.parse(input);await verifyReferences(tx,userId,p.accountId,p.categoryId,p.type);data={...p,amount:BigInt(p.amount),anchorDay:Number(p.nextDate.slice(8))};}
else if(resource==='accounts'){const p=accountSchema.parse(input);data={...p,openingBalance:BigInt(p.openingBalance)};}
else if(resource==='categories'){const p=categorySchema.parse(input);if(id){const used=await tx.transaction.count({where:{userId,categoryId:id}})+await tx.recurring.count({where:{userId,categoryId:id}})+await tx.budget.count({where:{userId,categoryId:id}});const old=await tx.category.findFirst({where:{id,userId}});if(used&&old?.type!==p.type)throw new HttpError(409,'CATEGORY_TYPE_IN_USE');}data=p;}
else if(resource==='budgets'){const p=budgetSchema.parse(input);if(p.categoryId&&!await tx.category.findFirst({where:{id:p.categoryId,userId,type:'EXPENSE'}}))throw new HttpError(404,'NOT_FOUND');data={...p,amount:BigInt(p.amount),scopeKey:p.categoryId??'ALL'};}
else{const p=goalSchema.parse(input);data={...p,target:BigInt(p.target),saved:BigInt(p.saved)};}
if(method==='POST')return (table.create as Function)({data:{...data,userId}});
return (table.updateMany as Function)({where:{id,userId},data});
},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
export async function processRecurring(userId:string,asOf=today()){let created=0;for(let attempt=0;attempt<3;attempt++){try{return await db.$transaction(async tx=>{created=0;const rules=await tx.recurring.findMany({where:{userId,active:true,nextDate:{lte:asOf}}});for(const r of rules){let next=r.nextDate;let count=0;while(next<=asOf&&count++<120){const occurrenceKey=r.id+':'+next;const made=await tx.transaction.createMany({data:[{userId,accountId:r.accountId,categoryId:r.categoryId,type:r.type,amount:r.amount,date:next,note:r.note,paymentMethod:r.paymentMethod,occurrenceKey}],skipDuplicates:true});created+=made.count;next=nextOccurrence(next,r.interval,r.anchorDay);}await tx.recurring.updateMany({where:{id:r.id,userId},data:{nextDate:next}});}return {created};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}catch(e){if(!(e instanceof Prisma.PrismaClientKnownRequestError)||e.code!=='P2034'||attempt===2)throw e}}return {created};}
