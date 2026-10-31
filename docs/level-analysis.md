# NEON ESCAPE — Level analysis

This report covers how difficulty works under the current rules, how it is measured, what the
analysis found in the original 10 levels, and how the levels were redesigned.

All numbers here come from `npm run levels:analyze`. Scores are a **heuristic estimate**. They
are useful for ordering and comparing levels, but they have **not** been validated against real
players.

---

## 1. What the rules allow

Checked against the code (`GameState.tryMove`, `checkExitPath`, `Grid.remove`):

| Observation | Where it comes from | Holds? |
| --- | --- | --- |
| A blocked tap changes nothing. | `tryMove` returns `blocked` before touching the grid or the counter. | Yes |
| Clearing an arrow only frees cells. | A cleared arrow is removed with `grid.remove`. Nothing is ever added. | Yes |
| A successful move can never make the board less solvable. | Fewer occupied cells can only shorten or clear exit lines. | Yes |
| Any order of free arrows solves a solvable level. | Follows from the above, and is why the greedy solver is complete. | Yes |
| Moves to finish = number of arrows. | `moves++` only on `cleared`; the level is won when no arrows remain. | Yes |

### What that means for puzzle design

- **No dead ends, so no planning.** The player can never make a wrong move that ruins the
  level. Strategic depth such as "which order?" or "don't do that yet" doesn't exist.
- **Difficulty is about searching.** Each step asks which arrows have a clear path out, and the
  question repeats until the board is empty. A level is hard when few arrows are free, when the
  blocker is far down an arrow's line, when bends hide where an arrow points, and when the
  board is busy.
- **The move count can't measure skill.** It is always the arrow count. The saved "best moves"
  record can never differ between two clears of the same layout.
- **Blind tapping always works.** A blocked tap costs nothing, so a player can clear any level
  by tapping at random. Difficulty only shows up as wasted taps and mental effort. Penalties,
  timers or move limits would change this, but they are out of scope by design.

---

## 2. How difficulty is measured

`src/core/difficulty.ts` → `analyzeDifficulty(level)`.

### Exact metrics (computed directly from the rules)

| Metric | Meaning |
| --- | --- |
| `arrows`, `rows × cols`, `density` | Size, and the share of cells covered by arrows. |
| `initialFree`, `blockedShare` | Arrows that can escape on move 1, and the share that can't. |
| `blockingRelations` ("links") | Pairs (A, B) where B stands anywhere on A's exit line at the start. |
| `maxBlockers` | Most arrows standing on one arrow's line. |
| `longRangeBlocks` ("far links") | Links where the blocker is 3+ cells ahead of the head. These are easy to overlook. |
| `depth`, `waves` | Clear every free arrow at once, repeatedly. `waves` lists how many arrows each round frees, and `depth` is the number of rounds (the longest dependency chain). |
| `turns` | Right-angle bends across all arrows. |
| `ambiguousJoins` | Two arrows meeting tail-to-tail in a straight line, so they read as one arrow. |

### Estimated metrics (deterministic simulation)

Simulates a player with no strategy, who taps a random remaining arrow. It runs 200 times
with a fixed seed, so the output is always the same, but it describes a naive tapper, not a
human.

| Metric | Meaning |
| --- | --- |
| `wrongTapsPerMove` | Expected blocked taps before each successful one. Given the free and blocked counts in each state, this is exact, `blocked / (free + 1)`. It is averaged over the simulated play-throughs. |
| `averageChoices` | Average number of escapable arrows when the player looks for a move. |
| `averageFreeShare`, `bottleneckShare` | Average and worst share of remaining arrows that are free. |

### Score (heuristic, 0–100)

Each component is normalised to 0..1. Most use `x / (x + half)`, which gives 0.5 at `half` and
saturates smoothly. The score is the weighted average × 100, rounded.

| Component | Normalisation | Weight | Why |
| --- | --- | --- | --- |
| search | wrong taps per move, half = 2 | 35 | The core task is finding a free arrow. |
| depth | (depth − 1), half = 5 | 20 | Layers to peel off. |
| entanglement | links per arrow, half = 1.5 | 15 | How interlocked the board is. |
| long-range | far links / links | 10 | Blockers far away are easy to miss. |
| size | arrows, half = 20 | 10 | More to scan, with a deliberately small effect. |
| visual | 0.6 × density + 0.4 × (turns per arrow, half = 1) | 10 | Busy, twisty boards are harder to read. |

Arrow count is weighted lightly on purpose. 14 arrows that are all free score lower than a
tangled 8-arrow board (this is covered by a test).

| Score | Category |
| --- | --- |
| 0–15 | Very easy |
| 16–27 | Easy |
| 28–37 | Easy–medium |
| 38–47 | Medium |
| 48–57 | Medium–hard |
| 58–69 | Hard |
| 70–100 | Very hard |

The weights and bands were chosen by judgement and checked against the levels for sensible
ordering. They have not been calibrated with playtest data. Once real players' data exists
(time per level, blocked taps), the weights should be refitted to it.

---

## 3. The original 10 levels

| Level | Grid | Arrows | Free at start | Blocked | Depth | Links | Far links | Wrong taps / move | Avg. choices | Ambiguous joins | Score | Category |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 7×7 | 5 | 3 | 40% | 2 | 2 | 0 | 0.27 | 2.10 | 0 | 14 | Very easy |
| 2 | 7×7 | 7 | 3 | 57% | 3 | 5 | 1 | 0.51 | 2.23 | 0 | 25 | Easy |
| 3 | 7×7 | 9 | 3 | 67% | 4 | 8 | 2 | 0.92 | 2.12 | 0 | 33 | Easy–medium |
| 4 | 7×7 | 11 | 3 | 73% | 4 | 9 | 2 | 0.96 | 2.43 | 2 | 34 | Easy–medium |
| 5 | 7×7 | 13 | 2 | 85% | 5 | 16 | 7 | 1.17 | 2.71 | 2 | 43 | Medium |
| 6 | 8×8 | 14 | 3 | 79% | 5 | 20 | 7 | 1.38 | 2.54 | 1 | 43 | Medium |
| 7 | 8×8 | 12 | 2 | 83% | 6 | 18 | 8 | 1.68 | 1.96 | 0 | 47 | Medium |
| 8 | 8×8 | 16 | 3 | 81% | 7 | 19 | 5 | 1.57 | 2.63 | 1 | 45 | Medium |
| 9 | 9×9 | 21 | 4 | 81% | 9 | 41 | 16 | 2.27 | 2.67 | 1 | 54 | Medium–hard |
| 10 | 9×9 | 20 | 1 | 95% | 10 | 43 | 15 | 3.11 | 1.93 | 0 | 57 | Medium–hard |

### Findings

- **Low ceiling.** The hardest level scored 57 (Medium–hard). No level reached the Hard band,
  so the set never delivered a real challenge.
- **Plateaus.** Levels 3 and 4 were almost identical in difficulty (33 and 34). Levels 5–8 sat
  in a narrow 43–47 band, so four levels felt the same.
- **Poorly ordered.** Level 8 (45) scored below level 7 (47), and levels 5 and 6 tied (43).
- **Easy to sweep.** In levels 1–6, two to three arrows were free at almost every step (average
  choices 2.1–2.7). That can often be solved by scanning the edges for outward-pointing arrows.
- **Repetitive.** Level 4 was three independent chains that never interact. Levels 5, 9 and 10
  all framed the board with long arrows along the border. Levels 4 and 6 used almost only
  straight arrows (one bend each).
- **Visually confusing.** Levels 4 and 5 (two each) and 6, 8 and 9 (one each) had tail-to-tail
  joins: two arrows meeting end-to-end in a line, which read as one long arrow.
- **Too similar to each other.** No pair of levels exceeded the 0.6 layout-similarity threshold.
- **The first levels.** By this measure, levels 2 and 3 were already in the intended Easy range.
  The main problems were the middle and top of the curve, not the start.

---

## 4. The redesign

### Approach

1. **Level 1 kept.** It is a good tutorial: five straight arrows, two of them blocked by one
   free arrow each. It keeps `revision 1`.
2. **Levels 2–10 drafted with the generator.** Each used different settings (grid size, arrow
   length, turns, arrow count, score range), and several candidates were made per level.
3. **Reviewed by eye for readability.** This review found two problems the metrics missed, and
   the generator now rejects both:
   - Arrows that turned twice in a row, folding into a "U" inside a 2×2 square, which reads as
     a blob.
   - Tail-to-tail joins. A bug had let these through: during construction every candidate shared
     a placeholder id, so the join check compared nothing.
4. **Picked for variety, not just score.** Level 7 deliberately has *fewer* arrows than level 6
   but is harder, so difficulty clearly comes from structure, not size.
5. **Every redesigned level** has `revision: 2`, is checked by `validateLevel`, and has no
   ambiguous joins or near-duplicates. This is enforced by `npm run levels:validate` and the
   tests.

| Level | Idea |
| --- | --- |
| 1 | Tutorial (unchanged). |
| 2 | Straight arrows only. One vertical arrow holds up two others and is itself held by a third: the first small chain. |
| 3 | First bent arrows: hooks change direction, so each arrow must be followed to its head. |
| 4 | Long arrows around the edges, some blocked by an arrow several cells away. |
| 5 | Tight 7×7: three free arrows at the start, then mostly one or two moves per step. The sweep stops working here. |
| 6 | First 8×8: 12 of the 18 blocking links are long-range, along empty-looking lines. |
| 7 | 12 arrows, mostly L-hooks, in an eleven-step chain with a single free arrow at almost every step. |
| 8 | Two free arrows at the start and two interlocking L-shapes mid-chain. |
| 9 | Dense 9×9 with long hooks; the chain narrows to one arrow, then opens up near the end. |
| 10 | First major challenge: one free arrow at the start, a fifteen-step chain, 51 links. Long horizontal arrows keep it readable. |

### Results

| Level | Grid | Arrows | Free at start | Blocked | Depth | Links | Far links | Wrong taps / move | Avg. choices | Ambiguous joins | Score | Category |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 7×7 | 5 | 3 | 40% | 2 | 2 | 0 | 0.27 | 2.10 | 0 | 14 | Very easy |
| 2 | 7×7 | 6 | 3 | 50% | 3 | 4 | 0 | 0.63 | 1.79 | 0 | 23 | Easy |
| 3 | 7×7 | 8 | 4 | 50% | 4 | 5 | 0 | 0.61 | 2.35 | 0 | 28 | Easy–medium |
| 4 | 7×7 | 10 | 4 | 60% | 5 | 10 | 4 | 0.84 | 2.44 | 0 | 37 | Easy–medium |
| 5 | 7×7 | 11 | 3 | 73% | 8 | 13 | 4 | 1.58 | 1.65 | 0 | 45 | Medium |
| 6 | 8×8 | 13 | 4 | 69% | 6 | 18 | 12 | 1.43 | 2.22 | 0 | 47 | Medium |
| 7 | 8×8 | 12 | 2 | 83% | 11 | 19 | 9 | 2.57 | 1.08 | 0 | 54 | Medium–hard |
| 8 | 8×8 | 18 | 2 | 89% | 11 | 33 | 16 | 3.10 | 1.68 | 0 | 57 | Medium–hard |
| 9 | 9×9 | 20 | 4 | 80% | 12 | 35 | 20 | 3.16 | 1.98 | 0 | 59 | Hard |
| 10 | 9×9 | 23 | 1 | 96% | 15 | 51 | 27 | 3.73 | 1.77 | 0 | 63 | Hard |

### Old vs new

| Level | Target | Old arrows | Old score | Old category | New arrows | New score | New category | Change |
|---|---|---|---|---|---|---|---|---|
| 1 | Very easy | 5 | 14 | Very easy | 5 | 14 | Very easy | 0 |
| 2 | Easy | 7 | 25 | Easy | 6 | 23 | Easy | −2 |
| 3 | Easy | 9 | 33 | Easy–medium | 8 | 28 | Easy–medium | −5 |
| 4 | Easy–medium | 11 | 34 | Easy–medium | 10 | 37 | Easy–medium | +3 |
| 5 | Medium | 13 | 43 | Medium | 11 | 45 | Medium | +2 |
| 6 | Medium | 14 | 43 | Medium | 13 | 47 | Medium | +4 |
| 7 | Medium–hard | 12 | 47 | Medium | 12 | 54 | Medium–hard | +7 |
| 8 | Hard | 16 | 45 | Medium | 18 | 57 | Medium–hard | +12 |
| 9 | Hard | 21 | 54 | Medium–hard | 20 | 59 | Hard | +5 |
| 10 | Hard | 20 | 57 | Medium–hard | 23 | 63 | Hard | +6 |

- **Ordering.** Scores now rise every level (14 → 63) with no ties or reversals. The step
  between neighbours ranges from 2 (levels 5 and 6) to 9.
- **The first levels are not harder.** Levels 2 and 3 score slightly lower than before (3 now
  introduces bends instead of adding blockers). The added difficulty is in levels 4–10. If
  playtesting shows 2–3 are too easy, regenerate them with a higher range, for example
  `--min 26 --max 32`.
- **The hard end is much harder.** Levels 7–10 average 58, against 23 for levels 1–3. The
  hardest levels leave about one or two escapable arrows per step, and level 7 averages just 1.1.
- **Level 8 sits just under its target.** It scores 57, one point below the Hard band (58+).
  It is still clearly above level 7 and below level 9.

---

## 5. Limitations

- **The score is an estimate.** It ranks levels consistently but has not been validated against
  human solve times, and the weights and bands are judgement calls.
- **Planning can't be made harder.** Since no move can hurt, difficulty can only come from search
  and perception. Boards above about 65 tend to become long single-file chains: one free arrow,
  then the next. That is harder to scan but not more interesting, which is why level 10 stops
  at 63.
- **The generator needs refinement to reach the top.** Building in reverse order alone tops out
  around 55. Reaching the Hard band needs the refinement step, which makes small random edits
  and keeps those that bring the score into range. Such levels are still validated, but they
  should always be reviewed by eye before shipping.
- **The move count isn't a score.** "Best moves" always equals the arrow count. Counting blocked
  taps, for example, would make records meaningful, but that is a game-design decision for a
  later step.
- **Some readability problems need a human.** The validator catches tail-to-tail joins and
  near-duplicate layouts, but not every way a board can look confusing.

---

## 6. Reproducing this report

```bash
npm run levels:analyze
```

```bash
npm run levels:analyze -- --level 7
```

```bash
npm run levels:analyze -- --json
```

```bash
npm run levels:validate
```

The first prints the summary table. The second shows one level in detail: its map, every
metric, and the score breakdown. The third prints all the data as JSON. The fourth checks
validity, solvability, ambiguous joins and near-duplicates, and exits with code 1 if any level
has a problem.

---

## 7. Lives model (added with three lives, red arrows and chain reactions)

Step 6 changed the rules. A blocked tap now costs one of three lives and turns the arrow red,
and red arrows leave automatically once their path clears. Section 1 still holds for *moves*:
no move can make the board unsolvable. But mistakes now cost something, so a level can be
**failed**. The search model above is unchanged. A second model sits beside it:

`analyzeDifficulty(level).lives` plays the level 200 times per strategy, using the real
`GameState` rules and a fixed seed. Lives are uncapped in the simulation, so every mistake is
counted. A run "finishes within 3 lives" if it needed at most two mistakes.

| Strategy | Behaviour |
| --- | --- |
| Random tapper | Taps a random arrow that isn't red. Knows nothing about the board. |
| Near-sighted tapper | Only taps arrows whose very next cell is empty or off the board, picking randomly among them; otherwise it guesses. It catches adjacent blockers and misses distant ones. |

| Metric | Meaning |
| --- | --- |
| Expected mistakes | Average blocked taps needed to clear the board. |
| Finishes within 3 lives | Share of runs with at most two mistakes. |
| Chain clears | Average arrows cleared by chain reactions per run. For the random tapper this equals its mistakes: every red arrow eventually leaves on its own. |
| Deceptive arrows | Arrows whose next cell is clear but which are blocked further along. These catch players who only glance ahead. |
| Risk score | 0–100 = 100 × (0.6 × near-sighted failure rate + 0.4 × random failure rate). |

These are simple scripted strategies. A careful player who follows each arrow's whole line
makes **no** mistakes on any level, so real players will do far better than either strategy.

### Levels at the time (revision 2; superseded, see section 8)

| Level | Search score | Random: mistakes | Random: finishes | Near-sighted: mistakes | Near-sighted: finishes | Chain clears (random) | Deceptive arrows | Risk |
|---|---|---|---|---|---|---|---|---|
| 1 | 14 | 1.0 | 100% | 0.5 | 100% | 1.0 | 1 | 0 |
| 2 | 23 | 2.2 | 57% | 0.3 | 100% | 2.2 | 0 | 17 |
| 3 | 28 | 2.6 | 47% | 1.4 | 100% | 2.6 | 1 | 21 |
| 4 | 37 | 3.8 | 14% | 2.3 | 63% | 3.8 | 3 | 57 |
| 5 | 45 | 5.9 | 1% | 1.9 | 79% | 5.9 | 2 | 53 |
| 6 | 47 | 6.9 | 0% | 5.2 | 2% | 6.9 | 6 | 99 |
| 7 | 54 | 8.5 | 0% | 5.0 | 0% | 8.5 | 4 | 100 |
| 8 | 57 | 13.3 | 0% | 6.4 | 0% | 13.3 | 7 | 100 |
| 9 | 59 | 13.4 | 0% | 7.3 | 0% | 13.4 | 7 | 100 |
| 10 | 63 | 18.1 | 0% | 8.0 | 0% | 18.1 | 8 | 100 |

### What this means

- **Levels 1–3 are forgiving.** Even a player who only glances one cell ahead finishes them
  every time.
- **Levels 4–5 start punishing glancing.** They have three and two deceptive arrows.
- **Levels 6–10 can't be finished by guessing.** With six to eight deceptive arrows each,
  neither simple strategy finishes within three lives. The player has to trace every arrow's
  whole line before tapping. The levels are fair (they need no mistakes at all), but the step
  from level 5 to level 6 is now steep for players who guess.
- **These levels were designed before lives existed** and were deliberately not changed in this
  step. If playtesting confirms the jump, the simplest fixes are to reduce the deceptive arrows
  in levels 6–7, or to move a forgiving level between 5 and 6.
- **The generator** still targets the search score. Its refinement calls skip the lives model,
  for speed. Check new levels with `npm run levels:analyze -- --level N`, which shows both models.

---

## 8. Step 13: redesign of Levels 4–30

Levels 1–3 are unchanged. Levels 4–30 were regenerated from `tools/level-plan.json` with the
`levels:plan` tool (Levels 4–10 → revision 4, Levels 11–30 → revision 2). Earlier sections
describe older layouts.

### Goals and how they are enforced

| Goal | Generator setting | Checked by |
| --- | --- | --- |
| Use the board, no large empty regions | `minDensity` 0.74, `maxEmptySquare` 2 (new layout metrics `density`, `largestEmptySquare`) | `levels.test.ts`: fill ≥ 74 %, no empty 3×3 |
| Long, winding arrows over short ones | `minLength` 3, `lengthWeight` 0.6, `length` 8–11, `turns` 3–4 | every arrow ≥ 3 cells, mean ≥ 4.2, most arrows bend |
| Blocking, not counting | score and `depth` ranges, `maxFree` | more blocking links than arrows; free share ≤ ~1/3 |
| Portrait boards for phones | `rows` > `cols`, up to 17 × 12 | grid shape test; `fitBoardSlot` tests |
| Gradual curve with spikes at 10, 20, 30 | non-overlapping score ranges; spikes at higher score, deeper chains, 1–3 free arrows | score never drops between spikes; spike ≥ previous + 3 and deeper; next level drops back |
| Distinct | near-duplicate check against every level, now including mirror images and 90° turns of rectangular boards | similarity ≤ 0.6 for every pair |

### Results (from `npm run levels:analyze`)

| Level | Grid | Arrows | Fill | Mean length | Free | Depth | Score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 9×7 | 9 | 79% | 5.6 | 3 | 5 | 38 |
| 5 | 10×7 | 10 | 74% | 5.2 | 3 | 6 | 43 |
| 6 | 10×8 | 14 | 75% | 4.3 | 2 | 8 | 48 |
| 7 | 11×8 | 14 | 75% | 4.7 | 3 | 8 | 51 |
| 8 | 11×8 | 15 | 75% | 4.4 | 3 | 9 | 53 |
| 9 | 12×9 | 15 | 77% | 5.5 | 3 | 9 | 53 |
| **10** | 12×9 | 17 | 77% | 4.9 | 1 | **15** | **62** |
| 11 | 12×9 | 19 | 74% | 4.2 | 3 | 11 | 56 |
| 12 | 13×9 | 21 | 79% | 4.4 | 4 | 10 | 56 |
| 13 | 13×10 | 22 | 76% | 4.5 | 4 | 10 | 58 |
| 14 | 13×10 | 21 | 75% | 4.6 | 3 | 11 | 58 |
| 15 | 14×10 | 23 | 76% | 4.6 | 4 | 12 | 58 |
| 16 | 14×10 | 21 | 75% | 5.0 | 4 | 12 | 60 |
| 17 | 14×11 | 25 | 74% | 4.6 | 5 | 14 | 61 |
| 18 | 15×11 | 25 | 75% | 4.9 | 3 | 14 | 63 |
| 19 | 15×11 | 25 | 75% | 4.9 | 5 | 13 | 63 |
| **20** | 15×11 | 26 | 75% | 4.7 | 2 | **18** | **67** |
| 21 | 15×11 | 23 | 76% | 5.4 | 4 | 16 | 63 |
| 22 | 15×12 | 27 | 75% | 5.0 | 3 | 15 | 64 |
| 23 | 16×12 | 31 | 74% | 4.6 | 6 | 13 | 64 |
| 24 | 16×12 | 28 | 75% | 5.1 | 5 | 14 | 65 |
| 25 | 16×12 | 31 | 75% | 4.6 | 4 | 16 | 65 |
| 26 | 16×12 | 29 | 74% | 4.9 | 6 | 17 | 66 |
| 27 | 17×12 | 30 | 75% | 5.1 | 6 | 18 | 66 |
| 28 | 17×12 | 29 | 75% | 5.2 | 6 | 15 | 66 |
| 29 | 17×12 | 33 | 75% | 4.7 | 6 | 17 | 66 |
| **30** | 17×12 | 30 | 75% | 5.1 | 3 | **19** | **69** |

### Cascades and these numbers

Step 13 also added cascades (see README, "Cascades"): after three clean moves in a row, up to two
arrows the next move unblocks leave automatically. The search score ignores them; the lives
model plays the real rules, so its simulated players benefit from cascades a little. Cascades
never change solvability (they only remove arrows that are already free).

### Limitations

- The score still saturates in the high 60s, so late levels are separated mainly by depth and
  board size. Depth is not monotonic level by level (only the score curve is enforced).
- Spikes are defined by the heuristic score, depth and opening size. They have not been
  playtested.
- Regenerating from the plan from scratch may pick different seeds, because each level avoids
  near-duplicates of whatever levels exist at that time.

---

## 9. Step 14: full-coverage Levels 4–30

Levels 4–30 were regenerated with the fill-first generator (`src/levelgen/fillLevel.ts`,
plan entries with `"fill": true`): Levels 4–10 → revision 5, Levels 11–30 → revision 3.
Levels 1–3 are unchanged. Section 8 describes the Step 13 layouts, which are kept in
`src/levels/archive/step13/` for Daily League pool 4.

### Coverage before and after

| Levels | Step 13 coverage | Step 14 coverage |
| --- | --- | --- |
| 4–10 | 74–79 % | 100 % |
| 11–20 | 74–79 % | 100 % |
| 21–30 | 74–76 % | 100 % (Level 29: 99.5 %, one stranded cell) |

### Why full coverage works with these rules

An arrow is free when its exit line is empty. On a fully covered board that is only true for an
arrow whose head is on the edge pointing out, so a full board is solvable exactly when its
"who blocks whom" graph has no cycle. The generator covers the board with paths first, then
breaks cycles by flipping a head (the same path, pointing the other way) or, rarely, splitting
an arrow in two. Neither changes coverage. The price is a few 2-cell arrows (≤ 12 % per level)
and openings that are easy to see; depth (up to 18 layers on Level 30) carries the difficulty.

### Curve

Scores rise without a dip between spikes (40 → 54, 56 → 64, 64 → 68), with spikes at Level 10
(62, depth 13), Level 20 (68, depth 15) and Level 30 (73, depth 18). The analysis plays bonus
clears as a quick player (every streak counts).
