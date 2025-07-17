import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withLogging, PostMessageEndpoint } from '../../src/endpoint'

describe('withLogging', () => {
  let mockEndpoint: PostMessageEndpoint
  let mockLogger: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLogger = vi.fn()
    mockEndpoint = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  })

  it('should log outgoing messages by default', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { logger: mockLogger })
    
    loggedEndpoint.postMessage({ test: 'data' })
    
    expect(mockLogger).toHaveBeenCalledWith('PostMessage [OUT]:', { test: 'data' })
    expect(mockEndpoint.postMessage).toHaveBeenCalledWith({ test: 'data' })
  })

  it('should log incoming messages by default', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { logger: mockLogger })
    const listener = vi.fn()
    
    loggedEndpoint.addEventListener('message', listener)
    
    expect(mockEndpoint.addEventListener).toHaveBeenCalled()
    const addedListener = (mockEndpoint.addEventListener as any).mock.calls[0][1]
    
    const mockEvent = { data: { incoming: 'message' } }
    addedListener(mockEvent)
    
    expect(mockLogger).toHaveBeenCalledWith('PostMessage [IN]:', { incoming: 'message' })
    expect(listener).toHaveBeenCalledWith(mockEvent)
  })

  it('should use custom prefix', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { 
      prefix: 'MyChannel',
      logger: mockLogger 
    })
    
    loggedEndpoint.postMessage({ test: 'data' })
    
    expect(mockLogger).toHaveBeenCalledWith('MyChannel [OUT]:', { test: 'data' })
  })

  it('should disable outgoing logging when logOutgoing is false', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { 
      logOutgoing: false,
      logger: mockLogger 
    })
    
    loggedEndpoint.postMessage({ test: 'data' })
    
    expect(mockLogger).not.toHaveBeenCalled()
    expect(mockEndpoint.postMessage).toHaveBeenCalledWith({ test: 'data' })
  })

  it('should disable incoming logging when logIncoming is false', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { 
      logIncoming: false,
      logger: mockLogger 
    })
    const listener = vi.fn()
    
    loggedEndpoint.addEventListener('message', listener)
    
    expect(mockEndpoint.addEventListener).toHaveBeenCalledWith('message', listener)
    expect(mockLogger).not.toHaveBeenCalled()
  })

  it('should pass through removeEventListener calls', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { logger: mockLogger })
    const listener = vi.fn()
    
    loggedEndpoint.removeEventListener('message', listener)
    
    expect(mockEndpoint.removeEventListener).toHaveBeenCalledWith('message', listener)
  })

  it('should handle non-message event types without logging', () => {
    const loggedEndpoint = withLogging(mockEndpoint, { logger: mockLogger })
    const listener = vi.fn()
    
    loggedEndpoint.addEventListener('error' as any, listener)
    
    expect(mockEndpoint.addEventListener).toHaveBeenCalledWith('error', listener)
    expect(mockLogger).not.toHaveBeenCalled()
  })
})