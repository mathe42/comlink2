# remoteObject.ts API Reference

High-level RPC API for cross-realm object manipulation.

## Functions

### wrap()

Create a proxy object for remote function calls.

```typescript
function wrap(endpoint: PostMessageEndpoint): any
```

**Parameters:**
- `endpoint` - PostMessageEndpoint to communicate through

**Returns:**
- Proxy object that forwards calls to the remote endpoint

**Example:**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const remoteApi = wrap(worker)

// All methods return promises
const result = await remoteApi.calculate(5, 3)
const data = await remoteApi.fetchData('/api/users')
```

### expose()

Expose an object's methods for remote access.

```typescript
function expose(obj: any, endpoint: PostMessageEndpoint): void
```

**Parameters:**
- `obj` - Object to expose remotely
- `endpoint` - PostMessageEndpoint to receive calls on

**Returns:**
- void

**Example:**
```typescript
import { expose } from 'objex'

const api = {
  calculate(a, b) {
    return a + b
  },
  async fetchData(url) {
    const response = await fetch(url)
    return response.json()
  }
}

expose(api, self) // In worker context
```

## RPC Protocol

### Message Types

The RPC protocol uses structured messages:

```typescript
// Call message
{
  id: number,
  type: 'call',
  keyChain: string[],
  args: sRPCData[]
}

// Construct message
{
  id: number,
  type: 'construct',
  keyChain: string[],
  args: sRPCData[]
}

// Await message
{
  id: number,
  type: 'await',
  keyChain: string[]
}

// Response message
{
  id: number,
  type: 'response',
  data: sRPCData
}
```

### Data Wrapping

Arguments and return values are wrapped:

```typescript
type sRPCData = 
  | { type: 'any', data: any }
  | { type: 'wraped', id: string | number }
```

- `any` - Direct value serialization
- `wraped` - Remote object reference

## Advanced Features

### Function Arguments

Functions passed as arguments are automatically wrapped:

```typescript
// Remote object
const api = {
  processItems(items, callback) {
    return items.map(callback)
  }
}

// Usage
const result = await remoteApi.processItems(
  [1, 2, 3],
  (x) => x * 2
) // [2, 4, 6]
```

### Object References

Objects containing functions are automatically wrapped:

```typescript
// Remote object
const api = {
  createCounter() {
    let count = 0
    return {
      increment() { return ++count },
      decrement() { return --count },
      get value() { return count }
    }
  }
}

// Usage
const counter = await remoteApi.createCounter()
await counter.increment() // 1
await counter.increment() // 2
const value = await counter.value // 2
```

### Constructor Support

Remote constructors are supported:

```typescript
// Remote object
class Calculator {
  constructor(initial = 0) {
    this.value = initial
  }
  
  add(n) {
    this.value += n
    return this
  }
  
  get result() {
    return this.value
  }
}

const api = { Calculator }
expose(api, self)

// Usage
const CalcClass = remoteApi.Calculator
const calc = await new CalcClass(10)
await calc.add(5)
const result = await calc.result // 15
```

### Promise Handling

Promises are automatically resolved:

```typescript
// Remote object
const api = {
  async fetchUserData(id) {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  }
}

// Usage - no need to await twice
const userData = await remoteApi.fetchUserData(123)
```

## Security Features

### Input Validation

All RPC calls are validated:

```typescript
function assertValidRPCCall(data: unknown): asserts data is sRPCCall {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid RPC call: not an object')
  }
  
  const d = data as any
  if (typeof d.id === 'undefined' || !d.type) {
    throw new Error('Invalid RPC call: missing id or type')
  }
  
  assertValidKeyChain(d.keyChain)
  // ... additional validation
}
```

### Prototype Pollution Protection

Access to dangerous properties is blocked:

```typescript
function assertValidKeyChain(keyChain: unknown): asserts keyChain is string[] {
  if (!Array.isArray(keyChain)) {
    throw new Error('Invalid keyChain: must be an array')
  }
  
  if (keyChain.some(key => 
    typeof key !== 'string' || 
    key.includes('__proto__') || 
    key.includes('prototype') || 
    key.includes('constructor')
  )) {
    throw new Error('Invalid keyChain: contains unsafe property names')
  }
}
```

### Property Access Control

Only own properties are accessible:

```typescript
function assertPropertyExists(obj: any, property: string): void {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`Cannot access property '${property}' on non-object`)
  }
  
  if (!Object.prototype.hasOwnProperty.call(obj, property)) {
    throw new Error(`Property '${property}' not found or not accessible`)
  }
}
```

### Function Type Validation

Ensures call targets are functions:

```typescript
function assertIsFunction(target: unknown, name: string): asserts target is Function {
  if (typeof target !== 'function') {
    throw new Error(`Target '${name}' is not a function`)
  }
}
```

## Error Handling

### Remote Errors

Errors are automatically propagated:

```typescript
// Remote object
const api = {
  riskyOperation() {
    throw new Error('Something went wrong')
  }
}

// Usage
try {
  await remoteApi.riskyOperation()
} catch (error) {
  console.error(error.message) // "Something went wrong"
}
```

### Error Response Format

Error responses follow this format:

```typescript
{
  id: number,
  type: 'error',
  error: string
}
```

## Performance Considerations

### Async Overhead

All remote calls are asynchronous:

```typescript
// Even simple operations require await
const result = await remoteApi.add(1, 2)
```

### Serialization Cost

Arguments and return values are serialized:

```typescript
// Large objects have serialization overhead
const largeData = { /* large object */ }
const result = await remoteApi.processLargeData(largeData)
```

### Object Reference Management

Remote objects create communication channels:

```typescript
// Each remote object gets its own channel
const obj1 = await remoteApi.createObject()
const obj2 = await remoteApi.createObject()
// obj1 and obj2 use separate channels
```

## Best Practices

### Keep Interfaces Simple

```typescript
// Good - simple interface
const api = {
  add(a, b) { return a + b },
  multiply(a, b) { return a * b }
}

// Avoid - complex nested objects
const api = {
  math: {
    arithmetic: {
      basic: {
        add(a, b) { return a + b }
      }
    }
  }
}
```

### Batch Operations

```typescript
// Good - batch multiple operations
const api = {
  processBatch(operations) {
    return operations.map(op => {
      switch (op.type) {
        case 'add': return op.a + op.b
        case 'multiply': return op.a * op.b
      }
    })
  }
}

// Avoid - multiple individual calls
const results = []
for (const op of operations) {
  results.push(await remoteApi.processOperation(op))
}
```

### Error Handling

```typescript
// Always wrap remote calls
try {
  const result = await remoteApi.riskyOperation()
  return result
} catch (error) {
  console.error('Remote operation failed:', error)
  return null
}
```

### Resource Management

```typescript
// Clean up when done
const cleanup = () => {
  // Remove event listeners
  endpoint.removeEventListener('message', messageHandler)
}

// Call cleanup when appropriate
window.addEventListener('beforeunload', cleanup)
```

## TypeScript Support

### Type Safety

Use TypeScript interfaces for type safety:

```typescript
interface RemoteAPI {
  calculate(a: number, b: number): Promise<number>
  fetchData(url: string): Promise<any>
}

const worker = new Worker('worker.js')
const remoteApi: RemoteAPI = wrap(worker)

// TypeScript will enforce types
const result = await remoteApi.calculate(5, 3) // number
```

### Generic Support

Support for generic functions:

```typescript
interface RemoteAPI {
  process<T>(data: T): Promise<T>
}

const result = await remoteApi.process<string>('hello') // string
```

## Next Steps

- See [Remote Object examples](/examples/remote-object)
- Learn about [Remote Objects Guide](/guide/remote-objects)
- Explore [Security features](/guide/core-concepts#security-features)