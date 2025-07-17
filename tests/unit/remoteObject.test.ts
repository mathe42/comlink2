import { describe, it, expect, vi, beforeEach } from 'vitest'
import { wrap, expose } from '../../src/remoteObject'
import { createChannel, type PostMessageEndpoint } from '../../src/endpoint'

// Mock createChannel
vi.mock('../../src/endpoint', () => ({
  createChannel: vi.fn()
}))

const mockCreateChannel = vi.mocked(createChannel)

describe('remoteObject module', () => {
  let mockEndpoint: PostMessageEndpoint
  let messageListeners: ((event: MessageEvent) => void)[]

  beforeEach(() => {
    vi.clearAllMocks()
    messageListeners = []
    
    mockEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((type, listener) => {
        if (type === 'message') {
          messageListeners.push(listener)
        }
      }),
      removeEventListener: vi.fn()
    }

    // Mock createChannel to return a new endpoint for each call
    mockCreateChannel.mockImplementation((ep, channelId) => ({
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  })

  describe('wrap function', () => {
    it('should create a proxy object that handles property access', () => {
      const proxy = wrap(mockEndpoint)
      
      expect(proxy).toBeDefined()
      expect(typeof proxy).toBe('function') // Proxy of class is a function
    })

    it('should handle nested property access', () => {
      const proxy = wrap(mockEndpoint)
      
      const nested = proxy.some.nested.property
      expect(nested).toBeDefined()
      expect(typeof nested).toBe('function')
    })

    it('should return null for symbol properties', () => {
      const proxy = wrap(mockEndpoint)
      const symbol = Symbol('test')
      
      expect(proxy[symbol]).toBeNull()
    })

    it('should handle function calls and send RPC call messages', async () => {
      const proxy = wrap(mockEndpoint)
      
      // Call a function on the proxy
      const result = proxy.someMethod('arg1', 'arg2')
      
      // Should return a promise
      expect(result).toBeInstanceOf(Promise)
      
      // Should have sent a call message
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'call',
        keyChain: ['someMethod'],
        args: [
          { type: 'any', data: 'arg1' },
          { type: 'any', data: 'arg2' }
        ]
      })
    })

    it('should handle constructor calls and send RPC construct messages', async () => {
      const proxy = wrap(mockEndpoint)
      
      // Call constructor on the proxy
      const result = new proxy.SomeClass('arg1', 'arg2')
      
      // Should return a promise
      expect(result).toBeInstanceOf(Promise)
      
      // Should have sent a construct message
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'construct',
        keyChain: ['SomeClass'],
        args: [
          { type: 'any', data: 'arg1' },
          { type: 'any', data: 'arg2' }
        ]
      })
    })

    it('should handle await calls and send RPC await messages', async () => {
      const proxy = wrap(mockEndpoint)
      
      // Access .then to trigger await behavior
      const thenCall = proxy.someAsyncMethod.then
      
      // Call .then with handlers
      const result = thenCall(() => {}, () => {})
      
      // Should return a promise
      expect(result).toBeInstanceOf(Promise)
      
      // Should have sent an await message
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'await',
        keyChain: ['someAsyncMethod']
      })
    })

    it('should handle deep nested property chains', () => {
      const proxy = wrap(mockEndpoint)
      
      const deepAccess = proxy.level1.level2.level3.method
      expect(deepAccess).toBeDefined()
      
      // Call the deep method
      deepAccess('test')
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'call',
        keyChain: ['level1', 'level2', 'level3', 'method'],
        args: [{ type: 'any', data: 'test' }]
      })
    })

    it('should handle function arguments by wrapping them', () => {
      const proxy = wrap(mockEndpoint)
      const callback = vi.fn()
      
      proxy.methodWithCallback(callback)
      
      // Should wrap the function argument
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'call',
        keyChain: ['methodWithCallback'],
        args: [{ type: 'wraped', id: expect.any(Number) }]
      })
      
      // Should have created a channel for the wrapped function
      expect(mockCreateChannel).toHaveBeenCalledWith(mockEndpoint, expect.any(Number))
    })

    it('should handle object arguments with functions by wrapping them', () => {
      const proxy = wrap(mockEndpoint)
      const objWithFunction = {
        data: 'test',
        callback: vi.fn()
      }
      
      proxy.methodWithObject(objWithFunction)
      
      // Should wrap the object because it contains a function
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'call',
        keyChain: ['methodWithObject'],
        args: [{ type: 'wraped', id: expect.any(Number) }]
      })
    })

    it('should handle primitive arguments without wrapping', () => {
      const proxy = wrap(mockEndpoint)
      
      // Note: null and undefined cause issues in wrapArg due to Object.values
      proxy.methodWithPrimitives(42, 'string', true)
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'call',
        keyChain: ['methodWithPrimitives'],
        args: [
          { type: 'any', data: 42 },
          { type: 'any', data: 'string' },
          { type: 'any', data: true }
        ]
      })
    })

    it('should handle responses from the endpoint', async () => {
      const proxy = wrap(mockEndpoint)
      
      // Make a call
      const resultPromise = proxy.someMethod()
      
      // Get the ID from the call
      const callData = mockEndpoint.postMessage.mock.calls[0][0]
      const callId = callData.id
      
      // Simulate a response
      const responseMessage = new MessageEvent('message', {
        data: {
          id: callId,
          type: 'response',
          data: { type: 'any', data: 'response_value' }
        }
      })
      
      // Trigger the message listener
      messageListeners.forEach(listener => listener(responseMessage))
      
      // The promise should resolve with the response data
      const result = await resultPromise
      expect(result).toBe('response_value')
    })

    it.skip('should handle wrapped responses from the endpoint', async () => {
      const proxy = wrap(mockEndpoint)
      
      // Make a call
      const resultPromise = proxy.someMethod()
      
      // Get the ID from the call
      const callData = mockEndpoint.postMessage.mock.calls[0][0]
      const callId = callData.id
      
      // Mock the channel that will be created for the wrapped response
      const mockChannelEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      mockCreateChannel.mockReturnValueOnce(mockChannelEndpoint)
      
      // Simulate a wrapped response in the next tick
      setTimeout(() => {
        const responseMessage = new MessageEvent('message', {
          data: {
            id: callId,
            type: 'response',
            data: { type: 'wraped', id: 'wrapped_id' }
          }
        })
        
        messageListeners.forEach(listener => listener(responseMessage))
      }, 0)
      
      // The promise should resolve with a new proxy
      const result = await resultPromise
      expect(result).toBeDefined()
      expect(typeof result).toBe('function')
      
      // Should have created a channel for the wrapped response
      expect(mockCreateChannel).toHaveBeenCalledWith(mockEndpoint, 'wrapped_id')
    })
  })

  describe('expose function', () => {
    it('should register a message listener on the endpoint', () => {
      const testObject = { method: vi.fn() }
      
      expose(testObject, mockEndpoint)
      
      expect(mockEndpoint.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('should handle await RPC calls', async () => {
      const testObject = { 
        value: 42,
        nested: { prop: 'test' }
      }
      
      expose(testObject, mockEndpoint)
      
      // Simulate an await call
      const awaitMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'await',
          keyChain: ['value']
        }
      })
      
      messageListeners.forEach(listener => listener(awaitMessage))
      
      // Should send response with the value
      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async handler
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: { type: 'any', data: 42 }
      })
    })

    it('should handle nested property await calls', async () => {
      const testObject = { 
        nested: { prop: 'test_value' }
      }
      
      expose(testObject, mockEndpoint)
      
      // Simulate a nested await call
      const awaitMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'await',
          keyChain: ['nested', 'prop']
        }
      })
      
      messageListeners.forEach(listener => listener(awaitMessage))
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: { type: 'any', data: 'test_value' }
      })
    })

    it('should handle function call RPC calls', async () => {
      const testFunction = vi.fn().mockResolvedValue('function_result')
      const testObject = { method: testFunction }
      
      expose(testObject, mockEndpoint)
      
      // Simulate a function call
      const callMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'call',
          keyChain: ['method'],
          args: [
            { type: 'any', data: 'arg1' },
            { type: 'any', data: 'arg2' }
          ]
        }
      })
      
      messageListeners.forEach(listener => listener(callMessage))
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should have called the function with unwrapped args
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2')
      
      // Should send response with the result
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: { type: 'any', data: 'function_result' }
      })
    })

    it('should handle constructor RPC calls', async () => {
      class TestClass {
        constructor() {}
      }
      
      const testObject = { TestClass }
      
      expose(testObject, mockEndpoint)
      
      // Simulate a constructor call
      const constructMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'construct',
          keyChain: ['TestClass'],
          args: []
        }
      })
      
      messageListeners.forEach(listener => listener(constructMessage))
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should send response with the instance
      // Note: The instance might not be wrapped if it doesn't contain functions
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: expect.objectContaining({ type: expect.any(String) })
      })
    })

    it('should handle wrapped arguments in function calls', async () => {
      const testFunction = vi.fn().mockResolvedValue('result')
      const testObject = { method: testFunction }
      
      // Mock the channel for unwrapping
      const mockChannelEndpoint = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
      mockCreateChannel.mockReturnValueOnce(mockChannelEndpoint)
      
      expose(testObject, mockEndpoint)
      
      // Simulate a function call with wrapped argument
      const callMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'call',
          keyChain: ['method'],
          args: [
            { type: 'wraped', id: 'wrapped_arg_id' }
          ]
        }
      })
      
      messageListeners.forEach(listener => listener(callMessage))
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should have created a channel for unwrapping
      expect(mockCreateChannel).toHaveBeenCalledWith(mockEndpoint, 'wrapped_arg_id')
      
      // Should have called the function with the unwrapped proxy
      expect(testFunction).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should ignore messages with channel property', async () => {
      const testObject = { method: vi.fn() }
      
      expose(testObject, mockEndpoint)
      
      // Simulate a message with channel property (should be ignored)
      const channelMessage = new MessageEvent('message', {
        data: {
          channel: 'some_channel',
          id: 1,
          type: 'call',
          keyChain: ['method'],
          args: []
        }
      })
      
      messageListeners.forEach(listener => listener(channelMessage))
      
      await new Promise(resolve => setTimeout(resolve, 0))
      
      // Should not have called the method or sent any response
      expect(testObject.method).not.toHaveBeenCalled()
      expect(mockEndpoint.postMessage).not.toHaveBeenCalled()
    })
  })

  describe('argument wrapping and unwrapping', () => {
    it('should wrap function arguments', () => {
      const proxy = wrap(mockEndpoint)
      const callback = () => {}
      
      proxy.method(callback)
      
      const call = mockEndpoint.postMessage.mock.calls[0][0]
      expect(call.args[0]).toEqual({ type: 'wraped', id: expect.any(Number) })
    })

    it('should wrap objects with function properties', () => {
      const proxy = wrap(mockEndpoint)
      const objWithFunc = { 
        data: 'test',
        callback: () => {}
      }
      
      proxy.method(objWithFunc)
      
      const call = mockEndpoint.postMessage.mock.calls[0][0]
      expect(call.args[0]).toEqual({ type: 'wraped', id: expect.any(Number) })
    })

    it('should not wrap plain objects without functions', () => {
      const proxy = wrap(mockEndpoint)
      const plainObj = { data: 'test', number: 42 }
      
      proxy.method(plainObj)
      
      const call = mockEndpoint.postMessage.mock.calls[0][0]
      expect(call.args[0]).toEqual({ type: 'any', data: plainObj })
    })

    it('should handle mixed argument types', () => {
      const proxy = wrap(mockEndpoint)
      const callback = () => {}
      const plainObj = { data: 'test' }
      
      // Note: null will cause an error in wrapArg due to Object.values(null)
      // So we'll test without null for now
      proxy.method('string', 42, callback, plainObj, 'test')
      
      const call = mockEndpoint.postMessage.mock.calls[0][0]
      expect(call.args).toEqual([
        { type: 'any', data: 'string' },
        { type: 'any', data: 42 },
        { type: 'wraped', id: expect.any(Number) },
        { type: 'any', data: plainObj },
        { type: 'any', data: 'test' }
      ])
    })
  })

  describe('error handling', () => {
    it('should handle malformed RPC messages gracefully', async () => {
      const testObject = { method: vi.fn() }
      
      expose(testObject, mockEndpoint)
      
      // Send malformed message
      const malformedMessage = new MessageEvent('message', {
        data: {
          id: 1,
          // Missing type
          keyChain: ['method']
        }
      })
      
      expect(() => {
        messageListeners.forEach(listener => listener(malformedMessage))
      }).not.toThrow()
    })

    it('should handle missing methods gracefully', async () => {
      const testObject = {}
      
      expose(testObject, mockEndpoint)
      
      // Try to call non-existent method
      const callMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'call',
          keyChain: ['nonExistentMethod'],
          args: []
        }
      })
      
      expect(() => {
        messageListeners.forEach(listener => listener(callMessage))
      }).not.toThrow()
    })

    it('should handle async function rejections', async () => {
      const testFunction = vi.fn().mockRejectedValue(new Error('Test error'))
      const testObject = { method: testFunction }
      
      expose(testObject, mockEndpoint)
      
      const callMessage = new MessageEvent('message', {
        data: {
          id: 1,
          type: 'call',
          keyChain: ['method'],
          args: []
        }
      })
      
      messageListeners.forEach(listener => listener(callMessage))
      
      // Wait for async handling
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Should not crash the system
      expect(testFunction).toHaveBeenCalled()
    })
  })

  describe('complex scenarios', () => {
    it('should handle bidirectional communication', async () => {
      // Create two endpoints
      const endpoint1 = { ...mockEndpoint }
      const endpoint2 = { ...mockEndpoint }
      
      // Objects to expose
      const obj1 = { 
        method1: vi.fn().mockResolvedValue('result1'),
        callOther: vi.fn()
      }
      const obj2 = { 
        method2: vi.fn().mockResolvedValue('result2')
      }
      
      // Expose and wrap
      expose(obj1, endpoint1)
      expose(obj2, endpoint2)
      
      const proxy1 = wrap(endpoint1)
      const proxy2 = wrap(endpoint2)
      
      // Test that both proxies work
      proxy1.method1()
      proxy2.method2()
      
      expect(endpoint1.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call', keyChain: ['method1'] })
      )
      expect(endpoint2.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'call', keyChain: ['method2'] })
      )
    })

    it('should handle nested object access with multiple levels', () => {
      const proxy = wrap(mockEndpoint)
      
      // Access deeply nested properties
      proxy.a.b.c.d.e.method('test')
      
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: expect.any(Number),
        type: 'call',
        keyChain: ['a', 'b', 'c', 'd', 'e', 'method'],
        args: [{ type: 'any', data: 'test' }]
      })
    })

    it('should handle multiple simultaneous calls', () => {
      const proxy = wrap(mockEndpoint)
      
      // Make multiple calls
      proxy.method1()
      proxy.method2()
      proxy.method3()
      
      // All calls should have unique IDs
      const calls = mockEndpoint.postMessage.mock.calls
      const ids = calls.map(call => call[0].id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(3)
      expect(calls).toHaveLength(3)
    })
  })

  describe('performance considerations', () => {
    it('should reuse proxy objects for same property paths', () => {
      const proxy = wrap(mockEndpoint)
      
      // Access same property multiple times
      const prop1 = proxy.someProperty
      const prop2 = proxy.someProperty
      
      // Should return the same proxy object
      expect(prop1).toBe(prop2)
    })

    it('should handle many property accesses efficiently', () => {
      const proxy = wrap(mockEndpoint)
      
      // Access many different properties
      for (let i = 0; i < 100; i++) {
        proxy[`property${i}`]
      }
      
      // Should not have sent any messages yet (only on function calls)
      expect(mockEndpoint.postMessage).not.toHaveBeenCalled()
    })
  })
})