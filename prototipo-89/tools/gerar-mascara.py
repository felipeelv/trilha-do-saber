#!/usr/bin/env python3
"""Gera assets/mascara.js a partir de assets/cidade.png.

Pipeline:
  1) downsample 192x336
  2) threshold asfalto (cinza médio + baixa saturação), sem água
  3) dilatação 1 célula (conecta a malha)
  4) mantém só a maior componente 4-conectada
  5) recorta interiores grossos (distance-transform <= 2) → ruas ~2–4 células
  6) maior componente de novo + engrossa corredores 1-célula
  7) emite mascara.js + preview PNG

Uso (CWD = prototipo-89):
  python3 tools/gerar-mascara.py
"""
from __future__ import annotations

import collections
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "cidade.png"
OUT_JS = ROOT / "assets" / "mascara.js"
OUT_PREVIEW = ROOT / "tools" / "mascara-preview.png"

W, H = 192, 336

CITY_NODES = [
    (0.140, 0.949), (0.282, 0.938), (0.855, 0.934), (0.539, 0.914),
    (0.611, 0.894), (0.096, 0.868), (0.417, 0.834), (0.283, 0.824),
    (0.130, 0.759), (0.562, 0.751), (0.858, 0.750), (0.356, 0.749),
    (0.423, 0.683), (0.140, 0.676), (0.852, 0.674), (0.260, 0.670),
    (0.130, 0.634), (0.826, 0.632), (0.568, 0.630), (0.360, 0.609),
    (0.111, 0.587), (0.900, 0.581), (0.848, 0.558), (0.646, 0.550),
    (0.637, 0.434), (0.151, 0.430), (0.826, 0.423), (0.421, 0.421),
    (0.278, 0.368), (0.616, 0.357), (0.721, 0.354), (0.825, 0.349),
    (0.451, 0.305), (0.153, 0.304), (0.859, 0.298), (0.399, 0.296),
    (0.148, 0.205), (0.385, 0.191), (0.845, 0.186), (0.665, 0.185),
    (0.875, 0.126), (0.154, 0.123), (0.324, 0.122), (0.670, 0.120),
    (0.154, 0.064), (0.324, 0.063), (0.845, 0.061), (0.500, 0.151),
]

LUM_LO, LUM_HI = 55, 135
SAT_MAX = 0.14
BLUE_MARGIN = 12
MAX_DIST = 2  # half-width da rua após limpeza


def is_asphalt(r: int, g: int, b: int) -> bool:
    mx, mn = max(r, g, b), min(r, g, b)
    sat = (mx - mn) / (mx + 1e-6)
    avg = (r + g + b) / 3.0
    if b > r + BLUE_MARGIN and b > g + (BLUE_MARGIN - 5):
        return False
    return sat <= SAT_MAX and LUM_LO <= avg <= LUM_HI


def grid_from_image(img: Image.Image) -> list[list[int]]:
    small = img.resize((W, H), Image.Resampling.BILINEAR)
    pix = list(small.getdata())
    grid = [[0] * W for _ in range(H)]
    for y in range(H):
        row = pix[y * W : (y + 1) * W]
        for x, (r, g, b) in enumerate(row):
            grid[y][x] = 1 if is_asphalt(r, g, b) else 0
    return grid


def dilate(grid: list[list[int]], rad: int = 1) -> list[list[int]]:
    out = [[0] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if not grid[y][x]:
                continue
            for dy in range(-rad, rad + 1):
                for dx in range(-rad, rad + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        out[ny][nx] = 1
    return out


def components(grid: list[list[int]]) -> list[list[tuple[int, int]]]:
    seen = [[False] * W for _ in range(H)]
    comps: list[list[tuple[int, int]]] = []
    for y in range(H):
        for x in range(W):
            if not grid[y][x] or seen[y][x]:
                continue
            q = collections.deque([(x, y)])
            seen[y][x] = True
            cells = [(x, y)]
            while q:
                cx, cy = q.popleft()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < W and 0 <= ny < H and grid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
                        cells.append((nx, ny))
            comps.append(cells)
    return comps


def keep_largest(grid: list[list[int]]) -> tuple[list[list[int]], int, int]:
    comps = components(grid)
    n_comps = len(comps)
    if not comps:
        return [[0] * W for _ in range(H)], 0, 0
    comps.sort(key=len, reverse=True)
    out = [[0] * W for _ in range(H)]
    for x, y in comps[0]:
        out[y][x] = 1
    return out, len(comps[0]), n_comps


def dist_to_wall(grid: list[list[int]]) -> list[list[int]]:
    inf = 10**9
    d = [[inf] * W for _ in range(H)]
    q: collections.deque[tuple[int, int]] = collections.deque()
    for y in range(H):
        for x in range(W):
            if not grid[y][x]:
                d[y][x] = 0
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and d[ny][nx] > d[y][x] + 1:
                d[ny][nx] = d[y][x] + 1
                q.append((nx, ny))
    return d


def clip_by_distance(grid: list[list[int]], max_d: int) -> list[list[int]]:
    d = dist_to_wall(grid)
    return [[1 if grid[y][x] and d[y][x] <= max_d else 0 for x in range(W)] for y in range(H)]


def thicken_corridors(grid: list[list[int]]) -> list[list[int]]:
    out = [row[:] for row in grid]
    for y in range(H):
        for x in range(W):
            if not grid[y][x]:
                continue
            left = x > 0 and grid[y][x - 1]
            right = x + 1 < W and grid[y][x + 1]
            up = y > 0 and grid[y - 1][x]
            down = y + 1 < H and grid[y + 1][x]
            horiz = int(left) + int(right)
            vert = int(up) + int(down)
            if vert >= 1 and horiz == 0:
                for nx in (x - 1, x + 1):
                    if 0 <= nx < W:
                        out[y][nx] = 1
            if horiz >= 1 and vert == 0:
                for ny in (y - 1, y + 1):
                    if 0 <= ny < H:
                        out[ny][x] = 1
    return out


def count_ones(grid: list[list[int]]) -> int:
    return sum(sum(row) for row in grid)


def snap_to_walkable(grid: list[list[int]], fx: float, fy: float, max_r: int = 45):
    gx0 = min(W - 1, max(0, int(fx * W)))
    gy0 = min(H - 1, max(0, int(fy * H)))
    if grid[gy0][gx0]:
        return gx0, gy0, True
    for r in range(1, max_r):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if max(abs(dx), abs(dy)) != r:
                    continue
                nx, ny = gx0 + dx, gy0 + dy
                if 0 <= nx < W and 0 <= ny < H and grid[ny][nx]:
                    return nx, ny, True
    return gx0, gy0, False


def write_js(grid: list[list[int]]) -> None:
    rows = ["".join("1" if c else "0" for c in row) for row in grid]
    rows_js = ", ".join(f'"{r}"' for r in rows)
    text = (
        "/* máscara de colisão da cidade (1 = rua andável) — "
        "gerada por tools/gerar-mascara.py a partir de cidade.png */\n"
        f"window.MASCARA = {{ w:{W}, h:{H}, rows:[{rows_js}] }};\n"
    )
    OUT_JS.write_text(text, encoding="utf-8")


def write_preview(img: Image.Image, grid: list[list[int]]) -> None:
    base = img.resize((W * 4, H * 4), Image.Resampling.BILINEAR).convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(H):
        for x in range(W):
            if grid[y][x]:
                draw.rectangle(
                    [x * 4, y * 4, x * 4 + 3, y * 4 + 3],
                    fill=(255, 212, 0, 110),
                )
    Image.alpha_composite(base, overlay).save(OUT_PREVIEW)


def main() -> int:
    if not SRC.exists():
        print(f"ERRO: não encontrei {SRC}")
        return 1

    img = Image.open(SRC).convert("RGB")
    print(f"fonte: {SRC.name} {img.size[0]}x{img.size[1]}")

    grid = grid_from_image(img)
    print(f"após threshold: {count_ones(grid)} ({100 * count_ones(grid) / (W * H):.1f}%)")

    grid = dilate(grid, 1)
    grid, main_n, n_in = keep_largest(grid)
    print(f"após dilatação + maior componente: {main_n} ({100 * main_n / (W * H):.1f}%) | comps_in={n_in}")

    grid = clip_by_distance(grid, MAX_DIST)
    grid, main_n, n_in = keep_largest(grid)
    print(f"após clip dist<={MAX_DIST}: {main_n} ({100 * main_n / (W * H):.1f}%) | comps_in={n_in}")

    grid = thicken_corridors(grid)
    grid, main_n, n_in = keep_largest(grid)
    pct = 100 * main_n / (W * H)
    comps_out = len(components(grid))
    print(f"após engrossar: {main_n} ({pct:.1f}%) | comps={comps_out}")

    missions_bad = 0
    for fx, fy in CITY_NODES:
        _, _, ok = snap_to_walkable(grid, fx, fy)
        if not ok:
            missions_bad += 1
    print(f"missões snap OK: {48 - missions_bad}/48")

    write_js(grid)
    write_preview(img, grid)
    print(f"escrito: {OUT_JS.relative_to(ROOT)}")
    print(f"preview: {OUT_PREVIEW.relative_to(ROOT)}")

    pct_ok = 15.0 <= pct <= 28.0
    island_ok = comps_out == 1
    ok = pct_ok and island_ok and missions_bad == 0
    print("---")
    print(f"critério % andável 15–28: {'OK' if pct_ok else 'FALHOU'} ({pct:.1f}%)")
    print(f"critério 1 componente: {'OK' if island_ok else 'FALHOU'} ({comps_out})")
    print(f"critério missões: {'OK' if missions_bad == 0 else 'FALHOU'} (bad={missions_bad})")
    print("RESULTADO:", "PASSOU" if ok else "FALHOU")
    # Fase 4 arte: só se falhar — aqui sucesso ⇒ não regenerar cidade.png
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
