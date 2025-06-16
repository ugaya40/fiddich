import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../src';

describe('Diamond Dependency Glitch Test', () => {
  it('should demonstrate potential glitch in separate set operations', () => {
    let bottomCount = 0;
    const bottomValues: number[] = [];

    const a = createCell(1);
    const b = createCell(1);
    
    const left = createComputed(({ get }) => get(a) + get(b));
    const right = createComputed(({ get }) => get(a) * get(b));
    
    const bottom = createComputed(({ get }) => {
      bottomCount++;
      const value = get(left) + get(right);
      bottomValues.push(value);
      console.log(`bottom computed: count=${bottomCount}, left=${get(left)}, right=${get(right)}, result=${value}`);
      return value;
    });

    // Initial
    console.log('\n=== Initial ===');
    expect(get(bottom)).toBe(3); // (1+1) + (1*1) = 2 + 1 = 3
    
    bottomCount = 0;
    bottomValues.length = 0;

    // Two separate set operations
    console.log('\n=== Two separate sets ===');
    set(a, 2);
    console.log('After set(a, 2):');
    get(bottom);
    
    set(b, 3);
    console.log('After set(b, 3):');
    get(bottom);
    
    console.log(`Bottom computed ${bottomCount} times`);
    console.log('Values seen by bottom:', bottomValues);
    
    // Reset
    set(a, 1);
    set(b, 1);
    get(bottom);
    
    bottomCount = 0;
    bottomValues.length = 0;

    // AtomicUpdate
    console.log('\n=== AtomicUpdate ===');
    atomicUpdate(({ set }) => {
      set(a, 2);
      set(b, 3);
    });
    get(bottom);
    
    console.log(`Bottom computed ${bottomCount} times`);
    console.log('Values seen by bottom:', bottomValues);
  });

  it('should show intermediate inconsistent state', () => {
    const log: string[] = [];
    
    const x = createCell(1);
    const y = createCell(1);
    
    // Invariant: sum should always equal product for our values
    const sum = createComputed(({ get }) => {
      const result = get(x) + get(y);
      log.push(`sum: ${get(x)} + ${get(y)} = ${result}`);
      return result;
    });
    
    const product = createComputed(({ get }) => {
      const result = get(x) * get(y);
      log.push(`product: ${get(x)} * ${get(y)} = ${result}`);
      return result;
    });
    
    const checker = createComputed(({ get }) => {
      const s = get(sum);
      const p = get(product);
      const isValid = s === p;
      log.push(`checker: sum=${s}, product=${p}, valid=${isValid}`);
      return isValid;
    });

    // Initial state: 1+1 = 2, 1*1 = 1, not equal
    get(checker);
    log.length = 0;

    console.log('\n=== Separate sets (potential glitch) ===');
    // Try to maintain invariant: x=2, y=2 → 2+2=4, 2*2=4
    set(x, 2);
    console.log('After set(x, 2):', log);
    log.length = 0;
    
    set(y, 2);
    console.log('After set(y, 2):', log);
    log.length = 0;
    
    console.log('Final state valid?', get(checker));
    log.length = 0;

    // Reset
    set(x, 1);
    set(y, 1);
    
    console.log('\n=== AtomicUpdate (no glitch) ===');
    atomicUpdate(({ set }) => {
      set(x, 2);
      set(y, 2);
    });
    console.log('After atomicUpdate:', log);
    console.log('Final state valid?', get(checker));
  });
});