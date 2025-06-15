import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set } from '../src';
import type { Computed } from '../src/state';

describe('Dependency tracking', () => {
  describe('Dependency registration', () => {
    it('should establish dependencies correctly', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));
      
      // Initialize computed by getting its value
      get(computed);
      
      // Check dependencies
      expect(computed.dependencies.size).toBe(2);
      expect(computed.dependencies.has(cell1)).toBe(true);
      expect(computed.dependencies.has(cell2)).toBe(true);
      
      // Check dependents
      expect(cell1.dependents.has(computed)).toBe(true);
      expect(cell2.dependents.has(computed)).toBe(true);
    });

    it('should update dependencies when computation changes', () => {
      const condition = createCell(true);
      const cellA = createCell(10);
      const cellB = createCell(20);
      const computed = createComputed(({ get }) => 
        get(condition) ? get(cellA) : get(cellB)
      );
      
      // Initial state - depends on condition and cellA
      get(computed);
      expect(computed.dependencies.size).toBe(2);
      expect(computed.dependencies.has(condition)).toBe(true);
      expect(computed.dependencies.has(cellA)).toBe(true);
      expect(computed.dependencies.has(cellB)).toBe(false);
      
      // Change condition - now depends on condition and cellB
      set(condition, false);
      get(computed);
      expect(computed.dependencies.size).toBe(2);
      expect(computed.dependencies.has(condition)).toBe(true);
      expect(computed.dependencies.has(cellA)).toBe(false);
      expect(computed.dependencies.has(cellB)).toBe(true);
      
      // Check that cellA no longer has computed as dependent
      expect(cellA.dependents.has(computed)).toBe(false);
      expect(cellB.dependents.has(computed)).toBe(true);
    });

    it('should handle circular dependency detection', () => {
      const cell = createCell(10);
      let computed1: Computed<number>;
      let computed2: Computed<number>;
      
      computed1 = createComputed(({ get }) => {
        // This creates a potential circular dependency
        return get(cell) + (computed2 ? get(computed2) : 0);
      });
      
      computed2 = createComputed(({ get }) => {
        // Accessing computed1 here would create a circular dependency
        // This should be handled gracefully
        return get(computed1) * 2;
      });
      
      // This should throw because of circular dependency
      expect(() => get(computed2)).toThrow('Circular dependency detected');
    });
  });

  describe('Dependency cleanup', () => {
    it('should clean up dependencies when computed is disposed', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));
      
      // Initialize
      get(computed);
      
      // Verify dependencies exist
      expect(cell1.dependents.has(computed)).toBe(true);
      expect(cell2.dependents.has(computed)).toBe(true);
      
      // Dispose computed
      computed[Symbol.dispose]();
      
      // Verify dependencies are cleaned up
      expect(cell1.dependents.has(computed)).toBe(false);
      expect(cell2.dependents.has(computed)).toBe(false);
      expect(computed.dependencies.size).toBe(0);
    });

    it('should not affect other dependents when one is disposed', () => {
      const cell = createCell(10);
      const computed1 = createComputed(({ get }) => get(cell) * 2);
      const computed2 = createComputed(({ get }) => get(cell) * 3);
      
      // Initialize both
      get(computed1);
      get(computed2);
      
      // Verify both are dependents
      expect(cell.dependents.size).toBe(2);
      expect(cell.dependents.has(computed1)).toBe(true);
      expect(cell.dependents.has(computed2)).toBe(true);
      
      // Dispose only computed1
      computed1[Symbol.dispose]();
      
      // Verify computed2 is still a dependent
      expect(cell.dependents.size).toBe(1);
      expect(cell.dependents.has(computed1)).toBe(false);
      expect(cell.dependents.has(computed2)).toBe(true);
    });
  });

  describe('Version tracking', () => {
    it('should track dependency version changes', () => {
      const cell1 = createCell(10);
      const cell2 = createCell(20);
      const computed = createComputed(({ get }) => get(cell1) + get(cell2));
      
      get(computed);
      const initialDepVersion = computed.dependencyVersion;
      
      // Changing dependency structure should update version
      const condition = createCell(true);
      const computedConditional = createComputed(({ get }) => 
        get(condition) ? get(cell1) : get(cell2)
      );
      
      get(computedConditional);
      const condInitialDepVersion = computedConditional.dependencyVersion;
      
      set(condition, false);
      get(computedConditional); // This changes dependencies
      
      expect(computedConditional.dependencyVersion).toBe(condInitialDepVersion + 1);
    });

    it('should not change dependency version when dependencies remain same', () => {
      const cell = createCell(10);
      const computed = createComputed(({ get }) => get(cell) * 2);
      
      get(computed);
      const initialDepVersion = computed.dependencyVersion;
      
      // Update cell value (doesn't change dependency structure)
      set(cell, 20);
      get(computed);
      
      expect(computed.dependencyVersion).toBe(initialDepVersion);
    });
  });
});