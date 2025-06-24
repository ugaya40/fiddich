import { createExclusiveActions, type ExclusiveToken } from './exclusive';
import { createGuardActions, type GuardToken } from './guard';
import { createSequencerActions, type SequencerToken } from './sequencer';
import type { ConcurrentActions, ConcurrentToken } from './types';

const map = new Map<ConcurrentToken['type'], (token: ConcurrentToken) => ConcurrentActions>();

map.set('exclusive', (token) => createExclusiveActions(token as ExclusiveToken));
map.set('guard', (token) => createGuardActions(token as GuardToken));
map.set('sequencer', (token) => createSequencerActions(token as SequencerToken));

export function getConcurrentActions(token?: ConcurrentToken): ConcurrentActions | undefined {
  if (token != null) {
    return map.get(token.type)!(token);
  } else {
    return undefined;
  }
}
