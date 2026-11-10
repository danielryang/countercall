#!/usr/bin/env python3
"""halftone.py in.png out.png [--cell 7] [--angle 45] [--ink '#14161D'] [--spot '#1B4DFF'] [--spot-offset 3] [--gamma 0.85] [--ss 3] [--width 1600] [--colors 16] [--no-spot] [--lo 0.04] [--hi 0.92]
Two-ink riso-style halftone: ink dots (45 deg) over an offset spot-colour layer (15 deg). White or transparent areas stay empty (transparent PNG out)."""
import argparse, math, numpy as np
from PIL import Image

def hexrgb(h): h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255

def layer(dark, cell, angle, k, ss):
    """dark: HxW float 0..1 at output res. returns HxW coverage 0..1 (supersampled by ss)."""
    H, W = dark.shape; Hs, Ws = H * ss, W * ss
    ys, xs = np.mgrid[0:Hs, 0:Ws].astype(np.float32); xs /= ss; ys /= ss
    a = math.radians(angle); c, s = math.cos(a), math.sin(a)
    u = xs * c + ys * s; v = -xs * s + ys * c                       # rotate into screen space
    cu = (np.floor(u / cell) + .5) * cell; cv = (np.floor(v / cell) + .5) * cell
    cx = cu * c - cv * s; cy = cu * s + cv * c                       # cell centre back in image space
    d = np.clip(dark[np.clip(cy.astype(int), 0, H - 1), np.clip(cx.astype(int), 0, W - 1)], 0, 1)
    r = cell * 0.5 * k * np.sqrt(d)                                  # dot radius ~ sqrt(darkness) -> area ~ darkness
    dist = np.hypot(xs - cx, ys - cy)
    cov = np.clip((r - dist) * ss + .5, 0, 1)                        # 1px-wide AA at supersampled res
    return cov.reshape(H, ss, W, ss).mean(axis=(1, 3)) if ss > 1 else cov

def main():
    p = argparse.ArgumentParser(); p.add_argument('inp'); p.add_argument('out')
    p.add_argument('--cell', type=float, default=7); p.add_argument('--angle', type=float, default=45)
    p.add_argument('--ink', default='#14161D'); p.add_argument('--spot', default='#1B4DFF'); p.add_argument('--spot-offset', type=float, default=3)
    p.add_argument('--gamma', type=float, default=0.85); p.add_argument('--ss', type=int, default=3); p.add_argument('--width', type=int, default=1600)
    p.add_argument('--no-spot', action='store_true'); p.add_argument('--lo', type=float, default=0.04, help='luminance mapped to full ink'); p.add_argument('--hi', type=float, default=0.92, help='luminance mapped to no ink (kills off-white backgrounds from image models)'); p.add_argument('--colors', type=int, default=16, help='palette size for PNG-8 output (0 = keep RGBA)')
    a = p.parse_args()
    im = Image.open(a.inp).convert('RGBA')
    if im.width > a.width: im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
    arr = np.asarray(im, dtype=np.float32) / 255
    lum = 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]
    lum = np.clip((lum - a.lo) / (a.hi - a.lo), 0, 1)
    dark = ((1 - lum) ** a.gamma) * arr[..., 3]                      # transparent or white -> no dots
    H, W = dark.shape
    ink = layer(dark, a.cell, a.angle, 1.18, a.ss)
    out = np.zeros((H, W, 4), np.float32)
    if not a.no_spot:                                                # spot layer: lighter tones only, other angle, shifted
        o = int(round(a.spot_offset)); sh = np.roll(np.roll(dark, o, 0), o, 1)
        spot = layer(np.clip(sh * 0.75, 0, 1) ** 1.3, a.cell * 1.15, a.angle - 30, 1.05, a.ss)
        sc = hexrgb(a.spot); out[..., :3] = sc; out[..., 3] = spot
    ic = hexrgb(a.ink); al = ink
    out[..., :3] = np.where(al[..., None] > 0, (ic * al[..., None] + out[..., :3] * out[..., 3:4] * (1 - al[..., None])) / np.maximum(al[..., None] + out[..., 3:4] * (1 - al[..., None]), 1e-6), out[..., :3])
    out[..., 3] = al + out[..., 3] * (1 - al)
    img = Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8), 'RGBA')
    if a.colors: img = img.quantize(colors=a.colors, method=Image.Quantize.FASTOCTREE)   # ~6x smaller, dots are two flat inks
    img.save(a.out, optimize=True)
    print(a.out, im.size, 'dots cell', a.cell)

if __name__ == '__main__': main()
