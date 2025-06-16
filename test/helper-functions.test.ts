import { describe, it, expect } from 'vitest';
import { 
  createCell,
  createNullableCell,
  createOptionalCell,
  createNullableComputed,
  createOptionalComputed,
  get,
  set,
  atomicUpdate
} from '../src';

describe('Helper functions', () => {
  describe('Nullable helpers', () => {
    it('should create and use nullable cell', () => {
      // Create a nullable user cell
      const userCell = createNullableCell<{ id: number; name: string }>();
      
      expect(get(userCell)).toBe(null);
      
      // Set a user
      const user = { id: 1, name: 'Alice' };
      set(userCell, user);
      expect(get(userCell)).toEqual(user);
      
      // Set back to null
      set(userCell, null);
      expect(get(userCell)).toBe(null);
    });

    it('should create nullable computed', () => {
      const selectedIdCell = createCell(1);
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      
      // Find user by id - can return null
      const selectedUserComputed = createNullableComputed(
        ({ get }) => {
          const selectedId = get(selectedIdCell);
          return users.find(u => u.id === selectedId) ?? null;
        }
      );
      
      expect(get(selectedUserComputed)).toEqual({ id: 1, name: 'Alice' });
      
      // Select non-existent user
      set(selectedIdCell, 999);
      expect(get(selectedUserComputed)).toBe(null);
    });
  });

  describe('Optional helpers', () => {
    it('should create and use optional cell', () => {
      // Create an optional config cell
      const configCell = createOptionalCell<{ theme: string; language: string }>();
      
      expect(get(configCell)).toBe(undefined);
      
      // Set config
      const config = { theme: 'dark', language: 'en' };
      set(configCell, config);
      expect(get(configCell)).toEqual(config);
      
      // Clear config
      set(configCell, undefined);
      expect(get(configCell)).toBe(undefined);
    });

    it('should create optional computed', () => {
      const itemsCell = createCell([
        { id: 1, name: 'Item 1', active: true },
        { id: 2, name: 'Item 2', active: false },
        { id: 3, name: 'Item 3', active: true }
      ]);
      
      // Find first active item - can be undefined
      const firstActiveItemComputed = createOptionalComputed(
        ({ get }) => get(itemsCell).find(item => item.active)
      );
      
      expect(get(firstActiveItemComputed)).toEqual({ id: 1, name: 'Item 1', active: true });
      
      // Deactivate all items
      atomicUpdate((ops) => {
        const items = ops.get(itemsCell);
        ops.set(itemsCell, items.map(item => ({ ...item, active: false })));
      });
      
      expect(get(firstActiveItemComputed)).toBe(undefined);
    });
  });

  describe('Complex nullable/optional patterns', () => {
    it('should handle nullable chain with optional computed', () => {
      interface User {
        id: number;
        name: string;
        profile?: {
          bio: string;
          avatar?: string;
        };
      }
      
      const currentUserCell = createNullableCell<User>(null);
      
      // Get user avatar - can be undefined (no user, no profile, or no avatar)
      const userAvatarComputed = createOptionalComputed(
        ({ get }) => get(currentUserCell)?.profile?.avatar
      );
      
      expect(get(userAvatarComputed)).toBe(undefined);
      
      // Set user without profile
      set(currentUserCell, { id: 1, name: 'Alice' });
      expect(get(userAvatarComputed)).toBe(undefined);
      
      // Set user with profile but no avatar
      set(currentUserCell, { 
        id: 1, 
        name: 'Alice',
        profile: { bio: 'Hello!' }
      });
      expect(get(userAvatarComputed)).toBe(undefined);
      
      // Set user with avatar
      set(currentUserCell, { 
        id: 1, 
        name: 'Alice',
        profile: { bio: 'Hello!', avatar: 'avatar.png' }
      });
      expect(get(userAvatarComputed)).toBe('avatar.png');
    });

    it('should combine nullable and optional patterns', () => {
      // API response that might be null
      const apiResponseCell = createNullableCell<{
        data?: { items: string[] };
        error?: string;
      }>(null);
      
      // Extract items - can be undefined
      const itemsComputed = createOptionalComputed(
        ({ get }) => get(apiResponseCell)?.data?.items
      );
      
      // Extract error - can be undefined  
      const errorComputed = createOptionalComputed(
        ({ get }) => get(apiResponseCell)?.error
      );
      
      // Initially no response
      expect(get(itemsComputed)).toBe(undefined);
      expect(get(errorComputed)).toBe(undefined);
      
      // Success response
      set(apiResponseCell, { data: { items: ['a', 'b', 'c'] } });
      expect(get(itemsComputed)).toEqual(['a', 'b', 'c']);
      expect(get(errorComputed)).toBe(undefined);
      
      // Error response
      set(apiResponseCell, { error: 'Network error' });
      expect(get(itemsComputed)).toBe(undefined);
      expect(get(errorComputed)).toBe('Network error');
    });
  });
});

