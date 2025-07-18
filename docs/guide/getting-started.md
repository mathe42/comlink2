# Getting Started

## Installation

Install objex via npm:

```bash
npm install objex
```

## Basic Usage

objex provides three main ways to communicate across contexts:

### 1. Remote Objects (Recommended)

The easiest way to get started is with remote objects:

```typescript
import { wrap, expose } from 'objex'

// Worker thread (worker.js)
const api = {
  add(a: number, b: number) {
    return a + b
  },
  async fetchData(url: string) {
    const response = await fetch(url)
    return response.json()
  }
}

expose(api, self)

// Main thread
const worker = new Worker('worker.js')
const remoteApi = wrap(worker)

// Use remote API as if it were local
const sum = await remoteApi.add(5, 3) // 8
const data = await remoteApi.fetchData('/api/data')
```

### 2. PostMessage Endpoint

For more control over message handling:

```typescript
import { connectEndpoints } from 'objex'

const worker = new Worker('worker.js')
const cleanup = connectEndpoints(worker, {
  addEventListener: (type, listener) => {
    if (type === 'message') {
      // Handle messages
      console.log('Received:', listener)
    }
  },
  postMessage: (data) => {
    console.log('Sending:', data)
  }
})

// Clean up when done
cleanup()
```

### 3. Stream Endpoint

For stream-based communication:

```typescript
import { streamToPostMessage, postMessageToStream } from 'objex'

const worker = new Worker('worker.js')
const stream = postMessageToStream(worker)

// Write to stream
const writer = stream.writable.getWriter()
writer.write({ type: 'greeting', message: 'Hello!' })

// Read from stream
const reader = stream.readable.getReader()
const { value } = await reader.read()
console.log(value)
```

## Next Steps

- Learn about [Core Concepts](/guide/core-concepts)
- Explore [API Reference](/api/)
- See more [Examples](/examples/)