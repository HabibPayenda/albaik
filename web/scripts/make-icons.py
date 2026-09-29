#!/usr/bin/env python3
"""
Generate the Albaik PWA / favicon set with no third-party dependencies.

The mark is a geometric "A" monogram: a royal-sapphire gradient field, a fine
gold ring, white legs and a gold crossbar. Artwork sits well inside the 80%
maskable safe zone so the same PNG works as both `any` and `maskable`.

Edges are antialiased analytically (a smoothstep ramp on the signed distance),
so there is no supersampling and the whole set renders in well under a second.

Run:  python scripts/make-icons.py
Out:  public/pwa-192.png, public/pwa-512.png, public/apple-touch-icon.png,
      public/favicon-32.png
"""

from __future__ import annotations

import math
import os
import struct
import zlib

# ---------------------------------------------------------------- palette

MIDNIGHT = (5, 13, 36)
ROYAL = (14, 59, 156)
COBALT = (26, 79, 207)
GLOW = (61, 112, 232)
GOLD = (212, 175, 55)
WHITE = (255, 255, 255)

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(os.path.dirname(HERE), "public")


# ---------------------------------------------------------------- PNG writer


def write_png(path: str, size: int, pixels: bytearray) -> None:
    """Encode a flat RGBA bytearray (size*size*4) as a PNG."""
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filter type 0 (None)
        raw += pixels[y * stride : (y + 1) * stride]

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    body = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as fh:
        fh.write(body)


# ---------------------------------------------------------------- geometry


def seg_dist(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    """Distance from (px,py) to the line segment (ax,ay)-(bx,by)."""
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    length_sq = vx * vx + vy * vy
    t = 0.0 if length_sq == 0 else (wx * vx + wy * vy) / length_sq
    if t < 0.0:
        t = 0.0
    elif t > 1.0:
        t = 1.0
    return math.hypot(wx - t * vx, wy - t * vy)


def coverage(d: float, half_width: float, aa: float) -> float:
    """Antialiased coverage of a stroke of the given half-width."""
    if d <= half_width - aa:
        return 1.0
    if d >= half_width + aa:
        return 0.0
    t = (half_width + aa - d) / (2.0 * aa)
    return t * t * (3.0 - 2.0 * t)  # smoothstep


# Glyph geometry in normalised 0..1 coordinates.
APEX = (0.500, 0.300)
FOOT_L = (0.298, 0.700)
FOOT_R = (0.702, 0.700)
BAR_Y = 0.566
STROKE = 0.056  # half-width of the legs
BAR_STROKE = 0.026  # half-width of the crossbar

# Where the crossbar meets each leg (solved on the leg's parametric line).
_t = (BAR_Y - APEX[1]) / (FOOT_L[1] - APEX[1])
BAR_L = (APEX[0] + (FOOT_L[0] - APEX[0]) * _t, BAR_Y)
BAR_R = (APEX[0] + (FOOT_R[0] - APEX[0]) * _t, BAR_Y)

RING_RADIUS = 0.355
RING_HALF = 0.0105

GLOW_CENTER = (0.34, 0.24)
GLOW_RADIUS = 0.60


def render(size: int) -> bytearray:
    inv = 1.0 / size
    aa = 1.35 * inv  # ~1.35px feather

    # Gradient lookup keyed by (x + y) so the inner loop is a table read.
    span = 2.0 * (size - 1)
    lut = []
    for k in range(2 * size - 1):
        f = k / span
        if f < 0.5:
            t = f * 2.0
            lut.append(tuple(MIDNIGHT[i] + (ROYAL[i] - MIDNIGHT[i]) * t for i in range(3)))
        else:
            t = (f - 0.5) * 2.0
            lut.append(tuple(ROYAL[i] + (COBALT[i] - ROYAL[i]) * t for i in range(3)))

    gcx, gcy = GLOW_CENTER
    inv_glow = 1.0 / GLOW_RADIUS

    out = bytearray(size * size * 4)
    idx = 0

    for oy in range(size):
        vy = (oy + 0.5) * inv
        dy = vy - 0.5
        dy2 = dy * dy
        gly = vy - gcy
        gly2 = gly * gly
        base_index = oy

        for ox in range(size):
            vx = (ox + 0.5) * inv
            r0, g0, b0 = lut[ox + base_index]

            # soft radial highlight for depth
            glx = vx - gcx
            d_glow = math.sqrt(glx * glx + gly2) * inv_glow
            if d_glow < 1.0:
                t = (1.0 - d_glow) ** 2 * 0.34
                r0 += (GLOW[0] - r0) * t
                g0 += (GLOW[1] - g0) * t
                b0 += (GLOW[2] - b0) * t

            # fine gold ring
            dx = vx - 0.5
            ring = coverage(abs(math.sqrt(dx * dx + dy2) - RING_RADIUS), RING_HALF, aa)
            if ring > 0.0:
                r0 += (GOLD[0] - r0) * ring
                g0 += (GOLD[1] - g0) * ring
                b0 += (GOLD[2] - b0) * ring

            # glyph: white legs, gold crossbar on top
            legs = max(
                coverage(seg_dist(vx, vy, *APEX, *FOOT_L), STROKE, aa),
                coverage(seg_dist(vx, vy, *APEX, *FOOT_R), STROKE, aa),
            )
            if legs > 0.0:
                r0 += (WHITE[0] - r0) * legs
                g0 += (WHITE[1] - g0) * legs
                b0 += (WHITE[2] - b0) * legs

            bar = coverage(seg_dist(vx, vy, *BAR_L, *BAR_R), BAR_STROKE, aa)
            if bar > 0.0:
                r0 += (GOLD[0] - r0) * bar
                g0 += (GOLD[1] - g0) * bar
                b0 += (GOLD[2] - b0) * bar

            o = ox * 4
            out[idx + o] = int(r0 + 0.5)
            out[idx + o + 1] = int(g0 + 0.5)
            out[idx + o + 2] = int(b0 + 0.5)
            out[idx + o + 3] = 255

        idx += size * 4

    return out


def main() -> None:
    os.makedirs(PUBLIC, exist_ok=True)
    for size, name in (
        (512, "pwa-512.png"),
        (192, "pwa-192.png"),
        (180, "apple-touch-icon.png"),
        (32, "favicon-32.png"),
    ):
        path = os.path.join(PUBLIC, name)
        write_png(path, size, render(size))
        print(f"wrote {os.path.basename(path):<22} {os.path.getsize(path):>7,} bytes")


if __name__ == "__main__":
    main()
