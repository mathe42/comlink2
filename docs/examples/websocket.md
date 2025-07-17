# WebSocket Integration Examples

Examples of integrating WebSocket connections with comlink2.

## Basic WebSocket Usage

### Simple WebSocket Communication

**client.js**
```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)

// Wait for connection
socket.onopen = async () => {
  console.log('Connected to server')
  
  // Use as PostMessage endpoint
  endpoint.postMessage({ type: 'greeting', message: 'Hello Server!' })
  
  // Listen for messages
  endpoint.addEventListener('message', (event) => {
    console.log('From server:', event.data)
  })
}

socket.onclose = () => {
  console.log('Disconnected from server')
}
```

**server.js (Node.js)**
```typescript
import { WebSocketServer } from 'ws'
import { webSocketToPostMessage, expose } from 'comlink2'

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  console.log('Client connected')
  
  const endpoint = webSocketToPostMessage(ws)
  
  // Listen for messages
  endpoint.addEventListener('message', (event) => {
    console.log('From client:', event.data)
    
    // Echo back
    endpoint.postMessage({
      type: 'echo',
      original: event.data,
      timestamp: new Date().toISOString()
    })
  })
})

console.log('WebSocket server running on ws://localhost:8080')
```

## Remote Object over WebSocket

### Chat Application

**client.js**
```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)

socket.onopen = async () => {
  const chatApi = wrap(endpoint)
  
  // Join chat room
  await chatApi.joinRoom('general', 'Alice')
  
  // Send messages
  await chatApi.sendMessage('Hello everyone!')
  await chatApi.sendMessage('How is everyone doing?')
  
  // Get chat history
  const history = await chatApi.getHistory('general')
  console.log('Chat history:', history)
  
  // Leave room
  await chatApi.leaveRoom('general')
}
```

**server.js**
```typescript
import { WebSocketServer } from 'ws'
import { webSocketToPostMessage, expose } from 'comlink2'

const chatRooms = new Map()
const userSockets = new Map()

class ChatServer {
  constructor(ws, endpoint) {
    this.ws = ws
    this.endpoint = endpoint
    this.userId = null
    this.currentRoom = null
  }
  
  async joinRoom(roomId, userId) {
    this.userId = userId
    this.currentRoom = roomId
    
    if (!chatRooms.has(roomId)) {
      chatRooms.set(roomId, {
        users: new Set(),
        messages: []
      })
    }
    
    const room = chatRooms.get(roomId)
    room.users.add(userId)
    userSockets.set(userId, this.ws)
    
    // Notify other users
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      userId,
      timestamp: new Date().toISOString()
    })
    
    return { success: true, roomId, userId }
  }
  
  async sendMessage(message) {
    if (!this.currentRoom || !this.userId) {
      throw new Error('Not in a room')
    }
    
    const messageData = {
      id: Date.now(),
      userId: this.userId,
      message,
      timestamp: new Date().toISOString()
    }
    
    const room = chatRooms.get(this.currentRoom)
    room.messages.push(messageData)
    
    // Broadcast to all users in room
    this.broadcastToRoom(this.currentRoom, {
      type: 'new_message',
      ...messageData
    })
    
    return messageData
  }
  
  async getHistory(roomId) {
    const room = chatRooms.get(roomId)
    return room ? room.messages : []
  }
  
  async leaveRoom(roomId) {
    if (this.currentRoom !== roomId) {
      return { success: false, error: 'Not in this room' }
    }
    
    const room = chatRooms.get(roomId)
    if (room) {
      room.users.delete(this.userId)
      
      // Notify other users
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        userId: this.userId,
        timestamp: new Date().toISOString()
      })
    }
    
    this.currentRoom = null
    userSockets.delete(this.userId)
    
    return { success: true }
  }
  
  broadcastToRoom(roomId, message) {
    const room = chatRooms.get(roomId)
    if (!room) return
    
    for (const userId of room.users) {
      const socket = userSockets.get(userId)
      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(message))
      }
    }
  }
}

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  const endpoint = webSocketToPostMessage(ws)
  const chatServer = new ChatServer(ws, endpoint)
  
  expose(chatServer, endpoint)
  
  ws.on('close', () => {
    if (chatServer.currentRoom && chatServer.userId) {
      chatServer.leaveRoom(chatServer.currentRoom)
    }
  })
})

console.log('Chat server running on ws://localhost:8080')
```

## Real-time Data Streaming

### Live Data Feed

**client.js**
```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

const socket = new WebSocket('ws://localhost:8080')
const endpoint = webSocketToPostMessage(socket)

socket.onopen = async () => {
  const dataFeed = wrap(endpoint)
  
  // Subscribe to data streams
  await dataFeed.subscribe('stock-prices', (data) => {
    console.log('Stock update:', data)
    updateStockDisplay(data)
  })
  
  await dataFeed.subscribe('news-feed', (news) => {
    console.log('News:', news)
    addNewsItem(news)
  })
  
  // Get historical data
  const history = await dataFeed.getHistoricalData('AAPL', '1d')
  console.log('Historical data:', history)
}

function updateStockDisplay(data) {
  const element = document.getElementById(`stock-${data.symbol}`)
  if (element) {
    element.textContent = `${data.symbol}: $${data.price}`
  }
}

function addNewsItem(news) {
  const container = document.getElementById('news-container')
  const item = document.createElement('div')
  item.textContent = `${news.title} - ${news.source}`
  container.appendChild(item)
}
```

**server.js**
```typescript
import { WebSocketServer } from 'ws'
import { webSocketToPostMessage, expose } from 'comlink2'

const subscribers = new Map()
const dataStreams = new Map()

class DataFeedServer {
  constructor(ws, endpoint) {
    this.ws = ws
    this.endpoint = endpoint
    this.subscriptions = new Set()
  }
  
  async subscribe(streamId, callback) {
    this.subscriptions.add(streamId)
    
    if (!subscribers.has(streamId)) {
      subscribers.set(streamId, new Set())
    }
    
    subscribers.get(streamId).add({
      ws: this.ws,
      callback
    })
    
    return { success: true, streamId }
  }
  
  async unsubscribe(streamId) {
    this.subscriptions.delete(streamId)
    
    const streamSubscribers = subscribers.get(streamId)
    if (streamSubscribers) {
      streamSubscribers.delete(this.ws)
    }
    
    return { success: true, streamId }
  }
  
  async getHistoricalData(symbol, timeframe) {
    // Simulate historical data
    const data = []
    const now = Date.now()
    
    for (let i = 0; i < 100; i++) {
      data.push({
        symbol,
        price: 150 + Math.random() * 50,
        timestamp: now - (i * 60000), // 1 minute intervals
        volume: Math.floor(Math.random() * 10000)
      })
    }
    
    return data.reverse()
  }
  
  cleanup() {
    for (const streamId of this.subscriptions) {
      this.unsubscribe(streamId)
    }
  }
}

// Simulate live data
function generateStockData() {
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN']
  
  setInterval(() => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)]
    const data = {
      symbol,
      price: 150 + Math.random() * 50,
      change: (Math.random() - 0.5) * 10,
      timestamp: new Date().toISOString()
    }
    
    broadcastToStream('stock-prices', data)
  }, 1000)
}

function generateNews() {
  const news = [
    'Market reaches new highs',
    'Tech sector shows strong growth',
    'Economic indicators positive',
    'New regulations announced'
  ]
  
  setInterval(() => {
    const item = {
      title: news[Math.floor(Math.random() * news.length)],
      source: 'Financial Times',
      timestamp: new Date().toISOString()
    }
    
    broadcastToStream('news-feed', item)
  }, 5000)
}

function broadcastToStream(streamId, data) {
  const streamSubscribers = subscribers.get(streamId)
  if (!streamSubscribers) return
  
  for (const { ws, callback } of streamSubscribers) {
    if (ws.readyState === 1) {
      try {
        // Call the callback function
        callback(data)
      } catch (error) {
        console.error('Error calling callback:', error)
      }
    }
  }
}

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  const endpoint = webSocketToPostMessage(ws)
  const dataFeed = new DataFeedServer(ws, endpoint)
  
  expose(dataFeed, endpoint)
  
  ws.on('close', () => {
    dataFeed.cleanup()
  })
})

// Start data generation
generateStockData()
generateNews()

console.log('Data feed server running on ws://localhost:8080')
```

## Authentication and Security

### Secure WebSocket with Authentication

**client.js**
```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

class SecureWebSocketClient {
  constructor(url) {
    this.url = url
    this.token = null
    this.socket = null
    this.api = null
  }
  
  async connect(credentials) {
    this.socket = new WebSocket(this.url)
    const endpoint = webSocketToPostMessage(this.socket)
    
    return new Promise((resolve, reject) => {
      this.socket.onopen = async () => {
        try {
          this.api = wrap(endpoint)
          
          // Authenticate
          const authResult = await this.api.authenticate(credentials)
          this.token = authResult.token
          
          console.log('Authenticated successfully')
          resolve(this.api)
        } catch (error) {
          reject(error)
        }
      }
      
      this.socket.onerror = (error) => {
        reject(error)
      }
    })
  }
  
  async secureCall(method, ...args) {
    if (!this.token) {
      throw new Error('Not authenticated')
    }
    
    return this.api.secureCall(this.token, method, ...args)
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close()
    }
  }
}

// Usage
const client = new SecureWebSocketClient('ws://localhost:8080')

try {
  const api = await client.connect({
    username: 'alice',
    password: 'secret123'
  })
  
  // Make secure calls
  const userData = await client.secureCall('getUserData')
  const messages = await client.secureCall('getMessages')
  
  console.log('User data:', userData)
  console.log('Messages:', messages)
} catch (error) {
  console.error('Authentication failed:', error)
}
```

**server.js**
```typescript
import { WebSocketServer } from 'ws'
import { webSocketToPostMessage, expose } from 'comlink2'
import jwt from 'jsonwebtoken'

const SECRET_KEY = 'your-secret-key'
const users = new Map([
  ['alice', { password: 'secret123', role: 'user' }],
  ['admin', { password: 'admin123', role: 'admin' }]
])

class SecureServer {
  constructor(ws, endpoint) {
    this.ws = ws
    this.endpoint = endpoint
    this.authenticated = false
    this.user = null
  }
  
  async authenticate(credentials) {
    const { username, password } = credentials
    const user = users.get(username)
    
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials')
    }
    
    const token = jwt.sign(
      { username, role: user.role },
      SECRET_KEY,
      { expiresIn: '1h' }
    )
    
    this.authenticated = true
    this.user = { username, role: user.role }
    
    return { token, user: this.user }
  }
  
  async secureCall(token, method, ...args) {
    // Verify token
    try {
      const decoded = jwt.verify(token, SECRET_KEY)
      if (decoded.username !== this.user?.username) {
        throw new Error('Token mismatch')
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
    
    // Call the method
    if (typeof this[method] === 'function') {
      return this[method](...args)
    } else {
      throw new Error(`Method ${method} not found`)
    }
  }
  
  getUserData() {
    if (!this.authenticated) {
      throw new Error('Not authenticated')
    }
    
    return {
      username: this.user.username,
      role: this.user.role,
      lastLogin: new Date().toISOString()
    }
  }
  
  getMessages() {
    if (!this.authenticated) {
      throw new Error('Not authenticated')
    }
    
    return [
      { id: 1, text: 'Hello!', sender: 'system' },
      { id: 2, text: 'Welcome to the secure chat', sender: 'system' }
    ]
  }
  
  adminAction() {
    if (!this.authenticated || this.user.role !== 'admin') {
      throw new Error('Admin privileges required')
    }
    
    return { success: true, message: 'Admin action performed' }
  }
}

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  const endpoint = webSocketToPostMessage(ws)
  const server = new SecureServer(ws, endpoint)
  
  expose(server, endpoint)
  
  ws.on('close', () => {
    console.log('Client disconnected')
  })
})

console.log('Secure WebSocket server running on ws://localhost:8080')
```

## Error Handling and Reconnection

### Robust WebSocket Client

```typescript
import { webSocketToPostMessage, wrap } from 'comlink2'

class RobustWebSocketClient {
  constructor(url, options = {}) {
    this.url = url
    this.options = {
      maxRetries: 5,
      retryDelay: 1000,
      ...options
    }
    this.socket = null
    this.api = null
    this.retryCount = 0
    this.isConnected = false
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url)
      const endpoint = webSocketToPostMessage(this.socket)
      
      this.socket.onopen = () => {
        console.log('Connected to WebSocket server')
        this.isConnected = true
        this.retryCount = 0
        this.api = wrap(endpoint)
        resolve(this.api)
      }
      
      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        this.isConnected = false
        this.handleDisconnection()
      }
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        if (!this.isConnected) {
          reject(error)
        }
      }
    })
  }
  
  async handleDisconnection() {
    if (this.retryCount < this.options.maxRetries) {
      this.retryCount++
      console.log(`Attempting to reconnect (${this.retryCount}/${this.options.maxRetries})...`)
      
      await new Promise(resolve => 
        setTimeout(resolve, this.options.retryDelay * this.retryCount)
      )
      
      try {
        await this.connect()
      } catch (error) {
        console.error('Reconnection failed:', error)
        this.handleDisconnection()
      }
    } else {
      console.error('Max retry attempts reached')
    }
  }
  
  async safeCall(method, ...args) {
    if (!this.isConnected) {
      throw new Error('Not connected to server')
    }
    
    try {
      return await this.api[method](...args)
    } catch (error) {
      console.error(`Error calling ${method}:`, error)
      throw error
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close()
    }
  }
}

// Usage
const client = new RobustWebSocketClient('ws://localhost:8080', {
  maxRetries: 3,
  retryDelay: 2000
})

try {
  const api = await client.connect()
  
  // Use the API
  const result = await client.safeCall('someMethod', 'arg1', 'arg2')
  console.log('Result:', result)
} catch (error) {
  console.error('Connection failed:', error)
}
```

## Best Practices

1. **Connection Management** - Always handle connection state
2. **Error Handling** - Implement robust error handling and recovery
3. **Authentication** - Secure your WebSocket connections
4. **Reconnection** - Implement automatic reconnection logic
5. **Message Validation** - Validate all incoming messages
6. **Resource Cleanup** - Clean up resources on disconnect

## Next Steps

- See [WebRTC DataChannel examples](/examples/webrtc)
- Learn about [Remote Object RPC](/examples/remote-object)
- Explore [Web API Adapters](/guide/web-api-adapters)