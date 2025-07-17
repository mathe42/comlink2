# Types Reference

Core TypeScript interfaces and types used throughout comlink2.

## Core Interfaces

### PostMessageEndpoint

The main interface for event-driven communication.

```typescript
interface PostMessageEndpoint {
  postMessage(data: any): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener?(type: 'message', listener: (event: MessageEvent) => void): void
}
```

**Properties:**
- `postMessage` - Send data to the endpoint
- `addEventListener` - Listen for incoming messages
- `removeEventListener` - Remove message listeners (optional)

**Native Implementations:**
- `Worker`
- `MessagePort`
- `BroadcastChannel`
- `ServiceWorkerGlobalScope`
- `Window` (for cross-frame communication)

### StreamEndpoint

Interface for stream-based communication using Web Streams.

```typescript
interface StreamEndpoint {
  readable: ReadableStream
  writable: WritableStream
}
```

**Properties:**
- `readable` - ReadableStream for incoming data
- `writable` - WritableStream for outgoing data

## RPC Types

### sRPCData

Data wrapper for RPC serialization.

```typescript
type sRPCData = 
  | { type: 'any', data: any }
  | { type: 'wraped', id: string | number }
```

**Variants:**
- `any` - Direct value serialization
- `wraped` - Reference to remote object

### sRPCCall

RPC call message structure.

```typescript
type sRPCCall = (
  { id: number, keyChain: string[] }
) & (
  | { type: 'await' }
  | { type: 'construct' | 'call', args: sRPCData[] }
)
```

**Properties:**
- `id` - Unique call identifier
- `keyChain` - Property access path
- `type` - Call type: 'call', 'construct', or 'await'
- `args` - Function arguments (for 'call' and 'construct')

### sRPCResponse

RPC response message structure.

```typescript
type sRPCResponse = {
  id: number
  type: 'response'
  data: sRPCData
}
```

**Properties:**
- `id` - Matching call identifier
- `type` - Always 'response'
- `data` - Return value or result

## Utility Types

### CleanupFunction

Function type for resource cleanup.

```typescript
type CleanupFunction = () => void
```

Returned by connection functions to clean up resources.

### MessageHandler

Type for message event handlers.

```typescript
type MessageHandler = (event: MessageEvent) => void
```

Used for PostMessage endpoint event listeners.

## Generic Types

### RemoteObject

Type for wrapped remote objects.

```typescript
type RemoteObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<ReturnType<T[K]>>
    : T[K] extends object
    ? RemoteObject<T[K]>
    : Promise<T[K]>
}
```

Converts synchronous object methods to asynchronous remote calls.

### Proxied

Type for objects that can be proxied.

```typescript
type Proxied<T> = T extends Function
  ? T
  : T extends object
  ? RemoteObject<T>
  : T
```

Determines if a type should be proxied for remote access.

## WebSocket Types

### WebSocketEndpoint

Extended interface for WebSocket communication.

```typescript
interface WebSocketEndpoint extends PostMessageEndpoint {
  readyState: number
  close(): void
}
```

**Additional Properties:**
- `readyState` - Connection state
- `close` - Close the connection

## DataChannel Types

### DataChannelEndpoint

Extended interface for WebRTC DataChannel communication.

```typescript
interface DataChannelEndpoint extends PostMessageEndpoint {
  readyState: RTCDataChannelState
  close(): void
}
```

**Additional Properties:**
- `readyState` - Channel state
- `close` - Close the channel

## Stream Types

### TransformEndpoint

Extended interface for transform streams.

```typescript
interface TransformEndpoint extends StreamEndpoint {
  transform: TransformStream
}
```

**Additional Properties:**
- `transform` - The underlying TransformStream

## Error Types

### RPCError

Error type for RPC-related errors.

```typescript
interface RPCError extends Error {
  code: string
  remote: boolean
}
```

**Properties:**
- `code` - Error code
- `remote` - Whether error occurred remotely

### ValidationError

Error type for validation failures.

```typescript
interface ValidationError extends Error {
  field: string
  value: any
}
```

**Properties:**
- `field` - Field that failed validation
- `value` - Invalid value

## Type Guards

### isPostMessageEndpoint

Check if object implements PostMessageEndpoint.

```typescript
function isPostMessageEndpoint(obj: any): obj is PostMessageEndpoint {
  return obj && 
    typeof obj.postMessage === 'function' && 
    typeof obj.addEventListener === 'function'
}
```

### isStreamEndpoint

Check if object implements StreamEndpoint.

```typescript
function isStreamEndpoint(obj: any): obj is StreamEndpoint {
  return obj && 
    obj.readable instanceof ReadableStream && 
    obj.writable instanceof WritableStream
}
```

### isRPCCall

Check if object is a valid RPC call.

```typescript
function isRPCCall(obj: any): obj is sRPCCall {
  return obj && 
    typeof obj.id === 'number' && 
    typeof obj.type === 'string' && 
    Array.isArray(obj.keyChain)
}
```

## Configuration Types

### ChannelConfig

Configuration for channel creation.

```typescript
interface ChannelConfig {
  id: string | number
  timeout?: number
  retries?: number
}
```

### StreamConfig

Configuration for stream creation.

```typescript
interface StreamConfig {
  highWaterMark?: number
  size?: (chunk: any) => number
}
```

## Usage Examples

### Type-Safe Remote API

```typescript
interface CalculatorAPI {
  add(a: number, b: number): number
  multiply(a: number, b: number): number
  divide(a: number, b: number): number
}

const worker = new Worker('calculator.js')
const calc: RemoteObject<CalculatorAPI> = wrap(worker)

// Type-safe remote calls
const sum = await calc.add(5, 3) // Promise<number>
const product = await calc.multiply(4, 2) // Promise<number>
```

### Custom Endpoint

```typescript
class CustomEndpoint implements PostMessageEndpoint {
  postMessage(data: any): void {
    // Custom implementation
  }
  
  addEventListener(type: 'message', listener: MessageHandler): void {
    // Custom implementation
  }
  
  removeEventListener(type: 'message', listener: MessageHandler): void {
    // Custom implementation
  }
}
```

### Stream Processing

```typescript
const processor: StreamEndpoint = {
  readable: new ReadableStream({
    start(controller) {
      // Stream logic
    }
  }),
  writable: new WritableStream({
    write(chunk) {
      // Process chunk
    }
  })
}
```

## Best Practices

1. **Use TypeScript** - Leverage type safety for better development experience
2. **Define interfaces** - Create clear interfaces for remote APIs
3. **Type guards** - Use type guards for runtime validation
4. **Generic types** - Use generic types for reusable components
5. **Error handling** - Use typed errors for better error handling

## Next Steps

- See [API Reference](/api/) for function signatures
- Learn about [Type Safety](/guide/core-concepts#type-safety)
- Explore [TypeScript Examples](/examples/)