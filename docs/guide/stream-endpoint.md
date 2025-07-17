# Stream Endpoint

The Stream Endpoint provides stream-based communication using Web Streams API for bidirectional data flow. It's ideal for scenarios requiring backpressure handling and stream processing.

## Interface

```typescript
interface StreamEndpoint {
  readable: ReadableStream
  writable: WritableStream
}
```

## Core Functions

### postMessageToStream()

Convert a PostMessage endpoint to a Stream endpoint:

```typescript
import { postMessageToStream } from 'comlink2'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

// Write to the stream
const writer = stream.writable.getWriter()
await writer.write({ type: 'data', value: 42 })
await writer.close()

// Read from the stream
const reader = stream.readable.getReader()
const { value, done } = await reader.read()
console.log('Received:', value)
```

### streamToPostMessage()

Convert a Stream endpoint to a PostMessage endpoint:

```typescript
import { streamToPostMessage } from 'comlink2'

// Create a stream endpoint
const stream = {
  readable: new ReadableStream({
    start(controller) {
      controller.enqueue({ message: 'Hello' })
      controller.enqueue({ message: 'World' })
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

// Now use as PostMessage endpoint
endpoint.postMessage({ greeting: 'Hi there!' })
endpoint.addEventListener('message', (event) => {
  console.log('Message:', event.data)
})
```

### connectStreams()

Connect two stream endpoints bidirectionally:

```typescript
import { connectStreams } from 'comlink2'

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
// Data from stream1.readable flows to stream2.writable
// Data from stream2.readable flows to stream1.writable
```

## Advanced Usage

### Transform Streams

Use transform streams for data processing:

```typescript
import { postMessageToStream } from 'comlink2'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

// Create transform stream
const transformer = new TransformStream({
  transform(chunk, controller) {
    // Process data
    const processed = {
      ...chunk,
      processed: true,
      timestamp: Date.now()
    }
    controller.enqueue(processed)
  }
})

// Pipe through transformer
const transformedStream = {
  readable: stream.readable.pipeThrough(transformer),
  writable: stream.writable
}

// Use transformed stream
const reader = transformedStream.readable.getReader()
const { value } = await reader.read()
console.log('Transformed data:', value)
```

### Backpressure Handling

Streams automatically handle backpressure:

```typescript
import { postMessageToStream } from 'comlink2'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

const writer = stream.writable.getWriter()

// Write with backpressure handling
try {
  await writer.write({ data: 'large payload' })
  await writer.write({ data: 'another payload' })
} catch (error) {
  console.error('Write failed:', error)
} finally {
  writer.releaseLock()
}
```

### Stream Composition

Combine multiple streams:

```typescript
import { connectStreams } from 'comlink2'

// Create processing pipeline
const inputStream = new ReadableStream({
  start(controller) {
    for (let i = 0; i < 10; i++) {
      controller.enqueue({ value: i })
    }
    controller.close()
  }
})

const processStream = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue({ 
      ...chunk, 
      doubled: chunk.value * 2 
    })
  }
})

const outputStream = new WritableStream({
  write(chunk) {
    console.log('Final result:', chunk)
  }
})

// Connect pipeline
const pipeline = {
  readable: inputStream,
  writable: processStream.writable
}

const output = {
  readable: processStream.readable,
  writable: outputStream
}

const cleanup = connectStreams(pipeline, output)
```

## Error Handling

### Stream Error Propagation

```typescript
import { postMessageToStream } from 'comlink2'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

// Handle read errors
const reader = stream.readable.getReader()
try {
  const { value, done } = await reader.read()
  if (done) {
    console.log('Stream ended')
  } else {
    console.log('Data:', value)
  }
} catch (error) {
  console.error('Read error:', error)
} finally {
  reader.releaseLock()
}

// Handle write errors
const writer = stream.writable.getWriter()
try {
  await writer.write({ data: 'test' })
} catch (error) {
  console.error('Write error:', error)
} finally {
  writer.releaseLock()
}
```

### Transform Stream Errors

```typescript
const errorHandlingTransform = new TransformStream({
  transform(chunk, controller) {
    try {
      // Process chunk
      const result = processData(chunk)
      controller.enqueue(result)
    } catch (error) {
      controller.error(error)
    }
  }
})
```

## Performance Considerations

### Stream Buffering

```typescript
// Control buffering with highWaterMark
const stream = new ReadableStream({
  start(controller) {
    // Stream logic
  }
}, {
  highWaterMark: 10 // Buffer up to 10 chunks
})
```

### Memory Management

```typescript
// Always release locks
const reader = stream.readable.getReader()
try {
  // Use reader
} finally {
  reader.releaseLock()
}

// Or use automatic cleanup
await stream.readable.pipeTo(destination)
```

## Best Practices

1. **Release locks** - Always release reader/writer locks
2. **Handle errors** - Wrap stream operations in try/catch
3. **Use pipeTo** - Prefer pipeTo() for simple stream connections
4. **Control buffering** - Set appropriate highWaterMark values
5. **Clean up** - Use cleanup functions returned by connect methods

## Use Cases

- **Large data processing** - Handle large datasets with backpressure
- **Real-time streaming** - Process continuous data streams
- **Transform pipelines** - Chain multiple data transformations
- **Flow control** - Automatic backpressure handling

## Next Steps

- See [Stream examples](/examples/basic)
- Learn about [Web API Adapters](/guide/web-api-adapters)
- Explore [API Reference](/api/endpoint)