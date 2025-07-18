# WebRTC DataChannel Examples

Examples of using WebRTC DataChannel with objex for peer-to-peer communication.

## Basic P2P Communication

### Simple DataChannel Setup

**peer1.js**
```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class Peer1 {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channel = null
    this.api = null
  }
  
  async initialize() {
    // Create data channel
    this.channel = this.pc.createDataChannel('rpc', {
      ordered: true
    })
    
    const endpoint = dataChannelToPostMessage(this.channel)
    
    // Expose local API
    const localApi = {
      greet(name) {
        return `Hello ${name} from Peer 1!`
      },
      
      calculate(a, b) {
        return a + b
      }
    }
    
    expose(localApi, endpoint)
    
    // Wrap remote API
    this.api = wrap(endpoint)
    
    // Handle channel events
    this.channel.onopen = () => {
      console.log('Data channel opened')
      this.onChannelOpen()
    }
    
    this.channel.onclose = () => {
      console.log('Data channel closed')
    }
  }
  
  async createOffer() {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }
  
  async setRemoteAnswer(answer) {
    await this.pc.setRemoteDescription(answer)
  }
  
  async onChannelOpen() {
    try {
      // Use remote API
      const greeting = await this.api.greet('Peer 1')
      console.log('Remote greeting:', greeting)
      
      const result = await this.api.calculate(10, 20)
      console.log('Remote calculation:', result)
    } catch (error) {
      console.error('Error calling remote API:', error)
    }
  }
}

const peer1 = new Peer1()
await peer1.initialize()

// Create offer and send to peer 2
const offer = await peer1.createOffer()
console.log('Offer created:', offer)

// In real application, send offer through signaling server
// and receive answer from peer 2
```

**peer2.js**
```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class Peer2 {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channel = null
    this.api = null
  }
  
  async initialize() {
    // Handle incoming data channel
    this.pc.ondatachannel = (event) => {
      this.channel = event.channel
      const endpoint = dataChannelToPostMessage(this.channel)
      
      // Expose local API
      const localApi = {
        greet(name) {
          return `Hello ${name} from Peer 2!`
        },
        
        calculate(a, b) {
          return a * b
        }
      }
      
      expose(localApi, endpoint)
      
      // Wrap remote API
      this.api = wrap(endpoint)
      
      this.channel.onopen = () => {
        console.log('Data channel opened')
        this.onChannelOpen()
      }
    }
  }
  
  async createAnswer(offer) {
    await this.pc.setRemoteDescription(offer)
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }
  
  async onChannelOpen() {
    try {
      // Use remote API
      const greeting = await this.api.greet('Peer 2')
      console.log('Remote greeting:', greeting)
      
      const result = await this.api.calculate(5, 6)
      console.log('Remote calculation:', result)
    } catch (error) {
      console.error('Error calling remote API:', error)
    }
  }
}

const peer2 = new Peer2()
await peer2.initialize()

// Receive offer from peer 1 and create answer
// In real application, receive offer through signaling server
const answer = await peer2.createAnswer(offer)
console.log('Answer created:', answer)
```

## P2P Gaming

### Real-time Game State Synchronization

**game-peer.js**
```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class GamePeer {
  constructor(isHost = false) {
    this.isHost = isHost
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channel = null
    this.remoteApi = null
    this.gameState = {
      players: {},
      gameObjects: [],
      score: { player1: 0, player2: 0 }
    }
  }
  
  async initialize(playerId) {
    this.playerId = playerId
    
    if (this.isHost) {
      this.channel = this.pc.createDataChannel('game', {
        ordered: true,
        maxRetransmits: 3
      })
      this.setupChannel()
    } else {
      this.pc.ondatachannel = (event) => {
        this.channel = event.channel
        this.setupChannel()
      }
    }
  }
  
  setupChannel() {
    const endpoint = dataChannelToPostMessage(this.channel)
    
    // Expose game API
    const gameApi = {
      updatePlayerPosition: (playerId, x, y) => {
        this.gameState.players[playerId] = { x, y }
        return this.gameState.players[playerId]
      },
      
      spawnGameObject: (type, x, y) => {
        const obj = {
          id: Date.now(),
          type,
          x,
          y,
          timestamp: Date.now()
        }
        this.gameState.gameObjects.push(obj)
        return obj
      },
      
      updateScore: (playerId, points) => {
        this.gameState.score[playerId] = points
        return this.gameState.score
      },
      
      getGameState: () => {
        return this.gameState
      },
      
      syncGameState: (state) => {
        this.gameState = { ...this.gameState, ...state }
        return this.gameState
      }
    }
    
    expose(gameApi, endpoint)
    this.remoteApi = wrap(endpoint)
    
    this.channel.onopen = () => {
      console.log('Game channel opened')
      this.startGameLoop()
    }
  }
  
  async startGameLoop() {
    // Sync initial game state
    if (this.isHost) {
      await this.remoteApi.syncGameState(this.gameState)
    }
    
    // Game loop
    setInterval(async () => {
      try {
        // Update local player position (simulate)
        const x = Math.random() * 800
        const y = Math.random() * 600
        
        await this.remoteApi.updatePlayerPosition(this.playerId, x, y)
        
        // Occasionally spawn objects (host only)
        if (this.isHost && Math.random() < 0.1) {
          await this.remoteApi.spawnGameObject('powerup', x, y)
        }
        
        // Get updated game state
        const state = await this.remoteApi.getGameState()
        this.renderGame(state)
        
      } catch (error) {
        console.error('Game loop error:', error)
      }
    }, 1000 / 60) // 60 FPS
  }
  
  renderGame(state) {
    // Render game state (simplified)
    console.log('Players:', Object.keys(state.players).length)
    console.log('Objects:', state.gameObjects.length)
    console.log('Score:', state.score)
  }
  
  async createOffer() {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return offer
  }
  
  async createAnswer(offer) {
    await this.pc.setRemoteDescription(offer)
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return answer
  }
  
  async setRemoteAnswer(answer) {
    await this.pc.setRemoteDescription(answer)
  }
}

// Usage
const hostPeer = new GamePeer(true)
await hostPeer.initialize('player1')

const guestPeer = new GamePeer(false)
await guestPeer.initialize('player2')

// Complete WebRTC signaling...
```

## File Sharing

### P2P File Transfer

**file-sender.js**
```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class FileSender {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channel = null
    this.remoteApi = null
  }
  
  async initialize() {
    this.channel = this.pc.createDataChannel('file-transfer', {
      ordered: true
    })
    
    const endpoint = dataChannelToPostMessage(this.channel)
    
    // Expose file sender API
    const senderApi = {
      sendFileInfo: (fileInfo) => {
        console.log('Sending file info:', fileInfo)
        return { status: 'ready', fileInfo }
      },
      
      sendFileChunk: (chunkData) => {
        console.log(`Sending chunk ${chunkData.index}/${chunkData.total}`)
        return { status: 'received', index: chunkData.index }
      },
      
      sendFileComplete: (fileHash) => {
        console.log('File transfer complete:', fileHash)
        return { status: 'complete', hash: fileHash }
      }
    }
    
    expose(senderApi, endpoint)
    this.remoteApi = wrap(endpoint)
    
    this.channel.onopen = () => {
      console.log('File transfer channel opened')
    }
  }
  
  async sendFile(file) {
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
    
    // Send file info
    await this.remoteApi.receiveFileInfo(fileInfo)
    
    // Send file in chunks
    const chunkSize = 64 * 1024 // 64KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize)
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)
      
      const arrayBuffer = await chunk.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      const chunkData = {
        index: i,
        total: totalChunks,
        data: Array.from(uint8Array) // Convert to regular array for JSON
      }
      
      await this.remoteApi.receiveFileChunk(chunkData)
      
      // Update progress
      const progress = ((i + 1) / totalChunks) * 100
      console.log(`Progress: ${progress.toFixed(1)}%`)
    }
    
    // Send completion signal
    const fileHash = await this.calculateFileHash(file)
    await this.remoteApi.receiveFileComplete(fileHash)
  }
  
  async calculateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

// Usage
const fileSender = new FileSender()
await fileSender.initialize()

// Send a file
const fileInput = document.getElementById('fileInput')
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0]
  if (file) {
    await fileSender.sendFile(file)
  }
})
```

**file-receiver.js**
```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class FileReceiver {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channel = null
    this.remoteApi = null
    this.fileChunks = []
    this.fileInfo = null
  }
  
  async initialize() {
    this.pc.ondatachannel = (event) => {
      this.channel = event.channel
      const endpoint = dataChannelToPostMessage(this.channel)
      
      // Expose file receiver API
      const receiverApi = {
        receiveFileInfo: (fileInfo) => {
          this.fileInfo = fileInfo
          this.fileChunks = []
          console.log('Receiving file:', fileInfo.name)
          return { status: 'ready' }
        },
        
        receiveFileChunk: (chunkData) => {
          this.fileChunks[chunkData.index] = chunkData.data
          console.log(`Received chunk ${chunkData.index + 1}/${chunkData.total}`)
          
          const progress = ((chunkData.index + 1) / chunkData.total) * 100
          this.updateProgress(progress)
          
          return { status: 'received', index: chunkData.index }
        },
        
        receiveFileComplete: async (fileHash) => {
          console.log('File transfer complete')
          await this.assembleFile(fileHash)
          return { status: 'complete' }
        }
      }
      
      expose(receiverApi, endpoint)
      this.remoteApi = wrap(endpoint)
      
      this.channel.onopen = () => {
        console.log('File receiver channel opened')
      }
    }
  }
  
  async assembleFile(expectedHash) {
    // Combine all chunks
    const totalSize = this.fileChunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const fileData = new Uint8Array(totalSize)
    
    let offset = 0
    for (const chunk of this.fileChunks) {
      fileData.set(chunk, offset)
      offset += chunk.length
    }
    
    // Verify hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const actualHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    if (actualHash !== expectedHash) {
      throw new Error('File hash mismatch - transfer may be corrupted')
    }
    
    // Create and download file
    const blob = new Blob([fileData], { type: this.fileInfo.type })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = this.fileInfo.name
    a.click()
    
    URL.revokeObjectURL(url)
    console.log('File downloaded:', this.fileInfo.name)
  }
  
  updateProgress(progress) {
    const progressBar = document.getElementById('progressBar')
    if (progressBar) {
      progressBar.style.width = `${progress}%`
      progressBar.textContent = `${progress.toFixed(1)}%`
    }
  }
}

// Usage
const fileReceiver = new FileReceiver()
await fileReceiver.initialize()
```

## Stream-based Communication

### DataChannel Streams

```typescript
import { dataChannelToStream, connectStreams } from 'objex'

class StreamingPeer {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channel = null
    this.stream = null
  }
  
  async initialize() {
    this.channel = this.pc.createDataChannel('streaming', {
      ordered: true
    })
    
    this.stream = dataChannelToStream(this.channel)
    
    this.channel.onopen = () => {
      console.log('Streaming channel opened')
      this.startStreaming()
    }
  }
  
  async startStreaming() {
    // Create a readable stream of data
    const dataStream = new ReadableStream({
      start(controller) {
        let count = 0
        const interval = setInterval(() => {
          if (count < 100) {
            controller.enqueue({
              timestamp: Date.now(),
              data: `Message ${count++}`,
              sequence: count
            })
          } else {
            controller.close()
            clearInterval(interval)
          }
        }, 1000)
      }
    })
    
    // Pipe data to the DataChannel
    await dataStream.pipeTo(this.stream.writable)
    
    // Read from the DataChannel
    const reader = this.stream.readable.getReader()
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        console.log('Received:', value)
      }
    } finally {
      reader.releaseLock()
    }
  }
}
```

## Advanced Features

### Multi-channel Communication

```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class MultiChannelPeer {
  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    this.channels = {}
    this.apis = {}
  }
  
  async createChannel(name, config = {}) {
    const channel = this.pc.createDataChannel(name, {
      ordered: true,
      ...config
    })
    
    this.channels[name] = channel
    const endpoint = dataChannelToPostMessage(channel)
    
    // Create separate API for each channel
    const channelApi = {
      sendMessage: (message) => {
        console.log(`[${name}] Sending:`, message)
        return { channel: name, message, timestamp: Date.now() }
      },
      
      heartbeat: () => {
        return { channel: name, status: 'alive', timestamp: Date.now() }
      }
    }
    
    expose(channelApi, endpoint)
    this.apis[name] = wrap(endpoint)
    
    channel.onopen = () => {
      console.log(`Channel ${name} opened`)
    }
  }
  
  async initialize() {
    // Create multiple channels for different purposes
    await this.createChannel('control', { ordered: true })
    await this.createChannel('data', { ordered: false, maxRetransmits: 3 })
    await this.createChannel('priority', { ordered: true, maxPacketLifeTime: 3000 })
    
    // Handle incoming channels
    this.pc.ondatachannel = (event) => {
      const channel = event.channel
      console.log(`Received channel: ${channel.label}`)
      
      // Set up received channel
      this.channels[channel.label] = channel
      const endpoint = dataChannelToPostMessage(channel)
      this.apis[channel.label] = wrap(endpoint)
    }
  }
  
  async sendControlMessage(message) {
    if (this.apis.control) {
      return await this.apis.control.sendMessage(message)
    }
  }
  
  async sendDataMessage(data) {
    if (this.apis.data) {
      return await this.apis.data.sendMessage(data)
    }
  }
  
  async sendPriorityMessage(message) {
    if (this.apis.priority) {
      return await this.apis.priority.sendMessage(message)
    }
  }
}
```

## Error Handling and Reconnection

```typescript
import { dataChannelToPostMessage, wrap, expose } from 'objex'

class RobustP2PPeer {
  constructor() {
    this.pc = null
    this.channel = null
    this.api = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }
  
  async initialize() {
    try {
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      
      this.channel = this.pc.createDataChannel('robust', {
        ordered: true
      })
      
      this.setupChannel()
      this.setupConnectionHandlers()
      
    } catch (error) {
      console.error('Initialization failed:', error)
      await this.handleReconnection()
    }
  }
  
  setupChannel() {
    const endpoint = dataChannelToPostMessage(this.channel)
    
    const localApi = {
      ping: () => ({ pong: Date.now() }),
      echo: (message) => ({ echo: message }),
      status: () => ({ status: 'connected', timestamp: Date.now() })
    }
    
    expose(localApi, endpoint)
    this.api = wrap(endpoint)
    
    this.channel.onopen = () => {
      console.log('Channel opened')
      this.reconnectAttempts = 0
      this.startHealthCheck()
    }
    
    this.channel.onclose = () => {
      console.log('Channel closed')
      this.handleReconnection()
    }
    
    this.channel.onerror = (error) => {
      console.error('Channel error:', error)
      this.handleReconnection()
    }
  }
  
  setupConnectionHandlers() {
    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.pc.iceConnectionState)
      
      if (this.pc.iceConnectionState === 'failed' || 
          this.pc.iceConnectionState === 'disconnected') {
        this.handleReconnection()
      }
    }
    
    this.pc.onconnectionstatechange = () => {
      console.log('Connection state:', this.pc.connectionState)
      
      if (this.pc.connectionState === 'failed') {
        this.handleReconnection()
      }
    }
  }
  
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }
    
    this.reconnectAttempts++
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
    
    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000 * this.reconnectAttempts))
    
    try {
      await this.initialize()
    } catch (error) {
      console.error('Reconnection failed:', error)
      await this.handleReconnection()
    }
  }
  
  startHealthCheck() {
    setInterval(async () => {
      try {
        const response = await this.api.ping()
        console.log('Health check passed:', response)
      } catch (error) {
        console.error('Health check failed:', error)
        this.handleReconnection()
      }
    }, 5000)
  }
}
```

## Best Practices

1. **Connection Management** - Handle connection state changes
2. **Error Recovery** - Implement robust error handling and reconnection
3. **Channel Configuration** - Use appropriate channel settings for your use case
4. **Message Size** - Keep messages under 64KB for reliability
5. **Ordered vs Unordered** - Choose based on your application needs
6. **Multiple Channels** - Use separate channels for different data types
7. **Health Monitoring** - Implement heartbeat/ping mechanisms

## Next Steps

- See [Remote Object RPC examples](/examples/remote-object)
- Learn about [WebRTC best practices](https://webrtc.org/getting-started/peer-connections)
- Explore [Web API Adapters](/guide/web-api-adapters)