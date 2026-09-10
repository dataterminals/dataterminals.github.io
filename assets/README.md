# Background media

One clip per theme. `theme.js` mounts the pair for whichever theme is active and
falls back gracefully at every step:

| theme     | webm (preferred)  | mp4 (Safari / older) | poster                |
| --------- | ----------------- | -------------------- | --------------------- |
| `ember`   | `bg.webm`         | `bg.mp4`             | `poster.jpg`          |
| `night`   | `bg-night.webm`   | `bg-night.mp4`       | `poster-night.jpg`    |
| `morning` | `bg-morning.webm` | `bg-morning.mp4`     | `poster-morning.jpg`  |

The poster shows while the video buffers; if nothing here can play, the theme's
CSS gradient stands in and the page still looks finished. Under
`prefers-reduced-motion` no clip is fetched at all — the gradient is the whole
background.

Adding a theme means dropping its two files plus a poster here, then a palette
block and a seat on the switch in `styles.css`, its name in the `<head>` boot
script in `index.html`, and an entry in `THEMES` in `theme.js`.

## Recommendations
- Keep it **seamless** and **muted** — it plays muted + inline + autoplay, which
  every browser allows. A hard cut back to frame one is visible even under the
  blur, so either loop the clip naturally or cross-fade the seam (below).
- Aim for **≤ ~6 MB per theme**. GitHub Pages serves it fine, but big files cost
  visitors' bandwidth on every visit. It sits behind a blur and a scrim, so
  resolution and frame rate matter far less than you'd think: every shipping
  clip is 15 fps and under 1000 px wide.
- Provide a poster (a representative frame) so mobile / reduced-motion / slow
  connections still get the right look without downloading the video.
- Dark, low-contrast footage reads best. Anything with faces or legible signage
  fights the text — push `--bg-blur` up for that theme rather than living with
  it, and check the scrim alphas (`--scrim-*`) while you're there.
- The clip is `object-fit: cover`, so a landscape viewport crops it to a band
  and a phone crops it to a column. If the part that carries the look sits at
  an edge, point `--bg-pos` at it rather than cropping the file down to it.

## Handy ffmpeg

```bash
# Straight conversion of an already-seamless clip
ffmpeg -i source.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 assets/bg.webm
ffmpeg -i source.mp4 -an -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart assets/bg.mp4
ffmpeg -i source.mp4 -ss 00:00:01 -vframes 1 -q:v 4 assets/poster.jpg
```

### How `bg-night.*` was cut

Cut from the first 47 s of a camcorder-shot music video, keeping only the
performer-free footage — the b-roll, not the shots he is in. That leaves five
disjoint ranges totalling 22 s. It needed every step below, so it is worth
keeping as the worked example.

```bash
# 1. Clean it up and keep only the five ranges. The grade first: drop the ~138 px
#    grey pillar bands the transfer left on each side, lift the mid-tones (the
#    source averages Y≈31 — half the ember loop, which disappears entirely under
#    the scrim), denoise so tape grain doesn't eat the bitrate, then down to
#    15 fps and 960 px wide. Grading before the trims keeps every range matched.
ffmpeg -t 47 -i source.mp4 -an -filter_complex \
  "[0:v]crop=1002:720:138:0,eq=gamma=1.34:saturation=1.06,hqdn3d=3:2:5:4,\
        fps=15,scale=960:-2,split=5[a][b][c][d][e];\
   [a]trim=0.60:8.90,setpts=PTS-STARTPTS[A];\
   [b]trim=13.50:15.38,setpts=PTS-STARTPTS[B];\
   [c]trim=17.30:21.36,setpts=PTS-STARTPTS[C];\
   [d]trim=25.50:28.46,setpts=PTS-STARTPTS[D];\
   [e]trim=29.68:34.56,setpts=PTS-STARTPTS[E];\
   [A][B][C][D][E]concat=n=5:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 2. Make the seam invisible: cross-fade the last second over the first, and
#    drop both from the body. 22 s in, 21 s out, no cut on the wrap. The joins
#    *between* ranges stay hard — the source cuts hard throughout, so a stack of
#    dissolves in the middle of it would read as the odd one out.
ffmpeg -i keep.mp4 -filter_complex \
  "[0:v]split=3[b][t][h];\
   [b]trim=start=1:end=21,setpts=PTS-STARTPTS[body];\
   [t]trim=start=21:end=22,setpts=PTS-STARTPTS[tail];\
   [h]trim=start=0:end=1,setpts=PTS-STARTPTS[head];\
   [tail][head]xfade=transition=fade:duration=1:offset=0[mix];\
   [body][mix]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 3. Ship it. 21 s lands at ~2.0 MB of VP9 and ~2.3 MB of H.264.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1 \
  -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg-night.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150 \
  -pix_fmt yuv420p -movflags +faststart assets/bg-night.mp4
ffmpeg -ss 7.8 -i loop.mp4 -vframes 1 -q:v 4 assets/poster-night.jpg
```

**Finding the ranges.** Shot boundaries first — `select='gt(scene,0.12)'` with
`showinfo` prints them, though the default `0.3` finds almost nothing on footage
this dark and needs winding down. Then classify: `fps=2,scale=200:-2,tile=8x6`
with a `gamma=1.55:brightness=0.10` lift renders the whole 47 s as two contact
sheets you can read at a glance, cell *i* being *t = i/2*.

Do **not** trust the shot boundaries as cut points. Two of the five here were
off by a frame or two in the direction that keeps a face in, so every edge wants
a second pass at `fps=10` over a ±0.5 s window before you commit to it, and then
a frame of margin on top. Contact-sheet the finished file the same way to check
the result rather than the intent.

`ffmpeg -vf cropdetect` finds bands like those pillars, but pick the threshold
with care too: on footage this dark the default `24` reads shadow as border and
eats a fifth of the frame. Sweep a few (`cropdetect=8`, `16`, `24`) and take the
one that agrees with your eyes on a brightened still.

### How `bg-morning.*` was cut

Thirty seconds of phone footage out of a commuter train window, shot in
portrait. One continuous take — a brick wall, a moment under a bridge, a long
stretch of concrete retaining wall, then trees — so there is nothing to select,
only a frame to choose and a seam to hide.

```bash
# 1. Crop, grade, thin. The phone frame is 1080×1920 after its rotation tag
#    (ffmpeg applies it on its own); the 1080×780 band from y=560 is mostly
#    window — the passing wall, the maroon pillar down the right — with the sill
#    and a sliver of the mustard seat along the foot. The source averages Y≈103,
#    half again brighter than the ember loop, so the gamma pulls it down rather
#    than up — to Y≈75, a shade *lighter* than ember, leaving the rest to the
#    scrim. A light denoise so phone grain doesn't eat the bitrate.
ffmpeg -t 30 -i source.mp4 -an -vf   "crop=1080:780:0:560,eq=gamma=0.88:brightness=-0.01:saturation=1.05,   hqdn3d=2:1.5:4:3,fps=15,scale=960:-2"   -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 2. The seam. The take ends on trees and opens on brick, so the wrap wants a
#    longer dissolve than the night loop's: 1.5 s of the tail over 1.5 s of the
#    head, both dropped from the body. 30 s in, 28.5 s out.
ffmpeg -i keep.mp4 -filter_complex   "[0:v]split=3[b][t][h];   [b]trim=start=1.5:end=28.5,setpts=PTS-STARTPTS[body];   [t]trim=start=28.5:end=30,setpts=PTS-STARTPTS[tail];   [h]trim=start=0:end=1.5,setpts=PTS-STARTPTS[head];   [tail][head]xfade=transition=fade:duration=1.5:offset=0[mix];   [body][mix]concat=n=2:v=1:a=0[out]"   -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 3. Ship it, same settings as the night loop.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1   -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg-morning.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150   -pix_fmt yuv420p -movflags +faststart assets/bg-morning.mp4
ffmpeg -ss 10 -i loop.mp4 -vframes 1 -q:v 4 assets/poster-morning.jpg
```

The pillar sits at the clip's right edge, which a phone's portrait viewport
would crop away. The theme sets `--bg-pos: 85% 50%` so the column it keeps is
the right-hand one, with a strip of window beside the pillar.
