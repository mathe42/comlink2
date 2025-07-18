# Core Concepts

## Three Interface Types

objex provides three main interface types for different communication needs:

### PostMessageEndpoint

Event-driven communication interface compatible with:
- `Worker`
- `MessagePort` 
- `BroadcastChannel`
- `ServiceWorker`
- `Window`

```typescript
interface PostMessageEndpoint {
  postMessage(data: any): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener?(type: 'message', listener: (event: MessageEvent) => void): void
}
```

### StreamEndpoint

Stream-based communication using Web Streams:

```typescript
interface StreamEndpoint {
  readable: ReadableStream
  writable: WritableStream
}
```

### RemoteObject

High-level API for cross-realm object manipulation using RPC:

```typescript
const remoteApi = wrap(endpoint)
const result = await remoteApi.someMethod(args)
```

## Core Functions

### Conversion Functions

Convert between interface types:

```typescript
import { streamToPostMessage, postMessageToStream } from 'objex'

// Convert stream to PostMessage
const pmEndpoint = streamToPostMessage(streamEndpoint)

// Convert PostMessage to stream  
const streamEndpoint = postMessageToStream(pmEndpoint)
```

### Channel Creation

Create isolated communication channels:

```typescript
import { createChannel } from 'objex'

const channel1 = createChannel(endpoint, 'channel1')
const channel2 = createChannel(endpoint, 'channel2')
// Messages sent to channel1 won't interfere with channel2
```

### Connection Functions

Establish bidirectional communication:

```typescript
import { connectEndpoints, connectStreams } from 'objex'

// Connect two PostMessage endpoints
const cleanup1 = connectEndpoints(endpoint1, endpoint2)

// Connect two stream endpoints
const cleanup2 = connectStreams(stream1, stream2)
```

## Resource Management

All connection functions return cleanup functions:

```typescript
const cleanup = connectEndpoints(worker, mainThread)

// Always clean up when done
cleanup()
```

## Error Handling

objex includes built-in error handling:

```typescript
try {
  const result = await remoteApi.riskyOperation()
} catch (error) {
  console.error('Remote operation failed:', error)
}
```

## Security Features

- Input validation for RPC calls
- Protection against prototype pollution
- Safe property access controls
- Automatic argument serialization/deserialization

## Next Steps

- Learn about [PostMessage Endpoint](/guide/postmessage-endpoint)
- Explore [Stream Endpoint](/guide/stream-endpoint)
- Understand [Remote Objects](/guide/remote-objects)