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

The package exports `BrandLavaField` and its public prop and scene types.
`resolutionScale` multiplies the canvas pixel ratio from `0.25` to `1`;
use `0.5` for large background surfaces. Reduced resolutions get a small
CSS blur automatically; set `blur` in CSS pixels to override it.

Default blob colors follow the current brand scheme (teal, indigo, purple).
Pass `colors` to override them per instance; omitted keys keep the CSS
defaults (`--brand-lava-1` … `--brand-lava-3`).

## Development

```sh
bun install
bun run check
```

Releases are published from `v*` tags to npm with trusted publishing.
