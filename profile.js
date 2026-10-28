const profileDefaults={name:'Explorer',bio:'',status:'',theme:'fern',badges:true,nameColor:'',accentColor:'',baseColor:'#171a18',avatarImage:'',bannerImage:'',backgroundImage:'',shape:'circle',font:'sans',effect:'soft',bannerPosition:'center',avatarPosition:'center',bannerHeight:160,overlay:88};
const validColor=(color,fallback)=>/^#[0-9a-f]{6}$/i.test(color||'')?color:fallback;
const validProfileImage=image=>typeof image==='string'&&image.length<=500000&&/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(image)?image:'';
function normalizeProfile(value){
 const p={...profileDefaults,...(value&&typeof value==='object'?value:{})};
 for(const key of ['name','bio','status'])p[key]=String(p[key]??'').slice(0,key==='bio'?300:key==='name'?32:50);
 p.name=p.name.trim()||'Explorer';
 p.theme=['fern','lavender','sunset'].includes(p.theme)?p.theme:'fern';
 p.nameColor=validColor(p.nameColor,'');p.accentColor=validColor(p.accentColor,'');p.baseColor=validColor(p.baseColor,'#171a18');
 for(const key of ['avatarImage','bannerImage','backgroundImage'])p[key]=validProfileImage(p[key]);
 const choices={shape:['circle','rounded','square'],font:['sans','serif','mono'],effect:['soft','outline','glow'],bannerPosition:['top','center','bottom'],avatarPosition:['top','center','bottom']};
 for(const [key,options]of Object.entries(choices))if(!options.includes(p[key]))p[key]=profileDefaults[key];
 p.bannerHeight=160;p.overlay=88;p.avatarPosition='center';p.bannerPosition='center';p.badges=!!p.badges;
 p.widgetStudio=normalizeProfileRegions(p.widgetStudio);p.widgetPresentation=normalizeWidgetPresentation(p.widgetPresentation);p.design=normalizeCanvasDesign(p.design,p);p.header=normalizeProfileHeader(p.header,p);
 return p;
}
const profileFont=p=>({sans:'inherit',serif:'Georgia,serif',mono:'ui-monospace,monospace'}[p.font]||'inherit');
const profileAccent=p=>p.accentColor||themes[p.theme].accent;
const profileNameColor=p=>p.nameColor||themes[p.theme].accent;
const profileRadius=p=>({circle:'50%',rounded:'22%',square:'7%'}[p.shape]||'50%');
function profileAvatarContents(p=profile){return p.avatarImage?`<img src="${p.avatarImage}" alt="" style="object-position:center ${p.avatarPosition}">`:esc(p.name.charAt(0).toUpperCase())}
function profileAvatar(p=profile,extra=''){return `<span class="avatar you profile-avatar ${extra}" style="border-radius:${profileRadius(p)};--profile-accent:${profileAccent(p)}">${profileAvatarContents(p)}</span>`}
function profileCard(p,preview=false,feed=false){
 if(feed)return feedProfileBanner(p);
 return `<section class="personal-profile unified-profile effect-${p.effect} ${preview?'profile-preview-card':''}" aria-label="${preview?'Profile preview':'Your profile'}" style="--profile-accent:${profileAccent(p)};--profile-base:${p.baseColor}">${feedProfileBanner(p,preview)}<div class="profile-meta" style="background:${p.baseColor}"><div class="profile-meta-top">${preview?'<span class="preview-status">Live preview</span>':`<button class="secondary-btn" data-action="edit-profile">Customize profile ${icon('settings')}</button>`}${p.status?`<span class="profile-status">${esc(p.status)}</span>`:''}</div>${p.badges?'<div class="badges"><span class="badge">\u2733 Early explorer</span><span class="badge">\u25a7 Maker</span><span class="badge">\u2197 Off the beaten path</span></div>':''}${p.bio?`<p class="profile-bio">${esc(p.bio)}</p>`:''}${preview?'':`<div class="profile-stats"><span><strong>${customPosts.filter(ownPost).length}</strong> posts</span><span><strong>${following.length}</strong> following</span><span><strong>${history.length}</strong> journeys</span></div>`}</div></section>`;
}
function feedProfileBanner(p,preview=false){return `<section class="feed-identity-banner" aria-label="${preview?'Banner preview':'Your profile preview'}" style="background:${p.bannerImage?p.baseColor:themes[p.theme].banner}">${p.bannerImage?`<img class="feed-banner-image" src="${p.bannerImage}" alt="Custom profile banner">`:''}<div class="feed-banner-shade"></div><button class="feed-banner-adjust" type="button" data-profile-crop="bannerImage" aria-label="Adjust banner image"><span>${icon('settings')} Adjust banner</span></button><button class="feed-banner-avatar" type="button" data-profile-crop="avatarImage" aria-label="Adjust profile picture">${profileAvatar(p)}</button><${preview?'div':'button'} class="feed-banner-name" ${preview?'':'data-page="profile" aria-label="View your profile"'}><strong style="color:${p.nameColor||'#F7F7FA'};font-family:${profileFont(p)}">${esc(p.name)}</strong><small>@${esc(accountHandle())}</small></${preview?'div':'button'}></section>`}
function profilePage(){return socialProfilePage()}
let profileDraft=null,profileUploadCounts={},profilePendingUploads=new Set(),profileCrop=null,profileCropSources={},profileCropGeneration=0;
function imagePicker(key,title,description){return `<div class="profile-image-choice"><div><strong>${title}</strong><small>${description}</small></div><div class="image-choice-actions"><label class="image-upload-btn" role="button" tabindex="0" aria-label="Choose ${title.toLowerCase()}">Choose image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-profile-image="${key}" aria-label="${title}"></label>${['avatarImage','bannerImage'].includes(key)?`<button type="button" class="secondary-btn" data-profile-crop="${key}">Adjust crop</button>`:''}<button type="button" class="secondary-btn" data-profile-remove="${key}" ${!profileDraft[key]?'disabled':''}>Remove</button></div><span class="image-upload-status" id="upload-status-${key}" role="status">${profileDraft[key]?'Custom image selected':'No custom image'}</span></div>`}
function selectProfileField(key,label,options){return `<label class="field"><span>${label}</span><select name="${key}">${options.map(([value,title])=>`<option value="${value}" ${profileDraft[key]===value?'selected':''}>${title}</option>`).join('')}</select></label>`}
function profileColorField(key,title,color){return `<label class="profile-color-field"><span>${title}</span><div><input type="color" name="${key}" value="${color}"><output id="profile-value-${key}">${color.toUpperCase()}</output></div></label>`}
function openProfileEditor(initial=profile){openProfileStudio(initial)}
function refreshProfilePreview(){designerPreviewRefresh()}
function updateProfileField(input){
 if(!profileDraft||!input.name||!(input.name in profileDefaults))return;
 profileDraft[input.name]=input.type==='checkbox'?input.checked:['overlay','bannerHeight'].includes(input.name)?Number(input.value):input.value;
 const output=$('#profile-value-'+input.name);
 if(output)output.textContent=input.name==='bannerHeight'?input.value+'px':input.name==='overlay'?input.value+'%':input.value.toUpperCase();
 refreshProfilePreview();
}
function handleProfileClick(el,d){
 if(!profileDraft||!$('#profile-form'))return false;
 if(d.theme){
  profileDraft.theme=d.theme;profileDraft.accentColor=themes[d.theme].accent;
  for(const key of ['nameColor','accentColor']){const value=key==='nameColor'?profileNameColor(profileDraft):profileAccent(profileDraft),input=$(`#profile-form [name="${key}"]`);if(input)input.value=value;const output=$('#profile-value-'+key);if(output)output.textContent=value.toUpperCase()}
  document.querySelectorAll('.theme-dot').forEach(b=>{b.classList.toggle('active',b.dataset.theme===d.theme);b.setAttribute('aria-pressed',b.dataset.theme===d.theme)});refreshProfilePreview();return true;
 }
 if(d.profileRemove){const key=d.profileRemove;if(profileCrop?.key===key)closeProfileCrop();delete profileCropSources[key];profileUploadCounts[key]=(profileUploadCounts[key]||0)+1;profilePendingUploads.delete(key);profileDraft[key]='';el.disabled=true;const input=$(`[data-profile-image="${key}"]`);if(input)input.value='';$('#upload-status-'+key).textContent='No custom image';refreshProfilePreview();return true}
 if(d.profileReset!==undefined){const widgets=profileDraft.design.widgets;profileDraft.design=normalizeCanvasDesign(canvasDefaults);profileDraft.design.widgets=widgets;$('#designer-controls').innerHTML=designerControls();refreshProfilePreview();toast('Canvas reset in the draft. Save to apply it.');return true}
 return false;
}
async function profileImageFromUrl(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('That image could not be opened. Try another one.'));image.src=url})}
async function openProfileCrop(key,url){
 if(!['avatarImage','bannerImage'].includes(key)||!profileDraft)return;
 const draftRef=profileDraft,request=++profileCropGeneration,source=url||profileCropSources[key]||profileDraft[key];
 if(!source){$(`[data-profile-image="${key}"]`)?.click();return}
 try{const image=await profileImageFromUrl(source);if(profileDraft!==draftRef||request!==profileCropGeneration)return;
 profileCropSources[key]=source;profileCrop={key,image,zoom:1,cx:image.naturalWidth/2,cy:image.naturalHeight/2,ratio:key==='avatarImage'?1:3,drag:null};
 const host=$('#profile-crop-editor');host.hidden=false;$('#dialog').classList.add('profile-crop-mode');$('#dialog').scrollTop=0;host.innerHTML=`<h2 id="profile-crop-title">${key==='avatarImage'?'Adjust your avatar':'Adjust your banner'}</h2><p class="crop-hint">Drag to reposition</p><div class="crop-stage ${key==='avatarImage'?'avatar-crop-stage':''}" style="max-width:${key==='avatarImage'?300:360}px"><canvas id="profile-crop-canvas" width="${key==='avatarImage'?640:600}" height="${key==='avatarImage'?640:200}" tabindex="0" aria-label="Move image crop with arrow keys"></canvas>${key==='avatarImage'?`<div class="crop-guide" style="border-radius:${profileRadius(profileDraft)}"></div>`:''}</div><div class="crop-zoom-row"><button type="button" data-crop-action="zoom-out" aria-label="Zoom out">\u2212</button><input id="profile-crop-zoom" aria-label="Crop zoom" type="range" min="1" max="4" step="0.05" value="1"><button type="button" data-crop-action="zoom-in" aria-label="Zoom in">+</button></div><div class="crop-actions"><button type="button" class="crop-cancel" data-crop-action="cancel">Cancel</button><button type="button" class="primary" data-crop-action="apply">Apply</button></div>`;
 const canvas=$('#profile-crop-canvas');canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);profileCrop.drag={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointermove',e=>{const c=profileCrop;if(!c?.drag)return;const rect=canvas.getBoundingClientRect(),crop=profileCropRect(c);c.cx-=(e.clientX-c.drag.x)*crop.width/rect.width;c.cy-=(e.clientY-c.drag.y)*crop.height/rect.height;c.drag={x:e.clientX,y:e.clientY};paintProfileCrop()});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{if(profileCrop)profileCrop.drag=null});
 canvas.addEventListener('keydown',e=>{const c=profileCrop;if(!c||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const crop=profileCropRect(c),step=e.shiftKey?.1:.025;c.cx+=e.key==='ArrowLeft'?-crop.width*step:e.key==='ArrowRight'?crop.width*step:0;c.cy+=e.key==='ArrowUp'?-crop.height*step:e.key==='ArrowDown'?crop.height*step:0;paintProfileCrop()});
 $('#profile-crop-zoom').addEventListener('input',e=>{if(!profileCrop)return;profileCrop.zoom=Number(e.target.value);paintProfileCrop()});paintProfileCrop();canvas.focus();
 }catch(error){toast(error.message)}
}
function profileCropRect(c){const w=c.image.naturalWidth,h=c.image.naturalHeight,width=Math.min(w,h*c.ratio)/c.zoom,height=width/c.ratio;c.cx=Math.max(width/2,Math.min(w-width/2,c.cx));c.cy=Math.max(height/2,Math.min(h-height/2,c.cy));return {x:c.cx-width/2,y:c.cy-height/2,width,height}}
function paintProfileCrop(){const c=profileCrop,canvas=$('#profile-crop-canvas');if(!c||!canvas)return;const rect=profileCropRect(c),ctx=canvas.getContext('2d');ctx.drawImage(c.image,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height)}
function closeProfileCrop(){profileCropGeneration++;profileCrop=null;const dialog=$('#dialog');dialog?.classList.remove('profile-crop-mode');const host=$('#profile-crop-editor');if(host){host.hidden=true;host.innerHTML=''}}
function handleCropAction(action){if(!profileCrop)return;if(action==='zoom-out'||action==='zoom-in'){profileCrop.zoom=Math.max(1,Math.min(4,profileCrop.zoom+(action==='zoom-in'?.1:-.1)));$('#profile-crop-zoom').value=String(profileCrop.zoom);paintProfileCrop();return}if(action==='cancel'){closeProfileCrop();return}if(action==='reset'){profileCrop.zoom=1;profileCrop.cx=profileCrop.image.naturalWidth/2;profileCrop.cy=profileCrop.image.naturalHeight/2;$('#profile-crop-zoom').value='1';paintProfileCrop();return}if(action!=='apply')return;
 const c=profileCrop,rect=profileCropRect(c),canvas=document.createElement('canvas');let width=c.key==='avatarImage'?320:1200,quality=.86,data='';
 for(let attempt=0;attempt<7;attempt++){canvas.width=Math.round(width);canvas.height=Math.round(width/c.ratio);canvas.getContext('2d').drawImage(c.image,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/webp',quality);if(validProfileImage(data))break;quality=Math.max(.5,quality-.12);width*=.8}
 if(!validProfileImage(data)){toast('This image is too detailed. Try a smaller crop.');return}profileDraft[c.key]=data;profileDraft[c.key==='avatarImage'?'avatarPosition':'bannerPosition']='center';const alignment=$(`#profile-form [name="${c.key==='avatarImage'?'avatarPosition':'bannerPosition'}"]`);if(alignment)alignment.value='center';$('#upload-status-'+c.key).textContent='Crop ready \u2014 save your look to apply';$(`[data-profile-remove="${c.key}"]`).disabled=false;closeProfileCrop();refreshProfilePreview();
}
async function uploadProfileImage(input){
 const file=input.files?.[0];if(!file||!profileDraft)return;const key=input.dataset.profileImage,draftRef=profileDraft,attempt=(profileUploadCounts[key]||0)+1;profileUploadCounts[key]=attempt;profilePendingUploads.add(key);$('#upload-status-'+key).textContent='Opening crop editor\u2026';
 try{if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choose a JPG, PNG, WebP or GIF image.');if(file.size>20*1024*1024)throw Error('Choose an image smaller than 20 MB.');const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('That image could not be read.'));reader.readAsDataURL(file)});if(profileDraft!==draftRef||profileUploadCounts[key]!==attempt)return;if(key==='backgroundImage'){const optimized=await optimizeCanvasBackground(url);if(profileDraft!==draftRef||profileUploadCounts[key]!==attempt)return;profileDraft[key]=optimized;profileDraft.design.backgroundMode='image';$('#designer-controls').innerHTML=designerControls();refreshProfilePreview()}else await openProfileCrop(key,url);if(profileDraft===draftRef)$('#upload-status-'+key).textContent=profileDraft[key]?'Custom image selected':'No custom image';}
 catch(error){if(profileDraft===draftRef&&profileUploadCounts[key]===attempt){$('#upload-status-'+key).textContent=error.message;toast(error.message)}}finally{if(profileDraft===draftRef&&profileUploadCounts[key]===attempt){profilePendingUploads.delete(key);input.value=''}}
}
async function saveProfileDraft(form){
 if(profileStudio.saving)return;
 if(profileCrop){toast('Apply or cancel your crop before saving your look.');return}
 if(profilePendingUploads.size){toast('Let your image finish preparing, then save.');return}
 for(const input of form.elements)if(input.name&&input.name in profileDefaults){if(['nameColor','accentColor'].includes(input.name)&&!profileDraft[input.name]&&input.value===(input.name==='nameColor'?profileNameColor(profileDraft):profileAccent(profileDraft)))continue;updateProfileField(input);}
 const cssInput=$('[data-design-css]');const cssError=validateCanvasCSS(cssInput?.value||'');if(cssError){toast(cssError);return}
 const saved=normalizeProfile(profileDraft);if(new TextEncoder().encode(JSON.stringify(saved.design.widgets)).length>500000){toast('Your widgets contain too many images. Remove an image or use a smaller one.');return}if(new TextEncoder().encode(JSON.stringify(saved)).length>1550000){toast('Your profile is too large. Remove an image or use a smaller one.');return}
 const owner=authUser?.id;if(!owner){openAccount('signin');return}const save=form.querySelector('button[type="submit"]');if(save)save.disabled=true;profileStudio.saving=true;studioSync();try{await persistAccountProfile(saved,form.elements.namedItem('username').value)}catch(error){profileStudio.saving=false;studioSync();toast(error.message);if(save)save.disabled=false;return}profileStudio.saving=false;if(authUser?.id!==owner)return;
 profile=saved;profileDraft=null;closeDialog();render();toast('Your new look is saved.');
}
document.addEventListener('input',e=>{if(e.target.closest('#profile-form')&&!e.target.dataset.profileImage)updateProfileField(e.target)});
document.addEventListener('change',e=>{if(e.target.dataset.profileImage)uploadProfileImage(e.target);else if(e.target.closest('#profile-form'))updateProfileField(e.target)});

