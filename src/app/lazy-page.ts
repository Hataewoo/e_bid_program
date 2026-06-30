import { lazy, type ComponentType } from 'react';

export function lazyPage<T extends Record<string, ComponentType<object>>, K extends keyof T>(
  factory: () => Promise<T>,
  exportName: K,
) {
  return lazy(() =>
    factory().then((module) => ({
      default: module[exportName] as ComponentType<object>,
    })),
  );
}
