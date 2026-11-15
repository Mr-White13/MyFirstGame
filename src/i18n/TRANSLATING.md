# Translating NEON ESCAPE

The game ships in English (source), Spanish and Romanian. Code: `src/i18n/`.

## How it works

- `t('area.key', { name: value })` returns the text in the current language (`translate.ts`).
  The language is picked once at startup (`boot.ts`, imported first by `main.ts`) from the
  Settings choice (`auto` = device language) and changing it reloads the page.
- Each area has one file in `messages/` with `en`, `es` and `ro` tables side by side,
  declared with `defineMessages` — the compiler rejects a missing or extra key.
- `index.html` static text is marked with `data-i18n="html.key"` (element text; icons kept),
  `data-i18n-aria`, `data-i18n-title`, `data-i18n-placeholder`, and translated by `dom.ts`
  at startup (only for non-English).
- `i18n.test.ts` checks: same keys in every language, same `{placeholders}`, no empty text,
  and that every English `html.*` message equals the text written in `index.html`.

## Rules

1. **English output never changes.** The `en` text is byte-identical to the old hard-coded
   string, so every golden test passes untouched. Never run `UPDATE_GOLDEN=1` for this work.
2. **No `t()` at module top level.** A constant built while modules load can be English in
   tests or out of order. Translate at render time: turn constant tables into functions, or
   keep keys in the table and call `t()` where the text is used.
3. **Whole sentences, not fragments.** Word order differs between languages: one message with
   placeholders (`'Finish Chapter {chapter} to see the next levels'`), never
   `'Finish ' + x + ' to see'`. Pass the pieces a sentence needs as parameters.
4. **Plurals** use `{ one, few, other }` with a `count` parameter when the English changes
   with the number. English and Spanish use `one`/`other`; **Romanian needs all three**:
   `one: '{count} stea'`, `few: '{count} stele'` (2–19), `other: '{count} de stele'` (20+).
   The English forms must reproduce the old output exactly.
5. **Numbers**: plain `{count}` placeholders print plain digits (as before). Where the code used
   `toLocaleString('en-US')`, use `formatNumber(n)` (same English output, `1.234` in es/ro).
   **Dates**: `toLocaleDateString(undefined, …)` → `toLocaleDateString(dateLocale(), …)`.
6. **Not translated**: player-entered text and generated nicknames (stored data), brand names
   (NEON ESCAPE, Mr. White Games), storage keys and ids, console/log/debug text, the hidden
   diagnostics overlay, developer error messages, level validation/generator messages.
7. **Length**: Spanish and Romanian run ~30% longer. Buttons, chips and tabs get short
   translations; a long label in a tight spot is a bug.
8. **Tone**: informal — Spanish *tú* (neutral, not regional slang), Romanian *tu*.
   Correct diacritics: Romanian ș ț (comma below, not ş ţ), ă â î; Spanish á é í ó ú ñ ¿ ¡.

## Glossary

| English | Español | Română |
|---|---|---|
| Level 30 | Nivel 30 | Nivelul 30 |
| Chapter 2 | Capítulo 2 | Capitolul 2 |
| Play / Continue / Resume / Play again | Jugar / Continuar / Reanudar / Jugar de nuevo | Joacă / Continuă / Reia / Joacă din nou |
| Back / Close / Cancel / OK | Atrás / Cerrar / Cancelar / Aceptar | Înapoi / Închide / Anulează / OK |
| Restart / Next level | Reiniciar / Siguiente nivel | Repornește / Nivelul următor |
| arrow(s) | flecha(s) | săgeată / săgeți |
| heart(s) (lives) | vida(s) | viață / vieți |
| star(s) | estrella(s) | stea / stele |
| Hint / Reveal (boosters) | Pista / Revelar | Indiciu / Dezvăluie |
| booster | potenciador | bonus |
| Energy Credits / credits | Créditos de Energía / créditos | Credite de Energie / credite |
| Energy Points | Puntos de Energía | Puncte de Energie |
| Daily League / league | Liga Diaria / liga | Liga Zilnică / ligă |
| promotion / relegation | ascenso / descenso | promovare / retrogradare |
| challenge | desafío | provocare |
| Daily reward / streak | Recompensa diaria / racha | Recompensa zilnică / serie |
| Achievements / Awards | Logros | Realizări |
| Shop / Profile / Settings / Records | Tienda / Perfil / Ajustes / Récords | Magazin / Profil / Setări / Recorduri |
| best time / personal record | mejor tiempo / récord personal | cel mai bun timp / record personal |
| Easy / Medium / Hard / Very hard | Fácil / Media / Difícil / Muy difícil | Ușor / Mediu / Greu / Foarte greu |
| Dark Neon / Light / Colorful / System | Neón oscuro / Claro / Colorido / Sistema | Neon întunecat / Luminos / Colorat / Sistem |
| Auto / On / Off | Auto / Sí / No | Auto / Da / Nu |
| rewarded ad | anuncio con recompensa | reclamă cu recompensă |
| avatar / frame | avatar / marco | avatar / ramă |
