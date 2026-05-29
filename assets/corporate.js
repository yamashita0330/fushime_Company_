/* ===== ヒーロー動画: 読み込み失敗時はフォールバック表示 ===== */
const heroVideo = document.querySelector('.hero-video');
if (heroVideo) {
  const fallback = document.querySelector('.hero-fallback');
  let videoOk = false;
  heroVideo.addEventListener('loadeddata', () => {
    videoOk = true;
    heroVideo.play().catch(()=>{});
    if (fallback) fallback.style.opacity = '0';
  });
  heroVideo.addEventListener('error', () => { heroVideo.style.display = 'none'; });
  setTimeout(() => {
    if (!videoOk) heroVideo.style.display = 'none';
  }, 1500);
}

/* ===== ナビ Blur 強度 ===== */
const navEl = document.getElementById('nav');
if (navEl) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    navEl.style.background = y > 8 ? 'rgba(255,255,255,.86)' : 'rgba(255,255,255,.72)';
  }, {passive:true});
}

/* ===== モバイルメニュー ===== */
const mt = document.getElementById('menuToggle');
const nl = document.getElementById('navLinks');
if (mt && nl) {
  mt.addEventListener('click', () => {
    mt.classList.toggle('open');
    nl.classList.toggle('open');
  });
  nl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mt.classList.remove('open');
    nl.classList.remove('open');
  }));
}

/* ===== Reveal on Scroll (0.8s / Y20px / opacity) ===== */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, {threshold:0.12, rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ===== Number Count-Up (data-target / data-duration) =====
   - 要素が画面に入った瞬間 0 → target へカウントアップ
   - .growth-overlay .score .num の場合は完了後に "+1〜+3" のライブ更新を続ける
*/
function animateCounter(el, target, duration, onDone){
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const v = Math.round(target * ease(t));
    el.textContent = v;
    if (t < 1) requestAnimationFrame(step);
    else { el.textContent = target; if (onDone) onDone(); }
  };
  requestAnimationFrame(step);
}

const counterEls = document.querySelectorAll('[data-target]');
const cio = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = parseInt(el.dataset.duration, 10) || 2000;
    const isMainScore = el.classList.contains('num') && el.closest('.score');
    setTimeout(() => {
      animateCounter(el, target, duration, () => {
        if (isMainScore) startLiveTicker(el, target);
      });
    }, 400);
    cio.unobserve(el);
  });
}, {threshold:0.4});
counterEls.forEach(el => cio.observe(el));

/* ===== Growth Panel：点と点を結ぶ同期アニメーション =====
   - 線は左→右に描画（線の進行と同じ速度で getPointAtLength から各dotの位置を算出）
   - 各dotは線がそこに到達した瞬間にポップ
*/
(function initGrowthAnimation(){
  const panel = document.querySelector('.growth-panel');
  if (!panel) return;
  const linePath = panel.querySelector('.line');
  const areaPath = panel.querySelector('.area');
  const dots = panel.querySelectorAll('.dot');
  if (!linePath || !dots.length) return;

  let started = false;

  const start = () => {
    if (started) return; started = true;

    const pathLen = linePath.getTotalLength();
    const drawDuration = 4200;        // 全長の描画時間
    const startDelay = 350;           // 開始までの待ち
    const dotPunch = 110;             // 線が点に到達してから dot を出す微オフセット

    // 描画準備：dasharray=length, dashoffset=length（=線が見えない状態）
    linePath.style.strokeDasharray = pathLen;
    linePath.style.strokeDashoffset = pathLen;
    // 設定が反映されるよう次フレームで transition を貼る
    requestAnimationFrame(() => {
      linePath.style.transition = `stroke-dashoffset ${drawDuration}ms cubic-bezier(.22,.61,.36,1) ${startDelay}ms`;
    });

    // 各dotの「線上の位置(t)」を算出
    const dotTimes = Array.from(dots).map(dot => {
      const cx = parseFloat(dot.getAttribute('cx'));
      const cy = parseFloat(dot.getAttribute('cy'));
      let bestT = 0, bestDist = Infinity;
      for (let i = 0; i <= 400; i++) {
        const t = i / 400;
        const pt = linePath.getPointAtLength(t * pathLen);
        const d = Math.hypot(pt.x - cx, pt.y - cy);
        if (d < bestDist) { bestDist = d; bestT = t; }
      }
      return { dot, t: bestT };
    });

    // 線描画開始
    requestAnimationFrame(() => {
      linePath.style.strokeDashoffset = '0';
    });

    // 面塗りは線が半分くらい伸びたところでフェードイン
    setTimeout(() => areaPath && areaPath.classList.add('in'), startDelay + drawDuration * 0.4);

    // 線が点に到達した瞬間に dot をポップ
    dotTimes.forEach(({dot, t}) => {
      const at = startDelay + t * drawDuration + dotPunch;
      setTimeout(() => dot.classList.add('appear'), at);
    });
  };

  const gio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        start();
        gio.unobserve(e.target);
      }
    });
  }, {threshold:0.3});
  gio.observe(panel);
})();

/* メインスコアのライブ更新：2〜4秒間隔で +1〜+3 加算、bump で光らせる */
function startLiveTicker(el, baseValue){
  let current = baseValue;
  const tick = () => {
    if (Math.random() > 0.35) {
      const inc = Math.floor(Math.random() * 3) + 1;
      current += inc;
      el.textContent = current;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 500);
    }
    setTimeout(tick, 2000 + Math.random() * 2000);
  };
  setTimeout(tick, 1500);

  /* サブ統計も連動して微増 */
  const subs = document.querySelectorAll('.growth-stat .cnt');
  subs.forEach((s, i) => {
    const subBase = parseInt(s.dataset.target, 10) || 0;
    let subCur = subBase;
    const subTick = () => {
      if (Math.random() > 0.5) {
        const inc = i === 0 ? 0 : (Math.floor(Math.random() * 2) + 1);
        if (inc > 0) {
          subCur += inc;
          s.textContent = subCur;
          const valEl = s.parentElement;
          valEl.classList.add('bump');
          setTimeout(() => valEl.classList.remove('bump'), 400);
        }
      }
      setTimeout(subTick, 2500 + Math.random() * 2500);
    };
    setTimeout(subTick, 2200 + i * 800);
  });
}
