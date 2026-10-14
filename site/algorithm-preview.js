/* One queued server preview at a time; superseded responses never paint. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZopathyAlgorithmPreview=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function create(request,paint,delay=650){let revision=0,timer=null,running=false,pending=null,stopped=false;
  async function pump(){if(running||!pending||stopped)return;const job=pending;pending=null;running=true;try{const value=await request(job.config);if(!stopped&&job.revision===revision)paint({value,loading:false,error:null});}catch(error){if(!stopped&&job.revision===revision)paint({value:null,loading:false,error});}finally{running=false;if(pending&&!timer&&!stopped)pump();}}
  return {update(config,immediate=false){stopped=false;revision++;clearTimeout(timer);pending={config:JSON.parse(JSON.stringify(config)),revision};paint({loading:true,error:null});timer=setTimeout(()=>{timer=null;pump();},immediate?0:delay);},cancel(){revision++;stopped=true;pending=null;clearTimeout(timer);timer=null;}};
 }
 return {create};
});
