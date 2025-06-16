import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../src';

describe('Diamond Dependency Pattern', () => {
  describe('Non-atomicUpdate environment', () => {
    it('should compute leaf node twice in diamond pattern', () => {
      let leftCount = 0;
      let rightCount = 0;
      let bottomCount = 0;

      const root = createCell(10);
      
      const left = createComputed(({ get }) => {
        leftCount++;
        console.log(`left computed: count=${leftCount}`);
        return get(root) * 2;
      });
      
      const right = createComputed(({ get }) => {
        rightCount++;
        console.log(`right computed: count=${rightCount}`);
        return get(root) * 3;
      });
      
      const bottom = createComputed(({ get }) => {
        bottomCount++;
        console.log(`bottom computed: count=${bottomCount}, getting left and right`);
        const l = get(left);
        const r = get(right);
        console.log(`bottom computed: left=${l}, right=${r}`);
        return l + r;
      });

      // Initial computation
      console.log('\n=== Initial get(bottom) ===');
      expect(get(bottom)).toBe(50);
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(1);
      expect(bottomCount).toBe(1);

      // Update root without atomicUpdate
      console.log('\n=== set(root, 20) - NO atomicUpdate ===');
      set(root, 20);
      
      expect(get(bottom)).toBe(100);
      
      console.log(`\nFinal counts: left=${leftCount}, right=${rightCount}, bottom=${bottomCount}`);
      
      // In non-atomic environment, bottom might be computed twice
      // Once when left changes, once when right changes
      expect(leftCount).toBe(2);
      expect(rightCount).toBe(2);
      expect(bottomCount).toBe(2); // This might be 3 if computed twice
    });
  });

  describe('atomicUpdate environment', () => {
    it('should compute each node only once in diamond pattern', () => {
      let rootCount = 0;
      let leftCount = 0;
      let rightCount = 0;
      let bottomCount = 0;

      const root = createCell(10);
      
      const left = createComputed(({ get }) => {
        leftCount++;
        console.log(`left computed: count=${leftCount}`);
        return get(root) * 2;
      });
      
      const right = createComputed(({ get }) => {
        rightCount++;
        console.log(`right computed: count=${rightCount}`);
        return get(root) * 3;
      });
      
      const bottom = createComputed(({ get }) => {
        bottomCount++;
        console.log(`bottom computed: count=${bottomCount}, getting left and right`);
        const l = get(left);
        const r = get(right);
        console.log(`bottom computed: left=${l}, right=${r}`);
        return l + r;
      });

      // Initial computation
      console.log('\n=== Initial get(bottom) ===');
      expect(get(bottom)).toBe(50);
      expect(leftCount).toBe(1);
      expect(rightCount).toBe(1);
      expect(bottomCount).toBe(1);

      // Update root WITH atomicUpdate
      console.log('\n=== atomicUpdate set(root, 20) ===');
      atomicUpdate(({ set }) => {
        set(root, 20);
      });
      
      console.log('\n=== get(bottom) after atomicUpdate ===');
      expect(get(bottom)).toBe(100);
      
      console.log(`\nFinal counts: left=${leftCount}, right=${rightCount}, bottom=${bottomCount}`);
      
      // In atomic environment, bottom should be computed only once after both dependencies update
      expect(leftCount).toBe(2);
      expect(rightCount).toBe(2);
      expect(bottomCount).toBe(2); // Initial + one update
    });
  });

  describe('Detailed execution flow', () => {
    it('should show the difference in execution order', () => {
      const executionLog: string[] = [];
      
      const root = createCell(10);
      
      const left = createComputed(({ get }) => {
        executionLog.push('left:start');
        const value = get(root) * 2;
        executionLog.push(`left:end(${value})`);
        return value;
      });
      
      const right = createComputed(({ get }) => {
        executionLog.push('right:start');
        const value = get(root) * 3;
        executionLog.push(`right:end(${value})`);
        return value;
      });
      
      const bottom = createComputed(({ get }) => {
        executionLog.push('bottom:start');
        const l = get(left);
        executionLog.push(`bottom:got-left(${l})`);
        const r = get(right);
        executionLog.push(`bottom:got-right(${r})`);
        const result = l + r;
        executionLog.push(`bottom:end(${result})`);
        return result;
      });

      // Initial
      get(bottom);
      executionLog.length = 0; // Clear initial logs

      // Non-atomic update
      console.log('\n=== Non-atomic execution ===');
      set(root, 20);
      get(bottom);
      console.log('Execution order:', executionLog);
      
      // Reset
      set(root, 10);
      get(bottom);
      executionLog.length = 0;

      // Atomic update
      console.log('\n=== Atomic execution ===');
      atomicUpdate(({ set }) => {
        set(root, 20);
      });
      get(bottom);
      console.log('Execution order:', executionLog);
    });
  });
});