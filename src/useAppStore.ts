import { useSyncExternalStore } from 'react';
import { getState, subscribe } from './store';
import type { AppState } from './types';

export function useAppStore(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
