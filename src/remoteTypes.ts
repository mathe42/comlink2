/**
 * Type utilities for remote object proxification
 */

export type Wrapped<T = Record<string | symbol, any>> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : T[K] extends new (...args: any[]) => any
    ? new (...args: ConstructorParameters<T[K]>) => Promise<Wrapped<InstanceType<T[K]>>>
    : T[K] extends object
    ? Wrapped<T[K]>
    : Promise<T[K]>
};