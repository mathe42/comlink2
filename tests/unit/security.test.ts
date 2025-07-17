import { describe, it, expect, vi, beforeEach } from 'vitest'
import { expose, wrap } from '../../src/remoteObject'
import { createChannel } from '../../src/endpoint'

describe('Security Tests', () => {
  let mockEndpoint: any

  beforeEach(() => {
    mockEndpoint = {
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
      removeEventListener: vi.fn()
    }
  })

  describe('Prototype Pollution Protection', () => {
    it('should block access to __proto__', () => {
      const testObj = { normalMethod: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['__proto__', 'constructor'],
          args: []
        }
      })

      // Should send error response, not success response
      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('unsafe property names')
      })
    })

    it('should block access to prototype', () => {
      const testObj = { normalMethod: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['prototype', 'constructor'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('unsafe property names')
      })
    })

    it('should block access to constructor', () => {
      const testObj = { normalMethod: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['constructor'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('unsafe property names')
      })
    })

    it('should allow normal property access', () => {
      const testObj = { 
        normalMethod: () => 'success',
        data: { value: 42 }
      }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['normalMethod'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: { type: 'any', data: 'success' }
      })
    })
  })

  describe('Input Validation', () => {
    it('should reject malformed RPC calls', () => {
      const testObj = { method: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Missing required fields - should not crash
      expect(() => {
        messageHandler({
          data: {
            // missing id, type, keyChain
          }
        })
      }).not.toThrow()
    })

    it('should reject non-array keyChain', () => {
      const testObj = { method: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: 'not-an-array',
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('must be an array')
      })
    })

    it('should reject non-string keyChain elements', () => {
      const testObj = { method: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['valid', 123, 'invalid'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('unsafe property names')
      })
    })

    it('should reject calls without args array for call type', () => {
      const testObj = { method: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['method']
          // missing args
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('args must be an array')
      })
    })
  })

  describe('Function Type Validation', () => {
    it('should reject calls to non-function properties', () => {
      const testObj = { 
        method: () => 'test',
        data: 'not-a-function'
      }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['data'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('not a function')
      })
    })

    it('should reject construct calls to non-constructor properties', () => {
      const testObj = { 
        regularMethod: () => 'test',
        data: 'not-a-constructor'
      }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'construct',
          keyChain: ['data'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('not a constructor')
      })
    })
  })

  describe('Property Access Control', () => {
    it('should reject access to non-existent properties', () => {
      const testObj = { existingMethod: () => 'test' }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['nonExistentMethod'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('not found or not accessible')
      })
    })

    it('should reject access to inherited properties', () => {
      class TestClass {
        ownMethod() { return 'own' }
      }
      TestClass.prototype.inheritedMethod = () => 'inherited'
      
      const testObj = new TestClass()
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['inheritedMethod'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('not found or not accessible')
      })
    })

    it('should allow access to own properties', () => {
      const testObj = { 
        ownMethod: () => 'success'
      }
      Object.defineProperty(testObj, 'ownMethod', { 
        value: () => 'success',
        enumerable: true,
        configurable: true,
        writable: true
      })
      
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['ownMethod'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: { type: 'any', data: 'success' }
      })
    })
  })

  describe('Injection Prevention', () => {
    it('should not execute arbitrary code through property names', () => {
      const testObj = { 
        normalMethod: () => 'test'
      }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Try to inject code through property name
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['normalMethod(); alert("xss"); //'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'error',
        error: expect.stringContaining('not found or not accessible')
      })
    })

    it('should safely handle special characters in property names', () => {
      const testObj = { 
        'normal-method': () => 'test',
        'method.with.dots': () => 'test',
        'method with spaces': () => 'test'
      }
      expose(testObj, mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      messageHandler({
        data: {
          id: 1,
          type: 'call',
          keyChain: ['normal-method'],
          args: []
        }
      })

      expect(mockEndpoint.postMessage).toHaveBeenCalledWith({
        id: 1,
        type: 'response',
        data: { type: 'any', data: 'test' }
      })
    })
  })

  describe('Wrap Security', () => {
    it('should validate RPC responses', () => {
      wrap(mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Invalid response format - should not crash
      expect(() => {
        messageHandler({
          data: {
            // missing required fields
            invalidResponse: true
          }
        })
      }).not.toThrow()
    })

    it('should handle malformed response data gracefully', () => {
      wrap(mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Completely invalid data - should not crash
      expect(() => {
        messageHandler({
          data: null
        })
      }).not.toThrow()
    })
  })

  describe('Memory Safety', () => {
    it('should handle promise responses gracefully', () => {
      wrap(mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Simulate successful response - should not crash
      expect(() => {
        messageHandler({
          data: {
            id: 123,
            type: 'response',
            data: { type: 'any', data: 'test' }
          }
        })
      }).not.toThrow()
    })

    it('should handle non-existent promise IDs gracefully', () => {
      wrap(mockEndpoint)

      const messageHandler = mockEndpoint.addEventListener.mock.calls[0][1]
      
      // Response for non-existent promise - should not crash
      expect(() => {
        messageHandler({
          data: {
            id: 999999,
            type: 'response',
            data: { type: 'any', data: 'test' }
          }
        })
      }).not.toThrow()
    })
  })
})