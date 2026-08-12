/* ==========================================================================
   LET ME DRESS YOUR AVATAR
   Hero = canvas image-sequence scrub. Gallery = poster first, clip on demand.
   ========================================================================== */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SMALL = window.matchMedia('(max-width: 760px)').matches;

  // Do NOT branch on event.pointerType inside a click handler. A click born
  // from a tap is a compatibility mouse event and several browsers report
  // pointerType as "mouse" (or ""), so a touch tap looks like a mouse click
  // and gets ignored. touchstart only ever fires on real touch input.
  var TOUCH = false;
  window.addEventListener('touchstart', function () { TOUCH = true; }, { once: true, passive: true });

  /* ----------------------------------------------------------- smooth -- */
  var lenis = null;
  if (!REDUCED && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
    window.lenis = lenis;   // handy for debugging and for anchor scrolling
  }

  /* ================================================== HERO FRAME SCRUB == */
  // 420 frames is ~20MB. On a phone, most of that is cellular data for a
  // sequence nobody can see at full temporal resolution anyway, so small
  // screens load every second frame and halve the download.
  var HERO_TOTAL = 420;
  var STRIDE = SMALL ? 2 : 1;
  var HERO_COUNT = Math.ceil(HERO_TOTAL / STRIDE);
  var heroPath = function (i) {
    return 'frames/hero/f_' + String(i * STRIDE + 1).padStart(4, '0') + '.jpg';
  };

  var hero = document.getElementById('hero');
  var canvas = document.getElementById('heroCanvas');
  var overlay = document.getElementById('heroOverlay');
  var cue = document.getElementById('heroCue');
  var loader = document.getElementById('heroLoader');
  var loaderBar = document.getElementById('heroLoaderBar');
  var ctx = canvas.getContext('2d', { alpha: false });

  var frames = new Array(HERO_COUNT);
  var ready = new Uint8Array(HERO_COUNT);
  var loadedCount = 0;
  var lastDrawn = -1;
  var curIndex = 0;

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (w === canvas.width && h === canvas.height) return false;
    canvas.width = w;
    canvas.height = h;
    lastDrawn = -1;
    return true;
  }

  // The stage can measure zero on first layout (hidden pane, late fonts).
  // Watch it so the canvas re-sizes and repaints itself instead of staying blank.
  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      if (sizeCanvas()) drawIndex(curIndex);
    }).observe(canvas);
  }

  // A 16:9 frame cover-fitted into a tall phone screen shows only about a
  // quarter of its width, which crops the studio hard and makes the wall
  // logo look cramped. Pull back on small screens and letterbox instead.
  var ZOOM = SMALL ? 0.72 : 1;

  function paint(img) {
    var cw = canvas.width, ch = canvas.height;
    var ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
    var w, h;
    if (ir > cr) { h = ch; w = ch * ir; }
    else { w = cw; h = cw / ir; }
    if (ZOOM !== 1) {
      w *= ZOOM; h *= ZOOM;
      ctx.fillStyle = '#D8D0C7';           // --back-2, matches the hero bed
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  // Nearest already-decoded frame, so scrubbing works mid-load.
  function nearestReady(i) {
    if (ready[i]) return i;
    for (var r = 1; r <= HERO_COUNT; r++) {
      if (i - r >= 0 && ready[i - r]) return i - r;
      if (i + r < HERO_COUNT && ready[i + r]) return i + r;
    }
    return -1;
  }

  function drawIndex(i) {
    var n = nearestReady(i);
    if (n < 0 || n === lastDrawn) return;
    paint(frames[n]);
    lastDrawn = n;
  }

  var imgRefs = new Array(HERO_COUNT);

  function load(i, done) {
    if (ready[i] || imgRefs[i]) { done && done(); return; }
    var img = new Image();
    img.decoding = 'async';
    imgRefs[i] = img;
    img.onload = function () {
      frames[i] = img; ready[i] = 1; loadedCount++;
      if (loaderBar) loaderBar.style.width = (loadedCount / HERO_COUNT * 100).toFixed(1) + '%';
      if (loadedCount >= HERO_COUNT && loader) loader.classList.add('done');
      if (lastDrawn < 0 || Math.abs(i - curIndex) <= 1) { drawIndex(curIndex); }
      done && done();
    };
    img.onerror = function () { loadedCount++; done && done(); };
    img.src = heroPath(i);
  }

  // Build a load queue: frame 0, then a coarse stride pass so the scrub is
  // usable almost immediately, then everything else in order.
  function buildQueue() {
    var q = [0], seen = { 0: 1 }, stride = 10, i;
    for (i = 0; i < HERO_COUNT; i += stride) if (!seen[i]) { seen[i] = 1; q.push(i); }
    for (i = 0; i < HERO_COUNT; i++) if (!seen[i]) { seen[i] = 1; q.push(i); }
    return q;
  }

  function runQueue(q, concurrency) {
    var next = 0, active = 0;
    function pump() {
      while (active < concurrency && next < q.length) {
        active++;
        load(q[next++], function () { active--; pump(); });
      }
    }
    pump();
  }

  function heroProgress() {
    var scrollable = hero.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return 0;
    return clamp(-hero.getBoundingClientRect().top / scrollable, 0, 1);
  }

  function updateHero() {
    var p = heroProgress();
    curIndex = Math.round(p * (HERO_COUNT - 1));
    drawIndex(curIndex);

    // lockup holds through the opening, then clears so the outfits read
    var o = 1 - clamp((p - 0.07) / 0.14, 0, 1);
    overlay.style.opacity = o;
    overlay.style.transform = 'translateY(' + (-18 * (1 - o)) + 'px)';
    if (cue) cue.style.opacity = 1 - clamp(p / 0.04, 0, 1);
  }

  /* ====================================================== PINNED PILLARS = */
  var pillarsSec = document.getElementById('pillars');
  var pillarEls = pillarsSec ? pillarsSec.querySelectorAll('.pillar') : [];
  var railEls = pillarsSec ? pillarsSec.querySelectorAll('.pillars__rail i') : [];
  var pillarCur = -1;

  function updatePillars() {
    if (!pillarsSec) return;
    var scrollable = pillarsSec.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    var p = clamp(-pillarsSec.getBoundingClientRect().top / scrollable, 0, 1);
    var idx = clamp(Math.floor(p * pillarEls.length), 0, pillarEls.length - 1);
    if (idx === pillarCur) return;
    pillarCur = idx;
    for (var i = 0; i < pillarEls.length; i++) pillarEls[i].classList.toggle('on', i === idx);
    for (var j = 0; j < railEls.length; j++) railEls[j].classList.toggle('on', j <= idx);
    dropReel(idx === pillarEls.length - 1);
  }

  // The Drop clip is fetched the first time that pillar comes up, never before.
  var reel = document.getElementById('dropReel');
  function dropReel(on) {
    if (!reel) return;
    var wrap = reel.parentNode;
    if (on) {
      if (!reel.src) {
        reel.src = reel.dataset.src;
        reel.load();
        // load() interrupts an immediate play(), so try again once there is data
        reel.addEventListener('canplay', function () { attempt(reel); }, { once: true });
      }
      attempt(reel);
      wrap.classList.add('playing');
    } else {
      reel.pause();
      wrap.classList.remove('playing');
    }
  }

  /* ============================================================ MARQUEE = */
  var MARQUEE_WORDS = ['Elegant', 'Casual', 'Swimwear', 'Gym Wear', 'Everyday',
    'Front and Back', '48 Hours', 'Tell Me the Occasion'];
  var marquees = [];

  function buildMarquees() {
    document.querySelectorAll('.marquee').forEach(function (m) {
      var track = m.querySelector('.marquee__track');
      var setHTML = MARQUEE_WORDS.map(function (w) { return '<span>' + w + '</span>'; }).join('');
      track.innerHTML = setHTML;
      var setW = track.scrollWidth;
      var copies = Math.max(2, Math.ceil((window.innerWidth * 2) / Math.max(setW, 1)) + 1);
      track.innerHTML = new Array(copies + 1).join(setHTML);
      marquees.push({ track: track, setW: setW, x: 0, dir: Number(m.dataset.dir) || 1 });
    });
  }

  function updateMarquees(dt) {
    for (var i = 0; i < marquees.length; i++) {
      var m = marquees[i];
      if (!m.setW) continue;
      m.x -= m.dir * 42 * dt;
      if (m.x <= -m.setW) m.x += m.setW;
      if (m.x > 0) m.x -= m.setW;
      m.track.style.transform = 'translate3d(' + m.x + 'px,0,0)';
    }
  }

  /* ============================================================ REVEALS = */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // Groups marked .stagger arrive in sequence rather than all at once.
  function stagger(group, step, cap) {
    var kids = group.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].style.setProperty('--d', Math.min(i, cap) * step + 'ms');
    }
  }
  document.querySelectorAll('.stagger').forEach(function (g) { stagger(g, 110, 8); });

  /* ========================================================== COUNT-UPS = */
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 4); };

  function runCount(el) {
    var target = Number(el.dataset.count), suffix = el.dataset.suffix || '';
    var dur = 1600, t0 = null;
    if (REDUCED) { el.textContent = target + suffix; return; }
    // No document.hidden special case. rAF callbacks simply queue while the
    // page is hidden and run when it comes back, which is what we want.
    function step(ts) {
      if (t0 === null) t0 = ts;
      var t = clamp((ts - t0) / dur, 0, 1);
      el.textContent = Math.round(easeOut(t) * target) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // The true value ships in the HTML so it survives with no JS. With JS,
  // prime it back to zero so the number genuinely counts up on scroll.
  var counters = document.querySelectorAll('[data-count]');
  if (!REDUCED) {
    counters.forEach(function (el) { el.textContent = '0' + (el.dataset.suffix || ''); });
  }

  // Driven from the scroll tick rather than an IntersectionObserver, so it
  // uses the exact same path as the hero scrub that is known to fire.
  var statsSec = document.getElementById('stats');
  var statsFired = false;
  function updateStats() {
    if (statsFired || !statsSec || !counters.length) return;
    var r = statsSec.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.88 && r.bottom > 0) {
      statsFired = true;
      counters.forEach(runCount);
    }
  }

  /* ============================================================ GALLERY = */
  var WORK = [
    { s: 'f1-golden-dress',      t: 'The Gala',            c: 'Elegant' },
    { s: 'm1-casual-1',          t: 'The Beach Bar',       c: 'Casual' },
    { s: 'f2-lime-swimsuit',     t: 'The Summer Shoot',    c: 'Swimwear' },
    { s: 'm1-grey-suit',         t: 'The Boardroom',       c: 'Elegant' },
    { s: 'f1-gym-1',             t: 'The Morning Session', c: 'Gym Wear' },
    { s: 'm2-swim-short',        t: 'The Coast Trip',      c: 'Swimwear' },
    { s: 'f2-purple-dress',      t: 'The Dinner Date',     c: 'Elegant' },
    { s: 'm1-gym',               t: 'The Heavy Lift',      c: 'Gym Wear' },
    { s: 'f1-orange-jumpsuit',   t: 'The City Day',        c: 'Casual' },
    { s: 'm2-green-suit-1',      t: 'The Wedding Guest',   c: 'Elegant' },
    { s: 'f1-cobalt-swimsuit',   t: 'The Pool Day',        c: 'Swimwear' },
    { s: 'm1-casual-2',          t: 'The Long Lunch',      c: 'Everyday' },
    { s: 'f2-red-outfit',        t: 'The Club Night',      c: 'Elegant' },
    { s: 'm1-swim-short',        t: 'The Poolside',        c: 'Swimwear' },
    { s: 'f2-gym',               t: 'The Training Day',    c: 'Gym Wear' },
    // m2-green-suit-2 (The Launch Party) is used as The Drop reel in the
    // pillars section, so it is deliberately not repeated here. 20 cards.
    { s: 'f1-purple-swimsuit',   t: 'The Beach Day',       c: 'Swimwear' },
    { s: 'f2-casual',            t: 'The Coffee Run',      c: 'Everyday' },
    { s: 'f1-navy-dress',        t: 'The Awards Night',    c: 'Elegant' },
    { s: 'f2-burgundy-swimsuit', t: 'The Island Escape',   c: 'Swimwear' },
    { s: 'f1-gym-2',             t: 'The Studio Class',    c: 'Gym Wear' }
  ];
  var TABS = ['All', 'Elegant', 'Casual', 'Swimwear', 'Gym Wear', 'Everyday'];

  var grid = document.getElementById('grid');
  var filters = document.getElementById('filters');
  var playing = null;

  function stop(card) {
    if (!card) return;
    card.dataset.want = '';
    var v = card.querySelector('video');
    if (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
    card.classList.remove('playing');
    if (playing === card) playing = null;
  }

  // Shared play helper. load() aborts an immediately-issued play(), so we also
  // retry once the element actually has data.
  function attempt(v) {
    v.muted = true;
    var pr = v.play();
    if (pr && pr.catch) pr.catch(function () {});
  }

  function play(card) {
    var v = card.querySelector('video');
    if (!v) return;
    card.dataset.want = '1';
    if (!v.src) {                                      // <-- the only place a clip is fetched
      v.src = v.dataset.src;
      v.load();
      // The class is added only once the clip is genuinely running, so a
      // blocked play can never hide the poster behind a dead black frame.
      v.addEventListener('playing', function () {
        if (card.dataset.want === '1') card.classList.add('playing');
      });
      v.addEventListener('canplay', function () {
        if (card.dataset.want === '1') attempt(v);
      });
    }
    attempt(v);
    if (!v.paused) card.classList.add('playing');
    if (playing && playing !== card) stop(playing);
    playing = card;
  }

  function buildGallery() {
    var frag = document.createDocumentFragment();
    WORK.forEach(function (w, idx) {
      var card = document.createElement('figure');
      card.className = 'card reveal';
      card.dataset.cat = w.c;
      card.innerHTML =
        '<img src="posters/' + w.s + '.jpg" alt="' + w.t + ' outfit" loading="lazy" decoding="async" width="720" height="1280">' +
        '<video data-src="clips/' + w.s + '.mp4" preload="none" muted loop playsinline disablepictureinpicture></video>' +
        '<span class="card__tap" aria-hidden="true"></span>' +
        '<figcaption class="card__meta"><span class="card__name">' + w.t + '</span>' +
        '<span class="card__tag">' + w.c + '</span></figcaption>';

      // Mouse drives hover. Touch drives tap-to-toggle. The TOUCH flag comes
      // from a real touchstart, which is the only reliable signal.
      card.addEventListener('pointerenter', function (e) {
        if (TOUCH || e.pointerType !== 'mouse') return;
        play(card);
      });
      card.addEventListener('pointerleave', function (e) {
        if (TOUCH || e.pointerType !== 'mouse') return;
        stop(card);
      });
      card.addEventListener('click', function () {
        if (!TOUCH) return;                             // mouse is handled by hover
        if (card.dataset.want === '1') stop(card); else play(card);
      });
      // stagger across each row so the grid arrives left to right
      card.style.setProperty('--d', (idx % 4) * 70 + 'ms');
      frag.appendChild(card);
      io.observe(card);
    });
    grid.classList.add('stagger');
    grid.appendChild(frag);
  }

  function buildFilters() {
    TABS.forEach(function (name, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        filters.querySelectorAll('button').forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        stop(playing);
        grid.querySelectorAll('.card').forEach(function (c) {
          c.classList.toggle('hide', name !== 'All' && c.dataset.cat !== name);
        });
      });
      filters.appendChild(b);
    });
  }

  /* =============================================================== BOOT = */
  var lastT = 0;
  function frame(time) {
    var t = time / 1000;
    var dt = lastT ? Math.min(t - lastT, 0.05) : 0;
    lastT = t;
    // One bad tick must never kill the scroll experience.
    try {
      if (lenis) lenis.raf(time);
      updateHero();
      updatePillars();
      updateStats();
      if (!REDUCED) updateMarquees(dt);
    } catch (e) {
      if (!frame.warned) { frame.warned = 1; console.error('[lmdya] frame error:', e); }
    }
    requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------- back to top -- */
  // Lands on the manifesto, not the very top. Returning into the hero would
  // drop the reader back inside 900vh of scrub they have already watched.
  var toTop = document.getElementById('toTop');
  if (toTop) {
    toTop.addEventListener('click', function () {
      var target = document.getElementById('manifesto');
      if (!target) return;
      if (lenis) lenis.scrollTo(target);
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Same update path as the rAF loop. Bound to real scroll events so the
  // hero still scrubs if Lenis is missing or rAF is throttled (hidden tab,
  // background window, reduced-power modes).
  function tick() {
    try { updateHero(); updatePillars(); updateStats(); } catch (e) {}
  }

  function init() {
    buildFilters();
    buildGallery();
    buildMarquees();
    sizeCanvas();
    runQueue(buildQueue(), 8);
    updatePillars();
    window.addEventListener('scroll', tick, { passive: true });
    if (lenis) lenis.on('scroll', tick);
    tick();
    requestAnimationFrame(frame);
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      sizeCanvas(); drawIndex(curIndex);
      marquees.length = 0;
      document.querySelectorAll('.marquee__track').forEach(function (t) { t.style.transform = ''; });
      buildMarquees();
    }, 160);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
