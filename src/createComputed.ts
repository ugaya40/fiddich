import { Computed, DependentState, DependencyState } from './state';
import { Compare, defaultCompare } from './util';

export function createComputed<T>(
  fn: (arg: { get: <V>(target: DependencyState<V>) => V }) => T,
  options?: { compare?: Compare<T> }
): Computed<T> {
  const compare = options?.compare ?? defaultCompare;
  
  // 初期値として一度計算を実行（依存関係も同時に収集）
  const dependencies = new Set<DependencyState>();
  
  // 初期計算時のgetter（依存関係を収集）
  const initialGetter = <V>(target: DependencyState<V>): V => {
    dependencies.add(target);
    return target.stableValue;
  };
  
  // 初期計算を実行（エラーはそのまま投げる）
  const initialValue = fn({ get: initialGetter });
  
  const computed: Computed<T> = {
    stableValue: initialValue,
    dependents: new Set<DependentState>(),
    dependencies,
    version: 0,
    
    compute(getter: <V>(target: DependencyState<V>) => V): T {
      // 計算関数を実行（stableValueは直接更新しない）
      const result = fn({ get: getter });
      
      return result;
    },
    
    compare,
    
    [Symbol.dispose](): void {
      // 依存関係を解除
      for (const dependency of this.dependencies) {
        dependency.dependents.delete(this);
      }
      this.dependencies.clear();
      
      // 依存先リストをクリア
      this.dependents.clear();
    }
  };
  
  // 初期化時に依存関係を設定
  for (const dependency of dependencies) {
    dependency.dependents.add(computed);
  }
  
  return computed;
}