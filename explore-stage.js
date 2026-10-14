// Explore presentation only. Shared post renderers, cache, mutations and paths are unchanged.
const exploreStage={railExpanded:false,observedMedia:new WeakSet()};
function explorePresentation(post){
 const kind=postContentKind(post);
 if(kind!=='text')return kind;
 const text=[post.title,post.text,...cleanBlocks(post.blocks).map(block=>block.text)].join(' ');
 return text.length>650?'long-text':'short-text';
}
function exploreStageHeader(){
 return '<header class="explore-header"><div class="explore-title"><button class="icon-btn explore-rail-toggle" data-explore-action="toggle-rail" aria-label="'+(exploreStage.railExpanded?'Collapse':'Expand')+' navigation" aria-expanded="'+exploreStage.railExpanded+'">'+icon('studio')+'</button><h1>Explore</h1></div><div class="explore-header-actions"><button class="icon-btn" data-page="studio" aria-label="Create a post">'+icon('plus')+'</button><button class="icon-btn" data-page="messages" aria-label="Messages">'+icon('comment')+'</button><button class="icon-btn" data-action="browse-menu" aria-label="More destinations">'+icon('settings')+'</button><button class="secondary-btn" data-page="home" aria-label="Return to Home">'+icon('home')+'<span>Home</span></button></div></header>';
}
function exploreStageControls(){
 const list=roots(),position=list.indexOf(rootId()),depth=state.path.length;
 return '<div class="explore-controls" aria-label="Explore navigation"><div class="explore-position" role="status" aria-live="polite"><strong>'+(position+1)+'<span> / '+list.length+'</span></strong><small>'+(state.tab==='following'?'Following':'For You')+'</small></div><div class="explore-control-buttons"><div class="explore-control-group stream-controls" aria-label="Vertical stream navigation"><span>Stream</span><button class="icon-btn" data-explore-action="previous" aria-label="Previous feed post" title="Previous stream post · Arrow Up" aria-keyshortcuts="ArrowUp" '+(position<=0?'disabled':'')+'>'+icon('arrow','style="transform:rotate(-90deg)"')+'</button><button class="icon-btn" data-explore-action="next" aria-label="Next feed post" title="Next stream post · Arrow Down" aria-keyshortcuts="ArrowDown" '+(position>=list.length-1&&!social.more?'disabled':'')+'>'+icon('arrow','style="transform:rotate(90deg)"')+'</button></div><div class="explore-control-group branch-controls" aria-label="Horizontal rabbit-hole navigation"><span>Related</span><button class="icon-btn" data-explore-action="related" aria-label="Next related post" title="Explore related · Arrow Left" aria-keyshortcuts="ArrowLeft" '+(!related().length?'disabled':'')+'>'+icon('arrow','style="transform:rotate(180deg)"')+'</button><button class="icon-btn" data-action="back" aria-label="Previous related post" title="Back through the path · Arrow Right" aria-keyshortcuts="ArrowRight" '+(!depth?'disabled':'')+'>'+icon('arrow')+'</button></div></div></div>';
}
function exploreStageContext(post,root,path){
 const relation=path.length?postRelationship(path.length===1?root:path.at(-2),post.id):null;
 const tag=relation?'button':'span',attributes=relation?'data-action="why" aria-expanded="'+state.why+'" title="'+esc(relation.reason)+'"':'role="status"';
 if(!path.length)return postTagsButton(post)+'<span class="stage-stream-label">Main stream</span>';
 return '<'+tag+' class="stage-context-label" '+attributes+'>'+(path.length?'<span class="stage-branch-mark"></span><strong>'+path.length+' deep</strong><span class="stage-context-separator">/</span>':'')+esc(relation?.type||post.topic)+'</'+tag+'>'+(path.length?'<button class="stage-root-return" data-action="return-main" aria-label="Return to root post">Stream post '+icon('close')+'</button>':'<span class="stage-stream-label">Main stream</span>');
}
function exploreStageJourney(root,path){
 const relationship=path.length?postRelationship(path.length===1?root:path.at(-2),path.at(-1)):null;
 const reason=state.why&&relationship?'<p class="viewer-explanation">'+esc(relationship.reason)+'</p>':'';
 if(path.length)return reason+'<button class="stage-path-toggle" data-action="trail" aria-expanded="'+state.trail+'">'+icon('history')+' '+(state.trail?'Hide path':'View path')+'</button>'+(state.trail?trailHTML(path,root):'');
 const saved=paths[root];return '';
}
function exploreStageCard(post){
 let card=postCard(post,{root:rootId(),path:state.path});
 card=card.replace('<div class="post-actions">','<footer class="explore-post-footer"><div class="post-actions">');
 return card.replace('</div></article>','</div><div id="explore-control-slot">'+exploreStageControls()+'</div><div class="viewer-extras">'+exploreStageJourney(rootId(),state.path)+'</div></footer></article>');
}
function exploreStagePage(){
 const post=current();
 if(!social.ready||social.error)return exploreStageHeader()+'<div class="page-content">'+socialStatus()+'</div>';
 if(!post)return exploreStageHeader()+'<div class="page-content">'+empty('compass','Ready for something new?',state.tab==='following'?'Follow people to fill your feed.':'New community posts will appear here.','Find people','discover')+'</div>';
 return exploreStageHeader()+'<div class="explore-workspace"><section class="feed-entry explore-entry" data-explore-viewer data-root="'+rootId()+'" data-presentation="'+explorePresentation(post)+'" aria-label="Explore post">'+exploreStageCard(post)+'</section></div>';
}
function exploreApplyRail(){
 document.documentElement.dataset.exploreRail=exploreStage.railExpanded?'expanded':'compact';
 const toggle=$('[data-explore-action="toggle-rail"]');if(toggle){toggle.setAttribute('aria-expanded',String(exploreStage.railExpanded));toggle.setAttribute('aria-label',(exploreStage.railExpanded?'Collapse':'Expand')+' navigation')}
 const account=$('.account-user');account?.setAttribute?.('aria-label','Your profile');
}
function exploreStageHeight(entry,layer,post=current()){
 if(!entry||!layer||!post)return 0;
 entry.dataset.presentation=explorePresentation(post);
 const shell=entry.querySelector('.post-viewer'),content=layer.querySelector('.viewer-content');
 const outside=['.post-head','.post-navigation','.explore-post-footer'].reduce((sum,selector)=>sum+(shell?.querySelector(selector)?.getBoundingClientRect().height||0),0);
 const available=Math.max(80,(entry.clientHeight||entry.getBoundingClientRect().height||window.innerHeight-120)-outside);
 const style=getComputedStyle(layer),padding=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0);
 const panel=shell?.querySelector('.post-stage'),panelStyle=panel?getComputedStyle(panel):{};
 const border=(parseFloat(panelStyle.borderTopWidth)||0)+(parseFloat(panelStyle.borderBottomWidth)||0);
 const contentHeight=()=>content?Math.max(content.scrollHeight||0,content.getBoundingClientRect?.().height||0):(layer.scrollHeight||0);
 let natural=Math.ceil(contentHeight()+padding+border);
 if(entry.dataset.presentation==='short-text'&&natural>available){
  entry.dataset.presentation='long-text';const updated=getComputedStyle(layer);
  natural=Math.ceil(contentHeight()+(parseFloat(updated.paddingTop)||0)+(parseFloat(updated.paddingBottom)||0)+border);
 }
 if(['photo','video'].includes(entry.dataset.presentation)){
  const media=layer.querySelector('img,video'),width=media?.naturalWidth||media?.videoWidth,height=media?.naturalHeight||media?.videoHeight;
  if(width&&height){
   const ratio=width/height;entry.dataset.mediaShape=ratio<.9?'portrait':ratio>1.4?'landscape':'square';
   const captions=[...(content?.children||[])].filter(child=>!child.matches?.('.social-image,.social-media')).reduce((sum,child)=>{const css=getComputedStyle(child);return sum+child.getBoundingClientRect().height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0)},0);
   const mediaWidth=content?.clientWidth||layer.clientWidth||entry.clientWidth;
   const caption=layer.querySelector('figcaption,.social-media>strong');
   const captionHeight=caption?.getBoundingClientRect().height||0;
   return Math.min(available,mediaWidth/ratio+captions+captionHeight+12);
  }
  return available;
 }
 delete entry.dataset.mediaShape;
 return Math.max(0,Math.min(available,natural));
}
function exploreLayout(){
 if(state.page!=='explore')return;
 exploreApplyRail();const entry=$('[data-explore-viewer]');if(!entry)return;
 const layer=entry.querySelector('.viewer-layer:not([aria-hidden="true"])')||entry.querySelector('.viewer-layer');if(!layer)return;
 const height=exploreStageHeight(entry,layer),shell=entry.querySelector('.post-viewer');
 shell?.style.setProperty?.('--explore-content-height',height+'px');
 layer.dataset.scrollable=String(layer.scrollHeight>layer.clientHeight+2);
 layer.setAttribute('tabindex','0');layer.setAttribute('aria-label','Post content. Scroll here to read long posts.');
 for(const media of layer.querySelectorAll('img,video')){
  if(media.tagName==='IMG')media.loading='eager';
  if(exploreStage.observedMedia.has(media))continue;exploreStage.observedMedia.add(media);
  const update=()=>{if(media.isConnected&&state.page==='explore')exploreLayout()};
  media.addEventListener(media.tagName==='IMG'?'load':'loadedmetadata',update,{once:true});
 }
}
document.addEventListener('click',event=>{if(event.target.closest?.('[data-explore-action="toggle-rail"]')){exploreStage.railExpanded=!exploreStage.railExpanded;exploreApplyRail();exploreLayout()}});
