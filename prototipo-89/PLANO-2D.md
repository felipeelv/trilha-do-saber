# Plano — Precisão nas ruas + jogabilidade dinâmica (mapa 2D)

> **Para agentes:** executar fase a fase (checkbox). Validar + commit ao final de cada fase.
> **CWD de todos os comandos:** `prototipo-89/` (a partir da raiz do repo `Tarefas on line`).
> O modo **2D continua principal**. **Não** alterar `fps.html` / `fps.js` nem a chave `gtaTrilha89V1`.

**Goal:** o aluno nunca sai visualmente das ruas (colisão precisa na máscara) e a direção fica mais "viva": aceleração/fricção, câmera com look-ahead, clique-para-andar com A*, juice visual/sonoro e joystick touch.

**Architecture:** lógica no `index.html` (padrão do protótipo), exceto A* em `js/rota.js` (mesmo padrão dos `assets/*.js`). `MASCARA` (192×336, célula ≈ 4 px) é a única fonte de verdade de "onde é rua".

**Tech stack:** JS puro no browser, sem build, sem dependências novas. Sons via WebAudio. Teste de A* com `node`. Servidor local: `python3 -m http.server` em `prototipo-89/`.

## Restrições globais

- Sem build / sem libs novas. A* à mão (~60 linhas).
- Não mexer em FPS nem em `SAVE_KEY = 'gtaTrilha89V1'`.
- UI em pt-BR.
- Ritmo de referência: andar ≈ 210 px/s, correr ≈ 340 px/s (não deixar mais lento).
- Commits **só** dos arquivos desta fase. Há diffs não relacionados em `assets/predios.js` e `fps.js` — **não** incluí-los.
- Após cada edição de `.js`: `node --check <arquivo>`.

## Mapa de arquivos (estado atual — ago/2026)

| Arquivo | Papel |
|---------|--------|
| `index.html` | Tudo do 2D: CSS + HTML + script principal (~1840 linhas) |
| `assets/mascara.js` | `window.MASCARA = { w:192, h:336, rows:[...] }` (`'1'` = rua) |
| `js/rota.js` | **criar** — A* + simplificação |
| `fps.html` / `fps.js` | **intocados** |
| `assets/predios.js` | **intocado neste plano** |

### Âncoras no `index.html` (linhas atuais)

| Linha | O quê |
|------:|-------|
| 865–869 | `<script src=...>` — inserir `js/rota.js` **depois** de `assets/mascara.js` |
| 974 | `SAVE_KEY = 'gtaTrilha89V1'` — não alterar |
| 1217–1219 | Spawn usa `nearestIntersection` → trocar por `snapWalkable` na fase 2 |
| 1241 | `const AV = {...}` — remover na fase 2 |
| 1252–1257 | `setDir` (saltos 90°) — suave na fase 3 |
| 1260–1265 | `nearestIntersection` — remover na fase 2 |
| 1268–1279 | `streetRoute` — remover na fase 2 |
| 1281–1308 | `walkTo` — ligar A* na fase 2 |
| 1322–1328 | `maskWalkable` — refatorar com `maskCell` na fase 1 |
| 1330–1332 | `feetWalkable` com **OR** — virar AND + caixa 6 pts na fase 1 |
| 1335–1348 | `snapWalkable` — manter; usa `feetWalkable` |
| 1352–1364 | `cameraFollow` banda 35–65% — look-ahead na fase 3 |
| 1366–1389 | `driveStep` velocidade instantânea — sub-passos (F1) + acel/fricção (F3) |
| 1788–1800 | `finishPhase` + `burst` — confete 2★+ na fase 4 reutiliza/estende |

---

## Fase 1 — Colisão precisa (o aluno para de sair da rua)

**Causas no código:**
1. `feetWalkable` (L1330–1332) aprova se **qualquer** de 3 pontos estiver na rua (`||`) → sprite com metade do corpo em prédio/água. Deve ser **todos** (`&&`).
2. Correndo, passo por frame chega a ~17 px; célula ≈ 4 px → tunneling. Sub-passos ≤ 3 px.

**Files:** Modify `index.html` apenas (funções de movimento/máscara).

- [ ] **1.1** Inserir helpers **logo antes** de `maskWalkable` (≈ L1322). Refatorar `maskWalkable` para usá-los:

```js
function maskCell(x, y){
  const W = $('#mapCanvas').clientWidth, H = $('#mapCanvas').clientHeight;
  return [Math.floor(x / W * MASCARA.w), Math.floor(y / H * MASCARA.h)];
}
function cellCenter(gx, gy){
  const W = $('#mapCanvas').clientWidth, H = $('#mapCanvas').clientHeight;
  return [(gx + 0.5) * W / MASCARA.w, (gy + 0.5) * H / MASCARA.h];
}
function maskWalkable(x, y){
  if(!window.MASCARA) return true;
  const [gx, gy] = maskCell(x, y);
  if(gx < 0 || gy < 0 || gx >= MASCARA.w || gy >= MASCARA.h) return false;
  return MASCARA.rows[gy][gx] === '1';
}
```

- [ ] **1.2** Trocar `feetWalkable` por caixa de pés 18×6 com **6 amostras AND**:

```js
function feetWalkable(x, y){
  if(!window.MASCARA) return true;
  for(const [ox, oy] of [[-9,11],[0,11],[9,11],[-9,16],[0,16],[9,16]])
    if(!maskWalkable(x + ox, y + oy)) return false;
  return true;
}
```

- [ ] **1.3** Sub-passos no `driveStep` (substituir o bloco de movimento L1380–1386). Manter clamp 16…W−16 / H−16:

```js
  const speed = (KEYS.shift ? 340 : 210) * dt;
  const W = $('#mapCanvas').clientWidth, H = $('#mapCanvas').clientHeight;
  const sx = dx * speed, sy = dy * speed;
  const passos = Math.max(1, Math.ceil(Math.hypot(sx, sy) / 3));
  for(let i = 0; i < passos; i++){
    let nx = Math.max(16, Math.min(W - 16, studentPos.x + sx / passos));
    let ny = Math.max(16, Math.min(H - 16, studentPos.y + sy / passos));
    if(feetWalkable(nx, ny)) placeStudent(nx, ny);
    else if(feetWalkable(nx, studentPos.y)) placeStudent(nx, studentPos.y);
    else if(feetWalkable(studentPos.x, ny)) placeStudent(studentPos.x, ny);
    else break;
  }
```

- [ ] **1.4 Validar no browser**
  1. `cd prototipo-89 && python3 -m http.server 8765`
  2. Abrir `http://localhost:8765/`
  3. ~30 s tentando invadir quarteirões e água (andar + Shift diagonal nas quinas)
  4. Sprite deve deslizar na borda, nunca sobrepor prédio/água
  5. Spawn e anti-travamento (`snapWalkable`) ainda funcionam

- [ ] **1.5 Commit** (somente `index.html`):

```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
2D: colisão precisa — caixa de pés (AND) + sub-passos anti-tunneling
EOF
)"
```

**Pronto quando:** impossível deixar o sprite visualmente fora da rua, mesmo correndo na diagonal contra quinas.

---

## Fase 2 — Clique-para-andar com A* na máscara

**Causa:** `streetRoute` (L1268) usa 3 avenidas V + 7 H fixas (`AV`), **sem** máscara → corta quarteirões.

**Atenção:** `nearestIntersection` também spawna o aluno (L1217–1219). Ao remover `AV`, spawn vira `snapWalkable(pos.x, pos.y + 40)`.

**Files:**
- Create: `js/rota.js`
- Modify: `index.html` (script tag, walkTo, spawn, remover AV/streetRoute/nearestIntersection)

- [ ] **2.1** Criar `js/rota.js`:

```js
/* rota A* sobre a máscara de ruas — puro, testável via node */
window.ROTA = (function(){
  function aStar(m, ini, fim){
    const K = (x,y) => y * m.w + x;
    const aberto = [[0, ini[0], ini[1]]];
    const veio = {}, g = { [K(ini[0], ini[1])]: 0 };
    const h = (x,y) => Math.abs(x - fim[0]) + Math.abs(y - fim[1]);
    let achou = false;
    while(aberto.length){
      aberto.sort((a,b) => a[0] - b[0]);
      const [, cx, cy] = aberto.shift();
      if(cx === fim[0] && cy === fim[1]){ achou = true; break; }
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx = cx + dx, ny = cy + dy;
        if(nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        if(m.rows[ny][nx] !== '1') continue;
        const ng = g[K(cx,cy)] + 1;
        if(ng < (g[K(nx,ny)] ?? Infinity)){
          g[K(nx,ny)] = ng;
          veio[K(nx,ny)] = [cx, cy];
          aberto.push([ng + h(nx,ny), nx, ny]);
        }
      }
    }
    if(!achou && K(fim[0], fim[1]) !== K(ini[0], ini[1])) return null;
    if(K(fim[0], fim[1]) === K(ini[0], ini[1])) return [ini.slice()];
    if(!(K(fim[0], fim[1]) in veio)) return null;
    const caminho = [fim.slice()];
    while(K(caminho[0][0], caminho[0][1]) !== K(ini[0], ini[1])){
      const prev = veio[K(caminho[0][0], caminho[0][1])];
      if(!prev) return null;
      caminho.unshift(prev);
    }
    return caminho;
  }
  function livre(m, a, b){
    let x0 = a[0], y0 = a[1], x1 = b[0], y1 = b[1];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while(true){
      if(m.rows[y0][x0] !== '1') return false;
      if(x0 === x1 && y0 === y1) return true;
      const e2 = 2 * err;
      if(e2 >= dy){ err += dy; x0 += sx; }
      if(e2 <= dx){ err += dx; y0 += sy; }
    }
  }
  function simplificar(m, caminho){
    if(!caminho || caminho.length < 3) return caminho;
    const out = [caminho[0]];
    let i = 0;
    while(i < caminho.length - 1){
      let j = caminho.length - 1;
      while(j > i + 1 && !livre(m, caminho[i], caminho[j])) j--;
      out.push(caminho[j]);
      i = j;
    }
    return out;
  }
  return { aStar, simplificar };
})();
```

- [ ] **2.2** Teste node (antes de ligar no jogo). Células `[40,20]` e `[150,300]` são rua na máscara atual:

```bash
node --check js/rota.js
node -e '
global.window = {};
require("./assets/mascara.js");
require("./js/rota.js");
const R = global.window.ROTA, M = global.window.MASCARA;
const c = R.aStar(M, [40, 20], [150, 300]);
if(!c){ console.error("FALHOU: sem caminho"); process.exit(1); }
const s = R.simplificar(M, c);
const ok = c.every(([x,y]) => M.rows[y][x] === "1");
console.log("células:", c.length, "| simplificado:", s.length, "| todas na rua?", ok);
if(!ok) process.exit(1);
const blocked = R.aStar(M, [40, 20], [0, 0]);
console.log("destino murado:", blocked); // deve ser null
if(blocked !== null) process.exit(1);
console.log("OK");
'
```

Esperado: `OK`, caminho com dezenas/centenas de células, simplificado menor, destino murado `null`.

- [ ] **2.3** No `index.html`, após `<script src="assets/mascara.js"></script>`:

```html
<script src="js/rota.js"></script>
```

- [ ] **2.4** Substituir spawn L1217–1219:

```js
    if(studentPos.x == null){
      const sp = snapWalkable(pos.x, pos.y + 40);
      placeStudent(sp[0], sp[1]);
```

- [ ] **2.5** Remover `const AV`, `nearestIntersection` e `streetRoute` por completo.

- [ ] **2.6** Reescrever `walkTo` para usar A*. Fallback se sem caminho: linha reta só se `feetWalkable` no destino, senão só `placeStudent` no snap (ou não mover). Cancelar `driveRaf` se estiver dirigindo:

```js
function walkTo(tx, ty){
  let snapped = snapWalkable(tx, ty);
  if(!feetWalkable(snapped[0], snapped[1])) return;
  tx = snapped[0]; ty = snapped[1];
  if(studentPos.x == null){ placeStudent(tx, ty); return; }
  if(Math.hypot(tx - studentPos.x, ty - studentPos.y) < 6) return;

  const ini = maskCell(studentPos.x, studentPos.y);
  const fim = maskCell(tx, ty);
  // se origem/destino caírem fora da rua na grade, puxar para snap
  if(MASCARA.rows[ini[1]]?.[ini[0]] !== '1'){
    const sp = snapWalkable(studentPos.x, studentPos.y);
    placeStudent(sp[0], sp[1]);
    const c2 = maskCell(sp[0], sp[1]);
    ini[0] = c2[0]; ini[1] = c2[1];
  }
  if(MASCARA.rows[fim[1]]?.[fim[0]] !== '1'){
    const c2 = maskCell(tx, ty);
    fim[0] = c2[0]; fim[1] = c2[1];
  }

  let cells = window.ROTA && ROTA.aStar(MASCARA, ini, fim);
  if(cells) cells = ROTA.simplificar(MASCARA, cells);
  const pts = cells
    ? cells.map(([gx, gy]) => cellCenter(gx, gy))
    : (feetWalkable(tx, ty) ? [[tx, ty]] : null);
  if(!pts || !pts.length) return;

  if(driveRaf){ cancelAnimationFrame(driveRaf); driveRaf = null; }
  if(walkRaf) cancelAnimationFrame(walkRaf);
  const stu = $('#student');
  stu.classList.add('walking');
  let seg = 0, last = performance.now();
  const SPEED = 320;
  function step(now){
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if(seg >= pts.length){ stu.classList.remove('walking'); setDir(0, 1); return; }
    const [nx, ny] = pts[seg];
    const dx = nx - studentPos.x, dy = ny - studentPos.y;
    const dist = Math.hypot(dx, dy);
    if(dist < 4){ placeStudent(nx, ny); seg++; cameraFollow(); walkRaf = requestAnimationFrame(step); return; }
    setDir(dx, dy);
    const move = Math.min(dist, SPEED * dt);
    placeStudent(studentPos.x + dx / dist * move, studentPos.y + dy / dist * move);
    cameraFollow();
    walkRaf = requestAnimationFrame(step);
  }
  walkRaf = requestAnimationFrame(step);
}
```

- [ ] **2.7 Validar no browser:** clicar 8 pontos distantes (4 cantos + centro + 3 nós de missão). Trajeto só por ruas; nunca atravessa quarteirão.

- [ ] **2.8 Commit:**

```bash
git add prototipo-89/js/rota.js prototipo-89/index.html
git commit -m "$(cat <<'EOF'
2D: clique-para-andar com A* na máscara de ruas (js/rota.js)
EOF
)"
```

**Pronto quando:** qualquer clique gera trajeto 100% sobre ruas; teste node passa; `AV`/`streetRoute`/`nearestIntersection` removidos.

---

## Fase 3 — Game feel (aceleração, câmera, virada)

**Files:** Modify `index.html` (`driveStep`, `cameraFollow`, `setDir`, CSS `.student` se precisar).

Estado persistente novo (junto de `studentPos` / `KEYS`):

```js
const vel = { x: 0, y: 0 };
let facing = 0; // graus atuais do sprite
```

- [ ] **3.1** Reescrever `driveStep` com aceleração + fricção. Sub-passos da fase 1 usam `vel * dt`. Colisão zera a componente bloqueada. Loop continua até frear (`v < 4` e sem tecla):

```js
function driveStep(now){
  const dt = Math.min(0.05, (now - (driveStep.last || now)) / 1000);
  driveStep.last = now;
  const up = KEYS.arrowup || KEYS.w, down = KEYS.arrowdown || KEYS.s;
  const left = KEYS.arrowleft || KEYS.a, right = KEYS.arrowright || KEYS.d;
  let dx = (right ? 1 : 0) - (left ? 1 : 0), dy = (down ? 1 : 0) - (up ? 1 : 0);
  const temInput = dx || dy;
  if(temInput){
    const mag = Math.hypot(dx, dy); dx /= mag; dy /= mag;
  } else { dx = 0; dy = 0; }

  const ACEL = 1600, FRICCAO = 8, VMAX = KEYS.shift ? 340 : 210;
  vel.x += dx * ACEL * dt;
  vel.y += dy * ACEL * dt;
  vel.x -= vel.x * Math.min(1, FRICCAO * dt);
  vel.y -= vel.y * Math.min(1, FRICCAO * dt);
  let v = Math.hypot(vel.x, vel.y);
  if(v > VMAX){ vel.x *= VMAX / v; vel.y *= VMAX / v; v = VMAX; }

  if(v < 4 && !temInput){
    vel.x = vel.y = 0;
    $('#student').classList.remove('walking');
    driveRaf = null;
    return;
  }
  if(v >= 4){
    setDirSmooth(vel.x, vel.y, dt, v);
    $('#student').classList.add('walking');
  }

  const W = $('#mapCanvas').clientWidth, H = $('#mapCanvas').clientHeight;
  const sx = vel.x * dt, sy = vel.y * dt;
  const passos = Math.max(1, Math.ceil(Math.hypot(sx, sy) / 3));
  for(let i = 0; i < passos; i++){
    let nx = Math.max(16, Math.min(W - 16, studentPos.x + sx / passos));
    let ny = Math.max(16, Math.min(H - 16, studentPos.y + sy / passos));
    const ox = studentPos.x, oy = studentPos.y;
    if(feetWalkable(nx, ny)) placeStudent(nx, ny);
    else if(feetWalkable(nx, oy)){ placeStudent(nx, oy); vel.y = 0; }
    else if(feetWalkable(ox, ny)){ placeStudent(ox, ny); vel.x = 0; }
    else { vel.x = vel.y = 0; break; }
  }
  cameraFollow(dt);
  driveRaf = requestAnimationFrame(driveStep);
}
```

- [ ] **3.2** Câmera com look-ahead (substituir corpo de `cameraFollow`):

```js
function cameraFollow(dt = 1/60){
  if(studentPos.x == null) return;
  const sc = $('#mapScroll'), z = ZOOMS[zoomIdx];
  sc.style.scrollBehavior = 'auto';
  const vx = (typeof vel !== 'undefined' ? vel.x : 0);
  const vy = (typeof vel !== 'undefined' ? vel.y : 0);
  const alvoX = (studentPos.x + vx * 0.35) * z - sc.clientWidth  / 2;
  const alvoY = (studentPos.y + vy * 0.35) * z - sc.clientHeight / 2;
  const k = 1 - Math.exp(-4 * dt);
  sc.scrollLeft += (alvoX - sc.scrollLeft) * k;
  sc.scrollTop  += (alvoY - sc.scrollTop)  * k;
}
```

Chamar `cameraFollow(dt)` também no tween de `walkTo` (pode passar dt do step).

- [ ] **3.3** Virada suave — substituir/estender `setDir`:

```js
function setDir(dx, dy){ // clique-to-walk e fallback instantâneo
  if(Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
  let deg = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? -90 : 90) : (dy < 0 ? 180 : 0);
  facing = deg;
  $('#student').style.setProperty('--dir', deg + 'deg');
  $('#student').style.setProperty('--lean', '0deg');
}
function setDirSmooth(vx, vy, dt, speed){
  if(Math.hypot(vx, vy) < 8) return;
  let alvo = Math.atan2(vx, -vy) * 180 / Math.PI; // 0 = baixo no sprite atual? calibrar
  // O sprite atual usa: dx>0 → -90, dx<0 → 90, dy<0 → 180, dy>0 → 0
  // Preferir os 4 cardeais suavizados pelo menor arco:
  let deg = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? -90 : 90) : (vy < 0 ? 180 : 0);
  let d = deg - facing;
  while(d > 180) d -= 360;
  while(d < -180) d += 360;
  const maxStep = 12 * 180 / Math.PI * dt; // ~12 rad/s → graus
  if(Math.abs(d) <= maxStep) facing = deg;
  else facing += Math.sign(d) * maxStep;
  const lean = Math.max(-4, Math.min(4, d * 0.08));
  const stu = $('#student');
  stu.style.setProperty('--dir', facing + 'deg');
  stu.style.setProperty('--lean', lean + 'deg');
}
```

CSS (`.student`): manter rotate em `--dir`; opcional `skew`/`rotate` com `--lean`. Se a `transition:transform .18s` brigar com a interpolação manual, reduzir para `transition: none` em `.student.walking` ou remover a transition de transform.

- [ ] **3.4 Validar:** 60 s alternando direções — sem trancos de câmera, freada desliza ~meio corpo, virada não salta 90° seco. Ritmo ≥ referência (210/340).

- [ ] **3.5 Commit:**

```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
2D: aceleração/fricção, câmera com look-ahead e virada suave
EOF
)"
```

**Pronto quando:** rampa perceptível mas responsiva (< ~150 ms até cheia); câmera sem tranco.

---

## Fase 4 — Juice (poeira, objetivo, sons, confete)

**Files:** Modify `index.html` (CSS + JS). Chave nova de som: `gtaTrilha89SomV1` (não misturar com save do jogo).

- [ ] **4.1 CSS** para efeitos (perto dos keyframes existentes):

```css
.fx-dust{
  position:absolute;z-index:4;width:3px;height:3px;border-radius:50%;
  background:rgba(200,180,140,.7);pointer-events:none;
  animation:dust-rise .4s ease-out forwards;
}
@keyframes dust-rise{
  to{transform:translateY(-10px);opacity:0}
}
.objective-arrow.pulse-ring::after{
  content:'';position:absolute;left:50%;top:4px;width:28px;height:28px;
  margin-left:-14px;margin-top:-20px;border-radius:50%;
  border:2px solid rgba(255,212,0,.7);
  animation:obj-ring 1.2s ease-out infinite;
}
@keyframes obj-ring{
  from{transform:scale(.6);opacity:.9}
  to{transform:scale(1.8);opacity:0}
}
.fx-confetti{
  position:absolute;z-index:8;width:6px;height:6px;pointer-events:none;
  animation:confetti-fall .8s ease-in forwards;
}
@keyframes confetti-fall{
  to{transform:translateY(70px) rotate(180deg);opacity:0}
}
```

- [ ] **4.2 Poeira no `driveStep`:** se `v > 250`, a cada ~120 ms spawnar 2–3 `.fx-dust` em `studentPos` + offset aleatório nos pés, dentro de `#mapCanvas`. `animationend` → `el.remove()`. Classe sempre `.fx` + `.fx-dust` para limpeza.

- [ ] **4.3 Objetivo:** em `renderMap`/`renderAll` onde cria `.objective-arrow`, adicionar classe `pulse-ring`. Quando distância aluno → seta < 60 px (no loop de drive ou walk), tocar ping WebAudio uma vez por aproximação:

```js
function sfxPing(){
  if(localStorage.getItem('gtaTrilha89SomV1') === '0') return;
  try{
    const ctx = sfxPing.ctx || (sfxPing.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.stop(ctx.currentTime + 0.09);
  }catch(_){}
}
```

- [ ] **4.4 Passos WebAudio** no bob (quando walking e `v` moderada): ruído curto filtrado a cada ~260 ms. Botão 🔇 no header (junto do HUD) alterna e grava `localStorage.gtaTrilha89SomV1` (`'1'`/`'0'`). Default ligado.

- [ ] **4.5 Confete 2★+:** em `showResult` ou `finishPhase`, se `earned >= 2`, além de `burst`, soltar 12 `.fx-confetti` coloridos no nó. Reutilizar coordenadas de `finishPhase`.

- [ ] **4.6 Validar:** 2 min de jogo; após parar, `document.querySelectorAll('.fx').length === 0` (ou ≈0); FPS estável no DevTools.

- [ ] **4.7 Commit:**

```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
2D: juice — poeira, pulso de objetivo, sons WebAudio e confete
EOF
)"
```

**Pronto quando:** mundo reage ao jogador sem assets novos e sem queda de FPS.

---

## Fase 5 — Touch (joystick flutuante)

**Files:** Modify `index.html` (CSS + listeners no `#mapScroll` / `#mapCanvas`).

- [ ] **5.1** CSS: `#mapScroll, #mapCanvas { touch-action: none; }` e estilos do joystick:

```css
.joy-base{
  position:fixed;z-index:40;width:88px;height:88px;border-radius:50%;
  background:rgba(0,0,0,.28);border:2px solid rgba(255,255,255,.35);
  pointer-events:none;transform:translate(-50%,-50%);
}
.joy-knob{
  position:absolute;left:50%;top:50%;width:44px;height:44px;border-radius:50%;
  background:rgba(255,201,77,.85);transform:translate(-50%,-50%);
  box-shadow:0 2px 8px rgba(0,0,0,.4);
}
```

- [ ] **5.2** Input touch → mesmo `dx,dy` do teclado (estado `TOUCH = { active, dx, dy }` lido no `driveStep` junto com KEYS). Joystick **flutuante** só na metade inferior do mapa:

```js
const TOUCH = { active:false, dx:0, dy:0, id:null, x0:0, y0:0, t0:0, moved:false };
// touchstart na metade inferior: cria .joy-base no ponto; TOUCH.active=true
// touchmove: vetor limitado a 40px; TOUCH.dx/dy = v/40 (mag>0.55 → equivalente a "correr" opcional, ou sempre VMAX andar e mag* VMAX)
// touchend: remove joy; se !moved && dt<200ms && dist<12 → walkTo(coords do toque no canvas); senão zera TOUCH
```

Integrar em `driveStep`:

```js
let dx = (right?1:0)-(left?1:0), dy = (down?1:0)-(up?1:0);
if(TOUCH.active){ dx = TOUCH.dx; dy = TOUCH.dy; }
```

`preventDefault()` nos handlers touch do mapa. Não bloquear botões do header/painel.

- [ ] **5.3** Tap curto (< 200 ms e arrasto < 12 px) → `walkTo` (A* da fase 2). Arrasto longo = dirigir.

- [ ] **5.4** UI: chips/botões do header com alvo mínimo 44×44 px (padding se necessário). Testar os 4 zooms.

- [ ] **5.5 Validar:** DevTools device mode (iPad) — 60 s joystick + 1 missão + 1 tap-to-move.

- [ ] **5.6 Commit:**

```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
2D: joystick virtual flutuante + tap-to-move no touch
EOF
)"
```

**Pronto quando:** jogável de ponta a ponta no tablet, sem teclado.

---

### Fora do escopo

- Modo FPS intocado.
- NPCs/trânsito, minimapa, novos mapas.

### Fontes

- Colisão por máscara: sampling múltiplo + sub-passos anti-tunneling
- Game feel: aceleração × fricção (Game Feel Tips)
- Rotas: A* em grade (PathFinding.js como referência)
- Touch: MDN mobile touch controls; joystick flutuante

### Log de progresso

- (início) plano criado a partir do código + pesquisa
- (ajuste) plano reescrito para execução
- (executado) Fases 1–5 implementadas no código; teste node do A* OK (`391` células → `8` simplificadas); sintaxe JS OK
- Aguardando validação manual no browser pelo professor
