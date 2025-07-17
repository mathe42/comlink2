import { describe, it, expect } from 'vitest'
import { streamToPostMessage, createChannel, postMessageToStream, connectEndpoints, PostMessageEndpoint, PostMessageEndpointString, StreamEndpoint, wrap, expose } from '../../src/index'

describe('streamToPostMessage', () => {
  it('should convert StreamEndpoint to PostMessageEndpoint', () => {
    const mockStream = {
      input: new WritableStream(),
      output: new ReadableStream()
    }
    
    const result = streamToPostMessage(mockStream)
    
    expect(result).toHaveProperty('postMessage')
    expect(result).toHaveProperty('addEventListener')
    expect(result).toHaveProperty('removeEventListener')
    expect(typeof result.postMessage).toBe('function')
    expect(typeof result.addEventListener).toBe('function')
    expect(typeof result.removeEventListener).toBe('function')
  })

  it('should handle message events', async () => {
    const messages: any[] = []
    
    const mockStream: StreamEndpoint = {
      input: new WritableStream(),
      output: new ReadableStream({
        start(controller) {
          controller.enqueue('test message')
          controller.close()
        }
      })
    }
    
    const endpoint = streamToPostMessage(mockStream)
    
    endpoint.addEventListener('message', (event) => {
      messages.push(event.data)
    })
    
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(messages).toContain('test message')
  })

  it('should add and remove event listeners', () => {
    const mockStream: StreamEndpoint = {
      input: new WritableStream(),
      output: new ReadableStream()
    }
    
    const endpoint = streamToPostMessage(mockStream)
    const listener = () => {}
    
    // Should not throw
    endpoint.addEventListener('message', listener)
    endpoint.removeEventListener('message', listener)
  })

  it('should write to input stream when postMessage is called', async () => {
    const written: any[] = []
    
    const mockStream: StreamEndpoint = {
      input: new WritableStream({
        write(chunk) {
          written.push(chunk)
        }
      }),
      output: new ReadableStream()
    }
    
    const endpoint = streamToPostMessage(mockStream)
    
    endpoint.postMessage('test data')
    
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10))
    
    expect(written).toContain('test data')
  })
})

describe('createChannel', () => {
  it('should be exported from index', () => {
    expect(typeof createChannel).toBe('function')
  })
})

describe('postMessageToStream', () => {
  it('should be exported from index', () => {
    expect(typeof postMessageToStream).toBe('function')
  })
})

describe('connectEndpoints', () => {
  it('should be exported from index', () => {
    expect(typeof connectEndpoints).toBe('function')
  })
})

describe('Remote Object exports', () => {
  it('should export wrap function', () => {
    expect(typeof wrap).toBe('function')
  })

  it('should export expose function', () => {
    expect(typeof expose).toBe('function')
  })
})

describe('Type exports', () => {
  it('should export PostMessageEndpoint type', () => {
    // This test ensures the type is exported correctly
    const endpoint: PostMessageEndpoint = {
      postMessage: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    }
    expect(endpoint).toBeDefined()
  })

  it('should export PostMessageEndpointString type', () => {
    // This test ensures the type is exported correctly
    const endpoint: PostMessageEndpointString = {
      postMessage: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    }
    expect(endpoint).toBeDefined()
  })

  it('should export StreamEndpoint type', () => {
    // This test ensures the type is exported correctly
    const endpoint: StreamEndpoint = {
      input: new WritableStream(),
      output: new ReadableStream()
    }
    expect(endpoint).toBeDefined()
  })
})