import { withSupabase } from "jsr:@supabase/server@1";
import webpush from "npm:web-push@3.6.7";

const origins = new Set(["https://zopathy.live", "https://zopathy.pages.dev"]);
function cors(req: Request) { const origin=req.headers.get("origin");return {"Access-Control-Allow-Origin": origins.has(origin||"")?origin!:"https://zopathy.live","Access-Control-Allow-Headers":"apikey,authorization,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin","Cache-Control":"no-store"}; }
function allowedEndpoint(value: string) { try {const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")&&/^(fcm\.googleapis\.com|[a-z0-9-]+\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/.test(u.hostname);} catch {return false;} }
async function serverKeys(db: any) {
 let {data,error}=await db.from("zopathy_push_keys").select("public_key,private_key").eq("id",true).maybeSingle();if(error)throw Error("Key storage unavailable");
 if(!data){const keys=webpush.generateVAPIDKeys();const insert=await db.from("zopathy_push_keys").insert({id:true,public_key:keys.publicKey,private_key:keys.privateKey});if(insert.error&&insert.error.code!=="23505")throw Error("Key storage unavailable");const row=await db.from("zopathy_push_keys").select("public_key,private_key").eq("id",true).single();if(row.error)throw Error("Key storage unavailable");data=row.data;}
 return data;
}
const authenticated=withSupabase({auth:"publishable"},async(req: Request,ctx: any)=>{
 const headers=cors(req),db=ctx.supabaseAdmin;const reply=(value: unknown,status=200)=>Response.json(value,{status,headers});
 try {
  if(req.method==="GET"&&new URL(req.url).searchParams.get("action")==="public-key"){const keys=await serverKeys(db);return reply({publicKey:keys.public_key});}
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  const raw=await req.text();if(raw.length>1024)return reply({error:"Invalid job"},400);let body;try{body=JSON.parse(raw);}catch{return reply({error:"Invalid job"},400);}
  if(!/^[a-f0-9-]{36}$/.test(body?.id||"")||!/^[a-f0-9]{64}$/.test(body?.token||""))return reply({error:"Invalid job"},403);
  // Only a private database-generated capability can authorize delivery.
  const {data:job,error:lookup}=await db.from("zopathy_push_jobs").select("id,recipient_id,sender_id,attempts,created_at,completed_at,claimed_at").eq("id",body.id).eq("token",body.token).maybeSingle();
  if(lookup)throw Error("Queue unavailable");if(!job)return reply({error:"Invalid job"},403);
  if(job.completed_at||job.claimed_at||job.attempts>=8||Date.now()-Date.parse(job.created_at)>86400000)return reply({ok:true,skipped:true});
  const claim=await db.from("zopathy_push_jobs").update({claimed_at:new Date().toISOString(),attempts:job.attempts+1}).eq("id",job.id).eq("token",body.token).is("completed_at",null).is("claimed_at",null).select("id");if(claim.error)throw Error("Queue unavailable");if(!claim.data?.length)return reply({ok:true,skipped:true});
  const subscriptions=await db.from("zopathy_push_devices").select("id,endpoint,p256dh,auth_key").eq("user_id",job.recipient_id).limit(10);if(subscriptions.error)throw Error("Devices unavailable");
  const keys=await serverKeys(db),payload=JSON.stringify({id:job.id,recipient:job.recipient_id,sender:job.sender_id});let failed=false,delivered=0;
  for(const device of subscriptions.data||[]){
   if(!allowedEndpoint(device.endpoint)){failed=true;continue;}
   try {await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth_key}},payload,{TTL:3600,timeout:10000,vapidDetails:{subject:"https://zopathy.live",publicKey:keys.public_key,privateKey:keys.private_key}});delivered++;}
   catch(error: any){if([404,410].includes(error?.statusCode)){await db.from("zopathy_push_devices").delete().eq("id",device.id).eq("user_id",job.recipient_id);}else failed=true;}
  }
  const finish=await db.from("zopathy_push_jobs").update(failed?{claimed_at:null,last_error:"Push provider temporarily unavailable"}:{completed_at:new Date().toISOString(),last_error:null}).eq("id",job.id);if(finish.error)throw Error("Queue unavailable");
  return reply({ok:!failed,delivered},failed?503:200);
 } catch {return reply({error:"Notification worker temporarily unavailable"},503);}
});
export default {fetch(req: Request){if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});const origin=req.headers.get("origin");if(origin&&!origins.has(origin))return Response.json({error:"Origin not allowed"},{status:403,headers:cors(req)});return authenticated(req);}};
