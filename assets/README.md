# Background media

One clip per theme. `theme.js` mounts the pair for whichever theme is active and
falls back gracefully at every step:

| theme     | webm (preferred)  | mp4 (Safari / older) | poster                |
| --------- | ----------------- | -------------------- | --------------------- |
| `ember`   | `bg.webm`         | `bg.mp4`             | `poster.jpg`          |
| `night`   | `bg-night.webm`   | `bg-night.mp4`       | `poster-night.jpg`    |
| `morning` | `bg-morning.webm` | `bg-morning.mp4`     | `poster-morning.jpg`  |
| `flare` | `bg-flare.webm`   | `bg-flare.mp4`       | `poster-flare.jpg`    |
| `stone` | `bg-stone.webm`   | `bg-stone.mp4`       | `poster-stone.jpg`    |
| `transit` | `bg-transit.webm` | `bg-transit.mp4`   | `poster-transit.jpg`  |

The poster shows while the video buffers; if nothing here can play, the theme's
CSS gradient stands in and the page still looks finished. Under
`prefers-reduced-motion` no clip is fetched at all — the gradient is the whole
background.

Adding a theme means dropping its two files plus a poster here, then a palette
block and a seat on the switch in `house.css`, its name in the `<head>` boot
script in `index.html`, and an entry in `THEMES` in `theme.js`.

The blog plays these same files: it loads `theme.js` from the hub, which
resolves every path here against its own url. So a clip renamed or removed here
goes missing there too, and a new one arrives there with no edit.

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

### How `bg.*` was cut

The ember loop is one shot from the same music video the night loop came from:
1:51.20 to 1:55.00, a slow drift across a stone relief — a winged figure with a
sword, the whole frame tinted oxblood. The first cut of this clip was a
zoomed-in crop pushed towards orange; this is the whole frame at its own colour.

```bash
# 1. The shot, frame-accurate, with a frame of margin at each edge. The source
#    is letterboxed 1280×720 — cropdetect at 16 or 24 agrees on the 532-line
#    picture at y=94 (at 8 it reads the bars as picture). The picture inside the
#    bars averages Y≈60, so only a touch of lift is needed to land beside the
#    loop it replaces (Y≈71); the bars had made it read far darker than it is.
ffmpeg -ss 111.24 -to 114.96 -i source.mp4 -an -vf \
  "crop=1280:532:0:94,eq=gamma=1.06:saturation=1.1,hqdn3d=2:1.5:4:3,\
   fps=15,scale=960:-2" \
  -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 2. The seam. 3.7 s is too short to lose a second of it to a dissolve, and a
#    slow camera drift reads the same run backwards — so the loop is the shot
#    forward then reversed, 7.4 s with no cut anywhere. The reversed half drops
#    its first frame so the turn doesn't hold a doubled one.
ffmpeg -i keep.mp4 -filter_complex \
  "[0:v]split[a][b];[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];\
   [a][r]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 3. Ship it, same settings as the others.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1 \
  -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150 \
  -pix_fmt yuv420p -movflags +faststart assets/bg.mp4
ffmpeg -ss 1.8 -i loop.mp4 -vframes 1 -q:v 4 assets/poster.jpg
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
ffmpeg -t 30 -i source.mp4 -an -vf \
  "crop=1080:780:0:560,eq=gamma=0.88:brightness=-0.01:saturation=1.05,\
   hqdn3d=2:1.5:4:3,fps=15,scale=960:-2" \
  -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 2. The seam. The take ends on trees and opens on brick, so the wrap wants a
#    longer dissolve than the night loop's: 1.5 s of the tail over 1.5 s of the
#    head, both dropped from the body. 30 s in, 28.5 s out.
ffmpeg -i keep.mp4 -filter_complex \
  "[0:v]split=3[b][t][h];\
   [b]trim=start=1.5:end=28.5,setpts=PTS-STARTPTS[body];\
   [t]trim=start=28.5:end=30,setpts=PTS-STARTPTS[tail];\
   [h]trim=start=0:end=1.5,setpts=PTS-STARTPTS[head];\
   [tail][head]xfade=transition=fade:duration=1.5:offset=0[mix];\
   [body][mix]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 3. Ship it, same settings as the night loop.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1 \
  -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg-morning.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150 \
  -pix_fmt yuv420p -movflags +faststart assets/bg-morning.mp4
ffmpeg -ss 10 -i loop.mp4 -vframes 1 -q:v 4 assets/poster-morning.jpg
```

The pillar sits at the clip's right edge, which a phone's portrait viewport
would crop away. The theme sets `--bg-pos: 85% 50%` so the column it keeps is
the right-hand one.

### How `bg-flare.*` was cut

Thirteen seconds of the same music video as the ember and night loops, from
3:10.48 to 3:26.16: everything from the first fireworks shot to the end of the
running crowd, stopping on the cut to the man on fire, minus the two shots of
silhouettes with their arms in the air (3:13.92 to 3:15.80 — three figures in
the smoke, then the horseman). Seven shots, all hard cuts in the source, so as
with the night loop the join between the two ranges stays hard and only the
wrap-around seam is dissolved.

```bash
# 1. Crop the letterbox, pull the grade down a touch — the range averages
#    Y≈77 with the fire shot running to 125 — denoise, thin to 15 fps, then
#    keep the two ranges. Grading before the trims keeps them matched.
ffmpeg -ss 190 -to 207 -i source.mp4 -an -filter_complex \
  "[0:v]crop=1280:532:0:94,eq=gamma=0.92:saturation=1.08,hqdn3d=2:1.5:4:3,\
        fps=15,scale=960:-2,split=2[a][b];\
   [a]trim=0.48:3.90,setpts=PTS-STARTPTS[A];\
   [b]trim=5.84:16.16,setpts=PTS-STARTPTS[B];\
   [A][B]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 2. Cross-fade the last second over the first. 13.7 s in, 12.7 s out.
ffmpeg -i keep.mp4 -filter_complex \
  "[0:v]split=3[b][t][h];\
   [b]trim=start=1:end=12.74,setpts=PTS-STARTPTS[body];\
   [t]trim=start=12.74,setpts=PTS-STARTPTS[tail];\
   [h]trim=start=0:end=1,setpts=PTS-STARTPTS[head];\
   [tail][head]xfade=transition=fade:duration=1:offset=0[mix];\
   [body][mix]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 3. Ship it. Smoke compresses well: ~0.5 MB of VP9.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1 \
  -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg-flare.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150 \
  -pix_fmt yuv420p -movflags +faststart assets/bg-flare.mp4
ffmpeg -ss 2.2 -i loop.mp4 -vframes 1 -q:v 4 assets/poster-flare.jpg
```

**The strobe.** The running crowd at the end flashes at about 7 Hz. Measured per
frame it swings Y≈52 to 73, a relative-luminance change of ~0.03 — a third of
the 0.1 that counts as a general flash under WCAG 2.3.1 — before the blur and
the scrim take more off. It was checked rather than assumed; check again if
the grade or the scrim changes.

### How `bg-stone.*` was cut

Every close-up of a statue in the same music video as ember, night and flare,
in the order they come: the pale classical figures, the oxblood relief (the
ember shot), a red-tinted relief, the winged group at the top of the arch, the
seated relief that keeps returning through the last minute, a stone detail in
sepia, the facade. Ten ranges totalling 22.2 s. Everything else on the tape has
someone in it.

```bash
# 1. Grade per range, since they are lit and tinted every which way: the pale
#    figures at the start read Y≈120 against the winged group's 42, so each
#    range gets its own gamma after its trim, and the loop holds near Y≈65
#    throughout. Crop, denoise, thin and scale first so every range matches.
ffmpeg -i source.mp4 -an -filter_complex \
  "[0:v]crop=1280:532:0:94,hqdn3d=2:1.5:4:3,fps=15,scale=960:-2,\
        split=10[s0][s1][s2][s3][s4][s5][s6][s7][s8][s9];\
   [s0]trim=56.92:60.84,setpts=PTS-STARTPTS,eq=gamma=0.55[t0];\
   [s1]trim=111.24:114.96,setpts=PTS-STARTPTS[t1];\
   [s2]trim=128.48:129.96,setpts=PTS-STARTPTS,eq=gamma=1.1[t2];\
   [s3]trim=142.80:145.32,setpts=PTS-STARTPTS,eq=gamma=1.3[t3];\
   [s4]trim=175.04:176.72,setpts=PTS-STARTPTS,eq=gamma=1.05[t4];\
   [s5]trim=202.60:204.52,setpts=PTS-STARTPTS[t5];\
   [s6]trim=214.56:215.16,setpts=PTS-STARTPTS[t6];\
   [s7]trim=219.16:221.72,setpts=PTS-STARTPTS,eq=gamma=1.3[t7];\
   [s8]trim=238.64:240.56,setpts=PTS-STARTPTS,eq=gamma=1.05[t8];\
   [s9]trim=242.76:244.64,setpts=PTS-STARTPTS,eq=gamma=1.1[t9];\
   [t0][t1][t2][t3][t4][t5][t6][t7][t8][t9]concat=n=10:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 2. Cross-fade the last second over the first; the joins between ranges stay
#    hard, as the source cuts. 22.2 s in, 21.2 s out.
ffmpeg -i keep.mp4 -filter_complex \
  "[0:v]split=3[b][t][h];\
   [b]trim=start=1:end=21.2,setpts=PTS-STARTPTS[body];\
   [t]trim=start=21.2,setpts=PTS-STARTPTS[tail];\
   [h]trim=start=0:end=1,setpts=PTS-STARTPTS[head];\
   [tail][head]xfade=transition=fade:duration=1:offset=0[mix];\
   [body][mix]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 3. Ship it. Stone holds still: ~0.35 MB of VP9.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1 \
  -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg-stone.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150 \
  -pix_fmt yuv420p -movflags +faststart assets/bg-stone.mp4
ffmpeg -ss 9.5 -i loop.mp4 -vframes 1 -q:v 4 assets/poster-stone.jpg
```

**Finding them.** A 1 fps contact sheet of the whole tape (`fps=1,tile=12x7`,
three sheets) finds the candidates; `select='gt(scene,0.10)'` over the whole
tape gives the edges; a 4 fps strip of each candidate window confirms what is
between them. Two of the ten wanted that last look: the shot after the sepia
detail is a man's arm, not a statue's, and 3:50–3:58 is lasers and crowd, not
the relief the 1 fps sheet seemed to show.

### How `bg-transit.*` was cut

Thirty-two seconds of phone footage from inside an empty train car, shot in
portrait with the phone held low: steel doors down the left, orange seats and
yellow grab poles running away down the car, and one thick pole close to the
lens, just right of centre. One continuous take — but the phone drifts some
230 px sideways over it, so no two moments of it line up, and a cross-fade seam
would slide that near pole across the frame. So the pole is pinned: tracked in
every frame and held dead still, with the car rocking around it instead. That
part takes a script ([`scripts/pin-pole.py`](../scripts/pin-pole.py), Python
with Pillow); the rest is ffmpeg.

```bash
# 1. Track the pole and pin it — the script's docstring has the details. Source
#    frames 234..626 (7.80 s to 20.87 s): at both ends the car's slow sway around
#    the pinned pole is at its stillest, and that is where the loop turns. Out comes
#    the 980x710 band every frame of that stretch still covers once moved — the
#    exit sign and the ceiling tubes above it, a knee edging into the bottom
#    corner below — with the pole 58% of the way across. The same pass evens out
#    a flicker the pole picks up from the lights (below).
python scripts/pin-pole.py source.mp4 pinned.mp4

# 2. Grade, denoise, thin, scale. The band averages Y≈113, so the gamma pulls
#    hard, to Y≈75 — beside morning. A pull that strong takes the luma out from
#    under the chroma: at full saturation the poles leave the RGB gamut (blue
#    clips to zero on almost every pole pixel), so saturation comes down with
#    it, to 0.75, where they sit back inside. The thinning to 15 fps comes after
#    the pin, not before, since the flicker it evens out is counted in the
#    phone's 30 fps frames; it keeps the even frames, so both turn frames stay.
ffmpeg -i pinned.mp4 -an -vf "eq=gamma=0.64:saturation=0.75,hqdn3d=2:1.5:4:3,fps=15,scale=960:-2" \
  -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p keep.mp4

# 3. The seam. Pinned, the ends still don't match — the car sways around the
#    pole — so, like the ember loop, the shot runs forward and then back: 13.1 s
#    each way, 26.1 s in all, with no cut anywhere. The reversed half drops both
#    its first and its last frame, so neither turn holds a doubled one.
ffmpeg -i keep.mp4 -filter_complex \
  "[0:v]split[a][b];[b]reverse,trim=start_frame=1:end_frame=196,setpts=PTS-STARTPTS[r];\
   [a][r]concat=n=2:v=1:a=0[out]" \
  -map "[out]" -c:v libx264 -crf 12 -preset veryfast -pix_fmt yuv420p loop.mp4

# 4. Ship it, same settings as the others: ~1.1 MB of VP9, ~1.3 MB of H.264.
ffmpeg -i loop.mp4 -an -c:v libvpx-vp9 -crf 36 -b:v 0 -g 150 -row-mt 1 \
  -deadline good -cpu-used 2 -pix_fmt yuv420p assets/bg-transit.webm
ffmpeg -i loop.mp4 -an -c:v libx264 -crf 27 -preset slow -profile:v high -g 150 \
  -pix_fmt yuv420p -movflags +faststart assets/bg-transit.mp4
ffmpeg -ss 6.5 -i loop.mp4 -vframes 1 -q:v 4 assets/poster-transit.jpg
```

**Pinned exactly, not smoothed.** The tracked pole jitters about a pixel from
frame to frame, and that jitter is real rather than the tracker's noise: it is
parallax — the pole is far nearer the lens than anything else in the car, so
the phone shifting by a hair moves it much further than the rest. So only one of
the two can stand still. Pinned to the raw track, the pole holds dead still and
the car around it carries a faint rumble; smoothed, the car settles and the
pole shakes again. Checking which is which wants a kymograph — one row of every
frame stacked into a single image, time running down — where anything still is
a straight vertical edge. Re-tracking the pinned clip proves nothing: the
tracker just finds its own answer again.

**The pole's flicker.** The pole is glossy, and a light it reflects beats
against the frame rate: every 17–20 frames its colour creeps towards lemon and
snaps back to gold, up to ~12 levels of green in a single frame, while the
matte car barely stirs. Held still behind the text, that would pulse at 1.6 Hz.
The pin script averages the pole's own pixels over time (a Gaussian, σ = 6
frames) inside a mask that runs out to its edges; nothing moves in there any
more, so the average costs no detail, and the flicker falls to ~0.03 levels.

**15 fps, not 30.** The first cut kept the phone's 30 fps. On the page it moved
too smoothly beside the other loops, so it is thinned to 15 like them — which
also takes it from 1.8 MB of VP9 down to 1.1.

**On a phone.** `--bg-pos` stays centred. A portrait viewport keeps the middle
third of the clip, which puts the pole about three-quarters of the way across
the screen rather than down its middle.
