// A small History API adapter around the existing page state and loaders.
const routing={ready:false,applying:false,sequence:0,initial:null,lastURL:'',snapshot:null,pending:null,scrollPositions:new Map()};
const routePages={home:'home',explore:'explore',search:'discover',groups:'groups',friends:'friends',messages:'messages',bookmarks:'bookmarks',history:'history',create:'studio',profile:'profile',settings:'settings',admin:'admin',account:'account'};
const routeUUID=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value||'');
function parseRoute(url){let parts;try{parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);}catch{return {page:'not-found'};}const q=url.searchParams,path=(q.get('path')||'').split(',').filter(routeUUID).slice(0,32),source=q.get('feed')==='following'?'following':'for-you';
 if(!parts.length||parts[0]==='index.html'){if(q.has('group'))return {page:'group',group:q.get('group')};if(routeUUID(q.get('post')))return {page:q.get('view')==='explore'?'explore':'home',post:q.get('post'),path,source};if(['home','explore'].includes(q.get('view')))return {page:q.get('view'),source};return null;}
 if(parts.length===1&&/^@[a-z0-9_]{3,24}$/i.test(parts[0]))return {page:'member',handle:parts[0].slice(1).toLowerCase()};
 if(parts[0]==='u'&&parts.length===2&&/^[a-z0-9_]{3,24}$/i.test(parts[1]))return {page:'member',handle:parts[1].toLowerCase()};
 if(parts[0]==='users'&&parts.length===2&&routeUUID(parts[1]))return {page:'member',member:parts[1]};
 if(parts[0]==='post'&&parts.length===2&&routeUUID(parts[1]))return {page:'home',post:parts[1],path,source};
 if(parts[0]==='groups'&&parts.length===2&&(/^[a-z0-9][a-z0-9-]{2,47}$/.test(parts[1])||routeUUID(parts[1])))return {page:'group',group:parts[1]};
 if(parts[0]==='explore'&&parts.length===2&&routeUUID(parts[1]))return {page:'explore',post:parts[1],path,source};
 if(parts[0]==='messages'&&parts.length===2&&routeUUID(parts[1]))return {page:'messages',target:parts[1]};
 if(parts.length===1&&routePages[parts[0]])return {page:routePages[parts[0]],source,query:q.get('q')||'',mode:['signup','recover'].includes(q.get('mode'))?q.get('mode'):'signin'};
 return {page:'not-found'};
}
function routePrime(){routing.initial=parseRoute(new URL(location.href));if(routing.initial)browsing.explicit=true;}
function routeSnapshot(){return {root:state.rootPostId,path:[...state.path],source:state.tab,post:state.routePostId||null,homePosition:browsing.homePosition?{...browsing.homePosition}:null,scroll:window.scrollY||0};}
function routeURL(){const params=new URLSearchParams();let path='/'+(Object.keys(routePages).find(k=>routePages[k]===state.page)||'home');
 if(state.page==='member')path=state.memberRow?.username?'/u/'+encodeURIComponent(state.memberRow.username):'/users/'+encodeURIComponent(social.authorId||'');
 if(state.page==='group')path='/groups/'+encodeURIComponent(groups.current?.slug||groups.id||'');
 if(state.page==='messages'&&community.target)path+='/'+encodeURIComponent(community.target);
 if(state.page==='account'&&authMode!=='signin'&&authMode!=='update-password')params.set('mode',authMode);
 if(state.page==='not-found')return location.pathname+location.search;
 if(state.page==='discover'&&state.search)params.set('q',state.search);
 if(['home','explore'].includes(state.page)){if(state.page==='explore'&&state.rootPostId)path='/explore/'+state.rootPostId;else if(state.page==='home'&&state.routePostId)path='/post/'+state.routePostId;if((state.page==='explore'||state.routePostId)&&state.path.length)params.set('path',state.path.join(','));if(state.tab==='following')params.set('feed','following');}
 return path+(params.size?'?'+params.toString():'');
}
function routeSync(){if(!routing.ready||routing.applying||!window.history?.pushState)return;const next=routeURL(),snapshot=routeSnapshot();if(routing.pending&&!authUser&&state.page==='account')return;const previous=routing.lastURL;
 if(next!==previous){if(previous&&routing.snapshot){window.history.replaceState({zopathy:{...routing.snapshot,scroll:window.scrollY||0}},'',previous);}const oldPage=parseRoute(new URL(previous||'/home',location.origin))?.page,replace=!previous||!routing.pushNext&&oldPage===state.page&&['home','explore','discover','member','group','account'].includes(state.page)&&!(state.page==='home'&&next.split('?')[0]!==previous.split('?')[0]);window.history[replace?'replaceState':'pushState']({zopathy:snapshot},'',next);routing.lastURL=next;routing.pushNext=false;}
 else window.history.replaceState({zopathy:snapshot},'',next);
 routing.snapshot=snapshot;document.title=(state.page==='member'&&state.memberRow?.display_name?state.memberRow.display_name+' · ':state.page==='home'?'':state.page==='explore'?'Explore · ':state.page==='not-found'?'Page not found · ':state.page[0].toUpperCase()+state.page.slice(1)+' · ')+'Zopathy';
}
async function routeApply(route,saved=null){const seq=++routing.sequence;closeDialog();routing.applying=true;browsing.explicit=true;browseInvalidate();social.authorId=null;groups.detailSeq++;state.routePostId=null;state.memberRow=null;state.memberError=false;state.path=[];state.why=false;state.trail=false;state.tab=route.source||saved?.source||'for-you';
 try{if(['profile','friends','messages','bookmarks','history','studio','admin'].includes(route.page)&&!authUser){routing.pending=route;state.page='account';authMode='signin';authNotice='Sign in to open this page.';render();return;}
  if(route.page==='member'){let id=route.member;if(!id){const row=await result(authClient.from('zopathy_profiles').select('id').eq('username',route.handle).maybeSingle());if(seq!==routing.sequence)return;if(!row?.id){state.page='not-found';render();return;}id=row.id;}await socialAuthor(id);}
  else if(route.page==='group')await openGroup(route.group);
  else if(route.page==='messages'){state.page='messages';community.target=null;if(route.target)await openDM(route.target);else{render();await loadCommunity();}}
  else if(route.page==='groups'){state.page='groups';render();await loadGroupDirectory();}
  else if(route.page==='friends'){state.page='friends';render();await loadCommunity();}
  else if(route.page==='discover'){state.page='discover';state.search=String(route.query||'').slice(0,100);if(state.search)await socialSearch(state.search);else render();}
  else if(['home','explore'].includes(route.page)){const id=route.post||saved?.root;if(id&&routeUUID(id)){if(!getPost(id)){const row=await result(authClient.from('zopathy_posts').select(postSelect).eq('id',id).is('deleted_at',null).maybeSingle());if(seq!==routing.sequence)return;if(!row?.id){state.page='not-found';render();return;}customPosts.push(...await mapSocialRows([row]));}if(seq!==routing.sequence)return;state.focusPost=route.post?id:null;state.rootPostId=id;state.routePostId=route.page==='home'&&route.post?id:null;state.rootIndex=Math.max(0,roots().indexOf(id));const requested=route.path?.length?route.path:saved?.path||[],missing=requested.filter(p=>!getPost(p));if(missing.length){const rows=await result(authClient.from('zopathy_posts').select(postSelect).in('id',missing).is('deleted_at',null));if(seq!==routing.sequence)return;customPosts.push(...await mapSocialRows(rows));}if(seq!==routing.sequence)return;state.path=requested.filter(p=>p!==id&&getPost(p));}else{state.focusPost=null;state.rootPostId=null;state.rootIndex=0;}browseSetDestination(route.page);browsing.homePosition=saved?.homePosition||null;render();}
  else{state.page=route.page;if(route.page==='account')authMode=route.mode||'signin';render();if(route.page==='admin'&&adminAccess())await loadAdmin();}
 }catch{if(seq===routing.sequence){state.page='not-found';render();toast('This page could not load. Please try again.');}}
 finally{if(seq===routing.sequence){routing.applying=false;routing.lastURL='';routeSync();if(saved?.scroll!==undefined)window.requestAnimationFrame(()=>window.scrollTo({top:saved.scroll,behavior:'instant'}));else if(state.page==='home'&&route.post)document.querySelector('.feed-entry[data-root="'+route.post+'"]')?.scrollIntoView({block:'start'});else window.scrollTo({top:0,behavior:'instant'});}}
}
async function routeInitialize(){if(routing.ready)return;routing.ready=true;if(routing.initial)await routeApply(routing.initial);else routeSync();}
async function routeAfterSignIn(){const pending=routing.pending;routing.pending=null;if(pending)await routeApply(pending);else state.page='profile';}
function renderNotFound(){return header('Page not found')+'<div class="page-content"><p class="page-lead">This page, profile, or post is unavailable.</p><button class="primary" data-page="home">Go to Home</button></div>';}
window.addEventListener('popstate',event=>{if(!routing.ready)return;const route=parseRoute(new URL(location.href))||{page:'home'};routeApply(route,event.state?.zopathy||null);});
document.addEventListener('click',event=>{const target=event.target.closest('[data-page],.logo,[data-browse-home]');if(!target)return;state.routePostId=null;routing.pending=null;if(routing.applying){routing.sequence++;routing.applying=false;}},true);
