# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Build**: `npm run build` - Builds TypeScript and Vite bundle for distribution
- **Test**: `npm test` - Runs all tests in watch mode with Vitest  
- **Unit tests**: `npm run test:unit` - Runs unit tests once
- **Coverage**: `npm run test:unit -- --coverage` - Generates code coverage report in `coverage/`
- **E2E tests**: `npm run test:e2e` - Runs Playwright end-to-end tests
- **E2E with UI**: `npm run test:e2e:ui` - Runs Playwright tests with interactive UI
- **Dev server**: `npm run dev` - Starts Vite development server on port 5173
- **Documentation**: 
  - `npm run docs:dev` - Starts VitePress documentation dev server
  - `npm run docs:build` - Builds static documentation
  - `npm run docs:preview` - Previews built documentation

## Architecture

**comlink2** is a TypeScript communication library that provides standardized interfaces for cross-context communication using PostMessage APIs and Web Streams.

### Core Concepts

**Three main interface types**:
- `PostMessageEndpoint` - Event-driven communication interface compatible with Worker, MessagePort, BroadcastChannel, ServiceWorker, and Window APIs
- `StreamEndpoint` - Stream-based communication using ReadableStream/WritableStream for bidirectional data flow
- `RemoteObject` - High-level API for cross-realm object manipulation (planned)

**Core functions in `src/endpoint.ts`**:
- `streamToPostMessage()` / `postMessageToStream()` - Convert between the two interface types using identity TransformStreams
- `createChannel()` - Creates isolated communication channels over a shared PostMessageEndpoint with message filtering
- `connectEndpoints()` / `connectStreams()` - Establishes bidirectional communication bridges
- All functions return cleanup functions for proper resource management

**Web API adapters in `src/endpointWeb.ts`**:
- `dataChannelToStream()` / `dataChannelToPostMessage()` - WebRTC DataChannel wrappers with readyState checking
- `webSocketToPostMessage()` - WebSocket wrapper with JSON serialization and error handling

**Remote Object API in `src/remoteObject.ts`** (implemented):
- `wrap(ep: PostMessageEndpoint)` - Creates a proxy object for remote function calls
- `expose(obj: any, ep: PostMessageEndpoint)` - Exposes an object's methods for remote access
- RPC-based communication with call/construct/await operations
- Automatic argument serialization/deserialization with proxy unwrapping
- Object reference management with `getId()` for tracking remote objects

### Library Design

- **Zero dependencies** - Pure browser APIs only
- **Modular exports** - Import only what you need from `src/index.ts`
- **Bundle formats** - ESM (`dist/comlink2.es.js`) and UMD (`dist/comlink2.js`) builds via Vite
- **Type safety** - Full TypeScript support with generated `.d.ts` files
- **Dual licensing** - MIT for non-commercial, €50/month for commercial use (5+ employees or €20k+ revenue)

### Testing Strategy

- **Unit tests** in `tests/unit/` - Individual function testing with mocked APIs
  - `endpoint.test.ts` - Core endpoint functions (55 tests)
  - `remoteObject.test.ts` - Remote object RPC functionality (31 tests, 99.35% coverage)
  - `browser-integration.test.ts` - Real MessageChannel/MessagePort API testing (8 tests)
  - `endpointWeb.test.ts` - DataChannel and WebSocket wrapper testing (20 tests)
  - `index.test.ts` - Module exports verification (12 tests)
  - `types.test.ts` - Basic TypeScript type safety verification (23 tests)
  - `advanced-types.test.ts` - Advanced TypeScript type testing with generics and inference (16 tests)
- **E2E tests** in `tests/e2e/` - Full browser environment testing with Playwright
- **Coverage target**: 90%+ with current 99.35% statement coverage on remoteObject module

### Implementation Notes

- **Stream compatibility**: Uses identity TransformStreams for conversions to avoid data copying
- **Native API compatibility**: MessagePort, Worker, BroadcastChannel, and ServiceWorker already implement PostMessageEndpoint interface
- **Error handling**: WebSocket wrapper includes JSON parsing error recovery with console warnings
- **Resource management**: All communication functions return cleanup functions to prevent memory leaks
- **Stream locking**: DataChannel wrapper uses single writer instance to avoid WritableStream lock conflicts
- **RPC Implementation**: Remote object calls use structured message format with `id`, `type`, `keyChain`, and `args` fields
- **Proxy unwrapping**: Arguments are automatically serialized/deserialized with proxy detection and unwrapping

### Development Workflow

When making changes to the library:
1. Run unit tests: `npm run test:unit` to verify core functionality
2. Run full test suite: `npm test` (includes async error handling - unhandled rejections are expected)
3. Generate coverage report: `npm run test:unit -- --coverage`
4. Build the library: `npm run build` (generates both ESM and UMD bundles)
5. Run E2E tests: `npm run test:e2e` for full browser validation

### Common Development Tasks

- **Test a specific file**: `npm run test:unit -- tests/unit/remoteObject.test.ts`
- **Run tests with coverage**: `npm run test:unit -- --coverage`
- **Debug E2E tests**: `npm run test:e2e:ui` (opens Playwright UI)
- **Start development server**: `npm run dev` (serves library on localhost:5173)
- **Run type tests**: `npm run test:unit -- tests/unit/types.test.ts tests/unit/advanced-types.test.ts`
- **Verify TypeScript compilation**: `npm run build` (tests strict mode compliance)
- **Work with documentation**: `npm run docs:dev` (starts VitePress dev server for documentation)
- **Build documentation**: `npm run docs:build` (creates static docs in `docs/.vitepress/dist/`)

## Documentation

The project uses **VitePress** for documentation, located in the `docs/` directory:

### Structure
- `docs/index.md` - Main documentation homepage
- `docs/guide/` - User guides and tutorials
- `docs/api/` - Complete API reference
- `docs/examples/` - Code examples and patterns
- `docs/.vitepress/config.ts` - VitePress configuration

### Documentation Features
- **Interactive examples** - Live code samples
- **API reference** - Complete function signatures and types
- **TypeScript support** - Full type documentation
- **Search functionality** - Built-in search across all docs
- **Responsive design** - Mobile-friendly documentation

### Writing Documentation
When adding new features or making changes:
1. Update relevant guide pages in `docs/guide/`
2. Update API reference in `docs/api/`
3. Add examples in `docs/examples/`
4. Test documentation locally with `npm run docs:dev`
5. Build documentation with `npm run docs:build` to verify