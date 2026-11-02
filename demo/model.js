/* PosePro demo domain model. No network, image bytes, or paid services.
 * Load directly with <script src="model.js"></script>; API: window.PoseProModel.
 * window.MuseModel and the version 1 storage key remain compatible with saved demos.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'musepilot.demo.v1';
  const CONFIG = deepFreeze({
    version: 1,
    brand: 'PosePro AI Camera',
    storageKey: STORAGE_KEY,
    subscription: { currency: 'USD', monthly: 4.99, annual: 34.99, trialDays: 7, annualTrial: true, monthlyTrial: true },
    styleWeight: { keep: 1, favorite: 3 },
    fatigueDays: 3,
    demoTemplates: true
  });

  const CONTEXTS = deepFreeze([
    { id: 'cafe', label: 'Café', group: 'weekly', sceneId: 'cafe', icon: 'cup', description: 'A quiet everyday moment', photo: 'assets/cafe.webp' },
    { id: 'outfit', label: 'Outfit', group: 'weekly', sceneId: 'outfit', icon: 'shirt', description: 'Let your look feel like you', photo: 'assets/outfit.webp' },
    { id: 'travel', label: 'Travel', group: 'weekly', sceneId: 'travel', icon: 'compass', description: 'You and somewhere new', photo: 'assets/travel.webp' },
    { id: 'dating', label: 'Dating', group: 'profile', sceneId: 'windowLight', icon: 'heart', description: 'Natural, like you', photo: 'assets/window-light.webp' },
    { id: 'professional', label: 'Professional', group: 'profile', sceneId: 'windowLight', icon: 'briefcase', description: 'An approachable first impression', photo: 'assets/window-light.webp' }
  ]);

  const LOOKS = deepFreeze([
    { id: 'natural', label: 'Natural', description: 'Relaxed and everyday' },
    { id: 'editorial', label: 'Editorial', description: 'Still, like an editorial' },
    { id: 'candid', label: 'Candid', description: "As if you haven't noticed the camera" }
  ]);

  const MODES = deepFreeze([
    { id: 'inFrame', label: "I'm in Frame", description: 'Tips addressed to you · choose either lens' },
    { id: 'shooting', label: "I'm Shooting", description: 'Tips addressed to the photographer · choose either lens' }
  ]);

  /* CSS filters are a visual preview, not a calibrated LUT or an exposure tool.
   * Original stays available at every tier and is the capture default. */
  const PRESETS = deepFreeze([
    { id: 'original', label: 'Original', filter: 'none', isPro: false, description: 'Keep the original light and color.' },
    { id: 'warm', label: 'Warm', filter: 'sepia(0.08) saturate(1.05) contrast(1.02)', isPro: false, description: 'A gentle warm tone, without changing facial features.' },
    { id: 'clean', label: 'Clean', filter: 'saturate(0.94) contrast(1.03) brightness(1.02)', isPro: false, description: 'A restrained, clear color treatment.' },
    { id: 'film', label: 'Soft film', filter: 'sepia(0.13) saturate(0.8) contrast(0.92) brightness(1.03)', isPro: true, description: 'Soft contrast and muted color; a visual film impression.' },
    { id: 'cool', label: 'City cool', filter: 'saturate(0.84) hue-rotate(8deg) contrast(1.04)', isPro: true, description: 'A cooler city palette, best reviewed against the original.' }
  ]);

  const SCENES = {
    cafe: {
      label: 'Café', title: 'A quiet café moment', framing: 'Half-body', distance: 'Comfortable half-body distance', photo: 'assets/cafe.webp',
      description: 'A relaxed seated portrait with a little café atmosphere.',
      lightTip: 'Try a window without direct sun. Check the light on your face yourself.',
      framingTip: 'Include the hands you want to show; a half-body portrait does not need visible feet.',
      cameraTip: 'Start near the seated subject’s eye level, then try an angle that suits the photo.',
      ruleIds: ['L02', 'F01', 'F03', 'P06', 'P09'],
      poses: [
        { title: 'At the table', inFrame: 'Rest one hand comfortably on the table.', shooting: 'Invite them to rest one hand on the table.', ruleIds: ['P06', 'P09'] },
        { title: 'Turn and pause', inFrame: 'Turn your shoulders a little, if comfortable.', shooting: 'Invite a small, comfortable shoulder turn.', ruleIds: ['P03'] },
        { title: 'A moment outside', inFrame: 'Look toward something beside the window.', shooting: 'Invite them to look at something beside the window.', ruleIds: ['E05'] }
      ]
    },
    outfit: {
      label: 'Outfit', title: 'An effortless outfit portrait', framing: 'Full-body', distance: 'Enough room for the chosen outfit', photo: 'assets/outfit.webp',
      description: 'Show the outfit and the way you like to wear it.',
      lightTip: 'Even outdoor shade can make a simple starting point; hard light is also a style choice.',
      framingTip: 'For a complete outfit, check the head, shoes and space for the pose yourself.',
      cameraTip: 'Try a height near the subject’s torso and review the proportions; a low angle can be intentional.',
      ruleIds: ['L04', 'C04', 'F02', 'P01', 'P02'],
      poses: [
        { title: 'An easy stance', inFrame: 'Choose a comfortable stance with your hands relaxed.', shooting: 'Invite a comfortable stance with relaxed hands.', ruleIds: ['P01', 'P06'] },
        { title: 'A small weight shift', inFrame: 'If comfortable, let your weight settle to one side.', shooting: 'Invite a small weight shift only if comfortable.', ruleIds: ['P02'] },
        { title: 'One hand, one detail', inFrame: 'Let one hand rest near a pocket or outfit detail.', shooting: 'Invite one hand to rest near a pocket or outfit detail.', ruleIds: ['P06', 'P07'] }
      ]
    },
    travel: {
      label: 'Travel', title: 'A moment somewhere new', framing: 'Person + surroundings', distance: 'Room for the place and the person', photo: 'assets/travel.webp',
      description: 'Keep enough of the place to tell the story of being there.',
      lightTip: 'Try open shade facing a brighter open area, without looking at the sun.',
      framingTip: 'Keep the surroundings that tell your story. Centered and off-center framing can both work.',
      cameraTip: 'Choose a comfortable distance first, then adjust the framing without moving closer by default.',
      ruleIds: ['L04', 'B01', 'B02', 'C02', 'F05'],
      poses: [
        { title: 'Take in the place', inFrame: 'Pause comfortably and look toward the view.', shooting: 'Invite them to pause and look toward the view.', ruleIds: ['P01', 'E05'] },
        { title: 'Turn toward the story', inFrame: 'Turn your body slightly toward something you like.', shooting: 'Invite a small turn toward something they like.', ruleIds: ['P03', 'B01'] },
        { title: 'Back to the camera', inFrame: 'Keep your stance and bring your gaze back to the lens.', shooting: 'Invite them to bring their gaze back to the lens.', ruleIds: ['E01', 'A03'] }
      ]
    },
    windowLight: {
      label: 'Window light', title: 'A portrait in soft window light', framing: 'Close-up', distance: 'Comfortable portrait distance', photo: 'assets/window-light.webp',
      description: 'An approachable portrait with simple window light.',
      lightTip: 'First confirm where the window is; then try a small face turn toward it.',
      framingTip: 'Choose the head and shoulder crop you want; a tight portrait may intentionally crop the top of the head.',
      cameraTip: 'Start near eye level. If a very close view feels exaggerated, step back before reframing.',
      ruleIds: ['L02', 'L03', 'C01', 'C03', 'F01'],
      poses: [
        { title: 'A calm portrait', inFrame: 'Keep a comfortable posture and look toward the lens.', shooting: 'Invite a comfortable posture and a look toward the lens.', ruleIds: ['P01', 'E01'] },
        { title: 'A little toward the window', inFrame: 'If comfortable, turn your face a little toward the window.', shooting: 'Invite a small, comfortable face turn toward the window.', ruleIds: ['L03', 'P08'] },
        { title: 'A quiet glance', inFrame: 'Let your gaze rest just beside the camera.', shooting: 'Invite a glance just beside the camera.', ruleIds: ['E05'] }
      ]
    }
  };

  /* Existing preview assets are AI-generated references, not user results or
   * photographer-shot examples. These twelve authored plans are manual demo
   * suggestions; no body, light, distance or pose matching runs in this demo. */
  const TEMPLATES = deepFreeze(Object.keys(SCENES).flatMap(function (sceneId) {
    return LOOKS.map(function (look) {
      const scene = SCENES[sceneId];
      const isProfile = sceneId === 'windowLight';
      const phone = { height: sceneId === 'outfit' ? 'Try torso height' : 'Try near eye level', distance: scene.distance, orientation: 'Portrait' };
      const poses = scene.poses.map(function (pose) { return Object.assign({}, pose, { ruleIds: pose.ruleIds.slice() }); });
      if (look.id === 'editorial') poses.push(poses.shift());
      if (look.id === 'candid') poses.unshift(poses.pop());
      const pose = poses[0];
      const ruleIds = Array.from(new Set(scene.ruleIds.concat(['A03', 'A04', 'P04', 'E02', 'Q07'], poses.flatMap(function (item) { return item.ruleIds; }))));
      return {
        id: (isProfile ? 'window-light' : sceneId) + '-' + look.id,
        sceneId: sceneId,
        lookId: look.id,
        title: scene.title,
        description: scene.description + ' ' + look.description + '.',
        source: 'ai',
        sourceLabel: 'AI-generated reference',
        photo: scene.photo,
        asset: scene.photo,
        isPro: isProfile || look.id !== 'natural',
        framing: scene.framing,
        phone: phone,
        lightTip: scene.lightTip,
        framingTip: scene.framingTip,
        cameraTip: scene.cameraTip,
        poseCount: poses.length,
        poses: poses,
        ruleIds: ruleIds,
        ruleSource: 'PosePro_Portrait_Photography_Rules_V1.0.md',
        manualReference: true,
        actions: [
          { stage: 'enterFrame', title: 'Choose your frame', inFrame: 'Check that the parts you want to show are in the frame.', shooting: 'Check that the parts they want to show are in the frame.', spatial: true, manualReference: true, ruleIds: ['A02', 'F01'] },
          { stage: 'composition', title: 'Try a camera position', inFrame: 'Try the suggested camera position, then review the framing.', shooting: 'Try the suggested camera position, then review the framing.', spatial: true, manualReference: true, ruleIds: sceneId === 'outfit' ? ['C04'] : ['C03'] },
          { stage: 'pose', title: pose.title, inFrame: pose.inFrame, shooting: pose.shooting, spatial: true, manualReference: true, ruleIds: pose.ruleIds.slice() },
          { stage: 'expression', title: 'Choose your expression', inFrame: 'Breathe out and keep an expression that feels like you.', shooting: 'Invite an easy breath and the expression they prefer.', spatial: false, manualReference: true, ruleIds: ['A03', 'P04', 'E02'] }
        ],
        avoid: [
          'Uncomfortable poses; a seated or supported version is welcome',
          'Unintended cropping of the parts you chose to show',
          'Only avoid a low angle, wide view or direct flash when it conflicts with your chosen look'
        ],
        demo: true
      };
    });
  }));

  function deepFreeze(value) {
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      if (value[key] && typeof value[key] === 'object' && !Object.isFrozen(value[key])) deepFreeze(value[key]);
    });
    return value;
  }

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function contextFor(id) { return CONTEXTS.find(function (item) { return item.id === id; }); }
  function templateFor(id) { return TEMPLATES.find(function (item) { return item.id === id; }); }
  function validLook(id) { return LOOKS.some(function (item) { return item.id === id; }); }
  function validMode(id) { return MODES.some(function (item) { return item.id === id; }); }
  function validPreset(id) { return PRESETS.some(function (item) { return item.id === id; }); }
  function boundedEdit(value) { return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0; }
  function boundedIntensity(value) { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7; }
  function validDate(value) {
    if (typeof value !== 'string') return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  }

  function createData() {
    return {
      version: 1,
      sessions: [],
      savedTemplates: [],
      styleWeights: {},
      recentUses: [],
      subscription: { active: false, plan: null },
      permissions: { camera: 'unknown', save: 'unknown', thumbnails: 'unknown' },
      preferences: { appearance: 'system', voice: false, outline: false, lens: 'rear', support: 'handheld', grid: true, timer: 3 },
      lastSelection: { contextId: 'cafe', lookId: 'natural', mode: 'inFrame' }
    };
  }

  function freeAccess(contextId, lookId) {
    return ['cafe', 'outfit', 'travel'].includes(contextId) && lookId === 'natural';
  }

  function sortTemplates(templates, data, now) {
    const candidates = Array.isArray(templates) ? templates.slice() : TEMPLATES.slice();
    const state = data || createData();
    const uses = Array.isArray(state.recentUses) ? state.recentUses : [];
    const lastUse = {};
    uses.forEach(function (use) {
      const time = Date.parse(use.usedAt);
      if (Number.isFinite(time)) lastUse[use.templateId] = Math.max(lastUse[use.templateId] || 0, time);
    });
    const newest = uses.reduce(function (last, use) { return !last || Date.parse(use.usedAt) > Date.parse(last.usedAt) ? use : last; }, null);
    const threshold = (Number.isFinite(now) ? now : Date.now()) - CONFIG.fatigueDays * 86400000;
    return candidates.sort(function (a, b) {
      const lastA = newest && newest.templateId === a.id ? 1 : 0;
      const lastB = newest && newest.templateId === b.id ? 1 : 0;
      if (lastA !== lastB) return lastA - lastB;
      const recentA = (lastUse[a.id] || 0) >= threshold ? 1 : 0;
      const recentB = (lastUse[b.id] || 0) >= threshold ? 1 : 0;
      if (recentA !== recentB) return recentA - recentB;
      const weights = state.styleWeights || {};
      const weightDiff = (Number(weights[b.id]) || 0) - (Number(weights[a.id]) || 0);
      if (weightDiff) return weightDiff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  function selectTemplate(contextId, lookId, data, now) {
    const context = contextFor(contextId);
    if (!context || !validLook(lookId)) return null;
    return sortTemplates(TEMPLATES.filter(function (template) {
      return template.sceneId === context.sceneId && template.lookId === lookId;
    }), data, now)[0] || null;
  }

  function getPlan(contextId, lookId, mode, data) {
    const chosenMode = mode || 'inFrame';
    const template = selectTemplate(contextId, lookId, data);
    if (!template || !validMode(chosenMode)) return null;
    const plan = copy(template);
    plan.id = 'plan-' + contextId + '-' + lookId + '-' + chosenMode;
    plan.templateId = template.id;
    plan.contextId = contextId;
    plan.contextLabel = contextFor(contextId).label;
    plan.photo = contextFor(contextId).photo;
    plan.asset = plan.photo;
    plan.mode = chosenMode;
    plan.lookLabel = LOOKS.find(function (look) { return look.id === lookId; }).label;
    /* Legacy completionRule names describe the manual checklist only. */
    plan.completionRule = ['enterFrame', 'composition', 'pose', 'expression'];
    plan.completionMethod = 'manual';
    plan.guidanceKind = 'reference';
    if (contextId === 'dating') {
      plan.actions[3].inFrame = 'Choose a calm look or a small smile, whichever feels like you.';
      plan.actions[3].shooting = 'Invite a calm look or a small smile, whichever they prefer.';
    } else if (contextId === 'professional') {
      plan.actions[3].inFrame = 'Relax your jaw, then look at camera.';
      plan.actions[3].shooting = 'Ask them to look calmly at camera.';
    }
    return plan;
  }

  /* Persist references only. A live preview can be shown during the current
   * session, but blob/data URLs and remote/private file paths cannot be saved. */
  function isSafePhotoRef(value) {
    if (value === 'live-session') return true;
    if (typeof value !== 'string' || value.length > 160 || value.includes('..')) return false;
    return /^(?:\.\/)?(?:demo\/)?assets\/[A-Za-z0-9][A-Za-z0-9_/-]*\.(?:svg|png|jpe?g|webp|avif)$/i.test(value);
  }

  function sanitizeSession(value) {
    if (!value || typeof value !== 'object') return null;
    if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id)) return null;
    const context = contextFor(value.contextId);
    const template = templateFor(value.templateId);
    if (!context || !template || template.sceneId !== context.sceneId || template.lookId !== value.lookId || !validMode(value.mode)) return null;
    const outcome = String(value.outcome || '').toLowerCase();
    if (!['keep', 'favorite'].includes(outcome)) return null;
    const capturedAt = validDate(value.capturedAt);
    if (!capturedAt) return null;
    const contribution = outcome === 'favorite' ? CONFIG.styleWeight.favorite : CONFIG.styleWeight.keep;
    return {
      id: value.id,
      templateId: template.id,
      contextId: context.id,
      sceneId: context.sceneId,
      lookId: template.lookId,
      mode: value.mode,
      outcome: outcome,
      favorite: outcome === 'favorite',
      capturedAt: capturedAt,
      photoRef: isSafePhotoRef(value.photoRef) ? value.photoRef : null,
      presetId: validPreset(value.presetId) ? value.presetId : 'original',
      intensity: boundedIntensity(value.intensity),
      exposure: boundedEdit(value.exposure),
      contrast: boundedEdit(value.contrast),
      warmth: boundedEdit(value.warmth),
      /* This ledger survives Reset style, so replaying a saved id cannot
       * recreate a preference that the user explicitly cleared. */
      contribution: contribution
    };
  }

  function normalizeData(value) {
    if (!value || typeof value !== 'object' || value.version !== 1) throw new TypeError('Unsupported local data.');
    const data = createData();
    const seen = new Set();
    data.sessions = (Array.isArray(value.sessions) ? value.sessions : []).map(sanitizeSession).filter(function (session) {
      if (!session || seen.has(session.id)) return false;
      seen.add(session.id);
      return true;
    });
    data.savedTemplates = Array.from(new Set((Array.isArray(value.savedTemplates) ? value.savedTemplates : []).filter(function (id) {
      return !!templateFor(id);
    })));
    const weights = value.styleWeights && typeof value.styleWeights === 'object' ? value.styleWeights : {};
    TEMPLATES.forEach(function (template) {
      const score = weights[template.id];
      if (Number.isFinite(score) && score > 0) data.styleWeights[template.id] = Math.min(Math.floor(score), 1000000);
    });
    data.recentUses = (Array.isArray(value.recentUses) ? value.recentUses : []).filter(function (use) {
      return use && templateFor(use.templateId) && validDate(use.usedAt);
    }).slice(-1000).map(function (use) { return { templateId: use.templateId, usedAt: validDate(use.usedAt) }; });
    if (value.subscription && typeof value.subscription === 'object') {
      data.subscription.active = value.subscription.active === true;
      data.subscription.plan = ['monthly', 'annual'].includes(value.subscription.plan) ? value.subscription.plan : null;
    }
    if (value.permissions && typeof value.permissions === 'object') {
      Object.keys(data.permissions).forEach(function (key) {
        if (['unknown', 'granted', 'denied'].includes(value.permissions[key])) data.permissions[key] = value.permissions[key];
      });
    }
    if (value.preferences && typeof value.preferences === 'object') {
      if (['system', 'light', 'dark'].includes(value.preferences.appearance)) data.preferences.appearance = value.preferences.appearance;
      data.preferences.voice = value.preferences.voice === true;
      data.preferences.outline = value.preferences.outline === true;
      if (['rear', 'front'].includes(value.preferences.lens)) data.preferences.lens = value.preferences.lens;
      if (['handheld', 'tripod'].includes(value.preferences.support)) data.preferences.support = value.preferences.support;
      if (typeof value.preferences.grid === 'boolean') data.preferences.grid = value.preferences.grid;
      if ([0, 3, 5, 10].includes(value.preferences.timer)) data.preferences.timer = value.preferences.timer;
    }
    const selection = value.lastSelection;
    if (selection && typeof selection === 'object') {
      if (contextFor(selection.contextId)) data.lastSelection.contextId = selection.contextId;
      if (validLook(selection.lookId)) data.lastSelection.lookId = selection.lookId;
      if (validMode(selection.mode)) data.lastSelection.mode = selection.mode;
    }
    return data;
  }

  function storageHandle(storage) {
    if (storage) return storage;
    if (!root.localStorage) throw new Error('Local storage is unavailable.');
    return root.localStorage;
  }

  function storageFailure(error, fallback) {
    const quota = error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014);
    return {
      ok: false,
      data: fallback || createData(),
      code: quota ? 'quota' : 'unavailable',
      error: quota ? 'Your browser storage is full. Your current session is still available here.' : 'Local storage is unavailable. Changes will last for this visit only.'
    };
  }

  function load(storage) {
    let raw;
    try { raw = storageHandle(storage).getItem(STORAGE_KEY); }
    catch (error) { return storageFailure(error); }
    if (raw === null || raw === undefined) return { ok: true, data: createData() };
    try { return { ok: true, data: normalizeData(JSON.parse(raw)) }; }
    catch (error) { return { ok: false, data: createData(), code: 'corrupt', error: 'Saved demo data could not be read. A fresh local session is ready.' }; }
  }

  function save(data, storage) {
    let clean;
    try { clean = normalizeData(data); }
    catch (error) { return { ok: false, code: 'invalid', error: 'The local session could not be saved.' }; }
    try {
      storageHandle(storage).setItem(STORAGE_KEY, JSON.stringify(clean));
      return { ok: true, data: clean };
    } catch (error) { return storageFailure(error, clean); }
  }

  function recordUse(data, templateId, usedAt) {
    if (!templateFor(templateId)) return data;
    const timestamp = validDate(usedAt || new Date().toISOString());
    if (!timestamp) return data;
    if (data.recentUses.some(function (use) { return use.templateId === templateId && use.usedAt === timestamp; })) return data;
    const next = copy(data);
    next.recentUses = next.recentUses.concat([{ templateId: templateId, usedAt: timestamp }]).slice(-1000);
    return next;
  }

  function commitSession(data, details) {
    const outcome = String(details && details.outcome || '').toLowerCase();
    if (outcome !== 'keep' && outcome !== 'favorite') return data;
    const incoming = sanitizeSession(Object.assign({}, details, { outcome: outcome, capturedAt: details.capturedAt || new Date().toISOString() }));
    if (!incoming) return data;
    const existingIndex = data.sessions.findIndex(function (session) { return session.id === incoming.id; });
    const next = copy(data);
    if (existingIndex >= 0) {
      const existing = next.sessions[existingIndex];
      /* An id can upgrade Keep → Favorite, but can never switch its template,
       * context, photo, or original capture time during a replay. */
      if (existing.templateId !== incoming.templateId || existing.contextId !== incoming.contextId || existing.mode !== incoming.mode) return data;
      if (existing.outcome === 'favorite' || outcome === 'keep') return data;
      const alreadyApplied = Number.isFinite(existing.contribution) ? existing.contribution : CONFIG.styleWeight.keep;
      const delta = Math.max(0, CONFIG.styleWeight.favorite - alreadyApplied);
      existing.outcome = 'favorite';
      existing.favorite = true;
      existing.contribution = CONFIG.styleWeight.favorite;
      next.styleWeights[existing.templateId] = (next.styleWeights[existing.templateId] || 0) + delta;
      return next;
    }
    next.sessions.unshift(incoming);
    next.styleWeights[incoming.templateId] = (next.styleWeights[incoming.templateId] || 0) + incoming.contribution;
    /* A use already recorded when coaching began need not be recorded again. */
    const alreadyUsed = next.recentUses.some(function (use) { return use.templateId === incoming.templateId && use.usedAt === incoming.capturedAt; });
    if (!alreadyUsed) next.recentUses.push({ templateId: incoming.templateId, usedAt: incoming.capturedAt });
    next.recentUses = next.recentUses.slice(-1000);
    return next;
  }

  function resetStyle(data) {
    const next = copy(data);
    next.styleWeights = {};
    return next;
  }

  /* Template bookmarks are independent of session favorites and style weights.
   * Locked templates can be bookmarked without granting capture access. */
  function toggleSavedTemplate(data, templateId) {
    if (!templateFor(templateId)) return data;
    const next = copy(data);
    const saved = Array.isArray(next.savedTemplates) ? next.savedTemplates : [];
    next.savedTemplates = saved.includes(templateId)
      ? saved.filter(function (id) { return id !== templateId; })
      : saved.concat([templateId]);
    return next;
  }

  /* Reopening an edit changes metadata only. No image bytes or preview URLs are
   * persisted, and the Keep/Favorite contribution ledger stays untouched. */
  function setSessionPreset(data, sessionId, details) {
    if (!details || typeof details !== 'object') return data;
    const index = data.sessions.findIndex(function (session) { return session.id === sessionId; });
    if (index < 0 || (details.presetId !== undefined && !validPreset(details.presetId))) return data;
    const next = copy(data);
    const session = next.sessions[index];
    if (details.presetId !== undefined) session.presetId = details.presetId;
    if (details.intensity !== undefined) session.intensity = boundedIntensity(details.intensity);
    ['exposure', 'contrast', 'warmth'].forEach(function (key) {
      if (details[key] !== undefined) session[key] = boundedEdit(details[key]);
    });
    return next;
  }

  function deleteLocalData(data) {
    const next = createData();
    const normalized = normalizeData(data);
    next.subscription = normalized.subscription;
    next.preferences = normalized.preferences;
    return next;
  }

  root.MuseModel = Object.freeze({
    CONFIG: CONFIG, CONTEXTS: CONTEXTS, LOOKS: LOOKS, MODES: MODES, TEMPLATES: TEMPLATES, PRESETS: PRESETS,
    createData: createData, getPlan: getPlan, freeAccess: freeAccess,
    sortTemplates: sortTemplates, selectTemplate: selectTemplate, recordUse: recordUse,
    commitSession: commitSession, toggleSavedTemplate: toggleSavedTemplate, setSessionPreset: setSessionPreset,
    resetStyle: resetStyle, deleteLocalData: deleteLocalData,
    isSafePhotoRef: isSafePhotoRef, load: load, save: save
  });
  root.PoseProModel = root.MuseModel;
})(typeof window !== 'undefined' ? window : globalThis);
