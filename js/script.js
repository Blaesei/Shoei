/* ============================================================
   QUINN HARVEY PINEDA — Portfolio Scripts
   js/script.js
   ============================================================ */

(function () {
  'use strict';

  /* ── THEME TOGGLE ── */
  const THEME_KEY = 'qhp-theme';
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');
  const toggleIcon = document.getElementById('themeIcon');

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (toggleIcon) toggleIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    // Update neural canvas colours
    if (window.NeuralNet) window.NeuralNet.updateTheme(theme);
  }

  const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  /* ── NEURAL NETWORK CANVAS ── */
  window.NeuralNet = (function () {
    const canvas = document.getElementById('neuralCanvas');
    if (!canvas) return { updateTheme: () => {} };
    const ctx = canvas.getContext('2d');

    let theme = savedTheme;
    let W, H, animId;

    // Layer config: node counts
    const LAYERS = [4, 5, 5, 3, 2];
    const nodes = [];    // {x, y, layer, idx, pulsePhase}
    const edges = [];    // {from, to, progress, active, speed, delay}
    const signals = [];  // {from, to, t, color}

    function colours() {
      return theme === 'dark'
        ? { node: '#3dd6f5', nodeDim: 'rgba(61,214,245,0.5)', edge: 'rgba(61,214,245,0.12)',
            nodeOut: '#f5a623', signal: '#3dd6f5', signalOut: '#f5a623',
            nodeFill: '#0d1526', text: 'rgba(61,214,245,0.3)' }
        : { node: '#0a78c8', nodeDim: 'rgba(10,120,200,0.4)', edge: 'rgba(10,120,200,0.1)',
            nodeOut: '#d4860e', signal: '#0a78c8', signalOut: '#d4860e',
            nodeFill: '#e8eef9', text: 'rgba(10,120,200,0.2)' };
    }

    function buildGraph() {
      nodes.length = 0; edges.length = 0; signals.length = 0;

      const padX = W * 0.08;
      const usableW = W - padX * 2;
      const padY = H * 0.12;
      const usableH = H - padY * 2;

      // Build nodes
      LAYERS.forEach((count, li) => {
        const x = padX + (usableW / (LAYERS.length - 1)) * li;
        for (let i = 0; i < count; i++) {
          const y = padY + usableH * (i / (count - 1 || 1));
          nodes.push({ x, y, layer: li, idx: i, pulsePhase: Math.random() * Math.PI * 2, r: li === LAYERS.length - 1 ? 9 : 7 });
        }
      });

      // Build edges (fully connected adjacent layers)
      for (let li = 0; li < LAYERS.length - 1; li++) {
        const fromNodes = nodes.filter(n => n.layer === li);
        const toNodes   = nodes.filter(n => n.layer === li + 1);
        fromNodes.forEach(f => {
          toNodes.forEach(t => {
            edges.push({ from: f, to: t });
          });
        });
      }

      // Seed initial signals
      for (let i = 0; i < 6; i++) {
        spawnSignal();
      }
    }

    function spawnSignal() {
      const isOutput = Math.random() < 0.25;
      let edge;
      if (isOutput) {
        const outEdges = edges.filter(e => e.from.layer === LAYERS.length - 2);
        edge = outEdges[Math.floor(Math.random() * outEdges.length)];
      } else {
        edge = edges[Math.floor(Math.random() * edges.length)];
      }
      if (!edge) return;
      signals.push({
        from: edge.from, to: edge.to,
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
        isOutput,
        size: 3 + Math.random() * 2,
      });
    }

    let last = 0;
    function draw(ts) {
      const dt = ts - last; last = ts;
      const C = colours();
      ctx.clearRect(0, 0, W, H);

      // Edges
      edges.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(e.from.x, e.from.y);
        ctx.lineTo(e.to.x, e.to.y);
        ctx.strokeStyle = C.edge;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Signals
      signals.forEach((s, i) => {
        s.t += s.speed;
        if (s.t >= 1) {
          signals.splice(i, 1);
          spawnSignal();
          return;
        }
        const x = s.from.x + (s.to.x - s.from.x) * s.t;
        const y = s.from.y + (s.to.y - s.from.y) * s.t;

        // Glow
        const grd = ctx.createRadialGradient(x, y, 0, x, y, s.size * 3);
        const col = s.isOutput ? C.signalOut : C.signal;
        grd.addColorStop(0, col);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(x, y, s.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(x, y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Nodes
      const now = ts / 1000;
      nodes.forEach(n => {
        const isOut = n.layer === LAYERS.length - 1;
        const col   = isOut ? C.nodeOut : C.node;
        const pulse = 0.7 + 0.3 * Math.sin(now * 1.5 + n.pulsePhase);

        // Outer ring glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        grd.addColorStop(0, col + '33');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
        ctx.fillStyle = C.nodeFill;
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = pulse;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Inner dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r - 2, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = pulse * 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Layer labels
      ctx.font = `700 10px 'Space Mono', monospace`;
      ctx.fillStyle = C.text;
      ctx.textAlign = 'center';
      const labels = ['INPUT', 'HIDDEN', 'HIDDEN', 'HIDDEN', 'OUTPUT'];
      LAYERS.forEach((_, li) => {
        const x = (W * 0.08) + ((W - W * 0.16) / (LAYERS.length - 1)) * li;
        ctx.fillText(labels[li] || '', x, H - 10);
      });

      animId = requestAnimationFrame(draw);
    }

    function resize() {
      const wrap = canvas.parentElement;
      W = canvas.width  = wrap.offsetWidth;
      H = canvas.height = wrap.offsetHeight || 380;
      buildGraph();
    }

    function init() {
      resize();
      animId = requestAnimationFrame(draw);
      window.addEventListener('resize', () => { cancelAnimationFrame(animId); resize(); animId = requestAnimationFrame(draw); });
    }

    return {
      init,
      updateTheme(t) { theme = t; }
    };
  })();

  /* ── CERT WATERMARK ── */
  function buildCertWatermark() {
    const container = document.getElementById('certWatermark');
    if (!container) return;

    const certs = [
      'TESDA NC II', 'Computer Systems Servicing', 'Mechatronics Servicing',
      'Python Fundamentals', 'Programming Basics', 'Introduction to JavaScript',
      'Machine Learning', 'TensorFlow', 'XGBoost', 'MediaPipe',
      'MobileNetV2', 'Transfer Learning', 'Deep Learning', 'OCR Pipeline',
      'Scikit-learn', 'Data Science', 'Neural Networks', 'Computer Vision',
      'Air Quality Prediction', 'Pneumonia Detection', 'SpotBro', 'AI Engineer',
    ];

    const vw = window.innerWidth;
    const vh = window.innerHeight * 3;

    certs.forEach((cert, i) => {
      for (let rep = 0; rep < 3; rep++) {
        const span = document.createElement('span');
        span.textContent = cert;
        const x = Math.random() * (vw - 200);
        const y = Math.random() * vh;
        const rot = -30 + Math.random() * 60;
        span.style.left = x + 'px';
        span.style.top  = y + 'px';
        span.style.transform = `rotate(${rot}deg)`;
        container.appendChild(span);
      }
    });
  }

  /* ── SCROLL EFFECTS ── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });

  function initScrollReveal() {
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
  }

  /* ── NAV ── */
  function initNav() {
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) nav.classList.add('nav-scrolled');
      else nav.classList.remove('nav-scrolled');
    });
  }

  /* ── MOBILE MENU ── */
  window.toggleMenu = function () {
    const links = document.getElementById('navLinks');
    const ham   = document.getElementById('hamburger');
    links.classList.toggle('open');
    ham.classList.toggle('open');
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('open');
        document.getElementById('hamburger').classList.remove('open');
      });
    });
  });

  /* ── BACK TO TOP ── */
  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
      btn && (btn.classList.toggle('show', window.scrollY > 400));
    });
  }

  /* ── PROJECT FILTER ── */
  window.filterProjects = function (cat, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.project-card').forEach(card => {
      const cats = card.dataset.cat || '';
      const show = cat === 'all' || cats.includes(cat);
      card.style.transition = 'opacity 0.25s, transform 0.25s';
      if (show) {
        card.style.display = '';
        requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = ''; });
      } else {
        card.style.opacity = '0'; card.style.transform = 'scale(0.95)';
        setTimeout(() => { card.style.display = 'none'; }, 250);
      }
    });
    document.querySelectorAll('.project-card.featured').forEach(card => {
      card.style.gridColumn = (cat === 'all' || cat === 'fullstack') ? 'span 2' : 'span 1';
    });
  };

  /* ── AQI PREDICTOR ── */
  window.runAQI = function () {
    const pm25 = parseFloat(document.getElementById('pm25').value) || 35.4;
    const pm10 = parseFloat(document.getElementById('pm10').value) || 54.2;
    const no2  = parseFloat(document.getElementById('no2').value)  || 28.1;
    const so2  = parseFloat(document.getElementById('so2').value)  || 5.3;

    const raw = (pm25 * 1.8) + (pm10 * 0.6) + (no2 * 0.5) + (so2 * 0.3);
    const aqi = Math.round(Math.min(500, Math.max(0, raw)));

    const categories = [
      [50,  'Good',                   '#34d399', '🟢'],
      [100, 'Moderate',               '#fbbf24', '🟡'],
      [150, 'Unhealthy (Sensitive)',  '#f97316', '🟠'],
      [200, 'Unhealthy',              '#ef4444', '🔴'],
      [300, 'Very Unhealthy',         '#a855f7', '🟣'],
      [500, 'Hazardous',              '#7f1d1d', '⚫'],
    ];
    const [, cat, col, em] = categories.find(([limit]) => aqi <= limit) || categories[5];

    const box = document.getElementById('aqiResult');
    box.classList.add('has-result');
    box.innerHTML = `<div>
      <div class="result-label">Predicted AQI</div>
      <div class="result-value" style="color:${col}">${aqi}</div>
      <div class="result-sub">${em} ${cat}</div>
      <div style="font-family:var(--font-mono);font-size:0.63rem;color:var(--text-faint);margin-top:8px;">
        Model: XGBoost Ensemble · R²=0.51
      </div>
    </div>`;
  };

  /* ── SPOTBRO DEMO ── */
  let currentEx = 'squat';
  window.selectEx = function (ex, btn) {
    currentEx = ex;
    document.querySelectorAll('.ex-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['formScore','repCount','jointAngle','formFeedback'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '—'; el.className = 'pose-metric-val'; }
    });
  };

  window.handlePoseUpload = function (input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      const ph = document.getElementById('posePlaceholder');
      if (!ph) return;
      ph.style.backgroundImage = `url(${e.target.result})`;
      ph.style.backgroundSize = 'cover';
      ph.style.backgroundPosition = 'center';
      const inner = ph.querySelector('.pose-placeholder-inner');
      if (inner) inner.style.opacity = '0';
    };
    reader.readAsDataURL(input.files[0]);
  };

  window.simulatePose = function () {
    const btn = document.querySelector('.pose-analyze-btn');
    if (!btn) return;
    btn.textContent = '⚡ Analyzing...'; btn.disabled = true;
    setTimeout(() => {
      const data = {
        squat:  { score:'88%', reps:'12', angle:'97°',  fb:'✓ Good',    good:true },
        pushup: { score:'85%', reps:'10', angle:'162°', fb:'✓ Good',    good:true },
        curl:   { score:'91%', reps:'8',  angle:'145°', fb:'⚠ Depth',  good:false },
        press:  { score:'79%', reps:'6',  angle:'172°', fb:'⚠ Elbows', good:false },
      };
      const r = data[currentEx];
      const set = (id, val, cls) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = val; el.className = 'pose-metric-val ' + (cls || ''); }
      };
      set('formScore',   r.score, r.good ? 'good' : 'warn');
      set('repCount',    r.reps,  'good');
      set('jointAngle',  r.angle, '');
      set('formFeedback', r.fb,   r.good ? 'good' : 'warn');
      btn.textContent = '⚡ Simulate Analysis'; btn.disabled = false;
    }, 1200);
  };

  /* ── CONTACT FORM ── */
  window.submitForm = function () {
    const name    = document.getElementById('cName')?.value.trim();
    const email   = document.getElementById('cEmail')?.value.trim();
    const message = document.getElementById('cMessage')?.value.trim();
    const status  = document.getElementById('formStatus');
    if (!status) return;

    if (!name || !email || !message) {
      status.textContent = '⚠ Please fill in all required fields.';
      status.style.color = '#f87171'; return;
    }
    status.textContent = '⟳ Sending...'; status.style.color = 'var(--text-faint)';
    setTimeout(() => {
      status.textContent = '✓ Message sent! I\'ll be in touch soon.';
      status.style.color = '#34d399';
      ['cName','cEmail','cSubject','cMessage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }, 1500);
  };

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initScrollReveal();
    initBackToTop();
    buildCertWatermark();
    window.NeuralNet.init();
  });

})();