import { describe, it, expect } from 'vitest'
import { greet, add } from '../../src/index'

describe('greet', () => {
  it('should greet with name', () => {
    expect(greet('World')).toBe('Hello, World!')
  })
})

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})