# Remote Object RPC Examples

Advanced examples of using the Remote Object API for cross-realm communication.

## Basic RPC Patterns

### Simple Method Calls

**worker.js**
```typescript
import { expose } from 'objex'

const mathAPI = {
  add(a, b) {
    return a + b
  },
  
  multiply(a, b) {
    return a * b
  },
  
  factorial(n) {
    if (n <= 1) return 1
    return n * this.factorial(n - 1)
  },
  
  async asyncCalculation(value) {
    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, 100))
    return value * 2
  }
}

expose(mathAPI, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const math = wrap(worker)

// All calls return promises
const sum = await math.add(5, 3) // 8
const product = await math.multiply(4, 6) // 24
const fact = await math.factorial(5) // 120
const async_result = await math.asyncCalculation(10) // 20

console.log({ sum, product, fact, async_result })
```

### Object Properties and Getters

**worker.js**
```typescript
import { expose } from 'objex'

class Counter {
  constructor(initialValue = 0) {
    this._value = initialValue
  }
  
  increment() {
    this._value++
    return this._value
  }
  
  decrement() {
    this._value--
    return this._value
  }
  
  get value() {
    return this._value
  }
  
  set value(newValue) {
    this._value = newValue
  }
  
  reset() {
    this._value = 0
  }
}

const api = {
  createCounter(initial) {
    return new Counter(initial)
  },
  
  config: {
    version: '1.0.0',
    author: 'Developer'
  }
}

expose(api, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const api = wrap(worker)

// Create remote object
const counter = await api.createCounter(10)

// Use remote object methods
await counter.increment() // 11
await counter.increment() // 12
const value = await counter.value // 12

// Set property
await counter.setValue(20)
const newValue = await counter.value // 20

// Access nested properties
const version = await api.config.version // '1.0.0'
```

## Function Arguments and Callbacks

### Callback Functions

**worker.js**
```typescript
import { expose } from 'objex'

const dataProcessor = {
  processArray(items, callback) {
    return items.map(item => callback(item))
  },
  
  async processAsyncArray(items, asyncCallback) {
    const results = []
    for (const item of items) {
      const result = await asyncCallback(item)
      results.push(result)
    }
    return results
  },
  
  filter(items, predicate) {
    return items.filter(predicate)
  },
  
  reduce(items, reducer, initialValue) {
    return items.reduce(reducer, initialValue)
  }
}

expose(dataProcessor, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const processor = wrap(worker)

const numbers = [1, 2, 3, 4, 5]

// Process with callback
const doubled = await processor.processArray(numbers, (x) => x * 2)
console.log('Doubled:', doubled) // [2, 4, 6, 8, 10]

// Async callback
const asyncResults = await processor.processAsyncArray(numbers, async (x) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 10))
  return x * x
})
console.log('Squared:', asyncResults) // [1, 4, 9, 16, 25]

// Filter with predicate
const evens = await processor.filter(numbers, (x) => x % 2 === 0)
console.log('Evens:', evens) // [2, 4]

// Reduce with reducer
const sum = await processor.reduce(numbers, (acc, x) => acc + x, 0)
console.log('Sum:', sum) // 15
```

### Object Arguments

**worker.js**
```typescript
import { expose } from 'objex'

const serviceAPI = {
  processUser(user, actions) {
    const result = {
      id: user.id,
      name: user.name,
      processed: true
    }
    
    // Call methods on the passed object
    if (actions.validate) {
      result.isValid = actions.validate(user)
    }
    
    if (actions.transform) {
      result.transformed = actions.transform(user)
    }
    
    return result
  },
  
  async saveData(data, storage) {
    // Use the storage object
    await storage.save(data.id, data)
    const saved = await storage.get(data.id)
    return saved
  }
}

expose(serviceAPI, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const service = wrap(worker)

const user = { id: 1, name: 'Alice', email: 'alice@example.com' }

// Pass object with methods
const actions = {
  validate: (user) => user.email.includes('@'),
  transform: (user) => ({ ...user, displayName: user.name.toUpperCase() })
}

const result = await service.processUser(user, actions)
console.log('Processed user:', result)

// Pass storage object
const storage = {
  data: new Map(),
  
  async save(id, data) {
    this.data.set(id, data)
    return { success: true, id }
  },
  
  async get(id) {
    return this.data.get(id)
  }
}

const saveResult = await service.saveData(user, storage)
console.log('Saved data:', saveResult)
```

## Constructor Support

### Remote Classes

**worker.js**
```typescript
import { expose } from 'objex'

class Calculator {
  constructor(initialValue = 0) {
    this.value = initialValue
    this.history = []
  }
  
  add(n) {
    this.value += n
    this.history.push(`+${n}`)
    return this
  }
  
  subtract(n) {
    this.value -= n
    this.history.push(`-${n}`)
    return this
  }
  
  multiply(n) {
    this.value *= n
    this.history.push(`*${n}`)
    return this
  }
  
  divide(n) {
    if (n === 0) throw new Error('Division by zero')
    this.value /= n
    this.history.push(`/${n}`)
    return this
  }
  
  get result() {
    return this.value
  }
  
  getHistory() {
    return this.history.slice()
  }
  
  clear() {
    this.value = 0
    this.history = []
    return this
  }
}

class TaskManager {
  constructor() {
    this.tasks = new Map()
    this.nextId = 1
  }
  
  addTask(title, description) {
    const task = {
      id: this.nextId++,
      title,
      description,
      completed: false,
      created: new Date().toISOString()
    }
    this.tasks.set(task.id, task)
    return task
  }
  
  completeTask(id) {
    const task = this.tasks.get(id)
    if (task) {
      task.completed = true
      task.completedAt = new Date().toISOString()
    }
    return task
  }
  
  getAllTasks() {
    return Array.from(this.tasks.values())
  }
  
  removeTask(id) {
    return this.tasks.delete(id)
  }
}

const api = {
  Calculator,
  TaskManager,
  
  createCalculator(initial) {
    return new Calculator(initial)
  },
  
  createTaskManager() {
    return new TaskManager()
  }
}

expose(api, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const api = wrap(worker)

// Use constructor directly
const CalcClass = api.Calculator
const calc1 = await new CalcClass(100)

// Chain method calls
await calc1.add(10).multiply(2).subtract(5)
const result1 = await calc1.result // 215
const history1 = await calc1.getHistory()

console.log('Calculator 1:', { result: result1, history: history1 })

// Create via factory method
const calc2 = await api.createCalculator(50)
await calc2.divide(2).add(25)
const result2 = await calc2.result // 50

console.log('Calculator 2:', { result: result2 })

// Use TaskManager
const TaskManagerClass = api.TaskManager
const taskManager = await new TaskManagerClass()

const task1 = await taskManager.addTask('Learn objex', 'Study the documentation')
const task2 = await taskManager.addTask('Build app', 'Create the application')

await taskManager.completeTask(task1.id)

const allTasks = await taskManager.getAllTasks()
console.log('All tasks:', allTasks)
```

## Error Handling

### Remote Error Propagation

**worker.js**
```typescript
import { expose } from 'objex'

class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

const userService = {
  validateUser(user) {
    if (!user.email) {
      throw new ValidationError('Email is required', 'email')
    }
    
    if (!user.email.includes('@')) {
      throw new ValidationError('Invalid email format', 'email')
    }
    
    if (!user.name || user.name.length < 2) {
      throw new ValidationError('Name must be at least 2 characters', 'name')
    }
    
    return { valid: true, user }
  },
  
  async saveUser(user) {
    // Simulate network error
    if (Math.random() < 0.3) {
      throw new Error('Network error: Could not save user')
    }
    
    // Simulate validation error
    if (user.email === 'invalid@test.com') {
      throw new ValidationError('Email is blacklisted', 'email')
    }
    
    return { id: Date.now(), ...user, saved: true }
  },
  
  async riskyOperation() {
    const operations = [
      () => { throw new Error('Operation failed') },
      () => { throw new ValidationError('Invalid input', 'data') },
      () => { return 'Success' }
    ]
    
    const operation = operations[Math.floor(Math.random() * operations.length)]
    return operation()
  }
}

expose(userService, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const userService = wrap(worker)

async function handleUserOperations() {
  const users = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'B', email: 'bob@example.com' }, // Invalid name
    { name: 'Charlie', email: 'charlie' }, // Invalid email
    { name: 'David', email: 'invalid@test.com' } // Blacklisted
  ]
  
  for (const user of users) {
    try {
      // Validate user
      const validation = await userService.validateUser(user)
      console.log('Validation passed:', validation)
      
      // Save user
      const saved = await userService.saveUser(user)
      console.log('User saved:', saved)
      
    } catch (error) {
      console.error('Error processing user:', {
        name: user.name,
        error: error.message,
        type: error.name
      })
    }
  }
}

async function handleRiskyOperations() {
  for (let i = 0; i < 5; i++) {
    try {
      const result = await userService.riskyOperation()
      console.log('Operation succeeded:', result)
    } catch (error) {
      console.error('Operation failed:', error.message)
    }
  }
}

// Run the examples
await handleUserOperations()
await handleRiskyOperations()
```

## Performance Optimization

### Batching and Caching

**worker.js**
```typescript
import { expose } from 'objex'

class DataService {
  constructor() {
    this.cache = new Map()
    this.batchQueue = []
    this.batchTimer = null
  }
  
  // Individual calls (less efficient)
  async fetchUserData(userId) {
    if (this.cache.has(userId)) {
      return this.cache.get(userId)
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50))
    const userData = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      fetchedAt: Date.now()
    }
    
    this.cache.set(userId, userData)
    return userData
  }
  
  // Batch processing (more efficient)
  async batchFetchUsers(userIds) {
    const results = []
    const uncachedIds = []
    
    // Check cache first
    for (const id of userIds) {
      const cached = this.cache.get(id)
      if (cached) {
        results.push(cached)
      } else {
        uncachedIds.push(id)
      }
    }
    
    // Fetch uncached data
    if (uncachedIds.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate API call
      
      for (const id of uncachedIds) {
        const userData = {
          id,
          name: `User ${id}`,
          email: `user${id}@example.com`,
          fetchedAt: Date.now()
        }
        
        this.cache.set(id, userData)
        results.push(userData)
      }
    }
    
    return results
  }
  
  // Auto-batching
  async fetchUserDataAutoBatch(userId) {
    return new Promise((resolve) => {
      this.batchQueue.push({ userId, resolve })
      
      if (this.batchTimer) {
        clearTimeout(this.batchTimer)
      }
      
      this.batchTimer = setTimeout(() => {
        this.processBatch()
      }, 10) // 10ms batching window
    })
  }
  
  async processBatch() {
    const batch = this.batchQueue.splice(0)
    if (batch.length === 0) return
    
    const userIds = batch.map(item => item.userId)
    const users = await this.batchFetchUsers(userIds)
    
    // Resolve all promises
    batch.forEach((item, index) => {
      item.resolve(users[index])
    })
  }
  
  // Bulk operations
  async bulkUpdateUsers(updates) {
    const results = []
    
    for (const update of updates) {
      const cached = this.cache.get(update.id)
      if (cached) {
        const updated = { ...cached, ...update.data, updatedAt: Date.now() }
        this.cache.set(update.id, updated)
        results.push(updated)
      }
    }
    
    return results
  }
  
  clearCache() {
    this.cache.clear()
    return { cleared: true, timestamp: Date.now() }
  }
}

expose(new DataService(), self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const dataService = wrap(worker)

async function demonstratePerformance() {
  const userIds = Array.from({ length: 20 }, (_, i) => i + 1)
  
  console.log('=== Individual Calls (Inefficient) ===')
  console.time('Individual calls')
  
  const individualResults = []
  for (const userId of userIds) {
    const user = await dataService.fetchUserData(userId)
    individualResults.push(user)
  }
  
  console.timeEnd('Individual calls')
  console.log('Fetched users:', individualResults.length)
  
  // Clear cache for fair comparison
  await dataService.clearCache()
  
  console.log('\n=== Batch Processing (Efficient) ===')
  console.time('Batch processing')
  
  const batchResults = await dataService.batchFetchUsers(userIds)
  
  console.timeEnd('Batch processing')
  console.log('Fetched users:', batchResults.length)
  
  // Clear cache for auto-batch demo
  await dataService.clearCache()
  
  console.log('\n=== Auto-batching ===')
  console.time('Auto-batching')
  
  const autoBatchPromises = userIds.map(id => 
    dataService.fetchUserDataAutoBatch(id)
  )
  const autoBatchResults = await Promise.all(autoBatchPromises)
  
  console.timeEnd('Auto-batching')
  console.log('Fetched users:', autoBatchResults.length)
  
  // Bulk updates
  console.log('\n=== Bulk Updates ===')
  const updates = userIds.slice(0, 5).map(id => ({
    id,
    data: { status: 'active', lastSeen: Date.now() }
  }))
  
  const updateResults = await dataService.bulkUpdateUsers(updates)
  console.log('Updated users:', updateResults.length)
}

demonstratePerformance()
```

## Advanced Patterns

### Proxy Chains and Nested Objects

**worker.js**
```typescript
import { expose } from 'objex'

class DatabaseService {
  constructor() {
    this.collections = new Map()
  }
  
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Collection(name))
    }
    return this.collections.get(name)
  }
  
  getStats() {
    return {
      collections: this.collections.size,
      totalDocuments: Array.from(this.collections.values())
        .reduce((sum, col) => sum + col.count(), 0)
    }
  }
}

class Collection {
  constructor(name) {
    this.name = name
    this.documents = new Map()
    this.nextId = 1
  }
  
  insert(doc) {
    const id = this.nextId++
    const document = { id, ...doc, createdAt: Date.now() }
    this.documents.set(id, document)
    return document
  }
  
  find(query = {}) {
    const results = []
    for (const doc of this.documents.values()) {
      if (this.matchesQuery(doc, query)) {
        results.push(doc)
      }
    }
    return results
  }
  
  findById(id) {
    return this.documents.get(id)
  }
  
  update(id, updates) {
    const doc = this.documents.get(id)
    if (doc) {
      const updated = { ...doc, ...updates, updatedAt: Date.now() }
      this.documents.set(id, updated)
      return updated
    }
    return null
  }
  
  delete(id) {
    return this.documents.delete(id)
  }
  
  count() {
    return this.documents.size
  }
  
  matchesQuery(doc, query) {
    return Object.entries(query).every(([key, value]) => doc[key] === value)
  }
}

const db = new DatabaseService()
expose(db, self)
```

**main.js**
```typescript
import { wrap } from 'objex'

const worker = new Worker('worker.js')
const db = wrap(worker)

async function demonstrateNestedObjects() {
  // Get collection (returns remote object)
  const users = await db.collection('users')
  const posts = await db.collection('posts')
  
  // Insert documents
  const user1 = await users.insert({ name: 'Alice', email: 'alice@example.com' })
  const user2 = await users.insert({ name: 'Bob', email: 'bob@example.com' })
  
  console.log('Inserted users:', { user1, user2 })
  
  // Insert posts
  const post1 = await posts.insert({ 
    title: 'Hello World', 
    content: 'First post', 
    userId: user1.id 
  })
  const post2 = await posts.insert({ 
    title: 'Learning objex', 
    content: 'Remote objects are cool', 
    userId: user1.id 
  })
  
  console.log('Inserted posts:', { post1, post2 })
  
  // Query data
  const allUsers = await users.find()
  const alicePosts = await posts.find({ userId: user1.id })
  
  console.log('All users:', allUsers)
  console.log('Alice posts:', alicePosts)
  
  // Update documents
  const updatedUser = await users.update(user1.id, { status: 'active' })
  console.log('Updated user:', updatedUser)
  
  // Get database stats
  const stats = await db.getStats()
  console.log('Database stats:', stats)
}

demonstrateNestedObjects()
```

## Best Practices

### 1. Interface Design

```typescript
// Good - Simple, focused interfaces
interface UserService {
  createUser(userData: UserData): Promise<User>
  getUserById(id: string): Promise<User>
  updateUser(id: string, updates: Partial<UserData>): Promise<User>
  deleteUser(id: string): Promise<boolean>
}

// Avoid - Overly complex nested structures
interface BadAPI {
  user: {
    management: {
      creation: {
        service: {
          create(data: any): Promise<any>
        }
      }
    }
  }
}
```

### 2. Error Handling

```typescript
// Good - Structured error handling
class APIError extends Error {
  constructor(message, code, details) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.details = details
  }
}

const api = {
  async processData(data) {
    try {
      return await this.internalProcess(data)
    } catch (error) {
      throw new APIError(
        'Data processing failed',
        'PROCESS_ERROR',
        { originalError: error.message }
      )
    }
  }
}
```

### 3. Performance Optimization

```typescript
// Good - Batch operations
const api = {
  async processItems(items) {
    return this.batchProcess(items)
  }
}

// Avoid - Many individual calls
const results = []
for (const item of items) {
  results.push(await remoteApi.processItem(item))
}
```

### 4. Resource Management

```typescript
// Good - Cleanup methods
class ResourceManager {
  constructor() {
    this.resources = new Map()
  }
  
  createResource(id, config) {
    const resource = new Resource(config)
    this.resources.set(id, resource)
    return resource
  }
  
  cleanup() {
    for (const [id, resource] of this.resources) {
      resource.dispose()
    }
    this.resources.clear()
  }
}
```

## Next Steps

- See [Worker Communication examples](/examples/worker)
- Learn about [Performance optimization](/guide/core-concepts#performance-considerations)
- Explore [TypeScript support](/api/types)