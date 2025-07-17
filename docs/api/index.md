# API Reference

## Overview

comlink2 provides a modular API organized into three main modules:

## Core Modules

### [endpoint.ts](/api/endpoint)
Core communication functions for PostMessage and Stream endpoints.

**Key Functions:**
- `streamToPostMessage()` - Convert streams to PostMessage interface
- `postMessageToStream()` - Convert PostMessage to streams
- `createChannel()` - Create isolated communication channels
- `connectEndpoints()` - Connect PostMessage endpoints
- `connectStreams()` - Connect stream endpoints

### [remoteObject.ts](/api/remote-object)
High-level RPC API for cross-realm object manipulation.

**Key Functions:**
- `wrap()` - Create proxy for remote objects
- `expose()` - Expose objects for remote access

### [endpointWeb.ts](/api/endpoint-web)
Web API adapters for WebSocket and WebRTC integration.

**Key Functions:**
- `webSocketToPostMessage()` - WebSocket adapter
- `dataChannelToStream()` - WebRTC DataChannel to stream adapter
- `dataChannelToPostMessage()` - WebRTC DataChannel to PostMessage adapter

## Types

### [Types Reference](/api/types)
Core TypeScript interfaces and types used throughout the library.

## Module Exports

The main module exports are organized in `src/index.ts`:

```typescript
// Core endpoint functions
export {
  streamToPostMessage,
  postMessageToStream,
  createChannel,
  connectEndpoints,
  connectStreams
} from './endpoint'

// Remote object API
export {
  wrap,
  expose
} from './remoteObject'

// Web API adapters
export {
  webSocketToPostMessage,
  dataChannelToStream,
  dataChannelToPostMessage
} from './endpointWeb'
```

## Usage Patterns

### Import Everything
```typescript
import * as comlink from 'comlink2'
```

### Import Specific Functions
```typescript
import { wrap, expose } from 'comlink2'
```

### Import by Module
```typescript
import { streamToPostMessage } from 'comlink2/endpoint'
import { wrap } from 'comlink2/remoteObject'
```

## Next Steps

- Explore individual [module documentation](/api/endpoint)
- See [examples](/examples/) for usage patterns
- Review [core concepts](/guide/core-concepts)