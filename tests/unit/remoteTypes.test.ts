import { describe, it, expectTypeOf } from 'vitest'
import type { Wrapped } from '../../src/remoteTypes'

describe('Remote Types', () => {
  describe('Wrapped type transformations', () => {
    interface TestService {
      getValue: () => string
      setValue: (value: string) => void
      getAsync: () => Promise<number>
      createUser: new (name: string) => { id: string; name: string }
      config: {
        timeout: number
        retry: () => boolean
      }
      data: string
    }

    it('should transform functions to return promises', () => {
      type WrappedService = Wrapped<TestService>
      
      expectTypeOf<WrappedService['getValue']>().toEqualTypeOf<() => Promise<string>>()
      expectTypeOf<WrappedService['setValue']>().toEqualTypeOf<(value: string) => Promise<void>>()
      expectTypeOf<WrappedService['getAsync']>().toEqualTypeOf<() => Promise<number>>()
    })

    it('should transform constructors to return promises', () => {
      type WrappedService = Wrapped<TestService>
      
      expectTypeOf<WrappedService['createUser']>().toEqualTypeOf<
        new (name: string) => Promise<Wrapped<{ id: string; name: string }>>
      >()
    })

    it('should transform nested objects recursively', () => {
      type WrappedService = Wrapped<TestService>
      
      expectTypeOf<WrappedService['config']['timeout']>().toEqualTypeOf<Promise<number>>()
      expectTypeOf<WrappedService['config']['retry']>().toEqualTypeOf<() => Promise<boolean>>()
    })

    it('should transform primitive properties to promises', () => {
      type WrappedService = Wrapped<TestService>
      
      expectTypeOf<WrappedService['data']>().toEqualTypeOf<Promise<string>>()
    })
  })

  describe('Complex nested scenarios', () => {
    interface DatabaseService {
      connect: () => Promise<void>
      disconnect: () => void
      query: <T>(sql: string, params?: any[]) => Promise<T[]>
      transaction: {
        begin: () => Promise<void>
        commit: () => Promise<void>
        rollback: () => Promise<void>
        execute: (sql: string) => Promise<void>
      }
      models: {
        User: new (data: { name: string; email: string }) => {
          id: string
          save: () => Promise<void>
          delete: () => Promise<boolean>
        }
        Post: new (title: string, content: string) => {
          id: string
          publish: () => void
          addComment: (comment: string) => { id: string; text: string }
        }
      }
      config: {
        connectionString: string
        poolSize: number
        timeout: number
      }
    }

    it('should handle deeply nested complex types', () => {
      type WrappedDatabaseService = Wrapped<DatabaseService>
      
      // Top-level methods
      expectTypeOf<WrappedDatabaseService['connect']>().toEqualTypeOf<() => Promise<void>>()
      expectTypeOf<WrappedDatabaseService['query']>().toEqualTypeOf<
        <T>(sql: string, params?: any[]) => Promise<T[]>
      >()
      
      // Nested transaction methods
      expectTypeOf<WrappedDatabaseService['transaction']['begin']>().toEqualTypeOf<
        () => Promise<void>
      >()
      
      // Nested model constructors
      expectTypeOf<WrappedDatabaseService['models']['User']>().toEqualTypeOf<
        new (data: { name: string; email: string }) => Promise<Wrapped<{
          id: string
          save: () => Promise<void>
          delete: () => Promise<boolean>
        }>>
      >()
      
      // Config primitives
      expectTypeOf<WrappedDatabaseService['config']['connectionString']>().toEqualTypeOf<
        Promise<string>
      >()
    })
  })
})