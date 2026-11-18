#!/usr/bin/env python3
"""Build vent-sprites/lungs-atlas.png, the lung art for the LTV 1200 Free Play
test lung (see "The LTV 1200 test lung picture" in the README).

Layout: six conditions down (normal, copd, asthma, ards, pneumonia,
pulmonary_edema), three poses across (rest, part-filled, full). Each cell is
the pose plus a 2px transparent gutter, so a neighbour never bleeds in when
the browser scales a cell. The page addresses cells by percentage, so it does
not care about the pixel size — but the cell's aspect ratio is written into
the page's CSS (.lv-stage aspect-ratio) and into test/ventlungview.test.mjs,
so change those too if it changes.

Two sources:

  --overview SEQUENCE_OVERVIEW.png
      The 3×6 review sheet from the art pack. Low resolution (≈250 px a
      pose) but it is what the first build used.
  --pack <unzipped pack folder>
      source_original/<condition>/{rest,full_inspiration}.png, the 1254 px
      originals. Use this when it is available.

Two corrections are made to the art, whichever source is used:

  1. The asthma and COPD full-inspiration poses are swapped. As delivered,
     asthma's full pose was drawn in the COPD style (dusky, no bronchospasm
     bands) and COPD's in the asthma style (bright, banded), so bronchospasm
     appeared to vanish at end-inspiration in asthma and appear from nowhere
     in COPD. Palette and band counts make the pairing unambiguous.
  2. The part-filled pose is rebuilt as the full pose at 50% opacity over the
     rest pose. That is how the pack made it (it reproduces the delivered
     part-filled frames to within 0.5/255), so after the swap the part-filled
     frame is remade from the corrected pair instead of carrying the old one.

Usage:  python3 build-atlas.py --overview SEQUENCE_OVERVIEW.png
        python3 build-atlas.py --pack ~/Downloads/ventilator3000_sprites --cell 250
"""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image

CONDS = ['normal', 'copd', 'asthma', 'ards', 'pneumonia', 'pulmonary_edema']
GUTTER = 2
SWAP_FULL = ('asthma', 'copd')

# Where the poses sit on SEQUENCE_OVERVIEW.png (978×1744): tile left edges,
# tile top edges, tile size. Found by scanning for the tile background.
OV_COLS, OV_ROWS, OV_W, OV_H = [193, 448, 703], [55, 334, 613, 892, 1171, 1450], 250, 248
OV_TILE_BG, OV_PAGE_BG = (20, 31, 50), (11, 18, 32)


def cut_background(tile):
    """Flood-fill the flat tile background from the edges to transparent."""
    t = tile.convert('RGBA'); px = t.load(); w, h = t.size
    near = lambda c, ref, tol: max(abs(c[i] - ref[i]) for i in range(3)) <= tol
    seen = set(); q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or (x, y) in seen: continue
        c = px[x, y]
        if not (near(c, OV_TILE_BG, 14) or near(c, OV_PAGE_BG, 8)): continue
        seen.add((x, y)); px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return t


def from_overview(path):
    im = Image.open(path).convert('RGB')
    get = lambda r, c: cut_background(im.crop((OV_COLS[c], OV_ROWS[r], OV_COLS[c] + OV_W, OV_ROWS[r] + OV_H)))
    return {cond: {'rest': get(r, 0), 'full': get(r, 2)} for r, cond in enumerate(CONDS)}, (OV_W, OV_H)


def from_pack(folder, cell):
    root = Path(folder) / 'source_original'
    load = lambda cond, name: Image.open(root / cond / name).convert('RGBA').resize((cell, cell), Image.LANCZOS)
    return {c: {'rest': load(c, 'rest.png'), 'full': load(c, 'full_inspiration.png')} for c in CONDS}, (cell, cell)


def trachea_rows(img):
    """The trachea's inner rows, below the opening and above the carina:
    [(y, left, right)], left/right being the first and last wall pixels."""
    import colorsys
    px = img.load(); w, h = img.size
    a = img.getchannel('A').getbbox()
    if not a: return []
    cx = (a[0] + a[2]) // 2
    inside = lambda p: p[3] > 200 and colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)[2] > 0.45
    rows, first = [], None
    for y in range(a[1] + int(0.11 * h), a[1] + int(0.6 * h)):   # starts below the cup-shaped opening
        if not inside(px[cx, y]): break                          # the carina's dark gap
        L = cx
        while L > 0 and inside(px[L - 1, y]): L -= 1
        R = cx
        while R < w - 1 and inside(px[R + 1, y]): R += 1
        first = first or (R - L)
        if R - L > 1.6 * first: break                            # fanning out into the main bronchi
        rows.append((y, L, R))
    return rows


def clear_trachea_arrows(full, rest):
    """Replace the inside of the full pose's trachea with the rest pose's.

    Four of the full poses had airflow arrows drawn in the trachea. They are
    frozen in the art, so they point the same way all breath (asthma's pointed
    out of the lung at end-inspiration), and the page draws airflow itself from
    the computed flow. The rest poses have a plain ringed trachea, so each row
    of the full pose's trachea takes the matching row of the rest pose's,
    stretched to the full pose's width. The wall outline is left alone.
    """
    out = full.copy(); po = out.load(); pr = rest.load()
    F, Rr = trachea_rows(full), trachea_rows(rest)
    if len(F) < 2 or len(Rr) < 2: return out
    for k, (y, L, R) in enumerate(F):
        yr, Lr, RR = Rr[round(k * (len(Rr) - 1) / (len(F) - 1))]
        for x in range(L, R + 1):
            u = (x - L) / max(1, R - L)
            po[x, y] = pr[round(Lr + u * (RR - Lr)), yr]
    return out


def part_filled(rest, full):
    half = full.copy(); half.putalpha(full.getchannel('A').point(lambda a: a // 2))
    out = rest.copy(); out.alpha_composite(half)
    return out


def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument('--overview'); src.add_argument('--pack')
    ap.add_argument('--cell', type=int, default=250, help='pose size in px (pack only)')
    ap.add_argument('--out', default=str(Path(__file__).with_name('lungs-atlas.png')))
    a = ap.parse_args()
    poses, (w, h) = from_overview(a.overview) if a.overview else from_pack(a.pack, a.cell)

    x, y = SWAP_FULL
    poses[x]['full'], poses[y]['full'] = poses[y]['full'], poses[x]['full']
    for cond in CONDS:
        poses[cond]['full'] = clear_trachea_arrows(poses[cond]['full'], poses[cond]['rest'])

    cw, ch = w + 2 * GUTTER, h + 2 * GUTTER
    atlas = Image.new('RGBA', (cw * 3, ch * len(CONDS)), (0, 0, 0, 0))
    for r, cond in enumerate(CONDS):
        p = poses[cond]
        for c, im in enumerate((p['rest'], part_filled(p['rest'], p['full']), p['full'])):
            atlas.paste(im, (c * cw + GUTTER, r * ch + GUTTER))
    # 256 colours, no dithering: indistinguishable from the original at 2×, a fifth the size
    atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(a.out, optimize=True)
    print(f'{a.out}: {atlas.width}×{atlas.height}, cells {cw}×{ch}')


if __name__ == '__main__':
    main()
