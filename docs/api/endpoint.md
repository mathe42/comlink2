# endpoint.ts API Reference

Core communication functions for PostMessage and Stream endpoints.

## Functions

### streamToPostMessage()

Convert a Stream endpoint to a PostMessage endpoint.

```typescript
function streamToPostMessage(stream: StreamEndpoint): PostMessageEndpoint
```

**Parameters:**
- `stream` - StreamEndpoint with readable and writable streams

**Returns:**
- PostMessageEndpoint that wraps the stream

**Example:**
```typescript
import { streamToPostMessage } from 'objex'

const stream = {
  readable: new ReadableStream({
    start(controller) {
      controller.enqueue({ message: 'Hello' })
      controller.close()
    }
  }),
  writable: new WritableStream({
    write(chunk) {
      console.log('Received:', chunk)
    }
  })
}

const endpoint = streamToPostMessage(stream)
endpoint.postMessage({ greeting: 'Hi!' })
```

### postMessageToStream()

Convert a PostMessage endpoint to a Stream endpoint.

```typescript
function postMessageToStream(endpoint: PostMessageEndpoint): StreamEndpoint
```

**Parameters:**
- `endpoint` - PostMessageEndpoint to convert

**Returns:**
- StreamEndpoint with readable and writable streams

**Example:**
```typescript
import { postMessageToStream } from 'objex'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

const writer = stream.writable.getWriter()
await writer.write({ data: 'test' })
```

### createChannel()

Create an isolated communication channel over a shared PostMessage endpoint.

```typescript
function createChannel(endpoint: PostMessageEndpoint, channelId: string | number): PostMessageEndpoint
```

**Parameters:**
- `endpoint` - Base PostMessage endpoint
- `channelId` - Unique identifier for the channel

**Returns:**
- PostMessageEndpoint filtered to the specific channel

**Example:**
```typescript
import { createChannel } from 'objex'

const worker = new Worker('worker.js')
const dataChannel = createChannel(worker, 'data')
const controlChannel = createChannel(worker, 'control')

dataChannel.postMessage({ type: 'user-data' })
controlChannel.postMessage({ type: 'stop' })
```

### connectEndpoints()

Establish bidirectional communication between two PostMessage endpoints.

```typescript
function connectEndpoints(endpoint1: PostMessageEndpoint, endpoint2: PostMessageEndpoint): () => void
```

**Parameters:**
- `endpoint1` - First PostMessage endpoint
- `endpoint2` - Second PostMessage endpoint

**Returns:**
- Cleanup function to remove listeners

**Example:**
```typescript
import { connectEndpoints } from 'objex'

const worker = new Worker('worker.js')
const mainEndpoint = {
  postMessage: (data) => console.log('To worker:', data),
  addEventListener: (type, listener) => {
    if (type === 'message') {
      worker.addEventListener('message', listener)
    }
  }
}

const cleanup = connectEndpoints(worker, mainEndpoint)
// Always clean up when done
cleanup()
```

### connectStreams()

Establish bidirectional communication between two Stream endpoints.

```typescript
function connectStreams(stream1: StreamEndpoint, stream2: StreamEndpoint): () => void
```

**Parameters:**
- `stream1` - First Stream endpoint
- `stream2` - Second Stream endpoint

**Returns:**
- Cleanup function to cancel streams

**Example:**
```typescript
import { connectStreams } from 'objex'

const stream1 = {
  readable: new ReadableStream({
    start(controller) {
      controller.enqueue({ from: 'stream1' })
      controller.close()
    }
  }),
  writable: new WritableStream({
    write(chunk) {
      console.log('Stream1 received:', chunk)
    }
  })
}

const stream2 = {
  readable: new ReadableStream({
    start(controller) {
      controller.enqueue({ from: 'stream2' })
      controller.close()
    }
  }),
  writable: new WritableStream({
    write(chunk) {
      console.log('Stream2 received:', chunk)
    }
  })
}

const cleanup = connectStreams(stream1, stream2)
```

## Types

### PostMessageEndpoint

Interface for event-driven communication.

```typescript
interface PostMessageEndpoint {
  postMessage(data: any): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener?(type: 'message', listener: (event: MessageEvent) => void): void
}
```

### StreamEndpoint

Interface for stream-based communication.

```typescript
interface StreamEndpoint {
  readable: ReadableStream
  writable: WritableStream
}
```

## Implementation Details

### Identity TransformStreams

The conversion functions use identity TransformStreams to avoid data copying:

```typescript
// Internal implementation uses identity transforms
const identityTransform = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk)
  }
})
```

### Message Filtering

Channel creation uses message filtering based on channel ID:

```typescript
// Messages are wrapped with channel information
const wrappedMessage = {
  channel: channelId,
  data: originalMessage
}
```

### Resource Management

All connection functions return cleanup functions that:
- Remove event listeners
- Cancel active streams
- Clean up internal resources

## Error Handling

Functions include built-in error handling:

```typescript
// Stream errors are propagated to PostMessage
stream.readable.pipeTo(destination).catch(error => {
  console.error('Stream error:', error)
})

// PostMessage errors are handled gracefully
endpoint.addEventListener('message', (event) => {
  try {
    processMessage(event.data)
  } catch (error) {
    console.error('Message processing error:', error)
  }
})
```

## Performance Considerations

- **Memory usage** - Identity transforms minimize memory overhead
- **Message frequency** - High-frequency messages may cause performance issues
- **Stream buffering** - Streams use default buffering strategies
- **Cleanup** - Always use cleanup functions to prevent memory leaks

## Best Practices

1. **Always clean up** - Use returned cleanup functions
2. **Handle errors** - Wrap operations in try/catch
3. **Validate messages** - Check message structure before processing
4. **Use channels** - Isolate different message types
5. **Monitor performance** - Watch for memory leaks and performance issues

## Next Steps

- See [PostMessage Endpoint Guide](/guide/postmessage-endpoint)
- Explore [Stream Endpoint Guide](/guide/stream-endpoint)
- Check [Basic Examples](/examples/basic)