# comlink2

A TypeScript communication library that provides standardized interfaces for cross-context communication using PostMessage APIs and Web Streams.

[![npm version](https://badge.fury.io/js/comlink2.svg)](https://badge.fury.io/js/comlink2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Features

- **🚀 Zero dependencies** - Pure browser APIs only
- **📦 Modular exports** - Import only what you need
- **🔒 Type safety** - Full TypeScript support with generated `.d.ts` files
- **🌐 Universal compatibility** - Works with Worker, MessagePort, BroadcastChannel, ServiceWorker, and Window
- **🔄 Multiple formats** - ESM and UMD builds available
- **🛡️ Security built-in** - Input validation and prototype pollution protection

## Quick Start

### Installation

```bash
npm install comlink2
```

### Basic Usage

**Remote Objects (Recommended)**

```typescript
// worker.js
import { expose } from 'comlink2'

const api = {
  add(a, b) {
    return a + b
  },
  async fetchData(url) {
    const response = await fetch(url)
    return response.json()
  }
}

expose(api, self)
```

```typescript
// main.js
import { wrap } from 'comlink2'

const worker = new Worker('worker.js')
const api = wrap(worker)

// Use remote API as if it were local
const sum = await api.add(5, 3) // 8
const data = await api.fetchData('/api/users')
```

**PostMessage Endpoints**

```typescript
import { connectEndpoints } from 'comlink2'

const worker = new Worker('worker.js')
const cleanup = connectEndpoints(worker, {
  addEventListener: (type, listener) => {
    // Handle messages
  },
  postMessage: (data) => {
    console.log('Sending:', data)
  }
})

// Clean up when done
cleanup()
```

**Stream Endpoints**

```typescript
import { postMessageToStream } from 'comlink2'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

// Write to stream
const writer = stream.writable.getWriter()
await writer.write({ message: 'Hello!' })

// Read from stream
const reader = stream.readable.getReader()
const { value } = await reader.read()
```

## Architecture

comlink2 provides three main interface types:

### 1. PostMessageEndpoint
Event-driven communication interface compatible with native browser APIs:
- `Worker`
- `MessagePort`
- `BroadcastChannel`
- `ServiceWorker`
- `Window`

### 2. StreamEndpoint
Stream-based communication using Web Streams API for bidirectional data flow with automatic backpressure handling.

### 3. RemoteObject
High-level RPC API for cross-realm object manipulation with automatic serialization and proxy management.

## Core Functions

### Endpoint Conversion
```typescript
import { streamToPostMessage, postMessageToStream } from 'comlink2'

// Convert between interface types
const pmEndpoint = streamToPostMessage(streamEndpoint)
const streamEndpoint = postMessageToStream(pmEndpoint)
```

### Channel Creation
```typescript
import { createChannel } from 'comlink2'

// Create isolated communication channels
const dataChannel = createChannel(worker, 'data')
const controlChannel = createChannel(worker, 'control')
```

### Connection Management
```typescript
import { connectEndpoints, connectStreams } from 'comlink2'

// Connect endpoints bidirectionally
const cleanup1 = connectEndpoints(endpoint1, endpoint2)
const cleanup2 = connectStreams(stream1, stream2)
```

## Web API Adapters

### WebSocket Integration
```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)
const api = wrap(endpoint)
```

### WebRTC DataChannel
```typescript
import { dataChannelToPostMessage, dataChannelToStream } from 'comlink2'

const channel = pc.createDataChannel('my-channel')
const endpoint = dataChannelToPostMessage(channel)
const stream = dataChannelToStream(channel)
```

## Advanced Features

### Function Callbacks
```typescript
// Functions are automatically wrapped for remote execution
const result = await api.processItems(
  [1, 2, 3],
  (item) => item * 2
)
```

### Object References
```typescript
// Objects with methods are automatically proxied
const counter = await api.createCounter()
await counter.increment()
const value = await counter.value
```

### Constructor Support
```typescript
// Remote constructors work seamlessly
const Calculator = api.Calculator
const calc = await new Calculator()
await calc.add(5)
```

### Error Handling
```typescript
try {
  const result = await api.riskyOperation()
} catch (error) {
  console.error('Remote operation failed:', error)
}
```

## Security Features

- **Input validation** - All RPC calls are validated
- **Prototype pollution protection** - Blocks access to dangerous properties
- **Property access control** - Only own properties are accessible
- **Function type validation** - Ensures call targets are functions

## Performance Optimization

### Batch Operations
```typescript
// Good: Process items in batches
const results = await api.processBatch(items)

// Avoid: Many individual calls
const results = []
for (const item of items) {
  results.push(await api.processItem(item))
}
```

### Resource Management
```typescript
// Always clean up resources
const cleanup = connectEndpoints(worker, endpoint)
// ... use connection
cleanup() // Prevent memory leaks
```

## TypeScript Support

Full TypeScript support with type-safe remote APIs:

```typescript
interface CalculatorAPI {
  add(a: number, b: number): number
  multiply(a: number, b: number): number
}

const worker = new Worker('calculator.js')
const calc = wrap<CalculatorAPI>(worker)

// Type-safe remote calls
const sum: number = await calc.add(5, 3)
```

## Documentation

- **[Getting Started](https://your-docs-url.com/guide/getting-started)** - Installation and basic usage
- **[API Reference](https://your-docs-url.com/api/)** - Complete function documentation
- **[Examples](https://your-docs-url.com/examples/)** - Code examples and patterns
- **[TypeScript Guide](https://your-docs-url.com/guide/typescript)** - Type-safe usage

## Development

### Setup
```bash
git clone https://github.com/your-username/comlink2.git
cd comlink2
npm install
```

### Commands
```bash
npm run build          # Build library
npm test              # Run tests
npm run test:unit     # Run unit tests
npm run test:e2e      # Run E2E tests
npm run docs:dev      # Start documentation server
npm run docs:build    # Build documentation
```

### Project Structure
```
src/
├── index.ts           # Main exports
├── endpoint.ts        # Core endpoint functions
├── endpointWeb.ts     # Web API adapters
└── remoteObject.ts    # Remote object RPC

tests/
├── unit/             # Unit tests
└── e2e/              # End-to-end tests

docs/
├── guide/            # User guides
├── api/              # API reference
└── examples/         # Code examples
```

## Browser Compatibility

- **Chrome** 61+
- **Firefox** 57+
- **Safari** 14+
- **Edge** 16+

*Requires Web Streams API support. Use polyfills for older browsers.*

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Dual licensing:
- **MIT License** for non-commercial use
- **Commercial License** (€50/month) for commercial use (5+ employees or €20k+ revenue)

See [LICENSE](LICENSE) for more information.

## Inspiration

This project is inspired by [Comlink](https://github.com/GoogleChromeLabs/comlink) but provides additional features like stream support, Web API adapters, and enhanced security.

---

Made with ❤️ by Sebastian (@mathe42)