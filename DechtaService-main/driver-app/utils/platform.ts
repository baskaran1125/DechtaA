import { Platform } from 'react-native';

/**
 * Platform detection utilities for cross-platform (web + mobile) support
 */

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isMobile = isIOS || isAndroid;

export const getPlatform = () => Platform.OS;

/**
 * Check if browser geolocation is available
 */
export const isGeolocationAvailable = (): boolean => {
  return isWeb && typeof navigator !== 'undefined' && 'geolocation' in navigator;
};

/**
 * Check if file input is available (web only)
 */
export const isFileInputAvailable = (): boolean => {
  return isWeb && typeof document !== 'undefined';
};

/**
 * Safe platform-specific selector
 */
export const selectByPlatform = <T>(
  options: {
    web?: T;
    ios?: T;
    android?: T;
    mobile?: T;
    default: T;
  }
): T => {
  if (isWeb && options.web !== undefined) return options.web;
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  if (isMobile && options.mobile !== undefined) return options.mobile;
  return options.default;
};
