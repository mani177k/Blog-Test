import * as THREE from 'three';
import confetti from 'canvas-confetti';

// ==========================================
// PURE JAVASCRIPT CONTROLLER (STANDALONE)
// 100% HTML, CSS & JS - Zero React Overhead
// ==========================================

// --- State Variables ---
let currentPage = 'home';
let scrollProgress = 0;
let isGoalScored = false;
let bookmarkedIds = new Set(['compounding-horizon']);

// 15-second Carousel State
let carouselActiveIndex = 1;
let carouselTimer = null;

// Audio Simulator State
let isPlayingAudio = false;

// Articles Data for Search & Dynamic Reads
const ALL_ARTICLES = [
  {
    id: 'volatility-2025',
    title: 'Understanding Market Volatility in 2025: Strategic Navigation Across Asset Cycles',
    category: 'Markets',
    readTime: '6 min read',
    author: 'Arjun N'
  },
  {
    id: 'india-growth-2026',
    title: "India's Growth Outlook for 2026: The Manufacturing Renaissance",
    category: 'Economy & Macro',
    readTime: '8 min read',
    author: 'Rohit Mathur'
  },
  {
    id: 'compounding-horizon',
    title: 'The Compounding Horizon: Why Long-Term Equity Patience Outperforms Market Timing',
    category: 'Equities',
    readTime: '6 min read',
    author: 'Sunil Subramaniam'
  },
  {
    id: 'stepup-sips',
    title: 'Small Steps, Big Wealth: The Power of Step-Up SIPs',
    category: 'Personal Finance',
    readTime: '5 min read',
    author: 'Editorial Desk'
  },
  {
    id: 'debt-strategies-2025',
    title: 'Navigating Strategies in a Shifting Economy: Fixed Income Duration',
    category: 'Debt & Fixed Income',
    readTime: '5 min read',
    author: 'Meera Chidambaram'
  },
  {
    id: 'tax-saving-strategies',
    title: 'Smart Tax Saving Strategies Under the New Regime',
    category: 'Tax Planning',
    readTime: '5 min read',
    author: 'Wealth Advisory Desk'
  }
];

// ==========================================
// 1. THREE.JS 3D SCENE & FOOTBALL JOURNEY
// (Active on Homepage, starts from Section 2)
// ==========================================

let scene;
let camera;
let renderer;
let footballGroup;
let footballMesh;
let splineCurve;
let pathMaterial;
let ringMat;
let netGeo;
let originalNetPositions;
let goalGroup;
const ballRadius = 0.52;
const goalDepth = 1.8;
const goalHeight = 2.8;
let currentT = 0;
let prevPosition;
let animationFrameId;

function initThreeScene() {
  const canvas = document.getElementById('three-scene');
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xF8F7F4, 0.012);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 6);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
  sunLight.position.set(15, 25, 10);
  sunLight.castShadow = true;
  scene.add(sunLight);

  const stadiumSpot = new THREE.SpotLight(0xE05A1B, 2.5, 50, Math.PI / 4, 0.4, 1);
  stadiumSpot.position.set(0, -10, 10);
  scene.add(stadiumSpot);

  // Procedural Soccer Ball Texture
  const ballCanvas = document.createElement('canvas');
  ballCanvas.width = 1024;
  ballCanvas.height = 512;
  const ctx = ballCanvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, ballCanvas.width, ballCanvas.height);

  for (let i = 0; i < 20000; i++) {
    const rx = Math.random() * ballCanvas.width;
    const ry = Math.random() * ballCanvas.height;
    const shade = Math.floor(240 + Math.random() * 15);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(rx, ry, 1, 1);
  }

  function drawPolygon(x, y, radius, sides, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  }

  const pentagonCoords = [
    [256, 128], [512, 128], [768, 128],
    [128, 256], [384, 256], [640, 256], [896, 256],
    [256, 384], [512, 384], [768, 384],
    [0, 128], [1024, 128], [0, 384], [1024, 384]
  ];

  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 3;
  pentagonCoords.forEach(([px, py]) => {
    drawPolygon(px, py, 42, 5, '#111827', '#1F2937');
    for (let s = 0; s < 5; s++) {
      const a = (s * 2 * Math.PI) / 5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(px + 42 * Math.cos(a), py + 42 * Math.sin(a));
      ctx.lineTo(px + 78 * Math.cos(a), py + 78 * Math.sin(a));
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  });

  const ballTexture = new THREE.CanvasTexture(ballCanvas);
  ballTexture.wrapS = THREE.RepeatWrapping;
  ballTexture.wrapT = THREE.ClampToEdgeWrapping;

  const ballGeometry = new THREE.SphereGeometry(ballRadius, 48, 48);
  const ballMaterial = new THREE.MeshStandardMaterial({
    map: ballTexture,
    roughness: 0.35,
    metalness: 0.08,
    bumpMap: ballTexture,
    bumpScale: 0.02
  });

  footballGroup = new THREE.Group();
  footballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
  footballMesh.castShadow = true;
  footballGroup.add(footballMesh);
  footballGroup.visible = false;
  footballGroup.scale.setScalar(0);
  scene.add(footballGroup);

  const ballGlow = new THREE.PointLight(0xE05A1B, 0.8, 4);
  ballGlow.position.set(0, 0.2, 0.5);
  footballGroup.add(ballGlow);

  // Define 3D Spline Path Starting from Section 2
  const curvePoints = [
    new THREE.Vector3(-2.2, -1.4, -4.2),  // Section 2 start
    new THREE.Vector3(-1.0, -2.6, -4.0),
    new THREE.Vector3(0.0, -4.2, -6.5),   // Featured Articles
    new THREE.Vector3(3.2, -5.8, -4.0),   // Recent Articles
    new THREE.Vector3(-2.0, -7.5, -5.2),
    new THREE.Vector3(-3.5, -9.2, -3.2),  // Discovery Engine
    new THREE.Vector3(1.8, -11.0, -6.0),  // Featured Video
    new THREE.Vector3(2.5, -12.8, -4.5),  // Financial Tools
    new THREE.Vector3(-2.2, -14.4, -4.0),
    new THREE.Vector3(1.5, -16.2, -3.0),  // Newsletter
    new THREE.Vector3(0.0, -18.0, -4.5),  // Quote
    new THREE.Vector3(0.0, -19.4, -6.0),  // Footer / Goal
    new THREE.Vector3(0.0, -19.9, -8.2),  // Net entry
    new THREE.Vector3(0.0, -20.1, -9.6),  // Net bulge
  ];

  splineCurve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);
  prevPosition = splineCurve.getPointAt(0);

  const pathGeometry = new THREE.TubeGeometry(splineCurve, 240, 0.03, 8, false);
  pathMaterial = new THREE.MeshStandardMaterial({
    color: 0xE05A1B,
    emissive: 0xE05A1B,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.0,
    roughness: 0.4
  });
  const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
  scene.add(pathMesh);

  // Field Arcs
  const arcsGroup = new THREE.Group();
  const ringGeo = new THREE.RingGeometry(0.8, 0.84, 48);
  ringMat = new THREE.MeshBasicMaterial({
    color: 0x0C2340,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide
  });

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const pt = splineCurve.getPointAt(t);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pt);
    ring.rotation.x = Math.PI / 2;
    arcsGroup.add(ring);
  }
  scene.add(arcsGroup);

  // Goal Assembly
  goalGroup = new THREE.Group();
  goalGroup.position.set(0, -20.0, -9.0);

  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.2, metalness: 0.3 });
  const postRadius = 0.08;
  const goalWidth = 5.2;

  const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16), postMaterial);
  leftPost.position.set(-goalWidth / 2, goalHeight / 2, 0);
  goalGroup.add(leftPost);

  const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalHeight, 16), postMaterial);
  rightPost.position.set(goalWidth / 2, goalHeight / 2, 0);
  goalGroup.add(rightPost);

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, goalWidth, 16), postMaterial);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, goalHeight, 0);
  goalGroup.add(crossbar);

  // Net Mesh
  netGeo = new THREE.PlaneGeometry(goalWidth, goalHeight, 36, 24);
  const netMat = new THREE.MeshBasicMaterial({ color: 0x94A3B8, wireframe: true, transparent: true, opacity: 0.5 });
  const netMesh = new THREE.Mesh(netGeo, netMat);
  netMesh.position.set(0, goalHeight / 2, -goalDepth);
  goalGroup.add(netMesh);
  scene.add(goalGroup);

  originalNetPositions = new Float32Array(netGeo.attributes.position.array);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  // If on article page, hide 3D canvas rendering completely
  const canvas = document.getElementById('three-scene');
  if (currentPage !== 'home') {
    if (canvas) canvas.style.display = 'none';
    return;
  } else {
    if (canvas) canvas.style.display = 'block';
  }

  const targetT = Math.min(Math.max(scrollProgress, 0), 1);
  currentT += (targetT - currentT) * 0.085;
  const clampedT = Math.min(Math.max(currentT, 0), 0.9999);

  const newPos = splineCurve.getPointAt(clampedT);
  const moveDelta = newPos.clone().sub(prevPosition);
  const distanceMoved = moveDelta.length();

  if (distanceMoved > 0.0001) {
    const moveDir = moveDelta.clone().normalize();
    const rotationAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), moveDir).normalize();
    if (rotationAxis.lengthSq() > 0.001) {
      const q = new THREE.Quaternion().setFromAxisAngle(rotationAxis, distanceMoved / ballRadius);
      footballMesh.quaternion.premultiply(q);
    }
  }
  prevPosition.copy(newPos);
  footballGroup.position.copy(newPos);

  const zDepth = newPos.z;
  const targetScale = THREE.MathUtils.lerp(0.85, 1.25, Math.min(Math.max((zDepth + 8) / 7, 0), 1));

  // Hero Protection: Emerges starting from Section 2 (threshold = 0.07)
  const heroThreshold = 0.07;
  const emergenceFactor = Math.min(Math.max((clampedT - heroThreshold) / 0.06, 0), 1);

  footballGroup.visible = emergenceFactor > 0.001;
  footballGroup.scale.setScalar(targetScale * emergenceFactor);
  pathMaterial.opacity = 0.28 * emergenceFactor;
  ringMat.opacity = 0.12 * emergenceFactor;

  let targetCamX = newPos.x - 0.2;
  let targetCamY = newPos.y + 0.6;
  let targetCamZ = newPos.z + 5.0;
  let targetLookAt = newPos.clone();

  if (emergenceFactor <= 0.01) {
    targetCamX = 0;
    targetCamY = 0;
    targetCamZ = 6;
    targetLookAt = new THREE.Vector3(0, 0, 0);
  } else if (clampedT > 0.92) {
    const goalBlend = (clampedT - 0.92) / 0.08;
    targetCamX = THREE.MathUtils.lerp(newPos.x, 0, goalBlend);
    targetCamY = THREE.MathUtils.lerp(newPos.y + 0.6, -19.2, goalBlend);
    targetCamZ = THREE.MathUtils.lerp(newPos.z + 5.0, -3.5, goalBlend);
    targetLookAt = new THREE.Vector3(0, -20.0, -9.5);
  }

  camera.position.x += (targetCamX - camera.position.x) * 0.07;
  camera.position.y += (targetCamY - camera.position.y) * 0.07;
  camera.position.z += (targetCamZ - camera.position.z) * 0.07;
  camera.lookAt(targetLookAt);

  // Net Bulge Simulation
  const netPositions = netGeo.attributes.position.array;
  const ballInGoalLocal = footballGroup.position.clone().sub(goalGroup.position);
  const isHittingNet = ballInGoalLocal.z <= -goalDepth + ballRadius && clampedT > 0.96;
  const hitDepth = isHittingNet ? Math.min((-goalDepth + ballRadius) - ballInGoalLocal.z, 1.4) : 0;

  for (let i = 0; i < netPositions.length; i += 3) {
    const ox = originalNetPositions[i];
    const oy = originalNetPositions[i + 1];
    const oz = originalNetPositions[i + 2];
    if (hitDepth > 0) {
      const dx = ox - ballInGoalLocal.x;
      const dy = oy - (ballInGoalLocal.y - goalHeight / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.6) {
        const factor = Math.cos((dist / 1.6) * (Math.PI / 2));
        netPositions[i + 2] = oz - hitDepth * factor * 1.3;
      } else {
        netPositions[i + 2] = oz;
      }
    } else {
      netPositions[i + 2] = oz;
    }
  }
  netGeo.attributes.position.needsUpdate = true;
  netGeo.computeVertexNormals();

  // Goal celebration milestone
  const goalTriggered = clampedT >= 0.975;
  if (goalTriggered && !isGoalScored) {
    isGoalScored = true;
    updateGoalOverlay(true);
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#B83E18', '#C59B27', '#0A192F', '#F8F7F4'],
      disableForReducedMotion: true
    });
  } else if (!goalTriggered && isGoalScored) {
    isGoalScored = false;
    updateGoalOverlay(false);
  }

  renderer.render(scene, camera);
}

function updateGoalOverlay(show) {
  const overlay = document.getElementById('goal-overlay');
  if (!overlay) return;
  if (show) {
    overlay.classList.remove('opacity-40', 'translate-y-4', 'scale-98', 'pointer-events-none');
    overlay.classList.add('opacity-100', 'translate-y-0', 'scale-100');
  } else {
    overlay.classList.add('opacity-40', 'translate-y-4', 'scale-98', 'pointer-events-none');
    overlay.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
  }
}

// ==========================================
// 2. PAGE NAVIGATION & SCROLL TRACKING
// ==========================================

function switchPage(page) {
  currentPage = page;
  const homeView = document.getElementById('home-view');
  const articleView = document.getElementById('article-view');
  const canvas = document.getElementById('three-scene');

  if (page === 'home') {
    if (homeView) homeView.classList.remove('hidden');
    if (articleView) articleView.classList.add('hidden');
    if (canvas) canvas.style.display = 'block';
  } else {
    if (homeView) homeView.classList.add('hidden');
    if (articleView) articleView.classList.remove('hidden');
    if (canvas) canvas.style.display = 'none';
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function initScrollListener() {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const maxScroll = Math.max(docHeight - winHeight, 1);
    scrollProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  }, { passive: true });
}

// ==========================================
// 3. 15-SECOND SECTION 2 CAROUSEL CONTROLLER
// (With smooth 700ms easing and button spacing)
// ==========================================

function renderCarousel() {
  const cards = document.querySelectorAll('.category-carousel-card');
  const dots = document.querySelectorAll('.carousel-dot');
  const total = cards.length;

  cards.forEach((card, idx) => {
    let diff = idx - carouselActiveIndex;
    if (diff < -1) diff += total;
    if (diff > total - 2) diff -= total;

    const isCenter = diff === 0;
    const isLeft = diff === -1 || (carouselActiveIndex === 0 && idx === total - 1);
    const isRight = diff === 1 || (carouselActiveIndex === total - 1 && idx === 0);

    const cardEl = card;
    cardEl.className = 'category-carousel-card absolute w-full max-w-sm sm:max-w-md bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]';

    if (isCenter) {
      cardEl.classList.add('opacity-100', 'z-20', 'scale-100', 'translate-x-0', 'shadow-2xl', 'pointer-events-auto');
    } else if (isLeft) {
      cardEl.classList.add('hidden', 'md:block', 'opacity-55', 'hover:opacity-80', 'z-10', 'scale-90', '-translate-x-64', 'lg:-translate-x-76', 'shadow-md', 'pointer-events-auto', 'cursor-pointer');
    } else if (isRight) {
      cardEl.classList.add('hidden', 'md:block', 'opacity-55', 'hover:opacity-80', 'z-10', 'scale-90', 'translate-x-64', 'lg:translate-x-76', 'shadow-md', 'pointer-events-auto', 'cursor-pointer');
    } else {
      cardEl.classList.add('opacity-0', 'pointer-events-none', 'scale-75', 'z-0', 'translate-x-0');
    }
  });

  dots.forEach((dot, idx) => {
    const dotEl = dot;
    if (idx === carouselActiveIndex) {
      dotEl.className = 'carousel-dot w-7 h-1.5 rounded-full bg-[#B83E18] transition-all duration-500 cursor-pointer';
    } else {
      dotEl.className = 'carousel-dot w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400 transition-all duration-500 cursor-pointer';
    }
  });
}

function startCarouselTimer() {
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    carouselActiveIndex = (carouselActiveIndex + 1) % 4;
    renderCarousel();
  }, 15000);
}

function initCarousel() {
  renderCarousel();
  startCarouselTimer();

  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  prevBtn?.addEventListener('click', () => {
    carouselActiveIndex = (carouselActiveIndex - 1 + 4) % 4;
    renderCarousel();
    startCarouselTimer();
  });

  nextBtn?.addEventListener('click', () => {
    carouselActiveIndex = (carouselActiveIndex + 1) % 4;
    renderCarousel();
    startCarouselTimer();
  });

  document.querySelectorAll('.carousel-dot').forEach((dot) => {
    dot.addEventListener('click', (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      carouselActiveIndex = idx;
      renderCarousel();
      startCarouselTimer();
    });
  });

  // Clicking cards
  document.querySelectorAll('.category-carousel-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      const cardEl = e.currentTarget;
      const idx = Number(cardEl.dataset.index);
      if (idx === carouselActiveIndex) {
        switchPage('article');
      } else {
        carouselActiveIndex = idx;
        renderCarousel();
        startCarouselTimer();
      }
    });
  });
}

// ==========================================
// 4. FINANCIAL TOOLS CALCULATORS
// ==========================================

function initFinancialCalculators() {
  // Tabs
  const tabSip = document.getElementById('tab-sip');
  const tabRetirement = document.getElementById('tab-retirement');
  const tabRisk = document.getElementById('tab-risk');

  const panelSip = document.getElementById('panel-sip');
  const panelRetirement = document.getElementById('panel-retirement');
  const panelRisk = document.getElementById('panel-risk');

  function setCalcTab(tab) {
    [tabSip, tabRetirement, tabRisk].forEach(t => t?.classList.remove('bg-white', 'text-[#081728]', 'shadow-xs'));
    [panelSip, panelRetirement, panelRisk].forEach(p => p?.classList.add('hidden'));

    if (tab === 'sip') {
      tabSip?.classList.add('bg-white', 'text-[#081728]', 'shadow-xs');
      panelSip?.classList.remove('hidden');
    } else if (tab === 'ret') {
      tabRetirement?.classList.add('bg-white', 'text-[#081728]', 'shadow-xs');
      panelRetirement?.classList.remove('hidden');
    } else {
      tabRisk?.classList.add('bg-white', 'text-[#081728]', 'shadow-xs');
      panelRisk?.classList.remove('hidden');
    }
  }

  tabSip?.addEventListener('click', () => setCalcTab('sip'));
  tabRetirement?.addEventListener('click', () => setCalcTab('ret'));
  tabRisk?.addEventListener('click', () => setCalcTab('risk'));

  // SIP Calculator inputs
  const sipAmountInput = document.getElementById('sip-amount');
  const sipRateInput = document.getElementById('sip-rate');
  const sipYearsInput = document.getElementById('sip-years');

  function updateSip() {
    if (!sipAmountInput || !sipRateInput || !sipYearsInput) return;
    const p = Number(sipAmountInput.value);
    const r = Number(sipRateInput.value);
    const y = Number(sipYearsInput.value);

    const amountDisplay = document.getElementById('sip-amount-display');
    const rateDisplay = document.getElementById('sip-rate-display');
    const yearsDisplay = document.getElementById('sip-years-display');

    if (amountDisplay) amountDisplay.textContent = `₹${p.toLocaleString('en-IN')}`;
    if (rateDisplay) rateDisplay.textContent = `${r.toFixed(1)}%`;
    if (yearsDisplay) yearsDisplay.textContent = `${y} Years`;

    const i = r / 12 / 100;
    const n = y * 12;
    const totalInvested = p * n;
    const totalValue = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const wealthGain = totalValue - totalInvested;

    const totalDisplay = document.getElementById('sip-total-display');
    const investedDisplay = document.getElementById('sip-invested-display');
    const gainDisplay = document.getElementById('sip-gain-display');
    const ratioBar = document.getElementById('sip-ratio-bar');

    function formatINR(v) {
      if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
      if (v >= 100000) return `₹${(v / 100000).toFixed(2)} Lakh`;
      return `₹${Math.round(v).toLocaleString('en-IN')}`;
    }

    if (totalDisplay) totalDisplay.textContent = formatINR(totalValue);
    if (investedDisplay) investedDisplay.textContent = formatINR(totalInvested);
    if (gainDisplay) gainDisplay.textContent = `+${formatINR(wealthGain)}`;

    if (ratioBar) {
      const gainPct = Math.round((wealthGain / totalValue) * 100);
      ratioBar.style.width = `${gainPct}%`;
    }
  }

  [sipAmountInput, sipRateInput, sipYearsInput].forEach(inp => {
    inp?.addEventListener('input', updateSip);
  });
  updateSip();
}

// ==========================================
// 5. ARTICLE PAGE INTERACTIVITY (AI ASSISTANT, AUDIO)
// ==========================================

function initArticleInteractions() {
  // Reading mode tabs
  const modeTabs = document.querySelectorAll('.reading-mode-tab');
  const modeContent = document.getElementById('reading-mode-content');

  const modeTexts = {
    '30s': 'The 2025 market volatility reflects global interest rate adjustments and foreign fund rebalancing, not fundamental domestic distress. High domestic retail SIP inflows (₹23,000+ Cr/month) offer a robust stabilizing floor. Investors should maintain disciplined SIP commitments, use pullbacks to build quality mid-cap exposure, and maintain a 40:25:20:15 multi-asset framework.',
    'takeaways': '1. Foreign outflows are offset by record domestic SIP inflows. 2. Large Caps offer valuation safety, while selective Mid Caps present structural earnings alpha. 3. Fixed income provides duration gains as rate cycles peak. 4. Never pause SIPs during sideways corrections.',
    'impact': 'Investors with high equity concentration should rebalance 20% into dynamic debt funds to lock in prevailing sovereign yields. Moderate portfolios benefit from tactical 5% gold allocations as a hedge against geopolitical currency fluctuations.',
    'plain': 'Think of market volatility like monsoon rain on fertile land. Short-term travel might slow down, but the crops grow richer. When stock prices drop temporarily, your regular monthly SIP automatically buys more shares for the same money. When sunshine returns, your portfolio blooms.'
  };

  modeTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      modeTabs.forEach(b => b.classList.replace('bg-[#081728]', 'bg-slate-100'));
      modeTabs.forEach(b => b.classList.replace('text-white', 'text-slate-700'));
      const target = e.currentTarget;
      target.classList.replace('bg-slate-100', 'bg-[#081728]');
      target.classList.replace('text-slate-700', 'text-white');
      const mode = target.dataset.mode || '30s';
      if (modeContent) modeContent.textContent = modeTexts[mode];
    });
  });

  // Audio simulator button
  const audioBtn = document.getElementById('listen-audio-btn');
  const audioProgress = document.getElementById('audio-progress-bar');
  audioBtn?.addEventListener('click', () => {
    isPlayingAudio = !isPlayingAudio;
    if (audioBtn) {
      audioBtn.innerHTML = isPlayingAudio
        ? '⏸ Playing • 7:12 min'
        : '🎧 Listen to article • 7:12 min';
      audioBtn.classList.toggle('bg-[#B83E18]', isPlayingAudio);
      audioBtn.classList.toggle('text-white', isPlayingAudio);
    }
    if (audioProgress) {
      audioProgress.classList.toggle('hidden', !isPlayingAudio);
    }
  });

  // Ask AI Q&A
  const aiInput = document.getElementById('ai-question-input');
  const aiSubmit = document.getElementById('ai-submit-btn');
  const aiChatLog = document.getElementById('ai-chat-log');

  function askAi(query) {
    const q = query || aiInput?.value;
    if (!q || !q.trim() || !aiChatLog) return;

    let ans = '';
    const qLower = q.toLowerCase();
    if (qLower.includes('sip') || qLower.includes('monthly')) {
      ans = 'Continue your automated SIPs without interruption. Historical data demonstrates that monthly installments deployed during volatile sideways markets acquire fund units at lower NAVs, unlocking superior compound returns when markets mean-revert.';
    } else if (qLower.includes('conservative') || qLower.includes('risk')) {
      ans = 'Conservative investors should tilt toward high-credit Dynamic Bond funds and Multi-Asset allocation funds, maintaining 20-30% in high-dividend Large Caps while holding 15% in sovereign debt accruals for downside shielding.';
    } else {
      ans = 'Based on Sundaram AMC research, the 2025 volatility cycle is primarily valuation-driven rather than structural. We recommend maintaining a 40:25:20:15 multi-asset posture and utilizing temporary index corrections to top up high-conviction equity schemes.';
    }

    const logItem = document.createElement('div');
    logItem.className = 'space-y-1.5 text-xs';
    logItem.innerHTML = `
      <div class="p-2.5 bg-slate-100 rounded-lg text-slate-900 font-semibold">Q: ${q}</div>
      <div class="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
        <strong class="text-[#081728]">Sundaram Research:</strong> ${ans}
      </div>
    `;
    aiChatLog.appendChild(logItem);
    if (aiInput) aiInput.value = '';
  }

  aiSubmit?.addEventListener('click', () => askAi());
  aiInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') askAi();
  });

  document.querySelectorAll('.ai-chip-prompt').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const q = e.currentTarget.textContent?.replace('💬 ', '').trim();
      if (q) askAi(q);
    });
  });
}

// ==========================================
// 6. GLOBAL DIALOGS & ACTION HANDLERS
// ==========================================

function initModals() {
  // Get in Touch Modal
  const modalGetInTouch = document.getElementById('modal-get-in-touch');
  const btnOpenInTouch = document.querySelectorAll('.trigger-get-in-touch');
  const btnCloseInTouch = document.querySelectorAll('.close-get-in-touch');

  btnOpenInTouch.forEach(b => b.addEventListener('click', () => modalGetInTouch?.classList.remove('hidden')));
  btnCloseInTouch.forEach(b => b.addEventListener('click', () => modalGetInTouch?.classList.add('hidden')));

  // Search Modal
  const modalSearch = document.getElementById('modal-search');
  const btnOpenSearch = document.getElementById('trigger-search');
  const btnCloseSearch = document.getElementById('close-search');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  btnOpenSearch?.addEventListener('click', () => {
    modalSearch?.classList.remove('hidden');
    searchInput?.focus();
  });
  btnCloseSearch?.addEventListener('click', () => modalSearch?.classList.add('hidden'));

  searchInput?.addEventListener('input', () => {
    const val = searchInput.value.toLowerCase().trim();
    if (!searchResults) return;
    const matches = ALL_ARTICLES.filter(a => a.title.toLowerCase().includes(val) || a.category.toLowerCase().includes(val));
    searchResults.innerHTML = matches.map(m => `
      <div class="p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 flex items-center justify-between group search-item" data-id="${m.id}">
        <div>
          <span class="text-[10px] font-bold uppercase text-[#B83E18] block mb-0.5">${m.category}</span>
          <h4 class="text-xs font-serif font-bold text-[#081728] group-hover:text-[#B83E18]">${m.title}</h4>
        </div>
        <span class="text-xs text-slate-400 group-hover:text-[#081728]">→</span>
      </div>
    `).join('');

    document.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('click', () => {
        modalSearch?.classList.add('hidden');
        switchPage('article');
      });
    });
  });

  // Nav Links
  document.querySelectorAll('.nav-to-home').forEach(btn => {
    btn.addEventListener('click', () => switchPage('home'));
  });
  document.querySelectorAll('.nav-to-article').forEach(btn => {
    btn.addEventListener('click', () => switchPage('article'));
  });

  // Scroll to section triggers
  document.querySelectorAll('.scroll-to-target').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.currentTarget.dataset.target;
      if (!targetId) return;
      if (currentPage !== 'home') switchPage('home');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });
  });
}

// ==========================================
// 7. INITIALIZATION ON DOM CONTENT LOADED
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initThreeScene();
  initScrollListener();
  initCarousel();
  initFinancialCalculators();
  initArticleInteractions();
  initModals();
});
