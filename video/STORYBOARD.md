# Storyboard — EDGE promo (32 s · 120 BPM · 16 bars · A minor)

This is the part that code can't do for you: shots, rhythm, what the viewer should feel.
Timing lives in `storyboard.json`. **Both** `video/scene.js` and `music/compose.py` read it,
so if you move a cut here, the picture and the sound move together.

1 bar = 2 s · 1 beat = 0.5 s · 30 fps → 1 beat = 15 frames

| # | Bars | Time | Scene | Picture | Sound |
|---|------|------|-------|---------|-------|
| 0 | 0–2 | 0–4 s | `open` | Black → the contour background fades in. A dot pulses on each beat, and a tick lands on the baseline each beat. "Every trade / **tells a story.**" reveals; small line: JOURNAL · REVIEW · IMPROVE. Text lifts out at 3.2 s. | Am9 pad, one soft blip per beat (the ticks you see). Riser 2.2 → 4.0 s. |
| 1 | 2–5 | 4–10 s | `candles` | **01 — THE MARKET.** 64 candles pop in on 32nd notes, the camera pushes in 7%, an MA line draws, and a live price tag follows. At 8.6 s the candles collapse into dots at their close. | Impact on the cut. Kick, hats and bass come in. **Each candle is a note** pitched from its close price, panned left → right. |
| 2 | 5–8 | 10–16 s | `equity` | **02 — YOUR EDGE.** The equity curve (real demo trades) draws with a glowing head; the NET P&L counter follows the head. At 14.4 s the max-drawdown window is highlighted in red. | Impact. Arp enters. A quiet tone climbs with the line's progress (same inOutCubic). |
| 3 | 8–11 | 16–22 s | `stats` | **03 — THE NUMBERS.** "The numbers don't lie." Four KPI cards slam in **one per beat**, and the numbers roll up with outExpo. The win-rate ring lights up dot by dot. The setup bars grow. | Clap enters. A thud per card, plus a **counter roll** whose ticks follow the same outExpo curve as the digits. |
| 4 | 11–14 | 22–28 s | `calendar` | **04 — YOUR HABITS.** A 21-week heatmap pops in as a diagonal wave. Mood bars (Calm → Revenge). Callout: "FOMO + revenge trades cost you $X". Zooms out at the end. | Breakdown: no kick. A sparkle per heatmap diagonal, a pluck per mood bar, and a falling chirp on the callout. Riser into the outro. |
| 5 | 14–16 | 28–32 s | `outro` | Logo springs in, the check-mark draws, then EDGE / TRADING JOURNAL, then the Thai tagline "จดทุกเทรด เห็นทุกบทเรียน". A faint equity line behind. Fade out over the last 0.9 s. | Impact. FM-bell arpeggio A–E–A–C–E, then the reverb tail. |

**Global:** white flash + chromatic-aberration spike on every cut, film grain, vignette,
a camera bump on each kick, a progress "tape" along the bottom, and a chapter marker bottom-left.

## Direction notes (things I changed after looking at renders)
- The chapter label collided with "NET P&L" when the camera zoomed, so it moved to the bottom-left.
- The equity glow spiked at sharp joins, so the miter is clamped at 2× and the glow is narrower.
- The demo seed was chosen so the story reads as realistic (win rate ~48%, PF ~1.6, DD ~7%) and the FOMO lesson is clearly negative.
- The master measured -8.8 LUFS, so it is now RMS-normalized to about -14 LUFS with a soft limiter and a -2 dBTP true peak.
