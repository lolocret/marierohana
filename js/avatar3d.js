// avatar3d.js: the fitting room in 3D. The avatar you chose (assets/models/avatar3d_f.glb or _m.glb, made in Blender)
// wears the garments of the outfit: each garment is a 3D shape that follows the body, with the picture of the product
// on its front (assets/fit3d/<slot>.jpg) and its average colour on its back. Drag to turn. Needs three.js (CDN).
// If three.js or WebGL is missing, the flat pictures of render.js stay (class no-3d on the stage).

(function () {
  window.App = window.App || {};

  const PLACES = { jacket: ['g_jacket', 'g_hood', 'g_zip'], tee: ['g_tee'], bottom: ['g_bottom'], belt: ['g_belt', 'g_decal'] };
  // the colour of the big zip of each hoodie (the cloth takes the average colour of the product)
  const ZIP = { 'bigzip-blackblack': '#6a6a70', 'bigzip-greygrey': '#6f6f74', 'bigzip-greyblue': '#62d6c8', 'bigzip-blackpink': '#ff5fa8', 'bigzip-redgreen': '#b3342a', 'bigzip-lilmarcel': '#6a6a70' };
  const models = {}; // 'f' / 'm' -> { scene, height }
  const textures = {};

  let renderer = null;
  let scene = null;
  let camera = null;
  let pivot = null;
  let current = '';
  let currentModel = null;
  let pending = null;
  let turn = 0;
  let speed = 0;
  let dragFrom = null;
  let running = false;

  function stage() {
    return document.querySelector('[data-fit-stage]');
  }

  function ok() {
    return typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined';
  }

  function fail() {
    stage().classList.add('no-3d');
  }

  function setup() {
    const canvas = document.querySelector('[data-avatar3d]');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.localClippingEnabled = true; // the hair is cut below the neck when a hood is worn
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.55);
    key.position.set(1.5, 2.5, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(-2, 1.5, -2);
    scene.add(rim);
    camera = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
    pivot = new THREE.Group();
    scene.add(pivot);

    const element = stage();
    // A drag that goes DOWN over the chest pulls the zip down (the jacket opens); a drag UP zips it again.
    // A sideways drag turns the avatar.
    let start = null;
    let mode = '';
    element.addEventListener('pointerdown', function (event) {
      dragFrom = event.clientX;
      start = { x: event.clientX, y: event.clientY };
      mode = '';
      speed = 0;
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', function (event) {
      if (dragFrom === null) return;
      if (!mode) {
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        const box = element.getBoundingClientRect();
        const rel = (start.y - box.top) / box.height;
        const vertical = Math.abs(dy) > Math.abs(dx) * 1.2 && App.state.get('outfit').jacket;
        mode = vertical && rel < 0.27 ? 'hood' : vertical && rel >= 0.27 && rel < 0.66 ? 'zip' : 'turn';
      }
      if (mode === 'hood') {        // a drag down over the head puts the hood down; a drag up puts it back
        const dyh = event.clientY - start.y;
        const o = App.state.get('outfit');
        if (dyh > 50 && o.hood !== 'down') { App.state.set('outfit', Object.assign({}, o, { hood: 'down' })); App.feedback.zipTick(); start = { x: event.clientX, y: event.clientY }; }
        else if (dyh < -50 && o.hood === 'down') { App.state.set('outfit', Object.assign({}, o, { hood: 'up' })); App.feedback.zipTick(); start = { x: event.clientX, y: event.clientY }; }
        return;
      }
      if (mode === 'zip') {
        const dy = event.clientY - start.y;
        const outfit = App.state.get('outfit');
        if (dy > 60 && !outfit.open) { App.state.set('outfit', Object.assign({}, outfit, { open: true })); App.feedback.zipTick(); start = { x: event.clientX, y: event.clientY }; }
        else if (dy < -60 && outfit.open) { App.state.set('outfit', Object.assign({}, outfit, { open: false })); App.feedback.zipTick(); start = { x: event.clientX, y: event.clientY }; }
        return;
      }
      const d = event.clientX - dragFrom;
      dragFrom = event.clientX;
      turn += d * 0.011;
      speed = d * 0.011;
    });
    // a tap on the head takes the cap off, or puts it back (the girl only)
    const end = function (event) {
      if (dragFrom !== null && mode === '' && start && event && event.type === 'pointerup' && current === 'f') {
        const box = element.getBoundingClientRect();
        if ((start.y - box.top) / box.height < 0.27 && Math.abs(event.clientX - start.x) < 8 && Math.abs(event.clientY - start.y) < 8) {
          const o = App.state.get('outfit');
          App.state.set('outfit', Object.assign({}, o, { cap: o.cap === false }));
          App.feedback.zipTick();
        }
      }
      dragFrom = null;
      mode = '';
    };
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
  }

  function resize() {
    const element = stage();
    const w = element.clientWidth;
    const h = element.clientHeight;
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    frame();
  }

  // the whole body in view, with a little air
  function frame() {
    if (!currentModel) return;
    const h = currentModel.height;
    const fov = camera.fov * Math.PI / 180;
    const byHeight = h * 0.66 / Math.tan(fov / 2);   // room above the head for the cap, and below the feet for the tips
    const byWidth = h * 0.3 / Math.tan(fov / 2) / camera.aspect;
    camera.position.set(0, h * 0.5, Math.max(byHeight, byWidth));
    camera.lookAt(0, h * 0.5, 0);
    camera.updateProjectionMatrix();
  }

  // The LILMARCEL hoodie is striped: a rainbow of soft bands on black, drawn here (the photo has no usable fabric area).
  let stripes = null;
  function stripeTexture() {
    if (stripes) return stripes;
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 512;
    const g = canvas.getContext('2d');
    const bands = ['#9bb82a', '#2f6fc0', '#7a4cc0', '#c23a58', '#d9772e', '#5fa03a'];
    g.fillStyle = '#0b0b0d';
    g.fillRect(0, 0, 8, 512);
    for (let y = 0, i = 0; y < 512; y += 32, i++) {
      g.fillStyle = bands[i % bands.length];
      g.fillRect(0, y + 8, 8, 14);
    }
    stripes = new THREE.CanvasTexture(canvas);
    stripes.wrapS = stripes.wrapT = THREE.ClampToEdgeWrapping;
    stripes.encoding = THREE.sRGBEncoding;
    stripes.anisotropy = 4;
    return stripes;
  }

  function texture(url, alpha) {
    if (!textures[url]) {
      const t = new THREE.TextureLoader().load(url, App.avatar3d.draw);
      t.flipY = false; // glTF UVs
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.encoding = THREE.sRGBEncoding;
      t.anisotropy = 4;
      textures[url] = t;
    }
    return textures[url];
  }

  const waiting = {}; // callbacks of a model that is still loading: one load per model
  function prepare(gltf, which) {
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const model = { root, height: box.max.y - box.min.y, parts: [] };
      root.position.y -= box.min.y;
      root.traverse(function (node) {
        if (!node.isMesh) return;
        node.frustumCulled = false;
        // the girl's hair is platinum blond (the picture of the hair is brown: tint it up)
        if (which === 'f' && node.name === 'long01') {
          node.material = node.material.clone();
          node.material.color.setRGB(3.6, 3.7, 4.0);
        }
        if (/^shoe_ruffle|^shoe_shaft|^u_|^cap/.test(node.name)) model.parts.push(node);
        if (/^g_/.test(node.name)) {
          node.material = node.material.clone();
          model.parts.push(node);
        }
      });
      return model;
  }

  function load(which, done) {
    if (models[which]) { done(models[which]); return; }
    if (waiting[which]) { waiting[which].push(done); return; }
    waiting[which] = [done];
    new THREE.GLTFLoader().load('assets/models/avatar3d_' + which + '.glb', function (gltf) {
      const model = prepare(gltf, which);
      models[which] = model;
      waiting[which].forEach(function (callback) { callback(model); });
      waiting[which] = null;
    }, undefined, function () { waiting[which] = null; fail(); });
  }

  // Real garments (made in Blender): assets/models/garments/<slot>_<f|m>.glb, in the same space as the avatar (feet at 0).
  const garments = {};
  function garment(slot, which, done) {
    const key = slot + '_' + which;
    if (App.data.GARMENT_FILES.indexOf(slot) === -1) { done(null); return; }
    if (garments[key]) { done(garments[key]); return; }
    new THREE.GLTFLoader().load('assets/models/garments/' + key + '.glb', function (gltf) {
      gltf.scene.traverse(function (node) { if (node.isMesh) node.frustumCulled = false; });
      garments[key] = gltf.scene;
      done(gltf.scene);
    }, undefined, function () { done(null); });
  }

  function partOf(node) {
    return Object.keys(PLACES).find(function (place) {
      return PLACES[place].some(function (prefix) { return node.name.indexOf(prefix) === 0; });
    });
  }

  // put the outfit on the model
  function dress(model, outfit) {
    const colors = App.data.FIT_COLORS;
    // real garments: hide the built-in shape of a place that has one, and add the file's model
    (model.real || []).forEach(function (o) { model.root.remove(o); });
    model.real = [];
    Object.keys(PLACES).forEach(function (place) {
      if (!outfit[place]) return;
      garment(outfit[place], current, function (g) {
        if (!g || outfit !== (pending && pending.outfit)) return;
        const copy = g.clone();
        model.root.add(copy);
        model.real.push(copy);
        model.parts.forEach(function (node) { if (partOf(node) === place) node.visible = false; });
        App.avatar3d.draw();
      });
    });
    // long hair tucked into the hood: nothing of it below the neck when a jacket is worn
    model.root.traverse(function (node) {
      if (node.isMesh && node.name === 'long01') {
        node.material.clippingPlanes = !outfit.jacket ? [] : (outfit.hood === 'down' ? [new THREE.Plane(new THREE.Vector3(0, 1, 0), -model.height * 0.8)] : [new THREE.Plane(new THREE.Vector3(0, 1, 0), -model.height * 0.8)]);
        node.material.needsUpdate = true;
      }
    });
    // the hood: up over the head, or down behind the neck (outfit.hood !== 'down'); up by default
    model.parts.forEach(function (node) {
      if (/^g_hood_up/.test(node.name)) { node.visible = !!outfit.jacket && outfit.hood !== 'down'; node.userData.skip = true; }
      if (node.name === 'g_hood') { node.userData.hoodDown = true; }
    });
    model.parts.forEach(function (node) {
      if (/^shoe_ruffle|^shoe_shaft/.test(node.name)) { node.visible = !outfit.bottom; return; }   // the trousers cover the collar of the sneakers
      // the underwear is hidden under what is worn over it (it would poke through the cloth)
      if (/^u_(briefs|boxer)/.test(node.name)) { node.visible = !outfit.bottom; return; }
      // the cap of the girl: worn, unless the hood is up over it
      if (/^cap/.test(node.name)) { node.visible = outfit.cap !== false && !(outfit.jacket && outfit.hood !== 'down'); return; }
      if (/^g_hood_cowl/.test(node.name) && outfit.open) { node.visible = false; return; }      // the neck wrap of the hood: not when the jacket is open
      if (/^g_jacket_(seam|pocket)/.test(node.name) && outfit.open) { node.visible = false; return; }
      if (/^u_bandeau/.test(node.name)) { node.visible = !((outfit.jacket && !outfit.open) || outfit.tee); return; }
      const place = partOf(node);
      const slot = outfit[place];
      node.visible = !!slot && !(node.userData.hoodDown && outfit.hood !== 'down');
      // two belts: one over trousers, one fitted on the hips for when no trousers are worn
      if (/^g_belt.*_n$/.test(node.name)) node.visible = !!slot && !outfit.bottom;
      else if (/^g_belt/.test(node.name)) node.visible = !!slot && !!outfit.bottom;
      if (node.userData.skip) { node.visible = !!slot && outfit.hood !== 'down'; }
      // the jacket: zipped, or open (outfit.open): two versions of the cloth and of the zip
      if (place === 'jacket' && !node.userData.skip) {
        const isOpenPart = /_open/.test(node.name);
        const isOnlyClosed = /^g_jacket(\d*)(_\d+)?$/.test(node.name) || /^g_zip(\d*)$/.test(node.name) || /^g_zip_pull(\d*)$/.test(node.name);
        if (isOpenPart) node.visible = !!slot && !!outfit.open;
        else if (isOnlyClosed) node.visible = !!slot && !outfit.open;
      }
      if (!slot) return;
      const mat = node.material;
      const front = /front/.test(mat.name);
      const isDecal = /^g_decal/.test(node.name);
      const isBelt = /^g_belt/.test(node.name);
      // the hood and the jacket win the depth test over the hair: the cloth passes in front of the hair
      if (/^g_hood/.test(node.name)) { mat.polygonOffset = true; mat.polygonOffsetFactor = -6; mat.polygonOffsetUnits = -6; }
      if (isDecal) {
        mat.map = texture('assets/fit/' + slot + '.png');
        mat.transparent = true;
        mat.alphaTest = 0.05;
        mat.color.set(0xffffff);
      } else if (/^g_zip_pull/.test(node.name)) {
        mat.map = texture('assets/zip/pull-' + slot.replace('bigzip-', '') + '.png');
        mat.transparent = true;
        mat.alphaTest = 0.3;
        mat.color.set(0xffffff);
      } else if (/^g_zip/.test(node.name)) {
        const tx = texture('assets/zip/teeth-' + slot.replace('bigzip-', '') + '.png');
        tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
        tx.anisotropy = 8;
        mat.map = tx;
        mat.color.set(0xffffff);
      } else if (/^g_belt_hole_gun/.test(node.name)) {
        mat.map = null;
        mat.color.set(colors[slot] || '#cccccc').multiplyScalar(0.78).convertSRGBToLinear();
      } else if (/^g_belt_hole/.test(node.name)) {
        mat.map = null;
        mat.color.set(colors[slot] || '#cccccc').multiplyScalar(0.45).convertSRGBToLinear();
      } else if (isBelt) {
        mat.map = null;
        mat.color.set(colors[slot] || '#cccccc').convertSRGBToLinear();
      } else if (slot === 'bigzip-lilmarcel' && /^g_jacket/.test(node.name) && !/pocket|cord|trim/.test(node.name + mat.name)) {
        mat.map = stripeTexture();
        mat.color.set(0xffffff);
      } else if (/^g_hood/.test(node.name) || !front || place !== 'tee') {
        mat.map = null;
        mat.color.set(colors[slot] || '#888888').convertSRGBToLinear();
      } else {
        mat.map = texture('assets/fit3d/' + slot + '.jpg');
        mat.color.set(0xffffff);
      }
      mat.roughness = 0.9;
      mat.metalness = 0;
      mat.side = THREE.DoubleSide;
      mat.needsUpdate = true;
    });
  }

  function loop() {
    if (!running) return;
    turn += speed;
    if (dragFrom === null) speed *= 0.94;
    if (pivot) pivot.rotation.y = turn;
    if (renderer && currentModel) renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }


  // ---- snapshots: a dressed avatar rendered off screen (its own copy of the model), for the lobby and the pictures to share
  const snapEnv = {};
  const snapCache = {};
  let snapQueue = Promise.resolve();

  function snapSetup() {
    if (snapEnv.renderer) return;
    const canvas = document.createElement('canvas');
    snapEnv.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    snapEnv.renderer.outputEncoding = THREE.sRGBEncoding;
    snapEnv.renderer.localClippingEnabled = true;
    snapEnv.scene = new THREE.Scene();
    snapEnv.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 0.6);
    key.position.set(1.5, 2.5, 3);
    snapEnv.scene.add(key);
    snapEnv.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
    snapEnv.models = {};
  }

  function snapModel(which) {
    return new Promise(function (resolve, reject) {
      if (snapEnv.models[which]) { resolve(snapEnv.models[which]); return; }
      new THREE.GLTFLoader().load('assets/models/avatar3d_' + which + '.glb', function (gltf) {
        snapEnv.models[which] = prepare(gltf, which);
        resolve(snapEnv.models[which]);
      }, undefined, reject);
    });
  }

  function textureReady(url) {
    const t = texture(url);
    return new Promise(function (resolve) {
      let tries = 0;
      (function wait() {
        if ((t.image && t.image.complete !== false && t.image.width) || tries++ > 40) resolve();
        else setTimeout(wait, 50);
      })();
    });
  }

  function snapshot(which, outfit, w, h) {
    const key = which + '|' + JSON.stringify(outfit) + '|' + w;
    if (snapCache[key]) return snapCache[key];
    snapCache[key] = snapQueue = snapQueue.then(function () {
      if (!ok()) return Promise.reject(new Error('no 3d'));
      snapSetup();
      return snapModel(which).then(function (model) {
        const waits = ['jacket', 'tee', 'bottom'].filter(function (p) { return outfit[p]; }).map(function (p) { return textureReady('assets/fit3d/' + outfit[p] + '.jpg'); });
        if (outfit.belt) waits.push(textureReady('assets/fit/' + outfit.belt + '.png'));
        return Promise.all(waits).then(function () {
          Object.keys(snapEnv.models).forEach(function (k) { snapEnv.scene.remove(snapEnv.models[k].root); });
          snapEnv.scene.add(model.root);
          const saved = current;
          current = which;
          dress(model, outfit);
          current = saved;
          const r = snapEnv.renderer;
          r.setSize(w, h, false);
          const cam = snapEnv.camera;
          cam.aspect = w / h;
          const fov = cam.fov * Math.PI / 180;
          const byHeight = model.height * 0.58 / Math.tan(fov / 2);
          const byWidth = model.height * 0.26 / Math.tan(fov / 2) / cam.aspect;
          cam.position.set(0, model.height * 0.52, Math.max(byHeight, byWidth));
          cam.lookAt(0, model.height * 0.52, 0);
          cam.updateProjectionMatrix();
          r.render(snapEnv.scene, cam);
          if (r.getContext().isContextLost && r.getContext().isContextLost()) return null;
          return r.domElement.toDataURL('image/png');
        });
      });
    }).catch(function () { delete snapCache[key]; return null; });
    return snapCache[key];
  }

  // Load everything in the background while the player is in the intro: the two avatars (the chosen one first),
  // then the pictures of the garments. The fitting room and the lobby then open without waiting.
  let preloaded = false;
  function preload() {
    if (!ok() || preloaded) return;
    preloaded = true;
    const first = App.state.get('player').avatar === 'm' ? 'm' : 'f';
    const second = first === 'm' ? 'f' : 'm';
    load(first, function () {
      load(second, function () {
        if (typeof THREE === 'undefined') return;
        App.data.CARDS.filter(function (c) { return c.group !== 'runway' && c.group !== 'special'; }).forEach(function (c) { texture('assets/fit3d/' + c.slot + '.jpg'); });
        setTimeout(App.community.warm, 400);
      });
    });
  }

  App.avatar3d = {
    __debug() { return currentModel ? currentModel.parts.map(function (n) { return n.name + ':' + n.visible; }) : []; },
    preload,
    snapshot,
    available: function () { return ok(); },
    // called each time the outfit or the avatar changes
    update(which, outfit) {
      if (!ok()) { fail(); return; }
      if (!renderer) {
        try { setup(); } catch (error) { fail(); return; }
      }
      stage().classList.remove('no-3d');
      pending = { which, outfit };
      load(which, function (model) {
        if (!pending) return;
        if (current !== pending.which) {
          if (currentModel) pivot.remove(currentModel.root);
          current = pending.which;
          currentModel = model;
          pivot.add(model.root);
          model.root.position.x = 0;
          resize();
        }
        dress(model, pending.outfit);
        App.avatar3d.draw();
      });
    },

    draw() {
      if (renderer && currentModel) {
        renderer.render(scene, camera);
        const label = document.querySelector('[data-loading3d]');
        if (label) label.hidden = true;
      }
    },

    show() {
      running = true;
      resize();
      requestAnimationFrame(loop);
    },

    hide() {
      running = false;
    }
  };

  window.addEventListener('resize', resize);
})();
