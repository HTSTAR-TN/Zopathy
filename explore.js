// One-post viewer over the same cache, renderers, mutations and rabbit-hole path as Home.
const immersive={wheelTime:0,wheelTotal:0,wheelConsumed:false,wheelAxis:null,preloaded:new Set(),images:[],advancing:false};
function openExplore(id){
 browsing.explicit=true;
 if(id&&!getPost(id))return;
 browseSetDestination('explore');
 if(id&&id!==currentId()){
  remember();browseInvalidate();if(!roots().includes(id))state.focusPost=id;state.rootPostId=id;state.rootIndex=roots().indexOf(id);
  state.path=[];state.trail=false;state.why=false;
 }
 render();window.scrollTo(0,0);
}
function exploreControls(){return exploreStageControls();}
function exploreHeader(){return exploreStageHeader();}
function renderExplore(){return exploreStagePage();}
function exploreUpdateControls(){
 const slot=$('#explore-control-slot');if(slot){
  const html=exploreControls(),focused=slot.contains?.(document.activeElement)?document.activeElement:null;
  const selector=focused?.dataset.exploreAction?'[data-explore-action="'+focused.dataset.exploreAction+'"]':focused?.dataset.action==='back'?'[data-action="back"]':null;
  if(slot.innerHTML!==html){slot.innerHTML=html;const button=selector?slot.querySelector(selector):null;if(button&&!button.disabled)button.focus({preventScroll:true});}
 }
 exploreMeasureBody();explorePreload();
}
function exploreMeasureBody(){exploreLayout();}
function explorePreload(){
 if(state.page!=='explore'||typeof Image==='undefined')return;
 const list=roots(),index=list.indexOf(rootId());
 for(const id of [list[index+1],list[index-1]]){
  const block=cleanBlocks(getPost(id)?.blocks).find(b=>b.kind==='image'&&b.url);
  if(!block||immersive.preloaded.has(block.url))continue;
  if(immersive.preloaded.size>=12)immersive.preloaded.clear();
  immersive.preloaded.add(block.url);const image=new Image();image.decoding='async';image.src=block.url;
  immersive.images.push(image);if(immersive.images.length>2)immersive.images.shift();
 }
}
async function exploreAdvance(step){
 if(state.page!=='explore'||immersive.advancing)return;
 let list=roots(),index=list.indexOf(rootId());
 if(index+step<0)return;
 if(index+step>=list.length){
  if(!social.more)return;
  immersive.advancing=true;const revision=browsing.revision;
  try{social.limit+=50;await loadSocial();if(state.page!=='explore'||revision!==browsing.revision)return;list=roots();index=list.indexOf(rootId())}finally{immersive.advancing=false}
 }
 const next=list[index+step];if(!next)return;
 const previous=rootId(),entry=$('[data-explore-viewer]');finishViewerMotion(previous);remember();browseInvalidate();
 state.rootPostId=next;state.rootIndex=index+step;state.path=[];state.trail=false;state.why=false;
 state.transition=step>0?'vertical-next':'vertical-back';
 if(entry){entry.dataset.root=next;renderAnchoredFeed()}else render();
}
function exploreHasSelection(){return typeof window.getSelection==='function'&&!window.getSelection().isCollapsed}
function exploreInputProtected(target){return !!target?.closest?.('button,a,input,textarea,select,summary,audio,video,[contenteditable],[data-gallery],[role=button],[role=slider],[role=switch],[data-no-navigation]')}
function exploreInnerScroll(target){const body=target?.closest?.('.viewer-layer');return !!body&&body.scrollHeight>body.clientHeight+2}
function exploreNavigateGesture(axis,delta){if(axis==='x'){delta>0?goDeeper():back()}else exploreAdvance(delta>0?1:-1)}
function bindExploreGestures(){
 const area=$('[data-explore-viewer]');if(!area||area.dataset.exploreBound)return;area.dataset.exploreBound='true';let start=null;
 area.addEventListener('touchstart',event=>{
  start=null;if(event.touches.length!==1||exploreInputProtected(event.target)||exploreHasSelection())return;
  const touch=event.touches[0];if(touch.clientX<=16||(window.innerWidth&&touch.clientX>=window.innerWidth-16))return;start={x:touch.clientX,y:touch.clientY,target:event.target,revision:browsing.revision,axis:null};
 },{passive:true});
 area.addEventListener('touchmove',event=>{
  if(!start)return;if(event.touches.length!==1||exploreHasSelection()){start=null;return}
  const touch=event.touches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y;
  if(!start.axis&&Math.max(Math.abs(dx),Math.abs(dy))>12){
   if(Math.abs(dx)>Math.abs(dy)*1.2)start.axis='x';else if(Math.abs(dy)>Math.abs(dx)*1.2)start.axis='y';
   if(start.axis==='y'&&exploreInnerScroll(start.target)){start=null;return}
  }
  if(start.axis&&event.cancelable)event.preventDefault();
 },{passive:false});
 area.addEventListener('touchend',event=>{
  const origin=start;start=null;if(!origin||origin.revision!==browsing.revision||exploreHasSelection())return;
  const touch=event.changedTouches[0];if(!touch)return;
  const dx=origin.x-touch.clientX,dy=origin.y-touch.clientY,axis=origin.axis||(Math.abs(dx)>Math.abs(dy)*1.2?'x':Math.abs(dy)>Math.abs(dx)*1.2?'y':null);
  if(!axis||Math.abs(axis==='x'?dx:dy)<48||axis==='y'&&exploreInnerScroll(origin.target))return;
  exploreNavigateGesture(axis,axis==='x'?dx:dy);
 },{passive:true});
 area.addEventListener('touchcancel',()=>{start=null},{passive:true});exploreMeasureBody();explorePreload();
}
document.addEventListener('wheel',event=>{
 if(state.page!=='explore'||$('#dialog').open||!event.target.closest?.('[data-explore-viewer]')||exploreInputProtected(event.target)||exploreHasSelection()||event.ctrlKey)return;
 const axis=Math.abs(event.deltaX)>Math.abs(event.deltaY)*1.2?'x':'y';if(axis==='y'&&exploreInnerScroll(event.target))return;
 const now=Date.now(),factor=event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1;
 if(now-immersive.wheelTime>160){immersive.wheelConsumed=false;immersive.wheelTotal=0;immersive.wheelAxis=axis}
 immersive.wheelTime=now;if(event.cancelable)event.preventDefault();
 if(immersive.wheelConsumed||axis!==immersive.wheelAxis)return;
 immersive.wheelTotal+=(axis==='x'?event.deltaX:event.deltaY)*factor;
 if(Math.abs(immersive.wheelTotal)>=(axis==='x'?40:65)){immersive.wheelConsumed=true;exploreNavigateGesture(axis,immersive.wheelTotal)}
},{passive:false});
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||state.page!=='explore'||$('#dialog').open||exploreInputProtected(event.target)||event.target?.isContentEditable||exploreHasSelection())return;
 if(['ArrowDown','ArrowUp'].includes(event.key)&&exploreInnerScroll(event.target))return;
 const actions={ArrowDown:()=>exploreAdvance(1),ArrowUp:()=>exploreAdvance(-1),ArrowLeft:()=>goDeeper(),ArrowRight:()=>back(),Escape:()=>{state.page='home';render()}};
 if(actions[event.key]){event.preventDefault();actions[event.key]()}
});
document.addEventListener('click',event=>{
 const button=event.target.closest?.('button');if(!button)return;
 if(button.dataset.browseEnter){event.preventDefault();openExplore(button.dataset.browseEnter);return}
 const action=button.dataset.exploreAction;
 if(action==='next')exploreAdvance(1);if(action==='previous')exploreAdvance(-1);if(action==='related')goDeeper();
});
window.addEventListener('resize',()=>{if(state.page==='explore')exploreMeasureBody()});
