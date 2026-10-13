let authClient=null,authUser=null,authReady=false,authMode='signin',authNotice='',authBusy=false,authGeneration=0;
let accountUsername='you';
function accountStorageKey(key){return key==='preferences'||!authUser?'curiosity.'+key:'zopathy.user.'+authUser.id+'.'+key}
function accountHandle(){return authUser?accountUsername:'you'}
function authConfigured(){const c=window.ZOPATHY_CONFIG||{};return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.supabaseUrl||'')&&/^sb_publishable_[a-zA-Z0-9_-]+$/.test(c.publishableKey||'')}
function authTransportSecure(){return location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)}
function accountSidebar(){
 const container=$('#account-controls');if(!container)return;
 if(!authReady&&authConfigured()&&authTransportSecure()){container.innerHTML=`<div class="account-restoring" role="status">${authNotice?'Your account could not reconnect. <button class="secondary-btn" data-auth-action="retry">Try again</button>':'Restoring your account…'}</div>`;return}
 container.innerHTML=authUser?`<button class="account-user" data-page="profile">${profileAvatar(profile)}<span><strong style="color:${profileNameColor(profile)}">${esc(profile.name)}</strong><small>@${esc(accountHandle())}</small></span></button><button class="account-signout" data-auth-action="signout">Sign out</button>`:`<div class="guest-account"><button class="primary" data-auth-mode="signup">Create account</button><button class="secondary-btn" data-auth-mode="signin">Sign in</button></div>`;
}
function renderAccount(){
 if(authUser&&authMode!=='update-password')return header('Account')+`<div class="page-content"><div class="account-card"><h2>${esc(profile.name)}</h2><p class="account-description">${esc(authUser.email||'')}</p><span class="account-verification ${authUser.email_confirmed_at?'verified':''}">${authUser.email_confirmed_at?'Email verified':'Verify your email to finish setting up your account.'}</span>${!authUser.email_confirmed_at?'<button class="secondary-btn" data-auth-action="resend">Resend verification email</button>':''}<div class="account-card-actions"><button class="primary" data-page="profile">Your profile ${icon('user')}</button><button class="secondary-btn" data-auth-action="signout">Sign out</button></div></div></div>`;
 const cfg=window.ZOPATHY_CONFIG||{},signup=authMode==='signup',recover=authMode==='recover',update=authMode==='update-password';
 const title=signup?'Create your account':recover?'Reset your password':update?'Choose a new password':'Sign in to Zopathy';
 const usable=authConfigured()&&authTransportSecure()&&authReady&&(authMode!=='signup'||cfg.signupEnabled);
 const unavailable=!authTransportSecure()?'Please open Zopathy using HTTPS to access your account.':!authConfigured()?'Accounts are being set up. Please try again soon.':!authReady?'Connecting to accounts…':signup&&!cfg.signupEnabled?'Public registration is not open yet.':'';
 return header('Account')+`<div class="page-content"><section class="account-card"><div class="account-brand">${icon('user')}</div><h2>${title}</h2><p class="account-description">${recover?'Enter your email and we’ll send a password-reset link.':update?'Use a password of at least 12 characters.':signup?'Save your profile and make Zopathy yours.':'Welcome back.'}</p><div id="auth-message" class="auth-message ${unavailable?'auth-warning':''}" role="status" aria-live="polite">${esc(unavailable||authNotice)}</div><form id="auth-form" data-mode="${authMode}">${signup?'<label class="field"><span>Display name</span><input name="displayName" autocomplete="nickname" required maxlength="32" placeholder="Your name"></label>':''}${!update?'<label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label>':''}${!recover?`<label class="field"><span>${update?'New password':'Password'}</span><input name="password" type="password" autocomplete="${signup||update?'new-password':'current-password'}" required ${signup||update?'minlength="12"':''} maxlength="72" placeholder="${signup||update?'At least 12 characters':'Your password'}"></label>`:''}${signup||update?'<label class="field"><span>Confirm password</span><input name="confirmPassword" type="password" autocomplete="new-password" required minlength="12" maxlength="72" placeholder="Repeat your password"></label>':''}<button class="primary auth-submit" type="submit" ${!usable||authBusy?'disabled':''}>${authBusy?'Please wait…':signup?'Create account':recover?'Send reset link':update?'Save new password':'Sign in'} ${icon('arrow')}</button></form><div class="auth-links">${recover?'<button data-auth-mode="signin">Back to sign in</button>':update?'':signup?'Already have an account? <button data-auth-mode="signin">Sign in</button>':'<button data-auth-mode="recover">Forgot password?</button><span>New to Zopathy? <button data-auth-mode="signup">Create account</button></span>'}</div><p class="account-privacy">Your email is private. Your Zopathy profile is public.</p></section></div>`;
}
function openAccount(mode='signin',message=''){authMode=mode;authNotice=message;state.page='account';closeDialog();render();window.scrollTo(0,0)}
function requireAccount(){if(authUser)return true;if(!authReady&&authConfigured()&&authTransportSecure()){toast('Your account is reconnecting. Please wait or try again.');return false}openAccount('signin','Sign in or create an account to continue.');return false}
function setAuthMessage(message,error=false){authNotice=message;const el=$('#auth-message');if(el){el.textContent=message;el.classList.toggle('auth-warning',error)}}
async function applyAccountUser(user){
 const previousId=authUser?.id;const generation=++authGeneration;authUser=user||null;accountUsername=authUser?'z_'+authUser.id.replaceAll('-','').slice(0,8):'you';
 if(previousId!==authUser?.id){draft={title:'',text:'',blocks:[]};closeDialog();}
 resetSocial();prefs={saveHistory:true,siteTheme:'red',browseDestination:'home',...read('preferences',{})};state.focusPost=null;state.rootPostId=null;state.rootIndex=0;state.path=[];state.trail=false;state.why=false;
 profile=authUser?normalizeProfile({...profileDefaults,name:authUser.user_metadata?.display_name||'Explorer',bio:'',status:''}):normalizeProfile(profileDefaults);
 if(authUser&&authClient){
  const {data,error}=await authClient.from('zopathy_profiles').select('id,username,display_name,bio,status,appearance').eq('id',authUser.id).maybeSingle();
  if(generation!==authGeneration)return;
  if(data){accountUsername=data.username;profile=normalizeProfile({...data.appearance,name:data.display_name,bio:data.bio,status:data.status});}
  else if(error){toast('Your account is signed in, but its profile could not load. Please try again.');}
 }
 if(generation===authGeneration){await loadSocial();if(generation===authGeneration){browseApplyInitialDestination();await socialLoadDeepLink();if(generation===authGeneration)browseApplyExplicitView()}}
}
async function persistAccountProfile(candidate,username=accountUsername){
 if(!authUser||!authClient)throw Error('Sign in to save your profile.');
 username=String(username).trim().replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('Use 3–24 letters, numbers, or underscores for your handle.');
 const {name,bio,status,...appearance}=normalizeProfile(candidate),owner=authUser.id;
 const {data,error}=await authClient.from('zopathy_profiles').update({username,display_name:name,bio,status,appearance}).eq('id',owner).select('id').single();
 if(error?.code==='23505')throw Error('That handle is already taken. Try another one.');
 if(error||!data)throw Error('Your profile could not be saved. Please try again.');
 if(authUser?.id!==owner)throw Error('Your account changed. Sign in again before saving.');
 accountUsername=username;const row=social.profiles.get(owner);if(row)social.profiles.set(owner,{...row,username,display_name:name,bio,status,appearance});for(const p of customPosts)if(p.user===owner){p.author={...row,username,display_name:name,bio,status,appearance};p.handle=username;p.name=name;}
}
function friendlyAuthError(error){
 const code=error?.code||'';
 if(code==='invalid_credentials')return 'Email or password is incorrect.';
 if(code==='email_not_confirmed')return 'Please confirm your email before signing in.';
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit')return 'Too many attempts. Please wait a few minutes and try again.';
 if(code==='email_address_not_authorized')return 'Registration emails are not available yet. Please try again later.';
 if(code==='user_already_exists')return 'Try signing in or resetting your password.';
 if(code==='weak_password')return 'Choose a stronger password with at least 12 characters.';
 return 'We couldn’t complete that request. Please try again.';
}
async function submitAuthForm(form){
 if(authBusy)return;
 if(!authConfigured()||!authClient||!authReady||!authTransportSecure()){setAuthMessage('Accounts are not available yet. Please try again soon.',true);return}
 const mode=form.dataset.mode,fields=new FormData(form),email=String(fields.get('email')||'').trim(),password=String(fields.get('password')||'');
 if(mode==='signup'&&!window.ZOPATHY_CONFIG.signupEnabled){setAuthMessage('Public registration is not open yet.',true);return}
 if((mode==='signup'||mode==='update-password')&&(password.length<12||password!==fields.get('confirmPassword'))){setAuthMessage(password.length<12?'Use a password of at least 12 characters.':'The passwords don’t match.',true);return}
 authBusy=true;const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Please wait…';setAuthMessage('');
 try{
  if(mode==='signup'){
   const displayName=String(fields.get('displayName')||'').trim();if(!displayName)throw {code:'name_required'};
   const {data,error}=await authClient.auth.signUp({email,password,options:{data:{display_name:displayName.slice(0,32)},emailRedirectTo:location.origin+'/'}});if(error)throw error;
   if(data.session){await applyAccountUser(data.user);state.page='profile';render()}
   else{form.reset();setAuthMessage('Check your email to confirm your account, then sign in. If you already have an account, use Sign in instead.');}
  }else if(mode==='recover'){
   const {error}=await authClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/?account=recovery'});if(error)throw error;
   setAuthMessage('If an account exists for that email, you’ll receive a password-reset link.');
  }else if(mode==='update-password'){
   if(!authUser)throw {code:'invalid_credentials'};
   const {error}=await authClient.auth.updateUser({password});if(error)throw error;
   authMode='signin';state.page='profile';render();toast('Password updated.');
  }else{
   const {data,error}=await authClient.auth.signInWithPassword({email,password});if(error)throw error;
   await applyAccountUser(data.user);state.page='profile';render();toast('Signed in.');
  }
 }catch(error){setAuthMessage(error.code==='name_required'?'Enter a display name.':friendlyAuthError(error),true)}
 finally{authBusy=false;for(const input of form.querySelectorAll('input[type="password"]'))input.value='';if(button.isConnected){button.disabled=false;button.textContent=mode==='signup'?'Create account':mode==='recover'?'Send reset link':mode==='update-password'?'Save new password':'Sign in'}}
}
async function handleAuthAction(action){
 if(action==='retry'){await restoreAccountSession();return}
 if(action==='signout'){
  if(!authClient)return;const {error}=await authClient.auth.signOut();if(error){toast('Sign out failed. Please try again.');return}
  await applyAccountUser(null);state.page='home';draft={title:'',text:'',blocks:[]};render();toast('Signed out.');
 }
 if(action==='resend'&&authUser&&authClient){const {error}=await authClient.auth.resend({type:'signup',email:authUser.email,options:{emailRedirectTo:location.origin+'/'}});toast(error?friendlyAuthError(error):'Verification email requested. Check your inbox.')}
}
async function initializeAccounts(){
 if(!authConfigured()||!authTransportSecure()||!window.supabase?.createClient){authReady=false;social.ready=true;social.error='Open Zopathy using HTTPS to load the shared community.';render();return}
 authClient=window.supabase.createClient(window.ZOPATHY_CONFIG.supabaseUrl,window.ZOPATHY_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'zopathy.auth.session'}});
 authClient.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION')return;
  setTimeout(async()=>{try{if(event==='PASSWORD_RECOVERY'){authReady=true;await applyAccountUser(session?.user||null);openAccount('update-password');return}if(event==='SIGNED_OUT')await applyAccountUser(null);else if(event==='SIGNED_IN'&&session?.user?.id!==authUser?.id)await applyAccountUser(session.user)}catch{toast('Account connection failed. Please try again.')}},0);
 });
 await restoreAccountSession();
}
async function restoreAccountSession(){
 if(!authClient)return;authNotice='';
 try{const {data,error}=await authClient.auth.getSession();if(error)throw error;authReady=true;await applyAccountUser(data.session?.user||null)}
 catch{authNotice='Your account could not reconnect. Please try again.';social.ready=true;social.error=authNotice;render()}
}
document.addEventListener('submit',e=>{if(e.target.id==='auth-form'){e.preventDefault();submitAuthForm(e.target)}});

