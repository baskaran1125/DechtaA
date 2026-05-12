import { Platform } from 'react-native';

/**
 * Cross-platform storage utility
 * Uses AsyncStorage on mobile, localStorage on web
 */

let AsyncStorage: any = null;

// Only require AsyncStorage on mobile
if (Platform.OS !== 'web') {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    console.warn('AsyncStorage not available');
  }
}

interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Web-based localStorage implementation
 */
const webStorage: StorageInterface = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage error:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage error:', error);
    }
  },
};

/**
 * Mobile-based AsyncStorage implementation
 */
const mobileStorage: StorageInterface = {
  async getItem(key: string): Promise<string | null> {
    if (!AsyncStorage) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage error:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!AsyncStorage) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage error:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!AsyncStorage) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage error:', error);
    }
  },
};

/**
 * Get the appropriate storage for current platform
 */
export const getStorage = (): StorageInterface => {
  return Platform.OS === 'web' ? webStorage : mobileStorage;
};

/**
 * Create a storage wrapper with a specific key prefix
 */
export const createKeyedStorage = (prefix: string) => {
  const storage = getStorage();

  return {
    async get(key: string) {
      return storage.getItem(`${prefix}_${key}`);
    },

    async set(key: string, value: string) {
      return storage.setItem(`${prefix}_${key}`, value);
    },

    async remove(key: string) {
      return storage.removeItem(`${prefix}_${key}`);
    },

    async clear() {
      // Clear all keys with this prefix
      if (Platform.OS === 'web') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(`${prefix}_`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else if (AsyncStorage) {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const prefixedKeys = keys.filter((key: string) => key.startsWith(`${prefix}_`));
          await AsyncStorage.multiRemove(prefixedKeys);
        } catch (error) {
          console.warn('AsyncStorage clear error:', error);
        }
      }
    },
  };
};
