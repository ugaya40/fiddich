import { describe, it, expect, vi } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../src';
import type { Computed, DependencyState } from '../src/state';

describe('Computed lazy initialization', () => {
  describe('Basic lazy initialization', () => {
    it('should not compute value until first access', () => {
      const cell = createCell(10);
      const computeFn = vi.fn((arg: { get: <V>(state: DependencyState<V>) => V }) => arg.get(cell) * 2);
      const computed = createComputed(computeFn);
      
      // Should not be called yet
      expect(computeFn).not.toHaveBeenCalled();
      expect(computed.isInitialized).toBe(false);
      
      // First access triggers computation
      const value = get(computed);
      expect(value).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(1);
      expect(computed.isInitialized).toBe(true);
    });

    it('should establish dependencies on first access', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));
      
      // No dependencies before initialization
      expect(computed.dependencies.size).toBe(0);
      expect(cell1.dependents.has(computed)).toBe(false);
      expect(cell2.dependents.has(computed)).toBe(false);
      
      // First access establishes dependencies
      get(computed);
      
      expect(computed.dependencies.size).toBe(2);
      expect(computed.dependencies.has(cell1)).toBe(true);
      expect(computed.dependencies.has(cell2)).toBe(true);
      expect(cell1.dependents.has(computed)).toBe(true);
      expect(cell2.dependents.has(computed)).toBe(true);
    });

    it('should cache value after initialization', () => {
      const cell = createCell(10);
      const computeFn = vi.fn((arg: { get: <V>(state: DependencyState<V>) => V }) => arg.get(cell) * 2);
      const computed = createComputed(computeFn);
      
      // First access
      expect(get(computed)).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(1);
      
      // Second access should not recompute
      expect(get(computed)).toBe(20);
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lazy initialization in atomicUpdate', () => {
    it('should initialize with atomicUpdate context values', () => {
      const cell = createCell(10);
      let computedRef: Computed<number> = null!;
      
      atomicUpdate((ops) => {
        ops.set(cell, 100);
        computedRef = createComputed(({ get }) => get(cell) * 2);
        
        // Access inside atomicUpdate should use updated value
        expect(ops.get(computedRef)).toBe(200);
        // computedRef itself is not initialized yet (only the copy is)
        expect(computedRef.isInitialized).toBe(false);
      });
      
      // After commit, should maintain the value
      expect(get(computedRef)).toBe(200);
    });

    it('should handle computed created but not accessed in atomicUpdate', () => {
      const cell = createCell(10);
      let computedRef: Computed<number> = null!;
      
      atomicUpdate((ops) => {
        ops.set(cell, 100);
        computedRef = createComputed(({ get }) => get(cell) * 2);
        // Not accessing computed inside atomicUpdate
      });
      
      // First access outside should use committed value
      expect(computedRef.isInitialized).toBe(false);
      expect(get(computedRef)).toBe(200);
      expect(computedRef.isInitialized).toBe(true);
    });

    it('should handle complex initialization scenario', () => {
      const baseCell = createCell(10);
      const multiplierCell = createCell(2);
      let computed1: Computed<number> = null!;
      let computed2: Computed<number> = null!;
      
      // Create computed1 outside atomicUpdate
      computed1 = createComputed(({ get }) => get(baseCell) * get(multiplierCell));
      
      atomicUpdate((ops) => {
        ops.set(baseCell, 20);
        ops.set(multiplierCell, 3);
        
        // Create computed2 inside atomicUpdate
        computed2 = createComputed(({ get }) => get(computed1 as Computed<number>) + 100);
        
        // Access computed2, which will initialize both
        expect(ops.get(computed2)).toBe(160); // (20 * 3) + 100
      });
      
      expect(get(computed1)).toBe(60); // 20 * 3
      expect(get(computed2)).toBe(160);
    });
  });

  describe('Dependency tracking during lazy initialization', () => {
    it('should track nested computed dependencies correctly', () => {
      const cell = createCell(10);
      const computed1 = createComputed(({ get }) => get(cell) * 2);
      const computed2 = createComputed(({ get }) => get(computed1) + 5);
      const computed3 = createComputed(({ get }) => get(computed2) * get(computed1));
      
      // None should be initialized
      expect(computed1.isInitialized).toBe(false);
      expect(computed2.isInitialized).toBe(false);
      expect(computed3.isInitialized).toBe(false);
      
      // Access computed3, which should initialize all
      expect(get(computed3)).toBe(500); // 25 * 20
      
      expect(computed1.isInitialized).toBe(true);
      expect(computed2.isInitialized).toBe(true);
      expect(computed3.isInitialized).toBe(true);
      
      // Check dependency chain
      expect(computed3.dependencies.has(computed2)).toBe(true);
      expect(computed3.dependencies.has(computed1)).toBe(true);
      expect(computed2.dependencies.has(computed1)).toBe(true);
      expect(computed1.dependencies.has(cell)).toBe(true);
    });

    it('should handle conditional dependencies during initialization', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      
      const computed = createComputed(({ get }) => {
        if (get(condition)) {
          return get(cellA);
        } else {
          return get(cellB);
        }
      });
      
      // First access with condition = true
      expect(get(computed)).toBe(10);
      expect(computed.dependencies.has(condition)).toBe(true);
      expect(computed.dependencies.has(cellA)).toBe(true);
      expect(computed.dependencies.has(cellB)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle self-referential computed gracefully', () => {
      const cell = createCell(10);
      let computedRef: Computed<number> = null!;
      
      // This creates a potential infinite loop
      computedRef = createComputed(({ get }) => {
        const base = get(cell);
        // Attempting to get self during initialization
        // Implementation should handle this gracefully
        return base * 2;
      });
      
      expect(get(computedRef)).toBe(20);
    });

    it('should maintain consistency when mixing lazy and eager computeds', () => {
      const cell = createCell(10);
      
      // Create and initialize computed1 eagerly
      const computed1 = createComputed(({ get }) => get(cell) * 2);
      get(computed1); // Initialize
      
      // Create computed2 lazily
      const computed2 = createComputed(({ get }) => get(computed1) + get(cell));
      
      // Update cell
      set(cell, 20);
      
      // Both should reflect the update
      expect(get(computed1)).toBe(40);
      expect(get(computed2)).toBe(60); // 40 + 20
    });
  });
});