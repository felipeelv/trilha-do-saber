# Plano — UI/UX Cidade do Saber (8º/9º ano)

> **Para agentes:** executar fase a fase (checkbox). Validar no browser ao final de cada fase.
> **CWD:** `prototipo-89/`
> **Modo 2D é o principal.** Salvar em `gtaTrilha89V1` **não** alterar. FPS só na fase que citar `fps.html`/`fps.js`.

**Goal:** onboarding claro, mapa utilizável no touch, quiz legível e seguro contra abandono acidental, HUD com menos ruído — sem redesenhar a identidade GTA.

**Stack:** JS puro no `index.html` (padrão do protótipo), sem build, sem libs novas. UI em pt-BR.

**Critério global de pronto:** aluno de 8º/9º entende em <30 s o que fazer; completa 1 missão no celular sem se perder; enunciado do quiz é fácil de ler; fechar o modal no meio do quiz pede confirmação.

---

## Restrições

- Não alterar `SAVE_KEY = 'gtaTrilha89V1'`.
- Não mudar regras de estrelas / desbloqueio / multiplicador (só apresentação).
- Preferir CSS + trechos pequenos de JS no `index.html`.
- Commits **só** dos arquivos da fase.
- Após editar `.js`: `node --check <arquivo>`.
- Servidor local: `python3 -m http.server 8765` em `prototipo-89/`.

## Mapa de arquivos

| Arquivo | Papel neste plano |
|---------|-------------------|
| `index.html` | Quase tudo (CSS + HTML + lógica UI 2D/quiz) |
| `fps.html` / `fps.js` | Só Fase 5 (unificar marca/cores) |
| `PLANO-UX.md` | Este plano |

---

## Fase 0 — Baseline (sem código de produto)

- [ ] Abrir `http://localhost:8765/` e anotar 5 atritos atuais (onboarding, labels touch, quiz, HUD, FPS).
- [ ] Confirmar que progresso/save continua intacto antes de qualquer UI.
- [ ] Decidir nome canônico na UI: **Cidade do Saber** (recomendado) *ou* manter “Grande Trilha…” — registrar aqui a escolha: `_______________`.

**Pronto quando:** checklist mental alinhado; nome escolhido.

---

## Fase 1 — Onboarding + objetivo visível (maior impacto)

**Problema:** aluno cai no mapa sem saber o próximo passo; missão atual escondida no painel.

**Files:** `index.html`

### 1.1 Card flutuante de objetivo
- [ ] Criar `#objectiveCard` fixo (canto superior do mapa ou abaixo do `district-bar`):
  - título curto da missão atual
  - estrelas atuais (ex.: ★★☆)
  - botão **Ir** (reusa lógica de `missionBtn` / walkTo / câmera)
- [ ] Atualizar o card sempre que mudar disciplina, progresso ou missão atual.
- [ ] Se não houver missão disponível: texto “Distrito concluído” / “Abra a elite” conforme regra existente.

### 1.2 Tutorial de 1ª visita
- [ ] Chave `localStorage` separada (ex.: `gtaTrilha89OnboardV1`) — **não** misturar com save de progresso.
- [ ] Overlay de 3 passos:
  1. Ande até a seta amarela
  2. Toque no blip / prédio da missão
  3. Responda e ganhe estrelas
- [ ] Botões: **Próximo** / **Pular**
- [ ] Após concluir ou pular: não mostrar de novo.

### 1.3 Hint de controles
- [ ] Esconder `.drive-hint` após a 1ª tecla/WASD/touch de movimento **ou** após fechar o onboarding.
- [ ] Opcional: reaparecer 1× se o aluno ficar parado >20 s na 1ª sessão (só se não poluir).

### 1.4 Botão “Onde estou?”
- [ ] Controle fixo perto do zoom (`aria-label="Centralizar no personagem"`).
- [ ] Recentra scroll/câmera no `studentPos` (reusar lógica de follow/scroll existente).

### 1.5 Validar
1. Hard refresh / storage limpo da chave de onboard → tutorial aparece.
2. Completar/pular → não reaparece.
3. Card de objetivo leva até a missão.
4. “Onde estou?” funciona com zoom ≠ 1.

### 1.6 Commit
```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
UX: onboarding, card de objetivo e botão centralizar no mapa
EOF
)"
```

**Pronto quando:** em <30 s fica óbvio o próximo passo, no desktop e no celular.

---

## Fase 2 — Quiz legível + seguro

**Problema:** Bebas no enunciado cansa; Esc/✕/overlay abandonam o quiz sem aviso; faltam atalhos de jogo.

**Files:** `index.html`

### 2.1 Tipografia
- [ ] `.q-text` e texto das `.opt` → Barlow (peso 600/700); Bebas só em títulos/HUD/chips.
- [ ] Manter contraste do tema dark (creme sobre fundo escuro).

### 2.2 Confirmar saída no meio do quiz
- [ ] Se `quiz !== null` e usuário fecha (✕, overlay, Esc): `confirm` ou mini-dialog “Sair da missão? O progresso desta tentativa será perdido.”
- [ ] Cancelar = permanece na questão atual.
- [ ] Fora do quiz, fechar continua imediato.

### 2.3 Atalhos de teclado
- [ ] Com quiz aberto e ainda não respondido: `A`–`D` (e `1`–`4`) disparam `answerQuestion`.
- [ ] Com “Próxima” visível: `Enter` / `Espaço` avança.
- [ ] Não capturar atalhos se o foco estiver em input (hoje não há — manter guard).

### 2.4 Feedback acessível
- [ ] `#expBox` com `aria-live="polite"`.
- [ ] Modal: `aria-labelledby` apontando para o título da questão/missão.

### 2.5 Validar
1. Enunciado longo legível.
2. Esc no quiz pede confirmação; Esc no detalhe da fase fecha direto.
3. Teclas A–D e Enter funcionam.
4. Leitor de tela / inspeção: `aria-live` atualiza.

### 2.6 Commit
```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
UX: quiz mais legível, atalhos A–D e confirmação ao sair
EOF
)"
```

**Pronto quando:** tentar uma missão completa só de teclado; abandono acidental bloqueado.

---

## Fase 3 — Mapa touch + labels + HUD limpo

**Problema:** labels só no hover; controles competem no mobile; modal de missão verboso.

**Files:** `index.html`

### 3.1 Labels dos nós
- [ ] Sempre visíveis: missão atual + `available`.
- [ ] `locked`: mostrar cadeado; label no tap (toggle) ou chip “Conclua [missão anterior]” quando o nó for tocado.
- [ ] Evitar overflow: `max-width` + ellipsis ou duas linhas com `line-clamp`.

### 3.2 Modal de missão enxuto
- [ ] Acima da dobra: unidade, título, melhor ★, CTA **Iniciar/Refazer**.
- [ ] Uma linha: “60% = 1★ · 80% = 2★ · 90%+ = 3★”.
- [ ] Tiers Fixação/Aplicação/Desafio em `<details>` “Como funciona”.
- [ ] Mensagens de bloqueio (prev / elite) permanecem claras.

### 3.3 Controles mobile
- [ ] Revisar empilhamento: zoom · onde estou · joystick · toggle do painel sem sobreposição.
- [ ] `env(safe-area-inset-*)` em topbar e controles fixos.
- [ ] Garantir que metade superior do mapa ainda permita pan/scroll quando o stick estiver ativo (não regredir Fase do PLANO-2D).

### 3.4 Painel
- [ ] `#panelToggle` com `aria-expanded` + `aria-controls` do `.side`.
- [ ] Ranking/badges continuam no painel (não no HUD principal).

### 3.5 Validar (celular ou DevTools)
1. Labels das missões disponíveis legíveis sem hover.
2. Modal cabe em tela estreita com CTA visível.
3. Joystick + zoom + “onde estou” sem colisão.
4. Notch/home indicator não cobrem botões.

### 3.6 Commit
```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
UX: labels touch, modal de missão enxuto e HUD mobile
EOF
)"
```

**Pronto quando:** missão completa só com touch, sem abrir o painel lateral.

---

## Fase 4 — A11y, motion e higiene de CSS

**Problema:** `transition: all`, animações sem reduced-motion, CSS do tema “ilha” morto sob o reskin GTA.

**Files:** `index.html`

### 4.1 Motion
- [ ] `@media (prefers-reduced-motion: reduce)`: desligar/pausar shine, pulse, boss-glow, hint-bounce, wig, compass spin, arr-bob (manter feedback essencial estático).

### 4.2 Transitions
- [ ] Trocar `transition: all` em `.tab`, `.qdot`, `.opt` (e similares) por propriedades explícitas (`color`, `background`, `transform`, `border-color`, `box-shadow`).

### 4.3 Modal focus
- [ ] Ao `openModal`: focar o botão primário ou o fechar; ao `closeModal`: devolver foco ao nó/blip que abriu.
- [ ] Tab não escapa do dialog enquanto `.open` (trap simples).

### 4.4 Dark scheme
- [ ] `color-scheme: dark` em `html`/`body`.

### 4.5 Limpeza (cuidado)
- [ ] Remover ou comentar blocos CSS claramente mortos do tema pergaminho/ilha **só se** não forem referenciados.
- [ ] Não misturar refatoração grande com bugfix nesta fase.

### 4.6 Validar
1. OS com reduced-motion: mapa estável, quiz ok.
2. Tab/Shift+Tab preso no modal.
3. Visual GTA intacto.

### 4.7 Commit
```bash
git add prototipo-89/index.html
git commit -m "$(cat <<'EOF'
UX: reduced-motion, focus no modal e CSS de transição explícito
EOF
)"
```

**Pronto quando:** checklist Web Interface Guidelines dos itens desta fase passa no `index.html`.

---

## Fase 5 — Identidade 2D ↔ FPS (opcional, menor urgência)

**Problema:** nomes e accents divergem entre mapa e 1ª pessoa.

**Files:** `index.html`, `fps.html` (± `fps.js` só se texto/HUD)

- [ ] Aplicar nome canônico da Fase 0 nos títulos/HUD.
- [ ] Alinhar accent do FPS ao neon/âmbar do 2D (manter GPS roxo só na rota, se fizer sentido).
- [ ] Mesma tipografia e tom dos botões (ouro / Bebas).
- [ ] Revisar copy do overlay “ENTRAR NA CIDADE” para bater com o onboarding do 2D.

### Validar
1. Ir 2D → FPS → voltar: progresso igual; visual coerente.
2. Quiz no FPS ainda legível (mesmas regras de fonte da Fase 2, se o CSS for espelhado).

### Commit
```bash
git add prototipo-89/index.html prototipo-89/fps.html prototipo-89/fps.js
git commit -m "$(cat <<'EOF'
UX: unificar marca e cores entre mapa 2D e modo 1ª pessoa
EOF
)"
```

**Pronto quando:** os dois modos parecem o mesmo produto.

---

## Fora de escopo (não fazer neste plano)

- Mudar colisão/A*/velocidade (ver `PLANO-2D.md`).
- Novas mecânicas de ranking real / backend.
- Redesign maximalista ou novo tema paralelo ao GTA.
- Mais partículas/glow por estética.

---

## Ordem de execução recomendada

| Ordem | Fase | Por quê |
|------:|------|---------|
| 1 | Fase 1 | Retenção na aula |
| 2 | Fase 2 | Qualidade pedagógica |
| 3 | Fase 3 | Celular na sala |
| 4 | Fase 4 | A11y / higiene |
| 5 | Fase 5 | Polimento cross-mode |

---

## Log de progresso

- (início) plano criado a partir da avaliação UI/UX
- Fase 1: _
- Fase 2: _
- Fase 3: _
- Fase 4: _
- Fase 5: _
