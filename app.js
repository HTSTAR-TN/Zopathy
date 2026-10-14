const $=s=>document.querySelector(s);
const icon=(name,extra='')=>`<svg ${extra}><use href="#i-${name}"/></svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(accountStorageKey(key)))??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(accountStorageKey(key),JSON.stringify(value))}catch{toast('Browser storage is unavailable. Changes will last for this visit.')}};
let state={page:'home',tab:'for-you',rootPostId:null,rootIndex:0,path:[],trail:false,why:false,transition:'',search:''};
let prefs=read('preferences',{saveHistory:true}),history=[],paths={},likes=[],bookmarks=[],reposts=[],comments={},following=[],profile=normalizeProfile(profileDefaults);
prefs={saveHistory:true,siteTheme:'red',browseDestination:'home',...prefs};if(!['red','teal'].includes(prefs.siteTheme))prefs.siteTheme='red';
function applySiteTheme(){document.documentElement.dataset.siteTheme=prefs.siteTheme}
function setSiteTheme(theme){if(['red','teal'].includes(theme))socialSavePreferences({siteTheme:theme})}
function siteThemePicker(){return '<div class="site-theme-options" role="group" aria-label="Site color theme">'+[['red','Red','#FF455C'],['teal','Teal','#55E6CE']].map(([id,name,color])=>'<button data-site-theme="'+id+'" class="site-theme-option '+(prefs.siteTheme===id?'selected':'')+'" aria-pressed="'+(prefs.siteTheme===id)+'"><span class="theme-preview '+id+'"><i style="background:'+color+'"></i><i></i><i></i></span><strong>'+name+'</strong>'+(prefs.siteTheme===id?'<span class="theme-selected-mark">\u2713</span>':'')+'</button>').join('')+'</div>'}
const themes={fern:{accent:'#ccf78b',banner:'radial-gradient(ellipse at 20% 30%,#b1ca77,transparent 48%),radial-gradient(ellipse at 80% 90%,#6d8a5b,transparent 58%),#304b3b'},lavender:{accent:'#c6afff',banner:'radial-gradient(ellipse at 20% 30%,#9e80cc,transparent 48%),radial-gradient(ellipse at 80% 90%,#7a559e,transparent 58%),#343052'},sunset:{accent:'#ffc394',banner:'radial-gradient(ellipse at 20% 30%,#e4ae81,transparent 48%),radial-gradient(ellipse at 80% 90%,#a44f59,transparent 58%),#56363b'}};
let edges={},customPosts=[];
const allPosts=()=>customPosts;
const getPost=id=>customPosts.find(p=>p.id===id);
function roots(){return socialRoots()}
function rootId(){return browseRootId()}
function currentId(){return state.path.at(-1)||rootId()}
function current(){return getPost(currentId())}
function related(id=currentId()){return socialRelated(id)}
function remember(){socialRemember()}
function goDeeper(to){socialExplore(to)}
function back(){browseInvalidate();if(!state.path.length)return;state.path.pop();state.why=false;state.transition='slide-back';renderAnchoredFeed()}
function returnMainFeed(){browseInvalidate();if(!state.path.length)return;state.path=[];state.trail=false;state.why=false;state.transition='';renderAnchoredFeed()}
function moveFeed(step){const list=roots();if(!list.length)return;rootId();const next=Math.max(0,Math.min(list.length-1,state.rootIndex+step));activateFeedRoot(list[next]);render();$('.feed-entry[data-root="'+rootId()+'"]')?.scrollIntoView({behavior:'smooth',block:'start'})}
function openRoot(id){state.routePostId=id;browsing.explicit=true;browseInvalidate();browsing.homePosition=null;groupLeaveURL(id);state.focusPost=id;state.rootPostId=null;state.tab='for-you';const list=roots();const idx=list.indexOf(id);state.rootIndex=idx<0?0:idx;state.rootPostId=idx<0?null:id;state.path=idx<0?[id]:[];state.page='home';state.trail=false;state.why=false;state.transition='slide-next';render();$('.feed-entry[data-root="'+rootId()+'"]')?.scrollIntoView({behavior:'smooth',block:'start'})}
function resume(id){const h=history.find(h=>h.id===id);if(!h)return;openRoot(h.root);state.path=h.path.filter(id=>getPost(id));state.trail=true;render()}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2800)}
const navigation=[['home','home','Home'],['explore','compass','Explore'],['discover','search','Search'],['groups','groups','Groups'],['messages','comment','Messages'],['algorithms','sliders','Algorithm Studio'],['profile','user','Profile'],['friends','groups','Friends'],['bookmarks','bookmark','Bookmarks'],['history','history','History'],['studio','plus','Create a post'],['settings','settings','Settings']];
function nav(){applySiteTheme();const tucked=['friends','bookmarks','history','studio','settings'];$('#main-nav').innerHTML=navigation.filter(([page])=>!tucked.includes(page)).map(([page,ic,label])=>`<button class="nav-item ${['home','explore','discover','groups','profile'].includes(page)?'mobile-primary':'mobile-secondary'} ${state.page===page?'active':''}" data-page="${page}" aria-label="${esc(label)}" ${state.page===page?'aria-current="page"':''}>${icon(ic)}<span>${label}</span></button>`).join('')+`<button class="nav-item sidebar-more mobile-secondary ${['friends','bookmarks','history'].includes(state.page)?'active':''}" data-action="sidebar-more" aria-haspopup="dialog">${icon('more')}<span>More</span></button><button class="nav-item sidebar-settings mobile-secondary ${state.page==='settings'?'active':''}" data-page="settings" ${state.page==='settings'?'aria-current="page"':''}>${icon('settings')}<span>Settings</span></button>`;accountSidebar();document.documentElement.style.setProperty('--profile-user-accent',profileAccent(profile));document.querySelectorAll('[data-follow]').forEach(b=>b.textContent=following.includes(b.dataset.follow)?'Following':'Follow')}

function header(title,tabs=''){const next=prefs.siteTheme==='red'?'teal':'red';return '<header class="main-header"><div><h1>'+esc(title)+'</h1>'+tabs+'</div><div class="main-header-tools"><button class="site-theme-toggle" data-site-theme="'+next+'" aria-label="Switch to '+next+' theme" title="Switch to '+next+' theme"><span class="theme-toggle-dot"></span>'+ (prefs.siteTheme==='red'?'Red':'Teal')+' <span>\u21c4</span></button><button class="icon-btn mobile-header-control" data-page="messages" aria-label="Messages">'+icon('comment')+'</button><button class="icon-btn mobile-header-control" data-action="browse-menu" aria-label="More destinations">'+icon('settings')+'</button></div></header>'}
function postCard(p,options){return socialPostCard(p,options)}
function trailHTML(path=state.path,root=rootId(),interactive=true){return `<div class="trail" aria-label="Exploration trail">${[root,...path].map((id,i)=>`${i?'<span>\u2192</span>':''}<button ${interactive?`data-trail="${i}"`:''}>${esc(getPost(id)?.topic||'Post')}</button>`).join('')}</div>`}
function activateFeedRoot(id){const previous=rootId(),index=roots().indexOf(id);if(index<0||id===previous)return;const entry=$('.feed-entry[data-root="'+id+'"]'),before=entry?.getBoundingClientRect().top;remember();browseInvalidate();state.rootPostId=id;state.rootIndex=index;state.path=[];state.trail=false;state.why=false;updateFeedViewer($('.feed-entry[data-root="'+previous+'"]'),previous,[]);const after=entry?.getBoundingClientRect().top;if(Number.isFinite(before)&&Number.isFinite(after)&&before!==after)window.scrollBy(0,after-before)}
function visibleFeedRoot(){const entries=[...document.querySelectorAll('.feed-entry')];return entries.filter(el=>{const r=el.getBoundingClientRect();return r.bottom>120&&r.top<window.innerHeight}).sort((a,b)=>Math.abs(a.getBoundingClientRect().top-100)-Math.abs(b.getBoundingClientRect().top-100))[0]?.dataset.root}
const viewerMotions=new Map();
function viewerExtras(root,path){if(state.page==='explore')return exploreStageJourney(root,path);const savedPath=paths[root],relationship=path.length?postRelationship(path.length===1?root:path.at(-2),path.at(-1)):null;return (path.length&&state.why&&relationship?'<p class="viewer-explanation">'+esc(relationship.reason)+'</p>':'')+ (path.length&&state.trail?trailHTML(path,root):'')+(path.length?'<button class="viewer-trail-toggle" data-action="trail" aria-expanded="'+state.trail+'">'+icon('history')+' '+(state.trail?'Hide trail':'View trail')+'</button>':'')}
function finishViewerMotion(root){const finish=viewerMotions.get(root);if(finish)finish()}
function followViewerShrink(anchor,oldHeight,newHeight,transition,animated){
 // Follow only when the replacement would leave the reading area above the viewport.
 if(!transition||newHeight>=oldHeight-.5||anchor.stageTop>=0||anchor.stageTop+newHeight>=Math.min(240,window.innerHeight*.35))return;
 window.scrollTo({top:Math.max(0,anchor.scrollY+anchor.top-20),behavior:animated?'smooth':'instant'});
}
function updateFeedViewer(entry,root,path,transition=''){
 const shell=entry?.querySelector?.('.post-viewer');if(!shell)return false;
 finishViewerMotion(root);const p=getPost(path.at(-1)||root);if(!p)return false;
 const stage=shell.querySelector('.post-stage'),old=stage.querySelector('.viewer-layer'),changed=shell.dataset.postId!==p.id||shell.dataset.postVersion!==(p.updatedAt||''),oldHeight=stage.getBoundingClientRect().height,focusAction=shell.contains(document.activeElement)?document.activeElement?.dataset?.action:null;
 const anchor={top:shell.getBoundingClientRect().top,stageTop:stage.getBoundingClientRect().top,scrollY:window.scrollY||0};
 const immersiveView=state.page==='explore';
 const floor=0; // Each post keeps its natural height, including short text posts.
 shell.classList.toggle('official-post',postOfficial(p));shell.classList.toggle('is-exploring',!!path.length);shell.dataset.viewDepth=String(path.length);
 shell.querySelector('.post-navigation').innerHTML=socialViewerNavigation(p,root,path);
 entry.querySelector('.viewer-extras').innerHTML=viewerExtras(root,path);
 if(!changed){stage.style.minHeight=floor+'px';const actions=socialPostActions(p),head=socialPostHeader(p);if(shell.querySelector('.post-actions').innerHTML!==actions)shell.querySelector('.post-actions').innerHTML=actions;if(shell.querySelector('.post-head').innerHTML!==head)shell.querySelector('.post-head').innerHTML=head;if(focusAction)shell.querySelector('[data-action="'+focusAction+'"]')?.focus({preventScroll:true});return true}
 shell.dataset.postId=p.id;shell.dataset.postVersion=p.updatedAt||'';shell.setAttribute('aria-label','Post by '+postProfile(p).name);
 shell.querySelector('.post-head').innerHTML=socialPostHeader(p);shell.querySelector('.post-actions').innerHTML=socialPostActions(p);shell.querySelector('.viewer-repost').innerHTML='';
 old.querySelectorAll('video,audio').forEach(media=>media.pause());
 const incoming=document.createElement('div');incoming.className='post-body viewer-layer';incoming.dataset.kind=postContentKind(p);incoming.innerHTML=socialPostBody(p);if(immersiveView)incoming.querySelectorAll('img').forEach(image=>{image.loading='eager';image.decoding='async'});incoming.style.minHeight=floor+'px';if(immersiveView)entry.dataset.presentation=explorePresentation(p);
 const animate=!!transition&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&typeof incoming.animate==='function';
 if(focusAction)shell.querySelector('[data-action="'+focusAction+'"]')?.focus({preventScroll:true});
 if(!animate){stage.replaceChildren(incoming);stage.style.minHeight=floor+'px';incoming.style.minHeight='';stage.style.height='';if(!immersiveView)followViewerShrink(anchor,oldHeight,incoming.scrollHeight,transition,false);else exploreLayout();return true}
 stage.style.minHeight='0px';stage.style.height=oldHeight+'px';stage.classList.add('is-transitioning');incoming.classList.add('viewer-incoming');stage.append(incoming);if(immersiveView){incoming.style.height='auto';incoming.style.bottom='auto'}
 const newHeight=immersiveView?exploreStageHeight(entry,incoming,p):Math.max(floor,incoming.scrollHeight),axis=transition.startsWith('vertical')?'Y':'X',direction=['slide-back','vertical-back'].includes(transition)?-1:1;
 old.setAttribute('aria-hidden','true');old.inert=true;old.style.willChange='transform,opacity';incoming.style.willChange='transform,opacity';incoming.style.position='absolute';incoming.style.inset='0';
 const options={duration:240,easing:'cubic-bezier(.22,.61,.36,1)'};
 const outgoingMotion=old.animate([{transform:'translate'+axis+'(0)',opacity:1},{transform:'translate'+axis+'('+(-100*direction)+'%)',opacity:.5}],options);
 const incomingMotion=incoming.animate([{transform:'translate'+axis+'('+(100*direction)+'%)',opacity:.5},{transform:'translate'+axis+'(0)',opacity:1}],options);
 const sizeMotion=Math.abs(newHeight-oldHeight)>.5?stage.animate([{height:oldHeight+'px'},{height:newHeight+'px'}],options):null;stage.style.height=newHeight+'px';if(!immersiveView)followViewerShrink(anchor,oldHeight,newHeight,transition,true);outgoingMotion.finished.catch(()=>{});sizeMotion?.finished.catch(()=>{});
 let finished=false;const finish=()=>{if(finished)return;finished=true;outgoingMotion.cancel();incomingMotion.cancel();sizeMotion?.cancel();old.remove();incoming.style.willChange='';incoming.classList.remove('viewer-incoming');incoming.style.position='';incoming.style.inset='';incoming.style.height='';incoming.style.bottom='';stage.style.height='';stage.style.minHeight=floor+'px';incoming.style.minHeight='';stage.classList.remove('is-transitioning');viewerMotions.delete(root);if(immersiveView)exploreMeasureBody()};
 viewerMotions.set(root,finish);incomingMotion.finished.then(finish,finish);return true;
}
function renderAnchoredFeed(){routeSync();const root=rootId(),entry=$('.feed-entry[data-root="'+root+'"]');if(updateFeedViewer(entry,root,state.path,state.transition)){renderRight();if(state.page==='explore')exploreUpdateControls();state.transition='';return}render()}
function homeComposer(){return '<div class="home-compose">'+(authUser?profileAvatar(profile):icon('plus'))+'<button class="compose-prompt" data-page="studio">Share something worth discovering</button><button class="primary compose-open" data-page="studio" aria-label="Create a post">'+icon('plus')+'<span>Create a post</span></button></div>'}
function renderHome(){
 const tabs='<div class="tabs"><button class="tab '+(state.tab==='for-you'?'active':'')+'" data-tab="for-you">For You</button><button class="tab '+(state.tab==='following'?'active':'')+'" data-tab="following">Following</button></div>';
 const list=roots(),activeRoot=rootId();
 const preview=authUser?'<div class="feed-profile-preview">'+profileCard(profile,true,true)+'</div>':'';
 const status=socialStatus();
 if(!social.ready||social.error)return header('Your feed',tabs)+'<div class="page-content">'+status+'</div>';
 if(!list.length)return header('Your feed',tabs)+preview+'<div class="social-feed-toolbar"><button id="feed-refresh" class="secondary-btn" data-social-action="refresh">Refresh feed</button></div><div class="page-content">'+empty('compass',state.tab==='following'?'Find your people':'Welcome to Zopathy',state.tab==='following'?'Follow people to see their posts here.':'Be the first to share something.',state.tab==='following'?'Explore people':'Create a post',state.tab==='following'?'discover':'studio')+'</div>';
 return header('Your feed',tabs)+preview+'<div class="social-feed-toolbar"><button id="feed-refresh" class="secondary-btn" data-social-action="refresh">'+(social.changed?'Updates available \u00b7 Refresh':'Refresh feed')+'</button></div>'+homeComposer()+'<div class="timeline">'+list.map((id,index)=>{
  const path=id===activeRoot?state.path:[],p=getPost(path.at(-1)||id);
  return '<section class="feed-entry" data-root="'+id+'" aria-label="Feed post '+(index+1)+'"><div class="post-wrap gesture-area">'+postCard(p,{root:id,path})+'<div class="viewer-extras">'+viewerExtras(id,path)+'</div></div></section>';
 }).join('')+'</div><div class="feed-bottom">'+(social.more?'<button class="secondary-btn" data-social-action="more">Load more posts</button>':'<span>You\u2019re caught up</span>')+'</div>';
}
function empty(ic,title,text,cta,page){return `<div class="empty-state">${icon(ic)}<h2>${esc(title)}</h2><p>${esc(text)}</p>${cta?`<button class="primary" data-page="${page}">${esc(cta)} ${icon('arrow')}</button>`:''}</div>`}
function listPost(p){return socialListPost(p)}
function renderDiscover(){return socialDiscover()}
function renderBookmarks(){const posts=bookmarks.map(getPost).filter(Boolean);return header('Bookmarks')+`<div class="page-content"><p class="page-lead">Your saved posts.</p>${!authUser?empty('bookmark','Sign in to view bookmarks','Your bookmarks are private.','Sign in','account'):posts.length?posts.map(listPost).join(''):empty('bookmark','No bookmarks yet','Tap the bookmark on any post to keep it here.','Back to the feed','home')}</div>`}
function renderHistory(){return header('History')+`<div class="page-content"><p class="page-lead">${prefs.saveHistory?'Your journeys are saved privately to your account.':'Automatic history saving is off.'}</p><div class="studio-bar"><span>${history.length} saved journey${history.length===1?'':'s'}</span><button class="secondary-btn" data-page="settings">History settings ${icon('settings')}</button></div>${!authUser?empty('history','Sign in to view history','Your exploration history is private.','Sign in','account'):history.length?history.map(h=>`<article class="history-card"><span class="small-label">${esc(new Date(h.time).toLocaleDateString(undefined,{month:'short',day:'numeric'}))} \u00b7 ${h.path.length} DEEP</span><h3>From ${esc(getPost(h.root)?.topic||'your post')} to ${esc(getPost(h.path.at(-1))?.topic||'something new')}</h3>${trailHTML(h.path,h.root,false)}<div><button class="secondary-btn" data-resume="${h.id}">Pick up where you left off ${icon('arrow')}</button><button class="icon-btn" data-delete-history="${h.id}" aria-label="Delete this journey">${icon('close')}</button></div></article>`).join(''):empty('history','No exploration history','Explore a post to start your first journey.','Find a rabbit hole','home')}</div>`}
function renderProfile(){return authUser?profilePage():renderAccount()}
function renderSettings(){return socialSettings()}
let draft={title:'',text:'',blocks:[]};
let customizeOpen=false;
function renderStudio(){return socialStudio()}
function renderStudioBlocks(blocks){return socialBlocks(blocks)}
function renderRight(){const p=current();$('#related-panel').innerHTML=`<div class="section-head"><h3>Related posts</h3><span>\u2197</span></div><p class="related-intro">${state.page==='home'&&p?`${esc(p.topic)}`:'Explore connected posts.'}</p>${related().slice(0,3).map(e=>`<button class="related-card" data-related="${e.to}"><span class="related-thumbnail">${e.glyph}</span><div><strong>${esc(e.label)}</strong><small>${esc(getPost(e.to)?.topic)} \u00b7 ${esc(e.type)}</small></div><span class="arrow">\u2192</span></button>`).join('')||'<p class="related-intro">You reached the end of this trail. Jump back a step, or see what\u2019s next in your feed.</p>'}`}
function render(){const dmScroll=captureDMScroll();const restoreHome=browsePrepareRender();routeSync();document.documentElement.dataset.destination=state.page;for(const root of [...viewerMotions.keys()])finishViewerMotion(root);nav();const existingExplore=state.page==='explore'&&$('[data-explore-viewer]');if(existingExplore&&social.ready&&!social.error&&current()){existingExplore.dataset.root=rootId();renderAnchoredFeed();return}const pages={algorithms:renderAlgorithmStudio,home:renderHome,explore:renderExplore,discover:renderDiscover,bookmarks:renderBookmarks,history:renderHistory,studio:renderStudio,profile:renderProfile,member:socialMemberPage,groups:renderGroups,group:renderGroup,friends:renderFriends,messages:renderMessages,settings:renderSettings,admin:renderAdmin,account:renderAccount,'not-found':renderNotFound};$('#main').innerHTML=(pages[state.page]||renderHome)();renderRight();renderSocialPeople();bindProfileCanvases();state.transition='';if(state.page==='messages')restoreDMScroll(dmScroll);if(state.page==='home')bindGestures();if(state.page==='explore')bindExploreGestures();if(restoreHome)browseRestoreHomePosition();browseAnimateDestination();if(state.page==='algorithms')algorithmMount();else algorithmLeave()}
function openDialog(html){$('#dialog-content').innerHTML=html;$('#dialog').showModal()}
function closeDialog(force=false){if(!force&&profileStudio.active&&profileDraft){if(profileStudio.saving)return false;requestStudioExit();return false;}if(profileStudio.saving&&!force)return false;if(typeof profileStudio!=='undefined'){clearTimeout(profileStudio.timer);profileStudio.active=false;profileStudio.past=[];profileStudio.future=[];}closeProfileCrop();social.commentPost=null;social.authorId=null;$('#dialog').close();$('#dialog').classList.remove('profile-editor-dialog','profile-studio-dialog');profileDraft=null}
function directionDialog(){const options=related();openDialog(`<h2>Explore related posts</h2><p class="intro">Choose a topic, or press \u2192 to open the first connection.</p>${options.length?options.map(e=>`<button class="related-card" data-direction="${e.to}"><span class="related-thumbnail">${e.glyph}</span><div><strong>${esc(getPost(e.to)?.topic)}</strong><small>${esc(e.label)}</small><small>${esc(e.type)}</small></div><span class="arrow">\u2192</span></button>`).join(''):'<p class="intro">This trail ends here. Back up a step or try the next feed post.</p>'}`)}
function showComments(id){socialComments(id)}
function authorDialog(id){const p=getPost(id);if(p)socialAuthor(p.user)}
function editProfile(){openProfileEditor()}
document.addEventListener('toggle',e=>{if(e.target.id==='composer-customize')customizeOpen=e.target.open},true);
let chosenTheme=null;
document.addEventListener('click',e=>{const el=e.target.closest('button,a');if(!el)return;const d=el.dataset;if(d.authMode){openAccount(d.authMode);return}if(d.authAction){handleAuthAction(d.authAction);return}if(['studio','profile','algorithms'].includes(d.page)&&!requireAccount())return;if(d.siteTheme){setSiteTheme(d.siteTheme);return}const feedEntry=el.closest('.feed-entry');if(feedEntry)activateFeedRoot(feedEntry.dataset.root);if(d.cropAction){handleCropAction(d.cropAction);return}if(d.profileCrop){if(!requireAccount())return;if(!profileDraft)openProfileEditor();openProfileCrop(d.profileCrop);return}if(handleProfileClick(el,d))return;
if(d.action==='close-group-editor'){closeDialog();return}
if(el.closest('.dialog-close')){if(profileCrop)closeProfileCrop();else if(!profileStudio.saving)closeDialog();return}
if(d.page){e.preventDefault();browsing.explicit=true;closeDialog();if(d.page!=='studio')groupLeaveURL();state.page=d.page;state.search='';$('#search').value='';render();if(d.page!=='home'||!browsing.homePosition)window.scrollTo(0,0);if(d.page==='groups')loadGroupDirectory();if(['friends','messages'].includes(d.page)){loadCommunity();if(d.page==='messages'&&community.target)loadDMThread();}return}
if(d.tab){browsing.explicit=true;browseSelectSource(d.tab);render();return}
if(d.open){closeDialog();openRoot(d.open);return}
if(d.related){if(!['home','explore'].includes(state.page)){state.page='home';state.path=[]}goDeeper(d.related);return}
if(d.direction){closeDialog();goDeeper(d.direction);return}
if(d.trail!==undefined){browseInvalidate();state.path=state.path.slice(0,Number(d.trail));state.why=false;state.transition=state.path.length?'slide-back':'';renderAnchoredFeed();return}
if(d.resume){resume(d.resume);return}
if(d.deleteHistory){socialDeleteHistory(d.deleteHistory);return}
if(d.author){if(ownPost(getPost(d.author))){closeDialog();state.page='profile';render()}else authorDialog(d.author);return}
if(d.follow){socialFollow(d.follow);return}
if(d.theme){chosenTheme=d.theme;document.querySelectorAll('.theme-dot').forEach(b=>{b.classList.toggle('active',b.dataset.theme===d.theme);b.setAttribute('aria-pressed',b.dataset.theme===d.theme)});return}
if(d.addBlock){customizeOpen=true;if(draft.blocks.length>=12){toast('Use up to 12 blocks per post.');return}draft.blocks.push(d.addBlock==='text'?{type:'text',text:''}:d.addBlock==='image'?{type:'image',url:'',kind:'image',title:'',name:''}:d.addBlock==='media'?{type:'media',url:'',kind:'audio',title:'',name:''}:{type:'section',title:'A new perspective',text:'',color:'#283e28'});render();return}
if(d.blockUp!==undefined||d.blockDown!==undefined){const i=Number(d.blockUp??d.blockDown),j=i+(d.blockUp!==undefined?-1:1);if(j>=0&&j<draft.blocks.length)[draft.blocks[i],draft.blocks[j]]=[draft.blocks[j],draft.blocks[i]];render();return}
if(d.blockDelete!==undefined){draft.blocks.splice(Number(d.blockDelete),1);render();return}
const action=d.action;if(!action)return;
if(['like','bookmark','repost'].includes(action)){socialToggle(action,d.id);return}
if(['publish-draft','edit-profile'].includes(action)&&!requireAccount())return;
if(action==='sidebar-more')browseMoreMenu();
if(action==='browse-menu')browseMenu();
if(action==='comments')showComments(d.id);
if(action==='directions')directionDialog();
if(action==='back')back();
if(action==='return-main')returnMainFeed();
if(action==='next'){if(state.page==='explore')exploreAdvance(1);else moveFeed(1);}
if(action==='trail'){state.trail=!state.trail;renderAnchoredFeed()}
if(action==='why'){state.why=!state.why;renderAnchoredFeed()}
if(action==='resume-path'){browseInvalidate();state.path=[...(paths[rootId()]||[])].filter(getPost);state.trail=true;renderAnchoredFeed()}
if(action==='edit-profile')editProfile();if(action==='cancel-profile')closeDialog();
if(action==='clear-history'){socialClearHistory();return}
if(action==='preview-draft')previewPostDraft()
if(action==='publish-draft'){socialPublish();return}
});
document.addEventListener('input',e=>{const d=e.target.dataset;if(e.target.id==='draft-title')draft.title=e.target.value;if(e.target.id==='draft-body')draft.text=e.target.value;if(e.target.id==='draft-topic')draft.topic=e.target.value;if(d.blockText!==undefined)draft.blocks[Number(d.blockText)].text=e.target.value;if(d.blockTitle!==undefined)draft.blocks[Number(d.blockTitle)].title=e.target.value;if(d.blockColor!==undefined)draft.blocks[Number(d.blockColor)].color=e.target.value});
document.addEventListener('change',e=>{if(e.target.id==='save-history'){socialSavePreferences({saveHistory:e.target.checked})}if(e.target.dataset.blockImage!==undefined){draft.blocks[Number(e.target.dataset.blockImage)].image=e.target.value;render()}});
document.addEventListener('submit',e=>{if(e.target.id==='comment-form'){e.preventDefault();socialReply(e.target)}if(e.target.id==='profile-form'){e.preventDefault();saveProfileDraft(e.target)}});
$('#search').addEventListener('input',e=>{scheduleSocialSearch(e.target.value)});
$('.logo').addEventListener('click',e=>{e.preventDefault();groupLeaveURL();browsing.explicit=true;state.page='home';render()});
document.addEventListener('keydown',e=>{if(e.target.closest?.('[data-no-navigation]')||/INPUT|TEXTAREA|SELECT|VIDEO|AUDIO/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.key==='/'&&!$('#dialog').open){e.preventDefault();if(getComputedStyle($('.rightbar')).display!=='none')$('#search').focus();else{state.page='discover';render()}return}if($('#dialog').open){if(state.page==='explore')return;if(e.key==='ArrowRight'&&$('#dialog-content').innerHTML.includes('data-direction')){e.preventDefault();closeDialog();goDeeper()}return}if(state.page!=='home')return;if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();const root=visibleFeedRoot();if(root)activateFeedRoot(root);if(e.key==='ArrowRight')goDeeper();if(e.key==='ArrowLeft')back()}});
let touchStart=null;
function bindGestures(){
 if(window.ZOPATHY_CONFIG.relatedSwipeEnabled===false)return;
 document.querySelectorAll('.gesture-area').forEach(area=>{
  if(area.dataset.gestureBound)return;area.dataset.gestureBound='true';
  area.addEventListener('touchstart',e=>{touchStart=null;if(e.touches.length!==1||e.target.closest('button,a,input,textarea,select,summary,audio,[contenteditable],[data-no-navigation]'))return;const t=e.touches[0],video=e.target.closest('video');if(video&&t.clientY>video.getBoundingClientRect().bottom-48)return;touchStart={x:t.clientX,y:t.clientY,root:area.closest('.feed-entry').dataset.root}},{passive:true});
  area.addEventListener('touchmove',e=>{if(!touchStart)return;if(e.touches.length!==1){touchStart=null;return}const t=e.touches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;if(Math.abs(dx)>Math.max(12,Math.abs(dy)*1.2)&&e.cancelable)e.preventDefault()},{passive:false});
  area.addEventListener('touchcancel',()=>{touchStart=null},{passive:true});
  area.addEventListener('touchend',e=>{if(!touchStart)return;const start=touchStart;touchStart=null;const t=e.changedTouches[0];if(!t)return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>=40&&Math.abs(dx)>Math.abs(dy)*1.2){activateFeedRoot(start.root);dx<0?goDeeper():back()}},{passive:true});
 });
}
// Native vertical scrolling is never intercepted. Only sideways trackpad
// gestures over a post can navigate its exploration path.
let wheelTotal=0,wheelTime=null,wheelConsumed=false,wheelPeak=0,wheelLastDelta=0,wheelActivatedAt=0,wheelDecayed=false,wheelRoot=null;
document.addEventListener('wheel',e=>{
 if(window.ZOPATHY_CONFIG.relatedSwipeEnabled===false||state.page!=='home'||$('#dialog').open||e.target.closest('.rightbar,.sidebar,input,textarea,select,[data-no-navigation]'))return;
 if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)*1.5)return;
 const entry=e.target.closest('.feed-entry');if(!entry)return;
 const now=Date.now(),targetRoot=entry.dataset.root;
 // A shrinking viewer can move the next post under the pointer mid-gesture.
 // Keep the whole wheel burst on its original post until the gesture is idle.
 if(wheelTime===null||now-wheelTime>110){wheelRoot=targetRoot;wheelTotal=0;wheelConsumed=false;wheelPeak=0;wheelLastDelta=0;wheelDecayed=false}
 const root=wheelRoot;wheelTime=now;
 const delta=e.deltaX*(e.deltaMode===1?16:e.deltaMode===2?window.innerHeight:1),magnitude=Math.abs(delta);
 if(!delta)return;
 if(e.cancelable)e.preventDefault();
 if(wheelConsumed){const fresh=wheelDecayed&&magnitude>=Math.max(16,wheelPeak*.5)&&magnitude>Math.abs(wheelLastDelta)*2.5,reversed=delta*wheelLastDelta<0&&magnitude>=16;if(targetRoot===wheelRoot&&now-wheelActivatedAt>=140&&(fresh||reversed)){wheelConsumed=false;wheelTotal=0;wheelPeak=0;wheelDecayed=false}}
 if(wheelConsumed){if(magnitude<wheelPeak*.3)wheelDecayed=true;wheelLastDelta=delta;return}
 wheelPeak=Math.max(wheelPeak,magnitude);wheelLastDelta=delta;wheelTotal+=delta;
 if(Math.abs(wheelTotal)>=24){wheelConsumed=true;wheelActivatedAt=now;activateFeedRoot(root);wheelTotal>0?goDeeper():back()}
},{passive:false});
$('#dialog').addEventListener('close',()=>{profileStudio.active=false;clearTimeout(profileStudio.timer);$('#dialog').classList.remove('profile-editor-dialog','profile-studio-dialog');profileDraft=null});
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog()}});
routePrime();
render();
initializeAccounts();


$('#dialog').addEventListener('cancel',e=>{if(profileCrop){e.preventDefault();closeProfileCrop()}});

window.addEventListener('resize',()=>{for(const root of viewerMotions.keys())finishViewerMotion(root)});
