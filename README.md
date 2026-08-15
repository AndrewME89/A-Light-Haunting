The raven rests as the static `raven-normal.png` almost all the time. Five
short pre-rendered video clips (`assets/raven/video/`) — `blink`, `ruffle`,
`head-left`, `subtle`, `look-viewer` — sit on their own independent random
schedulers (see `config.js`). When one fires, `app.js`:

1. plays that clip on a hidden `<video>` element,
2. real-time keys out its background with a small WebGL shader (see
   below), drawing the result to a canvas positioned exactly where the
   static raven sits,
3. crossfades the static image out / canvas in (and back again once the
   clip ends) over `CONFIG.ravenVideoCrossfadeMs` (120ms) — short enough
   to just smooth the seam, not to read as an effect itself.

Only one gesture plays at a time (a busy-guard blocks overlaps), and each
clip runs its own full, unmodified length (roughly 5–6 seconds each) — so a
gesture now reads as a brief cutaway shot of the raven doing something,
rather than the near-instant flicker earlier procedural versions used.
That's a real change in feel worth knowing about, not just a timing tweak.

### Why a shader, and its known limitations

The clips are plain MP4s — no alpha channel — shot against a flat black or
white background (`key: 'black' | 'white'` per clip in
`CONFIG.ravenVideos`). A WebGL fragment shader (`initRavenVideoGL()` in
`app.js`) samples each video frame, measures how close each pixel is to the
key colour, and fades it to transparent within a band
key colour, and fades it to transparent within a band. Black-backed clips
use max-channel RGB distance rather than luminance so their blue-black
feathers remain opaque; white-backed clips use inverse luminance
(`CONFIG.ravenVideoKeyThreshold`, split per key colour) — this runs on the
GPU so it's cheap enough to do every frame, unlike an equivalent CPU canvas
pixel loop. It also does an 8-tap "erode" pass (min alpha over neighbouring
pixels, `CONFIG.ravenVideoErodeRadius`, also split per key colour — see
why below), which shrinks the opaque silhouette inward, trading a thinner
raven edge for removing a semi-transparent fringe at the boundary.

The two colours fail in different, near-opposite ways, which is why both
the threshold *and* the erosion are tuned separately per colour rather than
shared:

**Known limitation 1 — dark shadow feathers (`blink`, `ruffle`,
`look-viewer`):** the raven's own darkest shadow feathers are very close to
literal black (`RGB(0,1,3)` measured directly from footage) — essentially
the same colour as the black background being keyed out on those three
clips. This shows as small transparent gaps *inside* the raven's silhouette
(not at the edge), since a shadow pixel and a background pixel can be
colour-identical at 8-bit precision — no threshold can fully separate two
pixels with the same value. `ravenVideoKeyThreshold.black` is tuned as
tight as the measured data allows (background here is a clean, noise-free
literal `0,0,0`, so `low` sits right near zero) to protect as much shadow
detail as possible, and `ravenVideoErodeRadius.black` is **0, deliberately
— erosion would make this specific problem worse**, not better: it spreads
any already-transparent shadow pixel's low alpha into its opaque neighbours
too, growing the gaps instead of shrinking them. The white-keyed clips
`look-viewer`):** pixels that are exactly black remain indistinguishable
from the keyed background. The compositor deliberately uses the brightest
RGB channel rather than luminance for these clips, however, so tinted
near-black feather detail (including blue-black pixels such as `RGB(0,1,3)`)
stays opaque instead of becoming semi-transparent and looking washed out.
`ravenVideoKeyThreshold.black` is consequently tuned to only remove the
clean, noise-free black background, and `ravenVideoErodeRadius.black` is
**0, deliberately — erosion would spread any truly black transparent pixel
into its opaque neighbours**, growing gaps instead of shrinking them. The
white-keyed clips
(`head-left`, `subtle`) don't have this problem — a dark bird against white
has natural contrast. If this matters enough to fix properly, the real fix
is regenerating the black-background clips against a higher-contrast
background (e.g. a saturated green/blue), not a code change.

**Known limitation 2 — edge fringe / "outline" (most visible on the
white-keyed clips):** video compression blends a few pixels of background
into the raven's silhouette *edge*, which a naive single-sample key can
leave as a faint halo around the whole bird — the opposite failure mode
from limitation 1 (a boundary problem, not an interior one), which is why
it's fixed with the opposite tool: `ravenVideoErodeRadius.white` is set
fairly strong (`2.5` texels, 8-directional), and
`ravenVideoKeyThreshold.white` is deliberately generous — there's a lot of
safe margin between a dark bird and a white background, so widening the
"count as background" band doesn't risk eating into the bird. If a fringe
is still visible after a hard refresh, both numbers can go further —
there's substantially more headroom before any risk to the raven itself.

### Watermark crop

`look-viewer.mp4` has a burned-in "KlingAI 3.0" watermark, and `head-left.mp4`
/ `subtle.mp4` have a second AI tool's watermark — both bottom-right, an
area the raven never occupies in any clip. `CONFIG.ravenVideoWatermarkCrop`
forces that corner fully transparent regardless of pixel colour, so it
never appears in the composite. `blink.mp4` and `ruffle.mp4` are clean.
