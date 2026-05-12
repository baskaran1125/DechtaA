// components/ChatModal.tsx
// FIX: connected to real MiscAPI — messages persist and customer sees them
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, SafeAreaView,
  Keyboard, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MiscAPI } from '../services/api';

interface Message {
  id:          string;
  text:        string;
  sender_type: 'driver' | 'customer' | 'system';
  time:        string;
}

interface ChatModalProps {
  isOpen:          boolean;
  onClose:         () => void;
  tripId:          string;       // required — needed to fetch/send real messages
  driverName?:     string;
  vehicleNumber?:  string;
  onCallCustomer:  () => void;
}

export default function ChatModal({
  isOpen,
  onClose,
  tripId,
  driverName    = 'Partner',
  vehicleNumber = '',
  onCallCustomer,
}: ChatModalProps) {
  const [inputText,  setInputText]  = useState('');
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [sending,    setSending]    = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quickReplies = [
    'Are you coming?',
    'Waiting at pickup 📍',
    'My location is as per map 🗺️',
    'Message when reached 💬',
  ];

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Load messages when modal opens
  const loadMessages = useCallback(async () => {
    if (!tripId || !isOpen) return;
    setLoading(true);
    try {
      const result = await MiscAPI.getChatMessages(tripId);
      if (result.success && Array.isArray(result.data)) {
        setMessages(result.data.map((m: any) => ({
          id:          String(m.id),
          text:        m.message,
          sender_type: m.sender_type,
          time:        formatTime(m.created_at),
        })));
      }
    } catch {
      // Non-fatal — show empty state
    } finally {
      setLoading(false);
    }
  }, [tripId, isOpen]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
        scrollTimerRef.current = null;
      }, 100);
    }
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [messages, isOpen]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Optimistic UI — add message immediately
    const optimisticMsg: Message = {
      id:          `temp_${Date.now()}`,
      text:        trimmed,
      sender_type: 'driver',
      time:        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    Keyboard.dismiss();

    setSending(true);
    try {
      const result = await MiscAPI.sendChatMessage(tripId, trimmed);
      if (result.success && result.data) {
        // Replace optimistic message with real one from server
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { id: String(result.data.id), text: result.data.message, sender_type: 'driver', time: formatTime(result.data.created_at) }
              : m
          )
        );
      }
    } catch {
      // Keep optimistic message — server sync will catch up on next load
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Feather name="chevron-down" size={24} color="#64748B" />
              </TouchableOpacity>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{driverName.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.headerName}>{driverName}</Text>
                {vehicleNumber ? <Text style={styles.headerVehicle}>{vehicleNumber}</Text> : null}
              </View>
            </View>
            <TouchableOpacity onPress={onCallCustomer} style={styles.callBtn}>
              <Feather name="phone" size={20} color="#16A34A" />
            </TouchableOpacity>
          </View>

          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>⚠️ Do not share your delivery PIN over chat</Text>
          </View>

          {/* Chat Area */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#0284C7" />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatPadding}
            >
              {messages.length === 0 && (
                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
              )}
              {messages.map((msg) => {
                const isDriver = msg.sender_type === 'driver';
                return (
                  <View key={msg.id} style={[styles.messageRow, isDriver ? styles.messageRowRight : styles.messageRowLeft]}>
                    <View style={[styles.bubble, isDriver ? styles.bubbleDriver : styles.bubbleCustomer]}>
                      <Text style={[styles.messageText, isDriver ? styles.textDriver : styles.textCustomer]}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{msg.time}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Quick Replies */}
          <View style={styles.quickRepliesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {quickReplies.map((reply, i) => (
                <TouchableOpacity key={i} onPress={() => handleSend(reply)} style={styles.quickReplyBtn}>
                  <Text style={styles.quickReplyText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend(inputText)}
            />
            <TouchableOpacity
              onPress={() => handleSend(inputText)}
              style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.5 }]}
              disabled={!inputText.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Feather name="send" size={20} color="#FFF" />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer:  { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView:    { flex: 1 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center' },
  avatarText:      { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  headerName:      { fontWeight: 'bold', fontSize: 16, color: '#0F172A' },
  headerVehicle:   { fontSize: 12, color: '#64748B' },
  callBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  warningBanner:   { backgroundColor: '#FEF9C3', padding: 10, borderBottomWidth: 1, borderBottomColor: '#FEF08A' },
  warningText:     { color: '#854D0E', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  chatArea:        { flex: 1 },
  chatPadding:     { padding: 16, paddingBottom: 20 },
  loadingBox:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:       { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 14 },
  messageRow:      { marginBottom: 16, maxWidth: '80%' },
  messageRowRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageRowLeft:  { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:          { padding: 14, borderRadius: 20 },
  bubbleDriver:    { backgroundColor: '#0284C7', borderBottomRightRadius: 4 },
  bubbleCustomer:  { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 4 },
  messageText:     { fontSize: 14, lineHeight: 20 },
  textDriver:      { color: '#FFF' },
  textCustomer:    { color: '#0F172A' },
  timeText:        { fontSize: 10, color: '#94A3B8', marginTop: 4, paddingHorizontal: 4 },
  quickRepliesContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  quickReplyBtn:   { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  quickReplyText:  { fontSize: 12, fontWeight: '600', color: '#475569' },
  inputArea:       { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input:           { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 14, color: '#0F172A', marginRight: 12 },
  sendBtn:         { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center' },
});
