// Shared browsing adapter. Existing renderers and Supabase history remain authoritative.
// State is session-only: this module never writes account data or local storage.
const browsing={revision:0,destination:'home',renderedPage:null,homePosition:null,explicit:false,initialApplied:false};
function browseInvalidate(){browsing.revision++}
function browseReset(){
 browseInvalidate();browsing.destination='home';browsing.homePosition=null;browsing.renderedPage=null;browsing.initialApplied=false;
 state.rootPostId=null;state.rootIndex=0;state.path=[];
 if(typeof immersive!=='undefined'){immersive.preloaded.clear();immersive.images=[];immersive.wheelTime=0;immersive.wheelConsumed=false;}
}
function browseRootId(){
 const list=roots();
 if(!list.length){
  if(state.rootPostId){browseInvalidate();state.path=[]}
  state.rootPostId=null;state.rootIndex=0;return undefined;
 }
 const previous=state.rootPostId,index=previous?list.indexOf(previous):-1;
 state.rootIndex=index>=0?index:Math.max(0,Math.min(state.rootIndex,list.length-1));
 state.rootPostId=list[state.rootIndex];
 // A removed/filtered root must not attach its path to a different post.
 if(previous&&previous!==state.rootPostId){browseInvalidate();state.path=[];state.trail=false;state.why=false}
 return state.rootPostId;
}
function browseContext(){
 const root=browseRootId();
 return {source:state.tab,rootPostId:root||null,activePostId:state.path.at(-1)||root||null,
  path:[...state.path],feedPosition:state.rootIndex,destination:browsing.destination,
  homePosition:browsing.homePosition?{...browsing.homePosition}:null};
}
function browseSelectSource(source){
 if(!['for-you','following'].includes(source)||source===state.tab)return false;
 remember();browseInvalidate();state.tab=source;state.focusPost=null;state.rootPostId=null;
 state.rootIndex=0;state.path=[];state.trail=false;state.why=false;browsing.homePosition=null;
 browseRootId();return true;
}
function browsePauseMedia(container){
 for(const media of container?.querySelectorAll?.('video,audio')||[])media.pause();
}
function browseSaveHomePosition(){
 const anchor=visibleFeedRoot(),entry=anchor?$('.feed-entry[data-root="'+anchor+'"]'):null;
 browsing.homePosition={rootPostId:anchor||null,offset:entry?.getBoundingClientRect().top??0,
  scrollY:Math.max(0,window.scrollY||0)};
}
function browseRestoreHomePosition(){
 const position=browsing.homePosition;if(!position)return;
 const revision=browsing.revision;
 const restore=()=>{
  if(state.page!=='home'||revision!==browsing.revision)return;
  const entry=position.rootPostId?$('.feed-entry[data-root="'+position.rootPostId+'"]'):null;
  const top=entry?Math.max(0,(window.scrollY||0)+entry.getBoundingClientRect().top-position.offset):position.scrollY;
  window.scrollTo({top,behavior:'instant'});
 };
 if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(restore);else restore();
}
function browseSetDestination(destination){
 if(!['home','explore'].includes(destination))return false;
 // A state-only API: the destination renderer owns rendering and its controls.
 // Explore is not exposed in navigation until its dedicated viewer is implemented.
 if(state.page===destination&&browsing.destination===destination)return true;
 if(state.page==='home')browseSaveHomePosition();
 browsePauseMedia($('#main'));browseInvalidate();state.page=destination;browsing.destination=destination;
 return true;
}
function browsePrepareRender(){
 const previous=browsing.renderedPage;
 browsing.animateDestination=["home","explore"].includes(previous)&&["home","explore"].includes(state.page)&&previous!==state.page;
 if(previous!==null&&previous!==state.page){
  if(previous==='home')browseSaveHomePosition();
  browsePauseMedia($('#main'));browseInvalidate();
 }
 if(['home','explore'].includes(state.page))browsing.destination=state.page;
 browsing.renderedPage=state.page;
 return previous!==null&&previous!=='home'&&state.page==='home';
}
function browseMenu(){
 openDialog('<h2>More on Zopathy</h2><p class="intro">Your conversations, saved posts, and creative tools.</p><nav class="browse-menu" aria-label="All destinations">'+navigation.map(([page,ic,label])=>'<button class="secondary-btn" data-page="'+page+'">'+icon(ic)+'<span>'+esc(label)+'</span></button>').join('')+'</nav>');
}
function browsePreferenceSetting(){
 const ready=!!authUser&&social.browsePreferenceReady;
 return '<section class="browse-preference settings-row"><div><h3>Start browsing in</h3><p>'+(!authUser?'Sign in to sync this preference.':ready?'Your preferred starting view syncs across devices. Post links and your navigation take priority.':'Account sync needs the prepared browsing-preference database update.')+'</p></div><select id="browse-destination" aria-label="Preferred initial browsing destination" '+(!ready?'disabled':'')+'><option value="home" '+(prefs.browseDestination==='home'?'selected':'')+'>Home</option><option value="explore" '+(prefs.browseDestination==='explore'?'selected':'')+'>Explore</option></select></section>';
}
function browseApplyInitialDestination(renderView=true){
 if(browsing.initialApplied)return;browsing.initialApplied=true;if(routing.initial&&!routing.ready)return;
 const url=new URL(location.href);
 if(browsing.explicit||state.page!=='home'||url.searchParams.has('post')||url.searchParams.has('group'))return;
 const view=url.searchParams.get('view'),destination=['home','explore'].includes(view)?view:(prefs.browseDestination==='explore'?'explore':'home');
 browseSetDestination(destination);if(renderView)render();
}
function browseApplyExplicitView(){
 const url=new URL(location.href);if(url.searchParams.has('group'))return;
 const destination=url.searchParams.get('view');if(!['home','explore'].includes(destination))return;
 // Post links have already loaded through the existing deep-link loader.
 browsing.explicit=true;browseSetDestination(destination);render();
}
function browseAnimateDestination(){
 browsing.destinationMotion?.cancel();browsing.destinationMotion=null;
 if(!browsing.animateDestination||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const content=state.page==='explore'?$('.explore-workspace'):$('.timeline');
 if(typeof content?.animate==='function'){
  const motion=content.animate([{opacity:.3,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:250,easing:'cubic-bezier(.22,.61,.36,1)'});
  browsing.destinationMotion=motion;motion.finished.catch(()=>{});
 }
 browsing.animateDestination=false;
}
document.addEventListener('change',event=>{if(event.target.id==='browse-destination')socialSavePreferences({browseDestination:event.target.value})});

function browseMoreMenu(){
 openDialog('<h2>More on Zopathy</h2><p class="intro">Your friends and saved conversations.</p><nav class="browse-menu" aria-label="More destinations">'+navigation.filter(([page])=>['friends','bookmarks','history'].includes(page)).map(([page,ic,label])=>'<button class="secondary-btn" data-page="'+page+'">'+icon(ic)+'<span>'+esc(label)+'</span></button>').join('')+'</nav>');
}
