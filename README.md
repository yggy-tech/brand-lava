# @drasil-ai/brand-lava

A configurable React and WebGL lava field for Drasil brand surfaces.

## Install

Install the package:

```sh
bun add @drasil-ai/brand-lava
```

## Use

```tsx
import { BrandLavaField } from "@drasil-ai/brand-lava";
import "@drasil-ai/brand-lava/styles.css";

export function Hero() {
  return <BrandLavaField resolutionScale={0.5} />;
}
```

The package exports `BrandLavaField` and its public prop and scene types.
`resolutionScale` multiplies the canvas pixel ratio from `0.25` to `1`;
use `0.5` for large background surfaces. Reduced resolutions get a small
CSS blur automatically; set `blur` in CSS pixels to override it.

## Development

```sh
bun install
bun run check
```

Releases are published from `v*` tags to npm with trusted publishing.
