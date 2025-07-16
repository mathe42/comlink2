import type { PostMessageEndpoint, StreamEndpoint } from './endpoint'

/**
 * Web API wrappers for various browser communication mechanisms
 * 
 * This module provides adapters to convert different Web APIs into
 * standardized PostMessageEndpoint or StreamEndpoint interfaces,
 * enabling seamless integration with the comlink2 ecosystem.
 * 
 * @example
 * ```typescript
 * // Use with WebSocket
 * const ws = new WebSocket('ws://localhost:8080')
 * const postMessage = webSocketToPostMessage(ws)
 * 
 * // Use with WebRTC DataChannel
 * const dataChannel = peerConnection.createDataChannel('data')
 * const stream = dataChannelToStream(dataChannel)
 * ```
 */

// ============================================================================
// WebRTC DataChannel
// ============================================================================

/**
 * Creates a StreamEndpoint from a WebRTC DataChannel
 */
export function dataChannelToStream(dataChannel: RTCDataChannel): StreamEndpoint {
  const inputTransform = new TransformStream()
  const outputTransform = new TransformStream()
  
  // Get a single writer for the output stream to avoid lock conflicts
  const outputWriter = outputTransform.writable.getWriter()
  
  // Handle incoming data from DataChannel
  dataChannel.addEventListener('message', (event) => {
    outputWriter.write(event.data).catch(() => {
      // Ignore write errors (stream might be closed)
    })
  })
  
  // Handle outgoing data to DataChannel
  const reader = inputTransform.readable.getReader()
  const processInput = async () => {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      if (dataChannel.readyState === 'open') {
        dataChannel.send(value)
      }
    }
  }
  processInput().catch(() => {}) // Start processing
  
  return {
    input: inputTransform.writable,
    output: outputTransform.readable
  }
}

/**
 * Creates a PostMessageEndpoint from a WebRTC DataChannel
 */
export function dataChannelToPostMessage(dataChannel: RTCDataChannel): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  
  // Handle incoming data
  dataChannel.addEventListener('message', (event) => {
    const messageEvent = new MessageEvent('message', { data: event.data })
    listeners.forEach(listener => listener(messageEvent))
  })
  
  return {
    postMessage: (data) => {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(data)
      }
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
}

// ============================================================================
// WebSocket
// ============================================================================

/**
 * Creates a PostMessageEndpoint from a WebSocket
 */
export function webSocketToPostMessage(webSocket: WebSocket): PostMessageEndpoint {
  const listeners = new Set<(event: MessageEvent) => void>()
  
  // Handle incoming data
  webSocket.addEventListener('message', (event) => {
    try {
      const messageEvent = new MessageEvent('message', { data: JSON.parse(event.data) })
      listeners.forEach(listener => listener(messageEvent))
    } catch (error) {
      // Ignore invalid JSON messages
      console.warn('Failed to parse WebSocket message as JSON:', error)
    }
  })
  
  return {
    postMessage: (data) => {
      if (webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(data))
      }
    },
    addEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.add(listener)
      }
    },
    removeEventListener: (type, listener) => {
      if (type === 'message') {
        listeners.delete(listener)
      }
    }
  }
}