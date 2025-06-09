import { describe, it, expect } from 'vitest';
import { createCell } from '../src/createCell';
import { createComputed } from '../src/createComputed';
import { atomicUpdate } from '../src/atomicUpdate';

describe('atomicUpdate', () => {
  it('should set and get cell values', async () => {
    const cell = createCell(1);
    
    await atomicUpdate(ops => {
      ops.set(cell, 5);
      expect(ops.get(cell)).toBe(5);
    });
    
    expect(cell.stableValue).toBe(5);
    expect(cell.version).toBe(1);
  });

  it('should compute derived values', async () => {
    const cellA = createCell(2);
    const cellB = createCell(3);
    const computed = createComputed(({get}) => get(cellA) * get(cellB));
    
    await atomicUpdate(ops => {
      ops.set(cellA, 4);
      ops.set(cellB, 5);
      expect(ops.get(computed)).toBe(20); // 4 * 5
    });
    
    expect(computed.stableValue).toBe(20);
    expect(computed.version).toBe(1);
  });

  it('should handle chain dependencies', async () => {
    const cell = createCell(10);
    const computed1 = createComputed(({get}) => get(cell) * 2);
    const computed2 = createComputed(({get}) => get(computed1) + 1);
    
    await atomicUpdate(ops => {
      ops.set(cell, 5);
      expect(ops.get(computed2)).toBe(11); // (5 * 2) + 1
    });
    
    expect(computed2.stableValue).toBe(11);
  });

  it('should detect conflicts', async () => {
    const cell = createCell(1);
    
    const promise1 = atomicUpdate(async ops => {
      ops.get(cell); // 事前にreadVersionを記録
      await new Promise(resolve => setTimeout(resolve, 10));
      ops.set(cell, 2);
    });
    
    const promise2 = atomicUpdate(async ops => {
      ops.get(cell); // 事前にreadVersionを記録
      await new Promise(resolve => setTimeout(resolve, 20));
      ops.set(cell, 3);
    });
    
    // どちらかがConflictエラーで失敗するはず
    await expect(Promise.all([promise1, promise2])).rejects.toThrow('Conflict');
  });

  it('should handle dynamic dependencies', async () => {
    const cellA = createCell(1);
    const cellB = createCell(2);
    const condition = createCell(true);
    
    const computed = createComputed(({get}) => 
      get(condition) ? get(cellA) : get(cellB)
    );
    
    // 初期状態: condition=true なので cellA に依存
    expect(computed.stableValue).toBe(1); // cellA の値
    
    // 依存関係を cellA → cellB に変更
    await atomicUpdate(ops => {
      ops.set(condition, false);
      ops.set(cellB, 10);
      expect(ops.get(computed)).toBe(10); // cellB の値
    });
    
    expect(computed.stableValue).toBe(10);
    
    // 依存関係変更後の動作確認
    console.log('依存関係変更後:');
    console.log('computed.dependencies:', Array.from(computed.dependencies || []));
    console.log('cellA.dependents:', Array.from(cellA.dependents || []));
    console.log('cellB.dependents:', Array.from(cellB.dependents || []));
    
    // cellA を変更しても computed は反応しないはず
    const oldComputedVersion = computed.version;
    await atomicUpdate(ops => {
      ops.set(cellA, 999);
    });
    expect(computed.stableValue).toBe(10); // 変化なし
    expect(computed.version).toBe(oldComputedVersion); // バージョンも変化なし
    
    // cellB を変更すると computed は反応するはず
    console.log('cellB変更前:');
    console.log('cellB.dependents:', Array.from(cellB.dependents || []));
    console.log('computed.dependencies:', Array.from(computed.dependencies || []));
    
    await atomicUpdate(ops => {
      // cellBのstateCopyを確認
      ops.get(cellB); // stateCopyを作成
      ops.set(cellB, 20);
      console.log('cellB set後のops.get(cellB):', ops.get(cellB));
      console.log('cellB set後のops.get(computed):', ops.get(computed));
    });
    
    console.log('cellB変更後:');
    console.log('computed.stableValue:', computed.stableValue);
    console.log('computed.version:', computed.version);
    
    expect(computed.stableValue).toBe(20); // cellB の新しい値
    expect(computed.version).toBe(oldComputedVersion + 1); // バージョンアップ
  });
});