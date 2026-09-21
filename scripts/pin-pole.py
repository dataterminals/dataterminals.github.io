"""pin-pole.py — track the thick yellow pole in the transit clip and hold it still.

One-off media prep for assets/bg-transit.*, not part of CI (the workflows run the
.mjs checks by name and nothing else). Needs Python 3 with Pillow, and an
ffmpeg with libx264 on PATH or named by the FFMPEG environment variable. The
recipe it belongs to is "How bg-transit.* was cut" in assets/README.md.

    python scripts/pin-pole.py source.mp4 pinned.mp4

The source is a phone clip shot in portrait: the rotation tag makes ffmpeg hand
over 1080x1920 frames, 30 fps with no dropped frames. The loop's section gets
three passes.

Track. The pole is the only thing in the frame that is yellow and near the
middle, and it reads far more cleanly in the chroma planes than in luma: its
blue-difference (U) sits around 75-90 against the car's neutral grey at ~128,
whatever lies behind it. The orange seat has low U too, but its V runs past
165, so it is masked out. On each sampled row, the pole's edges are taken where
the yellowness crosses half its local peak, interpolated to a fraction of a
pixel, and a line x = c + s*(y - Y_REF) is fitted through the row centres,
twice, dropping outlier rows the second time. Each frame's fit is the next
frame's prediction, so a thinner pole or a grab bar never steals the track.

Pin. Every frame is rotated to stand the pole dead vertical and shifted to put
it at X_PIN, and only the crop is rendered out. The transform is applied to
the Y, U and V planes separately, so the colours never make an RGB round trip.
The track is used raw, not smoothed: the pole's frame-to-frame jitter (about
1 px) is real — parallax, since the pole is far nearer the lens than anything
else in the car, so the phone shifting by a hair moves it much further than
the rest — and smoothing it would put the jitter back on the pole. Held
exactly, the pole stands still and the car around it carries a faint rumble
instead.

Steady. The pole is glossy, and a light it reflects beats against the frame
rate: every 17-20 frames its colour creeps towards lemon and then snaps back
to gold, up to ~12 levels in green in a frame. The matte car barely shows it.
Held still, the pole would pulse at 1.6 Hz on the page, so its own pixels are
averaged over time (a Gaussian, SIGMA frames) inside a mask that covers it to
its edges and feathers out just past them. Nothing moves inside that mask any
more, so the average costs no detail, and the car beyond it is not touched —
bar a few pixels at the feather, lost under the blur. MARGIN extra frames are
pinned either side of the section only to feed that window, so the loop's
first and last frames are steadied as fully as the rest.

The crop is the part every frame of the section still covers once it has been
moved; outside it, the pinned frames run out of picture. """

import math
import os
import subprocess
import sys

from PIL import Image, ImageMath

FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')

W, H = 1080, 1920          # the autorotated source frame
FIRST, LAST = 234, 626     # the loop's section: source frames 7.80 s .. 20.87 s, both ends included
Y_REF = 860                # the row the pole's position is measured and pinned at
X_PIN = 620                # where the pole's centre line is held, in source-frame coordinates
CROP = (48, 380, 980, 710) # x, y, w, h of what is rendered — about 982 px wide is all the section covers
SIGMA = 6                  # the steadying window's spread, in frames
MARGIN = 3 * SIGMA         # frames pinned either side of the section to feed that window

CW, CH = W // 2, H // 2
ROWS = range(140, 721, 5)  # chroma rows sampled: source rows 281..1441


def edges(u, v, x0, width=CW):
    """Subpixel (left, right) edges, in chroma px, of the yellow run nearest x0 on one row — or None."""
    sc = [max(0, 128 - u[i]) if v[i] < 168 else 0 for i in range(width)]
    xi = int(round(x0))
    lo, hi = max(1, xi - 12), min(width - 2, xi + 12)
    pk = max(range(lo, hi + 1), key=lambda i: sc[i])
    if sc[pk] < 22:
        return None
    l = pk
    while l > 0 and sc[l - 1] >= 12:
        l -= 1
    r = pk
    while r < width - 1 and sc[r + 1] >= 12:
        r += 1
    half = max(sc[l:r + 1]) / 2
    i = l
    while i < r and sc[i] < half:
        i += 1
    a, b = sc[i - 1], sc[i]
    left = (i - 1) + (half - a) / (b - a) if b != a else i
    j = r
    while j > l and sc[j] < half:
        j -= 1
    a, b = sc[j], sc[j + 1]
    right = j + (a - half) / (a - b) if a != b else j
    return left, right


def fit(pts):
    """x = c + s*(y - Y_REF) through (y, x) points, least squares, refitted without outliers."""
    def ls(q):
        n = len(q)
        my = sum(y for y, _ in q) / n
        mx = sum(x for _, x in q) / n
        s = sum((y - my) * (x - mx) for y, x in q) / sum((y - my) ** 2 for y, _ in q)
        return mx + s * (Y_REF - my), s
    c, s = ls(pts)
    res = [abs(x - (c + s * (y - Y_REF))) for y, x in pts]
    mad = sorted(res)[len(res) // 2]
    return ls([pt for pt, e in zip(pts, res) if e <= max(1.5, 3.5 * mad)])


def track(u_plane, v_plane, guess):
    """The pole's (c, s) in source px on one frame, starting from the previous frame's."""
    if guess is None:
        # First frame: the widest yellow run with its centre in source x 500..820.
        yc = Y_REF // 2
        u, v = u_plane[yc * CW:(yc + 1) * CW], v_plane[yc * CW:(yc + 1) * CW]
        runs = [e for e in (edges(u, v, x0) for x0 in range(250, 411, 4)) if e]
        left, right = max(runs, key=lambda e: e[1] - e[0])
        guess = (left + right + 1.0, 0.0)
    pts = []
    for yc in ROWS:
        u, v = u_plane[yc * CW:(yc + 1) * CW], v_plane[yc * CW:(yc + 1) * CW]
        y = yc * 2 + 1.0
        e = edges(u, v, (guess[0] + guess[1] * (y - Y_REF)) / 2)
        if e and 12 <= e[1] - e[0] <= 70:
            pts.append((y, e[0] + e[1] + 1.0))   # centre, chroma -> source px
    return fit(pts)


def pin(buf, c, s):
    """The crop of one source frame, rotated and shifted so the pole stands at X_PIN: (Y, U, V)."""
    x0, y0, cw, ch = CROP
    ys, cs = W * H, CW * CH
    # Output -> input map (Pillow wants the inverse): rotate by the pole's lean
    # about its point on Y_REF, move that point to (X_PIN, Y_REF), and start the
    # output at the crop's corner.
    b = math.atan(s)
    cb, sb = math.cos(b), math.sin(b)
    a_, b_, c_ = cb, sb, c - cb * X_PIN - sb * Y_REF
    d_, e_, f_ = -sb, cb, Y_REF + sb * X_PIN - cb * Y_REF
    c_ += a_ * x0 + b_ * y0
    f_ += d_ * x0 + e_ * y0
    half = (a_, b_, c_ / 2, d_, e_, f_ / 2)
    return (
        Image.frombytes('L', (W, H), buf[:ys]).transform(
            (cw, ch), Image.AFFINE, (a_, b_, c_, d_, e_, f_), Image.BICUBIC, fillcolor=16),
        Image.frombytes('L', (CW, CH), buf[ys:ys + cs]).transform(
            (cw // 2, ch // 2), Image.AFFINE, half, Image.BICUBIC, fillcolor=128),
        Image.frombytes('L', (CW, CH), buf[ys + cs:]).transform(
            (cw // 2, ch // 2), Image.AFFINE, half, Image.BICUBIC, fillcolor=128),
    )


def pole_masks(frames):
    """Feathered masks over the pinned pole: (luma, chroma), and their boxes.

    Read off the section's mean U, where the pole is the one run of yellow around
    the pinned centre line. Full weight out to each edge, so the edge's own
    anti-aliased pixels are steadied with the rest, then fading to nothing three
    chroma px past it — a sliver of the car beside the pole is averaged too,
    which the page's blur swallows whole."""
    cw, ch = CROP[2] // 2, CROP[3] // 2
    cx = (X_PIN - CROP[0]) / 2
    bx0, bx1 = int(cx) - 40, int(cx) + 41
    acc = None
    for _, u, _ in frames:
        f = u.crop((bx0, 0, bx1, ch)).convert('F')
        acc = f if acc is None else ImageMath.lambda_eval(lambda d: d['a'] + d['b'], a=acc, b=f)
    mean_u = ImageMath.lambda_eval(lambda d: d['a'] / len(frames) + 0.5, a=acc).convert('L')
    neutral = bytes([128]) * (bx1 - bx0)                      # V is only used to mask orange: none here
    mc = Image.new('L', (cw, ch), 0)
    my = Image.new('L', (cw * 2, ch * 2), 0)
    row_w = bx1 - bx0
    data = mean_u.tobytes()
    for yc in range(ch):
        e = edges(data[yc * row_w:(yc + 1) * row_w], neutral, cx - bx0, width=row_w)
        if not e:
            continue
        left, right = e[0] + bx0, e[1] + bx0
        for x in range(int(left - 3), int(right + 3) + 2):
            w = max(0.0, min(1.0, (x - left + 3) / 3, (right + 3 - x) / 3))
            mc.putpixel((x, yc), int(255 * w + 0.5))
        for x in range(int(2 * left - 6), int(2 * right + 6) + 2):
            w = max(0.0, min(1.0, (x - 2 * left + 6) / 6, (2 * right + 6 - x) / 6))
            my.putpixel((x, 2 * yc), int(255 * w + 0.5))
            my.putpixel((x, 2 * yc + 1), int(255 * w + 0.5))
    return (my, (2 * bx0, 0, 2 * bx1, ch * 2)), (mc, (bx0, 0, bx1, ch))


def steady(frames, t, masks, weights):
    """Frame t with the pole's pixels replaced by their Gaussian-weighted average over time."""
    out = []
    for p in range(3):
        mask, box = masks[0] if p == 0 else masks[1]
        window = [frames[t + j][p].crop(box).convert('F') for j in range(-MARGIN, MARGIN + 1)]
        avg = ImageMath.lambda_eval(
            lambda d: sum_weighted(d, weights), **{f'i{k}': im for k, im in enumerate(window)})
        plane = frames[t][p].copy()
        plane.paste(Image.composite(avg.convert('L'), plane.crop(box), mask.crop(box)), box[:2])
        out.append(plane)
    return out


def sum_weighted(d, weights):
    acc = d['i0'] * weights[0]
    for k in range(1, len(weights)):
        acc = acc + d[f'i{k}'] * weights[k]
    return acc + 0.5                                           # round, since F -> L truncates


def main(src, out):
    _, _, cw, ch = CROP
    lo, hi = FIRST - MARGIN, LAST + MARGIN
    dec = subprocess.Popen(
        [FFMPEG, '-hide_banner', '-loglevel', 'error', '-i', src, '-an',
         '-vf', f'select=between(n\\,{lo}\\,{hi})', '-fps_mode', 'passthrough',
         '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'],
        stdout=subprocess.PIPE, bufsize=1 << 24)
    ys, cs = W * H, CW * CH
    frames, guess = [], None
    while True:
        buf = dec.stdout.read(ys + 2 * cs)
        if len(buf) < ys + 2 * cs:
            break
        c, s = guess = track(buf[ys:ys + cs], buf[ys + cs:], guess)
        frames.append(pin(buf, c, s))
    if dec.wait() or len(frames) != hi - lo + 1:
        sys.exit(f'expected {hi - lo + 1} frames from ffmpeg, got {len(frames)}')

    masks = pole_masks(frames[MARGIN:-MARGIN])
    g = [math.exp(-0.5 * (j / SIGMA) ** 2) for j in range(-MARGIN, MARGIN + 1)]
    weights = [x / sum(g) for x in g]

    enc = subprocess.Popen(
        [FFMPEG, '-hide_banner', '-loglevel', 'error', '-y',
         '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', f'{cw}x{ch}', '-r', '30', '-i', '-',
         '-c:v', 'libx264', '-crf', '10', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
         '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
         out],
        stdin=subprocess.PIPE, bufsize=1 << 24)
    for t in range(MARGIN, len(frames) - MARGIN):
        enc.stdin.write(b''.join(p.tobytes() for p in steady(frames, t, masks, weights)))
    enc.stdin.close()
    if enc.wait():
        sys.exit('ffmpeg failed')
    print(f'pinned and steadied {len(frames) - 2 * MARGIN} frames -> {out} ({cw}x{ch})')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('usage: python scripts/pin-pole.py source.mp4 pinned.mp4')
    main(sys.argv[1], sys.argv[2])
