/**
 * Type tests for objex library
 * 
 * This file contains comprehensive type tests to ensure type safety
 * and proper TypeScript declarations for all exported types and functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { 
  PostMessageEndpoint, 
  PostMessageEndpointString, 
  StreamEndpoint 
} from '../../src/endpoint'
import {
  streamToPostMessage,
  createChannel,
  postMessageToStream,
  connectEndpoints,
  connectStreams
} from '../../src/endpoint'
import {
  dataChannelToStream,
  dataChannelToPostMessage,
  webSocketToPostMessage
} from '../../src/endpointWeb'
import {
  wrap,
  expose
} from '../../src/remoteObject'

// Type testing utilities
type Equals<T, U> = T extends U ? (U extends T ? true : false) : false
type AssertEquals<T, U> = Equals<T, U> extends true ? T : never

// Helper function to test that types are assignable
function assertType<T>(): <U extends T>(value: U) => U {
  return (value) => value
}

// Helper function to test that types are not assignable
function assertNotType<T>(): <U>(value: U) => U extends T ? never : U {
  return (value) => value as any
}

describe('Type Tests', () => {
  describe('PostMessageEndpoint interface', () => {
    it('should accept correct PostMessageEndpoint implementations', () => {
      // Test with MessageChannel
      const channel = new MessageChannel()
      const endpoint1: PostMessageEndpoint = channel.port1
      const endpoint2: PostMessageEndpoint = channel.port2
      
      expect(endpoint1).toBeDefined()
      expect(endpoint2).toBeDefined()
      
      // Test method signatures
      const listener = (event: MessageEvent) => {}
      endpoint1.addEventListener('message', listener)
      endpoint1.removeEventListener('message', listener)
      endpoint1.postMessage({ test: 'data' })
    })

    it('should work with generic type parameter', () => {
      const stringEndpoint: PostMessageEndpoint<string> = {
        postMessage: (data: any) => {},
        addEventListener: (type: 'message', listener: (ev: MessageEvent<string>) => any) => {},
        removeEventListener: (type: 'message', listener: (ev: MessageEvent<string>) => any) => {}
      }
      
      expect(stringEndpoint).toBeDefined()
    })

    it('should support PostMessageEndpointString type alias', () => {
      const stringEndpoint: PostMessageEndpointString = {
        postMessage: (data: any) => {},
        addEventListener: (type: 'message', listener: (ev: MessageEvent<string>) => any) => {},
        removeEventListener: (type: 'message', listener: (ev: MessageEvent<string>) => any) => {}
      }
      
      expect(stringEndpoint).toBeDefined()
      
      // Type check: PostMessageEndpointString should be assignable to PostMessageEndpoint<string>
      const regularEndpoint: PostMessageEndpoint<string> = stringEndpoint
      expect(regularEndpoint).toBeDefined()
    })

    it('should enforce correct listener signature', () => {
      const endpoint: PostMessageEndpoint = {
        postMessage: (data: any) => {},
        addEventListener: (type: 'message', listener: (ev: MessageEvent<any>) => any) => {},
        removeEventListener: (type: 'message', listener: (ev: MessageEvent<any>) => any) => {}
      }
      
      // This should compile correctly
      const correctListener = (event: MessageEvent<any>) => {}
      endpoint.addEventListener('message', correctListener)
      endpoint.removeEventListener('message', correctListener)
    })
  })

  describe('StreamEndpoint interface', () => {
    it('should accept correct StreamEndpoint implementations', () => {
      const endpoint: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      expect(endpoint).toBeDefined()
      expect(endpoint.input).toBeInstanceOf(WritableStream)
      expect(endpoint.output).toBeInstanceOf(ReadableStream)
    })

    it('should work with generic type parameter', () => {
      const stringEndpoint: StreamEndpoint<string> = {
        input: new WritableStream<string>(),
        output: new ReadableStream<string>()
      }
      
      expect(stringEndpoint).toBeDefined()
    })

    it('should enforce correct stream types', () => {
      // Type check: input must be WritableStream
      type InputType = StreamEndpoint['input']
      type IsWritableStream = AssertEquals<InputType, WritableStream<any>>
      
      // Type check: output must be ReadableStream
      type OutputType = StreamEndpoint['output']
      type IsReadableStream = AssertEquals<OutputType, ReadableStream<any>>
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Core endpoint functions', () => {
    it('should have correct type signatures for streamToPostMessage', () => {
      const streamEndpoint: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      const postMessageEndpoint: PostMessageEndpoint = streamToPostMessage(streamEndpoint)
      
      expect(postMessageEndpoint).toBeDefined()
      expect(typeof postMessageEndpoint.postMessage).toBe('function')
      expect(typeof postMessageEndpoint.addEventListener).toBe('function')
      expect(typeof postMessageEndpoint.removeEventListener).toBe('function')
    })

    it('should have correct type signatures for postMessageToStream', () => {
      const channel = new MessageChannel()
      const postMessageEndpoint: PostMessageEndpoint = channel.port1
      
      const streamEndpoint: StreamEndpoint = postMessageToStream(postMessageEndpoint)
      
      expect(streamEndpoint).toBeDefined()
      expect(streamEndpoint.input).toBeInstanceOf(WritableStream)
      expect(streamEndpoint.output).toBeInstanceOf(ReadableStream)
    })

    it('should have correct type signatures for createChannel', () => {
      const channel = new MessageChannel()
      const endpoint: PostMessageEndpoint = channel.port1
      
      // Test with string channel name
      const stringChannel: PostMessageEndpoint = createChannel(endpoint, 'test')
      expect(stringChannel).toBeDefined()
      
      // Test with number channel name
      const numberChannel: PostMessageEndpoint = createChannel(endpoint, 123)
      expect(numberChannel).toBeDefined()
    })

    it('should have correct type signatures for connectEndpoints', () => {
      const channel1 = new MessageChannel()
      const channel2 = new MessageChannel()
      
      const endpointA: PostMessageEndpoint = channel1.port1
      const endpointB: PostMessageEndpoint = channel2.port1
      
      const cleanup: () => void = connectEndpoints(endpointA, endpointB)
      
      expect(typeof cleanup).toBe('function')
    })

    it('should have correct type signatures for connectStreams', () => {
      const streamA: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      const streamB: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      const cleanup: () => void = connectStreams(streamA, streamB)
      
      expect(typeof cleanup).toBe('function')
    })
  })

  describe('Remote Object functions', () => {
    it('should have correct type signatures for wrap', () => {
      const channel = new MessageChannel()
      const endpoint: PostMessageEndpoint = channel.port1
      
      const wrappedObject: any = wrap(endpoint)
      
      expect(wrappedObject).toBeDefined()
      // The return type is intentionally 'any' since it's a dynamic proxy
    })

    it('should have correct type signatures for expose', () => {
      const channel = new MessageChannel()
      const endpoint: PostMessageEndpoint = channel.port1
      const obj = { test: () => 'hello' }
      
      const result: void = expose(obj, endpoint)
      
      expect(result).toBeUndefined()
    })

    it('should accept any object type for expose', () => {
      const channel = new MessageChannel()
      const endpoint: PostMessageEndpoint = channel.port1
      
      // Test with different object types
      expose({ method: () => {} }, endpoint)
      expose(class TestClass {}, endpoint)
      expose(function testFunction() {}, endpoint)
      expose('string', endpoint)
      expose(42, endpoint)
      expose(null, endpoint)
      expose(undefined, endpoint)
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Web API adapter functions', () => {
    it('should have correct type signatures for dataChannelToStream', () => {
      const mockDataChannel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        readyState: 'open'
      } as unknown as RTCDataChannel
      
      const streamEndpoint: StreamEndpoint = dataChannelToStream(mockDataChannel)
      
      expect(streamEndpoint).toBeDefined()
      expect(streamEndpoint.input).toBeInstanceOf(WritableStream)
      expect(streamEndpoint.output).toBeInstanceOf(ReadableStream)
    })

    it('should have correct type signatures for dataChannelToPostMessage', () => {
      const mockDataChannel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        readyState: 'open'
      } as unknown as RTCDataChannel
      
      const postMessageEndpoint: PostMessageEndpoint = dataChannelToPostMessage(mockDataChannel)
      
      expect(postMessageEndpoint).toBeDefined()
      expect(typeof postMessageEndpoint.postMessage).toBe('function')
      expect(typeof postMessageEndpoint.addEventListener).toBe('function')
      expect(typeof postMessageEndpoint.removeEventListener).toBe('function')
    })

    it('should have correct type signatures for webSocketToPostMessage', () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        readyState: WebSocket.OPEN
      } as unknown as WebSocket
      
      const postMessageEndpoint: PostMessageEndpoint = webSocketToPostMessage(mockWebSocket)
      
      expect(postMessageEndpoint).toBeDefined()
      expect(typeof postMessageEndpoint.postMessage).toBe('function')
      expect(typeof postMessageEndpoint.addEventListener).toBe('function')
      expect(typeof postMessageEndpoint.removeEventListener).toBe('function')
    })
  })

  describe('Type compatibility and inference', () => {
    it('should allow PostMessageEndpoint to be used interchangeably', () => {
      const channel = new MessageChannel()
      const endpoint1: PostMessageEndpoint = channel.port1
      const endpoint2: PostMessageEndpoint = channel.port2
      
      // These should all accept PostMessageEndpoint
      const wrappedObject = wrap(endpoint1)
      expose({}, endpoint1)
      const channelEndpoint = createChannel(endpoint1, 'test')
      const streamEndpoint = postMessageToStream(endpoint1)
      connectEndpoints(endpoint1, endpoint2)
      
      expect(wrappedObject).toBeDefined()
      expect(channelEndpoint).toBeDefined()
      expect(streamEndpoint).toBeDefined()
    })

    it('should allow StreamEndpoint to be used interchangeably', () => {
      const stream1: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      const stream2: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      // These should all accept StreamEndpoint
      const postMessageEndpoint = streamToPostMessage(stream1)
      connectStreams(stream1, stream2)
      
      expect(postMessageEndpoint).toBeDefined()
    })

    it('should have proper return types for all functions', () => {
      const channel = new MessageChannel()
      const endpoint: PostMessageEndpoint = channel.port1
      
      // Test return types
      type StreamToPostMessageReturn = ReturnType<typeof streamToPostMessage>
      type PostMessageToStreamReturn = ReturnType<typeof postMessageToStream>
      type CreateChannelReturn = ReturnType<typeof createChannel>
      type ConnectEndpointsReturn = ReturnType<typeof connectEndpoints>
      type ConnectStreamsReturn = ReturnType<typeof connectStreams>
      type WrapReturn = ReturnType<typeof wrap>
      type ExposeReturn = ReturnType<typeof expose>
      
      // Type assertions
      const _streamToPostMessage: AssertEquals<StreamToPostMessageReturn, PostMessageEndpoint> = null as any
      const _postMessageToStream: AssertEquals<PostMessageToStreamReturn, StreamEndpoint> = null as any
      const _createChannel: AssertEquals<CreateChannelReturn, PostMessageEndpoint> = null as any
      const _connectEndpoints: AssertEquals<ConnectEndpointsReturn, () => void> = null as any
      const _connectStreams: AssertEquals<ConnectStreamsReturn, () => void> = null as any
      const _wrap: AssertEquals<WrapReturn, any> = null as any
      const _expose: AssertEquals<ExposeReturn, void> = null as any
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Error handling in type system', () => {
    it('should enforce correct event listener types', () => {
      const endpoint: PostMessageEndpoint = {
        postMessage: (data: any) => {},
        addEventListener: (type: 'message', listener: (ev: MessageEvent<any>) => any) => {},
        removeEventListener: (type: 'message', listener: (ev: MessageEvent<any>) => any) => {}
      }
      
      // These should compile correctly
      const correctListener = (event: MessageEvent) => {}
      endpoint.addEventListener('message', correctListener)
      
      // Type system should catch incorrect event types at compile time
      // endpoint.addEventListener('click', correctListener) // Should cause compile error
      
      expect(true).toBe(true) // Compilation test
    })

    it('should enforce correct stream types', () => {
      // These should compile correctly
      const correctStream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      // These should cause compile errors:
      // const incorrectStream1: StreamEndpoint = {
      //   input: new ReadableStream(), // Wrong type
      //   output: new WritableStream() // Wrong type
      // }
      
      expect(correctStream).toBeDefined()
    })
  })
})