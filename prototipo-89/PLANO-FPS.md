# Plano — Modo 1ª Pessoa (FPS) na Cidade do Saber

Objetivo: modo de visão em primeira pessoa dentro da cidade, estilo retrô, sincronizado com o
progresso do mapa 2D. Página nova `fps.html` + `fps.js` (o mapa 2D continua intacto e vira o "GPS").

Stack: Three.js via CDN (r149, UMD), sem build. Reaproveita: `assets/cidade.png` (textura do chão),
`assets/mascara.js` (colisão), `questoes/*.js` (quiz), mesma chave de save (`gtaTrilha89V1`).

---

## Fase 1 — Terreno e câmera
- [x] Cena Three.js: céu, névoa de distância, luz ambiente + direcional
- [x] Chão = plano gigante com `cidade.png` como textura (coordenadas do mapa 2D → mundo 3D)
- [x] Câmera em 1ª pessoa (altura dos olhos), WASD/setas + olhar com mouse (pointer lock), Shift corre
- [x] Entrada pelo botão "1ª pessoa" na barra de distritos do mapa 2D

**Critério de pronto**: abrir `fps.html` e caminhar sobre a textura da cidade com mouse-look. ✅ (sintaxe validada; aguardando teste do professor)

## Fase 2 — Prédios 3D e colisão
- [x] Máscara de prédios gerada da imagem (prédio ≠ rua/água/vegetação), em `assets/predios.js`
- [x] Extrusão em blocos 3D (greedy-merge de retângulos; altura por distrito: downtown mais alto)
- [x] Colisão do jogador contra prédios/água (mesma lógica da máscara 2D)
- [x] Água como plano azul abaixo do nível da rua; bordas do mapa bloqueadas

**Critério de pronto**: cidade sólida navegável, sem atravessar prédios nem cair na água. ✅ (724 blocos com cor do telhado, InstancedMesh; colisão AABB com deslize; sintaxe validada)

## Fase 3 — Missões no mundo 3D
- [x] Marcadores flutuantes (sprite brilhante com cor da disciplina; coroa vermelha na elite)
- [x] Feixe de luz na missão atual (como a seta amarela do 2D)
- [x] Proximidade → "Pressione E" → quiz overlay (mesmas questões, estrelas, XP, multiplicador)
- [x] Progresso salvo na mesma chave do mapa 2D (modos sincronizados)

**Critério de pronto**: concluir uma missão em 1ª pessoa e vê-la marcada no mapa 2D. ✅ (lógica de desbloqueio/save testada via node)

## Fase 4 — Polimento e integração
- [x] HUD mínimo: distrito atual + dica de controles + botão "voltar ao mapa"
- [x] Ajustes de céu/névoa/luz e desempenho
- [x] Validação final (sintaxe, testes) + abrir para o professor testar
- [x] Atualizar PLANO.md e publicar (git commit/push)

**Critério de pronto**: modo 1ª pessoa jogável e publicado em https://felipeelv.github.io/trilha-do-saber/prototipo-89/fps.html ✅

---

### Log de progresso
- (início) plano criado
- **Fase 1 concluída**: `fps.html` + `fps.js` — cena, chão com textura da cidade, mar, céu, névoa, pointer lock, WASD/setas/Shift, botão "🎮 1ª pessoa" no mapa 2D
- **Fase 2 concluída**: `assets/predios.js` (724 blocos extrudados com cor do telhado, altura por distrito) + colisão AABB com deslize
- **Fase 3 concluída**: marcadores 3D flutuantes (✓ concluída / cor disciplina / ★ elite / cinza bloqueada), feixe dourado na missão atual, prompt "Pressione E", quiz overlay com as mesmas 240 questões, XP/estrelas/multiplicador salvos na mesma chave do 2D
- **Fase 4 concluída**: HUD com o distrito atual conforme a posição, botão "← MAPA", validação final e publicação no GitHub Pages

**PROJETO FPS CONCLUÍDO** 🏁 — as 4 fases entregues e no ar.
