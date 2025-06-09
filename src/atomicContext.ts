import { Cell, DependentState, DependencyState } from './state';

export interface AtomicContext {
  readonly id: string;
  
  // 各stateの全プロパティのコピー
  readonly stateCopies: Map<DependencyState | DependentState, {
    stableValue?: any;
    dependencies?: Set<DependencyState>;
    dependents?: Set<DependentState>;
    readVersion: number;
    versionIncrement?: boolean;
  }>;
  
  // commit時に更新が必要なComputed/LeafComputed
  readonly commitDirty: Set<DependentState>;
  
  // get時に再計算が必要なComputed/LeafComputed
  readonly valueDirty: Set<DependentState>;
  
  // pending状態の管理
  readonly pendingStates: Set<DependencyState>;
  
  // 遅延dispose対象
  readonly disposeTargets: Set<Disposable>;
}

export function createAtomicContext(): AtomicContext {
  const id = crypto.randomUUID();
  const stateCopies = new Map<DependencyState | DependentState, {
    stableValue?: any;
    dependencies?: Set<DependencyState>;
    dependents?: Set<DependentState>;
    readVersion: number;
    versionIncrement?: boolean;
  }>();
  const commitDirty = new Set<DependentState>();
  const valueDirty = new Set<DependentState>();
  const pendingStates = new Set<DependencyState>();
  const disposeTargets = new Set<Disposable>();
  
  return {
    id,
    stateCopies,
    commitDirty,
    valueDirty,
    pendingStates,
    disposeTargets
  };
}