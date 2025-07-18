# Basic Usage Examples

## PostMessage Endpoint

### Simple Message Exchange

```typescript
import { connectEndpoints } from 'objex'

// Create message channels
const channel = new MessageChannel()
const port1 = channel.port1
const port2 = channel.port2

// Connect the ports
const cleanup = connectEndpoints(port1, port2)

// Send message from port1
port1.postMessage({ type: 'greeting', message: 'Hello!' })

// Receive on port2
port2.addEventListener('message', (event) => {
  console.log('Received:', event.data)
  // Output: { type: 'greeting', message: 'Hello!' }
})

// Clean up when done
cleanup()
```

### Worker Communication

```typescript
// main.js
import { connectEndpoints } from 'objex'

const worker = new Worker('worker.js')

// Create bidirectional connection
const cleanup = connectEndpoints(worker, {
  addEventListener: (type, listener) => {
    if (type === 'message') {
      // Handle messages from worker
      console.log('From worker:', listener)
    }
  },
  postMessage: (data) => {
    // Send messages to worker
    worker.postMessage(data)
  }
})

// Send initial message
worker.postMessage({ type: 'start', data: 'Begin processing' })
```

```typescript
// worker.js
import { connectEndpoints } from 'objex'

// Connect to main thread
const cleanup = connectEndpoints(self, {
  addEventListener: (type, listener) => {
    if (type === 'message') {
      console.log('From main:', listener)
    }
  },
  postMessage: (data) => {
    self.postMessage(data)
  }
})

// Process messages
self.addEventListener('message', (event) => {
  if (event.data.type === 'start') {
    // Process and respond
    self.postMessage({ 
      type: 'result', 
      data: 'Processing complete' 
    })
  }
})
```

## Stream Endpoint

### Stream Conversion

```typescript
import { postMessageToStream, streamToPostMessage } from 'objex'

const worker = new Worker('worker.js')

// Convert worker to stream
const stream = postMessageToStream(worker)

// Write to stream
const writer = stream.writable.getWriter()
await writer.write({ type: 'data', value: 42 })
await writer.close()

// Read from stream
const reader = stream.readable.getReader()
const { value, done } = await reader.read()
console.log('Received:', value)
```

### Stream Pipeline

```typescript
import { connectStreams } from 'objex'

// Create transform stream
const transformer = new TransformStream({
  transform(chunk, controller) {
    // Transform data
    controller.enqueue({
      ...chunk,
      processed: true,
      timestamp: Date.now()
    })
  }
})

// Create source stream
const source = new ReadableStream({
  start(controller) {
    controller.enqueue({ type: 'data', value: 1 })
    controller.enqueue({ type: 'data', value: 2 })
    controller.close()
  }
})

// Create destination stream
const destination = new WritableStream({
  write(chunk) {
    console.log('Output:', chunk)
  }
})

// Connect streams
const cleanup = connectStreams(
  { readable: source, writable: transformer.writable },
  { readable: transformer.readable, writable: destination }
)
```

## Channel Creation

### Isolated Channels

```typescript
import { createChannel } from 'objex'

const worker = new Worker('worker.js')

// Create separate channels for different purposes
const dataChannel = createChannel(worker, 'data')
const controlChannel = createChannel(worker, 'control')

// Send data messages
dataChannel.postMessage({ payload: 'user data' })

// Send control messages
controlChannel.postMessage({ command: 'stop' })

// Listen to specific channels
dataChannel.addEventListener('message', (event) => {
  console.log('Data message:', event.data)
})

controlChannel.addEventListener('message', (event) => {
  console.log('Control message:', event.data)
})
```

### Worker Channel Setup

```typescript
// worker.js
import { createChannel } from 'objex'

// Create matching channels
const dataChannel = createChannel(self, 'data')
const controlChannel = createChannel(self, 'control')

// Handle data messages
dataChannel.addEventListener('message', (event) => {
  const { payload } = event.data
  // Process payload
  dataChannel.postMessage({ result: payload.toUpperCase() })
})

// Handle control messages
controlChannel.addEventListener('message', (event) => {
  const { command } = event.data
  if (command === 'stop') {
    controlChannel.postMessage({ status: 'stopped' })
  }
})
```

## Error Handling

### Robust Message Handling

```typescript
import { connectEndpoints } from 'objex'

const worker = new Worker('worker.js')

const cleanup = connectEndpoints(worker, {
  addEventListener: (type, listener) => {
    if (type === 'message') {
      try {
        // Validate message structure
        if (!listener.data || typeof listener.data !== 'object') {
          throw new Error('Invalid message format')
        }
        
        // Process message
        console.log('Valid message:', listener.data)
        
      } catch (error) {
        console.error('Message processing error:', error)
        
        // Send error response
        worker.postMessage({
          type: 'error',
          message: error.message
        })
      }
    }
  },
  postMessage: (data) => {
    // Validate outgoing messages
    if (data && typeof data === 'object') {
      worker.postMessage(data)
    } else {
      console.error('Invalid outgoing message:', data)
    }
  }
})
```

## Next Steps

- See [Worker Communication](/examples/worker) for complete patterns
- Explore [Remote Object RPC](/examples/remote-object) for high-level API
- Learn about [WebSocket Integration](/examples/websocket)