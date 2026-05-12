import { Alert, Platform } from 'react-native';
import { isWeb } from './platform';

let ImagePicker: any = null;

// Only require expo-image-picker on mobile
if (!isWeb) {
  try {
    ImagePicker = require('expo-image-picker');
  } catch (e) {
    console.warn('expo-image-picker not available');
  }
}

/**
 * File upload result type
 */
export interface FileUploadResult {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

/**
 * Open file picker for web
 */
const openWebFilePicker = (accept: string = 'image/*'): Promise<FileUploadResult | null> => {
  return new Promise((resolve) => {
    if (!isWeb) {
      resolve(null);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          resolve({
            uri: event.target.result,
            name: file.name,
            type: file.type,
            size: file.size,
          });
        };
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    };

    input.click();
  });
};

/**
 * Open camera (mobile only via expo-image-picker)
 */
export const openCamera = async (): Promise<FileUploadResult | null> => {
  if (isWeb) {
    Alert.alert('Camera', 'Please use the file picker instead');
    return null;
  }

  if (!ImagePicker) {
    Alert.alert('Error', 'Camera is not available');
    return null;
  }

  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Please allow camera access in device settings.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      return {
        uri: result.assets[0].uri,
        name: `camera-${Date.now()}.jpg`,
      };
    }
    return null;
  } catch (error) {
    console.error('Camera error:', error);
    Alert.alert('Error', 'Failed to open camera');
    return null;
  }
};

/**
 * Open gallery/file picker (mobile via expo-image-picker, web via file input)
 */
export const openGallery = async (): Promise<FileUploadResult | null> => {
  if (isWeb) {
    return openWebFilePicker('image/*');
  }

  if (!ImagePicker) {
    Alert.alert('Error', 'Gallery is not available');
    return null;
  }

  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Gallery Permission Required', 'Please allow photo library access in your device settings.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      return {
        uri: result.assets[0].uri,
        name: `gallery-${Date.now()}.jpg`,
      };
    }
    return null;
  } catch (error) {
    console.error('Gallery error:', error);
    Alert.alert('Error', 'Failed to open gallery');
    return null;
  }
};

/**
 * Prompt user to choose camera or gallery (platform-specific UI)
 */
export const openCameraOrGallery = async (): Promise<FileUploadResult | null> => {
  if (isWeb) {
    return openGallery();
  }

  return new Promise((resolve) => {
    Alert.alert('Upload Document', 'Choose how you want to upload', [
      {
        text: '📷  Take Photo',
        onPress: async () => resolve(await openCamera()),
      },
      {
        text: '🖼️  Choose from Gallery',
        onPress: async () => resolve(await openGallery()),
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
};
