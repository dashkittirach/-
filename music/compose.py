#!/usr/bin/env python3
"""Algorithmic soundtrack for the EDGE promo — pure code, no samples, no AI audio.

Reads video/storyboard.json (the same file the WebGL scene reads) so every
kick, riser and impact lands on the exact frame where the picture cuts.
Some sounds are *sonification*: the candle ticks are pitched from the same
seeded candle data the video draws, and counter "rolls" follow the same easing
curve the on-screen numbers use.

    python3 music/compose.py            -> music/out/soundtrack.wav
    python3 music/compose.py --stems    also writes one wav per layer

Needs only numpy.
"""
import json
import math
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
BOARD = json.loads((ROOT / "video" / "storyboard.json").read_text())
OUT = ROOT / "music" / "out"

SR = 44100
BPM = BOARD["bpm"]
BEAT = 60 / BPM
BAR = BEAT * BOARD["beatsPerBar"]
DUR = BOARD["bars"] * BAR
N = int(round(DUR * SR))
RNG = np.random.default_rng(BOARD["seed"])

SCENES = {s["id"]: {**s, "t0": s["bars"][0] * BAR, "t1": s["bars"][1] * BAR} for s in BOARD["scenes"]}


def layers_at(t):
    for s in SCENES.values():
        if s["t0"] <= t < s["t1"]:
            return set(s["music"]["layers"])
    return set()


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ------------------------------------------------------------------ harmony
# i – VI – III – VII in A minor, one chord per bar.
CHORDS = [
    {"root": 45, "voicing": [57, 60, 64, 67, 71]},  # Am9
    {"root": 41, "voicing": [53, 57, 60, 64, 67]},  # Fmaj9
    {"root": 48, "voicing": [55, 60, 64, 67, 69]},  # C6/9-ish
    {"root": 43, "voicing": [55, 60, 62, 64, 67]},  # G6sus
]
PENTA = [0, 3, 5, 7, 10]  # A minor pentatonic, relative to A


def penta(i, base=69):
    o, k = divmod(i, len(PENTA))
    return base + 12 * o + PENTA[k]


def chord_at(t):
    return CHORDS[int(t // BAR) % len(CHORDS)]


# ------------------------------------------------------------------ mixing buses
class Bus:
    def __init__(self, name):
        self.name = name
        self.buf = np.zeros((N, 2))

    def add(self, t, sig, gain=1.0, pan=0.0):
        """Place mono or stereo `sig` at time t (s). pan -1..1 (equal power)."""
        i = int(round(t * SR))
        if i >= N or len(sig) == 0:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: N - i]
        if sig.ndim == 1:
            a = (pan + 1) * math.pi / 4
            sig = np.stack([sig * math.cos(a), sig * math.sin(a)], axis=1) * math.sqrt(2)
        self.buf[i : i + len(sig)] += sig * gain


BUSES = {k: Bus(k) for k in ["pad", "kick", "hat", "clap", "bass", "arp", "fx", "sonify", "bell"]}


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def env(dur, a=0.005, r=0.2, hold=None, curve=4.0):
    """Attack then exponential-ish release. hold = seconds before release begins."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    h = a if hold is None else hold
    rel = np.clip((t - h) / max(r, 1e-4), 0, 1)
    return e * np.exp(-curve * rel) * (1 - rel) ** 0.5


def onepole_lp(x, cutoff):
    """One-pole low-pass (cutoff may be an array for sweeps)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    g = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # short signals only
        acc += g[i] * (x[i] - acc)
        y[i] = acc
    return y


def hp(x):
    return np.diff(x, prepend=0.0)


# ------------------------------------------------------------------ instruments
def saw(f, dur, harmonics=16, bright=5.0, phase_seed=0):
    t = tvec(dur)
    out = np.zeros_like(t)
    ph = np.random.default_rng(phase_seed).uniform(0, 2 * np.pi, harmonics + 1)
    for k in range(1, harmonics + 1):
        if f * k > 10000:
            break
        out += np.sin(2 * np.pi * f * k * t + ph[k]) * (1 / k) * math.exp(-k / bright)
    return out


def pad_chord(notes, dur):
    L = np.zeros(int(dur * SR))
    R = np.zeros_like(L)
    for j, m in enumerate(notes):
        for d, (cents, side) in enumerate([(-9, -0.8), (0, 0.0), (9, 0.8)]):
            s = saw(mtof(m) * 2 ** (cents / 1200), dur, 12, 3.5, phase_seed=m * 7 + d)
            L += s * (1 - side) * 0.5
            R += s * (1 + side) * 0.5
    e = env(dur, a=0.6, r=0.9, hold=dur - 0.9, curve=2.5)
    return np.stack([L * e, R * e], axis=1) / len(notes)


def kick():
    t = tvec(0.45)
    f = 44 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.16)
    click = RNG.standard_normal(len(t)) * np.exp(-t / 0.003) * 0.3
    return np.tanh((body + click) * 1.6)


def hat(open_=False):
    d = 0.22 if open_ else 0.05
    t = tvec(d)
    n = hp(hp(RNG.standard_normal(len(t))))
    return n * np.exp(-t / (0.07 if open_ else 0.012)) * 0.35


def clap():
    t = tvec(0.35)
    n = hp(RNG.standard_normal(len(t)))
    e = np.zeros_like(t)
    for k, off in enumerate([0, 0.011, 0.022]):
        e += np.exp(-np.clip(t - off, 0, None) / 0.006) * (t >= off) * (0.8 if k < 2 else 1.0)
    e += np.exp(-np.clip(t - 0.022, 0, None) / 0.09) * (t >= 0.022) * 0.4
    return n * e * 0.5


def bass_note(m, dur):
    f = mtof(m)
    t = tvec(dur)
    s = saw(f, dur, 10, 2.2, phase_seed=m) * 0.7 + np.sin(2 * np.pi * f * t) * 0.8
    return np.tanh(s * 1.3) * env(dur, a=0.004, r=dur * 0.7, hold=dur * 0.25, curve=3)


def pluck(m, dur=0.5, bright=1.0):
    f = mtof(m)
    t = tvec(dur)
    s = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(4 * np.pi * f * t) * np.exp(-t / 0.05)
    s += 0.15 * bright * np.sin(6 * np.pi * f * t) * np.exp(-t / 0.02)
    return s * np.exp(-t / (dur * 0.28)) * np.minimum(1, t / 0.002)


def bell(m, dur=3.0):
    f = mtof(m)
    t = tvec(dur)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t / 0.6)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 1.1) * np.minimum(1, t / 0.003)


def blip(m, dur=0.12):
    t = tvec(dur)
    return np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t / 0.03) * np.minimum(1, t / 0.001)


def riser(dur):
    t = tvec(dur)
    x = t / dur
    noise = RNG.standard_normal(len(t))
    n = onepole_lp(noise, 300 + 9000 * x ** 2.2) * x ** 2
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 1400 * x ** 3) / SR) * x ** 3 * 0.25
    return (n * 0.5 + sweep) * np.minimum(1, (1 - x) * 40)  # hard stop at the cut


def impact():
    t = tvec(2.0)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.55)
    crash = hp(RNG.standard_normal(len(t))) * np.exp(-t / 0.35) * 0.18
    return np.tanh((boom * 1.2 + crash) * 1.5)


def chirp_down():
    t = tvec(0.3)
    f = 900 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.1) * 0.5


# ------------------------------------------------------------------ data shared with the video
def mulberry32(seed):
    """Bit-exact port of lib/ease.js mulberry32 so Python hears what JS draws."""
    s = seed & 0xFFFFFFFF

    def rnd():
        nonlocal s
        s = (s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (1 | s)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rnd


def demo_candles(n=64, seed=11, start=100.0):
    rnd = mulberry32(seed)
    p, out = start, []
    for i in range(n):
        drift = math.sin(i / 9) * 0.004 + 0.0015
        o = p
        c = o * (1 + drift + (rnd() - 0.5) * 0.028)
        rnd(), rnd()  # high/low draws (kept in sync with the JS generator)
        out.append((o, c))
        p = c
    return out


def seg_time(start, dur, y, curve="outExpo"):
    """Inverse of the video's eased progress: when does ease(seg(t)) reach y?"""
    if curve == "outExpo":
        x = -math.log2(max(1e-9, 1 - y)) / 10
    else:
        x = y
    return start + min(1.0, x) * dur


# ------------------------------------------------------------------ arrangement
def compose():
    beats = int(DUR / BEAT)
    sixteenth = BEAT / 4

    # pad: one chord per bar, everywhere
    for b in range(BOARD["bars"]):
        t0 = b * BAR
        if "pad" in layers_at(t0 + 0.01):
            BUSES["pad"].add(t0, pad_chord(chord_at(t0)["voicing"], BAR + 0.9), 0.55)

    # drums + bass on the 16th grid
    for i in range(beats * 4):
        t = i * sixteenth
        L = layers_at(t + 1e-4)
        step = i % 16
        if "kick" in L and step in (0, 4, 8, 12):
            BUSES["kick"].add(t, kick(), 0.9)
        if "kick" in L and step == 14 and (i // 16) % 2 == 1:
            BUSES["kick"].add(t, kick(), 0.5)
        if "hat" in L:
            if step % 4 == 2:
                BUSES["hat"].add(t, hat(open_=True), 0.5, pan=0.25)
            elif step % 2 == 1 or "kick" in L:
                BUSES["hat"].add(t, hat(), 0.35 + 0.25 * (step % 4 == 0), pan=-0.2)
        if "clap" in L and step in (4, 12):
            BUSES["clap"].add(t, clap(), 0.7, pan=0.05)
        if "bass" in L and step % 2 == 0:
            root = chord_at(t)["root"]
            pat = [0, 0, 12, 0, 0, 7, 12, 10]
            m = root + pat[(step // 2) % 8]
            BUSES["bass"].add(t, bass_note(m, sixteenth * 1.8), 0.38)

    # arp: 16ths through chord tones + pentatonic, seeded so it never changes
    arp_rng = np.random.default_rng(BOARD["seed"] + 1)
    for i in range(beats * 4):
        t = i * sixteenth
        if "arp" not in layers_at(t + 1e-4):
            continue
        v = chord_at(t)["voicing"]
        order = [0, 2, 4, 3, 1, 2, 4, 3]
        m = v[order[i % 8]] + 12 * (i % 16 >= 12)
        if arp_rng.random() < 0.18:
            continue
        BUSES["arp"].add(t, pluck(m, 0.35, 0.9), 0.22 + 0.08 * (i % 4 == 0), pan=math.sin(i * 0.7) * 0.6)

    # ---- scene-specific, synced to the storyboard ----
    op, cd, eq, st, cal, out = (SCENES[k] for k in ["open", "candles", "equity", "stats", "calendar", "outro"])

    # open: a soft tick per beat — the ticks the video draws on the baseline
    for i in range(8):
        BUSES["sonify"].add(op["t0"] + i * BEAT, blip(penta(i % 5, 81), 0.18), 0.18, pan=(i - 3.5) / 5)

    # candles: every candle that pops in is a note, pitched by its close price
    candles = demo_candles(64, 11, 100)
    lo, hi = min(c for _, c in candles), max(c for _, c in candles)
    for i, (o, c) in enumerate(candles):
        t = cd["t0"] + 0.15 + i * (BEAT / 8)
        k = int((c - lo) / (hi - lo) * 9)
        BUSES["sonify"].add(t, blip(penta(k, 69), 0.1) * (1.0 if c >= o else 0.6), 0.16, pan=(i / 63) * 1.4 - 0.7)

    # equity: a quiet tone that climbs with the line's draw progress
    d = 4.2
    t = tvec(d)
    x = t / d
    prog = np.where(x < 0.5, 4 * x ** 3, 1 - (-2 * x + 2) ** 3 / 2)  # inOutCubic, same as video
    f = mtof(57) * 2 ** (prog * 2)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x) ** 0.5
    BUSES["sonify"].add(eq["t0"] + 0.15, tone, 0.07)

    # stats: four cards slam in on beats; their counters "roll" with the same outExpo
    for k in range(4):
        at = st["t0"] + 0.25 + k * BEAT
        BUSES["fx"].add(at, impact()[: int(0.5 * SR)] * 0.5, 0.5)
        for j in range(1, 16):
            tt = seg_time(at + 0.15, 1.1, j / 16)
            BUSES["sonify"].add(tt, blip(penta(j // 2 + k, 81), 0.05), 0.08, pan=(k - 1.5) / 2)

    # calendar: one sparkle per diagonal of the heatmap wave
    for k in range(27):
        BUSES["sonify"].add(cal["t0"] + 0.3 + k * 0.035, blip(penta(k % 12, 81), 0.15), 0.1, pan=(k / 26) * 1.6 - 0.8)
    for k in range(5):  # mood bars
        BUSES["sonify"].add(cal["t0"] + 2.4 + k * BEAT / 2, pluck(penta(4 - k, 57) - (12 if k >= 2 else 0), 0.5), 0.25)
    BUSES["fx"].add(cal["t0"] + 4.1, chirp_down(), 0.35)

    # outro: bell arpeggio over the logo, then the final chord rings out
    for k, m in enumerate([69, 76, 81, 84, 88]):
        BUSES["bell"].add(out["t0"] + k * BEAT * 0.5, bell(m, 3.5), 0.22 / (1 + k * 0.2), pan=(k - 2) / 3)

    # risers into cuts + impacts on cuts (the video flashes on the same frames)
    for s in BOARD["scenes"]:
        if s["music"].get("impact"):
            BUSES["fx"].add(SCENES[s["id"]]["t0"], impact(), 0.8)
        if s["music"].get("riserInto"):
            cut = SCENES[s["music"]["riserInto"]]["t0"]
            BUSES["fx"].add(cut - 1.8, riser(1.8), 0.35)


# ------------------------------------------------------------------ fx + master
def sidechain(kick_times, depth=0.55, rel=0.14):
    g = np.ones(N)
    t = np.arange(N) / SR
    for tk in kick_times:
        i = int(tk * SR)
        seg_ = t[i : i + int(rel * 6 * SR)] - tk
        g[i : i + len(seg_)] = np.minimum(g[i : i + len(seg_)], 1 - depth * np.exp(-seg_ / rel))
    return g[:, None]


def reverb(x, seconds=2.4, damp=0.6):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(99)
    ir = rng.standard_normal((n, 2)) * np.exp(-t / (seconds / 6.9))[:, None]
    for c in range(2):  # darker tail
        ir[:, c] = np.convolve(ir[:, c], np.ones(8) / 8, mode="same") * (1 - damp) + ir[:, c] * damp * np.exp(-t / 0.3)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    L = N + n
    size = 1 << (L - 1).bit_length()
    out = np.fft.irfft(np.fft.rfft(x, size, axis=0) * np.fft.rfft(ir, size, axis=0), size, axis=0)
    return out[:N]


def pingpong(x, delay, fb=0.4, taps=5):
    out = x.copy()
    d = int(delay * SR)
    for k in range(1, taps + 1):
        g = fb ** k
        sh = np.zeros_like(x)
        sh[d * k :] = x[: N - d * k]
        if k % 2:
            sh = sh[:, ::-1]
        out += sh * g
    return out


def master():
    kick_times = [i * BEAT for i in range(int(DUR / BEAT)) if "kick" in layers_at(i * BEAT + 1e-4)]
    duck = sidechain(kick_times)
    B = {k: b.buf for k, b in BUSES.items()}
    B["pad"] *= duck
    B["bass"] *= duck ** 0.7
    B["arp"] = pingpong(B["arp"], BEAT * 0.75, 0.35)
    for k in ("hat", "clap", "fx"):  # tame energy right at Nyquist (inter-sample peaks)
        b = B[k]
        B[k] = 0.25 * np.roll(b, 1, axis=0) + 0.5 * b + 0.25 * np.roll(b, -1, axis=0)

    dry = B["pad"] * 0.9 + B["kick"] + B["hat"] * 0.8 + B["clap"] + B["bass"] + B["arp"] + B["fx"] + B["sonify"] + B["bell"]
    send = B["pad"] * 0.35 + B["arp"] * 0.5 + B["clap"] * 0.3 + B["sonify"] * 0.6 + B["bell"] * 0.8 + B["fx"] * 0.25
    mix = dry + reverb(send) * 0.55

    t = np.arange(N) / SR
    fade = np.minimum(1, t / 0.02) * np.clip((DUR - t) / 1.0, 0, 1) ** 1.5
    mix *= fade[:, None]
    # loudness: RMS-normalise to roughly -14 LUFS, then a soft-knee limiter
    # keeps sample peaks under -3 dBFS (headroom for inter-sample peaks) without squashing the transients flat
    mix *= 10 ** (-15.5 / 20) / max(1e-9, np.sqrt((mix ** 2).mean()))
    knee, room = 0.5, 0.2
    over = np.abs(mix) > knee
    mix[over] = np.sign(mix[over]) * (knee + room * np.tanh((np.abs(mix[over]) - knee) / room))
    return mix, B


def write_wav(path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    compose()
    mix, buses = master()
    write_wav(OUT / "soundtrack.wav", mix)
    print(f"✓ music/out/soundtrack.wav  {DUR:.1f}s  {BPM} bpm  {BOARD['key']}")
    if "--stems" in sys.argv:
        for k, b in buses.items():
            peak = np.abs(b).max()
            if peak > 0:
                write_wav(OUT / "stems" / f"{k}.wav", b / peak * 0.9)
        print("✓ stems in music/out/stems/")
