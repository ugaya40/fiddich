import { Cell, DependencyState, DependentState, Computed } from './state';
import { AtomicContext, createAtomicContext } from './atomicContext';

export interface AtomicOperations {
  get<T>(target: DependencyState<T>): T;
  set<T>(target: Cell<T>, value: T): void;
  pending<T>(target: DependencyState<T>): void;
  rejectAllChanges(): void;
  touch<T>(target: DependencyState<T>): void;
  dispose<T extends Disposable>(target: T): void;
  readonly context: AtomicContext;
}

export interface AtomicUpdateOptions {
  context?: AtomicContext;
}

export async function atomicUpdate(
  fn: (ops: AtomicOperations) => Promise<void> | void,
  options?: AtomicUpdateOptions
): Promise<void> {
  const context = options?.context ?? createAtomicContext();
  
  // stateCopiesにstateを追加するhelper関数
  const ensureStateCopy = (state: DependencyState<any> | DependentState<any>) => {
    if (!context.stateCopies.has(state)) {
      context.stateCopies.set(state, {
        stableValue: state.stableValue,
        dependencies: 'dependencies' in state ? new Set(state.dependencies) : undefined,
        dependents: 'dependents' in state ? new Set(state.dependents) : undefined,
        readVersion: state.version
      });
    }
  };

  // stateCopiesからcopyを取得する関数
  const getStateCopy = (state: DependencyState<any> | DependentState<any>) => {
    ensureStateCopy(state);
    return context.stateCopies.get(state)!;
  };

  // Computed/LeafComputedを計算する関数（stateCopies.stableValueをキャッシュとして使用）
  const computeValue = <T>(target: DependentState<T>, visited = new Set()): T => {
    const copy = getStateCopy(target);
    
    // valueDirtyでなく、stableValueが計算済みならキャッシュから返す
    if (!context.valueDirty.has(target) && 'stableValue' in copy) {
      return copy.stableValue;
    }
    
    if (visited.has(target)) {
      throw new Error(`Circular dependency detected involving computed state`);
    }
    visited.add(target);
    
    const newDependencies = new Set<DependencyState<any>>();
    
    // 依存関係を追跡するgetter
    const trackingGetter = <V>(dep: DependencyState<V>): V => {
      newDependencies.add(dep);
      if ('set' in dep) {
        // Cell: stateCopyから値を取得
        return getStateCopy(dep).stableValue;
      } else {
        // Computed: 再帰的に計算
        return computeValue(dep, visited);
      }
    };
    
    const result = target.compute(trackingGetter);
    
    // 依存関係を更新
    const oldDependencies = copy.dependencies || new Set();
    
    // 依存関係が変わったかチェック
    const dependenciesChanged = 
      oldDependencies.size !== newDependencies.size ||
      ![...oldDependencies].every(dep => newDependencies.has(dep));
    
    // 値が変わったかチェック
    const valueChanged = !target.compare(copy.stableValue || target.stableValue, result);
    
    // 結果をstableValueに保存（キャッシュとして使用）
    context.stateCopies.set(target, {
      ...copy,
      stableValue: result,
      dependencies: newDependencies,
      versionIncrement: dependenciesChanged || valueChanged
    });
    
    // dependents関係も更新
    // 古い依存関係からtargetを削除
    for (const oldDep of oldDependencies) {
      const oldDepCopy = getStateCopy(oldDep);
      if (oldDepCopy.dependents) {
        oldDepCopy.dependents.delete(target);
        context.stateCopies.set(oldDep, oldDepCopy);
      }
    }
    
    // 新しい依存関係にtargetを追加
    for (const newDep of newDependencies) {
      const newDepCopy = getStateCopy(newDep);
      if (!newDepCopy.dependents) {
        newDepCopy.dependents = new Set();
      }
      newDepCopy.dependents.add(target);
      context.stateCopies.set(newDep, newDepCopy);
    }
    
    // valueDirtyをクリア（計算完了）
    context.valueDirty.delete(target);
    
    visited.delete(target);
    return result;
  };

  // 依存チェーン全体を2種類のdirtyとしてマークする関数
  const markAllDependentsAsDirty = (state: DependencyState<any> | DependentState<any>, visited = new Set()) => {
    if (visited.has(state)) return; // 循環参照防止
    visited.add(state);
    
    const stateCopy = getStateCopy(state);
    if (stateCopy.dependents) {
      for (const dependent of stateCopy.dependents) {
        // commit時通知用
        context.commitDirty.add(dependent);
        // get時再計算用（次回computeValue時にstableValueを無視）
        context.valueDirty.add(dependent);
        
        
        markAllDependentsAsDirty(dependent, visited);
      }
    }
  };

  const ops: AtomicOperations = {
    get<T>(target: DependencyState<T>): T {
      if('set' in target) {
        // Cell: stateCopyから値を取得
        return getStateCopy(target).stableValue;
      } else {
        // Computed/LeafComputed: 毎回計算
        return computeValue(target);
      }
    },
    
    set<T>(target: Cell<T>, value: T): void {
      const copy = getStateCopy(target);
      
      if (!target.compare(copy.stableValue, value)) {
        // 1. Cell値を更新
        context.stateCopies.set(target, {
          ...copy,
          stableValue: value,
          versionIncrement: true
        });
        
        // 2. 依存チェーン全体をdirtyとしてマーク
        markAllDependentsAsDirty(target);
      }
    },
    
    pending<T>(target: DependencyState<T>): void {
      // TODO: 実装予定 - 対象を非同期的に解決されることをマーク
      throw new Error('ops.pending is not implemented yet');
    },
    
    rejectAllChanges(): void {
      // TODO: 実装予定 - バッファされた全ての状態変更を破棄
      throw new Error('ops.rejectAllChanges is not implemented yet');
    },
    
    touch<T>(target: DependencyState<T>): void {
      // TODO: 実装予定 - 現在のトランザクション内で変更があったことを通知
      throw new Error('ops.touch is not implemented yet');
    },
    
    dispose<T extends Disposable>(target: T): void {
      // TODO: 実装予定 - Symbol.disposeの実行をコミット時まで遅延
      throw new Error('ops.dispose is not implemented yet');
    },
    
    context
  };
  
  try {
    const result = fn(ops);
    
    if (result instanceof Promise) {
      await result;
    }
    
    // コミット処理
    // 1. バージョン競合チェック
    for (const [state, copy] of context.stateCopies) {
      if (state.version !== copy.readVersion) {
        throw new Error('Conflict: State modified by another transaction');
      }
    }

    // 2. Cell values をcommit + バージョン更新
    for (const [state, copy] of context.stateCopies) {
      if ('set' in state && copy.versionIncrement) {
        state.stableValue = copy.stableValue;
        state.version++;
      }
    }

    // 3. commitDirtyな Computed/LeafComputed を処理 + バージョン更新
    for (const dirtyState of context.commitDirty) {
      const copy = context.stateCopies.get(dirtyState);
      if (copy && copy.versionIncrement) {
        const oldValue = dirtyState.stableValue;
        dirtyState.stableValue = copy.stableValue;
        if (copy.dependencies) {
          dirtyState.dependencies = copy.dependencies;
        }
        if ('dependents' in dirtyState && copy.dependents) {
          dirtyState.dependents = copy.dependents;
        }
        dirtyState.version++;
        
        // LeafComputedならchangeCallback呼び出し
        if ('changeCallback' in dirtyState && dirtyState.changeCallback) {
          dirtyState.changeCallback(oldValue, copy.stableValue);
        }
      }
    }
  } catch (error) {
    // TODO: ロールバック処理
    throw error;
  }
}