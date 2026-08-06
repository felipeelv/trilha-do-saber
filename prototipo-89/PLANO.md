# Plano — rodada "ruas de verdade" (protótipo GTA 8º/9º ano)

Pedidos do professor (ordem de execução):

1. **Remover a "Área bloqueada" (névoa) da tela**
   - Tirar as faixas escuras de névoa de guerra e o rótulo "Área bloqueada".
   - A regra de bloqueio das missões continua (ordem + estrelas para a elite), só sem marcação visual no mapa.
   - Arquivos: `index.html` (remover geração de `fogHtml`, CSS `.fog`, dados `fog` do CITY ficam sem uso).

2. **Mapa maior, com mais ruas**
   - Regerar `assets/cidade.png` (9:16): metrópole mais extensa e com malha de ruas mais densa (mais ruas, quarteirões menores), ruas em asfalto cinza uniforme (ajuda a colisão).
   - Canvas um pouco maior na tela (1080 → 1180px).
   - Re-extrair coordenadas: prédios das missões (marcos nas elites), avenidas, placas.

3. **Personagem só anda nas ruas (colisão que funciona)**
   - Nova máscara de colisão **só de asfalto** gerada da imagem nova (`assets/mascara.js`), com dilatação de 1 célula para não criar bolsões.
   - Movimento por setas/WASD com deslize nas paredes; fora das ruas e da água não anda.
   - Nascimento/parada sempre encaixados na rua mais próxima (anti-travamento).
   - Verificação visual da máscara antes de integrar.

## Checklist

- [ ] Névoa removida (visual), mecânica de bloqueio mantida
- [ ] Nova cidade (maior, mais ruas) gerada e inspecionada
- [ ] Coordenadas re-extraídas e conferidas em prévia
- [ ] Máscara de asfalto gerada, dilatada e inspecionada
- [ ] Colisão reativada; personagem anda só nas ruas sem travar
- [ ] Sintaxe + testes OK; aberto no navegador
