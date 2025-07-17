import { createChannel, type PostMessageEndpoint } from './endpoint'

// Security assertion functions
function assertValidKeyChain(keyChain: unknown): asserts keyChain is string[] {
  if (!Array.isArray(keyChain)) {
    throw new Error('Invalid keyChain: must be an array');
  }
  
  if (keyChain.some(key => typeof key !== 'string' || key.includes('__proto__') || key.includes('prototype') || key.includes('constructor'))) {
    throw new Error('Invalid keyChain: contains unsafe property names');
  }
}

function assertValidRPCCall(data: unknown): asserts data is sRPCCall {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid RPC call: not an object');
  }
  
  const d = data as any;
  if (typeof d.id === 'undefined' || !d.type) {
    throw new Error('Invalid RPC call: missing id or type');
  }
  
  assertValidKeyChain(d.keyChain);
  
  if ((d.type === 'call' || d.type === 'construct') && !Array.isArray(d.args)) {
    throw new Error('Invalid RPC call: args must be an array');
  }
}

function assertValidRPCResponse(data: unknown): asserts data is sRPCResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid RPC response: not an object');
  }
  
  const d = data as any;
  if (typeof d.id === 'undefined' || d.type !== 'response') {
    throw new Error('Invalid RPC response: missing id or invalid type');
  }
}

function assertIsFunction(target: unknown, name: string): asserts target is Function {
  if (typeof target !== 'function') {
    throw new Error(`Target '${name}' is not a function`);
  }
}

function assertPropertyExists(obj: any, property: string): void {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`Cannot access property '${property}' on non-object`);
  }
  
  if (!Object.prototype.hasOwnProperty.call(obj, property)) {
    throw new Error(`Property '${property}' not found or not accessible`);
  }
}

type sRPCData = { type: 'any', data: any } | { type: 'wraped', id: string | number };
type sRPCCall = (({ id: number, keyChain: string[] }) & ({ type: 'await' } | { type: 'construct' | 'call', args: sRPCData[] }))

type sRPCResponse = { id: number, type: 'response', data: sRPCData }

function mapHelper<K, T>(m: Map<K, T>, key: K, data: () => T) {
  if (m.has(key)) {
    return m.get(key)
  }

  const o = data()
  m.set(key, o)
  return o
}


let uniqueInRealmId = 0;
function getId() {
  if (uniqueInRealmId > Number.MAX_SAFE_INTEGER - 1000) {
    return crypto.randomUUID()
  }
  uniqueInRealmId++;
  return uniqueInRealmId;
}

let markedObj = new WeakSet<any>()


function wrapArgs(args: any[], ep: PostMessageEndpoint): sRPCData[] {
  return args.map((arg) => wrapArg(arg, ep))
}

function wrapArg(data: unknown, ep: PostMessageEndpoint, wrap = false): sRPCData {
  if (typeof data === 'function') {
    wrap = true;
  } else if (data && typeof data === 'object' && !Array.isArray(data) && data !== null) {
    try {
      wrap = Object.values(data).some((v) => typeof v === 'function')
    } catch {
      // Handle objects that don't support Object.values
      wrap = false;
    }
  } else if (markedObj.has(data)) {
    wrap = true
  }

  if (wrap) {
    const id = getId();

    const channelEp = createChannel(ep, id)
    expose(data, channelEp)

    return { type: 'wraped', id }
  } else {
    return { type: 'any', data }
  }
}

function unwrapArg(data: sRPCData, ep: PostMessageEndpoint) {
  if (data.type === 'any') {
    return data.data
  } else if (data.type === 'wraped') {
    const id = data.id

    const channelEp = createChannel(ep, id)
    return wrap(channelEp)
  }

}

const promiseMap = new Map<number | string, { res: (data: any) => void, rej: (err: any) => void }>()
function createPromise(id: number | string) {
  return new Promise((res, rej) => {
    promiseMap.set(id, { res, rej })
  })
}

export function wrap(ep: PostMessageEndpoint) {
  ep.addEventListener('message', ev => {
    if (ev.data && !ev.data.channel) {
      try {
        // Das ist für mich
        assertValidRPCResponse(ev.data);
        const d: sRPCResponse =   ev.data

        const res = unwrapArg(d.data, ep)
        const p = promiseMap.get(d.id)

        if (p) {
          p.res(res)
          promiseMap.delete(d.id)
        }
      } catch (error) {
        console.error('Error processing RPC response:', error);
      }
    }
  })


  function createProxy(keyChain: string[] = []) {
    const getters = new Map<string, any>()

    return new Proxy(class { }, {
      get(_, p) {
        if (typeof p === 'symbol') {
          return null;
        }

        return mapHelper(getters, p, () => createProxy([...keyChain, p]))
      },
      apply(_, __, args) {
        if (keyChain[keyChain.length - 1] == 'then') {
          const id = getId()
          const p = createPromise(id)

          ep.postMessage({ id, type: 'await', keyChain: keyChain.slice(0, keyChain.length - 1) } as sRPCCall)

          return p.then(...args);
        } else {
          const id = getId()
          const p = createPromise(id)

          ep.postMessage({ id, type: 'call', keyChain: keyChain, args: wrapArgs(args, ep) } as sRPCCall)

          return p;
        }
      },
      construct(_, args) {
        const id = getId()
        const p = createPromise(id)

        ep.postMessage({ id, type: 'construct', keyChain: keyChain, args: wrapArgs(args, ep) } as sRPCCall)

        return p;
      }
    })
  }

  return createProxy()
}

function getKeyChain(obj: any, keyChain: string[]) {
  assertValidKeyChain(keyChain);

  let currentObject = obj;

  for (let i = 0; i < keyChain.length; i++) {
    const p = keyChain[i];
    assertPropertyExists(currentObject, p);
    currentObject = currentObject[p];
  }

  return currentObject
}

export function expose(obj: any, ep: PostMessageEndpoint) {
  ep.addEventListener('message', async ev => {
    if (ev.data && !ev.data.channel) {
      try {
        // Das ist für mich
        assertValidRPCCall(ev.data);
        const d: sRPCCall = ev.data

        if (d.type === 'await') {
          const o = getKeyChain(obj, d.keyChain)

          ep.postMessage({
            id: d.id,
            type: 'response',
            data: wrapArg(o, ep)
          } as sRPCResponse)
        } else if (d.type === 'call') {
          const fn = getKeyChain(obj, d.keyChain)
          assertIsFunction(fn, 'call target');

          const args = d.args.map(a => unwrapArg(a, ep))
          const response = await fn(...args)

          ep.postMessage({
            id: d.id,
            type: 'response',
            data: wrapArg(response, ep)
          } as sRPCResponse)
        } else if (d.type === 'construct') {
          const c = getKeyChain(obj, d.keyChain)
          assertIsFunction(c, 'constructor target');

          const args = Array.isArray(d.args) ? d.args.map(a => unwrapArg(a, ep)) : [];
          const i = new c(...args)

          ep.postMessage({
            id: d.id,
            type: 'response',
            data: wrapArg(i, ep, true)
          } as sRPCResponse)
        }
      } catch (error: any) {
        console.error('Error processing RPC call:', error);

        try {
          ep.postMessage({
            id: ev.data?.id,
            type: 'error',
            error: error.message
          });
        } catch (sendError) {
          console.error('Failed to send error response:', sendError);
        }
      }
    }
  })
}