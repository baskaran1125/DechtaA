import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { openCamera, openGallery } from '../utils/fileUpload';

interface DocumentViewerModalProps {
  visible: boolean;
  documentName: string; // e.g., "Aadhaar Card"
  documentKey: string; // e.g., "aadhar"
  frontImageUri?: string;
  backImageUri?: string;
  status?: 'pending' | 'verified' | 'rejected' | 'incomplete';
  rejectionReason?: string;
  onFrontSelected: (uri: string) => void;
  onBackSelected: (uri: string) => void;
  onClose: () => void;
  isDark: boolean;
  onSave?: () => Promise<void>;
}

export default function DocumentViewerModal({
  visible,
  documentName,
  documentKey,
  frontImageUri,
  backImageUri,
  status = 'pending',
  rejectionReason,
  onFrontSelected,
  onBackSelected,
  onClose,
  isDark,
  onSave,
}: DocumentViewerModalProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFullImage, setShowFullImage] = useState<string | null>(null);
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

  const handleSave = async () => {
    if (onSave) {
      setSaving(true);
      try {
        await onSave();
        Alert.alert('Success', 'Document updated successfully!', [
          { text: 'OK', onPress: onClose }
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update document');
      } finally {
        setSaving(false);
      }
    } else {
      onClose();
    }
  };

  const themeStyles = isDark ? darkTheme : lightTheme;
  const statusColors = {
    pending: { bg: '#fef3c7', text: '#d97706', icon: 'clock' },
    verified: { bg: '#d1fae5', text: '#059669', icon: 'check-circle' },
    rejected: { bg: '#fee2e2', text: '#dc2626', icon: 'alert-circle' },
    incomplete: { bg: '#fed7aa', text: '#ea580c', icon: 'alert-triangle' },
  };
  const statusInfo = statusColors[status];

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false}>
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

      <View style={[styles.container, themeStyles.container]}>
        {/* Header */}
        <View style={[styles.header, themeStyles.header]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={24} color={isDark ? '#fff' : '#0f172a'} />
          </TouchableOpacity>
          <Text style={[styles.title, themeStyles.text]}>{documentName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusInfo.bg },
            ]}
          >
            <Feather name={statusInfo.icon as any} size={18} color={statusInfo.text} />
            <Text style={[styles.statusText, { color: statusInfo.text }]}>
              {status === 'pending' ? 'Pending Verification' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>

          {/* Rejection Reason */}
          {status === 'rejected' && rejectionReason && (
            <View style={[styles.rejectionBox, themeStyles.rejectionBox]}>
              <Feather name="alert-circle" size={18} color="#dc2626" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rejectionTitle, themeStyles.text]}>Rejection Reason</Text>
                <Text style={[styles.rejectionReason, themeStyles.subText]}>
                  {rejectionReason}
                </Text>
              </View>
            </View>
          )}

          {/* Front Side */}
          <View style={styles.sideContainer}>
            <Text style={[styles.sideTitle, themeStyles.text]}>Front Side</Text>
            {frontImageUri ? (
              <View style={styles.imageCard}>
                <TouchableOpacity
                  onPress={() => setShowFullImage(frontImageUri)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: frontImageUri }}
                    style={styles.thumbnail}
                    onError={() => console.log('Image load failed')}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, themeStyles.editBtn]}
                  onPress={() => handleImageUpload('front')}
                  disabled={uploading !== null}
                >
                  {uploading === 'front' ? (
                    <ActivityIndicator color="#0284c7" />
                  ) : (
                    <>
                      <Feather name="edit-3" size={14} color="#0284c7" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : status === 'rejected' ? (
              <TouchableOpacity
                style={[styles.retakeBox, themeStyles.retakeBox]}
                onPress={() => handleImageUpload('front')}
                disabled={uploading !== null}
              >
                {uploading === 'front' ? (
                  <ActivityIndicator color="#0284c7" size="large" />
                ) : (
                  <>
                    <Feather name="camera" size={24} color="#0284c7" />
                    <Text style={[styles.retakeText, themeStyles.text]}>Re-upload Front</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.placeholderBox, themeStyles.placeholderBox]}>
                <Feather name="lock" size={24} color="#94a3b8" />
                <Text style={[styles.placeholderText, themeStyles.subText]}>No image</Text>
              </View>
            )}
          </View>

          {/* Back Side */}
          <View style={styles.sideContainer}>
            <Text style={[styles.sideTitle, themeStyles.text]}>Back Side</Text>
            {backImageUri ? (
              <View style={styles.imageCard}>
                <TouchableOpacity
                  onPress={() => setShowFullImage(backImageUri)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: backImageUri }}
                    style={styles.thumbnail}
                    onError={() => console.log('Image load failed')}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, themeStyles.editBtn]}
                  onPress={() => handleImageUpload('back')}
                  disabled={uploading !== null}
                >
                  {uploading === 'back' ? (
                    <ActivityIndicator color="#0284c7" />
                  ) : (
                    <>
                      <Feather name="edit-3" size={14} color="#0284c7" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : status === 'rejected' ? (
              <TouchableOpacity
                style={[styles.retakeBox, themeStyles.retakeBox]}
                onPress={() => handleImageUpload('back')}
                disabled={uploading !== null}
              >
                {uploading === 'back' ? (
                  <ActivityIndicator color="#0284c7" size="large" />
                ) : (
                  <>
                    <Feather name="camera" size={24} color="#0284c7" />
                    <Text style={[styles.retakeText, themeStyles.text]}>Re-upload Back</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.placeholderBox, themeStyles.placeholderBox]}>
                <Feather name="lock" size={24} color="#94a3b8" />
                <Text style={[styles.placeholderText, themeStyles.subText]}>No image</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        {(status === 'rejected' || onSave) && (
          <View style={[styles.footer, themeStyles.footer]}>
            <TouchableOpacity
              style={[styles.saveBtn, themeStyles.saveBtn]}
              onPress={handleSave}
              disabled={saving || uploading !== null}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelBtn, themeStyles.cancelBtn]}
              onPress={onClose}
              disabled={saving || uploading !== null}
            >
              <Text style={[styles.cancelBtnText, themeStyles.text]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Full Image Viewer Overlay (web-safe; avoids nested Modal) */}
        {showFullImage && (
          <View style={styles.fullImageOverlay}>
            <View style={styles.fullImageContainer}>
              <TouchableOpacity
                style={styles.closeFullImage}
                onPress={() => setShowFullImage(null)}
              >
                <Feather name="x" size={28} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: showFullImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
    </>
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

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 20 },
  statusText: { fontSize: 14, fontWeight: '600' },

  rejectionBox: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4 },
  rejectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  rejectionReason: { fontSize: 13, lineHeight: 18 },

  sideContainer: { marginBottom: 24 },
  sideTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },

  imageCard: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9', position: 'relative' },
  thumbnail: { width: '100%', height: 200, resizeMode: 'cover' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#0284c7' },

  retakeBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  retakeText: { fontSize: 14, fontWeight: '600' },

  placeholderBox: { padding: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { fontSize: 13, fontWeight: '500' },

  fullImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  fullImageContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  closeFullImage: { position: 'absolute', top: 40, right: 20, zIndex: 100, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '90%', height: '90%' },

  footer: { borderTopWidth: 1, padding: 16, flexDirection: 'row', gap: 12 },
  saveBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },

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
  rejectionBox: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  editBtn: { backgroundColor: '#eff6ff' },
  retakeBox: { borderColor: '#0284c7', backgroundColor: '#f0f9ff' },
  placeholderBox: { backgroundColor: '#f1f5f9' },
  footer: { backgroundColor: '#fff', borderTopColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#0284c7' },
  cancelBtn: { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  selectionPanel: { backgroundColor: '#fff' },
  optionButton: { backgroundColor: '#f1f5f9' },
  cancelButton: { backgroundColor: '#f1f5f9' },
});

const darkTheme = StyleSheet.create({
  container: { backgroundColor: '#0f172a' },
  header: { backgroundColor: '#1e293b', borderBottomColor: '#334155' },
  text: { color: '#fff' },
  subText: { color: '#94a3b8' },
  rejectionBox: { backgroundColor: '#7f1d1d', borderColor: '#991b1b' },
  editBtn: { backgroundColor: '#1e3a8a' },
  retakeBox: { borderColor: '#0284c7', backgroundColor: '#082f49' },
  placeholderBox: { backgroundColor: '#1e293b' },
  footer: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
  saveBtn: { backgroundColor: '#0284c7' },
  cancelBtn: { borderColor: '#334155', backgroundColor: '#0f172a' },
  selectionPanel: { backgroundColor: '#1e293b' },
  optionButton: { backgroundColor: '#334155' },
  cancelButton: { backgroundColor: '#334155' },
});
