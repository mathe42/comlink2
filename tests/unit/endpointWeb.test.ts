import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataChannelToStream, dataChannelToPostMessage, webSocketToPostMessage } from '../../src/endpointWeb'

// Mock RTCDataChannel
class MockRTCDataChannel extends EventTarget {
  readyState: string = 'open'
  
  send(data: any) {
    // Mock implementation
  }
}

// Mock WebSocket
class MockWebSocket extends EventTarget {
  static OPEN = 1
  static CLOSED = 3
  
  readyState: number = MockWebSocket.OPEN
  
  send(data: string) {
    // Mock implementation
  }
}

// Make mocks available globally
global.RTCDataChannel = MockRTCDataChannel as any
global.WebSocket = MockWebSocket as any

describe('endpointWeb functions', () => {
  describe('dataChannelToStream', () => {
    let mockDataChannel: MockRTCDataChannel

    beforeEach(() => {
      mockDataChannel = new MockRTCDataChannel()
    })

    it('should create a StreamEndpoint from RTCDataChannel', () => {
      const streamEndpoint = dataChannelToStream(mockDataChannel as any)
      
      expect(streamEndpoint).toHaveProperty('input')
      expect(streamEndpoint).toHaveProperty('output')
      expect(streamEndpoint.input).toBeInstanceOf(WritableStream)
      expect(streamEndpoint.output).toBeInstanceOf(ReadableStream)
    })

    it('should handle incoming data from DataChannel', async () => {
      const streamEndpoint = dataChannelToStream(mockDataChannel as any)
      const receivedMessages: any[] = []
      
      // Set up reader
      const reader = streamEndpoint.output.getReader()
      const readPromise = reader.read()
      
      // Simulate incoming message
      const messageEvent = new MessageEvent('message', { data: 'test data' })
      mockDataChannel.dispatchEvent(messageEvent)
      
      const result = await readPromise
      expect(result.value).toBe('test data')
      expect(result.done).toBe(false)
      
      reader.releaseLock()
    })

    it('should send data through DataChannel when written to input stream', async () => {
      const sendSpy = vi.spyOn(mockDataChannel, 'send')
      const streamEndpoint = dataChannelToStream(mockDataChannel as any)
      
      // Write to input stream
      const writer = streamEndpoint.input.getWriter()
      await writer.write('outgoing data')
      
      // Give time for async processing
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(sendSpy).toHaveBeenCalledWith('outgoing data')
      
      writer.releaseLock()
    })

    it('should not send when DataChannel is not open', async () => {
      mockDataChannel.readyState = 'closed'
      const sendSpy = vi.spyOn(mockDataChannel, 'send')
      const streamEndpoint = dataChannelToStream(mockDataChannel as any)
      
      const writer = streamEndpoint.input.getWriter()
      await writer.write('should not send')
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(sendSpy).not.toHaveBeenCalled()
      
      writer.releaseLock()
    })

    it('should handle multiple messages', async () => {
      const streamEndpoint = dataChannelToStream(mockDataChannel as any)
      const receivedMessages: any[] = []
      
      const reader = streamEndpoint.output.getReader()
      
      // Set up a reading promise first
      const readMessages = async () => {
        for (let i = 0; i < 3; i++) {
          const result = await reader.read()
          if (!result.done) {
            receivedMessages.push(result.value)
          }
        }
      }
      const readPromise = readMessages()
      
      // Give a small delay to ensure reader is ready
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Send messages
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'msg1' }))
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'msg2' }))
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'msg3' }))
      
      // Wait for all messages to be read
      await readPromise
      
      expect(receivedMessages).toEqual(['msg1', 'msg2', 'msg3'])
      
      reader.releaseLock()
    })
  })

  describe('dataChannelToPostMessage', () => {
    let mockDataChannel: MockRTCDataChannel

    beforeEach(() => {
      mockDataChannel = new MockRTCDataChannel()
    })

    it('should create a PostMessageEndpoint from RTCDataChannel', () => {
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      
      expect(endpoint).toHaveProperty('postMessage')
      expect(endpoint).toHaveProperty('addEventListener')
      expect(endpoint).toHaveProperty('removeEventListener')
      expect(typeof endpoint.postMessage).toBe('function')
      expect(typeof endpoint.addEventListener).toBe('function')
      expect(typeof endpoint.removeEventListener).toBe('function')
    })

    it('should send messages through DataChannel', () => {
      const sendSpy = vi.spyOn(mockDataChannel, 'send')
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      
      endpoint.postMessage('test message')
      
      expect(sendSpy).toHaveBeenCalledWith('test message')
    })

    it('should not send when DataChannel is not open', () => {
      mockDataChannel.readyState = 'closed'
      const sendSpy = vi.spyOn(mockDataChannel, 'send')
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      
      endpoint.postMessage('should not send')
      
      expect(sendSpy).not.toHaveBeenCalled()
    })

    it('should handle incoming messages', () => {
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      const receivedMessages: any[] = []
      
      endpoint.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      // Simulate incoming message
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'incoming data' }))
      
      expect(receivedMessages).toEqual(['incoming data'])
    })

    it('should support multiple listeners', () => {
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      const receivedMessages1: any[] = []
      const receivedMessages2: any[] = []
      
      const listener1 = (event: MessageEvent) => receivedMessages1.push(event.data)
      const listener2 = (event: MessageEvent) => receivedMessages2.push(event.data)
      
      endpoint.addEventListener('message', listener1)
      endpoint.addEventListener('message', listener2)
      
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'broadcast' }))
      
      expect(receivedMessages1).toEqual(['broadcast'])
      expect(receivedMessages2).toEqual(['broadcast'])
    })

    it('should remove listeners correctly', () => {
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      const receivedMessages: any[] = []
      
      const listener = (event: MessageEvent) => receivedMessages.push(event.data)
      
      endpoint.addEventListener('message', listener)
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'first' }))
      
      endpoint.removeEventListener('message', listener)
      mockDataChannel.dispatchEvent(new MessageEvent('message', { data: 'second' }))
      
      expect(receivedMessages).toEqual(['first'])
    })

    it('should ignore non-message event types', () => {
      const endpoint = dataChannelToPostMessage(mockDataChannel as any)
      let listenerCalled = false
      
      endpoint.addEventListener('error' as any, () => {
        listenerCalled = true
      })
      
      endpoint.removeEventListener('error' as any, () => {})
      
      expect(listenerCalled).toBe(false)
    })
  })

  describe('webSocketToPostMessage', () => {
    let mockWebSocket: MockWebSocket

    beforeEach(() => {
      mockWebSocket = new MockWebSocket()
    })

    it('should create a PostMessageEndpoint from WebSocket', () => {
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      
      expect(endpoint).toHaveProperty('postMessage')
      expect(endpoint).toHaveProperty('addEventListener')
      expect(endpoint).toHaveProperty('removeEventListener')
      expect(typeof endpoint.postMessage).toBe('function')
      expect(typeof endpoint.addEventListener).toBe('function')
      expect(typeof endpoint.removeEventListener).toBe('function')
    })

    it('should send JSON-stringified messages through WebSocket', () => {
      const sendSpy = vi.spyOn(mockWebSocket, 'send')
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      
      const testData = { message: 'hello', number: 42 }
      endpoint.postMessage(testData)
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testData))
    })

    it('should not send when WebSocket is not open', () => {
      mockWebSocket.readyState = MockWebSocket.CLOSED
      const sendSpy = vi.spyOn(mockWebSocket, 'send')
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      
      endpoint.postMessage('should not send')
      
      expect(sendSpy).not.toHaveBeenCalled()
    })

    it('should parse incoming JSON messages', () => {
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      const receivedMessages: any[] = []
      
      endpoint.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      const testData = { message: 'hello', array: [1, 2, 3] }
      const jsonString = JSON.stringify(testData)
      
      mockWebSocket.dispatchEvent(new MessageEvent('message', { data: jsonString }))
      
      expect(receivedMessages).toEqual([testData])
    })

    it('should handle JSON parsing errors gracefully', () => {
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      const receivedMessages: any[] = []
      const warnings: any[] = []
      
      endpoint.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      // Mock console.warn to catch parsing warnings
      const originalConsoleWarn = console.warn
      console.warn = (message: any, error: any) => warnings.push({ message, error })
      
      try {
        // Send invalid JSON - this should not crash but should log a warning
        mockWebSocket.dispatchEvent(new MessageEvent('message', { data: 'invalid json {' }))
        
        // No messages should be received due to parsing error
        expect(receivedMessages).toEqual([])
        expect(warnings.length).toBe(1)
        expect(warnings[0].message).toContain('Failed to parse WebSocket message as JSON')
      } finally {
        console.warn = originalConsoleWarn
      }
    })

    it('should support multiple listeners', () => {
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      const receivedMessages1: any[] = []
      const receivedMessages2: any[] = []
      
      const listener1 = (event: MessageEvent) => receivedMessages1.push(event.data)
      const listener2 = (event: MessageEvent) => receivedMessages2.push(event.data)
      
      endpoint.addEventListener('message', listener1)
      endpoint.addEventListener('message', listener2)
      
      mockWebSocket.dispatchEvent(new MessageEvent('message', { data: '{"broadcast": true}' }))
      
      expect(receivedMessages1).toEqual([{ broadcast: true }])
      expect(receivedMessages2).toEqual([{ broadcast: true }])
    })

    it('should remove listeners correctly', () => {
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      const receivedMessages: any[] = []
      
      const listener = (event: MessageEvent) => receivedMessages.push(event.data)
      
      endpoint.addEventListener('message', listener)
      mockWebSocket.dispatchEvent(new MessageEvent('message', { data: '"first"' }))
      
      endpoint.removeEventListener('message', listener)
      mockWebSocket.dispatchEvent(new MessageEvent('message', { data: '"second"' }))
      
      expect(receivedMessages).toEqual(['first'])
    })

    it('should handle complex data types', () => {
      const endpoint = webSocketToPostMessage(mockWebSocket as any)
      const receivedMessages: any[] = []
      
      endpoint.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      const complexData = {
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 'two', { three: 3 }],
        object: { nested: { deep: 'value' } }
      }
      
      mockWebSocket.dispatchEvent(new MessageEvent('message', { 
        data: JSON.stringify(complexData) 
      }))
      
      expect(receivedMessages).toEqual([complexData])
    })
  })
})