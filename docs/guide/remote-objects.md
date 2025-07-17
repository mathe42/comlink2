# Remote Objects

The Remote Object API provides a high-level interface for cross-realm object manipulation using RPC (Remote Procedure Call).

## Basic Usage

### Exposing Objects

Use `expose()` to make an object available remotely:

```typescript
import { expose } from 'comlink2'

const api = {
  add(a: number, b: number) {
    return a + b
  },
  
  async fetchUser(id: string) {
    const response = await fetch(`/api/users/${id}`)
    return response.json()
  },
  
  createCounter() {
    let count = 0
    return {
      increment() { return ++count },
      get value() { return count }
    }
  }
}

// Expose in worker
expose(api, self)
```

### Wrapping Remote Objects

Use `wrap()` to create a proxy for remote objects:

```typescript
import { wrap } from 'comlink2'

const worker = new Worker('worker.js')
const remoteApi = wrap(worker)

// All methods return promises
const sum = await remoteApi.add(5, 3) // 8
const user = await remoteApi.fetchUser('123')
const counter = await remoteApi.createCounter()
const count = await counter.increment() // 1
```

## Advanced Features

### Function Arguments

Functions can be passed as arguments and will be automatically wrapped:

```typescript
// Remote object
const api = {
  processData(data: any[], callback: (item: any) => any) {
    return data.map(callback)
  }
}

// Usage
const result = await remoteApi.processData(
  [1, 2, 3], 
  (x) => x * 2
) // [2, 4, 6]
```

### Object References

Objects with functions are automatically wrapped and can be used remotely:

```typescript
// Remote object
const api = {
  createCalculator() {
    return {
      add(a: number, b: number) { return a + b },
      multiply(a: number, b: number) { return a * b }
    }
  }
}

// Usage
const calc = await remoteApi.createCalculator()
const sum = await calc.add(5, 3) // 8
const product = await calc.multiply(4, 7) // 28
```

### Constructors

Remote constructors are supported:

```typescript
// Remote object
class Counter {
  private count = 0
  
  increment() {
    return ++this.count
  }
  
  get value() {
    return this.count
  }
}

const api = { Counter }
expose(api, self)

// Usage
const CounterClass = remoteApi.Counter
const counter = await new CounterClass()
const value = await counter.increment() // 1
```

## Error Handling

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

## Security

The Remote Object API includes several security features:

- **Input validation** - All RPC calls are validated
- **Prototype pollution protection** - Access to `__proto__`, `prototype`, and `constructor` is blocked
- **Safe property access** - Only own properties are accessible
- **Function type validation** - Ensures targets are functions before calling

## Performance Considerations

- **Async overhead** - All remote calls are asynchronous
- **Serialization** - Arguments and return values are serialized/deserialized
- **Object references** - Objects with functions create new communication channels

## Best Practices

1. **Keep interfaces simple** - Complex object graphs can be expensive
2. **Batch operations** - Group multiple calls when possible
3. **Handle errors** - Always wrap remote calls in try/catch
4. **Clean up resources** - Remove event listeners when done

## Next Steps

- See [Remote Object Examples](/examples/remote-object)
- Learn about [Web API Adapters](/guide/web-api-adapters)
- Explore [API Reference](/api/remote-object)