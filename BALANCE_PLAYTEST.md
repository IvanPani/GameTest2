# First roguelite balance pass

## Decision

Keep the current 1,000 currency price, full-score reward on death, and upgrade effects for now. Player feedback for this pass was: **“A few minutes, with steady progress.”** No typical score, timed run sample, or before/after handling rating was supplied, so this is a provisional baseline rather than a claim that the game is fully balanced.

Main and results now show currency remaining until the next purchasable upgrade, or a message that an upgrade is affordable. This makes progress from a losing run explicit. Completion of both upgrade trees is handled without offering a nonexistent next purchase.

## Findings

Regenerate the arithmetic comparison with `npm run balance:report`; the checked-in output is `BALANCE_BASELINE.md`.

- Twelve pickups with combo resets every four pickups yield 120 currency: nine comparable runs to a first purchase. This is the main potential early-game grind risk.
- Twenty-five pickups with resets every ten yield 380: three comparable runs to a purchase.
- Fifty pickups without a reset yield 1,540: an upgrade in one run. A perfect streak first reaches the price at 37 pickups.
- Fabric level 1 raises hearts from 3 to 4 (+33% hits to death). Max Fabric raises them to 8. This does not guarantee proportional survival time because speed, hazard density and invulnerability also matter.
- Steering level 1 reduces weight-related response delay by 20%; max level reduces it about 56%. At 60 kg, speed after 50 ms of input from rest rises from about 47.6 px/s to 58.3 at level 1 and 96.9 at level 5. This arithmetic confirms an effect, not subjective handling quality.
- All ten purchases cost 10,000. Holding rewards artificially constant implies about 7 strong runs versus 84 short interrupted runs. Real upgrade-assisted survival will change these rates. The long-term cap remains a content limitation; once all upgrades are owned, this particular replay goal ends.

## Next human playtest

Record at least five runs per build: no upgrades, Fabric level 1 only, Steering level 1 only. Use the same device/input method and alternate builds to reduce the effect of learning the game. A comparable route/seed would improve control, but the current game does not provide a seeded replay.

| Run | Build / levels | Duration (seconds) | Pickups | Score / currency | Damage hits | Control feel (1–5) | Replay motivation / notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Proposed targets to validate, not measured outcomes:

- First upgrade in roughly 3–5 ordinary runs (6–15 minutes if runs take 2–3 minutes).
- A poor run visibly advances the next purchase, without ten repeated poor attempts being the only way forward.
- Players notice Fabric's extra survivable hit and Steering's improvement when carrying weight, while keeping a reason to dodge and manage movement.
- Players can explain what the next purchase will improve and want another run after buying it.

If typical runs consistently produce under 200 currency, revisit early reward pacing or the first purchase price. If normal players buy every level in a handful of runs, revisit later-level pacing or add content. Preserve the current requested fixed 1,000 price until measured feedback warrants a change.

## Banking milestone

Banking remains future work. Today death awards the entire score. A later checkpoint should show secured and at-risk rewards and offer bank/end or continue deeper. Retention on death, checkpoint frequency, and whether cash-out ends a run must be defined together. Rebalance prices only after that payout rule exists, because changing reward retention changes earning rates.

## Validation

`npm test` passes 16 tests. Coverage includes repeated death payouts accumulating into a purchase, no duplicate settlement, ownership across reload, next-run bonuses, upgrade-goal states including both caps, saved purchases, insufficient funds and save-failure rollback. Browser verification uses the isolated upgrade-shop fixture and checks updated result balance/goal and return to Main. The production build passes.
