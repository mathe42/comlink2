# Web API Adapters

comlink2 includes adapters for integrating with various Web APIs, making it easy to use WebSocket, WebRTC DataChannel, and other communication mechanisms with the unified interface.

## WebSocket Adapter

### webSocketToPostMessage()

Convert a WebSocket to a PostMessage endpoint:

```typescript
import { webSocketToPostMessage } from 'comlink2'

const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)

// Use as PostMessage endpoint
endpoint.postMessage({ type: 'greeting', message: 'Hello Server!' })

endpoint.addEventListener('message', (event) => {
  console.log('From server:', event.data)
})
```

### WebSocket Features

- **Automatic JSON serialization** - Objects are automatically JSON.stringify/parsed
- **Connection state handling** - Waits for socket to be open before sending
- **Error recovery** - Handles JSON parsing errors gracefully
- **Event forwarding** - WebSocket events are converted to MessageEvents

### WebSocket Example

```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

// Client side
const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)

// Use with Remote Objects
const serverApi = wrap(endpoint)
const result = await serverApi.processData({ userId: 123 })

// Server side (Node.js with ws library)
import { WebSocketServer } from 'ws'
import { webSocketToPostMessage, expose } from 'comlink2'

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  const endpoint = webSocketToPostMessage(ws)
  
  const api = {
    processData(data) {
      return { 
        processed: true, 
        userId: data.userId,
        timestamp: Date.now()
      }
    }
  }
  
  expose(api, endpoint)
})
```

## WebRTC DataChannel Adapters

### dataChannelToPostMessage()

Convert a WebRTC DataChannel to a PostMessage endpoint:

```typescript
import { dataChannelToPostMessage } from 'comlink2'

// Create peer connection and data channel
const pc = new RTCPeerConnection()
const channel = pc.createDataChannel('my-channel')

const endpoint = dataChannelToPostMessage(channel)

// Use as PostMessage endpoint
endpoint.postMessage({ type: 'peer-data', payload: {...} })

endpoint.addEventListener('message', (event) => {
  console.log('From peer:', event.data)
})
```

### dataChannelToStream()

Convert a WebRTC DataChannel to a Stream endpoint:

```typescript
import { dataChannelToStream } from 'comlink2'

const pc = new RTCPeerConnection()
const channel = pc.createDataChannel('stream-channel')

const stream = dataChannelToStream(channel)

// Write to stream
const writer = stream.writable.getWriter()
await writer.write({ data: 'streaming data' })

// Read from stream
const reader = stream.readable.getReader()
const { value } = await reader.read()
console.log('Stream data:', value)
```

### DataChannel Features

- **Ready state checking** - Waits for DataChannel to be open
- **Binary support** - Handles both text and binary data
- **Ordered delivery** - Maintains message order
- **Single writer** - Prevents WritableStream lock conflicts

### P2P Communication Example

```typescript
import { dataChannelToPostMessage, wrap, expose } from 'comlink2'

// Peer 1
const pc1 = new RTCPeerConnection()
const channel1 = pc1.createDataChannel('rpc')
const endpoint1 = dataChannelToPostMessage(channel1)

const api1 = {
  ping() {
    return 'pong from peer 1'
  }
}

expose(api1, endpoint1)

// Peer 2
const pc2 = new RTCPeerConnection()
let channel2

pc2.ondatachannel = (event) => {
  channel2 = event.channel
  const endpoint2 = dataChannelToPostMessage(channel2)
  
  const api2 = {
    ping() {
      return 'pong from peer 2'
    }
  }
  
  expose(api2, endpoint2)
  
  // Use remote API
  const remoteApi = wrap(endpoint2)
  remoteApi.ping().then(result => {
    console.log('Response:', result)
  })
}

// Complete WebRTC setup...
```

## Custom Adapters

### Creating Custom Adapters

You can create adapters for other communication mechanisms:

```typescript
import { PostMessageEndpoint } from 'comlink2'

function customTransportToPostMessage(transport: CustomTransport): PostMessageEndpoint {
  const listeners: ((event: MessageEvent) => void)[] = []
  
  // Set up transport message handling
  transport.onMessage = (data) => {
    const event = new MessageEvent('message', { data })
    listeners.forEach(listener => listener(event))
  }
  
  return {
    postMessage: (data) => {
      transport.send(data)
    },
    
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.push(listener)
      }
    },
    
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }
}
```

### EventSource Adapter Example

```typescript
function eventSourceToPostMessage(eventSource: EventSource): PostMessageEndpoint {
  const listeners: ((event: MessageEvent) => void)[] = []
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    const messageEvent = new MessageEvent('message', { data })
    listeners.forEach(listener => listener(messageEvent))
  }
  
  return {
    postMessage: (data) => {
      // EventSource is read-only, handle accordingly
      console.warn('EventSource is read-only')
    },
    
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.push(listener)
      }
    },
    
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }
  }
}
```

## Error Handling

### WebSocket Error Handling

```typescript
import { webSocketToPostMessage } from 'comlink2'

const socket = new WebSocket('ws://localhost:8080')

socket.onerror = (error) => {
  console.error('WebSocket error:', error)
}

socket.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason)
}

const endpoint = webSocketToPostMessage(socket)

// Handle endpoint errors
endpoint.addEventListener('message', (event) => {
  try {
    processMessage(event.data)
  } catch (error) {
    console.error('Message processing error:', error)
  }
})
```

### DataChannel Error Handling

```typescript
import { dataChannelToPostMessage } from 'comlink2'

const pc = new RTCPeerConnection()
const channel = pc.createDataChannel('my-channel')

channel.onerror = (error) => {
  console.error('DataChannel error:', error)
}

channel.onclose = () => {
  console.log('DataChannel closed')
}

const endpoint = dataChannelToPostMessage(channel)
```

## Performance Considerations

1. **WebSocket** - Low latency, good for real-time communication
2. **DataChannel** - P2P communication, no server required
3. **Message size** - Consider compression for large messages
4. **Connection state** - Always check ready state before sending

## Best Practices

1. **Handle connection states** - Check if transport is ready
2. **Implement reconnection** - Handle connection failures
3. **Validate messages** - Always validate incoming data
4. **Clean up resources** - Close connections when done
5. **Error handling** - Implement comprehensive error handling

## Use Cases

- **Real-time messaging** - WebSocket for server communication
- **P2P gaming** - DataChannel for direct peer communication
- **Live streaming** - Server-sent events with EventSource
- **IoT communication** - Custom protocols with adapters

## Next Steps

- See [WebSocket examples](/examples/websocket)
- Explore [WebRTC examples](/examples/webrtc)
- Learn about [API Reference](/api/endpoint-web)