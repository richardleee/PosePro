/* PosePro AI Camera interactive HTML prototype.
 * No network services, image uploads, pose inference, or payment processing.
 * Camera access is optional and requested only after an explicit user action.
 * Session/style metadata uses model.js; photo bytes remain in memory only.
 */
(function () {
  'use strict';
  const M = window.PoseProModel || window.MuseModel;
  const $ = s => document.querySelector(s);
  const app = $('#app'), view = $('#view'), topbar = $('#topbar'), bottom = $('#bottom');
  const modalRoot = $('#modal-root'), toastEl = $('#toast'), countdownEl = $('#countdown');
  const paths = {
    spark:'<path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"/><circle cx="12" cy="12" r="4"/>',
    bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',
    sliders:'<path d="M3 6h5m4 0h9M3 12h11m4 0h3M3 18h3m4 0h11"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    layers:'<path d="m12 3 10 6-10 6L2 9Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    style:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z"/>',
    settings:'<path d="m10 3-.7 2.1-2 .9-2.1-.5-2 3.5 1.5 1.6v2.8L3.2 15l2 3.5 2.1-.5 2 .9.7 2.1h4l.7-2.1 2-.9 2.1.5 2-3.5-1.5-1.6v-2.8L20.8 9l-2-3.5-2.1.5-2-.9L14 3Z"/><circle cx="12" cy="12" r="3"/>',
    x:'<path d="m6 6 12 12M6 18 18 6"/>', check:'<path d="m5 12 4 4L19 6"/>',
    arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>', chevron:'<path d="m9 5 7 7-7 7"/>', back:'<path d="m14 5-7 7 7 7"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    cup:'<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 8h2a3 3 0 1 1 0 6h-2M8 3v2m5-2v2M3 21h15"/>',
    shirt:'<path d="m8 3-5 3-2 5 5 2v8h12v-8l5-2-2-5-5-3a4 4 0 0 1-8 0Z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    heart:'<path d="M20.7 5.6a5.5 5.5 0 0 0-7.8 0l-.9.9-.9-.9a5.5 5.5 0 0 0-7.8 7.8L12 22l8.7-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    briefcase:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12a22 22 0 0 0 18 0M10 13h4"/>',
    person:'<circle cx="12" cy="7" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m3-10a3 3 0 0 0 0-6m0 10a6 6 0 0 1 4 6"/>',
    phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
    frame:'<path d="M3 8V4h4m10 0h4v4m0 8v4h-4M7 20H3v-4"/><circle cx="12" cy="9" r="2"/><path d="M8 16a4 4 0 0 1 8 0"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    mirror:'<path d="M12 3v18M8 5 3 12l5 7M16 5l5 7-5 7"/>',
    voice:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    mute:'<path d="m11 4-6 5H2v6h3l6 5Zm5 5 5 6m-5 0 5-6"/>',
    outline:'<circle cx="12" cy="4" r="2"/><path d="M12 6v9m-6-7 6 2 6-2m-6 7-4 7m4-7 4 7"/>',
    pause:'<path d="M8 5v14M16 5v14"/>', play:'<path d="m7 4 13 8-13 8Z"/>',
    camera:'<path d="M8 5 6 8H3v12h18V8h-3l-2-3Z"/><circle cx="12" cy="13" r="4"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13.6 5M4.3 13a8 8 0 0 0 13.6 5"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    warning:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v.1"/>',
    moon:'<path d="M20 15a8 8 0 0 1-11-11A9 9 0 1 0 20 15Z"/>',
    photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    wifi:'<path d="M2 8a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0m-11 4a5 5 0 0 1 8 0m-4 4v.1"/>',
    leaf:'<path d="M20 3C9 2 3 8 5 15s15 6 15-12ZM5 19l10-10"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v.1"/>'
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn = (label, action, css='primary', extra='') => `<button type="button" class="${css}" data-action="${action}" ${extra}>${label}</button>`;
  const iconBtn = (name, action, label, extra='') => btn(icon(name),action,'icon-button',`aria-label="${label}" ${extra}`);
  const context = id => M.CONTEXTS.find(c => c.id === id) || M.CONTEXTS[0];
  const look = id => M.LOOKS.find(c => c.id === id) || M.LOOKS[0];
  const mode = id => M.MODES.find(c => c.id === id) || M.MODES[0];
  const photo = id => context(id).photo;
  const uuid = () => window.crypto && crypto.randomUUID ? crypto.randomUUID() : 's-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const fmtDate = date => new Date(date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const cfg = M.CONFIG.subscription;
  let loaded = M.load(), data = loaded.data, storageBlocked = loaded.code === 'corrupt';
  let stream = null, timer = null, stageTimer = null, toastTimer = null, lastFocus = null;
  let cameraRequestId=0, cameraRequestTimer=null, resumeNotice=false, renderedScreen=null;
  const memoryPhotos = new Map();
  const ui = {tab:'camera',screen:'coach',filter:'all',sceneFilter:'all',sourceFilter:'all',sessionFilter:'all',selection:{...data.lastSelection},modal:null,modalData:null,pending:null,pendingPreset:null,price:'annual',busy:false,cameraPending:false,coach:null,result:null,sessionId:null,storageFailure:false,actualLens:null};
  const resolveAsset = ref => window.MuseAssets && window.MuseAssets[ref] || ref;
  function resolveMarkup(markup){return window.MuseAssets?markup.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi,(_,start,ref,end)=>start+resolveAsset(ref)+end):markup;}

  function persist() {
    if (storageBlocked) return false;
    const result = M.save(data, ui.storageFailure ? {setItem(){const e=new Error('Full');e.name='QuotaExceededError';throw e;}} : undefined);
    if (result.data) data = result.data;
    if (!result.ok) toast(result.error,'warning',6000);
    return result.ok;
  }
  function toast(text, name='check', duration=3500) {
    clearTimeout(toastTimer); toastEl.innerHTML=icon(name)+`<span>${esc(text)}</span>`;
    const inline=ui.screen==='coach'&&!ui.modal?view.querySelector('.guidance-description'):null;
    if(inline){toastEl.classList.remove('visible');inline.textContent=text;inline.classList.add('camera-feedback');toastTimer=setTimeout(()=>{if(inline.isConnected){inline.textContent=inline.dataset.defaultText;inline.classList.remove('camera-feedback');}},duration);return;}
    toastEl.classList.add('visible');
    toastTimer=setTimeout(()=>toastEl.classList.remove('visible'),duration);
  }
  function theme() {
    const choice=data.preferences.appearance;
    $('#device').dataset.theme=choice==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):choice;
  }
  function select(contextId,lookId,chosenMode) {
    if(ui.cameraPending)return;
    const next={contextId:contextId||ui.selection.contextId,lookId:lookId||ui.selection.lookId,mode:chosenMode||ui.selection.mode};
    if (!data.subscription.active && !M.freeAccess(next.contextId,next.lookId)) {
      ui.pending=next;openModal('paywall');return;
    }
    ui.selection=next;data.lastSelection={...next};persist();
    if(ui.coach){const paused=ui.coach.status==='PAUSED';clearCoachTimers();ui.coach.plan=selectedPlan();ui.coach.stage=0;ui.coach.poseIndex=0;ui.coach.issue=null;ui.coach.status=paused?'PAUSED':'INSTRUCTION';}
    render(true);
  }
  function selectedPlan() { return M.getPlan(ui.selection.contextId,ui.selection.lookId,ui.selection.mode,data); }
  function ensureCoach(){
    if(ui.coach)return;
    if(!data.subscription.active&&!M.freeAccess(ui.selection.contextId,ui.selection.lookId))ui.selection={contextId:'cafe',lookId:'natural',mode:ui.selection.mode};
    ui.coach={plan:selectedPlan(),source:'sample',stage:0,poseIndex:0,status:'INSTRUCTION',voice:false,outline:false,issue:null,guidance:true};
  }
  function presetFor(id){return M.PRESETS.find(p=>p.id===id)||M.PRESETS[0];}
  function currentHint(){
    const c=ui.coach;if(!c)return '';
    if(c.stage===0){if(c.plan.sceneId==='outfit')return 'Check that the head and shoes you want to show are in the frame.';if(c.plan.sceneId==='cafe')return 'Keep the hands you want to show inside the frame.';if(c.plan.sceneId==='travel')return 'Keep the part of the place that tells your story.';return 'Choose the head and shoulder crop you like.';}
    if(c.stage===1&&data.preferences.support==='tripod')return 'Return to phone setup if the framing needs a change.';
    if(c.stage===1)return c.plan.sceneId==='outfit'?(c.plan.mode==='shooting'?'Try holding the phone near their torso height.':'Try a camera position near torso height.'):(c.plan.mode==='shooting'?'Start with the lens near their eye level.':'Start with the lens near your eye level.');
    if(c.stage===2&&c.plan.poses)return c.plan.poses[c.poseIndex||0][c.plan.mode];
    return c.plan.actions[c.stage][c.plan.mode];
  }
  function selectionForTemplate(t){const current=context(ui.selection.contextId);const target=current.sceneId===t.sceneId?current:M.CONTEXTS.find(c=>c.sceneId===t.sceneId);return {contextId:target.id,lookId:t.lookId,mode:ui.selection.mode};}
  function applyTemplate(id){const t=M.TEMPLATES.find(t=>t.id===id);if(!t)return;const next=selectionForTemplate(t);if(!data.subscription.active&&!M.freeAccess(next.contextId,next.lookId)){ui.pending=next;openModal('paywall');return;}const paused=!!ui.coach&&ui.coach.status==='PAUSED';ui.selection=next;data.lastSelection={...next};persist();closeModal();beginCoach(selectedPlan(),stream?'live':'sample',paused);toast('Reference applied. Take a photo whenever you like.','frame');}
  function render(keepScroll=false) {
    if(ui.screen==='coach')ensureCoach();
    const focused=document.activeElement;const focusKey=focused&&focused.dataset&&focused.dataset.action?{action:focused.dataset.action,id:focused.dataset.id,inside:view.contains(focused)?'view':bottom.contains(focused)?'bottom':null}:null;
    const scroll=view.scrollTop,screenChanged=renderedScreen!==ui.screen; theme(); const immersive=ui.screen==='coach';app.classList.toggle('immersive',immersive);
    if(screenChanged)ui.deferredFocus=null;
    else if(ui.busy&&focusKey&&focusKey.inside)ui.deferredFocus=focusKey;
    topbar.innerHTML=header(); bottom.innerHTML=footer();
    const screens={home:coachPage,templates:templatesPage,me:mePage,sessions:sessionsPage,style:stylePage,settings:settingsPage,privacy:privacyPage,coach:coachPage,result:resultPage,detail:detailPage};
    view.innerHTML=resolveMarkup((screens[ui.screen]||templatesPage)());view.scrollTop=keepScroll?scroll:0;
    view.setAttribute('aria-busy',String(ui.busy));
    if(ui.screen==='result'&&ui.busy){view.querySelectorAll('button,input,select').forEach(control=>control.disabled=true);topbar.querySelectorAll('button').forEach(control=>control.disabled=true);}
    if(!screenChanged&&view.firstElementChild)view.firstElementChild.style.animation='none';renderedScreen=ui.screen;
    if(immersive && stream){const video=$('#live-video');if(video){video.srcObject=stream;video.play().catch(()=>{});}}
    if(ui.modal) paintModal(false);
    else if(!screenChanged){const key=focusKey&&focusKey.inside?focusKey:ui.deferredFocus;if(key){const region=key.inside==='view'?view:bottom;const target=[...region.querySelectorAll('[data-action]')].find(el=>el.dataset.action===key.action&&el.dataset.id===key.id);if(target&&!target.disabled){target.focus({preventScroll:true});if(!ui.busy)ui.deferredFocus=null;}}}
  }
  function header() {
    if(ui.screen==='coach')return '';
    const titles={templates:'Find your next shot',me:'Your space',sessions:'Your photos',style:'Saved preferences',settings:'Settings',privacy:'Privacy',result:'Your photo',detail:'Photo details'};
    if(['templates','me'].includes(ui.screen))return `<div class="wordmark">${icon('spark')}PosePro</div>${iconBtn('settings','settings','Settings')}`;
    return `${iconBtn('back','back','Go back')}<span class="topbar-title">${titles[ui.screen]||'PosePro'}</span><span class="spacer"></span>`;
  }
  function footer(){
    if(ui.screen==='result'&&ui.result)return `<div class="editor-footer"><div class="editor-footer-copy"><strong role="status" aria-live="polite" aria-atomic="true">${ui.busy?'Preparing your download…':'Your photo, your choice.'}</strong><span>Download an image · keep details locally</span></div><div class="photo-save-actions result-actions">${btn(ui.busy?'<span class="spinner"></span> Preparing…':icon('download')+' Save & download','save-photo','primary',`aria-busy="${ui.busy}" ${ui.busy?'disabled':''}`)}${btn(icon('heart')+' Favorite','favorite','secondary',ui.busy?'disabled':'')}</div></div>`;
    if(['settings','privacy','detail'].includes(ui.screen))return '';
    return `<nav class="tabbar" aria-label="Main navigation">${[['camera','camera','Camera'],['templates','layers','Templates'],['me','person','Me']].map(([id,i,label])=>btn(`<span class="tab-inner">${icon(i)}<span>${label}</span></span>`,'tab','tab '+(ui.tab===id?'active':''),`data-tab="${id}" ${ui.tab===id?'aria-current="page"':''}`)).join('')}</nav>`;
  }
  function templatesPage(){
    let items=M.TEMPLATES.filter(t=>(ui.sceneFilter==='all'||t.sceneId===ui.sceneFilter)&&(ui.filter!=='free'||!t.isPro)&&(ui.filter!=='saved'||data.savedTemplates.includes(t.id)));
    const sources=[['all','All sources'],['ai','AI references'],['photographer','Photographer-shot']];
    const scenes=[...new Map(M.CONTEXTS.map(c=>[c.sceneId,c])).values()];
    return `<div class="page library-page"><div class="library-hero"><h1 class="page-title">Find your next shot.</h1><p class="page-intro">Simple poses. Your own point of view.</p></div>
      <div class="library-filters filter-row" role="group" aria-label="Template access">${[['all','Discover'],['free','Free to try'],['saved','Saved']].map(([id,label])=>btn(label,'library-filter','filter '+(ui.filter===id?'active':''),`data-id="${id}" aria-pressed="${ui.filter===id}"`)).join('')}</div>
      <details class="source-disclosure"><summary><span>Reference source</span><strong>${esc(sources.find(([id])=>id===ui.sourceFilter)[1])}${icon('chevron')}</strong></summary><div class="source-filters filter-row" role="group" aria-label="Reference source">${sources.map(([id,label])=>btn(label,'source-filter','filter '+(ui.sourceFilter===id?'active':''),`data-id="${id}" aria-pressed="${ui.sourceFilter===id}"`)).join('')}</div></details>
      <div class="filter-section-label">Scene</div><div class="scene-strip" role="group" aria-label="Template scene">${btn('All scenes','library-scene','scene-chip '+(ui.sceneFilter==='all'?'active':''),'data-id="all"')}${scenes.map(c=>btn(`${icon(c.icon)} ${c.label}`,'library-scene','scene-chip '+(ui.sceneFilter===c.sceneId?'active':''),`data-id="${c.sceneId}" aria-pressed="${ui.sceneFilter===c.sceneId}"`)).join('')}</div>
      ${ui.sourceFilter==='photographer'?`<section class="collection-coming">${icon('camera','large')}<h2>Real shoots. Coming next.</h2><p>Photographer-shot collections are not included in this demo. Every available reference is clearly marked AI-generated.</p>${btn('Explore AI references','source-filter','secondary','data-id="ai"')}</section>`:`<div class="topline section"><h2 class="section-title">${ui.filter==='saved'?'Your saved references':ui.filter==='free'?'Three easy starting points':'A little inspiration'}</h2><span class="eyebrow">${items.length} ${items.length===1?'SET':'SETS'}</span></div>${items.length?`<div class="template-grid">${items.map(templateCard).join('')}</div>`:empty('A place for your favorites.','Tap the bookmark on a reference to find it here.','heart','discover','Explore references')}`}
      <p class="rule-note">AI-generated references · four sample images reused across 12 demo sets. Pose sketches and tips are illustrative; they are not live tracking or guaranteed photo results.</p></div>`;
  }
  function templateCard(t){const c=M.CONTEXTS.find(c=>c.sceneId===t.sceneId),saved=data.savedTemplates.includes(t.id),locked=t.isPro&&!data.subscription.active;return `<article class="template-card"><button type="button" class="template-open" data-action="template" data-id="${t.id}" aria-label="View ${esc(c.label)} ${esc(look(t.lookId).label)} reference"><div class="template-photo"><img src="${t.photo}" alt="AI-generated ${esc(c.label)} reference" loading="lazy"><span class="template-origin">AI reference</span>${t.isPro?`<span class="locked-mark">${locked?icon('lock'):''} PRO</span>`:'<span class="locked-mark">FREE</span>'}</div><div class="template-card-body"><h3>${esc(c.label)} · ${esc(look(t.lookId).label)}</h3><p>${esc(t.framing)} · ${t.poseCount} pose ideas</p><div class="template-tags">${icon('phone')} ${esc(t.phone.height)}</div></div></button>${btn(icon(saved?'check':'bookmark'),'save-template','template-save',`data-id="${t.id}" aria-label="${saved?'Remove saved':'Save'} ${esc(c.label)} ${esc(look(t.lookId).label)} template" aria-pressed="${saved}"`)}</article>`;}
  function mePage(){return `<div class="page"><div class="me-profile"><div class="me-avatar">${icon('person')}</div><div><div class="eyebrow">YOUR PHOTOS. YOUR PACE.</div><h1 class="page-title">Make it yours.</h1><p class="page-intro">A little space for what you love.</p></div></div><div class="me-stats">${[[data.sessions.length,'Kept photos','go-sessions'],[data.savedTemplates.length,'Saved sets','saved-templates'],[data.sessions.filter(s=>s.favorite).length,'Favorites','favorite-photos']].map(([n,label,action])=>btn(`<strong>${n}</strong><span>${label}</span>`,action,'me-stat')).join('')}</div><section class="pro-banner"><span class="badge pro">POSEPRO ${data.subscription.active?'PRO':'MEMBERSHIP'}</span><h2>${data.subscription.active?'Your next shot is waiting.':'More ideas for your next photo.'}</h2><p>${data.subscription.active?'Demo access is active. No real subscription.':'Explore all available AI sets and photographic color looks.'}</p>${btn(data.subscription.active?'Manage demo access':'Explore Pro','manage-pro','secondary')}</section><div class="settings-group">${row('clock','Your photos','Saved session details on this browser','go-sessions')}${row('heart','Saved references','Find a favorite pose again','saved-templates')}${row('style','Your preferences','The sets you keep and favorite','go-style')}${row('settings','Settings','Appearance, privacy and local data','settings')}${row('shield','Privacy center','Your camera remains in your control','privacy')}</div><div class="privacy-foot">${icon('shield')}No account needed. Your record stays here.</div></div>`;}
  function modeSelector(value, action='mode') {return `<div class="segmented" role="group" aria-label="Shooting role">${M.MODES.map(m=>btn(`${icon(m.id==='inFrame'?'person':'people')}${m.label}`,action,m.id===value?'active':'',`data-id="${m.id}" aria-pressed="${m.id===value}"`)).join('')}</div>`;}
  function empty(title,description,kind='clock',action='go-home',label='Take a photo'){return `<div class="empty-state"><div class="empty-illustration">${icon(kind)}</div><h2>${title}</h2><p>${description}</p>${action?btn(label,action):''}</div>`;}
  function sessionsPage(){
    const sessions=data.sessions.filter(s=>ui.sessionFilter!=='favorites'||s.favorite);
    return `<div class="page"><h1 class="page-title">Good moments,<br>worth keeping.</h1><p class="page-intro">Your portraits, your plans.<br>A little record of what feels like you.</p>${data.sessions.length?`<div class="filter-row" role="group" aria-label="Filter sessions">${btn('All sessions','filter','filter '+(ui.sessionFilter==='all'?'active':''),'data-id="all"')}${btn(icon('heart','small')+' Favorites','filter','filter '+(ui.sessionFilter==='favorites'?'active':''),'data-id="favorites"')}</div><p class="session-count">${sessions.length} ${sessions.length===1?'session':'sessions'} · stored on this device</p>${sessions.map(sessionRow).join('')}${!sessions.length?empty('No favorites yet','Favorite a portrait you love. It will be easy to find here.','heart','filter-all','See all sessions'):''}${data.permissions.thumbnails!=='granted'?`<div class="thumb-notice">${icon('photo')}<div><p>Your session details are here. Photo previews are optional.</p>${btn('Show photo previews','thumbnail-notice','text-button')}</div></div>`:''}`:empty('Your next favorite<br>starts here.','Take a photo or try a sample, then keep its details here.','clock')}
      <div class="privacy-foot">${icon('lock')}Only your PosePro sessions. Never your whole library.</div></div>`;
  }
  function sessionRow(s){
    const canShow=data.permissions.thumbnails==='granted';const img=s.photoRef==='live-session'?memoryPhotos.get(s.id):s.photoRef;
    return btn(`${canShow&&img?`<img class="session-thumb" src="${esc(img)}" alt="${esc(context(s.contextId).label)} portrait">`:''}<div class="session-meta"><strong>${esc(context(s.contextId).label)} ${s.favorite?icon('heart','small'):''}</strong><p>${esc(presetFor(s.presetId).label)} · ${s.mode==='inFrame'?'In frame':'Helping someone'}</p><p>${fmtDate(s.capturedAt)}</p><span class="badge">${s.photoRef==='live-session'?'CAMERA':'AI SAMPLE'} · ${s.favorite?'FAVORITE':'KEPT'}</span></div>${icon('chevron')}`,'session','session-row',`data-id="${s.id}" aria-label="Open ${context(s.contextId).label} session from ${fmtDate(s.capturedAt)}"`);
  }
  function stylePage(){
    const entries=Object.entries(data.styleWeights).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
    return `<div class="page"><h1 class="page-title">A little more<br>like you.</h1><p class="page-intro">The plans you keep and favorite<br>help shape what comes next.</p>${!entries.length?empty('Your style starts<br>with what you keep.','Keep a portrait, or favorite one you love. Your saved looks will grow here.','style'): `<div class="style-feature"><div class="eyebrow">YOUR SAVED PREFERENCES</div><p>More of what you love. Nothing about how you look is scored.</p></div>${entries.map(([id,n])=>{const t=M.TEMPLATES.find(t=>t.id===id),s=data.sessions.find(s=>s.templateId===id),count=data.sessions.filter(s=>s.templateId===id).length;return `<div class="style-item"><img src="${photo(s?s.contextId:'cafe')}" alt="${esc(t.title)}"><div><strong>${esc(t.title)}</strong><p>${look(t.lookId).label} · ${count} kept ${count===1?'session':'sessions'}</p><div class="style-bar"><i style="width:${Math.max(15,Math.round(n/entries[0][1]*100))}%"></i></div></div>${s&&s.favorite?'<span class="badge pro">'+icon('heart')+'</span>':''}</div>`;}).join('')}${btn('Reset style preferences','reset-style','secondary')}<p class="section-note">Resetting style keeps your sessions and recent-use history.</p>`}<div class="privacy-foot">${icon('shield')}Your preferences stay on this device.</div></div>`;
  }
  const row=(i,title,sub,action,right='',extra='')=>btn(`${icon(i)}<div><strong>${title}</strong>${sub?`<small>${sub}</small>`:''}</div>${right||icon('chevron','chevron')}`,action,'settings-row'+(action==='delete-data'?' danger':''));
  function settingsPage(){return `<div class="page"><h1 class="page-title">Make yourself<br>at home.</h1><div class="settings-group">${row('style',data.subscription.active?'PosePro Pro · Demo':'Explore PosePro Pro',data.subscription.active?'Demo access is active · no real charge':'All available AI sets and color looks','manage-pro',`<span class="badge pro">${data.subscription.active?'ACTIVE':'PRO'}</span>`)}${row('refresh','Restore purchases','Restore demo access on this browser','restore')}</div><div class="eyebrow">YOUR EXPERIENCE</div><div class="settings-group"><div class="settings-row">${icon('moon')}<div><strong>Appearance</strong></div><label class="sr-only" for="appearance">Appearance</label><select id="appearance" data-action="appearance">${['system','light','dark'].map(v=>`<option value="${v}" ${data.preferences.appearance===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></div>${row('camera','Camera access',data.permissions.camera==='denied'?'Off · your plan is still readable':'Use a sample or your own camera','camera-access')}${row('download','Save access',data.permissions.save==='denied'?'Downloads off · capture still available':'Browser file downloads, not iOS Photos','save-access')}${row('photo','Photo previews',data.permissions.thumbnails==='granted'?'Shown in your session list':'Off · session details stay visible','thumbnail-notice')}</div><div class="eyebrow">PRIVATE BY DESIGN</div><div class="settings-group">${row('shield','Privacy','Your camera, your photos, your choice','privacy')}${row('trash','Delete local data','Sessions, style and photo references','delete-data','','class="danger"')}</div><div class="eyebrow">ABOUT THIS EXPERIENCE</div><div class="settings-group">${row('help','How the demo works','A guided practice, with no real purchases','about')}${row('info','Practice edge cases','Try permission, storage and lighting states','demo-options')}</div><div class="version-footer">PosePro · Interactive HTML Demo<br>Made for your next good photo.</div></div>`;}
  function privacyPage(){return `<div class="page"><h1 class="page-title">Your camera.<br>Your privacy.</h1><p class="page-intro">Good portraits should feel comfortable<br>from the very first step.</p>${[['shield','On your device','The planned native app processes guidance on your iPhone. This demo shows authored references only: it does not run pose models, generate images or send camera frames to a cloud model.'],['photo','Photos stay yours','The browser demo can download a photo to your device. It stores session details and sample references, never captured photo bytes. It cannot write directly into iOS Photos.'],['voice','You are in control','Guidance is optional. Pause stops tips, voice and countdowns. Manual capture stays available; sketches remain clearly labeled references.'],['lock','Your local record','Session details and style preferences stay in this browser. Delete them any time in Settings. Downloaded photos are not deleted.']].map(([i,t,p])=>`<section class="privacy-card">${icon(i,'large')}<h2>${t}</h2><p>${p}</p></section>`).join('')}</div>`;}
  function coachPage(){
    const c=ui.coach,p=c.plan,paused=c.status==='PAUSED',issue=!!c.issue,ready=c.status==='READY',off=c.guidance===false;
    const fixed=data.preferences.support==='tripod',lens=c.source==='live'?(ui.actualLens==='front'?'Front lens':ui.actualLens==='rear'?'Rear lens':'Live lens'):(data.preferences.lens==='front'?'Front selected':'Rear selected');
    const instruction=paused?'Take your time.':off?'Your photo, your pace.':issue?issueCopy(c.issue):ready?'Take the photo you want.':currentHint();
    const description=paused?'Manual capture is still available.':off?'Capture whenever you like.':issue?'Practice state · capture stays manual.':ready?'Reference tips, not a detected result.':'Reference tip · not live tracking.';
    const nextAction=paused?'pause':off?'toggle-guidance':issue?'recover':'next-step';
    const nextLabel=paused?'Resume':off?'Show tips':issue?'Try again':ready?'Review':'Next';
    return `<div class="coach ${issue?'coach-issue':''}">${c.source==='live'&&stream?`<video id="live-video" class="coach-video ${ui.actualLens==='front'?'mirror':''}" autoplay playsinline muted></video>`:`<img class="coach-photo" src="${p.photo}" alt="AI-generated ${esc(p.contextLabel)} sample, not a live camera image">`}
      ${data.preferences.grid?'<div class="camera-grid" aria-hidden="true"></div>':''}
      <div class="camera-top"><div class="camera-brand">${icon('spark')}PosePro</div><span class="source-pill">${c.source==='live'?'LIVE CAMERA · MANUAL':'AI SAMPLE · DEMO'}</span>${btn(data.subscription.active?'PRO':'Get Pro','paywall','coach-pause pro-camera')}${btn(icon(paused?'play':'pause'),'pause','icon-button',`aria-label="${paused?'Resume':'Pause'} guidance" aria-pressed="${paused}"`)}</div>
      <div class="camera-scene-strip" role="group" aria-label="Scene">${M.CONTEXTS.map(item=>btn(item.label,'scene','scene-chip '+(item.id===p.contextId?'active':''),`data-id="${item.id}" aria-pressed="${item.id===p.contextId}"`)).join('')}</div>
      <div class="camera-context">${btn(`${icon(p.mode==='inFrame'?'person':'people')}${esc(mode(p.mode).label)} ${icon('chevron')}`,'shooting-setup','coach-pause role-switch')}<span>${lens} · ${fixed?'Fixed phone':'Handheld'}</span></div>
      <button type="button" class="reference-mini" data-action="coach-plan" aria-label="View ${esc(p.lookLabel)} AI reference and shot setup">${c.outline?poseSketch('pose-sketch reference-skeleton',c.poseIndex||0):`<img src="${p.photo}" alt="AI-generated reference">`}<span>${c.outline?'Pose sketch':'AI reference'}</span></button>
      <div class="camera-tools">${btn(icon('sun')+'<span>Light</span>','light-tip','coach-tool')}${btn(icon('sliders')+'<span>Tools</span>','camera-tools','coach-tool')}</div>
      <div class="camera-target"><span>Reference frame</span></div>
      <div class="camera-bottom-panel"><div class="guidance-card"><div class="guidance-meta"><span>${paused?'GUIDANCE PAUSED':off?'GUIDANCE OFF':issue?'PRACTICE STATE':ready?'YOUR NEXT SHOT':`${['FRAME','CAMERA','POSE','EXPRESSION'][c.stage]} · ${c.stage+1} OF 4`}</span><span class="guidance-reference">${icon('outline')} Reference</span></div><div class="guidance-main"><div class="guidance-content" role="status" aria-live="polite" aria-atomic="true"><h1 class="guidance-title">${esc(instruction)}</h1></div>${btn(`${esc(nextLabel)}${icon('arrow')}`,nextAction,'tip-next')}</div><p class="guidance-description" data-default-text="${esc(description)}">${description}</p></div>
      <div class="camera-pose-strip">${iconBtn('back','previous-pose','Previous pose',c.poseIndex===0?'disabled':'')}<span>${esc(p.poses[c.poseIndex||0].title)} <small>${(c.poseIndex||0)+1} / ${p.poses.length}</small></span>${iconBtn('chevron','next-pose','Next pose',(c.poseIndex||0)>=p.poses.length-1?'disabled':'')}</div>
      <div class="camera-capture-row">${btn(icon('layers')+'<span>Templates</span>','open-templates','coach-tool')}${btn('<span></span>','shutter','shutter ready',`aria-label="${c.source==='sample'?'Try a sample photo':'Take photo'}" ${ui.busy||c.status==='COUNTDOWN'?'disabled':''}`)}${btn(icon('camera')+`<span>${c.source==='sample'?'Use camera':'Camera source'}</span>`,'camera-source','coach-tool')}</div>
      </div></div>`;
  }
  function issueCopy(issue){return ({lowlight:'Lighting is uncertain. Check it yourself.',missing:'Person location is unavailable.',multiple:'Guidance supports one person at a time.',thermal:'Guidance can wait. Capture stays manual.'})[issue]||'Guidance is unavailable. You can take a photo.';}
  function adjustmentFilter(r){return `brightness(${Math.pow(2,r.exposure||0)}) contrast(${1+(r.contrast||0)*.4}) sepia(${Math.max(0,r.warmth||0)*.22}) saturate(${1+Math.abs(r.warmth||0)*.08}) hue-rotate(${Math.min(0,r.warmth||0)*16}deg)`;}
  function photoMarkup(r){const original=r.comparing;return `<div class="photo-composite" style="position:relative;width:100%;height:100%;filter:${original?'none':adjustmentFilter(r)}"><img src="${esc(r.preview)}" alt="${r.source==='sample'?'AI sample':'Your photo'} ${original?'original':'color preview'}"><img class="preset-overlay" src="${esc(r.preview)}" alt="" aria-hidden="true" style="position:absolute;inset:0;filter:${original?'none':presetFor(r.presetId).filter};opacity:${original||r.presetId==='original'?0:r.intensity}"></div>`;}
  function resultPage(){const r=ui.result;if(!r)return `<div class="page">${empty('Ready for another photo?','Your camera is waiting.','camera')}</div>`;
    const labels=[['exposure','Brightness'],['contrast','Contrast'],['warmth','Temperature']];
    return `<div class="page photo-page"><div class="eyebrow">${r.source==='sample'?'AI SAMPLE · NOT A CAMERA CAPTURE':'YOUR PHOTO · ON THIS DEVICE'}</div><h1 class="page-title">Make it yours.</h1><div class="result-preview">${photoMarkup(r)}<span class="badge light">${r.comparing?'Original':esc(presetFor(r.presetId).label)}</span></div><div class="before-after">${btn(icon('refresh')+(r.comparing?' Return to edit':' Compare original'),'compare','secondary',`aria-pressed="${r.comparing}"`)}<span>Color only. No face or body changes.</span></div>
      <section class="photo-tools"><div class="topline"><h2 class="section-title">A little color</h2>${btn('Reset','reset-edit','text-button')}</div><div class="preset-strip" role="group" aria-label="Photographic color preset">${M.PRESETS.map(p=>btn(`<span class="preset-thumb"><img src="${esc(r.preview)}" alt="" style="filter:${p.filter}"></span><span>${esc(p.label)} ${p.isPro?'<span class="preset-pro">PRO</span>':''}</span>`,'preset','preset-chip '+(r.presetId===p.id?'active':''),`data-id="${p.id}" aria-pressed="${r.presetId===p.id}" aria-label="${esc(p.label)}${p.isPro?', Pro color look':''}" ${ui.busy?'disabled':''}`)).join('')}</div>
      <div class="adjustment-row"><label for="edit-intensity">Look strength</label><input id="edit-intensity" type="range" min="0" max="100" value="${Math.round(r.intensity*100)}" data-edit="intensity" aria-valuetext="${Math.round(r.intensity*100)} percent" aria-describedby="strength-help" ${r.presetId==='original'||ui.busy?'disabled':''}><output for="edit-intensity">${Math.round(r.intensity*100)}%</output></div>
      <p id="strength-help" class="strength-help">${r.presetId==='original'?'Choose a color look to adjust its strength.':'Adjust the look while keeping your original.'}</p>${labels.map(([id,label])=>`<div class="adjustment-row"><label for="edit-${id}">${label}</label><input id="edit-${id}" type="range" min="-100" max="100" value="${Math.round(r[id]*100)}" data-edit="${id}" aria-valuetext="${Math.round(r[id]*100)}" ${ui.busy?'disabled':''}><output for="edit-${id}">${Math.round(r[id]*100)}</output></div>`).join('')}<p class="rule-note">Color previews are illustrative filters, not a calibrated LUT. Original is always available.</p></section>
      <div class="result-footer">${btn(icon('refresh')+' Retake','retake','',ui.busy?'disabled':'')}${btn(icon('trash')+' Discard','discard','',ui.busy?'disabled':'')}${btn(icon('check')+' Keep details','keep','',ui.busy?'disabled':'')}</div><div class="privacy-foot">${icon('lock')}Photo bytes stay out of browser storage.</div></div>`;
  }
  function detailPage(){
    const item=data.sessions.find(s=>s.id===ui.sessionId);
    if(!item)return `<div class="page">${empty('This photo record is no longer here.','Your other records remain.','clock','go-sessions','Back to photos')}</div>`;
    const p=M.getPlan(item.contextId,item.lookId,item.mode,data),img=item.photoRef==='live-session'?memoryPhotos.get(item.id):item.photoRef;
    const show=data.permissions.thumbnails==='granted'&&img,source=item.photoRef==='live-session'?'live':'sample';
    return `<div class="page"><div class="eyebrow">${fmtDate(item.capturedAt)} · ${source==='sample'?'AI SAMPLE':'CAMERA PHOTO'}</div><h1 class="page-title">${esc(context(item.contextId).label)}<br>${esc(look(item.lookId).label.toLowerCase())}.</h1>${show?`<div class="result-preview">${photoMarkup({...item,preview:img,source,comparing:false})}</div>`:`<p class="status-banner">${data.permissions.thumbnails==='granted'?'The camera image was held for that visit only. Your photo and editing details remain.':'Photo previews are off. Your photo details are still available.'}</p>`}<div class="info-line"><span>Reference source</span><strong>AI-generated</strong></div><div class="info-line"><span>Scene</span><strong>${esc(context(item.contextId).label)}</strong></div><div class="info-line"><span>Color look</span><strong>${esc(presetFor(item.presetId).label)}</strong></div><div class="info-line"><span>Look strength</span><strong>${Math.round(item.intensity*100)}%</strong></div><div class="info-line"><span>Shooting role</span><strong>${esc(mode(item.mode).label)}</strong></div><div class="info-line"><span>Framing reference</span><strong>${esc(p.framing)}</strong></div><div class="section">${btn(item.favorite?icon('heart')+' A favorite':icon('heart')+' Add to favorites','favorite-session',item.favorite?'secondary':'primary',item.favorite?'disabled':'')}${btn('Use this reference again '+icon('arrow'),'reuse','secondary','style="margin-top:10px"')}</div><div class="privacy-foot">${icon('shield')}Photo bytes are never stored in this record.</div></div>`;
  }
  function poseSketch(cls='pose-sketch',index=0){
    const pathsByPose=['m82 40-4 44 5 28m-5-64L50 57 39 85m39-37 30 17 12 23m-42-4-20 28-7 36m32-36 17 30','m82 40-3 44 4 28m-4-64-29 13 10 22m19-35 25 16-12 25m-13-5-16 28-10 33m30-33 10 31','m82 40-3 44 4 28m-4-64L57 65l6 26m16-43 29 13 9 29m-38-6-12 29 6 31m10-32 21 28'];
    return `<svg class="${cls}" viewBox="0 0 160 160" role="img" aria-label="Illustrative pose sketch, not a body match" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="82" cy="26" r="14"/><path d="${pathsByPose[index%3]}"/><path d="M36 13H20v22M124 13h16v22M20 126v21h15m105-21v21h-15" stroke-opacity=".35"/></svg>`;
  }

  function openModal(type,details=null){
    if(ui.busy)return;stopSpeech();lastFocus=document.activeElement;ui.modal=type;ui.modalData=details;paintModal(true);topbar.inert=true;view.inert=true;bottom.inert=true;
  }
  function closeModal(force=false,keepIntent=false){
    if(ui.busy&&!force)return;if(ui.cameraPending)cancelCameraRequest();if(!keepIntent&&['paywall','trial-confirm'].includes(ui.modal)){ui.pending=null;ui.pendingPreset=null;}ui.modal=null;ui.modalData=null;modalRoot.innerHTML='';topbar.inert=false;view.inert=false;bottom.inert=false;
    if(lastFocus&&lastFocus.isConnected)lastFocus.focus({preventScroll:true});else view.focus({preventScroll:true});
  }
  function paintModal(focus){
    const type=ui.modal,details=ui.modalData;let title='',content='',kind='sheet',symbol='shield';
    const section=(name,text,i='info')=>`<section class="plan-section"><h2>${icon(i)}${name}</h2><p>${esc(text)}</p></section>`;
    if(['template','plan','coach-plan'].includes(type)){
      const t=type==='template'?M.TEMPLATES.find(t=>t.id===details):null;
      const p=t?M.getPlan(selectionForTemplate(t).contextId,t.lookId,ui.selection.mode,data):type==='coach-plan'?ui.coach.plan:selectedPlan();
      title=type==='template'?'A shot to make yours.':'Your shot setup.';symbol='frame';
      content=`<span class="badge">AI-GENERATED REFERENCE</span><img class="detail-image" src="${p.photo}" alt="AI-generated reference, not a captured result"><p>${esc(p.description)}</p><div class="recipe-meta"><span>${esc(p.framing)}</span><span>${p.poseCount} pose ideas</span><span>${p.isPro?'PRO SET':'FREE SET'}</span></div>${type==='template'?btn(p.isPro&&!data.subscription.active?'Explore Pro to use this set':'Use this set','apply-template','primary',`data-id="${p.templateId}"`):''}${section('Light to try',p.lightTip,'sun')}${section('Camera starting point',p.cameraTip,'phone')}${section('Frame the photo',p.framingTip,'frame')}<section class="plan-section"><h2>${icon('outline')}Pose ideas</h2><ul>${p.poses.map(pose=>`<li>${esc(pose[p.mode])}</li>`).join('')}</ul></section><p class="rule-note">These are optional suggestions. No camera height, lighting or pose match has been measured. Choose what feels comfortable.</p>${type==='template'?'':btn('Back to camera','close-modal')}`;
    }else if(type==='shooting-setup'){
      title='Your way to shoot.';symbol='camera';const pref=data.preferences;
      content=`<p>Choose who receives the tips. Lens and phone support are separate choices.</p><h2 class="section-title">Who is in the frame?</h2>${modeSelector(ui.coach.plan.mode,'coach-mode')}<h2 class="section-title">Lens</h2><div class="segmented" role="group" aria-label="Camera lens">${[['rear','Rear'],['front','Front']].map(([id,label])=>btn(label,'lens',pref.lens===id?'active':'',`data-id="${id}" aria-pressed="${pref.lens===id}"`)).join('')}</div><h2 class="section-title">Phone support</h2><div class="segmented" role="group" aria-label="Phone support">${[['handheld','Handheld'],['tripod','Fixed phone']].map(([id,label])=>btn(label,'support',pref.support===id?'active':'',`data-id="${id}" aria-pressed="${pref.support===id}"`)).join('')}</div><p>${pref.support==='tripod'?'Set up the phone, enter the frame, take a timed trial photo, then review the framing and focus. Return to setup if the phone needs moving.':'Hold the phone comfortably. Follow a setup idea, then take a photo when you choose.'}</p>${btn('Done','close-modal')}${btn(icon('camera')+' Use my camera','live-camera','secondary')}${btn('Use AI sample instead','sample-camera','text-button center')}<p class="small-print">Live preview is optional. Your frames stay on this page. Reference tips do not analyze your camera.</p>`;
    }else if(type==='camera-tools'){
      title='A little more control.';symbol='sliders';const c=ui.coach,pref=data.preferences;
      content=`<p>Your framing helpers, all in one place.</p><div class="tool-grid">${btn(`${icon('frame')}<span>Grid<small>${pref.grid?'On':'Off'}</small></span>`,'grid','tool-option',`aria-pressed="${pref.grid}"`)}${btn(`${icon('outline')}<span>Pose sketch<small>${c.outline?'On':'Off'}</small></span>`,'outline','tool-option',`aria-pressed="${c.outline}"`)}${btn(`${icon('sun')}<span>Light idea<small>For this scene</small></span>`,'light-tip','tool-option')}${btn(`${icon('phone')}<span>Shot setup<small>Role, lens & support</small></span>`,'shooting-setup','tool-option')}</div><section class="tool-section"><h2 class="section-title">Self-timer</h2><div class="segmented timer-options" role="group" aria-label="Self-timer">${[0,3,5,10].map(value=>btn(value?value+'s':'Off','timer',pref.timer===value?'active':'',`data-id="${value}" aria-pressed="${pref.timer===value}"`)).join('')}</div></section>${btn(icon('voice')+' Guidance & voice','conditions','secondary')}${btn('Back to camera','close-modal','primary')}<p class="small-print">Sketches are illustrative references. They do not track your body.</p>`;
    }else if(type==='light-tip'){
      title='Start with the light.';symbol='sun';content=`${section('For this scene',ui.coach.plan.lightTip,'sun')}<p>Look at the light yourself. Try one small change, take a photo and compare. Hard light, backlight and shadows can all be intentional.</p>${btn('Try this idea','close-modal')}`;
    }else if(type==='paywall'){
      title='More ways<br>to make it yours.';symbol='style';
      content=`<p>Explore every available AI reference set and all color looks. Keep your own face, body and point of view.</p><div class="paywall-art"><img src="assets/window-light.webp" alt="AI-generated window-light reference"><span>Your next<br>portrait idea.</span><span class="badge light">AI REFERENCE · POSEPRO PRO</span></div>${['All 12 demo AI reference sets','Every available color look','Save references and revisit your photos','One unlock, no individual set purchases'].map(t=>`<div class="paywall-benefit">${icon('check')}${t}</div>`).join('')}<p class="rule-note">Photographer-shot collections and LiDAR guidance are not included in this demo. Free already includes manual capture and three starter sets.</p><div class="price-options">${['monthly','annual'].map(v=>`<button type="button" class="price-option ${ui.price===v?'active':''}" data-action="price" data-id="${v}" aria-pressed="${ui.price===v}">${v==='annual'?'<span class="save-badge">YEARLY VALUE</span>':''}<div class="price-label">${v==='annual'?'Yearly':'Monthly'} ${ui.price===v?icon('check'):''}</div><strong>$${(v==='annual'?cfg.annual:cfg.monthly).toFixed(2)}</strong><span>${v==='annual'?'per year':'per month'} · 7-day trial*</span></button>`).join('')}</div>${btn('Try Pro in this demo','trial')}<p class="small-print">7 days free, then $${(ui.price==='annual'?cfg.annual:cfg.monthly).toFixed(2)} ${ui.price==='annual'?'per year':'per month'}, auto-renewing in the planned native offering. Trial eligibility applies. Cancel through your store account.<br><strong>This demo creates no purchase or subscription.</strong></p><div class="paywall-links">${btn('Restore','restore','')}${btn('Terms','terms','')}${btn('Privacy','modal-privacy','')}</div>`;
    }else if(type==='trial-confirm'){
      title='Explore the demo.';symbol='style';content=`<p>Activate simulated Pro access in this browser. No card, Apple ID or payment is involved.</p>${section('Planned subscription',`7 days free for eligible customers, then $${(ui.price==='annual'?cfg.annual:cfg.monthly).toFixed(2)} per ${ui.price==='annual'?'year':'month'}.`)}${btn('Activate demo Pro','activate-pro')}${btn('Not now','close-modal','secondary')}`;
    }else if(type==='camera-consent'||type==='camera-access'){
      title='Your camera.<br>Your choice.';symbol='camera';content=`<p>Use your camera for a local preview, or keep exploring with an AI-generated sample. No image is uploaded.</p><ul class="privacy-points"><li>${icon('shield')}Camera access starts only when you choose it.</li><li>${icon('outline')}Tips and sketches are references, not live pose detection.</li><li>${icon('photo')}Captured images stay in memory until you download or leave.</li></ul>${btn('Use my camera','live-camera')}${btn('Continue with AI sample','sample-camera','secondary')}`;
    }else if(type==='camera-denied'){
      title='Keep exploring.';symbol='camera';content=`<p>Your camera could not be opened. An AI sample is still available. You can change browser camera permissions and try again.</p>${btn('Use AI sample','sample-camera')}${btn('Try camera again','live-camera','secondary')}`;
    }else if(type==='save-consent'||type==='save-access'){
      title='Keep it on<br>your device.';symbol='download';content=`<p>This browser can request a file download. It cannot write directly to iOS Photos or access your photo library.</p><p>The local history stores scene and editing details. Captured photo bytes stay out of browser storage.</p>${btn(type==='save-consent'?'Allow download & save details':'Allow downloads','allow-save')}${btn('Keep downloads off','deny-save','secondary')}`;
    }else if(type==='thumbnail'){
      title='Your photos,<br>at a glance.';symbol='photo';content=`<p>Show AI sample previews and photos still held in memory for this visit. Reloading keeps photo details, but not live-camera images.</p><p>This never browses your device photo library.</p>${btn('Show previews','allow-thumbnails')}${btn('Details only','deny-thumbnails','secondary')}`;
    }else if(type==='discard'){
      title='Discard this preview?';symbol='trash';kind='alert';content=`<p>No photo details will be added. Any file you already downloaded stays on your device.</p>${btn('Discard preview','confirm-discard','destructive')}${btn('Keep editing','close-modal','secondary')}`;
    }else if(type==='exit-coach'){
      title='Pause your session?';symbol='camera';kind='alert';content=`<p>Your selected reference stays here. No photo has been saved.</p>${btn('Keep exploring templates','confirm-exit')}${btn('Back to camera','close-modal','secondary')}`;
    }else if(type==='conditions'){
      title='Guidance, your way.';symbol='outline';const c=ui.coach;
      content=`${btn(c.guidance===false?'Show reference tips':'Turn reference tips off','toggle-guidance','secondary')}${btn(icon(c.voice?'voice':'mute')+` Voice ${c.voice?'on':'off'}`,'voice','secondary')}<p class="small-print">Voice is an optional browser reading of authored tips. Pause stops it.</p><section class="plan-section"><h2>Practice an unavailable-guidance state</h2><p>These controls simulate a condition. No body, light or device analysis is running.</p></section><div class="scenario-grid">${[['lowlight','moon','Uncertain light'],['missing','frame','Person unavailable'],['multiple','people','Multiple people'],['thermal','sun','Guidance waiting']].map(([id,i,t])=>btn(icon(i)+t,'condition','',`data-id="${id}"`)).join('')}</div>${btn('Return to reference tips','condition','secondary','data-id="normal"')}<p class="small-print">Manual capture remains available in every practice state.</p>`;
    }else if(type==='demo-options'){
      title='Explore the edges.';symbol='info';content=`<p>Simulate a denied preference or full local storage. Browser system permissions are managed separately.</p><div class="scenario-grid">${btn('Deny camera preference','simulate-denial','','data-id="camera"')}${btn('Disable downloads','simulate-denial','','data-id="save"')}${btn('Hide previews','simulate-denial','','data-id="thumbnails"')}${btn(ui.storageFailure?'Restore storage':'Simulate full storage','storage-toggle')}</div>${btn('Reset demo preferences','reset-permissions','secondary')}`;
    }else if(type==='about'){
      title='A little direction.<br>Your own photo.';symbol='help';content=`<p>Start on Camera. Choose a reference in Templates, try one suggestion at a time, then take a photo whenever you like.</p><ul class="privacy-points"><li>${icon('outline')}AI sample images and sketches are illustrative. No pose model or cloud coach runs here.</li><li>${icon('sun')}Color looks are browser filter examples, not production LUTs.</li><li>${icon('shield')}Camera frames stay on this page. Local history contains metadata only.</li><li>${icon('style')}Pro is simulated. Photographer-shot collections are coming later.</li></ul>${btn('Got it','close-modal')}`;
    }else if(type==='manage-pro'){
      title='Your demo Pro.';symbol='style';content=`<p>Your ${data.subscription.plan==='annual'?'yearly':'monthly'} demo access unlocks the currently available AI sets and color looks. No real subscription exists.</p>${btn('Keep exploring','close-modal')}${btn('Return to Free','end-pro','secondary')}`;
    }else if(type==='reset-style'){
      title='Reset preferences?';symbol='refresh';kind='alert';content=`<p>Your photos, saved references and recent-use history remain. Only the local preference weights are cleared.</p>${btn('Reset preferences','confirm-reset','destructive')}${btn('Cancel','close-modal','secondary')}`;
    }else if(type==='delete-data'){
      title='Delete local data?';symbol='trash';content=`<p>Delete ${data.sessions.length} photo records, saved references and local style history. Downloaded files and demo Pro access remain.</p><label class="field-label" for="delete-confirm">Type DELETE to confirm</label><input id="delete-confirm" class="note-field" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="DELETE" aria-describedby="delete-error"><div id="delete-error" class="field-error" aria-live="polite"></div>${btn('Delete local data','confirm-delete','destructive','disabled')}${btn('Cancel','close-modal','secondary')}`;
    }else if(type==='terms'){
      title='Demo terms';symbol='info';content=`<p>This is a local interaction prototype. No payment, trial period or subscription is created. Planned US prices are $${cfg.monthly.toFixed(2)}/month and $${cfg.annual.toFixed(2)}/year; both plan a 7-day trial for eligible customers and automatic renewal afterward.</p><p>All supplied portraits are AI-generated references. Real photographer collections, live pose inference and calibrated LUTs are not implemented here.</p>${btn('Got it','close-modal')}`;
    }else if(type==='corrupt'){
      title='A clean start?';symbol='warning';content=`<p>Saved demo data could not be read and has not been overwritten. Start fresh, or browse without saving.</p>${btn('Start fresh','repair-storage')}${btn('Browse without saving','close-modal','secondary')}`;
    }
    const previousAction=modalRoot.contains(document.activeElement)?document.activeElement.dataset.action:null;
    const previousId=previousAction?document.activeElement.dataset.id:null;
    modalRoot.innerHTML=resolveMarkup(`<div class="modal-backdrop" data-backdrop="true"><section class="modal-sheet ${kind==='alert'?'modal-alert':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="sheet-handle"></div>${iconBtn('x','close-modal','Close dialog')}<div class="sheet-icon">${icon(symbol,'large')}</div><h1 id="modal-title">${title}</h1>${content}</section></div>`);
    const close=modalRoot.querySelector('[data-action="close-modal"]');if(close)close.classList.add('sheet-close');
    if(!focus){modalRoot.firstElementChild.style.animation='none';modalRoot.querySelector('.modal-sheet').style.animation='none';}
    if(focus)requestAnimationFrame(()=>{const sheet=modalRoot.querySelector('.modal-sheet');if(sheet)sheet.focus({preventScroll:true});});
    else if(previousAction){const target=modalRoot.querySelector(`[data-action="${previousAction}"]${previousId?'[data-id="'+previousId+'"]':''}`);if(target)target.focus({preventScroll:true});}
  }

  function navigate(screen,tab){
    if(screen==='home'||screen==='camera'){screen='coach';tab='camera';}
    if(ui.screen==='coach'&&screen!=='coach'&&ui.coach){clearCoachTimers();ui.coach.status='PAUSED';stopCamera();ui.coach.source='sample';}
    ui.screen=screen;if(tab)ui.tab=tab;if(['sessions','style'].includes(screen))ui.tab='me';render();view.focus({preventScroll:true});
  }
  function stopSpeech(){if('speechSynthesis'in window)speechSynthesis.cancel();}
  function speak(){const c=ui.coach;if(!c||!c.voice||!c.guidance||ui.modal||c.status==='PAUSED'||c.issue||['COUNTDOWN','CAPTURED'].includes(c.status))return;stopSpeech();if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(c.status==='READY'?'Take the photo you want.':currentHint());u.lang='en-US';u.rate=.9;speechSynthesis.speak(u);}}
  function clearCoachTimers(){clearTimeout(stageTimer);clearInterval(timer);timer=null;countdownEl.classList.add('hidden');countdownEl.innerHTML='';if(!ui.modal){topbar.inert=false;view.inert=false;bottom.inert=false;}stopSpeech();}
  function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}ui.actualLens=null;}
  function cancelCameraRequest(){cameraRequestId++;clearTimeout(cameraRequestTimer);ui.cameraPending=false;}
  function disposePreview(result){if(result&&result.preview.startsWith('blob:')&&![...memoryPhotos.values()].includes(result.preview))URL.revokeObjectURL(result.preview);}
  function beginCoach(plan,source='sample',paused=false){
    const previous=ui.coach;clearCoachTimers();ui.coach={plan,source,stage:0,poseIndex:0,status:paused?'PAUSED':'INSTRUCTION',voice:previous?previous.voice:false,outline:previous?previous.outline:false,guidance:previous?previous.guidance:true,issue:null};
    data=M.recordUse(data,plan.templateId);persist();ui.result=null;ui.screen='coach';ui.tab='camera';render();
  }
  function requestStart(){ensureCoach();if(ui.modal)closeModal();navigate('coach','camera');}
  async function useLiveCamera(){
    if(ui.busy||ui.cameraPending)return;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Live camera needs HTTPS or localhost. The AI sample is still available.','info',5500);return;}
    ensureCoach();const p=ui.coach.plan,paused=ui.coach.status==='PAUSED',requestId=++cameraRequestId;ui.cameraPending=true;
    stopCamera();ui.coach.source='sample';
    const b=modalRoot.querySelector('[data-action="live-camera"]');if(b){b.disabled=true;b.innerHTML='<span class="spinner dark"></span> Opening camera…';}
    modalRoot.querySelectorAll('[data-action="coach-mode"],[data-action="lens"],[data-action="support"]').forEach(control=>control.disabled=true);
    cameraRequestTimer=setTimeout(()=>{if(requestId!==cameraRequestId||!ui.cameraPending)return;cancelCameraRequest();render(true);toast('The camera is taking a while. Try again or use the AI sample.','info',6000);},12000);
    try{
      const nextStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:data.preferences.lens==='front'?'user':'environment'},width:{ideal:1280},height:{ideal:1920}},audio:false});
      if(requestId!==cameraRequestId){nextStream.getTracks().forEach(t=>t.stop());return;}
      clearTimeout(cameraRequestTimer);ui.cameraPending=false;stream=nextStream;
      const facing=stream.getVideoTracks()[0].getSettings().facingMode;ui.actualLens=facing==='user'?'front':facing==='environment'?'rear':null;
      data.permissions.camera='granted';persist();const stayPaused=paused||ui.coach.status==='PAUSED'||document.hidden;closeModal(true);beginCoach(p,'live',stayPaused);
      if(!ui.actualLens)toast('Live preview is open. Mirror is off because lens direction is unavailable.','info',5000);
    }catch(e){if(requestId!==cameraRequestId)return;clearTimeout(cameraRequestTimer);ui.cameraPending=false;data.permissions.camera=e.name==='NotAllowedError'?'denied':'unknown';persist();if(ui.modal){ui.modal='camera-denied';paintModal(false);}else render(true);toast('Camera unavailable. You can continue with the AI sample.','warning',5500);}
  }
  function pauseCoach(){const c=ui.coach;if(!c)return;const wasPaused=c.status==='PAUSED';clearCoachTimers();c.status=wasPaused?'INSTRUCTION':'PAUSED';render();if(wasPaused)speak();}
  function nextStep(){const c=ui.coach;if(!c||!c.guidance||c.status==='PAUSED'||c.issue||['COUNTDOWN','CAPTURED'].includes(c.status))return;stopSpeech();if(c.status==='READY'){c.stage=0;c.status='INSTRUCTION';}else if(c.stage<3){c.stage++;}else c.status='READY';render();speak();}
  function changePose(delta){const c=ui.coach;if(!c)return;const next=(c.poseIndex||0)+delta;if(next<0||next>=c.plan.poses.length)return;const paused=c.status==='PAUSED';clearCoachTimers();c.poseIndex=next;c.stage=2;c.issue=null;c.status=paused?'PAUSED':'INSTRUCTION';render();if(!paused)speak();}
  function startCountdown(){
    const c=ui.coach;if(!c||ui.busy||['COUNTDOWN','CAPTURED'].includes(c.status))return;
    const before=c.status;clearCoachTimers();c.beforeCapture=before;c.status='COUNTDOWN';let n=data.preferences.timer;
    if(!n){capture();return;}
    countdownEl.classList.remove('hidden');countdownEl.innerHTML=`<div class="count" aria-label="${n}">${n}</div><p>${c.source==='sample'?'AI sample photo · no camera capture':'Ready at your own pace.'}</p>${btn('Cancel countdown','cancel-countdown')}`;
    view.inert=true;topbar.inert=true;bottom.inert=true;countdownEl.querySelector('button').focus({preventScroll:true});
    timer=setInterval(()=>{n--;if(n===0){clearInterval(timer);timer=null;countdownEl.classList.add('hidden');view.inert=false;topbar.inert=false;bottom.inert=false;capture();}else{const count=countdownEl.querySelector('.count');count.textContent=n;count.setAttribute('aria-label',String(n));}},1000);
  }
  function cancelCountdown(){if(!ui.coach)return;clearCoachTimers();ui.coach.status=ui.coach.beforeCapture||'PAUSED';render();toast('Countdown cancelled. No photo was taken.');}
  async function capture(){
    const c=ui.coach;if(!c||c.status!=='COUNTDOWN')return;c.status='CAPTURED';ui.busy=true;stopSpeech();let preview=c.plan.photo;
    if(c.source==='live'&&stream){try{
      const video=$('#live-video');if(!video||!video.videoWidth)throw new Error('not ready');
      const canvas=document.createElement('canvas'),targetRatio=video.clientWidth/video.clientHeight,videoRatio=video.videoWidth/video.videoHeight;
      let sw=video.videoWidth,sh=video.videoHeight,sx=0,sy=0;
      if(videoRatio>targetRatio){sw=sh*targetRatio;sx=(video.videoWidth-sw)/2;}else{sh=sw/targetRatio;sy=(video.videoHeight-sh)/2;}
      const scale=Math.min(1,1600/sw);canvas.width=Math.round(sw*scale);canvas.height=Math.round(sh*scale);
      const ctx=canvas.getContext('2d');if(ui.actualLens==='front'){ctx.translate(canvas.width,0);ctx.scale(-1,1);}ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!blob)throw new Error('capture failed');preview=URL.createObjectURL(blob);
    }catch(e){ui.busy=false;c.status=c.beforeCapture||'INSTRUCTION';toast('The camera frame was not ready. Please try again.','warning');render();return;}}
    ui.result={id:uuid(),plan:c.plan,source:c.source,preview,capturedAt:new Date().toISOString(),presetId:'original',intensity:.7,exposure:0,contrast:0,warmth:0,comparing:false};
    ui.busy=false;stopCamera();ui.screen='result';render();
  }
  function commitResult(outcome){
    if(ui.busy||!ui.result)return;ui.busy=true;const r=ui.result;
    data=M.commitSession(data,{id:r.id,templateId:r.plan.templateId,contextId:r.plan.contextId,lookId:r.plan.lookId,mode:r.plan.mode,outcome,capturedAt:r.capturedAt,photoRef:r.source==='live'?'live-session':r.plan.photo,presetId:r.presetId,intensity:r.intensity,exposure:r.exposure,contrast:r.contrast,warmth:r.warmth});
    if(r.source==='live')memoryPhotos.set(r.id,r.preview);
    const saved=persist();ui.busy=false;stopCamera();ui.result=null;ui.coach=null;ui.sessionFilter='all';navigate('sessions','me');
    toast(saved?(outcome==='favorite'?'Favorite saved with your editing details.':'Photo details kept on this browser.'):'Kept for this visit. Local saving is unavailable.',saved?'check':'warning',5000);
    if(data.permissions.thumbnails==='unknown')openModal('thumbnail');
  }
  async function downloadPhoto(){
    const r=ui.result;if(!r||ui.busy)return false;ui.busy=true;render(true);
    let url=null;
    try{
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=resolveAsset(r.preview);});
      const base=document.createElement('canvas');base.width=image.naturalWidth;base.height=image.naturalHeight;
      const ctx=base.getContext('2d'),edited=r.presetId!=='original'||r.exposure||r.contrast||r.warmth;
      if(edited&&!('filter'in ctx))throw new Error('filters unsupported');
      ctx.drawImage(image,0,0);
      if(r.presetId!=='original'&&r.intensity>0){ctx.save();ctx.filter=presetFor(r.presetId).filter;ctx.globalAlpha=r.intensity;ctx.drawImage(image,0,0);ctx.restore();}
      const output=document.createElement('canvas');output.width=base.width;output.height=base.height;
      const out=output.getContext('2d');if('filter'in out)out.filter=adjustmentFilter(r);out.drawImage(base,0,0);
      const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('export unavailable');
      url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`PosePro-${r.source==='sample'?'AI-sample':r.plan.contextId}-${new Date().toISOString().slice(0,10)}.jpg`;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      toast('Download requested. Your browser chooses the destination.','download',5000);return true;
    }catch(error){if(url)URL.revokeObjectURL(url);toast('This browser could not export the photo. Your preview is still here; try Original or another browser.','warning',6000);return false;}
    finally{ui.busy=false;if(ui.result===r)render(true);}
  }
  async function requestPhotoSave(){if(!ui.result)return;if(data.permissions.save!=='granted'){openModal('save-consent');return;}if(await downloadPhoto())commitResult('keep');}
  function leaveCoach(){clearCoachTimers();stopCamera();disposePreview(ui.result);ui.coach=null;ui.result=null;closeModal();navigate('templates','templates');}
  function favoriteSession(){const s=data.sessions.find(s=>s.id===ui.sessionId);if(!s||s.favorite)return;data=M.commitSession(data,{...s,outcome:'favorite'});persist();render(true);toast('Added to favorites.','heart');}
  function reuse(){const s=data.sessions.find(s=>s.id===ui.sessionId);if(!s)return;applyTemplate(s.templateId);}

  const actions={
    tab(el){if(ui.busy)return;const id=el.dataset.tab;navigate(id==='camera'?'coach':id,id);},
    'go-home'(){navigate('coach','camera');},'go-sessions'(){ui.sessionFilter='all';navigate('sessions','me');},'go-style'(){navigate('style','me');},
    'favorite-photos'(){ui.sessionFilter='favorites';navigate('sessions','me');},
    'saved-templates'(){ui.filter='saved';ui.sceneFilter='all';ui.sourceFilter='all';navigate('templates','templates');},
    'open-templates'(){navigate('templates','templates');},discover(){ui.filter='all';ui.sceneFilter='all';ui.sourceFilter='all';navigate('templates','templates');},
    settings(){navigate('settings');},privacy(){if(ui.modal)closeModal();navigate('privacy');},
    back(){if(ui.screen==='result'){actions.retake();return;}if(ui.screen==='privacy'){navigate('settings');return;}if(ui.screen==='detail'){navigate('sessions','me');return;}if(['sessions','style','settings'].includes(ui.screen)){navigate('me','me');return;}navigate(ui.tab==='camera'?'coach':ui.tab,ui.tab);},
    'library-filter'(el){ui.filter=el.dataset.id;render(true);},'source-filter'(el){ui.sourceFilter=el.dataset.id;render(true);const summary=view.querySelector('.source-disclosure>summary');if(summary)summary.focus({preventScroll:true});},'library-scene'(el){ui.sceneFilter=el.dataset.id;render(true);},
    template(el){openModal('template',el.dataset.id);},'apply-template'(el){applyTemplate(el.dataset.id);},
    'save-template'(el){data=M.toggleSavedTemplate(data,el.dataset.id);persist();render(true);toast(data.savedTemplates.includes(el.dataset.id)?'Reference saved.':'Reference removed.','heart');},
    scene(el){select(el.dataset.id);},look(el){select(null,el.dataset.id);},mode(el){select(null,null,el.dataset.id);},'modal-mode'(el){select(null,null,el.dataset.id);},
    plan(){openModal('plan');},'coach-plan'(){openModal('coach-plan');},start:requestStart,
    'camera-tools'(){openModal('camera-tools');},'shooting-setup'(){openModal('shooting-setup');},'light-tip'(){openModal('light-tip');},
    paywall(){ui.pending=null;ui.pendingPreset=null;openModal('paywall');},
    price(el){ui.price=el.dataset.id;paintModal(false);},trial(){closeModal(false,true);openModal('trial-confirm');},
    'activate-pro'(){
      if(ui.busy)return;ui.busy=true;const b=modalRoot.querySelector('[data-action="activate-pro"]');b.disabled=true;b.innerHTML='<span class="spinner"></span> Opening demo access…';
      setTimeout(()=>{const pending=ui.pending,preset=ui.pendingPreset;data.subscription={active:true,plan:ui.price};ui.pending=null;ui.pendingPreset=null;if(pending){ui.selection={...pending};data.lastSelection={...pending};}if(preset&&ui.result)ui.result.presetId=preset;persist();ui.busy=false;closeModal();if(pending){const paused=ui.coach&&ui.coach.status==='PAUSED';beginCoach(selectedPlan(),stream?'live':'sample',paused);}else render(true);toast('Demo Pro is active. No real purchase was made.','style',5000);},500);
    },
    'manage-pro'(){ui.pending=null;ui.pendingPreset=null;openModal(data.subscription.active?'manage-pro':'paywall');},
    'end-pro'(){data.subscription={active:false,plan:null};if(!M.freeAccess(ui.selection.contextId,ui.selection.lookId)){ui.selection={contextId:'cafe',lookId:'natural',mode:ui.selection.mode};data.lastSelection={...ui.selection};if(ui.coach){ui.coach.plan=selectedPlan();ui.coach.stage=0;ui.coach.poseIndex=0;ui.coach.status='PAUSED';}}if(ui.result&&presetFor(ui.result.presetId).isPro)ui.result.presetId='original';persist();closeModal();render();toast('Back to Free. Your photo records remain.');},
    restore(){toast(data.subscription.active?'Demo Pro is already active in this browser.':'No demo purchase was found. No real store account is queried.','info',5000);},
    terms(){closeModal();openModal('terms');},'modal-privacy'(){closeModal();navigate('privacy');},
    'camera-access'(){openModal('camera-access');},'camera-source'(){if(ui.modal)closeModal();openModal('camera-access');},
    'sample-camera'(){ensureCoach();const p=ui.coach.plan,paused=ui.coach.status==='PAUSED';stopCamera();closeModal();beginCoach(p,'sample',paused);},'live-camera':useLiveCamera,
    lens(el){if(ui.cameraPending)return;const live=!!stream;const paused=ui.coach.status==='PAUSED';clearCoachTimers();data.preferences.lens=el.dataset.id;ui.coach.status=paused?'PAUSED':'INSTRUCTION';persist();if(live){useLiveCamera();}else render(true);},
    support(el){if(ui.cameraPending)return;const paused=ui.coach.status==='PAUSED';clearCoachTimers();data.preferences.support=el.dataset.id;ui.coach.stage=0;ui.coach.status=paused?'PAUSED':'INSTRUCTION';persist();render(true);},
    grid(){data.preferences.grid=!data.preferences.grid;persist();render(true);},
    timer(el){const options=[0,3,5,10];const chosen=el&&el.dataset.id;data.preferences.timer=chosen!==undefined&&options.includes(Number(chosen))?Number(chosen):options[(options.indexOf(data.preferences.timer)+1)%options.length];persist();render(true);},
    'save-access'(){openModal('save-access');},
    'allow-save'(){const continueSave=ui.modal==='save-consent';data.permissions.save='granted';persist();closeModal();if(continueSave)requestPhotoSave();else{render(true);toast('Downloads are enabled for this demo.');}},
    'deny-save'(){data.permissions.save='denied';persist();closeModal();render(true);toast('Downloads are off. Capture and keeping photo details still work.','info',5000);},
    'thumbnail-notice'(){openModal('thumbnail');},'allow-thumbnails'(){data.permissions.thumbnails='granted';persist();closeModal();render(true);toast('Photo previews are on.','photo');},'deny-thumbnails'(){data.permissions.thumbnails='denied';persist();closeModal();render(true);toast('Showing photo details only.','info');},
    'next-step':nextStep,pause:pauseCoach,shutter:startCountdown,'cancel-countdown':cancelCountdown,
    'previous-pose'(){changePose(-1);},'next-pose'(){changePose(1);},
    'coach-mode'(el){if(ui.cameraPending)return;const c=ui.coach;if(!c)return;const paused=c.status==='PAUSED';clearCoachTimers();ui.selection.mode=el.dataset.id;data.lastSelection={...ui.selection};c.plan=M.getPlan(c.plan.contextId,c.plan.lookId,el.dataset.id,data);c.stage=0;c.poseIndex=0;c.issue=null;c.status=paused?'PAUSED':'INSTRUCTION';persist();render(true);},
    voice(){const c=ui.coach;if(!c)return;if(!('speechSynthesis'in window)){toast('Voice is unavailable. Text guidance remains.','info');return;}c.voice=!c.voice;stopSpeech();render(true);if(c.voice)speak();},
    outline(){const c=ui.coach;c.outline=!c.outline;render(true);},
    'toggle-guidance'(){const c=ui.coach;stopSpeech();c.guidance=!c.guidance;closeModal();render(true);},
    conditions(){openModal('conditions');},condition(el){const c=ui.coach,paused=c.status==='PAUSED';clearCoachTimers();closeModal();c.issue=el.dataset.id==='normal'?null:el.dataset.id;c.status=paused?'PAUSED':c.issue?'DEGRADED':'INSTRUCTION';render();},
    recover(){ui.coach.issue=null;ui.coach.status='INSTRUCTION';render();},
    'exit-coach'(){clearCoachTimers();ui.coach.status='PAUSED';render();openModal('exit-coach');},'confirm-exit':leaveCoach,
    preset(el){const p=presetFor(el.dataset.id);if(p.isPro&&!data.subscription.active){ui.pendingPreset=p.id;ui.pending=null;openModal('paywall');return;}ui.result.presetId=p.id;ui.result.comparing=false;render(true);},
    compare(){ui.result.comparing=!ui.result.comparing;render(true);},
    'reset-edit'(){Object.assign(ui.result,{presetId:'original',intensity:.7,exposure:0,contrast:0,warmth:0,comparing:false});render(true);},
    'save-photo':requestPhotoSave,keep(){commitResult('keep');},favorite(){commitResult('favorite');},
    retake(){if(ui.busy||!ui.result)return;const p=ui.result.plan,source=ui.result.source;disposePreview(ui.result);beginCoach(p,'sample');if(source==='live')useLiveCamera();},download:downloadPhoto,
    discard(){openModal('discard');},'confirm-discard'(){leaveCoach();toast('Preview discarded. Nothing added to history.','info');},
    filter(el){ui.sessionFilter=el.dataset.id;render(true);},'filter-all'(){ui.sessionFilter='all';render(true);},session(el){ui.sessionId=el.dataset.id;navigate('detail','me');},'favorite-session':favoriteSession,reuse,
    'reset-style'(){openModal('reset-style');},'confirm-reset'(){data=M.resetStyle(data);const saved=persist();closeModal();render();toast(saved?'Preferences reset. Your photos remain.':'Reset for this visit. Local saving is unavailable.',saved?'check':'warning');},
    'delete-data'(){openModal('delete-data');},'confirm-delete'(){const input=$('#delete-confirm');if(!input||input.value!=='DELETE')return;data=M.deleteLocalData(data);ui.selection={...data.lastSelection};ui.coach=null;memoryPhotos.forEach(url=>URL.revokeObjectURL(url));memoryPhotos.clear();const saved=persist();closeModal();render();toast(saved?'Local photos, saved sets and preferences deleted.':'Cleared for this visit. Browser storage could not be updated.',saved?'check':'warning');},
    about(){openModal('about');},'demo-options'(){openModal('demo-options');},
    'simulate-denial'(el){data.permissions[el.dataset.id]='denied';if(el.dataset.id==='camera'){stopCamera();if(ui.coach)ui.coach.source='sample';}persist();closeModal();render(true);toast('Demo preference changed. Browser permissions are managed separately.','info',4500);},
    'storage-toggle'(){ui.storageFailure=!ui.storageFailure;closeModal();toast(ui.storageFailure?'Storage-full simulation is on. Changes remain in memory.':'Normal local saving restored.','info',5500);},
    'reset-permissions'(){data.permissions={camera:'unknown',save:'unknown',thumbnails:'unknown'};persist();closeModal();render(true);toast('Demo preferences reset.');},
    'repair-storage'(){storageBlocked=false;persist();closeModal();toast('A fresh local record is ready.');},'close-modal'(){closeModal();}
  };

  /* Delegation keeps every control usable after rerendering, without duplicate listeners. */
  app.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled||ui.busy)return;if(ui.modal&&!modalRoot.contains(el)&&!countdownEl.contains(el))return;const fn=actions[el.dataset.action];if(fn){try{const result=fn(el);if(result&&result.catch)result.catch(()=>toast('Something didn’t finish. Please try again.','warning'));}catch(error){console.error(error);toast('Something didn’t finish. Please try again.','warning');}}});
  app.addEventListener('change',e=>{if(e.target.matches('#appearance')){data.preferences.appearance=e.target.value;persist();theme();}});
  app.addEventListener('input',e=>{if(e.target.dataset.edit&&ui.result&&!ui.busy){
    const key=e.target.dataset.edit;if(!['intensity','exposure','contrast','warmth'].includes(key))return;
    const amount=Math.max(key==='intensity'?0:-1,Math.min(1,Number(e.target.value)/100));if(!Number.isFinite(amount))return;
    ui.result[key]=amount;ui.result.comparing=false;e.target.setAttribute('aria-valuetext',Math.round(amount*100)+(key==='intensity'?' percent':''));
    const output=e.target.parentElement.querySelector('output');if(output)output.textContent=Math.round(amount*100)+(key==='intensity'?'%':'');
    const composite=view.querySelector('.photo-composite');if(composite){composite.style.filter=adjustmentFilter(ui.result);const overlay=composite.querySelector('.preset-overlay');overlay.style.filter=presetFor(ui.result.presetId).filter;overlay.style.opacity=ui.result.presetId==='original'?0:ui.result.intensity;}
    const badge=view.querySelector('.result-preview .badge');if(badge)badge.textContent=presetFor(ui.result.presetId).label;
    const compare=view.querySelector('[data-action="compare"]');if(compare){compare.setAttribute('aria-pressed','false');compare.innerHTML=icon('refresh')+' Compare original';}
  }if(e.target.id==='delete-confirm'){const valid=e.target.value==='DELETE',invalid=!!e.target.value&&!'DELETE'.startsWith(e.target.value);const b=modalRoot.querySelector('[data-action="confirm-delete"]');if(b)b.disabled=!valid;$('#delete-error').textContent=invalid?'Enter DELETE exactly to confirm.':'';e.target.setAttribute('aria-invalid',String(invalid));}});
  modalRoot.addEventListener('click',e=>{if(e.target.dataset.backdrop)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(timer)cancelCountdown();else if(ui.modal)closeModal();}if(e.key==='Tab'&&timer){e.preventDefault();countdownEl.querySelector('button').focus();return;}if(e.key==='Tab'&&ui.modal){const items=[...modalRoot.querySelectorAll('button:not(:disabled),input,select,a[href]')];if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&[first,modalRoot.querySelector('.modal-sheet')].includes(document.activeElement)){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}});
  let touch=null;view.addEventListener('touchstart',e=>{const t=e.touches[0];touch={x:t.clientX,y:t.clientY};},{passive:true});view.addEventListener('touchend',e=>{if(!touch||ui.modal)return;const t=e.changedTouches[0];if(touch.x<28&&t.clientX-touch.x>100&&Math.abs(t.clientY-touch.y)<55&&!['templates','me','coach'].includes(ui.screen))actions.back();touch=null;},{passive:true});
  modalRoot.addEventListener('touchstart',e=>{if(e.target.closest('.sheet-handle'))touch={x:e.touches[0].clientX,y:e.touches[0].clientY,sheet:true};},{passive:true});modalRoot.addEventListener('touchend',e=>{if(touch&&touch.sheet&&e.changedTouches[0].clientY-touch.y>75)closeModal();touch=null;},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ui.cameraPending)cancelCameraRequest();if(document.hidden&&ui.screen==='coach'&&ui.coach){clearCoachTimers();ui.coach.status='PAUSED';render();}if(document.hidden)stopSpeech();else if(ui.modal)paintModal(false);});
  window.addEventListener('pagehide',()=>{cancelCameraRequest();clearCoachTimers();stopCamera();memoryPhotos.forEach(url=>URL.revokeObjectURL(url));memoryPhotos.clear();if(ui.result&&ui.result.source==='live'){disposePreview(ui.result);ui.result=null;ui.screen='coach';ui.tab='camera';resumeNotice=true;}if(ui.coach){ui.coach.status='PAUSED';if(ui.coach.source==='live'){ui.coach.source='sample';resumeNotice=true;}}});
  window.addEventListener('pageshow',e=>{if(e.persisted){render(true);if(resumeNotice)toast('Your live preview ended. Your plan is ready to try again.','camera',5000);resumeNotice=false;}});
  window.addEventListener('offline',()=>{if(ui.screen==='coach')render(true);toast('You’re offline. Your plans and practice still work.','wifi',5000);});window.addEventListener('online',()=>{if(ui.screen==='coach')render(true);toast('You’re back online. Your local record stayed here.','wifi');});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',theme);
  view.innerHTML='<div class="skeleton" role="status" aria-label="Loading your plans"><div></div><div></div><div></div><div></div></div>';
  theme();setTimeout(()=>{render();if(loaded.code==='corrupt')openModal('corrupt');else if(!loaded.ok)toast(loaded.error,'warning',6500);},300);
})();
