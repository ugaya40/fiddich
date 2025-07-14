export type Add<T> = {type: 'add', newItems: T[], newStartingIndex: number}
export type Remove<T> = {type: 'remove', oldImtes: T[], oldStartingIndex: number}
export type Replace<T> = {type: 'replace', newItem: T, oldItem: T, index: number}
export type Reset = {type: 'reset'}

export type CollectionChanged<T> = Add<T> | Remove<T> | Replace<T> | Reset;

export interface ReactiveCollection<T> {
  isDirty: boolean,
  onChange?: (arg: CollectionChanged<T>) => void
}