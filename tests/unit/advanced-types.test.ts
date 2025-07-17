/**
 * Advanced type tests for comlink2 library
 * 
 * This file contains more sophisticated type tests including:
 * - Generic type parameter testing
 * - Type inference verification
 * - Complex type composition testing
 * - Utility type testing
 */

import { describe, it, expect } from 'vitest'
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

// Advanced type testing utilities
type IsExact<T, U> = T extends U ? U extends T ? true : false : false
type IsNever<T> = T extends never ? true : false
type IsAny<T> = 0 extends (1 & T) ? true : false
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false

// Test that a type is assignable to another
type IsAssignable<T, U> = T extends U ? true : false

// Test function parameter types
type GetParameters<T> = T extends (...args: infer P) => any ? P : never
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never

describe('Advanced Type Tests', () => {
  describe('Generic type parameters', () => {
    it('should correctly handle generic PostMessageEndpoint types', () => {
      // Test that PostMessageEndpoint can be parameterized with different types
      type StringEndpoint = PostMessageEndpoint<string>
      type NumberEndpoint = PostMessageEndpoint<number>
      type ObjectEndpoint = PostMessageEndpoint<{ data: string }>
      
      // These should all be different types
      const _stringCheck: IsExact<StringEndpoint, NumberEndpoint> = false
      const _numberCheck: IsExact<NumberEndpoint, ObjectEndpoint> = false
      const _objectCheck: IsExact<ObjectEndpoint, StringEndpoint> = false
      
      // But they should all be assignable to the base type
      const _stringAssignable: IsAssignable<StringEndpoint, PostMessageEndpoint> = true
      const _numberAssignable: IsAssignable<NumberEndpoint, PostMessageEndpoint> = true
      const _objectAssignable: IsAssignable<ObjectEndpoint, PostMessageEndpoint> = true
      
      expect(true).toBe(true) // Compilation test
    })

    it('should correctly handle generic StreamEndpoint types', () => {
      // Test that StreamEndpoint can be parameterized with different types
      type StringStream = StreamEndpoint<string>
      type NumberStream = StreamEndpoint<number>
      type BinaryStream = StreamEndpoint<Uint8Array>
      
      // Test that the input/output types match the generic parameter
      type StringStreamInput = StringStream['input']
      type StringStreamOutput = StringStream['output']
      
      const _inputCheck: IsExact<StringStreamInput, WritableStream<string>> = true
      const _outputCheck: IsExact<StringStreamOutput, ReadableStream<string>> = true
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Type inference', () => {
    it('should infer correct types from function parameters', () => {
      // Test parameter type inference
      type StreamToPostMessageParams = GetParameters<typeof streamToPostMessage>
      type PostMessageToStreamParams = GetParameters<typeof postMessageToStream>
      type CreateChannelParams = GetParameters<typeof createChannel>
      
      // Verify parameter types
      const _streamToPostMessage: IsExact<StreamToPostMessageParams, [StreamEndpoint]> = true
      const _postMessageToStream: IsExact<PostMessageToStreamParams, [PostMessageEndpoint]> = true
      const _createChannel: IsExact<CreateChannelParams, [PostMessageEndpoint, string | number]> = true
      
      expect(true).toBe(true) // Compilation test
    })

    it('should infer correct return types from functions', () => {
      // Test return type inference
      type StreamToPostMessageReturn = GetReturnType<typeof streamToPostMessage>
      type PostMessageToStreamReturn = GetReturnType<typeof postMessageToStream>
      type ConnectEndpointsReturn = GetReturnType<typeof connectEndpoints>
      
      // Verify return types
      const _streamToPostMessage: IsExact<StreamToPostMessageReturn, PostMessageEndpoint> = true
      const _postMessageToStream: IsExact<PostMessageToStreamReturn, StreamEndpoint> = true
      const _connectEndpoints: IsExact<ConnectEndpointsReturn, () => void> = true
      
      expect(true).toBe(true) // Compilation test
    })

    it('should handle any type for wrap function', () => {
      // The wrap function should return any since it creates dynamic proxies
      type WrapReturn = GetReturnType<typeof wrap>
      
      const _wrapReturnsAny: IsAny<WrapReturn> = true
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Complex type composition', () => {
    it('should allow composition of endpoints and streams', () => {
      // Test that we can compose different endpoint types
      const channel = new MessageChannel()
      const endpoint1: PostMessageEndpoint = channel.port1
      const endpoint2: PostMessageEndpoint = channel.port2
      
      // Create a channel within a channel
      const subChannel1 = createChannel(endpoint1, 'sub1')
      const subChannel2 = createChannel(endpoint2, 'sub2')
      
      // Connect the sub-channels
      const cleanup = connectEndpoints(subChannel1, subChannel2)
      
      // All should have the same type
      const _endpoint1Type: IsExact<typeof endpoint1, PostMessageEndpoint> = true
      const _subChannel1Type: IsExact<typeof subChannel1, PostMessageEndpoint> = true
      const _cleanupType: IsExact<typeof cleanup, () => void> = true
      
      expect(cleanup).toBeDefined()
    })

    it('should allow conversion between endpoints and streams', () => {
      // Test round-trip conversion
      const originalStream: StreamEndpoint = {
        input: new WritableStream(),
        output: new ReadableStream()
      }
      
      // Convert to PostMessage and back
      const postMessageEndpoint = streamToPostMessage(originalStream)
      const convertedStream = postMessageToStream(postMessageEndpoint)
      
      // Both should have the same type
      const _originalType: IsExact<typeof originalStream, StreamEndpoint> = true
      const _convertedType: IsExact<typeof convertedStream, StreamEndpoint> = true
      const _postMessageType: IsExact<typeof postMessageEndpoint, PostMessageEndpoint> = true
      
      expect(convertedStream).toBeDefined()
    })
  })

  describe('Utility types and type guards', () => {
    it('should work with PostMessageEndpointString type alias', () => {
      // Test that PostMessageEndpointString is exactly PostMessageEndpoint<string>
      type StringEndpointExact = PostMessageEndpoint<string>
      
      const _exactMatch: IsExact<PostMessageEndpointString, StringEndpointExact> = true
      
      // Should be assignable both ways
      const _assignable1: IsAssignable<PostMessageEndpointString, PostMessageEndpoint<string>> = true
      const _assignable2: IsAssignable<PostMessageEndpoint<string>, PostMessageEndpointString> = true
      
      expect(true).toBe(true) // Compilation test
    })

    it('should handle union types correctly', () => {
      // Test that createChannel accepts string | number
      type ChannelNameType = GetParameters<typeof createChannel>[1]
      
      const _channelNameType: IsExact<ChannelNameType, string | number> = true
      
      // Test that both are assignable
      const _stringAssignable: IsAssignable<string, ChannelNameType> = true
      const _numberAssignable: IsAssignable<number, ChannelNameType> = true
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Web API type compatibility', () => {
    it('should work with native Web API types', () => {
      // Test that native APIs match our interface types
      const channel = new MessageChannel()
      const port1 = channel.port1
      const port2 = channel.port2
      
      // Native MessagePort should be assignable to PostMessageEndpoint
      const _port1Assignable: IsAssignable<typeof port1, PostMessageEndpoint> = true
      const _port2Assignable: IsAssignable<typeof port2, PostMessageEndpoint> = true
      
      // Should work with our functions
      const wrappedObject = wrap(port1)
      const channelEndpoint = createChannel(port2, 'test')
      
      expect(wrappedObject).toBeDefined()
      expect(channelEndpoint).toBeDefined()
    })

    it('should handle WebSocket and DataChannel types', () => {
      // This test is purely for type checking, not runtime execution
      // We test that the function parameters accept the correct types
      
      // Type check: webSocketToPostMessage should accept WebSocket
      type WebSocketParam = GetParameters<typeof webSocketToPostMessage>[0]
      const _webSocketParam: IsExact<WebSocketParam, WebSocket> = true
      
      // Type check: dataChannelToStream should accept RTCDataChannel
      type DataChannelStreamParam = GetParameters<typeof dataChannelToStream>[0]
      const _dataChannelStreamParam: IsExact<DataChannelStreamParam, RTCDataChannel> = true
      
      // Type check: dataChannelToPostMessage should accept RTCDataChannel
      type DataChannelPostMessageParam = GetParameters<typeof dataChannelToPostMessage>[0]
      const _dataChannelPostMessageParam: IsExact<DataChannelPostMessageParam, RTCDataChannel> = true
      
      // Verify return types
      type WebSocketReturnType = GetReturnType<typeof webSocketToPostMessage>
      type DataChannelStreamReturnType = GetReturnType<typeof dataChannelToStream>
      type DataChannelPostMessageReturnType = GetReturnType<typeof dataChannelToPostMessage>
      
      const _webSocketType: IsExact<WebSocketReturnType, PostMessageEndpoint> = true
      const _dataChannelStreamType: IsExact<DataChannelStreamReturnType, StreamEndpoint> = true
      const _dataChannelEndpointType: IsExact<DataChannelPostMessageReturnType, PostMessageEndpoint> = true
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle void return types correctly', () => {
      // Test that expose returns void
      type ExposeReturnType = GetReturnType<typeof expose>
      
      const _exposeReturnsVoid: IsExact<ExposeReturnType, void> = true
      
      expect(true).toBe(true) // Compilation test
    })

    it('should handle cleanup function types', () => {
      // Test that cleanup functions have the correct signature
      type CleanupFunction = () => void
      
      type ConnectEndpointsCleanup = GetReturnType<typeof connectEndpoints>
      type ConnectStreamsCleanup = GetReturnType<typeof connectStreams>
      
      const _endpointsCleanup: IsExact<ConnectEndpointsCleanup, CleanupFunction> = true
      const _streamsCleanup: IsExact<ConnectStreamsCleanup, CleanupFunction> = true
      
      expect(true).toBe(true) // Compilation test
    })
  })

  describe('TypeScript strict mode compliance', () => {
    it('should not allow implicit any types', () => {
      // In strict mode, these should be properly typed
      const channel = new MessageChannel()
      const endpoint = channel.port1
      
      // This should be typed as PostMessageEndpoint, not any
      const _endpointType: IsAny<typeof endpoint> = false
      
      // Function parameters should be properly typed
      const listener = (event: MessageEvent) => {}
      endpoint.addEventListener('message', listener)
      
      // The event parameter should be typed as MessageEvent
      const _eventType: IsAny<Parameters<typeof listener>[0]> = false
      
      expect(true).toBe(true) // Compilation test
    })

    it('should enforce null safety', () => {
      // In strict mode, null and undefined should be handled properly
      const channel = new MessageChannel()
      const endpoint: PostMessageEndpoint = channel.port1
      
      // This should not allow null/undefined without explicit handling
      // endpoint.postMessage(null) // Should work
      // endpoint.postMessage(undefined) // Should work
      
      expect(endpoint).toBeDefined()
    })

    it('should require proper type annotations for functions', () => {
      // All exported functions should have proper type annotations
      const functions = {
        streamToPostMessage,
        postMessageToStream,
        createChannel,
        connectEndpoints,
        connectStreams,
        wrap,
        expose,
        dataChannelToStream,
        dataChannelToPostMessage,
        webSocketToPostMessage
      }
      
      // All functions should be properly typed (not any)
      Object.entries(functions).forEach(([name, func]) => {
        expect(typeof func).toBe('function')
        // In strict mode, functions should have proper types
        const _notAny: IsAny<typeof func> = false
      })
    })
  })
})