# PostMessage Endpoint

The PostMessage Endpoint is the core interface for event-driven communication in objex. It's compatible with native browser APIs like Worker, MessagePort, BroadcastChannel, and more.

## Interface

```typescript
interface PostMessageEndpoint {
  postMessage(data: any): void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
  removeEventListener?(type: 'message', listener: (event: MessageEvent) => void): void
}
```

## Native Compatibility

These browser APIs already implement the PostMessage interface:

### Worker
```typescript
const worker = new Worker('worker.js')
// worker already implements PostMessageEndpoint
```

### MessagePort
```typescript
const channel = new MessageChannel()
const port1 = channel.port1 // implements PostMessageEndpoint
const port2 = channel.port2 // implements PostMessageEndpoint
```

### BroadcastChannel
```typescript
const channel = new BroadcastChannel('my-channel')
// channel already implements PostMessageEndpoint
```

### Window/ServiceWorker
```typescript
// In service worker
self // implements PostMessageEndpoint

// In main thread communicating with service worker
navigator.serviceWorker.controller // implements PostMessageEndpoint
```

## Core Functions

### connectEndpoints()

Connect two PostMessage endpoints bidirectionally:

```typescript
import { connectEndpoints } from 'objex'

const worker = new Worker('worker.js')
const mainEndpoint = {
  postMessage: (data) => console.log('To worker:', data),
  addEventListener: (type, listener) => {
    if (type === 'message') {
      // Handle messages from worker
      worker.addEventListener('message', listener)
    }
  }
}

const cleanup = connectEndpoints(worker, mainEndpoint)

// Messages sent to worker will be logged by mainEndpoint
// Messages sent to mainEndpoint will be forwarded to worker
```

### createChannel()

Create isolated communication channels over a shared endpoint:

```typescript
import { createChannel } from 'objex'

const worker = new Worker('worker.js')

// Create separate channels
const dataChannel = createChannel(worker, 'data')
const controlChannel = createChannel(worker, 'control')

// Send to specific channels
dataChannel.postMessage({ type: 'user-data', payload: {...} })
controlChannel.postMessage({ type: 'stop' })

// Listen to specific channels
dataChannel.addEventListener('message', (event) => {
  console.log('Data:', event.data)
})

controlChannel.addEventListener('message', (event) => {
  console.log('Control:', event.data)
})
```

## Advanced Usage

### Custom PostMessage Implementation

You can create custom PostMessage endpoints:

```typescript
class CustomEndpoint implements PostMessageEndpoint {
  private listeners: ((event: MessageEvent) => void)[] = []
  
  postMessage(data: any) {
    // Custom message handling
    console.log('Sending:', data)
    this.broadcast(data)
  }
  
  addEventListener(type: 'message', listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.push(listener)
    }
  }
  
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }
  
  private broadcast(data: any) {
    const event = new MessageEvent('message', { data })
    this.listeners.forEach(listener => listener(event))
  }
}
```

### Error Handling

```typescript
import { connectEndpoints } from 'objex'

const worker = new Worker('worker.js')

const endpoint = {
  postMessage: (data) => {
    try {
      worker.postMessage(data)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  },
  addEventListener: (type, listener) => {
    if (type === 'message') {
      worker.addEventListener('message', (event) => {
        try {
          listener(event)
        } catch (error) {
          console.error('Error processing message:', error)
        }
      })
    }
  }
}

const cleanup = connectEndpoints(worker, endpoint)
```

### Message Filtering

```typescript
import { createChannel } from 'objex'

const worker = new Worker('worker.js')

// Create filtered channel
const filteredChannel = createChannel(worker, 'filtered')

// Only forward specific message types
filteredChannel.addEventListener('message', (event) => {
  if (event.data.type === 'important') {
    console.log('Important message:', event.data)
  }
})
```

## Best Practices

1. **Always clean up** - Use returned cleanup functions
2. **Handle errors** - Wrap message operations in try/catch
3. **Use channels** - Isolate different message types
4. **Validate messages** - Check message structure before processing
5. **Type safety** - Use TypeScript for message interfaces

## Performance Considerations

- **Message size** - Large messages can be slow to serialize
- **Frequency** - High-frequency messages can cause performance issues
- **Memory leaks** - Always remove event listeners when done

## Next Steps

- Learn about [Stream Endpoint](/guide/stream-endpoint)
- See [PostMessage examples](/examples/basic)
- Explore [API Reference](/api/endpoint)