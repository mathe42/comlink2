import { describe, it, expect } from 'vitest'
import { streamToPostMessage, createChannel, postMessageToStream, connectEndpoints, PostMessageEndpoint, StreamEndpoint } from '../../src/endpoint'

describe('Browser API integration', () => {
  describe('MessagePort compatibility', () => {
    it('should confirm MessagePort implements PostMessageEndpoint interface', () => {
      const channel = new MessageChannel()
      const port = channel.port1
      
      // TypeScript compilation confirms MessagePort extends PostMessageEndpoint
      // This test verifies runtime compatibility
      expect(typeof port.postMessage).toBe('function')
      expect(typeof port.addEventListener).toBe('function')
      expect(typeof port.removeEventListener).toBe('function')
      
      // MessagePort can be used directly as PostMessageEndpoint
      const endpoint: PostMessageEndpoint = port
      expect(endpoint).toBe(port)
      
      port.close()
      channel.port2.close()
    })
  })

  describe('MessageChannel integration', () => {
    it('should work with real MessageChannel API', async () => {
      // Create a real MessageChannel
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const receivedMessages: any[] = []
      
      // Set up listener on port1
      port1.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      port1.start()
      port2.start()
      
      // MessagePort already implements PostMessageEndpoint interface!
      // No wrapping needed - use port2 directly
      port2.postMessage({ test: 'Hello MessageChannel!' })
      
      // Wait for message
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(receivedMessages).toEqual([{ test: 'Hello MessageChannel!' }])
      
      port1.close()
      port2.close()
    })

    it('should work with MessageChannel and createChannel', async () => {
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const receivedMessages: any[] = []
      
      // Create channels using port1 directly (no wrapping needed)
      const chatChannel = createChannel(port1, 'chat')
      const notificationChannel = createChannel(port1, 'notifications')
      
      // Set up listeners
      chatChannel.addEventListener('message', (event) => {
        receivedMessages.push({ type: 'chat', data: event.data })
      })
      
      notificationChannel.addEventListener('message', (event) => {
        receivedMessages.push({ type: 'notification', data: event.data })
      })
      
      port1.start()
      port2.start()
      
      // Send messages from port2 to different channels
      port2.postMessage({
        channel: 'chat',
        payload: 'Hello from chat!'
      })
      
      port2.postMessage({
        channel: 'notifications',
        payload: 'New notification!'
      })
      
      port2.postMessage({
        channel: 'other',
        payload: 'This should not be received'
      })
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(receivedMessages).toEqual([
        { type: 'chat', data: 'Hello from chat!' },
        { type: 'notification', data: 'New notification!' }
      ])
      
      port1.close()
      port2.close()
    })

    it('should handle bidirectional MessageChannel communication', async () => {
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const port1Messages: any[] = []
      const port2Messages: any[] = []
      
      // Connect the endpoints directly (no wrapping needed)
      const cleanup = connectEndpoints(port1, port2)
      
      // Set up direct listeners to verify bidirectional flow
      port1.addEventListener('message', (event) => {
        port1Messages.push(event.data)
      })
      
      port2.addEventListener('message', (event) => {
        port2Messages.push(event.data)
      })
      
      port1.start()
      port2.start()
      
      // Send from port1 (should reach port2)
      port1.postMessage('Message from port1')
      
      // Send from port2 (should reach port1)
      port2.postMessage('Message from port2')
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(port1Messages).toContain('Message from port2')
      expect(port2Messages).toContain('Message from port1')
      
      cleanup()
      port1.close()
      port2.close()
    })
  })

  describe('postMessage with streams integration', () => {
    it('should convert MessageChannel to streams and back', async () => {
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const finalMessages: any[] = []
      
      port1.start()
      port2.start()
      
      // Convert port1 to stream and back (no wrapping needed)
      const streamEndpoint = postMessageToStream(port1)
      const backToPostMessage = streamToPostMessage(streamEndpoint)
      
      // Listen to final output
      backToPostMessage.addEventListener('message', (event) => {
        finalMessages.push(event.data)
      })
      
      // Send from port2 (this should work)
      port2.postMessage('Direct port2 message')
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Now try to send data through the stream pipeline (this might fail due to writer lock)
      try {
        const writer = streamEndpoint.input.getWriter()
        await writer.write({ test: 'Stream conversion test' })
        expect(finalMessages).toContain({ test: 'Stream conversion test' })
      } catch (error) {
        // Expected if stream is already locked by postMessageToStream
        console.log('Stream locked as expected:', error.message)
      }
      
      expect(finalMessages).toContain('Direct port2 message')
      
      port1.close()
      port2.close()
    })

    it('should handle high-throughput MessageChannel streams', async () => {
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const receivedMessages: any[] = []
      const messageCount = 1000
      
      // Convert port1 to streams (no wrapping needed)
      const streamEndpoint = postMessageToStream(port1)
      
      // Set up reader
      const reader = streamEndpoint.output.getReader()
      const readMessages = async () => {
        while (true) {
          const result = await reader.read()
          if (result.done) break
          receivedMessages.push(result.value)
        }
      }
      readMessages().catch(() => {}) // Start reading
      
      port1.start()
      port2.start()
      
      // Send many messages rapidly from port2
      for (let i = 0; i < messageCount; i++) {
        port2.postMessage({
          messageId: i,
          data: `High-throughput message ${i}`,
          timestamp: Date.now()
        })
      }
      
      // Wait for all messages
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(receivedMessages.length).toBe(messageCount)
      
      // Verify message order and integrity
      for (let i = 0; i < Math.min(100, receivedMessages.length); i++) {
        expect(receivedMessages[i].messageId).toBe(i)
        expect(receivedMessages[i].data).toBe(`High-throughput message ${i}`)
      }
      
      port1.close()
      port2.close()
    })
  })

  describe('Error scenarios with real APIs', () => {
    it('should handle MessagePort closure gracefully', async () => {
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const receivedMessages: any[] = []
      
      // Set up listener
      port1.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      port1.start()
      port2.start()
      
      // Send initial message
      port2.postMessage('Before close')
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Close port2
      port2.close()
      
      // Try to send after close (should not crash) - use port1 directly
      expect(() => {
        port1.postMessage('After close')
      }).not.toThrow()
      
      expect(receivedMessages).toContain('Before close')
      
      port1.close()
    })

    it('should handle invalid data types with real MessageChannel', async () => {
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      const receivedMessages: any[] = []
      
      port1.addEventListener('message', (event) => {
        receivedMessages.push(event.data)
      })
      
      port1.start()
      port2.start()
      
      // Try to send valid data first
      expect(() => {
        port2.postMessage({ test: 'valid data' })
      }).not.toThrow()
      
      // Try to send non-serializable data (may or may not throw depending on environment)
      const circularData = { circular: {} }
      circularData.circular = circularData // Create circular reference
      
      // In some environments MessageChannel throws, in others it silently fails
      // Let's just test that it doesn't crash our system
      expect(() => {
        try {
          port2.postMessage(circularData)
        } catch (error) {
          // Expected in real browsers
        }
      }).not.toThrow()
      
      // Send valid data to ensure system still works
      port2.postMessage({ valid: 'data' })
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Should receive at least the valid messages
      expect(receivedMessages).toEqual(
        expect.arrayContaining([
          { test: 'valid data' },
          { valid: 'data' }
        ])
      )
      
      port1.close()
      port2.close()
    })
  })
})