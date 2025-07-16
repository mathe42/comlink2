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

**Remote Object API in `src/remoteObject.ts`** (planned implementation):
- Cross-realm object manipulation, function calls, and class instantiation
- Multiple serialization strategies (JSON, StructuredClone, Function strings, Object references)
- Object reference management with garbage collection
- Event system for remote object lifecycle tracking

### Library Design

- **Zero dependencies** - Pure browser APIs only
- **Modular exports** - Import only what you need from `src/index.ts`
- **Bundle formats** - ESM (`dist/comlink2.es.js`) and UMD (`dist/comlink2.js`) builds via Vite
- **Type safety** - Full TypeScript support with generated `.d.ts` files
- **Dual licensing** - MIT for non-commercial, €50/month for commercial use (5+ employees or €20k+ revenue)

### Testing Strategy

- **Unit tests** in `tests/unit/` - Individual function testing with mocked APIs
- **Browser integration tests** - Real MessageChannel/MessagePort API testing in `tests/unit/browser-integration.test.ts`
- **Web API tests** - DataChannel and WebSocket wrapper testing in `tests/unit/endpointWeb.test.ts`
- **E2E tests** in `tests/e2e/` - Full browser environment testing with Playwright
- **Coverage target**: 90%+ with current 87.8% statement coverage

### Implementation Notes

- **Stream compatibility**: Uses identity TransformStreams for conversions to avoid data copying
- **Native API compatibility**: MessagePort, Worker, BroadcastChannel, and ServiceWorker already implement PostMessageEndpoint interface
- **Error handling**: WebSocket wrapper includes JSON parsing error recovery with console warnings
- **Resource management**: All communication functions return cleanup functions to prevent memory leaks
- **Stream locking**: DataChannel wrapper uses single writer instance to avoid WritableStream lock conflicts