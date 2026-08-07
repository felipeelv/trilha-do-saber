/* rota A* sobre a máscara de ruas — puro, testável via node */
window.ROTA = (function(){
  function aStar(m, ini, fim){
    const K = (x, y) => y * m.w + x;
    const aberto = [[0, ini[0], ini[1]]];
    const veio = {}, g = { [K(ini[0], ini[1])]: 0 };
    const h = (x, y) => Math.abs(x - fim[0]) + Math.abs(y - fim[1]);
    let achou = false;
    while(aberto.length){
      aberto.sort((a, b) => a[0] - b[0]);
      const [, cx, cy] = aberto.shift();
      if(cx === fim[0] && cy === fim[1]){ achou = true; break; }
      for(const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]){
        const nx = cx + dx, ny = cy + dy;
        if(nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
        if(m.rows[ny][nx] !== '1') continue;
        const ng = g[K(cx, cy)] + 1;
        if(ng < (g[K(nx, ny)] ?? Infinity)){
          g[K(nx, ny)] = ng;
          veio[K(nx, ny)] = [cx, cy];
          aberto.push([ng + h(nx, ny), nx, ny]);
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
