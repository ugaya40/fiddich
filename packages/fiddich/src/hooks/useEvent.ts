import { useEffect } from 'react';
import { EventPublisher } from '../util/event';

export function useEvent<T>(eventPublisher: EventPublisher<T>, handler: (eventArg: T) => void) {
  useEffect(() => {
    const listener = eventPublisher.addListener(handler);
    return () => listener.dispose();
  }, [eventPublisher, handler]);
}
