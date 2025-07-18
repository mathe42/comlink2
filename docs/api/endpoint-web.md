# endpointWeb.ts API Reference

Web API adapters for WebSocket and WebRTC DataChannel integration.

## Functions

### webSocketToPostMessage()

Convert a WebSocket to a PostMessage endpoint.

```typescript
function webSocketToPostMessage(socket: WebSocket): PostMessageEndpoint
```

**Parameters:**
- `socket` - WebSocket instance

**Returns:**
- PostMessageEndpoint that wraps the WebSocket

**Features:**
- Automatic JSON serialization/deserialization
- Connection state handling
- Error recovery for malformed JSON
- Event forwarding

**Example:**
```typescript
import { webSocketToPostMessage } from 'objex'

const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)

endpoint.postMessage({ type: 'greeting', message: 'Hello!' })

endpoint.addEventListener('message', (event) => {
  console.log('From server:', event.data)
})
```

### dataChannelToPostMessage()

Convert a WebRTC DataChannel to a PostMessage endpoint.

```typescript
function dataChannelToPostMessage(channel: RTCDataChannel): PostMessageEndpoint
```

**Parameters:**
- `channel` - RTCDataChannel instance

**Returns:**
- PostMessageEndpoint that wraps the DataChannel

**Features:**
- Ready state checking
- Binary and text data support
- Ordered delivery
- Connection state monitoring

**Example:**
```typescript
import { dataChannelToPostMessage } from 'objex'

const pc = new RTCPeerConnection()
const channel = pc.createDataChannel('my-channel')
const endpoint = dataChannelToPostMessage(channel)

endpoint.postMessage({ type: 'peer-data', payload: {...} })

endpoint.addEventListener('message', (event) => {
  console.log('From peer:', event.data)
})
```

### dataChannelToStream()

Convert a WebRTC DataChannel to a Stream endpoint.

```typescript
function dataChannelToStream(channel: RTCDataChannel): StreamEndpoint
```

**Parameters:**
- `channel` - RTCDataChannel instance

**Returns:**
- StreamEndpoint with readable and writable streams

**Features:**
- Stream-based communication
- Backpressure handling
- Single writer instance to avoid conflicts
- Ready state management

**Example:**
```typescript
import { dataChannelToStream } from 'objex'

const pc = new RTCPeerConnection()
const channel = pc.createDataChannel('stream-channel')
const stream = dataChannelToStream(channel)

// Write to stream
const writer = stream.writable.getWriter()
await writer.write({ data: 'streaming data' })
await writer.close()

// Read from stream
const reader = stream.readable.getReader()
const { value, done } = await reader.read()
console.log('Stream data:', value)
```

## Implementation Details

### WebSocket Adapter

The WebSocket adapter handles:

```typescript
// Connection state checking
if (socket.readyState === WebSocket.OPEN) {
  socket.send(JSON.stringify(data))
}

// JSON parsing with error recovery
socket.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)
    dispatchMessage(data)
  } catch (error) {
    console.warn('Failed to parse JSON:', error)
    dispatchMessage(event.data) // Send raw data
  }
}
```

### DataChannel Adapter

The DataChannel adapter includes:

```typescript
// Ready state checking
if (channel.readyState === 'open') {
  channel.send(JSON.stringify(data))
}

// Binary data handling
channel.onmessage = (event) => {
  let data = event.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (error) {
      // Keep as string if not JSON
    }
  }
  dispatchMessage(data)
}
```

### Stream Implementation

The DataChannel stream adapter:

```typescript
// Single writer instance to prevent locks
let writer: WritableStreamDefaultWriter | null = null

const writable = new WritableStream({
  write(chunk) {
    if (channel.readyState === 'open') {
      channel.send(JSON.stringify(chunk))
    }
  }
})

// Prevent multiple writers
if (!writer) {
  writer = writable.getWriter()
}
```

## Error Handling

### WebSocket Errors

```typescript
import { webSocketToPostMessage } from 'objex'

const socket = new WebSocket('ws://localhost:8080')

socket.onerror = (error) => {
  console.error('WebSocket error:', error)
}

socket.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason)
}

const endpoint = webSocketToPostMessage(socket)
```

### DataChannel Errors

```typescript
import { dataChannelToPostMessage } from 'objex'

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

## Advanced Usage

### Custom Serialization

Override JSON serialization for WebSocket:

```typescript
import { webSocketToPostMessage } from 'objex'

const socket = new WebSocket('ws://localhost:8080')

// Custom serialization wrapper
const customEndpoint = {
  postMessage: (data) => {
    const serialized = customSerialize(data)
    socket.send(serialized)
  },
  addEventListener: (type, listener) => {
    if (type === 'message') {
      socket.addEventListener('message', (event) => {
        const data = customDeserialize(event.data)
        listener(new MessageEvent('message', { data }))
      })
    }
  }
}
```

### P2P Communication Setup

Complete WebRTC setup with DataChannel:

```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

// Peer 1 (Initiator)
const pc1 = new RTCPeerConnection()
const channel1 = pc1.createDataChannel('rpc')
const endpoint1 = dataChannelToPostMessage(channel1)

const api1 = {
  calculate(a, b) {
    return a + b
  }
}

expose(api1, endpoint1)

// Peer 2 (Responder)
const pc2 = new RTCPeerConnection()

pc2.ondatachannel = (event) => {
  const channel2 = event.channel
  const endpoint2 = dataChannelToPostMessage(channel2)
  
  // Use remote API
  const remoteApi = wrap(endpoint2)
  
  channel2.onopen = async () => {
    const result = await remoteApi.calculate(5, 3)
    console.log('Result:', result) // 8
  }
}

// Complete signaling process...
```

## Performance Considerations

### WebSocket
- **Low latency** - Direct TCP connection
- **Server dependency** - Requires server infrastructure
- **Scalability** - Server handles connection management

### DataChannel
- **P2P communication** - Direct peer-to-peer
- **No server** - Once established, no server needed
- **NAT traversal** - May require STUN/TURN servers

### Message Size
- **WebSocket** - No built-in size limits
- **DataChannel** - Message size limits (typically 64KB)
- **Compression** - Consider compression for large messages

## Best Practices

1. **Connection state** - Always check ready state before sending
2. **Error handling** - Implement comprehensive error handling
3. **Reconnection** - Handle connection failures gracefully
4. **Message validation** - Validate incoming messages
5. **Resource cleanup** - Close connections when done

## Security Considerations

- **WebSocket** - Use WSS for secure connections
- **DataChannel** - Uses DTLS encryption by default
- **Input validation** - Always validate incoming data
- **Origin checking** - Verify message sources

## Browser Compatibility

- **WebSocket** - Supported in all modern browsers
- **DataChannel** - Supported in all modern browsers
- **Stream API** - Supported in modern browsers (check compatibility)

## Next Steps

- See [WebSocket examples](/examples/websocket)
- Explore [WebRTC examples](/examples/webrtc)
- Learn about [Web API Adapters Guide](/guide/web-api-adapters)