export type { PostMessageEndpoint, PostMessageEndpointString, StreamEndpoint } from './endpoint'
export { streamToPostMessage, createChannel, postMessageToStream, connectEndpoints, connectStreams } from './endpoint'

// Web API wrappers
export { 
  dataChannelToStream,
  dataChannelToPostMessage,
  webSocketToPostMessage
} from './endpointWeb'

// Remote Object API (planned)
export type {
  RemoteApi,
  RemoteHandler,
  RemoteObject,
  RemoteRequest,
  RemoteResponse,
  RemoteError,
  RemoteOptions,
  RemoteApiConfig,
  RemoteObjectInfo,
  ObjectReferenceManager,
  RemoteEvent,
  RemoteEventListener,
  RemoteEventEmitter
} from './remoteObject'

export {
  RemoteOperationType,
  MessageType,
  SerializationStrategy,
  RemoteEventType
} from './remoteObject'