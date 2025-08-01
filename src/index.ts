// @ts-ignore
Symbol.dispose ??= Symbol('Symbol.dispose');

export type { AtomicExecuted, AtomicReject, AtomicUpdateResult } from './atomicUpdate';
export { atomicUpdate, tryAtomicUpdate } from './atomicUpdate';
export { cell, refCell, type Cell, type RefCell } from './cell';
export { computed, type Computed } from './computed';
export type { ExclusiveToken } from './concurrent/exclusive';
export { createExclusiveToken } from './concurrent/exclusive';
export type { GuardToken } from './concurrent/guard';
export { createGuardToken } from './concurrent/guard';
export type { SequencerToken } from './concurrent/sequencer';
export { createSequencerToken } from './concurrent/sequencer';
export { get } from './get';
export { pending } from './pending';
export { useValue } from './react/hooks/useValue';
export { useValueStatus } from './react/hooks/useValueStatus';
export { set } from './set';
export { isCell, isComputed, isValueState } from './stateUtil/typeUtil';
export { touch } from './touch';
export type {
  CellValue,
  ComputedValue,
  StateGetter,
  StateValue,
  ValueStates,
} from './types';
