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
 p.bannerHeight=Math.max(100,Math.min(240,Number(p.bannerHeight)||160));p.overlay=Math.max(65,Math.min(100,Number(p.overlay)||88));p.badges=!!p.badges;
 return p;
}
const profileFont=p=>({sans:'inherit',serif:'Georgia,serif',mono:'ui-monospace,monospace'}[p.font]||'inherit');
const profileAccent=p=>p.accentColor||themes[p.theme].accent;
const profileNameColor=p=>p.nameColor||themes[p.theme].accent;
const profileRadius=p=>({circle:'50%',rounded:'22%',square:'7%'}[p.shape]||'50%');
function profileAvatarContents(p=profile){return p.avatarImage?`<img src="${p.avatarImage}" alt="" style="object-position:center ${p.avatarPosition}">`:esc(p.name.charAt(0).toUpperCase())}
function profileAvatar(p=profile,extra=''){return `<span class="avatar you profile-avatar ${extra}" style="border-radius:${profileRadius(p)};--profile-accent:${profileAccent(p)}">${profileAvatarContents(p)}</span>`}
function profileCard(p,preview=false){
 const accent=profileAccent(p),color=profileNameColor(p),rgb=p.baseColor.slice(1).match(/../g).map(n=>parseInt(n,16)).join(',');
 const backdrop=p.backgroundImage?`linear-gradient(rgba(${rgb},${p.overlay/100}),rgba(${rgb},${p.overlay/100})),url('${p.backgroundImage}') center/cover`:p.baseColor;
 return `<section class="personal-profile effect-${p.effect} ${preview?'profile-preview-card':''}" style="--profile-accent:${accent};--profile-base:${p.baseColor}"><div class="profile-banner ${p.bannerImage?'custom-banner':''}" style="height:${preview?Math.min(p.bannerHeight,130):p.bannerHeight}px;background:${p.bannerImage?p.baseColor:themes[p.theme].banner}">${p.bannerImage?`<img src="${p.bannerImage}" alt="Custom profile banner" style="object-position:center ${p.bannerPosition}">`:''}</div><div class="profile-details" style="background:${backdrop}"><div class="profile-top">${profileAvatar(p)}${preview?'<span class="preview-status">Live preview</span>':`<button class="secondary-btn" data-action="edit-profile">Customize profile ${icon('settings')}</button>`}</div><h2 class="personal-profile-name" style="color:${color};font-family:${profileFont(p)}">${esc(p.name)}</h2><span class="handle">@${esc(accountHandle())}${p.status?' · '+esc(p.status):''}</span>${p.badges?'<div class="badges"><span class="badge">✳ Early explorer</span><span class="badge">▧ Maker</span><span class="badge">↗ Off the beaten path</span></div>':''}<p class="profile-bio">${esc(p.bio)}</p>${preview?'':`<div class="profile-stats"><span><strong>${customPosts.filter(ownPost).length}</strong> posts</span><span><strong>${following.length}</strong> following</span><span><strong>${history.length}</strong> journeys</span></div>`}</div></section>`;
}
function profilePage(){return socialProfilePage()}
let profileDraft=null,profileUploadCounts={},profilePendingUploads=new Set();
function imagePicker(key,title,description){return `<div class="profile-image-choice"><div><strong>${title}</strong><small>${description}</small></div><div class="image-choice-actions"><label class="image-upload-btn">Choose image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-profile-image="${key}" aria-label="${title}"></label><button type="button" class="secondary-btn" data-profile-remove="${key}" ${!profileDraft[key]?'disabled':''}>Remove</button></div><span class="image-upload-status" id="upload-status-${key}" role="status">${profileDraft[key]?'Custom image selected':'No custom image'}</span></div>`}
function selectProfileField(key,label,options){return `<label class="field"><span>${label}</span><select name="${key}">${options.map(([value,title])=>`<option value="${value}" ${profileDraft[key]===value?'selected':''}>${title}</option>`).join('')}</select></label>`}
function profileColorField(key,title,color){return `<label class="profile-color-field"><span>${title}</span><div><input type="color" name="${key}" value="${color}"><output id="profile-value-${key}">${color.toUpperCase()}</output></div></label>`}
function openProfileEditor(initial=profile){
 profileDraft=normalizeProfile(initial);profilePendingUploads=new Set();profileUploadCounts={};
 $('#dialog').classList.add('profile-editor-dialog');
 openDialog(`<h2>Customize profile</h2><p class="intro">Preview your changes before saving.</p><div id="profile-live-preview">${profileCard(profileDraft,true)}</div><form id="profile-form"><details class="profile-editor-group" open><summary>Your images<span>Picture, banner & background</span></summary><div class="profile-editor-group-body">${imagePicker('avatarImage','Profile picture','Your identity across Zopathy')}${imagePicker('bannerImage','Banner','The first thing people see')}${imagePicker('backgroundImage','Profile background','An image behind your bio and badges')}<p class="image-hint">JPG, PNG, WebP or GIF · up to 20 MB. GIFs become still images. Images are saved with your account profile.</p><div class="profile-fields-grid">${selectProfileField('shape','Picture shape',[['circle','Circle'],['rounded','Rounded square'],['square','Square']])}${selectProfileField('avatarPosition','Picture alignment',[['top','Top'],['center','Center'],['bottom','Bottom']])}${selectProfileField('bannerPosition','Banner alignment',[['top','Top'],['center','Center'],['bottom','Bottom']])}<label class="field"><span>Banner height <output id="profile-value-bannerHeight">${profileDraft.bannerHeight}px</output></span><input type="range" name="bannerHeight" min="100" max="240" step="10" value="${profileDraft.bannerHeight}"></label></div><label class="field"><span>Background shading <output id="profile-value-overlay">${profileDraft.overlay}%</output></span><input type="range" name="overlay" min="65" max="100" value="${profileDraft.overlay}"></label></div></details><details class="profile-editor-group"><summary>Colors & style<span>Your name, your signature</span></summary><div class="profile-editor-group-body"><span class="small-label">START WITH A THEME</span><div class="theme-options">${Object.entries(themes).map(([name,t])=>`<button type="button" class="theme-dot ${profileDraft.theme===name?'active':''}" style="background:${t.accent}" data-theme="${name}" aria-label="${name} theme" aria-pressed="${profileDraft.theme===name}"></button>`).join('')}</div><div class="profile-colors-grid">${profileColorField('nameColor','Name color',profileNameColor(profileDraft))}${profileColorField('accentColor','Accent color',profileAccent(profileDraft))}${profileColorField('baseColor','Background color',profileDraft.baseColor)}</div><div class="profile-fields-grid">${selectProfileField('font','Name font',[['sans','Modern'],['serif','Editorial'],['mono','Monospace']])}${selectProfileField('effect','Profile border',[['soft','Subtle'],['outline','Accent outline'],['glow','Soft glow']])}</div></div></details><details class="profile-editor-group"><summary>About you<span>Name, status & badges</span></summary><div class="profile-editor-group-body"><label class="field"><span>Display name</span><input name="name" value="${esc(profileDraft.name)}" required maxlength="32"></label><label class="field"><span>Status</span><input name="status" value="${esc(profileDraft.status)}" maxlength="50"></label><label class="field"><span>About you</span><textarea name="bio" maxlength="300">${esc(profileDraft.bio)}</textarea></label><label class="profile-checkbox"><input name="badges" type="checkbox" ${profileDraft.badges?'checked':''}> Show profile badges</label></div></details><div class="profile-editor-footer"><button type="button" class="secondary-btn" data-profile-reset>Reset look</button><div><button type="button" class="secondary-btn" data-action="cancel-profile">Cancel</button><button class="primary" type="submit">Save your look ${icon('arrow')}</button></div></div></form>`);
}
function refreshProfilePreview(){if(!profileDraft||!$('#profile-live-preview'))return;$('#profile-live-preview').innerHTML=profileCard(normalizeProfile(profileDraft),true)}
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
 if(d.profileRemove){const key=d.profileRemove;profileUploadCounts[key]=(profileUploadCounts[key]||0)+1;profilePendingUploads.delete(key);profileDraft[key]='';el.disabled=true;const input=$(`[data-profile-image="${key}"]`);if(input)input.value='';$('#upload-status-'+key).textContent='No custom image';refreshProfilePreview();return true}
 if(d.profileReset!==undefined){openProfileEditor({...profileDefaults,name:profileDraft.name,bio:profileDraft.bio,status:profileDraft.status});toast('Look reset in the preview. Save to apply it.');return true}
 return false;
}
async function readProfileImage(file,key){
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Choose a JPG, PNG, WebP or GIF image.');
 if(file.size>20*1024*1024)throw Error('Choose an image smaller than 20 MB.');
 const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('That image couldn’t be read. Try another one.'));reader.readAsDataURL(file)});
 const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('That image couldn’t be opened. Try another one.'));img.src=url});
 const maxWidth=key==='avatarImage'?320:1200,maxHeight=key==='avatarImage'?320:900;
 let scale=Math.min(1,maxWidth/image.naturalWidth,maxHeight/image.naturalHeight),quality=.84;
 const canvas=document.createElement('canvas');
 for(let attempt=0;attempt<7;attempt++){
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image processing isn’t available in this browser.');ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/webp',quality);if(data.length<=500000&&validProfileImage(data))return data;
  quality=Math.max(.5,quality-.12);scale*=.8;
 }
 throw Error('This image is too detailed to save. Try a smaller image.');
}
async function uploadProfileImage(input){
 const file=input.files?.[0];if(!file||!profileDraft)return;
 const key=input.dataset.profileImage,draftRef=profileDraft,attempt=(profileUploadCounts[key]||0)+1;profileUploadCounts[key]=attempt;profilePendingUploads.add(key);
 $('#upload-status-'+key).textContent='Preparing image…';
 try{
  const data=await readProfileImage(file,key);
  if(profileDraft!==draftRef||profileUploadCounts[key]!==attempt)return;
  profileDraft[key]=data;$('#upload-status-'+key).textContent='Custom image selected';const remove=$(`[data-profile-remove="${key}"]`);if(remove)remove.disabled=false;refreshProfilePreview();
 }catch(error){if(profileDraft===draftRef&&profileUploadCounts[key]===attempt){$('#upload-status-'+key).textContent=error.message;toast(error.message)}}
 finally{if(profileDraft===draftRef&&profileUploadCounts[key]===attempt){profilePendingUploads.delete(key);input.value=''}}
}
async function saveProfileDraft(form){
 if(profilePendingUploads.size){toast('Let your image finish preparing, then save.');return}
 for(const input of form.elements)if(input.name&&input.name in profileDefaults)updateProfileField(input);
 const saved=normalizeProfile(profileDraft);
 const owner=authUser?.id;if(!owner){openAccount('signin');return}const save=form.querySelector('button[type="submit"]');if(save)save.disabled=true;try{await persistAccountProfile(saved)}catch(error){toast(error.message);if(save)save.disabled=false;return}if(authUser?.id!==owner)return;
 profile=saved;profileDraft=null;closeDialog();render();toast('Your new look is saved.');
}
document.addEventListener('input',e=>{if(e.target.closest('#profile-form')&&!e.target.dataset.profileImage)updateProfileField(e.target)});
document.addEventListener('change',e=>{if(e.target.dataset.profileImage)uploadProfileImage(e.target);else if(e.target.closest('#profile-form'))updateProfileField(e.target)});

