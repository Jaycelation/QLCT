import { requireUser } from '@/lib/auth';
import { body,checkOrigin,failure,HttpError,json } from '@/lib/http';
import { mutate,processRecurring,readFinance } from '@/lib/service';
import { db } from '@/lib/db';
import { csv } from '@/lib/finance';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{path?:string[]}>};
export async function GET(req:Request,{params}:Context){try{const u=await requireUser();const {path=[]}=await params;if(!path.length)return json(await readFinance(u.id));if(path[0]==='export'){const url=new URL(req.url);const from=url.searchParams.get('from')??'0000-01-01';const to=url.searchParams.get('to')??'9999-12-31';const rows=await db.transaction.findMany({where:{userId:u.id,date:{gte:from,lte:to}},include:{category:true,account:true},orderBy:{date:'desc'}});return new Response(csv([['Date','Type','Amount (VND)','Category','Account','Payment method','Note'],...rows.map(t=>[t.date,t.type,t.amount,t.category.name,t.account.name,t.paymentMethod,t.note])]),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="finora-transactions.csv"','Cache-Control':'no-store'}})}throw new HttpError(404,'NOT_FOUND')}catch(e){return failure(e)}}
async function write(req:Request,{params}:Context){try{checkOrigin(req);const u=await requireUser();const {path=[]}=await params;if(path[0]==='process-recurring'&&req.method==='POST')return json(await processRecurring(u.id));if(path.length>2)throw new HttpError(404,'NOT_FOUND');if(req.method==='POST'&&path[1])throw new HttpError(400,'INVALID_INPUT');return json(await mutate(u.id,path[0],path[1],req.method,req.method==='DELETE'?{}:await body(req)),req.method==='POST'?201:200)}catch(e){return failure(e)}}
export const POST=write;export const PATCH=write;export const DELETE=write;
