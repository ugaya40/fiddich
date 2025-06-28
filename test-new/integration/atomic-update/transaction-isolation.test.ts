import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, set, atomicUpdate } from '../../../src';

describe('transaction-isolation', () => {
  it('should isolate changes during transaction', async () => {
    const cell1 = createCell(100);
    const cell2 = createCell(200);
    const computed = createComputed(({ get }) => get(cell1) + get(cell2));
    
    // Initial values
    expect(get(cell1)).toBe(100);
    expect(get(cell2)).toBe(200);
    expect(get(computed)).toBe(300);
    
    let transactionReachedMidpoint = false;
    let continueTransaction: () => void;
    const transactionMidpoint = new Promise<void>(resolve => {
      continueTransaction = resolve;
    });
    
    // Start async transaction
    const transactionPromise = atomicUpdate(async ({ get, set }) => {
      // Make changes
      set(cell1, 150);
      set(cell2, 250);
      
      // Verify changes are visible inside transaction
      expect(get(cell1)).toBe(150);
      expect(get(cell2)).toBe(250);
      expect(get(computed)).toBe(400);
      
      // Signal that we've reached the midpoint
      transactionReachedMidpoint = true;
      
      // Wait for external read to complete
      await transactionMidpoint;
      
      // Make more changes
      set(cell1, 175);
      set(cell2, 275);
      
      expect(get(cell1)).toBe(175);
      expect(get(cell2)).toBe(275);
      expect(get(computed)).toBe(450);
    });
    
    // Wait for transaction to reach midpoint
    while (!transactionReachedMidpoint) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // External reads should see old values
    expect(get(cell1)).toBe(100);
    expect(get(cell2)).toBe(200);
    expect(get(computed)).toBe(300);
    
    // Allow transaction to continue
    continueTransaction!();
    
    // Wait for transaction to complete
    await transactionPromise;
    
    // Now external reads should see new values
    expect(get(cell1)).toBe(175);
    expect(get(cell2)).toBe(275);
    expect(get(computed)).toBe(450);
  });

});