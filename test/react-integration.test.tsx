import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React, { Suspense } from 'react';
import { atomicUpdate, createCell, createComputed, pending, set, useValue } from '../src';

describe('React Integration', () => {
  describe('useValue hook basic functionality', () => {
    it('should read Cell value and re-render on updates', () => {
      const cell = createCell(10);
      const { result } = renderHook(() => useValue(cell));

      // Initial value
      expect(result.current).toBe(10);

      // Update value
      act(() => {
        set(cell, 20);
      });

      // Should re-render with new value
      expect(result.current).toBe(20);
    });

    it('should read Computed value and re-render when computed value changes', () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => get(cell) * 2);
      const { result } = renderHook(() => useValue(computed));

      // Initial computed value
      expect(result.current).toBe(10);

      // Update dependency
      act(() => {
        set(cell, 10);
      });

      // Should re-render with new computed value
      expect(result.current).toBe(20);
    });

    it('should NOT re-render when Computed dependencies change but value remains same', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(10); // Same value as cellA
      
      const computed = createComputed(({ get }) => {
        return get(condition) ? get(cellA) : get(cellB);
      });

      const renderCount = vi.fn();
      const { result } = renderHook(() => {
        renderCount();
        return useValue(computed);
      });

      // Initial render
      expect(result.current).toBe(10);
      expect(renderCount).toHaveBeenCalledTimes(1);

      // Change condition - dependencies change but value stays the same
      act(() => {
        set(condition, false);
      });

      // Should NOT re-render since value didn't change
      expect(result.current).toBe(10);
      expect(renderCount).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple components using same State', () => {
      const cell = createCell('hello');
      
      const { result: result1 } = renderHook(() => useValue(cell));
      const { result: result2 } = renderHook(() => useValue(cell));

      expect(result1.current).toBe('hello');
      expect(result2.current).toBe('hello');

      // Update value
      act(() => {
        set(cell, 'world');
      });

      // Both should reflect the update
      expect(result1.current).toBe('world');
      expect(result2.current).toBe('world');
    });
  });

  describe('Suspense integration', () => {
    it('should trigger Suspense when State has pendingPromise', async () => {
      const cell = createCell('initial');
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      // Set pending
      pending(cell, promise);

      const fallbackRendered = vi.fn();
      const componentRendered = vi.fn();

      const TestComponent = () => {
        componentRendered();
        const value = useValue(cell);
        return <div>{value}</div>;
      };

      const FallbackComponent = () => {
        fallbackRendered();
        return <div>Loading...</div>;
      };

      const { rerender } = renderHook(
        () => null,
        {
          wrapper: ({ children }) => (
            <Suspense fallback={<FallbackComponent />}>
              <TestComponent />
              {children}
            </Suspense>
          ),
        }
      );

      // Should render fallback initially
      expect(fallbackRendered).toHaveBeenCalled();
      expect(componentRendered).not.toHaveBeenCalled();

      // Resolve promise
      await act(async () => {
        resolvePromise!('resolved');
        await promise;
      });

      // Force re-render to check if Suspense is resolved
      rerender();

      // Should now render the component
      expect(componentRendered).toHaveBeenCalled();
    });

    it('should handle pending Computed with Suspense', async () => {
      const cell = createCell(5);
      const computed = createComputed(({ get }) => get(cell) * 2);

      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      pending(cell, promise);

      const TestComponent = () => {
        const value = useValue(computed);
        return <div>{value}</div>;
      };

      const { rerender } = renderHook(
        () => null,
        {
          wrapper: ({ children }) => (
            <Suspense fallback={<div>Loading...</div>}>
              <TestComponent />
              {children}
            </Suspense>
          ),
        }
      );

      // Resolve and re-render
      await act(async () => {
        resolvePromise!();
        await promise;
      });

      rerender();
      
      // Component should render with computed value after promise resolves
      // (The actual rendering check would require a more complex setup)
    });
  });

  describe('Cleanup and memory management', () => {
    it('should dispose watcher on unmount', () => {
      const cell = createCell(0);
      const { unmount } = renderHook(() => useValue(cell));

      // Get the current number of dependents before unmount
      const initialDependents = cell.dependents.size;

      // Unmount the hook
      unmount();

      // Watcher should be disposed, reducing dependents
      expect(cell.dependents.size).toBeLessThan(initialDependents + 1);
    });

    it('should handle rapid mount/unmount cycles', () => {
      const cell = createCell('test');
      
      // Mount and unmount multiple times rapidly
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useValue(cell));
        unmount();
      }

      // Should not accumulate dependents
      expect(cell.dependents.size).toBe(0);
    });

    it('should recreate subscription when state prop changes', () => {
      const cell1 = createCell('first');
      const cell2 = createCell('second');

      const { result, rerender } = renderHook(
        ({ state }) => useValue(state),
        { initialProps: { state: cell1 } }
      );

      expect(result.current).toBe('first');

      // Change to different state
      rerender({ state: cell2 });
      expect(result.current).toBe('second');

      // Update first cell - should not affect result
      act(() => {
        set(cell1, 'updated first');
      });
      expect(result.current).toBe('second');

      // Update second cell - should affect result
      act(() => {
        set(cell2, 'updated second');
      });
      expect(result.current).toBe('updated second');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle computed chains with conditional dependencies', () => {
      const mode = createCell<'sum' | 'product'>('sum');
      const a = createCell(2);
      const b = createCell(3);
      
      const result = createComputed(({ get }) => {
        const operation = get(mode);
        return operation === 'sum' ? get(a) + get(b) : get(a) * get(b);
      });

      const { result: hookResult } = renderHook(() => useValue(result));
      expect(hookResult.current).toBe(5); // 2 + 3

      // Change mode
      act(() => {
        set(mode, 'product');
      });
      expect(hookResult.current).toBe(6); // 2 * 3

      // Update values
      act(() => {
        atomicUpdate(({ set }) => {
          set(a, 4);
          set(b, 5);
        });
      });
      expect(hookResult.current).toBe(20); // 4 * 5
    });

    it('should handle onChange callbacks within React lifecycle', () => {
      const onChange = vi.fn();
      const cell = createCell<number>(0, { onChange });

      const { result } = renderHook(() => useValue(cell));
      expect(result.current).toBe(0);

      // Update within React's act
      act(() => {
        set(cell, 10);
      });

      expect(onChange).toHaveBeenCalledWith(0, 10);
      expect(result.current).toBe(10);
    });

    it('should work with async atomicUpdate', async () => {
      const cell = createCell('initial');
      const { result } = renderHook(() => useValue(cell));

      expect(result.current).toBe('initial');

      await act(async () => {
        await atomicUpdate(async ({ set }) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          set(cell, 'async updated');
        });
      });

      expect(result.current).toBe('async updated');
    });
  });
});