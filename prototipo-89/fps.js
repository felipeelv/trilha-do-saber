/* ================================================================
   CIDADE DO SABER — modo 1ª pessoa (Three.js)
   Fase 1: terreno texturizado + controle em primeira pessoa
   ================================================================ */
'use strict';

/* ---------- mundo: mapeamento das coordenadas do mapa 2D ---------- */
const WORLD_W = 200;                       // unidades 3D na largura do mapa
const WORLD_H = WORLD_W * 1.792;           // mesma proporção da cidade.png
const toWorldX = rx => (rx - 0.5) * WORLD_W;
const toWorldZ = ry => (ry - 0.5) * WORLD_H;

/* ---------- cena ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1628);
scene.fog = new THREE.Fog(0x0a1628, 55, 230);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 600);
camera.position.set(toWorldX(0.5), 1.7, toWorldZ(0.80));

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('scene').appendChild(renderer.domElement);

/* luz (afeta os prédios da fase 2; o chão é Basic e não depende de luz) */
scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
sun.position.set(60, 120, 40);
scene.add(sun);

/* ---------- chão com a textura da cidade ---------- */
const tex = new THREE.TextureLoader().load('assets/cidade.png');
tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
tex.colorSpace = THREE.SRGBColorSpace || undefined;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_W, WORLD_H),
  new THREE.MeshBasicMaterial({ map:tex })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

/* mar de fundo (leve escuro) */
const sea = new THREE.Mesh(
  new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshBasicMaterial({ color:0x08131f })
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.4;
scene.add(sea);

/* ---------- prédios 3D (blocos extrudados da imagem) ---------- */
const BOXES = [];
if(window.PREDIOS){
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color:0xffffff });
  const mesh = new THREE.InstancedMesh(geo, mat, PREDIOS.length);
  const m4 = new THREE.Matrix4();
  const cor = new THREE.Color();
  PREDIOS.forEach((b, i) => {
    const [cx, cy, w, h, altura, color] = b;
    const wx = toWorldX(cx), wz = toWorldZ(cy);
    const ww = Math.max(0.6, w * WORLD_W), wd = Math.max(0.6, h * WORLD_H);
    m4.makeScale(ww, altura, wd);
    m4.setPosition(wx, altura / 2, wz);
    mesh.setMatrixAt(i, m4);
    mesh.setColorAt(i, cor.set(color));
    BOXES.push({ x0:wx - ww/2, x1:wx + ww/2, z0:wz - wd/2, z1:wz + wd/2 });
  });
  mesh.instanceMatrix.needsUpdate = true;
  if(mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
}

/* colisão jogador × blocos */
function colide(x, z, r){
  for(let i = 0; i < BOXES.length; i++){
    const b = BOXES[i];
    if(x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true;
  }
  return false;
}

/* ---------- controle em 1ª pessoa ---------- */
const KEYS = {};
let yaw = Math.PI;         // olhando para o centro da cidade ao nascer
let pitch = 0;
let locked = false;

const overlay = document.getElementById('overlay');
const crosshair = document.getElementById('crosshair');
document.getElementById('btnEnter').addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});
renderer.domElement.addEventListener('click', () => {
  if(!locked) renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  overlay.classList.toggle('hidden', locked);
  crosshair.hidden = !locked;
});
document.addEventListener('mousemove', e => {
  if(!locked) return;
  yaw   -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = Math.max(-1.35, Math.min(1.35, pitch));
});
addEventListener('keydown', e => { KEYS[e.key.toLowerCase()] = true; });
addEventListener('keyup',   e => { delete KEYS[e.key.toLowerCase()]; });

/* ---------- loop ---------- */
const clock = new THREE.Clock();
function step(){
  const dt = Math.min(0.05, clock.getDelta());
  if(locked){
    const up = KEYS.w || KEYS.arrowup, down = KEYS.s || KEYS.arrowdown;
    const left = KEYS.a || KEYS.arrowleft, right = KEYS.d || KEYS.arrowright;
    let mx = (right ? 1 : 0) - (left ? 1 : 0);
    let mz = (down ? 1 : 0) - (up ? 1 : 0);
    if(mx || mz){
      const mag = Math.hypot(mx, mz); mx /= mag; mz /= mag;
      const speed = (KEYS.shift ? 14 : 7) * dt;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      let nx = camera.position.x + (mx * cos - mz * sin) * speed;
      let nz = camera.position.z + (mz * cos + mx * sin) * speed;
      nx = Math.max(-WORLD_W/2 + 1, Math.min(WORLD_W/2 - 1, nx));
      nz = Math.max(-WORLD_H/2 + 1, Math.min(WORLD_H/2 - 1, nz));
      if(!colide(nx, nz, 0.7)){ camera.position.x = nx; camera.position.z = nz; }
      else if(!colide(nx, camera.position.z, 0.7)) camera.position.x = nx;
      else if(!colide(camera.position.x, nz, 0.7)) camera.position.z = nz;
    }
    camera.rotation.set(0, 0, 0);
    camera.rotateY(yaw);
    camera.rotateX(pitch);
  }
  if(window.__fpsMissionsReady) updateMissions(clock.elapsedTime);
  updateHudDistrict();
  renderer.render(scene, camera);
  requestAnimationFrame(step);
}
step();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================================================================
   FASE 3 — missões no mundo 3D + quiz (sincronizado com o mapa 2D)
   ================================================================ */
const $id = id => document.getElementById(id);

/* ---------- dados (mesmos do mapa 2D) ---------- */
const SAVE_KEY = 'gtaTrilha89V1';
const SUBJECTS = [
  { id:'cie', name:'Ciências', accent:'#4dd7ff', icon:'C', units:[
    { name:'Distrito da Energia',   boss:'Doutor Voltagem',   phases:['Formas e transformações de energia','Calor e temperatura','Eletricidade e circuitos'] },
    { name:'Centro da Química',     boss:'O Alquimista',      phases:['Átomos e tabela periódica','Ligações químicas e fórmulas','Reações químicas'] },
    { name:'Zona da Biologia',      boss:'Guardião do DNA',   phases:['Células e organelas','Genética e hereditariedade','Evolução e seleção natural'] },
  ]},
  { id:'his', name:'História', accent:'#ff7a4d', icon:'H', units:[
    { name:'Distrito da República Velha', boss:'Fantasma do Sertão', phases:['Proclamação da República','Coronelismo e política do café','Canudos e Contestado'] },
    { name:'Centro da Era Vargas',        boss:'O Presidente',       phases:['Revolução de 1930','Estado Novo','Industrialização e trabalho'] },
    { name:'Zona da Ditadura',            boss:'O General',          phases:['Golpe de 1964','AI-5 e a repressão','Abertura e Constituição de 1988'] },
  ]},
  { id:'mat', name:'Matemática', accent:'#6ee86e', icon:'π', units:[
    { name:'Distrito da Álgebra',   boss:'Rei da Álgebra',    phases:['Produtos notáveis e fatoração','Equações do 2º grau','Sistemas de equações'] },
    { name:'Centro da Geometria',   boss:'Mestre das Formas', phases:['Teorema de Pitágoras','Semelhança de triângulos','Áreas de figuras planas'] },
    { name:'Zona das Funções',      boss:'O Analista',        phases:['Função afim','Função quadrática','Leitura de gráficos e tabelas'] },
  ]},
  { id:'por', name:'Português', accent:'#ffb84d', icon:'L', units:[
    { name:'Distrito da Notícia',   boss:'Diretor de Jornal', phases:['Gênero notícia e reportagem','Fato versus opinião','Coesão referencial'] },
    { name:'Centro da Gramática',   boss:'Inspetor da Norma', phases:['Termos da oração','Orações subordinadas','Pontuação'] },
    { name:'Zona da Literatura',    boss:'Curador do Museu',  phases:['Narrativa e tipos de narrador','Conotação e figuras de linguagem','Modernismo e a Semana de 22'] },
  ]},
];
const CITY_NODES = {
  cie:[[0.140,0.949],[0.282,0.938],[0.855,0.934],[0.539,0.914],[0.611,0.894],[0.096,0.868],[0.417,0.834],[0.283,0.824],[0.130,0.759],[0.562,0.751],[0.858,0.750],[0.356,0.749]],
  his:[[0.423,0.683],[0.140,0.676],[0.852,0.674],[0.260,0.670],[0.130,0.634],[0.826,0.632],[0.568,0.630],[0.360,0.609],[0.111,0.587],[0.900,0.581],[0.848,0.558],[0.646,0.550]],
  mat:[[0.637,0.434],[0.151,0.430],[0.826,0.423],[0.421,0.421],[0.278,0.368],[0.616,0.357],[0.721,0.354],[0.825,0.349],[0.451,0.305],[0.153,0.304],[0.859,0.298],[0.399,0.296]],
  por:[[0.148,0.205],[0.385,0.191],[0.845,0.186],[0.665,0.185],[0.875,0.126],[0.154,0.123],[0.324,0.122],[0.670,0.120],[0.154,0.064],[0.324,0.063],[0.845,0.061],[0.500,0.151]],
};
const BOSS_STARS_REQUIRED = 7;
const LESSON_REW = { xp:25, coins:6 };
const BOSS_REW   = { xp:60, coins:15 };

function buildPhases(subject){
  const list = [];
  subject.units.forEach((u, ui) => {
    u.phases.forEach(title => list.push({
      id:`${subject.id}-${list.length}`, idx:list.length, type:'lesson',
      title, unit:u.name, unitIdx:ui, rew:LESSON_REW,
    }));
    list.push({
      id:`${subject.id}-${list.length}`, idx:list.length, type:'boss',
      title:`Missão de Elite: ${u.boss}`, unit:u.name, unitIdx:ui, rew:BOSS_REW,
    });
  });
  return list;
}

/* ---------- estado (mesma chave do mapa 2D) ---------- */
const freshState = () => ({ xp:0, coins:0, weeklyXP:60, streak:6, mult:1, completed:{} });
let state = (() => {
  try{ const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && typeof s === 'object' ? Object.assign(freshState(), s) : freshState(); }
  catch(e){ return freshState(); }
})();
function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function starsOf(id){ return state.completed[id] || 0; }
function unlockInfo(phase, phases){
  if(phase.idx === 0) return { ok:true };
  const prev = phases[phase.idx - 1];
  if(starsOf(prev.id) === 0) return { ok:false, reason:'prev', prev };
  if(phase.type === 'boss'){
    const us = phases.filter(p => p.unitIdx === phase.unitIdx && p.type === 'lesson')
      .reduce((a,p) => a + starsOf(p.id), 0);
    if(us < BOSS_STARS_REQUIRED) return { ok:false, reason:'stars', have:us, need:BOSS_STARS_REQUIRED };
  }
  return { ok:true };
}
function nextMission3D(){
  for(const s of SUBJECTS){
    const phases = buildPhases(s);
    const m = phases.find(p => starsOf(p.id) === 0 && unlockInfo(p, phases).ok);
    if(m) return { subject:s, phase:m };
  }
  return null;
}

/* ---------- marcadores 3D ---------- */
const markers = [];
let beam = null, near = null;
const texCache = {};

function markerTexture(txt, color, dark){
  const key = txt + '|' + color + '|' + (dark ? 1 : 0);
  if(texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = dark ? '#232b38' : color; ctx.fill();
  ctx.lineWidth = 9; ctx.strokeStyle = dark ? '#4d6b7a' : '#ffffff'; ctx.stroke();
  ctx.fillStyle = dark ? '#7d94a5' : '#ffffff';
  ctx.font = '800 58px Barlow, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 64, 68);
  const t = new THREE.CanvasTexture(c);
  texCache[key] = t;
  return t;
}

function buildMarkers(){
  markers.forEach(m => scene.remove(m.sprite));
  markers.length = 0;
  if(beam){ scene.remove(beam); beam = null; }

  SUBJECTS.forEach(s => {
    const phases = buildPhases(s);
    phases.forEach(p => {
      const pos = CITY_NODES[s.id][p.idx];
      const st = starsOf(p.id);
      const info = unlockInfo(p, phases);
      const isBoss = p.type === 'boss';
      const txt = st > 0 ? '✓' : (isBoss ? '★' : s.icon);
      const color = st > 0 ? '#3ecf94' : (!info.ok ? '#39424f' : (isBoss ? '#e4572e' : s.accent));
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: markerTexture(txt, color, st === 0 && !info.ok),
        transparent:true, depthWrite:false,
      }));
      const wx = toWorldX(pos[0]), wz = toWorldZ(pos[1]);
      sprite.position.set(wx, 7, wz);
      sprite.scale.set(isBoss ? 6 : 4.2, isBoss ? 6 : 4.2, 1);
      sprite.userData.baseY = 7;
      scene.add(sprite);
      markers.push({ sprite, p, s, x:wx, z:wz });
    });
  });

  const nm = nextMission3D();
  if(nm){
    const pos = CITY_NODES[nm.subject.id][nm.phase.idx];
    beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 42, 16, 1, true),
      new THREE.MeshBasicMaterial({ color:0xffd400, transparent:true, opacity:0.22,
        side:THREE.DoubleSide, depthWrite:false, blending:THREE.AdditiveBlending })
    );
    beam.position.set(toWorldX(pos[0]), 21, toWorldZ(pos[1]));
    scene.add(beam);
  }
}

/* ---------- proximidade + prompt ---------- */
function updateMissions(t){
  for(let i = 0; i < markers.length; i++){
    const m = markers[i];
    m.sprite.position.y = m.sprite.userData.baseY + Math.sin(t * 2 + i) * 0.35;
  }
  if(beam) beam.rotation.y += 0.01;

  let best = null, bestD = 3.4;
  for(const m of markers){
    const d = Math.hypot(camera.position.x - m.x, camera.position.z - m.z);
    if(d < bestD){ bestD = d; best = m; }
  }
  near = best;
  const pr = $id('prompt');
  if(best && !quiz){
    const st = starsOf(best.p.id);
    const info = unlockInfo(best.p, buildPhases(best.s));
    pr.innerHTML = st > 0
      ? `<b>${best.p.title}</b> · concluída (${st}★) — E para refazer`
      : info.ok
        ? `Pressione <b>E</b> — ${best.p.title}`
        : `🔒 ${best.p.title} — ${info.reason === 'prev' ? 'conclua a missão anterior' : `precisa de ★ ${info.have}/${info.need} no distrito`}`;
    pr.hidden = false;
  } else {
    pr.hidden = true;
  }
}

addEventListener('keydown', e => {
  if(e.key.toLowerCase() === 'e' && near && !quiz){
    const info = unlockInfo(near.p, buildPhases(near.s));
    if(info.ok || starsOf(near.p.id) > 0) openQuiz(near.p, near.s);
  }
});

/* ---------- quiz ---------- */
let quiz = null;
const TIER_NAMES = { fix:'Fixação', apl:'Aplicação', des:'Desafio' };

function openQuiz(p, s){
  const bank = (window.QUESTOES || {})[p.id];
  if(!bank || !bank.q || !bank.q.length) return;
  quiz = { p, s, qs:bank.q, i:0, hits:0, answered:false };
  document.exitPointerLock();
  $id('quizOverlay').classList.remove('hidden');
  renderQ();
}

function renderQ(){
  const { p, qs, i } = quiz;
  const q = qs[i];
  const letters = ['A','B','C','D'];
  $id('quizBody').innerHTML = `
    <div class="qmeta"><span>${p.title}</span><span>${TIER_NAMES[q.t] || ''} · ${i + 1}/${qs.length}</span></div>
    <div class="qtext">${q.q}</div>
    ${q.opts.map((op, k) => `
      <button class="qopt" data-k="${k}"><span class="ol">${letters[k]}</span><span>${op}</span></button>`).join('')}
    <div class="qexp" id="qexp" hidden></div>
    <button class="qbtn" id="qnext" hidden>${i < qs.length - 1 ? 'Próxima' : 'Ver resultado'}</button>`;
  document.querySelectorAll('.qopt').forEach(b =>
    b.addEventListener('click', () => answerQ(+b.dataset.k)));
}

function answerQ(k){
  if(quiz.answered) return;
  quiz.answered = true;
  const q = quiz.qs[quiz.i];
  const ok = k === q.a;
  if(ok) quiz.hits++;
  document.querySelectorAll('.qopt').forEach(b => {
    const bk = +b.dataset.k;
    b.disabled = true;
    if(bk === q.a) b.classList.add('ok');
    else if(bk === k) b.classList.add('miss');
    else b.classList.add('dim');
  });
  const ex = $id('qexp');
  ex.hidden = false;
  ex.innerHTML = `<strong>${ok ? '✔ Resposta certa!' : '✘ Não foi dessa vez.'}</strong> ${q.exp}`;
  const nx = $id('qnext');
  nx.hidden = false;
  nx.addEventListener('click', () => {
    quiz.i++; quiz.answered = false;
    if(quiz.i < quiz.qs.length) renderQ();
    else resultQ();
  });
}

function resultQ(){
  const { p, hits } = quiz;
  const pct = hits / quiz.qs.length * 100;
  const earned = pct >= 90 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;
  const old = starsOf(p.id);
  const mult = state.mult || 1;
  let xpGain = 0, coinGain = 0;
  if(earned > old){
    const diff = old === 0 ? earned : (earned - old);
    xpGain = p.rew.xp * diff * mult;
    coinGain = p.rew.coins * diff;
    state.completed[p.id] = earned;
  } else if(earned > 0){
    xpGain = 5 * mult;
  }
  if(earned >= 2) state.mult = Math.min(3, mult + 1);
  else if(earned === 0) state.mult = 1;
  state.xp += xpGain;
  state.coins += coinGain;
  state.weeklyXP += xpGain;
  save();

  const stars = [1,2,3].map(k =>
    `<span class="${k <= earned ? '' : 'off'}">★</span>`).join('');
  $id('quizBody').innerHTML = earned === 0 ? `
    <h2>Deu ruim! 💥</h2>
    <p style="color:rgba(237,240,245,.65);font-weight:600;margin-bottom:14px">
      Você acertou ${hits}/5 (precisa de 3/5).${mult > 1 ? ' O multiplicador voltou para ×1.' : ''}</p>
    <button class="qbtn" id="qretry">Tentar novamente</button>
    <button class="qbtn" id="qclose" style="margin-top:8px;background:rgba(237,240,245,.12);color:#edf0f5;box-shadow:none">Voltar à cidade</button>
  ` : `
    <h2>${old > 0 ? (earned > old ? 'Novo recorde!' : 'Missão refeita!') : 'Missão cumprida!'}</h2>
    <div class="qstars">${stars}</div>
    <div class="qgains">
      <div>+${xpGain}<small>XP</small></div>
      <div>+${coinGain}<small>moedas</small></div>
      <div>${earned}★<small>estrelas</small></div>
    </div>
    ${mult > 1 ? `<p style="text-align:center;color:#ffc94d;font-weight:800;font-size:13px;margin-bottom:12px">🔥 Multiplicador ×${mult} aplicado!${state.mult > mult ? ` Subiu para ×${state.mult}.` : ''}</p>` : ''}
    <button class="qbtn" id="qclose">Continuar</button>`;

  const close = () => {
    $id('quizOverlay').classList.add('hidden');
    quiz = null;
    buildMarkers();
  };
  $id('qclose').addEventListener('click', close);
  const retry = $id('qretry');
  if(retry) retry.addEventListener('click', () => { quiz = null; openQuiz(p); });
}

buildMarkers();
window.__fpsMissionsReady = true;

/* ---------- HUD: distrito atual pela posição ---------- */
function updateHudDistrict(){
  const el = $id('hudDistrict');
  if(!el) return;
  const ry = camera.position.z / WORLD_H + 0.5;
  let nome = 'CIDADE DO SABER';
  if(ry < 0.24)      nome = 'BAIRRO CULTURAL · PORTUGUÊS';
  else if(ry < 0.48) nome = 'DOWNTOWN · MATEMÁTICA';
  else if(ry < 0.72) nome = 'CENTRO HISTÓRICO · HISTÓRIA';
  else               nome = 'PORTO INDUSTRIAL · CIÊNCIAS';
  if(el.textContent !== nome) el.textContent = nome;
}
