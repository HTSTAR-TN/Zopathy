/* Phase 2 adapter only; not loaded by the live site until a later UI phase. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZopathyAlgorithmAccount=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const PRESETS=['balanced','latest','following','discovery'];
 function createStore(client,getUser,ranking){let generation=0,loadSequence=0;const listeners=new Set(),busy=new Set(),retryIds=new Map();let state={owner:null,ready:false,loading:false,rows:[],active:null,error:''};const clone=v=>JSON.parse(JSON.stringify(v)),identity=()=>getUser()?.id||null;
  function notify(){const snapshot=clone(state);for(const listener of listeners)listener(snapshot);}
  function reset(){generation++;loadSequence++;state={owner:identity(),ready:false,loading:false,rows:[],active:null,error:''};busy.clear();retryIds.clear();notify();}
  function owner(){const id=identity();if(state.owner!==id)reset();if(!id)throw Error('Sign in to manage algorithms.');return id;}
  function current(id,revision){return identity()===id&&state.owner===id&&generation===revision;}
  async function result(query){const response=await query;if(response.error)throw response.error;return response.data;}
  async function load(){const id=owner(),revision=generation,sequence=++loadSequence;state.loading=true;state.error='';notify();try{const [rows,active]=await Promise.all([result(client.from('zopathy_algorithms').select('id,name,config,created_at,updated_at').order('created_at',{ascending:false}).order('id',{ascending:false})),result(client.rpc('zopathy_algorithm_active_v1'))]);if(!current(id,revision)||sequence!==loadSequence)return null;state.rows=rows||[];state.active=active;state.ready=true;return clone(state);}catch(error){if(current(id,revision)&&sequence===loadSequence)state.error='Your algorithms could not load. Please try again.';throw error;}finally{if(current(id,revision)&&sequence===loadSequence){state.loading=false;notify();}}}
  function name(value){if(typeof value!=='string'||[...value.trim()].length<1||[...value.trim()].length>50)throw Error('Use a name between 1 and 50 characters.');return value.trim();}
  function id(value){if(!ID.test(value||''))throw Error('Invalid algorithm ID.');return value;}
  function configuration(value){const c=ranking.config(value);if(new TextEncoder().encode(JSON.stringify(c)).length>8000)throw Error('Algorithm configuration is too large.');return c;}
  async function mutate(action,args={},requestId){const own=owner(),revision=generation,key=action+':'+(args.p_id||'');if(busy.has(key))throw Error('That algorithm change is already saving.');const create=['create','copy_preset','duplicate'].includes(action),retryKey=JSON.stringify([action,args]);if(create){args.p_new_id=requestId?id(requestId):retryIds.get(retryKey)||crypto.randomUUID();retryIds.set(retryKey,args.p_new_id);if(retryIds.size>50)retryIds.delete(retryIds.keys().next().value);}busy.add(key);state.error='';try{const row=await result(client.rpc('zopathy_algorithm_write_v1',{p_action:action,...args}));if(!current(own,revision))return null;loadSequence++;await load();if(!current(own,revision))return null;if(create)retryIds.delete(retryKey);return row;}catch(error){if(current(own,revision)){state.error=error.code==='42501'?'This algorithm is unavailable for your account.':'The change could not be confirmed. Retry or refresh your algorithms.';notify();}throw error;}finally{if(current(own,revision))busy.delete(key);}}
  return {load,reset,subscribe(fn){listeners.add(fn);fn(clone(state));return()=>listeners.delete(fn);},getState(){if(state.owner!==identity())reset();return clone(state);},
   create:(n,c={},requestId)=>mutate('create',{p_name:name(n),p_config:configuration(c)},requestId),
   copyPreset:(p,n,requestId)=>{if(!PRESETS.includes(p))throw Error('Unknown preset.');return mutate('copy_preset',{p_preset:p,p_name:name(n)},requestId);},
   duplicate:(source,n,requestId)=>mutate('duplicate',{p_id:id(source),p_name:name(n)},requestId),
   rename:(target,n)=>mutate('rename',{p_id:id(target),p_name:name(n)}),
   edit:(target,n,c)=>mutate('edit',{p_id:id(target),p_name:name(n),p_config:configuration(c)}),
   restoreDefaults:(target,p='balanced')=>{if(!PRESETS.includes(p))throw Error('Unknown preset.');return mutate('reset',{p_id:id(target),p_preset:p});},
   remove:target=>mutate('delete',{p_id:id(target)}),activate:target=>mutate('activate',{p_id:id(target)}),
   activatePreset:p=>{if(!PRESETS.includes(p))throw Error('Unknown preset.');return mutate('activate_preset',{p_preset:p});}
  };
 }
 return {createStore};
});
