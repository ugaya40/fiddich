import { Cell, DependentState } from './state';
import { Compare, defaultCompare } from './util';

export function createCell<T>(
  initialValue: T,
  options?: { compare?: Compare<T> }
): Cell<T> {
  const compare = options?.compare ?? defaultCompare;
  
  const cell: Cell<T> = {
    stableValue: initialValue,
    dependents: new Set<DependentState>(),
    version: 0,
    
    set(newValue: T): void {
      // TODO: 実装予定
      throw new Error('Cell.set is not implemented yet');
    },
    
    compare,
    
    [Symbol.dispose](): void {
      // 購読者リストをクリア
      this.dependents.clear();
      
      // 保持している値がdisposableな場合は解放
      if (this.stableValue && typeof this.stableValue === 'object' && Symbol.dispose in this.stableValue) {
        (this.stableValue as any)[Symbol.dispose]();
      }
    }
  };
  
  return cell;
}