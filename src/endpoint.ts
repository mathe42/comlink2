type Listener<T> = (this: unknown, ev: MessageEvent<T>) => any

export interface PostMessageEndpoint<T = any> {
  postMessage(data: any): void
  addEventListener(type: 'message', listener: Listener<T>): void;
  removeEventListener(type: 'message', listener: Listener<T>): void;
}

export type PostMessageEndpointString = PostMessageEndpoint<string>;

export interface StreamEndpoint<T = any> {
  input: WritableStream<T>,
  output: ReadableStream<T>
}

export function streamToPostMessage(ep: StreamEndpoint): PostMessageEndpoint {
  const event = new Set<Listener<any>>()
  const writer = ep.input.getWriter()

  const reader = ep.output.getReader()

  Promise.resolve().then(async () => {
    while (true) {
      const data = await reader.read()
      
      if(data.done) {
        break
      }

      const ev = new MessageEvent('message', {data: data.value})
      event.forEach(v => v(ev))
    }
  })

  return {
    postMessage(data) {
      writer.write(data)
    },
    addEventListener(type, listener) {
      if (type == 'message') {
        event.add(listener)
      }
    },
    removeEventListener(type, listener) {
      if (type == 'message') {
        event.delete(listener)
      }
    }
  }
}

export function createChannel(endpoint: PostMessageEndpoint, channelName: string | number): PostMessageEndpoint {
  const channelListeners = new Set<Listener<any>>()
  
  // Listen for messages on the main endpoint and filter by channel
  const channelListener: Listener<any> = (event) => {
    if (event.data && typeof event.data === 'object' && event.data.channel === channelName) {
      // Create new event with unwrapped data
      const channelEvent = new MessageEvent('message', { data: event.data.payload })
      channelListeners.forEach(listener => listener(channelEvent))
    }
  }
  
  endpoint.addEventListener('message', channelListener)
  
  return {
    postMessage(data) {
      // Wrap data with channel information
      endpoint.postMessage({
        channel: channelName,
        payload: data
      })
    },
    addEventListener(type, listener) {
      if (type === 'message') {
        channelListeners.add(listener)
      }
    },
    removeEventListener(type, listener) {
      if (type === 'message') {
        channelListeners.delete(listener)
      }
    }
  }
}

export function postMessageToStream(endpoint: PostMessageEndpoint): StreamEndpoint {  
  const inputIdentity = new TransformStream()
  const outputIdentity = new TransformStream()
  
  const writer = outputIdentity.writable.getWriter()
  
  endpoint.addEventListener('message', (ev) => {
    writer.write(ev.data)
  })
  
  Promise.resolve().then(async () => {
    const reader = inputIdentity.readable.getReader()

    while (true) {
      const data = await reader.read()
      
      if(data.done) {
        break
      }

      endpoint.postMessage(data.value)
    }
  })
  
  return {
    input: inputIdentity.writable,
    output: outputIdentity.readable
  }
}

export function connectEndpoints(endpointA: PostMessageEndpoint, endpointB: PostMessageEndpoint): () => void {
  // Create listeners for bidirectional communication
  const listenerA: Listener<any> = (event) => {
    endpointB.postMessage(event.data)
  }
  
  const listenerB: Listener<any> = (event) => {
    endpointA.postMessage(event.data)
  }
  
  // Connect the endpoints
  endpointA.addEventListener('message', listenerA)
  endpointB.addEventListener('message', listenerB)
  
  // Return cleanup function
  return () => {
    endpointA.removeEventListener('message', listenerA)
    endpointB.removeEventListener('message', listenerB)
  }
}

export function connectStreams(streamA: StreamEndpoint, streamB: StreamEndpoint): () => void {
  // Connect A's output to B's input
  const pipeAtoB = streamA.output.pipeTo(streamB.input)
  
  // Connect B's output to A's input  
  const pipeBtoA = streamB.output.pipeTo(streamA.input)
  
  // Return cleanup function to cancel both pipes
  return () => {
    pipeAtoB.catch(() => {}) // Ignore errors from cancelled pipe
    pipeBtoA.catch(() => {}) // Ignore errors from cancelled pipe
  }
}

export interface LoggingOptions {
  prefix?: string
  logIncoming?: boolean
  logOutgoing?: boolean
  logger?: (message: string, data?: any) => void
}

export function withLogging(endpoint: PostMessageEndpoint, options: LoggingOptions = {}): PostMessageEndpoint {
  const {
    prefix = 'PostMessage',
    logIncoming = true,
    logOutgoing = true,
    logger = console.log
  } = options

  return {
    postMessage(data) {
      if (logOutgoing) {
        logger(`${prefix} [OUT]:`, data)
      }
      endpoint.postMessage(data)
    },
    addEventListener(type, listener) {
      if (type === 'message' && logIncoming) {
        const loggingListener: Listener<any> = (event) => {
          logger(`${prefix} [IN]:`, event.data)
          listener(event)
        }
        endpoint.addEventListener(type, loggingListener)
      } else {
        endpoint.addEventListener(type, listener)
      }
    },
    removeEventListener(type, listener) {
      endpoint.removeEventListener(type, listener)
    }
  }
}

