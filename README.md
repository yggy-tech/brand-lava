# @yggy-tech/brand-lava

A configurable React and WebGL lava field for Drasil brand surfaces.

## Install

Install the package:

```sh
bun add @yggy-tech/brand-lava
```

## Use

```tsx
import { BrandLavaField } from "@yggy-tech/brand-lava";
import "@yggy-tech/brand-lava/styles.css";

export function Hero() {
  return (
    <BrandLavaField
      resolutionScale={0.5}
      maxFps={30}
      colors={{
        lava1: "#316251",
        lava2: "#454c79",
        lava3: "#743179",
        cursorLight: "#454c79",
      }}
    />
  );
}
```

The package exports `BrandLavaField`, `DEFAULT_MAX_FPS` (45), and its public prop and scene types.

`resolutionScale` multiplies the canvas pixel ratio from `0.25` to `1`;
use `0.5` for large background surfaces. Reduced resolutions get a small
CSS blur automatically; set `blur` in CSS pixels to override it.

`maxFps` caps drawn frames per second (default `DEFAULT_MAX_FPS`, 45).
Pass `maxFps={0}` to run uncapped at the display refresh rate. Apps such as
Bifroest can override per surface without changing package defaults.

`seed` drives a deterministic blob layout (phases, size variation, start
offsets, satellite wiring). Omit it for the classic fixed layout; pass a new
value each mount (e.g. `Date.now()`) for variety that is still reproducible
when the same seed is reused.

`fill`, `outline`, and `background` control how blobs are painted:

```tsx
<BrandLavaField fill={false} outline={{ width: 2, color: "#68a491" }} background="transparent" />
```

- `fill={false}` draws hollow blobs. The outline turns on by default so
  blobs stay visible; pass `outline={{ enabled: false }}` to hide both.
- `outline` draws a border around the merged blob silhouette. `width` is
  in CSS pixels (`0.5` to `24`, default `2`). `color` defaults to
  `colors.highlight`, then `--brand-lava-highlight`.
- `background="transparent"` draws only the blobs, so the page behind the
  field shows through. The default `"theme"` paints `--card` and
  `--background`.

`glow` and `vignette` (both `0` to `1`, default `1`) scale the atmosphere:
`glow` is the tint the second lava color casts on the centre of the
background, `vignette` the edge darkening over the whole field. Set both
to `0` for a flat, even surface such as a banner or a static frame:

```tsx
<BrandLavaField glow={0} vignette={0} />
```

Default blob colors follow the current brand scheme (teal, indigo, purple).
Pass `colors` to override them per instance; omitted keys keep the CSS
defaults (`--brand-lava-1` … `--brand-lava-3`).

## Development

```sh
bun install
bun run check
```

Releases are published from `v*` tags to npm with trusted publishing.
