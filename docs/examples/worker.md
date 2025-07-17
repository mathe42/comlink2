# Worker Communication Examples

Complete examples of Worker thread communication using comlink2.

## Basic Worker Communication

### Simple Calculator Worker

**main.js**
```typescript
import { wrap } from 'comlink2'

const worker = new Worker('calculator-worker.js')
const calc = wrap(worker)

// Use remote calculator
const sum = await calc.add(5, 3) // 8
const product = await calc.multiply(4, 2) // 8
const result = await calc.calculate('2 + 3 * 4') // 14

console.log('Results:', { sum, product, result })
```

**calculator-worker.js**
```typescript
import { expose } from 'comlink2'

const calculator = {
  add(a, b) {
    return a + b
  },
  
  multiply(a, b) {
    return a * b
  },
  
  calculate(expression) {
    // Safe evaluation (in production, use a proper parser)
    return Function(`"use strict"; return (${expression})`)()
  }
}

expose(calculator, self)
```

## Async Operations

### Data Processing Worker

**main.js**
```typescript
import { wrap } from 'comlink2'

const worker = new Worker('data-worker.js')
const dataProcessor = wrap(worker)

const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false },
  { id: 3, name: 'Charlie', active: true }
]

// Process data asynchronously
const activeUsers = await dataProcessor.filterActive(users)
const enrichedUsers = await dataProcessor.enrichUserData(activeUsers)

console.log('Processed users:', enrichedUsers)
```

**data-worker.js**
```typescript
import { expose } from 'comlink2'

const dataProcessor = {
  filterActive(users) {
    return users.filter(user => user.active)
  },
  
  async enrichUserData(users) {
    return Promise.all(users.map(async (user) => {
      // Simulate API call
      const profile = await fetch(`/api/users/${user.id}/profile`)
      const profileData = await profile.json()
      
      return {
        ...user,
        profile: profileData,
        lastSeen: new Date()
      }
    }))
  },
  
  async processLargeDataset(data) {
    // Simulate heavy computation
    return new Promise((resolve) => {
      setTimeout(() => {
        const processed = data.map(item => ({
          ...item,
          processed: true,
          hash: btoa(JSON.stringify(item))
        }))
        resolve(processed)
      }, 1000)
    })
  }
}

expose(dataProcessor, self)
```

## Function Callbacks

### Event Processing with Callbacks

**main.js**
```typescript
import { wrap } from 'comlink2'

const worker = new Worker('event-worker.js')
const eventProcessor = wrap(worker)

const events = [
  { type: 'click', x: 100, y: 200 },
  { type: 'keydown', key: 'Enter' },
  { type: 'scroll', deltaY: 50 }
]

// Process events with callback
const results = await eventProcessor.processEvents(events, (event) => {
  console.log('Processing event:', event.type)
  return {
    processed: true,
    timestamp: Date.now()
  }
})

console.log('Event results:', results)
```

**event-worker.js**
```typescript
import { expose } from 'comlink2'

const eventProcessor = {
  async processEvents(events, callback) {
    const results = []
    
    for (const event of events) {
      // Call the callback function (it's automatically wrapped)
      const processed = await callback(event)
      results.push({
        original: event,
        processed
      })
    }
    
    return results
  },
  
  async batchProcess(items, processor, batchSize = 10) {
    const results = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      )
      results.push(...batchResults)
    }
    
    return results
  }
}

expose(eventProcessor, self)
```

## Object References

### Stateful Objects

**main.js**
```typescript
import { wrap } from 'comlink2'

const worker = new Worker('stateful-worker.js')
const factory = wrap(worker)

// Create remote objects
const counter1 = await factory.createCounter(0)
const counter2 = await factory.createCounter(10)

// Use remote objects
await counter1.increment()
await counter1.increment()
const value1 = await counter1.value // 2

await counter2.decrement()
const value2 = await counter2.value // 9

console.log('Counter values:', { value1, value2 })

// Create complex objects
const calculator = await factory.createCalculator()
await calculator.add(5)
await calculator.multiply(3)
const result = await calculator.result // 15
```

**stateful-worker.js**
```typescript
import { expose } from 'comlink2'

const factory = {
  createCounter(initialValue = 0) {
    let count = initialValue
    
    return {
      increment() {
        count++
        return count
      },
      
      decrement() {
        count--
        return count
      },
      
      reset() {
        count = initialValue
        return count
      },
      
      get value() {
        return count
      }
    }
  },
  
  createCalculator() {
    let value = 0
    
    return {
      add(n) {
        value += n
        return this
      },
      
      subtract(n) {
        value -= n
        return this
      },
      
      multiply(n) {
        value *= n
        return this
      },
      
      divide(n) {
        if (n === 0) throw new Error('Division by zero')
        value /= n
        return this
      },
      
      get result() {
        return value
      },
      
      clear() {
        value = 0
        return this
      }
    }
  }
}

expose(factory, self)
```

## Error Handling

### Robust Error Handling

**main.js**
```typescript
import { wrap } from 'comlink2'

const worker = new Worker('error-worker.js')
const api = wrap(worker)

async function handleOperations() {
  try {
    // This will succeed
    const result1 = await api.safeOperation(5)
    console.log('Safe result:', result1)
    
    // This will throw an error
    const result2 = await api.riskyOperation(-1)
    console.log('Risky result:', result2)
    
  } catch (error) {
    console.error('Operation failed:', error.message)
    
    // Try recovery
    try {
      const recovered = await api.recoverFromError()
      console.log('Recovered:', recovered)
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError.message)
    }
  }
}

handleOperations()
```

**error-worker.js**
```typescript
import { expose } from 'comlink2'

const api = {
  safeOperation(value) {
    if (typeof value !== 'number') {
      throw new Error('Value must be a number')
    }
    return value * 2
  },
  
  riskyOperation(value) {
    if (value < 0) {
      throw new Error('Value must be positive')
    }
    
    // Simulate random failure
    if (Math.random() < 0.5) {
      throw new Error('Random failure occurred')
    }
    
    return value * 3
  },
  
  recoverFromError() {
    return 'Recovery successful'
  },
  
  async asyncOperation(value) {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (value === 'error') {
      throw new Error('Async operation failed')
    }
    
    return `Processed: ${value}`
  }
}

expose(api, self)
```

## Performance Optimization

### Batching Operations

**main.js**
```typescript
import { wrap } from 'comlink2'

const worker = new Worker('batch-worker.js')
const processor = wrap(worker)

const data = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  value: Math.random()
}))

// Bad: Many individual calls
console.time('Individual calls')
const results1 = []
for (const item of data.slice(0, 10)) {
  results1.push(await processor.processItem(item))
}
console.timeEnd('Individual calls')

// Good: Batch processing
console.time('Batch processing')
const results2 = await processor.processBatch(data)
console.timeEnd('Batch processing')

console.log('Results:', results2.length)
```

**batch-worker.js**
```typescript
import { expose } from 'comlink2'

const processor = {
  processItem(item) {
    // Simulate processing
    return {
      ...item,
      processed: true,
      result: item.value * 2
    }
  },
  
  processBatch(items) {
    return items.map(item => this.processItem(item))
  },
  
  async processChunks(items, chunkSize = 100) {
    const results = []
    
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize)
      const chunkResults = chunk.map(item => this.processItem(item))
      results.push(...chunkResults)
      
      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    return results
  }
}

expose(processor, self)
```

## TypeScript Support

### Type-Safe Worker Communication

**types.ts**
```typescript
export interface CalculatorAPI {
  add(a: number, b: number): number
  multiply(a: number, b: number): number
  divide(a: number, b: number): number
}

export interface DataProcessorAPI {
  filterActive<T extends { active: boolean }>(items: T[]): T[]
  processLargeDataset<T>(data: T[]): Promise<(T & { processed: boolean })[]>
}
```

**main.ts**
```typescript
import { wrap } from 'comlink2'
import { CalculatorAPI, DataProcessorAPI } from './types'

const calcWorker = new Worker('calculator-worker.js')
const dataWorker = new Worker('data-worker.js')

const calc = wrap<CalculatorAPI>(calcWorker)
const dataProcessor = wrap<DataProcessorAPI>(dataWorker)

// Type-safe calls
const sum: number = await calc.add(5, 3)
const product: number = await calc.multiply(4, 2)

const users = [
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob', active: false }
]

const activeUsers = await dataProcessor.filterActive(users)
const processed = await dataProcessor.processLargeDataset(activeUsers)
```

## Best Practices

### 1. Worker Lifecycle Management

```typescript
class WorkerManager {
  private workers: Map<string, Worker> = new Map()
  
  createWorker(name: string, script: string) {
    if (this.workers.has(name)) {
      return this.workers.get(name)
    }
    
    const worker = new Worker(script)
    this.workers.set(name, worker)
    return worker
  }
  
  terminateWorker(name: string) {
    const worker = this.workers.get(name)
    if (worker) {
      worker.terminate()
      this.workers.delete(name)
    }
  }
  
  terminateAll() {
    for (const [name, worker] of this.workers) {
      worker.terminate()
    }
    this.workers.clear()
  }
}
```

### 2. Error Boundaries

```typescript
// Worker error boundary
self.addEventListener('error', (event) => {
  console.error('Worker error:', event.error)
  // Report error to main thread
  self.postMessage({
    type: 'error',
    error: event.error.message
  })
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  event.preventDefault()
})
```

### 3. Resource Management

```typescript
// Clean up resources
const api = {
  resources: new Map(),
  
  createResource(id, config) {
    const resource = new SomeResource(config)
    this.resources.set(id, resource)
    return resource
  },
  
  cleanup() {
    for (const [id, resource] of this.resources) {
      resource.dispose()
    }
    this.resources.clear()
  }
}

// Call cleanup on worker termination
self.addEventListener('beforeunload', () => {
  api.cleanup()
})
```

## Next Steps

- See [Remote Object examples](/examples/remote-object)
- Learn about [WebSocket integration](/examples/websocket)
- Explore [Performance best practices](/guide/core-concepts#performance-considerations)