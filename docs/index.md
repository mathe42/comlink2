# comlink2

A TypeScript communication library that provides standardized interfaces for cross-context communication using PostMessage APIs and Web Streams.

## Features

- **Zero dependencies** - Pure browser APIs only
- **Type safety** - Full TypeScript support with generated `.d.ts` files
- **Modular exports** - Import only what you need
- **Multiple formats** - ESM and UMD builds
- **Three main interfaces**:
  - `PostMessageEndpoint` - Event-driven communication
  - `StreamEndpoint` - Stream-based communication  
  - `RemoteObject` - High-level RPC API

## Quick Start

```typescript
import { wrap, expose } from 'comlink2'

// In main thread
const worker = new Worker('worker.js')
const api = wrap(worker)
const result = await api.calculate(10, 20)

// In worker.js
const calculator = {
  calculate(a: number, b: number) {
    return a + b
  }
}
expose(calculator, self)
```

## Installation

```bash
npm install comlink2
```

## Get Started

- [Getting Started Guide](/guide/getting-started)
- [Core Concepts](/guide/core-concepts)
- [API Reference](/api/)
- [Examples](/examples/)

## License

Dual licensing:
- **MIT License** for non-commercial use
- **€50/month** for commercial use (5+ employees or €20k+ revenue)