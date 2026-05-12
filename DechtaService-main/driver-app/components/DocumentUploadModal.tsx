import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { openCamera, openGallery } from '../utils/fileUpload';

interface DocumentUploadModalProps {
  visible: boolean;
  documentName: string; // e.g., "Aadhaar Card", "PAN Card"
  frontImageUri?: string;
  backImageUri?: string;
  onFrontSelected: (uri: string) => void;
  onBackSelected: (uri: string) => void;
  onClose: () => void;
  isDark: boolean;
}

export default function DocumentUploadModal({
  visible,
  documentName,
  frontImageUri,
  backImageUri,
  onFrontSelected,
  onBackSelected,
  onClose,
  isDark,
}: DocumentUploadModalProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<{ side: 'front' | 'back' } | null>(null);

  const handleSelectSource = async (source: 'camera' | 'gallery') => {
    if (!selectionMode) return;
    
    const { side } = selectionMode;
    setSelectionMode(null);
    setUploading(side);
    
    try {
      let result;
      if (source === 'camera') {
        result = await openCamera();
      } else {
        result = await openGallery();
      }
      
      if (result) {
        if (side === 'front') {
          onFrontSelected(result.uri);
        } else {
          onBackSelected(result.uri);
        }
      }
    } catch (error) {
      console.error(`Error uploading ${side} image:`, error);
      Alert.alert('Error', `Failed to upload ${side} image. Please try again.`);
    } finally {
      setUploading(null);
    }
  };

  const handleImageUpload = (side: 'front' | 'back') => {
    setSelectionMode({ side });
  };

  const themeStyles = isDark ? darkTheme : lightTheme;
  const isBothUploaded = !!frontImageUri && !!backImageUri;

  return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={[styles.container, themeStyles.container]}>
          {/* Header */}
          <View style={[styles.header, themeStyles.header]}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={isDark ? '#fff' : '#0f172a'} />
            </TouchableOpacity>
            <Text style={[styles.title, themeStyles.text]}>Upload {documentName}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Selection Modal Overlay */}
          {selectionMode && (
            <View style={styles.modalOverlay}>
              <View style={[styles.selectionPanel, themeStyles.selectionPanel]}>
                <Text style={[styles.selectionTitle, themeStyles.text]}>
                  Choose a source for {selectionMode.side === 'front' ? 'Front' : 'Back'} Side
                </Text>
                
                {/* Camera Button */}
                <TouchableOpacity
                  style={[styles.optionButton, themeStyles.optionButton, styles.cameraButton]}
                  onPress={() => handleSelectSource('camera')}
                >
                  <View style={styles.optionIcon}>
                    <Feather name="camera" size={28} color="#0284c7" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, themeStyles.text]}>📷  Take a Photo</Text>
                    <Text style={[styles.optionSubtitle, themeStyles.subText]}>Use device camera</Text>
                  </View>
                  <Feather name="chevron-right" size={24} color="#64748b" />
                </TouchableOpacity>

                {/* Gallery Button */}
                <TouchableOpacity
                  style={[styles.optionButton, themeStyles.optionButton, styles.galleryButton]}
                  onPress={() => handleSelectSource('gallery')}
                >
                  <View style={styles.optionIcon}>
                    <Feather name="image" size={28} color="#7c3aed" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, themeStyles.text]}>🖼️  Choose from Gallery</Text>
                    <Text style={[styles.optionSubtitle, themeStyles.subText]}>Select from photos</Text>
                  </View>
                  <Feather name="chevron-right" size={24} color="#64748b" />
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.cancelButton, themeStyles.cancelButton]}
                  onPress={() => setSelectionMode(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
          {/* Info Box */}
          <View style={[styles.infoBox, themeStyles.infoBox]}>
            <Feather name="info" size={20} color="#0284c7" />
            <Text style={[styles.infoText, themeStyles.text]}>
              Please upload both front and back sides of your {documentName.toLowerCase()} for verification
            </Text>
          </View>

          {/* Front Side Upload */}
          <View style={styles.sideContainer}>
            <View style={styles.sideHeader}>
              <Text style={[styles.sideTitle, themeStyles.text]}>Front Side</Text>
              {frontImageUri && (
                <View style={styles.uploadedBadge}>
                  <Feather name="check-circle" size={14} color="#10b981" />
                  <Text style={styles.uploadedBadgeText}>Uploaded</Text>
                </View>
              )}
            </View>

            {frontImageUri ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: frontImageUri }}
                  style={styles.preview}
                  resizeMode="cover"
                  onError={() => console.log('Image load failed')}
                />
                <TouchableOpacity
                  style={[styles.changeBtn, themeStyles.changeBtn]}
                  onPress={() => handleImageUpload('front')}
                  disabled={uploading !== null}
                >
                  {uploading === 'front' ? (
                    <ActivityIndicator color="#0284c7" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={16} color="#0284c7" />
                      <Text style={styles.changeBtnText}>Change Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadBox, themeStyles.uploadBox]}
                onPress={() => handleImageUpload('front')}
                disabled={uploading !== null}
              >
                {uploading === 'front' ? (
                  <ActivityIndicator color="#0284c7" size="large" />
                ) : (
                  <>
                    <View style={styles.uploadIcon}>
                      <Feather name="camera" size={32} color="#0284c7" />
                    </View>
                    <Text style={[styles.uploadText, themeStyles.text]}>Tap to Upload Front</Text>
                    <Text style={[styles.uploadHint, themeStyles.subText]}>or take a photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Back Side Upload */}
          <View style={styles.sideContainer}>
            <View style={styles.sideHeader}>
              <Text style={[styles.sideTitle, themeStyles.text]}>Back Side</Text>
              {backImageUri && (
                <View style={styles.uploadedBadge}>
                  <Feather name="check-circle" size={14} color="#10b981" />
                  <Text style={styles.uploadedBadgeText}>Uploaded</Text>
                </View>
              )}
            </View>

            {backImageUri ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: backImageUri }}
                  style={styles.preview}
                  resizeMode="cover"
                  onError={() => console.log('Image load failed')}
                />
                <TouchableOpacity
                  style={[styles.changeBtn, themeStyles.changeBtn]}
                  onPress={() => handleImageUpload('back')}
                  disabled={uploading !== null}
                >
                  {uploading === 'back' ? (
                    <ActivityIndicator color="#0284c7" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={16} color="#0284c7" />
                      <Text style={styles.changeBtnText}>Change Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadBox, themeStyles.uploadBox]}
                onPress={() => handleImageUpload('back')}
                disabled={uploading !== null}
              >
                {uploading === 'back' ? (
                  <ActivityIndicator color="#0284c7" size="large" />
                ) : (
                  <>
                    <View style={styles.uploadIcon}>
                      <Feather name="camera" size={32} color="#0284c7" />
                    </View>
                    <Text style={[styles.uploadText, themeStyles.text]}>Tap to Upload Back</Text>
                    <Text style={[styles.uploadHint, themeStyles.subText]}>or take a photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Completion Message */}
          {isBothUploaded && (
            <View style={[styles.successBox, themeStyles.successBox]}>
              <Feather name="check-circle" size={24} color="#10b981" />
              <Text style={styles.successText}>Great! Both sides uploaded successfully.</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, themeStyles.footer]}>
          <TouchableOpacity
            style={[styles.closeModalBtn, themeStyles.closeModalBtn]}
            onPress={onClose}
            disabled={uploading !== null}
          >
            <Text style={styles.closeModalBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },

  content: { flex: 1 },
  contentPadding: { padding: 20 },

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, marginBottom: 24 },
  infoText: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 20 },

  sideContainer: { marginBottom: 28 },
  sideHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sideTitle: { fontSize: 16, fontWeight: 'bold' },
  uploadedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ecfdf5', borderRadius: 20 },
  uploadedBadgeText: { fontSize: 12, fontWeight: '600', color: '#10b981' },

  uploadBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  uploadIcon: { marginBottom: 12 },
  uploadText: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  uploadHint: { fontSize: 12, textAlign: 'center' },

  previewContainer: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  preview: { width: '100%', height: 250 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  changeBtnText: { fontSize: 14, fontWeight: '600', color: '#0284c7' },

  successBox: { padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  successText: { fontSize: 14, fontWeight: '600', color: '#10b981', textAlign: 'center' },

  footer: { borderTopWidth: 1, padding: 20 },
  closeModalBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeModalBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },

  // Selection Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  selectionPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  cameraButton: {},
  galleryButton: {},
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
  },
  cancelButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
});

const lightTheme = StyleSheet.create({
  container: { backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', borderBottomColor: '#e2e8f0' },
  text: { color: '#0f172a' },
  subText: { color: '#64748b' },
  infoBox: { backgroundColor: '#e0f2fe' },
  uploadBox: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  changeBtn: { backgroundColor: '#eff6ff' },
  successBox: { backgroundColor: '#ecfdf5' },
  footer: { backgroundColor: '#fff', borderTopColor: '#e2e8f0' },
  closeModalBtn: { backgroundColor: '#0284c7' },
  selectionPanel: { backgroundColor: '#fff' },
  optionButton: { backgroundColor: '#f1f5f9' },
  cancelButton: { backgroundColor: '#f1f5f9' },
});

const darkTheme = StyleSheet.create({
  container: { backgroundColor: '#0f172a' },
  header: { backgroundColor: '#1e293b', borderBottomColor: '#334155' },
  text: { color: '#fff' },
  subText: { color: '#94a3b8' },
  infoBox: { backgroundColor: '#1e40af' },
  uploadBox: { borderColor: '#0284c7', backgroundColor: '#082f49' },
  changeBtn: { backgroundColor: '#1e3a8a' },
  successBox: { backgroundColor: '#064e3b' },
  footer: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
  closeModalBtn: { backgroundColor: '#0284c7' },
  selectionPanel: { backgroundColor: '#1e293b' },
  optionButton: { backgroundColor: '#334155' },
  cancelButton: { backgroundColor: '#334155' },
});
