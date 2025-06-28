import { describe, it, expect } from 'vitest';
import { createCell, createComputed, get, atomicUpdate } from '../../../src';

describe('nested-transactions', () => {
  describe('same transaction with context (recommended pattern)', () => {
    it('should share same transaction with context', async () => {
      const cell1 = createCell(1);
      const cell2 = createCell(2);
      const cell3 = createCell(3);
      
      let innerExecuted = false;
      let outerCompleted = false;
      
      await atomicUpdate(async ({ get, set, context }) => {
        // Outer transaction changes
        set(cell1, 10);
        expect(get(cell1)).toBe(10);
        
        // Nested atomicUpdate WITH context
        atomicUpdate(({ get, set }) => {
          // This shares the same transaction
          expect(get(cell1)).toBe(10); // Sees outer changes
          
          set(cell2, 20);
          expect(get(cell2)).toBe(20);
          
          innerExecuted = true;
        }, { context });
        
        // After nested execution
        expect(get(cell2)).toBe(20); // Outer sees inner changes
        
        set(cell3, 30);
        outerCompleted = true;
      });
      
      // All changes committed together
      expect(innerExecuted).toBe(true);
      expect(outerCompleted).toBe(true);
      expect(get(cell1)).toBe(10);
      expect(get(cell2)).toBe(20);
      expect(get(cell3)).toBe(30);
    });

    it('should see changes from outer in nested with context', () => {
      const cells = [
        createCell('a'),
        createCell('b'),
        createCell('c')
      ];
      
      const combined = createComputed(({ get }) => 
        cells.map(cell => get(cell)).join('-')
      );
      
      atomicUpdate(({ get, set, context }) => {
        // Outer changes
        set(cells[0], 'A');
        set(cells[1], 'B');
        
        expect(get(combined)).toBe('A-B-c');
        
        // Nested with context
        atomicUpdate(({ get, set }) => {
          // Can see outer changes
          expect(get(cells[0])).toBe('A');
          expect(get(cells[1])).toBe('B');
          expect(get(combined)).toBe('A-B-c');
          
          // Make additional changes
          set(cells[2], 'C');
          expect(get(combined)).toBe('A-B-C');
        }, { context });
        
        // Outer can see all changes
        expect(get(combined)).toBe('A-B-C');
      });
      
      // All committed together
      expect(get(combined)).toBe('A-B-C');
    });

    it('should rollback all changes on nested error with context', () => {
      const cell1 = createCell(100);
      const cell2 = createCell(200);
      const cell3 = createCell(300);
      
      const sum = createComputed(({ get }) => 
        get(cell1) + get(cell2) + get(cell3)
      );
      
      expect(get(sum)).toBe(600);
      
      expect(() => {
        atomicUpdate(({ get, set, context }) => {
          // Outer changes
          set(cell1, 111);
          set(cell2, 222);
          
          expect(get(sum)).toBe(633);
          
          // Nested with context
          atomicUpdate(({ get, set }) => {
            set(cell3, 333);
            expect(get(sum)).toBe(666);
            
            // Error in nested
            throw new Error('Nested error');
          }, { context });
          
          // This should not be reached
          set(cell1, 999);
        });
      }).toThrow('Nested error');
      
      // All changes rolled back
      expect(get(cell1)).toBe(100);
      expect(get(cell2)).toBe(200);
      expect(get(cell3)).toBe(300);
      expect(get(sum)).toBe(600);
    });

    it('should handle multiple nested levels with shared context', () => {
      const cells = Array.from({ length: 5 }, (_, i) => createCell(i));
      
      atomicUpdate(({ get, set, context }) => {
        set(cells[0], 10);
        
        // Level 1 nested
        atomicUpdate(({ get, set, context: innerContext }) => {
          expect(get(cells[0])).toBe(10);
          set(cells[1], 20);
          
          // Level 2 nested
          atomicUpdate(({ get, set, context: innerContext2 }) => {
            expect(get(cells[0])).toBe(10);
            expect(get(cells[1])).toBe(20);
            set(cells[2], 30);
            
            // Level 3 nested
            atomicUpdate(({ get, set }) => {
              expect(get(cells[0])).toBe(10);
              expect(get(cells[1])).toBe(20);
              expect(get(cells[2])).toBe(30);
              set(cells[3], 40);
              set(cells[4], 50);
            }, { context: innerContext2 });
            
          }, { context: innerContext });
          
        }, { context });
        
        // All changes visible at outer level
        expect(get(cells[0])).toBe(10);
        expect(get(cells[1])).toBe(20);
        expect(get(cells[2])).toBe(30);
        expect(get(cells[3])).toBe(40);
        expect(get(cells[4])).toBe(50);
      });
      
      // All committed together
      cells.forEach((cell, i) => {
        expect(get(cell)).toBe((i + 1) * 10);
      });
    });
  });

  describe('independent transaction without context (not recommended but works)', () => {
    it('should create independent transaction without context', async () => {
      const outerCell = createCell('outer-init');
      const innerCell = createCell('inner-init');
      
      let innerCommitted = false;
      let continueOuter: () => void;
      const outerGate = new Promise<void>(resolve => {
        continueOuter = resolve;
      });
      
      // Start outer transaction
      const outerPromise = atomicUpdate(async ({ get, set }) => {
        set(outerCell, 'outer-changed');
        expect(get(outerCell)).toBe('outer-changed');
        
        // Nested without context - independent transaction
        atomicUpdate(({ get, set }) => {
          // Cannot see outer changes
          expect(get(outerCell)).toBe('outer-init');
          
          set(innerCell, 'inner-changed');
          expect(get(innerCell)).toBe('inner-changed');
        });
        
        // Inner committed immediately
        innerCommitted = true;
        
        // Wait before outer commits
        await outerGate;
        
        // Outer transaction continues
        expect(get(outerCell)).toBe('outer-changed');
        // Can see committed inner changes
        expect(get(innerCell)).toBe('inner-changed');
      });
      
      // Wait for inner to commit
      while (!innerCommitted) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Inner changes visible, outer changes not yet
      expect(get(innerCell)).toBe('inner-changed');
      expect(get(outerCell)).toBe('outer-init');
      
      // Continue outer
      continueOuter!();
      await outerPromise;
      
      // Now both committed
      expect(get(innerCell)).toBe('inner-changed');
      expect(get(outerCell)).toBe('outer-changed');
    });

    it('should commit independently without context', async () => {
      const cellA = createCell(1);
      const cellB = createCell(2);
      const cellC = createCell(3);
      
      let phase1Complete = false;
      let continueOuter: () => void;
      const outerGate = new Promise<void>(resolve => {
        continueOuter = resolve;
      });
      
      // Start outer async transaction
      const outerPromise = atomicUpdate(async ({ get, set }) => {
        // Outer changes (not committed yet)
        set(cellA, 100);
        expect(get(cellA)).toBe(100);
        
        // Independent nested transaction
        atomicUpdate(({ get, set }) => {
          // This is independent - cannot see outer changes
          expect(get(cellA)).toBe(1);
          
          // Make independent changes
          set(cellB, 200);
          expect(get(cellB)).toBe(200);
        });
        // Nested commits immediately
        
        phase1Complete = true;
        
        // Wait in outer transaction
        await outerGate;
        
        // Continue outer
        set(cellC, 300);
      });
      
      // Wait for phase 1
      while (!phase1Complete) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Check visibility from outside
      expect(get(cellA)).toBe(1);    // Outer not committed
      expect(get(cellB)).toBe(200);  // Inner committed
      expect(get(cellC)).toBe(3);    // Not changed yet
      
      // Release outer
      continueOuter!();
      await outerPromise;
      
      // Now outer committed too
      expect(get(cellA)).toBe(100);
      expect(get(cellB)).toBe(200);
      expect(get(cellC)).toBe(300);
    });

    it('should not rollback outer on inner error without context', async () => {
      const outerCell = createCell('start');
      const innerCell = createCell('start');
      
      let innerFailed = false;
      let continueOuter: () => void;
      const outerGate = new Promise<void>(resolve => {
        continueOuter = resolve;
      });
      
      const outerPromise = atomicUpdate(async ({ set }) => {
        set(outerCell, 'outer-progress');
        
        try {
          // Independent nested transaction
          atomicUpdate(({ set }) => {
            set(innerCell, 'inner-progress');
            throw new Error('Inner error');
          });
        } catch (e) {
          // Inner error caught
          innerFailed = true;
        }
        
        // Outer continues despite inner error
        await outerGate;
        
        set(outerCell, 'outer-complete');
      });
      
      // Wait for inner to fail
      while (!innerFailed) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Inner rolled back, outer still in progress
      expect(get(innerCell)).toBe('start');
      expect(get(outerCell)).toBe('start');
      
      // Continue outer
      continueOuter!();
      await outerPromise;
      
      // Outer committed successfully
      expect(get(outerCell)).toBe('outer-complete');
      expect(get(innerCell)).toBe('start');
    });
  });
});