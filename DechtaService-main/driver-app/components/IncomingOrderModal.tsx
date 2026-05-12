import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Animated, Easing, SafeAreaView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';

interface IncomingOrderModalProps {
  order: any;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

export default function IncomingOrderModal({ order, onAccept, onDecline }: IncomingOrderModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const orderId = order?.id ? String(order.id) : null;

  // Ping Animations for Background
  const pingAnim1 = useRef(new Animated.Value(0)).current;
  const pingAnim2 = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    // Slide up the modal smoothly
    Animated.timing(slideUpAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.poly(4)),
      useNativeDriver: true,
    }).start();

    // Radar Ping Animations
    const createPing = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    };

    createPing(pingAnim1, 0);
    createPing(pingAnim2, 1000);
  }, [pingAnim1, pingAnim2, slideUpAnim]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!orderId) return;
    if (timeLeft <= 0) {
      onDecline(orderId); // Auto-decline
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [onDecline, orderId, timeLeft]);

  // SVG Circle Math
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 30) * circumference;

  if (!order || !orderId) return null;

  const isDanger = timeLeft <= 10;
  const timerColor = isDanger ? '#EF4444' : '#0284C7'; // Red if <= 10s, Brand Blue otherwise

  return (
    <Modal visible={true} transparent animationType="none">
      <View style={styles.overlay}>
        
        {/* RADAR PING ANIMATION BACKGROUND */}
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.pingCircle, {
            transform: [{ scale: pingAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.5] }) }],
            opacity: pingAnim1.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0, 0] })
          }]} />
          <Animated.View style={[styles.pingCircle, {
            transform: [{ scale: pingAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.5] }) }],
            opacity: pingAnim2.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.6, 0, 0] })
          }]} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideUpAnim }] }]}>
            
            {/* CIRCULAR TIMER (Overlapping the top) */}
            <View style={styles.timerContainer}>
              <View style={styles.timerBox}>
                <Svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle cx="48" cy="48" r={radius} stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                  <Circle 
                    cx="48" cy="48" r={radius} 
                    stroke={timerColor} 
                    strokeWidth="6" 
                    fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    strokeLinecap="round" 
                  />
                </Svg>
                <View style={styles.timerTextCont}>
                  <Text style={[styles.timerNumber, isDanger && styles.timerNumberDanger]}>{timeLeft}</Text>
                  <Text style={styles.timerLabel}>SEC</Text>
                </View>
              </View>
            </View>

            {/* HEADER TEXT */}
            <View style={styles.headerTextCont}>
              <Text style={styles.title}>NEW ORDER PING!</Text>
              <Text style={styles.subtitle}>Delivery Request via {order.vendor_shop_name || 'Partner Store'}</Text>
            </View>

            {/* ORDER DETAILS CARD */}
            <View style={styles.detailsCard}>
              
              <View style={styles.topRow}>
                <View>
                  <Text style={styles.label}>ESTIMATED PAYOUT</Text>
                  <Text style={styles.payoutValue}>₹{order.delivery_fee || order.final_total || '150'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.label}>DISTANCE</Text>
                  <Text style={styles.distanceValue}>{order.distance || '4.2 km'}</Text>
                </View>
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.routeTimeline}>
                  <View style={styles.pickupDot} />
                  {/* Dashed Line using SVG */}
                  <Svg height="32" width="2" style={{ marginVertical: 4 }}>
                    <Line x1="1" y1="0" x2="1" y2="32" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
                  </Svg>
                  <View style={styles.dropDot} />
                </View>
                
                <View style={styles.routeAddresses}>
                  <View style={styles.addressBlock}>
                    <Text style={styles.label}>PICKUP LOCATION</Text>
                    <Text style={styles.addressText} numberOfLines={1}>{order.vendor_shop_name || order.pickup_address}</Text>
                  </View>
                  <View style={styles.addressBlock}>
                    <Text style={styles.label}>DROPOFF LOCATION</Text>
                    <Text style={styles.addressText} numberOfLines={1}>{order.delivery_address || order.client_address || 'Customer Location'}</Text>
                  </View>
                </View>
              </View>

            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => onDecline(orderId)} style={styles.declineBtn}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onAccept(orderId)} style={styles.acceptBtn}>
                <Feather name="check" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.acceptText}>Accept Order</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  safeArea: { width: '100%', alignItems: 'center' },
  
  // Ping Animations
  pingCircle: { position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: 100, backgroundColor: '#0284C7' },

  // Modal Container
  modalContent: { width: '100%', backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingTop: 40, paddingBottom: 40, elevation: 20, boxShadow: '0px -10px 20px rgba(0,0,0,0.2)' },

  // Top Overlapping Timer
  timerContainer: { position: 'absolute', top: -48, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  timerBox: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 10, boxShadow: '0px 5px 10px rgba(0,0,0,0.15)' },
  timerTextCont: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerNumber: { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  timerNumberDanger: { color: '#EF4444' },
  timerLabel: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8' },

  // Headers
  headerTextCont: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: 1, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748B' },

  // Card
  detailsCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 16, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  payoutValue: { fontSize: 36, fontWeight: '900', color: '#0284C7' },
  distanceValue: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 8 },

  routeContainer: { flexDirection: 'row' },
  routeTimeline: { alignItems: 'center', width: 24, marginTop: 4 },
  pickupDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#F59E0B', borderWidth: 3, borderColor: '#FEF3C7' },
  dropDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#D1FAE5' },
  
  routeAddresses: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  addressBlock: { height: 44, justifyContent: 'center' },
  addressText: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },

  // Buttons
  actionRow: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFF' },
  declineText: { fontSize: 16, fontWeight: 'bold', color: '#475569' },
  acceptBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, backgroundColor: '#0284C7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 8, boxShadow: '0px 5px 10px rgba(2,132,199,0.4)' },
  acceptText: { fontSize: 16, fontWeight: '900', color: '#FFF' }
});
