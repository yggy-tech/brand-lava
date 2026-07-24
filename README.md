# @drasil-ai/brand-lava

A configurable React and WebGL lava field for Drasil brand surfaces.

## Install

Authenticate Bun or npm with GitHub Packages, then install the package:

```sh
bun add @drasil-ai/brand-lava
```

Your project-level `.npmrc` must route the scope to GitHub Packages:

```ini
@drasil-ai:registry=https://npm.pkg.github.com
```

## Use

```tsx
import { BrandLavaField } from "@drasil-ai/brand-lava";
import "@drasil-ai/brand-lava/styles.css";

export function Hero() {
  return <BrandLavaField className="h-full w-full" />;
}
```

The package exports `BrandLavaField`, its backwards-compatible
`LavaLampField` alias, and the public prop and scene types.

## Development

```sh
bun install
bun run check
```

Releases are published from `v*` tags to GitHub Packages.

