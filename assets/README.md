# Background media

Drop your looping clip here. The page auto-detects sources in this order and
uses the first that loads, falling back gracefully if none are present:

1. `assets/bg.webm`  — preferred (smaller, VP9/AV1)
2. `assets/bg.mp4`   — fallback for Safari / older browsers
3. `assets/poster.jpg` — shown while the video buffers, on data-saver /
   reduced-motion, and if the video can't play at all
4. built-in CSS gradient — if nothing above exists

## Recommendations
- Keep it **short and seamless** (5–20 s, hard loop) and **muted** — it plays
  muted + inline + autoplay, which every browser allows.
- Aim for **≤ ~6 MB**. GitHub Pages serves it fine, but big files cost
  visitors' bandwidth on every visit. 1080p or even 720p is plenty behind the
  overlay scrim.
- Provide a `poster.jpg` (a representative frame) so mobile / reduced-motion /
  slow connections still get the right look without downloading the video.

## Handy ffmpeg
```bash
# webm (VP9), muted, no audio track, capped bitrate
ffmpeg -i source.mp4 -an -c:v libvpx-vp9 -b:v 2M -crf 32 assets/bg.webm
# mp4 (H.264) fallback
ffmpeg -i source.mp4 -an -c:v libx264 -crf 24 -pix_fmt yuv420p -movflags +faststart assets/bg.mp4
# poster from ~1s in
ffmpeg -i source.mp4 -ss 00:00:01 -vframes 1 -q:v 3 assets/poster.jpg
```
