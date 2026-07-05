/* =========================================================================
   VERA Holdings — "The Unbroken Line" · world-class edition (v2)
   intro / cursor / reveal / inertial thread / magnetic / scramble /
   marquee / modal / 360° tee (Three.js CDN + graceful fallback)
   すべて try/catch と機能検出で保護。JS落ちても本文は表示される（html.js ガード）。
   ========================================================================= */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = matchMedia("(pointer: fine)").matches;
  var TOUCH = matchMedia("(pointer: coarse)").matches || ("ontouchstart" in window);
  if (TOUCH || !FINE) root.classList.add("touch");
  var SVGNS = "http://www.w3.org/2000/svg";
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var raf = window.requestAnimationFrame.bind(window);

  /* ---------------------------------------------------------------- PHOTOS */
  function initPhotos() {
    var P = window.VERA_PHOTOS || {};
    // 省データ / 省モーション環境では重い写真の一斉DLを避け、hero だけ読む（背景グラデはフォールバックで残る）
    var SAVE = REDUCE || (navigator.connection && navigator.connection.saveData);
    $$(".sunk[data-photo]").forEach(function (el) {
      var key = el.getAttribute("data-photo");
      // hero は静的<img>でLCP最適化済み → 背景注入をスキップ
      if (el.querySelector("img")) return;
      if (SAVE && key !== "hero" && key !== "story") return;
      var url = P[key];
      if (url) { var img = new Image(); img.onload = function () { el.style.backgroundImage = "url('" + url + "')"; }; img.src = url; }
    });
  }

  /* ------------------------------------------------------------ REVEAL / IO */
  function revealEl(el) {
    el.classList.add("is-in");
    if (el.hasAttribute("data-scramble")) scramble(el);
    // 信念ラベル等、子孫に置かれた data-scramble も reveal時に発火させる
    $$("[data-scramble]", el).forEach(function (c) { scramble(c); });
    if (el.matches(".sunk")) el.classList.add("shown");
    // アニメ完了後に will-change を解放してコンポジタメモリを返す（低スペック端末のジャンク回避）
    el.addEventListener("transitionend", function h() { el.style.willChange = "auto"; el.removeEventListener("transitionend", h); });
  }
  function initReveal() {
    var targets = $$(".reveal, .line, .sunk").filter(function (el) { return !el.closest("#r-hero"); });
    // sunk backgrounds reveal a touch earlier for the mask feel
    if (!("IntersectionObserver" in window)) { targets.forEach(revealEl); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { revealEl(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -11% 0px", threshold: 0.06 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------------------- SCRAMBLE */
  var GLY = "一二三守縛選本源誠活0123・—".split("");
  function scramble(el) {
    if (REDUCE) return;
    var full = el.getAttribute("data-final") || el.textContent;
    el.setAttribute("data-final", full);
    var chars = full.split(""), start = performance.now(), dur = 760;
    function tick(now) {
      var p = clamp((now - start) / dur, 0, 1);
      var lock = Math.floor(p * chars.length);
      var out = "";
      for (var i = 0; i < chars.length; i++) {
        if (chars[i] === " " || chars[i] === "　") { out += chars[i]; continue; }
        out += i < lock ? chars[i] : GLY[(Math.floor(now / 72) + i) % GLY.length];
      }
      el.textContent = out;
      if (p < 1) raf(tick); else el.textContent = full;
    }
    raf(tick);
  }

  /* --------------------------------------------------------------- CURSOR */
  function initCursor() {
    if (root.classList.contains("touch")) return;
    var cur = $("#cursor"), dot = $("#cursor-dot"), ring = $("#cursor-ring"), label = $("#cursor-label");
    if (!cur) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    addEventListener("mousedown", function () { cur.classList.add("down"); });
    addEventListener("mouseup", function () { cur.classList.remove("down"); });
    var LAB = { view: "見る", drag: "回す", soon: "準備中", read: "読む" };
    $$("[data-cursor]").forEach(function (el) {
      el.addEventListener("mouseenter", function () {
        var k = el.getAttribute("data-cursor");
        cur.className = "cursor on-" + k + (LAB[k] ? " label" : "");
        if (label) label.textContent = LAB[k] || "";
      });
      el.addEventListener("mouseleave", function () { cur.className = "cursor"; if (label) label.textContent = ""; });
    });
    function loop() { rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
      dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      // 速度スカッシュ&ストレッチ：速く振るほど進行方向に伸びる。ラベル/hover/down中は文字と拡大円が傾くため素通し
      var st = "";
      if (!REDUCE && cur.className === "cursor") {
        var dx = mx - rx, dy = my - ry, sp = Math.min(Math.sqrt(dx * dx + dy * dy) / 150, 1);
        if (sp > 0.04) st = " rotate(" + Math.atan2(dy, dx).toFixed(3) + "rad) scale(" + (1 + sp * 0.35).toFixed(3) + "," + (1 - sp * 0.18).toFixed(3) + ")";
      }
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)" + st; raf(loop); }
    loop();
  }

  /* --------------------------------------------------------------- MAGNETIC */
  function initMagnetic() {
    if (REDUCE || root.classList.contains("touch")) return;
    $$(".magnetic").forEach(function (el) {
      var inner = el.querySelector(".mag-in") || el.firstElementChild || el;
      // target のみ更新→1本の rAF バネで追従。吸着に慣性が乗り、離脱も同じバネで自然減衰（往復してもスナップしない）
      var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
      function tickSpring() {
        cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
        el.style.transform = "translate(" + cx + "px," + cy + "px)";
        inner.style.transform = "translate(" + (cx * 0.55) + "px," + (cy * 0.55) + "px)";
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1 || tx || ty) { raf(tickSpring); }
        else { running = false; el.style.transform = inner.style.transform = ""; }
      }
      function kick() { if (!running) { running = true; raf(tickSpring); } }
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * 0.22;
        ty = (e.clientY - r.top - r.height / 2) * 0.22;
        kick();
      });
      el.addEventListener("mouseleave", function () { tx = 0; ty = 0; kick(); });
    });
  }

  /* --------------------------------------------------------------- MARQUEE */
  function initMarquee() {
    var row = $("#marquee-row"); if (!row) return;
    row.innerHTML += row.innerHTML; // duplicate for seamless -50% loop
    if (REDUCE) { row.style.animation = "none"; return; }
    // duration差し替えのジャンプを避け、Web Animations の playbackRate で“停止でなく減速”を滑らかに
    if (row.animate) {
      row.style.animation = "none";
      var anim = row.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }],
        { duration: 46000, iterations: Infinity, easing: "linear" }
      );
      var wrap = $("#marquee");
      if (wrap && anim.updatePlaybackRate) {
        wrap.addEventListener("mouseenter", function () { anim.updatePlaybackRate(0.42); });
        wrap.addEventListener("mouseleave", function () { anim.updatePlaybackRate(1); });
      }
    }
  }

  /* ------------------------------------------- MARQUEE SKEW (scroll-linked) */
  function initMarqueeSkew() {
    if (REDUCE) return;
    var wrap = $("#marquee"); if (!wrap) return;
    // 行(#marquee-row)のtransformはWAAPIが専有しているため、skewは外側の帯に掛ける（衝突回避）
    var lastY = pageYOffset, velT = 0, skew = 0, running = false, last = performance.now();
    function onScroll() {
      var y = pageYOffset;
      velT = clamp((y - lastY) * 0.18, -7, 7); // 速いほどしなる。±7degで頭打ち
      lastY = y;
      wake();
    }
    function tick(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      // Δt正規化（threadと同じ流儀）：120Hz/60Hzでしなり量を揃える
      var k = 1 - Math.pow(1 - 0.12, dt * 60);
      skew += (velT - skew) * k;
      velT *= Math.pow(0.8, dt * 60); // 入力が止まれば目標も0へ＝しなりが自然に戻る
      wrap.style.transform = "skewX(" + (-skew).toFixed(3) + "deg)";
      if (Math.abs(skew) > 0.02 || Math.abs(velT) > 0.02) { raf(tick); }
      else { wrap.style.transform = ""; running = false; }
    }
    function wake() { if (!running) { running = true; last = performance.now(); raf(tick); } }
    onScrollHooks.push(onScroll);
  }

  /* --------------------------------------------------------- NAV / IDX / CAP */
  function initNav() {
    var nav = $("#rnav"), idxEl = $("#rnav-idx"), capEl = $("#rnav-cap");
    var toggle = $("#rnav-toggle"), menu = $("#rnav-menu");
    var sections = $$("section[data-idx]");
    var MOBILE = matchMedia("(max-width:820px)");
    function syncInert() {
      // モバイル閉時のみ画面外メニューをタブ順から外す（デスクトップは常時可視なので触らない）
      if (menu) menu.inert = MOBILE.matches && !doc.body.classList.contains("r-menu");
    }
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = doc.body.classList.toggle("r-menu");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        syncInert();
      });
      menu.addEventListener("click", function (e) { if (e.target.tagName === "A") { doc.body.classList.remove("r-menu"); toggle.setAttribute("aria-expanded", "false"); syncInert(); } });
      if (MOBILE.addEventListener) MOBILE.addEventListener("change", syncInert);
      syncInert();
    }
    var cur = null;
    function onScroll() {
      var y = pageYOffset;
      nav.classList.toggle("scrolled", y > 40);
      // dark section under the nav?
      var navY = y + 40, onDark = false, active = sections[0];
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        if (s.offsetTop <= navY && s.offsetTop + s.offsetHeight > navY) onDark = s.classList.contains("dark");
        if (s.offsetTop <= y + innerHeight * 0.35) active = s;
      }
      nav.classList.toggle("on-dark", onDark);
      if (active && active !== cur) { cur = active; if (idxEl) idxEl.textContent = active.getAttribute("data-idx"); if (capEl) capEl.textContent = active.getAttribute("data-cap"); }
    }
    onScrollHooks.push(onScroll); onScroll();
  }

  /* ---------------------------------------------------------------- THREAD */
  function initThread() {
    var thread = $("#thread"), track = $("#thread-track"), path = $("#thread-path"), nodesG = $("#thread-nodes"), main = $("#r-main");
    if (!thread || !path || !main) return;
    var sections = $$("section[data-idx]");
    var pathLen = 0, nodeEls = [], target = 0, curOff = 0, vEMA = 0, tip = null;
    function build() {
      var W = main.offsetWidth, H = main.offsetHeight;
      thread.setAttribute("viewBox", "0 0 " + W + " " + H);
      thread.style.width = W + "px"; thread.style.height = H + "px";
      var pts = [];
      sections.forEach(function (s, i) {
        // ショーケース章だけ節を右端へ逃がす（3D商品の上に節が乗って汚れに見えるため）
        var fx = s.id === "r-showcase" ? 0.88 : (i % 2 === 0 ? 0.30 : 0.70);
        pts.push({ x: W * fx, y: s.offsetTop + Math.min(s.offsetHeight * 0.5, 230) });
      });
      if (!pts.length) return;
      pts.unshift({ x: pts[0].x, y: 0 }); var last = pts[pts.length - 1]; pts.push({ x: last.x, y: H });
      var d = "M " + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
        var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        d += " C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
      }
      track.setAttribute("d", d); path.setAttribute("d", d);
      pathLen = path.getTotalLength(); path.style.strokeDasharray = pathLen;
      nodesG.textContent = ""; nodeEls = [];
      for (var k = 1; k < pts.length - 1; k++) {
        var ring = doc.createElementNS(SVGNS, "circle"); ring.setAttribute("cx", pts[k].x); ring.setAttribute("cy", pts[k].y); ring.setAttribute("r", 5.5); ring.setAttribute("class", "node-ring");
        var nd = doc.createElementNS(SVGNS, "circle"); nd.setAttribute("cx", pts[k].x); nd.setAttribute("cy", pts[k].y); nd.setAttribute("r", 4.5); nd.setAttribute("class", "node");
        // 再build(fonts確定/load)時、既に通過済みの節で“コツッ”を一斉再発火させないよう到達状態を種付け
        nodesG.appendChild(ring); nodesG.appendChild(nd); nodeEls.push({ node: nd, ring: ring, y: pts[k].y, _was: (pageYOffset + innerHeight * 0.62) >= pts[k].y });
      }
      // 筆先：線の先端を走る一点。nodesGはbuild毎にクリアされるためここで作り直す（節より後に追加＝最前面）
      tip = doc.createElementNS(SVGNS, "circle");
      tip.setAttribute("r", 3.2); tip.setAttribute("class", "tip");
      nodesG.appendChild(tip);
      compute();
    }
    function compute() { var H = main.offsetHeight; target = clamp((pageYOffset + innerHeight * 0.5) / H, 0, 1); }
    var last = performance.now();
    function frame(now) {
      if (typeof now !== "number") now = performance.now();
      if (doc.hidden) { last = now; raf(frame); return; }
      // Δt(時間)正規化：120Hz/60Hz どちらでも“線の遅れ（呼吸）”を同量に保つ（tee と同じ手法）
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (pathLen) {
        var prev = curOff;
        // 指数減衰の時間版：1-(1-k)^(dt*60) で rAF回数依存を外す
        var k = REDUCE ? 1 : (1 - Math.pow(1 - 0.08, dt * 60));
        curOff += (target - curOff) * k;
        path.style.strokeDashoffset = pathLen * (1 - curOff);
        // 速度を指数移動平均で持続させ“たわみ”を通常スクロールでも視認可能に。速いほど細く張り、遅いほど太く沈む
        var kv = 1 - Math.pow(1 - 0.2, dt * 60);
        vEMA += (Math.abs(curOff - prev) - vEMA) * kv;
        path.style.strokeWidth = (3.0 - Math.min(vEMA * 900, 1.4)).toFixed(2);
        // 筆先：先端座標へ追従。速いほど痩せて張り、止まると墨だまりに戻る（strokeWidthと同じvEMAを共有）
        if (tip) {
          var tp = path.getPointAtLength(pathLen * curOff);
          tip.setAttribute("cx", tp.x.toFixed(1)); tip.setAttribute("cy", tp.y.toFixed(1));
          tip.setAttribute("r", (3.4 - Math.min(vEMA * 700, 1.2)).toFixed(2));
        }
        var reach = pageYOffset + innerHeight * 0.62;
        nodeEls.forEach(function (n) {
          var on = reach >= n.y;
          // 到達の立ち上がりエッジ（false→true）でだけ“コツッ”を一撃。reduced-motion では焚かない
          if (on && !n._was && !REDUCE) {
            n.ring.classList.add("hit");
            (function (ring) { setTimeout(function () { ring.classList.remove("hit"); }, 500); })(n.ring);
          }
          n._was = on;
          n.node.classList.toggle("on", on); n.ring.classList.toggle("on", on);
        });
      }
      raf(frame);
    }
    onScrollHooks.push(compute);
    onResizeHooks.push(build);
    build(); frame();
    // rebuild after fonts/layout settle & images load
    setTimeout(build, 400); addEventListener("load", build);
  }

  /* --------------------------------------------------------------- MODALS */
  function initModals() {
    var modal = $("#modal"), body = $("#modal-body"), panel = $("#modal-panel");
    var lastFocus = null;
    function open(id) {
      var tpl = $("#tpl-" + id); if (!tpl || !modal) return;
      body.innerHTML = ""; body.appendChild(tpl.content.cloneNode(true));
      modal.classList.add("open"); modal.setAttribute("aria-hidden", "false");
      lastFocus = doc.activeElement; var x = $(".modal__x", modal); if (x) x.focus();
      doc.body.style.overflow = "hidden";
    }
    function close() {
      if (!modal.classList.contains("open")) return;
      modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true");
      doc.body.style.overflow = ""; if (lastFocus) lastFocus.focus();
    }
    $$("[data-modal]").forEach(function (el) {
      el.addEventListener("click", function () { open(el.getAttribute("data-modal")); });
      // role="button"+tabindex の起点はキーボード（Enter/Space）でも開ける（WCAG 2.1.1 / 4.1.2）
      if (el.getAttribute("role") === "button") {
        el.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); open(el.getAttribute("data-modal")); }
        });
      }
    });
    if (modal) { $$("[data-close]", modal).forEach(function (b) { b.addEventListener("click", close); }); }
    addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && modal.classList.contains("open")) {
        var f = $$("button, a[href]", panel); if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // 続きを読む
    $$("[data-more]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var box = $("#" + btn.getAttribute("data-more")); if (!box) return;
        var open = btn.classList.toggle("open"); box.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.querySelector("span").textContent = open ? "閉じる" : "続きを読む";
        if (open) $$(".reveal, .line", box).forEach(revealEl);
      });
    });
  }

  /* ---------------------------------------------------------------- TO TOP */
  function initToTop() { var b = $("#to-top"); if (b) b.addEventListener("click", function () { scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }); }); }

  /* --------------------------------------------------------- INTRO TIMELINE */
  function runIntro(done) {
    var intro = $("#intro"), veil = $("#veil"), line = $("#intro-line"), count = $("#intro-count"), meta = $(".intro__meta"), mark = $(".intro__mark");
    function finishHero() {
      $$("#r-hero .line, #r-hero .hero-r").forEach(function (el) { el.classList.add("is-in"); if (el.hasAttribute("data-scramble")) scramble(el); });
      $$("#r-hero .sunk").forEach(function (el) { el.classList.add("shown"); });
      var nav = $("#rnav"); if (nav) nav.classList.add("ready");
      if (typeof done === "function") done();
    }
    if (REDUCE || !intro) {
      if (intro) intro.style.display = "none"; if (veil) veil.style.display = "none"; finishHero(); return;
    }
    // failsafe: never trap the user behind the veil.
    // 演出の実総尺 ≈ hold300 + dur1050 + outro遅延380 + veil lift1100 ≈ 2830ms。
    // 不変条件：failsafe(4.2s) > 演出総尺+余裕。遅延端末でも線描画前に暗幕を剥がさない（因果の逆転を防ぐ）。正常完了時は outro() で clearTimeout 済。
    var failed = setTimeout(function () { try { intro.remove(); veil.classList.add("done"); } catch (e) {} finishHero(); }, 4200);
    try {
      mark.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 700, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
      setTimeout(function () { meta.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" }); }, 260);
      var start = 0, dur = 1050;
      function tick(now) {
        if (!start) start = now;
        var p = clamp((now - start) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
        line.style.transform = "scaleX(" + e + ")";
        count.textContent = ("00" + Math.round(e * 100)).slice(-3);
        if (p < 1) raf(tick); else outro();
      }
      function outro() {
        clearTimeout(failed);
        intro.classList.add("gone");
        setTimeout(function () {
          veil.classList.add("lift");
          finishHero();
          setTimeout(function () { try { intro.remove(); } catch (e) {} veil.classList.add("done"); }, 1100);
        }, 380);
      }
      // hold a beat of silence before the line draws（LCPを縛らないよう短縮）
      setTimeout(function () { raf(tick); }, 300);
    } catch (e) { clearTimeout(failed); try { intro.remove(); veil.classList.add("done"); } catch (e2) {} finishHero(); }
  }

  /* ------------------------------------------------------------ 360° TEE */
  function initTee() {
    var stage = $("#tee-stage"); if (!stage) return;
    var swatches = $$("#tee-swatches .sw");
    var fallbackBody = $(".ts-body");
    var labelEl = $("#tee-label");
    var RED = "#c5201d";
    var current = "#f2efe8";
    // 赤は「布を塗らず、線と点だけ」。赤スウォッチでは布色を変えない＝全面赤化を物理的に封じる（不変条件の死守）
    function paintFallback(c) { if (fallbackBody && c !== RED) fallbackBody.setAttribute("fill", c); }
    // swatch wiring works with or without 3D
    var setFabric = null;
    swatches.forEach(function (b) {
      b.addEventListener("click", function () {
        swatches.forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active");
        current = b.getAttribute("data-color"); paintFallback(current); if (setFabric) setFabric(current);
        // 静かな美術館キャプション：色名の銘板をそっと差し替える
        if (labelEl) labelEl.textContent = b.getAttribute("aria-label") || "";
      });
    });
    // reduced-motion / save-data では Three.js を建てず静止SVGへ縮退（rAF常時描画とギガ級モジュールDLを回避）
    var SAVE = REDUCE || (navigator.connection && navigator.connection.saveData);
    // build 3D only when the section is near, to save work
    var built = false;
    function build() {
      if (built) return; built = true;
      if (SAVE) return; // 静止SVGフォールバックがそのまま残る（色替えは build 前配線で生きる）
      import("https://unpkg.com/three@0.160.0/build/three.module.min.js").then(function (THREE) {
        var w = stage.clientWidth || 480, h = stage.clientHeight || 480;
        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h);
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        stage.insertBefore(renderer.domElement, stage.firstChild); stage.classList.add("has3d");
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100); camera.position.set(0, -0.2, 7.9); camera.lookAt(0, -0.3, 0);
        // lights (navy/white only — no gold)
        scene.add(new THREE.AmbientLight(0x24406e, 0.55));
        var key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(3, 5, 4);
        key.castShadow = true; key.shadow.mapSize.set(512, 512);
        key.shadow.camera.near = 1; key.shadow.camera.far = 20;
        key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
        scene.add(key);
        var fill = new THREE.DirectionalLight(0x9fb3d8, 0.55); fill.position.set(-4, 1.5, 2); scene.add(fill);
        var rim = new THREE.PointLight(0x2a5690, 22, 40); rim.position.set(-2, 2, -4); scene.add(rim);
        // ===== 木製マネキン（ドレスフォーム：首〜膝上）＋ オーバーサイズ半袖Tシャツ =====
        function lp(arr){ return arr.map(function (p) { return new THREE.Vector2(p[0], p[1]); }); }
        var woodMat = new THREE.MeshStandardMaterial({ color: 0xa9743e, roughness: 0.58, metalness: 0.05 });
        // 首→肩→胸→ウエスト→腰→太もも（膝上でカット）の回転体
        var form = new THREE.Mesh(new THREE.LatheGeometry(lp([
          [0.001, -2.02], [0.5, -2.0], [0.56, -1.5], [0.62, -0.8], [0.6, -0.25], [0.46, 0.4],
          [0.52, 0.95], [0.62, 1.35], [0.66, 1.55], [0.5, 1.72], [0.17, 1.9], [0.17, 2.12], [0.001, 2.22]
        ]), 48), woodMat);
        form.castShadow = true;
        var neckKnob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), woodMat); neckKnob.position.y = 2.14; neckKnob.castShadow = true;
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.72, 20), woodMat); pole.position.y = -2.36; pole.castShadow = true;
        // Tシャツ布（フォームより一回り大きい＝オーバーサイズ）— スウォッチで色替え
        var startColor = current === RED ? "#f2efe8" : current;
        var fabric = new THREE.MeshStandardMaterial({ color: new THREE.Color(startColor), roughness: 0.96, metalness: 0.0, side: THREE.DoubleSide });
        setFabric = function (c) {
          if (c === RED) return;
          fabric.color.set(c);
          var lum = (parseInt(c.slice(1, 3), 16) * 0.299 + parseInt(c.slice(3, 5), 16) * 0.587 + parseInt(c.slice(5, 7), 16) * 0.114) / 255;
          rim.intensity = 22 + (1 - lum) * 30;
        };
        setFabric(current);
        var tee = new THREE.Mesh(new THREE.LatheGeometry(lp([
          [0.26, 1.78], [0.58, 1.64], [0.76, 1.42], [0.83, 1.05], [0.83, 0.4], [0.81, -0.3], [0.83, -0.82], [0.8, -0.86]
        ]), 48), fabric);
        tee.castShadow = true;
        var collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 12, 44), fabric); collar.position.y = 1.79; collar.rotation.x = Math.PI / 2; collar.castShadow = true;
        function sleeve(sign) {
          var sl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.37, 0.82, 20, 1, true), fabric);
          sl.castShadow = true; sl.position.set(sign * 0.86, 1.28, 0); sl.rotation.z = sign * 1.18; // ドロップショルダーで外・少し下へ
          return sl;
        }
        var turn = new THREE.Group();
        turn.add(form, neckKnob, pole, tee, collar, sleeve(-1), sleeve(1));
        // 左胸の小さなワッペン（現行の約1/5サイズ・VERA 2色マーク・紺の縁取り）
        try {
          var cv = document.createElement("canvas"); cv.width = cv.height = 256;
          var g = cv.getContext("2d");
          g.fillStyle = "#efe9db"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
          g.strokeStyle = "#0f2546"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 114, 0, Math.PI * 2); g.stroke();
          var patchTex = new THREE.CanvasTexture(cv); patchTex.anisotropy = 4;
          var patch = new THREE.Mesh(new THREE.CircleGeometry(0.11, 40),
            new THREE.MeshStandardMaterial({ map: patchTex, roughness: 0.85, metalness: 0.0, transparent: true }));
          var pAng = 0.4, pR = 0.86; // 着る人の左胸（＝正面から見て右）に、布の球面へ沿わせて配置
          patch.position.set(Math.sin(pAng) * pR, 1.2, Math.cos(pAng) * pR + 0.01);
          patch.rotation.y = pAng; patch.renderOrder = 2; patch.castShadow = false; turn.add(patch);
          var mk = new Image(); mk.crossOrigin = "anonymous";
          mk.onload = function () { try { g.drawImage(mk, 128 - 80, 128 - 79, 160, 158); patchTex.needsUpdate = true; if (typeof wake === "function") wake(); } catch (e2) {} };
          mk.src = "assets/img/favicon.svg";
        } catch (e) { /* file:// で CanvasTexture 不可ならワッペン無しで表示 */ }
        // 陳列台
        var disc = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, 0.14, 72), new THREE.MeshStandardMaterial({ color: 0x0b1c38, roughness: 0.6, metalness: 0.1 }));
        disc.position.y = -2.72; disc.receiveShadow = true; turn.add(disc);
        scene.add(turn);
        // interaction
        var dragging = false, lastX = 0, vel = 0;
        function down(e) { dragging = true; lastX = (e.touches ? e.touches[0].clientX : e.clientX); vel = 0; stage.classList.add("grabbing"); wake(); $("#cursor") && $("#cursor").classList.add("down"); }
        function move(e) { if (!dragging) return; var x = (e.touches ? e.touches[0].clientX : e.clientX); var dx = x - lastX; turn.rotation.y += dx * 0.0085; vel = dx * 0.0085; lastX = x; wake(); }
        function up() { dragging = false; stage.classList.remove("grabbing"); $("#cursor") && $("#cursor").classList.remove("down"); }
        stage.addEventListener("mousedown", down); addEventListener("mousemove", move); addEventListener("mouseup", up);
        stage.addEventListener("touchstart", down, { passive: true }); stage.addEventListener("touchmove", move, { passive: true }); addEventListener("touchend", up);
        function resize() { var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); }
        onResizeHooks.push(resize);
        // 静止した陳列台：自動では回さない。初回だけ「回せる」を伝える一往復。
        turn.rotation.y = -0.28;
        var introT = 0, introDone = true;
        // 慣性・イントロ往復を Δt(時間)基準に正規化：120Hz でも60Hz でも“止まり方”が揃う
        var last = performance.now(), running2 = false;
        // 正面（胸の一本線が見える向き）への最短角。ドラッグ解放後、静かに顔を上げる
        function faceDelta() {
          var f = turn.rotation.y % (Math.PI * 2);
          if (f > Math.PI) f -= Math.PI * 2; else if (f < -Math.PI) f += Math.PI * 2;
          return f; // 目標=0（正面）への符号付き差分
        }
        function loop(now) {
          var dt = Math.min((now - last) / 1000, 0.05); last = now;
          if (!dragging) { turn.rotation.y += vel; vel *= Math.pow(0.94, dt * 60); }
          if (!introDone && !dragging && Math.abs(vel) < 0.0002) {
            introT += dt;
            if (introT < 1.4) { turn.rotation.y = -0.35 + Math.sin(introT / 1.4 * Math.PI) * 0.21; }
            else { introDone = true; }
          }
          // 慣性が尽きたら正面へ ease-back（自動回転ではなく“手を止めたら顔を上げる”静かな挙動）
          var settling = false;
          if (introDone && !dragging && Math.abs(vel) < 0.0009) {
            var f = faceDelta();
            if (Math.abs(f) > 0.01) { turn.rotation.y -= f * Math.min(dt * 2.2, 1); settling = true; }
          }
          renderer.render(scene, camera);
          // 変化が無ければ描画を止める。ドラッグ/フリック/イントロ/正面復帰中は継続
          if (dragging || Math.abs(vel) > 0.0002 || !introDone || settling) { raf(loop); }
          else { running2 = false; }
        }
        function wake() { if (!running2) { running2 = true; last = performance.now(); raf(loop); } }
        wake();
      }).catch(function () { /* offline / blocked → static SVG fallback stays */ });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (ents) { ents.forEach(function (e) { if (e.isIntersecting) { build(); io.disconnect(); } }); }, { rootMargin: "200px" });
      io.observe(stage);
    } else { build(); }
  }

  /* ----------------------------------------------------- global scroll pump */
  var onScrollHooks = [], onResizeHooks = [], ticking = false;
  function pump() { onScrollHooks.forEach(function (f) { try { f(); } catch (e) {} }); ticking = false; }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; raf(pump); } }, { passive: true });
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { onResizeHooks.forEach(function (f) { try { f(); } catch (e) {} }); pump(); }, 180); });

  /* ------------------------------------------------------------------ BOOT */
  /* ------------------------------------------------------ SHOWCASE STUDIO */
  function initStudio() {
    var studio = $("#studio"); if (!studio) return;
    var SIZES = {
      S:  { bodyLength: 66, bodyWidth: 52.5, shoulderWidth: 51,   sleeveLength: 51 },
      M:  { bodyLength: 69, bodyWidth: 55.5, shoulderWidth: 52.5, sleeveLength: 53 },
      L:  { bodyLength: 72, bodyWidth: 58.5, shoulderWidth: 54,   sleeveLength: 55 },
      XL: { bodyLength: 75, bodyWidth: 62.5, shoulderWidth: 56,   sleeveLength: 57 }
    };
    window.VERA_SIZES = window.VERA_SIZES || SIZES; // 研究の確定値が来たら差し替え可
    function setActive(sel, el) { $$(sel).forEach(function (x) { x.classList.toggle("active", x === el); }); }
    $$("#style-seg button").forEach(function (b) {
      b.addEventListener("click", function () { studio.dataset.style = b.getAttribute("data-style"); setActive("#style-seg button", b); });
    });
    function applySize(sz) {
      studio.dataset.size = sz;
      var d = (window.VERA_SIZES && window.VERA_SIZES[sz]) || SIZES[sz] || SIZES.M;
      $$("#studio-size dd").forEach(function (dd) { var k = dd.getAttribute("data-k"); dd.textContent = d[k] != null ? d[k] : "—"; });
    }
    $$("#size-seg button").forEach(function (b) {
      b.addEventListener("click", function () { setActive("#size-seg button", b); applySize(b.getAttribute("data-size")); });
    });
    applySize(studio.dataset.size || "M");
    var sws = $$("#tee-swatches .sw");
    sws.forEach(function (b) {
      b.addEventListener("click", function () { setActive("#tee-swatches .sw", b); studio.style.setProperty("--tee-fill", b.getAttribute("data-color")); });
    });
  }

  /* ------------------ robust in-page anchors (body overflow-x breaks native jump) */
  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1); if (!id) return;
        var t = doc.getElementById(id); if (!t) return;
        e.preventDefault();
        doc.body.classList.remove("r-menu");
        var tg = $("#rnav-toggle"); if (tg) tg.setAttribute("aria-expanded", "false");
        t.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: "start" });
        try { history.replaceState(null, "", "#" + id); } catch (e2) {}
      });
    });
  }

  /* ---------------------------------------- SHOWCASE 3D (ghost tee ― 服だけを陳列) */
  function initTee3D() {
    var stage = $("#tee3d"); if (!stage) return;
    var studio = $("#studio");
    // ?no3d=検証用（screenshot撮影時に3Dを建てない）。実利用に影響なし
    // reduced-motion は SAVE に含めない＝3Dは建てるが「静止1枚描画＋手動回転のみ」で提供する
    var SAVE = (navigator.connection && navigator.connection.saveData) || /[?&]no3d/.test(location.search);
    var built = false;
    function cColor() { return (studio && studio.style.getPropertyValue("--tee-fill").trim()) || "#f2efe8"; }
    function cStyle() { return (studio && studio.dataset.style) || "private"; }
    function cSize() { return (studio && studio.dataset.size) || "M"; }

    function build() {
      if (built) return; built = true;
      if (SAVE) { stage.classList.add("no3d"); return; }
      import("https://unpkg.com/three@0.160.0/build/three.module.min.js").then(function (THREE) {
        var w = stage.clientWidth || 480, h = stage.clientHeight || 560;
        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h);
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        stage.insertBefore(renderer.domElement, stage.firstChild); stage.classList.add("has3d");
        var scene = new THREE.Scene();
        // ---- 全身マネキンの共通ボディ寸法（服の種類に関わらず体は1つ・不変） ----
        var BODY = {
          shoW: 0.62,      // 肩の半幅（腕の付け根）
          armA: 0.085,     // 垂直からの開き角＝ほぼまっすぐ下ろす
          upperLen: 1.05, foreLen: 0.95, // 二の腕／前腕の長さ
          neckR: 0.29,     // 首の半径（全ガーメント共通の襟ぐりもこれに合わせる）
          torsoLen: 1.55,  // 肩線から腰までの距離
          hipW: 0.5,       // 腰の半幅
          legLen: 3.25     // 腰から床までの脚の長さ
        };
        var SHOULDER_Y = 2.7; // 肩のワールドY。床(-2.1)= SHOULDER_Y - torsoLen - legLen で自動的に一致
        var SHIRT_Y = 2.35;   // 服の肩を乗せる高さ（実マネキン肩≈2.23の少し上）
        var camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
        camera.position.set(0, 1.05, 12.4); camera.lookAt(0, 0.95, 0); // 頭頂〜足元まで入る全身フレーミング

        // ---- スタジオ環境光（布のシーン光沢に効く簡易ソフトボックス環境。失敗しても致命でない） ----
        try {
          var envScene = new THREE.Scene();
          envScene.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x223a5e, side: THREE.BackSide })));
          var sbT = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); sbT.position.set(2, 7, 5); sbT.lookAt(0, 0, 0); envScene.add(sbT);
          var sbL = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), new THREE.MeshBasicMaterial({ color: 0xdfe7f2 })); sbL.position.set(-8, 1, 2); sbL.lookAt(0, 0, 0); envScene.add(sbL);
          var pm = new THREE.PMREMGenerator(renderer);
          scene.environment = pm.fromScene(envScene, 0.03).texture;
          pm.dispose();
        } catch (e) {}

        // ---- ライティング（3点・紺×白のみ） ----
        scene.add(new THREE.AmbientLight(0x2b3a58, 0.4));
        var key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3.2, 5.5, 4.6); key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 24;
        key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
        key.shadow.bias = -0.0005; key.shadow.radius = 6; scene.add(key);
        var fill = new THREE.DirectionalLight(0xa9bcd9, 0.55); fill.position.set(-4.5, 1.6, 3.2); scene.add(fill);
        var rim = new THREE.DirectionalLight(0xcdd9e8, 0.7); rim.position.set(-1.5, 3.5, -5); scene.add(rim);

        // ---- 布の質感：微細な織り目ノーマルマップ（手続き生成・画像依存なし） ----
        function clothNormal() {
          var cv = document.createElement("canvas"); cv.width = cv.height = 256;
          var g = cv.getContext("2d");
          g.fillStyle = "rgb(128,128,255)"; g.fillRect(0, 0, 256, 256);
          var i, x, y;
          for (i = 0; i < 2600; i++) { // 織りの粒
            x = (i * 97) % 256; y = (i * 151 + ((i * i) % 7) * 31) % 256;
            g.fillStyle = (i % 2) ? "rgba(140,140,255,0.5)" : "rgba(116,116,255,0.5)";
            g.fillRect(x, y, 2, 1);
          }
          for (i = 0; i < 26; i++) { // ごく薄い縦のドレープ筋
            x = (i * 41 + 13) % 256;
            g.fillStyle = (i % 2) ? "rgba(122,122,255,0.35)" : "rgba(134,134,255,0.35)";
            g.fillRect(x, 0, 3, 256);
          }
          var t = new THREE.CanvasTexture(cv);
          t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = 4;
          return t;
        }
        var fabric = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(cColor()), roughness: 0.8, metalness: 0,
          sheen: 0.7, sheenRoughness: 0.65, sheenColor: new THREE.Color(0xf0f2f6),
          normalMap: clothNormal(), normalScale: new THREE.Vector2(0.45, 0.45),
          side: THREE.DoubleSide, envMapIntensity: 0.55
        });

        // ---- 左胸のワッペン：本物のVERAロゴ(2色版SVG)を貼る（手描きの赤い棒ではなく実ロゴ資産） ----
        var logoCv = document.createElement("canvas"); logoCv.width = 256; logoCv.height = 338; // vera_logo_2colorの実比率(222.43:294.21)に合わせた透過キャンバス
        var logoTex = new THREE.CanvasTexture(logoCv); logoTex.anisotropy = 4;
        (function () {
          var img = new Image();
          img.onload = function () {
            var g = logoCv.getContext("2d");
            g.clearRect(0, 0, logoCv.width, logoCv.height);
            g.drawImage(img, 0, 0, logoCv.width, logoCv.height);
            logoTex.needsUpdate = true;
            if (typeof wake === "function") wake();
          };
          img.src = "assets/img/vera_logo_2color.svg";
        })();
        var lineMat = new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.55, metalness: 0, depthTest: false, depthWrite: false });

        // ---- マネキン材質：石膏像風ライトグレー（紺背景で消えず・生成りの布とも区別できる）＋スタンド金属 ----
        var plaster = new THREE.MeshStandardMaterial({ color: 0xaab3c2, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.6 });
        var standMetal = new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.45, metalness: 0.3 });

        // ---- ゴーストTシャツ本体：扁平スーパー楕円断面のロフト（＝樽にならない） ----
        function superPt(t, w, d, n) {
          var c = Math.cos(t), s = Math.sin(t);
          var x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * w;
          var z = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * d;
          return [x, z];
        }
        function lerp(a, b, t) { return a + (b - a) * t; }
        function buildBody(P) {
          // stations: [yFrac, 半幅w, 半奥行d, 断面の角張りn, 実y補正]
          var st = [
            [0.00, P.hemW, P.depth * 0.94, 2.7, 0],
            [0.16, P.hemW * 0.995, P.depth * 0.97, 2.7, 0],
            [0.38, lerp(P.hemW, P.chestW, 0.55), P.depth, 2.6, 0],
            [0.58, P.chestW, P.depth, 2.5, 0],
            [0.74, P.chestW * 1.015, P.depth * 0.99, 2.5, 0],
            [0.88, P.shoW, P.depth * 0.94, 2.5, 0],
            // 肩→首は1段のなだらかなカーブのみ（中間の凹凸を作らない＝ギザギザ防止）
            [1.00, BODY.neckR * 1.22, BODY.neckR * 0.86, 2.3, 0.03]
          ];
          var SEG = 72, rows = [];
          var i, j, k;
          for (i = 0; i < st.length; i++) {
            var yF = st[i][0], wW = st[i][1], dD = st[i][2], n = st[i][3], yAdd = st[i][4];
            var ring = [];
            for (j = 0; j < SEG; j++) {
              var t = j / SEG * Math.PI * 2;
              // ドレープ（裾ほど強く・肩でゼロ）＋織りの揺らぎ
              var fold = 1 + (0.022 * Math.sin(t * 6 + 0.9) + 0.011 * Math.sin(t * 11 + 2.2)) * Math.pow(1 - yF, 1.3);
              var p = superPt(t, wW * fold, dD * fold, n);
              // y=0を肩線に統一（BODY/マネキンと同じ座標系）。裾(yF=0)はP.len下、肩(yF=1)は0
              var y = (yF - 1) * P.len + yAdd * P.len;
              if (i === 0) y += 0.02 * Math.sin(t * 5 + 1.2); // 裾の揺れ
              ring.push([p[0], y, p[1]]);
            }
            rows.push(ring);
          }
          var pos = [], idx = [];
          for (i = 0; i < rows.length; i++) for (j = 0; j < SEG; j++) { var v = rows[i][j]; pos.push(v[0], v[1], v[2]); }
          for (i = 0; i < rows.length - 1; i++) for (j = 0; j < SEG; j++) {
            var a = i * SEG + j, b = i * SEG + (j + 1) % SEG, c2 = (i + 1) * SEG + j, d2 = (i + 1) * SEG + (j + 1) % SEG;
            idx.push(a, b, c2, b, d2, c2);
          }
          var geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          // UV（織り目タイル用）
          var uv = [];
          for (i = 0; i < rows.length; i++) for (j = 0; j < SEG; j++) uv.push(j / SEG * 4, (rows[i][j][1] + P.len) / P.len);
          geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
          geo.setIndex(idx); geo.computeVertexNormals();
          var mesh = new THREE.Mesh(geo, fabric); mesh.castShadow = true;
          return mesh;
        }
        function armAxis(s) { // 腕の共通軸＝ほぼ垂直（BODY.armAだけごくわずかに外へ開く。まっすぐ下ろす）
          return new THREE.Vector3(s * Math.sin(BODY.armA), -Math.cos(BODY.armA), 0);
        }
        function shoulderPt(s) { return new THREE.Vector3(s * BODY.shoW, 0, 0); } // 肩線=y0 が体の基準
        function buildSleeve(P, s) { // s=±1／Pは服固有（太さ・長さ・緩さ）、腕の軸線はBODY共通
          var g = new THREE.Group();
          // +Y端＝袖口。quaternionで腕軸 u1 に正確一致させる
          var tube = new THREE.Mesh(new THREE.CylinderGeometry(P.slR * P.slFlare, P.slR * 0.98, P.slLen, 36, 3, true), fabric);
          tube.scale.z = 0.82; tube.castShadow = true;
          var cuff = new THREE.Mesh(new THREE.TorusGeometry(P.slR * P.slFlare * 0.985, 0.042, 10, 40), fabric);
          // scaleは回転前に掛かる（T·R·S）。回転後の奥行き扁平は scale.y が正（scale.zはリングに無効）
          cuff.scale.y = 0.82; cuff.position.y = P.slLen / 2; cuff.rotation.x = Math.PI / 2; cuff.castShadow = true;
          g.add(tube); g.add(cuff);
          var u1 = armAxis(s);
          g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u1);
          // 付け根を肩の中へ深めに沈める（肩上の「ヒレ」防止）
          g.position.copy(shoulderPt(s)).add(u1.clone().multiplyScalar(P.slLen * 0.5)).add(new THREE.Vector3(0, -0.09, 0));
          return g;
        }
        // ---- 全身マネキン（頭・首・肩・まっすぐ下ろした腕・腰・脚・足・薄い台座）。服の種類に関わらず1体だけ共有 ----
        function buildMannequin() {
          var g = new THREE.Group();
          var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.125, 0.36, 24), plaster);
          neck.position.y = 0.29; neck.castShadow = true; g.add(neck);
          // 頭は小さめ（体に対して頭でっかちにならない比率）
          var head = new THREE.Mesh(new THREE.SphereGeometry(0.265, 32, 24), plaster);
          head.scale.set(0.88, 1.14, 0.94); head.position.y = 0.78; head.castShadow = true; g.add(head);
          var chest = new THREE.Mesh(new THREE.SphereGeometry(BODY.neckR * 1.5, 24, 16), plaster);
          chest.scale.set(1.1, 0.55, 0.85); chest.position.y = -0.06; g.add(chest);
          [-1, 1].forEach(function (s) {
            var u1 = armAxis(s), S = shoulderPt(s);
            var up = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, BODY.upperLen - 0.3, 6, 18), plaster);
            up.position.copy(S).add(u1.clone().multiplyScalar(BODY.upperLen / 2));
            up.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u1);
            up.castShadow = true; g.add(up);
            var E = S.clone().add(u1.clone().multiplyScalar(BODY.upperLen));
            var elbow = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), plaster);
            elbow.position.copy(E); elbow.castShadow = true; g.add(elbow);
            // 前腕は上腕とほぼ同軸（ごくわずかに内へ）＝まっすぐ下ろした自然な立ち姿
            var u2 = new THREE.Vector3(s * Math.sin(BODY.armA * 0.5), -Math.cos(BODY.armA * 0.5), 0.05).normalize();
            var fo = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, BODY.foreLen - 0.25, 6, 18), plaster);
            fo.position.copy(E).add(u2.clone().multiplyScalar(BODY.foreLen / 2));
            fo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u2);
            fo.castShadow = true; g.add(fo);
            var hand = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 12), plaster);
            hand.scale.set(0.72, 1.3, 0.5);
            hand.position.copy(E).add(u2.clone().multiplyScalar(BODY.foreLen + 0.08));
            hand.quaternion.copy(fo.quaternion); hand.castShadow = true; g.add(hand);
          });
          // 腰〜脚〜足〜台座（肩を基準に真下へ。torsoLen+legLenの分だけ下ると床＝shadowCatcherと一致する設計）
          var hip = new THREE.Mesh(new THREE.SphereGeometry(BODY.hipW * 0.62, 22, 16), plaster);
          hip.scale.set(1.15, 0.72, 0.82); hip.position.y = -BODY.torsoLen; g.add(hip);
          // 脚は関節の球を使わず1本のLathe（回転体）で滑らかにテーパーさせる＝球のつなぎ目を作らない
          var legLen = BODY.legLen, hipY = -BODY.torsoLen;
          var legPts = [
            [0.155, 0], [0.15, -legLen * 0.12], [0.128, -legLen * 0.46], // 太もも→膝上
            [0.1, -legLen * 0.5], [0.098, -legLen * 0.52],                // 膝
            [0.088, -legLen * 0.58], [0.075, -legLen * 0.86], [0.062, -legLen * 0.94] // ふくらはぎ→足首
          ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
          [-1, 1].forEach(function (s) {
            var hx = s * BODY.hipW * 0.5;
            var leg = new THREE.Mesh(new THREE.LatheGeometry(legPts, 20), plaster);
            leg.position.set(hx, hipY, 0); leg.castShadow = true; g.add(leg);
            var ankleY = hipY - legLen * 0.94;
            var footLen = legLen * 0.16;
            var foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, footLen * 0.5, 4, 10), plaster);
            foot.scale.set(1, 0.62, 1); foot.rotation.z = Math.PI / 2; // 前(+Z)へ寝かせ、縦に潰して平たい足に
            foot.position.set(hx, ankleY - 0.03, footLen * 0.32); foot.castShadow = true; g.add(foot);
          });
          var floorY = -BODY.torsoLen - BODY.legLen;
          var base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.05, 0.62), standMetal);
          base.position.y = floorY + 0.025; base.receiveShadow = true; g.add(base);
          return g;
        }
        function buildCollar(P) {
          // 胴体の首の穴(半径neckR*1.22)より一回り大きく・太いリブ状にして、縫い目の凹凸ごと覆い隠す
          var col = new THREE.Mesh(new THREE.TorusGeometry(BODY.neckR * 1.42, 0.062, 14, 56), fabric);
          col.scale.y = 0.8; col.position.y = -P.len * 0.01; // 体の面へ少し沈め、浮いて見えないようにする
          col.rotation.x = Math.PI / 2 - 0.14; // 前が少し下がる
          col.castShadow = true; return col;
        }
        function teeParams(kind) {
          return kind === "business" ? {
            // ジャスト＝びしっと：体に沿う幅・短袖
            len: 2.5, hemW: 0.78, chestW: 0.82, shoW: 0.8, depth: 0.34, slR: 0.24, slLen: 0.52, slFlare: 1.04
          } : {
            // 五分丈をだらっと：袖口は肘関節(半径0.135)を完全に通り越した位置で終える（重なると"丸まって"見える）
            len: 2.72, hemW: 0.9, chestW: 0.97, shoW: 0.94, depth: 0.42, slR: 0.31, slLen: 1.24, slFlare: 1.1
          };
        }
        // ---- 服（ガーメント）だけを作る。マネキンは含めない＝サイズ変更で人体が伸縮する事故を構造的に防ぐ ----
        function buildTeeMesh(kind) {
          var P = teeParams(kind);
          var gg = new THREE.Group();
          gg.add(buildBody(P));
          gg.add(buildSleeve(P, 1)); gg.add(buildSleeve(P, -1));
          gg.add(buildCollar(P));
          // 左胸（着る人の左＝正面から見て右）にVERAロゴのワッペン
          var mark = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.172), lineMat);
          var mx = P.chestW * 0.34, chestY = -P.len * 0.3; // y=0が肩線。胸は肩の下30%あたり
          var mz = P.depth * Math.pow(Math.max(0, 1 - Math.pow(mx / P.chestW, 2.5)), 1 / 2.5);
          mark.position.set(mx, chestY, mz + 0.014);
          mark.rotation.y = 0.26; mark.renderOrder = 2;
          gg.add(mark);
          // 服の肩(local y=0)を実マネキンの肩(world≈2.35)に合わせる。SHOULDER_Yより少し下げて布が肩に乗る
          gg.position.y = SHIRT_Y;
          return gg;
        }
        var teePrivate = buildTeeMesh("private"), teeBusiness = buildTeeMesh("business");
        var group = new THREE.Group();
        // ---- マネキン(人体)は服と別グループ・常に1体だけ・スケール1固定＝どの服/サイズを選んでも体は変わらない ----
        // 本物の全身マネキン(3Dモデル)を読み込む。失敗時のみ手作りの簡易マネキンにフォールバック。
        var mannBase = new THREE.Group(); group.add(mannBase);
        var FLOOR_Y = SHOULDER_Y - BODY.torsoLen - BODY.legLen; // 足が着く地面の高さ
        var mixer = null;
        // このモデルは実サイズを「骨(skeleton)」が決めるため、静的な形状箱は当てにならない。
        // → 骨の world 座標(頭頂・つま先・腰)から実身長を測り、拡縮と着地を決める。
        function boneY(root, re) {
          var found = null; root.traverse(function (o) { if (!found && re.test(o.name || "")) found = o; });
          if (!found) return null; var v = new THREE.Vector3(); found.getWorldPosition(v); return v;
        }
        function fitMannequin(obj) {
          obj.updateWorldMatrix(true, true);
          var headTop = boneY(obj, /HeadTop_End$/) || boneY(obj, /Head$/);
          var toe = boneY(obj, /LeftToeBase$/) || boneY(obj, /LeftFoot$/);
          var hips = boneY(obj, /Hips$/);
          if (!headTop || !toe) return; // 骨が無ければそのまま（フォールバックに任せる）
          var rawH = headTop.y - toe.y;
          var targetH = SHOULDER_Y - FLOOR_Y + 0.62; // 頭頂〜床の見え高さ
          var sc = targetH / (rawH || 1);
          obj.scale.setScalar(sc); obj.updateWorldMatrix(true, true);
          // 再計測して足裏を床へ、腰を左右中心へ
          var toe2 = boneY(obj, /LeftToeBase$/) || boneY(obj, /LeftFoot$/);
          var hips2 = boneY(obj, /Hips$/) || hips;
          obj.position.y += FLOOR_Y - toe2.y;
          if (hips2) { obj.position.x -= hips2.x; obj.position.z -= hips2.z; }
        }
        function useFallbackMannequin() {
          var fb = buildMannequin(); fb.position.y = SHOULDER_Y; mannBase.add(fb);
        }
        import("three/addons/loaders/GLTFLoader.js").then(function (m) {
          new m.GLTFLoader().load("assets/models/mannequin.glb", function (gltf) {
            try {
              var model = gltf.scene;
              // 全メッシュを石膏グレーのマットに再着色（元の肌色を上書き）＝美術館の陳列マネキン
              model.traverse(function (o) {
                if (o.isMesh) {
                  o.castShadow = true; o.frustumCulled = false;
                  o.material = new THREE.MeshStandardMaterial({ color: 0xb8bfca, roughness: 0.62, metalness: 0.04, envMapIntensity: 0.5 });
                }
              });
              // idleポーズを1フレームだけ適用＝腕を自然に体側へ下ろした立ち姿（Tポーズの水平腕を解消）
              try {
                var clip = (gltf.animations || []).filter(function (a) { return /idle/i.test(a.name); })[0] || (gltf.animations || [])[0];
                if (clip) { mixer = new THREE.AnimationMixer(model); mixer.clipAction(clip).play(); mixer.update(0.02); }
              } catch (e) {}
              mannBase.add(model);
              fitMannequin(mannBase);
              wake();
            } catch (e) { useFallbackMannequin(); wake(); }
          }, undefined, function () { useFallbackMannequin(); wake(); });
        }).catch(function () { useFallbackMannequin(); wake(); });
        group.add(teePrivate); group.add(teeBusiness);
        scene.add(group);

        // ---- 本物のTシャツ(tee.glb)をマネキンに着せる。成功したら手作りの服は隠す（＝板シャツ卒業） ----
        var teeGlb = null, teeGlbMat = null;
        import("three/addons/loaders/GLTFLoader.js").then(function (m) {
          new m.GLTFLoader().load("assets/models/tee.glb", function (gltf) {
            try {
              var model = gltf.scene, mesh = null;
              model.traverse(function (o) { if (o.isMesh && !mesh) mesh = o; });
              if (!mesh) return;
              teeGlbMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cColor()), roughness: 0.82, metalness: 0, envMapIntensity: 0.5, side: THREE.DoubleSide });
              mesh.traverse(function (o) { if (o.isMesh) { o.material = teeGlbMat; o.castShadow = true; o.frustumCulled = false; } });
              teeGlb = new THREE.Group(); teeGlb.add(model);
              // 実寸へ：胴（肩2.23〜腰1.06）を覆う丈へ拡縮し、肩の高さに合わせて配置・正面(+Z)向き
              var box = new THREE.Box3().setFromObject(teeGlb), size = box.getSize(new THREE.Vector3());
              var sc = 2.05 / (size.y || 1); // Tシャツ丈≈2.05ユニット（肩上〜腿上・少しゆとり）
              teeGlb.scale.setScalar(sc);
              teeGlb.userData.baseX = sc; teeGlb.userData.baseZ = sc; // 幅の基準（applyStateでサイズ/ゆとりを掛ける）
              box.setFromObject(teeGlb); var c = box.getCenter(new THREE.Vector3());
              teeGlb.position.x -= c.x; teeGlb.position.z -= c.z;
              teeGlb.position.y += 2.34 - box.max.y; // 肩(襟)の高さを約2.34へ
              group.add(teeGlb);
              // 左胸にVERAロゴ（teeGlbの子にすると二重変換されるのでgroup直下に置きワールド座標で配置）
              var lb = new THREE.Box3().setFromObject(teeGlb), ls = lb.getSize(new THREE.Vector3());
              var mark = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.225), lineMat);
              mark.position.set(ls.x * 0.19, lb.max.y - ls.y * 0.34, lb.max.z + 0.02);
              mark.renderOrder = 999; group.add(mark);
              applyState(); wake();
            } catch (e) { /* 失敗時は手作りの服のまま */ }
          }, undefined, function () {});
        }).catch(function () {});

        // ---- 影だけを受ける透明の床（マネキンの足が乗る地面） ----
        var shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(9, 9),
          new THREE.ShadowMaterial({ opacity: 0.32 }));
        shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = SHOULDER_Y - BODY.torsoLen - BODY.legLen;
        shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);

        // サイズ切替は「服の大きさ」だけを変える。マネキン(人体)は常にスケール1固定＝人が伸縮しない。
        // ガーメントは横方向(X/Z)だけ拡縮し縦(Y)は固定＝襟ぐり・裾の高さがマネキンからズレない
        var SIZE_SCALE = { S: 0.94, M: 1, L: 1.055, XL: 1.115 };
        function applyState() {
          var st = cStyle(), sc = SIZE_SCALE[cSize()] || 1;
          if (teeGlb) {
            // 本物のTシャツを着せる。手作りの服は隠す。スタイル＝ゆとり量、サイズ＝横幅
            teePrivate.visible = false; teeBusiness.visible = false;
            teeGlb.visible = true;
            var slack = st === "private" ? 1.12 : 1.0; // プライベート=オーバーサイズ
            var baseY = teeGlb.scale.y; // 現在の丈スケール（fit時に設定済み）は触らず幅だけ変える
            teeGlb.scale.x = teeGlb.userData.baseX * sc * slack;
            teeGlb.scale.z = teeGlb.userData.baseZ * sc * slack;
            if (teeGlbMat) teeGlbMat.color.set(cColor());
          } else {
            teePrivate.visible = st === "private";
            teeBusiness.visible = st === "business";
            teePrivate.scale.set(sc, 1, sc);
            teeBusiness.scale.set(sc, 1, sc);
            fabric.color.set(cColor());
          }
        }
        applyState();
        if (studio && window.MutationObserver) {
          new MutationObserver(function () { applyState(); wake(); }).observe(studio, { attributes: true, attributeFilter: ["data-style", "data-size", "style"] });
        }

        // ---- 操作：ドラッグ＋慣性＋静かな自動回転＋呼吸の浮遊 ----
        var dragging = false, lastX = 0, vel = 0, auto = REDUCE ? 0 : 0.0028, paused = false, running = false, tAcc = 0, lastT = performance.now(), offscreen = false;
        group.rotation.y = -0.3;
        function down(e) { dragging = true; lastX = (e.touches ? e.touches[0].clientX : e.clientX); vel = 0; stage.classList.add("grabbing"); wake(); $("#cursor") && $("#cursor").classList.add("down"); }
        function move(e) { if (!dragging) return; var x = (e.touches ? e.touches[0].clientX : e.clientX); var dx = x - lastX; group.rotation.y += dx * 0.009; vel = dx * 0.009; lastX = x; }
        function up() { dragging = false; stage.classList.remove("grabbing"); $("#cursor") && $("#cursor").classList.remove("down"); }
        stage.addEventListener("mousedown", down); addEventListener("mousemove", move); addEventListener("mouseup", up);
        stage.addEventListener("touchstart", down, { passive: true }); stage.addEventListener("touchmove", move, { passive: true });
        // touchcancel（着信/通知/エッジ操作）とウィンドウ外mouseup・フォーカス喪失でも必ず解放（grabbing残留対策）
        addEventListener("touchend", up); addEventListener("touchcancel", up); addEventListener("blur", up);
        function resize() { var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); wake(); } // setSizeでcanvasが消えるためreduced-motion時も1枚描き直す
        onResizeHooks.push(resize);
        // 画面外では描画を停止（電池・スクロールジャンク対策）。戻ったら再開
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (es) { es.forEach(function (x) { offscreen = !x.isIntersecting; if (!offscreen) wake(); }); }, { rootMargin: "120px" }).observe(stage);
        }
        function loop(now) {
          if (paused || offscreen) { running = false; return; }
          if (typeof now !== "number") now = performance.now();
          var dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
          var k = dt * 60; // 60Hz基準に正規化（120Hz端末で回転2倍速を防ぐ）
          if (!dragging) { group.rotation.y += (vel + auto) * k; vel *= Math.pow(0.94, k); }
          // マネキンが床に立つ構図になったため浮遊（呼吸）は廃止（宙に浮く台座は不自然）
          renderer.render(scene, camera);
          // reduced-motion＝自動では動かさない：1枚描いて静止（ドラッグ中と慣性中だけ回す）
          if (REDUCE && !dragging && Math.abs(vel) < 0.0004) { running = false; return; }
          raf(loop);
        }
        function wake() { if (!running && !paused && !offscreen) { running = true; lastT = performance.now(); raf(loop); } }
        wake();
        // verification hook (pause continuous render so headless capture can settle)
        window.__tee3d = {
          pause: function () { paused = true; renderer.render(scene, camera); }, resume: function () { paused = false; wake(); },
          front: function () { group.rotation.y = 0; renderer.render(scene, camera); },
          debugBox: function (obj) { if (!obj) return null; obj.updateWorldMatrix(true, true); var b = new THREE.Box3().setFromObject(obj); var s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()); return { size: [s.x, s.y, s.z], center: [c.x, c.y, c.z], visible: obj.visible }; },
          project: function (worldY, worldX, worldZ) { var v = new THREE.Vector3(worldX || 0, worldY, worldZ || 0); v.project(camera); return { ndcX: v.x, ndcY: v.y, inView: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 }; },
          mannBase: mannBase, teePrivate: teePrivate, teeBusiness: teeBusiness, applyState: applyState, SHOULDER_Y: SHOULDER_Y, BODY: BODY
        };
      }).catch(function () { stage.classList.add("no3d"); });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { build(); io.disconnect(); } }); }, { rootMargin: "300px" });
      io.observe(stage);
    } else build();
    // 遅延読込を殺さない：無条件タイマーはヘッドレス検証（IO不発環境）だけに限定。
    // 実ブラウザで万一IOが不発でも、ステージに触れれば建つ保険を残す。
    if (navigator.webdriver) setTimeout(build, 1800);
    else stage.addEventListener("pointerdown", build, { once: true });
  }

  function boot() {
    try { initPhotos(); } catch (e) {}
    try { initReveal(); } catch (e) {}
    try { initCursor(); } catch (e) { root.classList.add("cursor-fail"); }
    try { initMagnetic(); } catch (e) {}
    try { initMarquee(); } catch (e) {}
    try { initMarqueeSkew(); } catch (e) {}
    try { initNav(); } catch (e) {}
    try { initThread(); } catch (e) {}
    try { initModals(); } catch (e) {}
    try { initToTop(); } catch (e) {}
    try { initTee(); } catch (e) {}
    try { initStudio(); } catch (e) {}
    try { initTee3D(); } catch (e) {}
    try { initAnchors(); } catch (e) {}
    try { runIntro(); } catch (e) { $$("#r-hero .line, #r-hero .hero-r").forEach(function (el) { el.classList.add("is-in"); }); }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
