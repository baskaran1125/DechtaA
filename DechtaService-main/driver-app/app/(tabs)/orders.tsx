import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  Modal, TextInput, Alert, Linking, Platform, ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import ChatModal from '../../components/ChatModal';
import { OrdersAPI, DriverAPI } from '../../services/api';
import { openCamera, openGallery } from '../../utils/fileUpload';
import { watchPositionAsync, requestLocationPermission, LocationSubscription } from '../../utils/geolocation';
import { isWeb } from '../../utils/platform';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS — no more mock data
// ═══════════════════════════════════════════════════════════════════════════
const cancelReasonsList = [
  "Customer is unreachable",
  "Vehicle breakdown / issue",
  "Heavy traffic / area blocked",
  "Incorrect address provided",
  "Package too large for vehicle",
  "Personal emergency"
];

// ═══════════════════════════════════════════════════════════════════════════
// VEHICLE PROFILES
// ═══════════════════════════════════════════════════════════════════════════
const VEHICLE_PROFILES: Record<string, { osrm: string; color: string; altColor: string; label: string; emoji: string }> = {
  '2 Wheeler':  { osrm: 'bike',    color: '#7C3AED', altColor: '#A78BFA', label: '2-Wheeler',  emoji: '🛵' },
  '3 Wheeler':  { osrm: 'driving', color: '#0284C7', altColor: '#38BDF8', label: '3-Wheeler',  emoji: '🛺' },
  'Mini Truck': { osrm: 'driving', color: '#0284C7', altColor: '#38BDF8', label: 'Mini Truck', emoji: '🚚' },
};
const DEFAULT_PROFILE = { osrm: 'driving', color: '#0284C7', altColor: '#38BDF8', label: 'Vehicle', emoji: '🚗' };

function formatTimeLeft(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

const buildLeafletHTML = (
  driver:      { latitude: number; longitude: number },
  pickup:      { latitude: number; longitude: number },
  drop:        { latitude: number; longitude: number },
  step:        number,
  pickupLabel: string,
  dropLabel:   string,
  vehicleType: string
) => {
  const vp = VEHICLE_PROFILES[vehicleType] ?? DEFAULT_PROFILE;
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
    .mk{display:flex;align-items:center;justify-content:center;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.35)}
    .mk-driver{width:46px;height:46px;animation:driverPulse 2s infinite}
    @keyframes driverPulse{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,.45),0 2px 12px rgba(0,0,0,.35)}60%{box-shadow:0 0 0 14px rgba(124,58,237,0),0 2px 12px rgba(0,0,0,.35)}}
    .mk-pickup{width:42px;height:42px;background:#22C55E}
    .mk-drop{width:42px;height:42px;background:#EF4444}
    .lbl{font-size:13px;font-weight:700;color:#0F172A;white-space:nowrap;padding:4px 10px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15)}
    #infoBar{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.96);border-radius:20px;z-index:1000;padding:8px 16px;display:flex;gap:18px;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.15);min-width:220px;justify-content:center}
    #infoBar .pill{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#0F172A}
    #infoBar .accent{color:var(--vc)}
    #routePanel{position:absolute;bottom:10px;left:8px;right:8px;z-index:1000;display:flex;flex-direction:column;gap:6px}
    .routeChip{background:rgba(255,255,255,.96);border-radius:16px;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 3px 12px rgba(0,0,0,.12);cursor:pointer;border:2px solid transparent;transition:border .2s}
    .routeChip.active{border-color:var(--vc)}
    .routeChip .chipLeft{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:#0F172A}
    .routeChip .tag{font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.5px}
    .routeChip .best-tag{background:#DCFCE7;color:#16A34A}
    .routeChip .alt-tag{background:#F1F5F9;color:#64748B}
    .routeChip .nums{font-size:12px;font-weight:600;color:#64748B;text-align:right}
    #mapCtrl{position:absolute;right:10px;top:60px;z-index:1000;display:flex;flex-direction:column;gap:8px}
    .ctrlBtn{width:40px;height:40px;background:#fff;border-radius:12px;border:none;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;font-size:18px}
    #vBadge{position:absolute;left:10px;top:10px;z-index:1000;background:rgba(255,255,255,.96);border-radius:14px;padding:6px 14px;font-size:12px;font-weight:800;color:var(--vc);box-shadow:0 2px 10px rgba(0,0,0,.12)}
    .leaflet-control-zoom{display:none}
    .leaflet-control-attribution{font-size:8px;opacity:.35}
  </style>
</head>
<body>
<div id="map"></div>
<div id="vBadge">${vp.emoji} ${vp.label}</div>
<div id="infoBar">
  <div class="pill">📍 <span class="accent" id="distVal">…</span> km</div>
  <div style="width:1px;height:20px;background:#E2E8F0"></div>
  <div class="pill">⏱ <span class="accent" id="durVal">…</span> min</div>
  <div style="width:1px;height:20px;background:#E2E8F0"></div>
  <div class="pill" id="etaPill">🕐 <span class="accent" id="etaVal">…</span></div>
</div>
<div id="mapCtrl">
  <button class="ctrlBtn" id="btnFit">⛶</button>
  <button class="ctrlBtn" id="btnZin">+</button>
  <button class="ctrlBtn" id="btnZot">−</button>
  <button class="ctrlBtn" id="btnLyr">🛰</button>
</div>
<div id="routePanel"></div>
<script>
(async()=>{
  const VC='${vp.color}';
  const VA='${vp.altColor}';
  document.documentElement.style.setProperty('--vc', VC);
  const map=L.map('map',{zoomControl:false,attributionControl:true});
  const streetLayer=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'});
  const satLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri'});
  streetLayer.addTo(map);
  let isSat=false;
  document.getElementById('btnLyr').onclick=()=>{isSat=!isSat;isSat?satLayer.addTo(map):map.removeLayer(satLayer);document.getElementById('btnLyr').textContent=isSat?'🗺':'🛰';};
  const driver=[${driver.latitude},${driver.longitude}];
  const pickup=[${pickup.latitude},${pickup.longitude}];
  const drop  =[${drop.latitude},${drop.longitude}];
  const step  =${step};
  const osrmMode='${vp.osrm}';
  const navSvg='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>';
  const boxSvg='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
  const pinSvg='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  function mkIcon(bg,svg,anim){return L.divIcon({className:'',iconSize:[46,46],iconAnchor:[23,23],html:'<div class="mk '+(anim?'mk-driver':'')+'" style="background:'+bg+'">'+svg+'</div>'});}
  const driverMk=L.marker(driver,{icon:mkIcon(VC,navSvg,true),zIndexOffset:1000}).addTo(map).bindPopup('<div class="lbl">${vp.emoji} You (Driver)</div>');
  const pickupMk=L.marker(pickup,{icon:mkIcon('#22C55E',boxSvg,false)}).addTo(map).bindPopup('<div class="lbl">📦 ${pickupLabel.replace(/'/g, "\\'")}</div>');
  const dropMk=L.marker(drop,{icon:mkIcon('#EF4444',pinSvg,false)}).addTo(map).bindPopup('<div class="lbl">🏠 ${dropLabel.replace(/'/g, "\\'")}</div>');
  function calcETA(min){const now=new Date();now.setMinutes(now.getMinutes()+min);return now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
  let activePolylines=[];
  function clearRoutes(){activePolylines.forEach(l=>map.removeLayer(l));activePolylines=[];}
  async function fetchOSRM(from,to,alt){
    const base='https://router.project-osrm.org/route/v1/'+osrmMode+'/';
    const coords=from[1]+','+from[0]+';'+to[1]+','+to[0];
    const url=base+coords+'?overview=full&geometries=geojson&alternatives='+(alt?'true':'false')+'&steps=false';
    try{const res=await fetch(url);const d=await res.json();if(d.code!=='Ok'||!d.routes.length)throw new Error('no-route');return d.routes;}catch(e){return null;}
  }
  function drawRoute(coords,color,weight,opacity,dash){
    const shadow=L.polyline(coords,{color:'#000',weight:weight+4,opacity:0.08,lineJoin:'round',lineCap:'round'}).addTo(map);
    const line=L.polyline(coords,{color,weight,opacity,dashArray:dash,lineJoin:'round',lineCap:'round'}).addTo(map);
    activePolylines.push(shadow,line);return line;
  }
  function buildRoutePanel(routes,primaryColor,altColor,onSelect){
    const panel=document.getElementById('routePanel');panel.innerHTML='';
    routes.forEach((r,i)=>{
      const km=(r.distance/1000).toFixed(1);const min=Math.ceil(r.duration/60);
      const chip=document.createElement('div');chip.className='routeChip'+(i===0?' active':'');
      const tagClass=i===0?'best-tag':i===1?'alt-tag':'via-tag';const tagText=i===0?'Fastest':i===1?'Alternate':'Via Highway';
      chip.innerHTML='<div class="chipLeft"><div class="tag '+tagClass+'">'+tagText+'</div><span>'+km+' km · '+min+' min</span></div><div class="nums">ETA '+calcETA(min)+'</div>';
      chip.onclick=()=>{document.querySelectorAll('.routeChip').forEach(c=>c.classList.remove('active'));chip.classList.add('active');onSelect(i,km,min);};
      panel.appendChild(chip);
    });
  }
  let allRoutes=[];let drawnLines=[];
  async function loadRoutes(){
    clearRoutes();drawnLines=[];
    const from=step===0?driver:pickup;const to=step===0?pickup:drop;
    const mainColor=step===0?VC:'#10B981';const altC=step===0?VA:'#6EE7B7';
    const routes=await fetchOSRM(from,to,true);
    if(!routes){drawRoute([from,to],mainColor,5,0.8,'10 6');document.getElementById('distVal').textContent='N/A';document.getElementById('durVal').textContent='N/A';return;}
    allRoutes=routes;
    routes.forEach((r,i)=>{const pts=r.geometry.coordinates.map(([lng,lat])=>[lat,lng]);const color=i===0?mainColor:altC;const w=i===0?6:4;const op=i===0?0.92:0.55;const dash=i===0?null:'8 5';const l=drawRoute(pts,color,w,op,dash);drawnLines.push({line:l,pts,r});});
    const primary=routes[0];const km=(primary.distance/1000).toFixed(1);const min=Math.ceil(primary.duration/60);
    document.getElementById('distVal').textContent=km;document.getElementById('durVal').textContent=min;document.getElementById('etaVal').textContent=calcETA(min);
    buildRoutePanel(routes,mainColor,altC,(idx,km,min)=>{document.getElementById('distVal').textContent=km;document.getElementById('durVal').textContent=min;document.getElementById('etaVal').textContent=calcETA(parseInt(min));if(drawnLines[idx]){const pts=drawnLines[idx].pts;map.fitBounds(L.latLngBounds(pts),{padding:[60,60]});}});
    map.fitBounds(L.latLngBounds([from,to,...(step===0?[drop]:[driver])]),{padding:[60,60]});
  }
  await loadRoutes();
  const allPts=[driver,pickup,drop];
  document.getElementById('btnFit').onclick=()=>map.fitBounds(L.latLngBounds(allPts),{padding:[55,55]});
  document.getElementById('btnZin').onclick=()=>map.zoomIn();
  document.getElementById('btnZot').onclick=()=>map.zoomOut();
  setInterval(()=>{driverMk.setLatLng(driver);},4000);
})();
</script>
</body>
</html>`;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ORDERS SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function OrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [tab, setTab]                         = useState<'new' | 'history'>('new');
  const [historyFilter, setHistoryFilter]     = useState('Completed');
  const [isOnline, setIsOnline]               = useState(false);
  // ── REAL STATE (no mock arrays) ──────────────────────────────────────
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders]     = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders]     = useState(false);
  const [loadingHistory, setLoadingHistory]   = useState(false);

  const [activeTrip, setActiveTrip]           = useState<any>(null);
  const [navigatingOrder, setNavigatingOrder] = useState<any>(null);
  const [driverLocation, setDriverLocation]   = useState<{ latitude: number; longitude: number } | null>(null);
  const locationSubscription                  = useRef<LocationSubscription | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isAckModalOpen, setIsAckModalOpen]       = useState(false);
  const [isChatOpen, setIsChatOpen]               = useState(false);

  const [cancelReason, setCancelReason] = useState('');
  const [otpInput, setOtpInput]         = useState('');
  const [packagePhoto, setPackagePhoto] = useState<string | null>(null);
  const [driverSuspension, setDriverSuspension] = useState({
    isSuspended: false,
    suspendedUntil: null as string | null,
    suspensionReason: null as string | null,
    cancellationCountToday: 0,
    maxDailyCancellations: 5,
    suspensionDurationHours: 8,
    remainingMs: 0,
  });
  const [suspensionCountdown, setSuspensionCountdown] = useState('');
  const activeTripRef = useRef<any>(null);
  const gpsSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Computed GPS coords from active trip (real Supabase data) ────────
  const pickupLocation = {
    latitude:  activeTrip?.pickup_lat  ?? activeTrip?.pickup_latitude  ?? 13.0900,
    longitude: activeTrip?.pickup_lng  ?? activeTrip?.pickup_longitude ?? 80.2800,
  };
  const dropLocation = {
    latitude:  activeTrip?.drop_lat    ?? activeTrip?.drop_latitude    ?? 13.1050,
    longitude: activeTrip?.drop_lng    ?? activeTrip?.drop_longitude   ?? 80.2600,
  };

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  // ── Load online status + available orders on mount ───────────────────
  // ── Re-sync online status + orders every time this tab comes into focus ──
  // This is critical: tabs stay mounted in the background, so a plain useEffect([])
  // won't re-run when the user switches from Home (where they went online) to Orders.
  useFocusEffect(
    useCallback(() => {
      loadOnlineStatus();
      // Always refresh history when this tab is focused
      fetchHistory(historyFilter);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyFilter])
  );

  const loadOnlineStatus = async () => {
    try {
      const profile = await DriverAPI.getProfile();
      if (profile.success && profile.data?.profile) {
        const online = profile.data.profile.is_online || false;
        const suspension = profile.data.profile.suspension || {};
        const isSuspended = Boolean(suspension.is_suspended);

        setDriverSuspension({
          isSuspended,
          suspendedUntil: suspension.suspended_until || null,
          suspensionReason: suspension.suspension_reason || null,
          cancellationCountToday: suspension.cancellation_count_today || 0,
          maxDailyCancellations: suspension.max_daily_cancellations || 5,
          suspensionDurationHours: suspension.suspension_duration_hours || 8,
          remainingMs: suspension.remaining_ms || 0,
        });

        setIsOnline(isSuspended ? false : online);
        if (online && !isSuspended) fetchAvailableOrders();
        else setAvailableOrders([]); // clear stale orders if now offline or suspended
      }
    } catch {
      // If profile fails, still attempt to fetch — API returns empty if offline
      fetchAvailableOrders();
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      setLoadingOrders(true);
      const result = await OrdersAPI.getAvailable();
      if (result.success) {
        // Check if driver is offline from response
        if (result.isOnline === false) {
          setAvailableOrders([]);
          setLoadingOrders(false);
          return;
        }
        
        const normalized = (result.data || []).map((o: any) => ({
          id: String(o.id),
          type: o.product_name || o.order_type || 'Delivery',
          vehicle_type: o.vehicle_type ? String(o.vehicle_type).trim() : 'Unknown',
          payout: o.delivery_fee || o.total_amount || 0,
          distance: o.distance_text || '',
          pickup: o.pickup_address || o.vendor_shop_name || 'Pickup',
          drop: o.delivery_address || o.client_address || 'Drop',
          pickup_lat: o.pickup_latitude,
          pickup_lng: o.pickup_longitude,
          drop_lat: o.delivery_latitude,
          drop_lng: o.delivery_longitude,
          status: 'Pending',
        }));
        setAvailableOrders(normalized);
      }
    } catch (e) {
      console.log('Fetch orders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  };



  const fetchHistory = async (status: string) => {
    try {
      setLoadingHistory(true);
      const result = await OrdersAPI.getHistory(status);
      if (result.success) {
        const normalized = (result.data || []).map((t: any) => ({
          id:            String(t.id),
          tripId:        t.id,
          // DB returns flat row — product_name is direct, NOT nested under t.orders
          type:          t.product_name || t.orders?.product_name || 'Delivery',
          pickup:        t.pickup_address  || '—',
          drop:          t.delivery_address || '—',
          client:        t.client_name     || '—',
          payout:        parseFloat(t.payout_amount || 0),
          distance:      t.distance_text   || '—',
          // status comes from DB — map delivery_trips.status to display label
          status:        t.status === 'delivered' ? 'Completed'
                       : t.status === 'cancelled' ? 'Cancelled'
                       : t.status === 'missed'    ? 'Missed'
                       : status,
          date:          t.completed_at
                           ? new Date(t.completed_at).toLocaleDateString('en-IN', {
                               day: '2-digit', month: 'short', year: 'numeric',
                             })
                           : t.started_at
                             ? new Date(t.started_at).toLocaleDateString('en-IN')
                             : '',
          cancel_reason: t.cancel_reason   || null,
        }));
        setHistoryOrders(normalized);
      } else {
        setHistoryOrders([]);
      }
    } catch (e) {
      console.log('Fetch history error:', e);
      setHistoryOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── Parse incoming order from Home tab (accepted via socket/notification) ──
  useEffect(() => {
    if (params.incomingOrder) {
      try {
        const order = JSON.parse(params.incomingOrder as string);
        setActiveTrip({ ...order, step: 0 });
        router.setParams({ incomingOrder: '' });
      } catch (e) { console.log('Error parsing incoming order:', e); }
    }
  }, [params.incomingOrder, router]);

  // ── Check for already-active trip on mount ───────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const result = await OrdersAPI.getActive();
        if (result.success && result.data) {
          const t = result.data;
          const o = t.orders || {};
          setActiveTrip({
            id: String(t.order_id),
            tripId: t.id,
            type: o.product_name || 'Delivery',
            payout: t.payout_amount || o.delivery_fee || 0,
            pickup: o.pickup_address || o.vendor_shop_name || 'Pickup',
            drop: o.delivery_address || 'Drop',
            pickup_lat: o.pickup_latitude,
            pickup_lng: o.pickup_longitude,
            drop_lat: o.delivery_latitude,
            drop_lng: o.delivery_longitude,
            vehicle_type: o.vehicle_type || '',
            distance: t.distance_text || '',
            step: t.status === 'picked_up' ? 1 : 0,
          });
        }
      } catch {}
    })();
  }, []);

  // ── GPS tracking while trip is active ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (activeTrip) {
      (async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          // If permission denied, use fallback location (slight offset from pickup)
          if (!cancelled) {
            setDriverLocation({ latitude: pickupLocation.latitude - 0.006, longitude: pickupLocation.longitude + 0.004 });
          }
          return;
        }
        
        // Watch position (works on both web and mobile)
        locationSubscription.current = watchPositionAsync(
          (coords) => {
            if (cancelled) return;
            setDriverLocation({ latitude: coords.latitude, longitude: coords.longitude });

            if (gpsSendTimerRef.current) {
              clearTimeout(gpsSendTimerRef.current);
            }

            gpsSendTimerRef.current = setTimeout(() => {
              const tripId = activeTripRef.current?.tripId || activeTripRef.current?.id;
              if (tripId) {
                DriverAPI.sendGps(
                  tripId,
                  coords.latitude,
                  coords.longitude,
                  coords.accuracy,
                  coords.speed,
                  coords.heading
                ).catch((error) => console.log('GPS API error:', error));
              }
              gpsSendTimerRef.current = null;
            }, 1000);
          },
          (error) => {
            console.error('GPS tracking error:', error);
            // Fallback to pickup location if tracking fails
            if (!cancelled) {
              setDriverLocation({ latitude: pickupLocation.latitude - 0.006, longitude: pickupLocation.longitude + 0.004 });
            }
          }
        );
      })();
    } else {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
      setDriverLocation(null);
    }
    return () => {
      cancelled = true;
      if (gpsSendTimerRef.current) {
        clearTimeout(gpsSendTimerRef.current);
        gpsSendTimerRef.current = null;
      }
      locationSubscription.current?.remove();
    };
  }, [activeTrip, pickupLocation.latitude, pickupLocation.longitude]);

  useEffect(() => {
    if (!driverSuspension.isSuspended || !driverSuspension.suspendedUntil) {
      setSuspensionCountdown('');
      return;
    }

    const updateCountdown = () => {
      const remaining = new Date(driverSuspension.suspendedUntil as string).getTime() - Date.now();
      if (remaining <= 0) {
        setSuspensionCountdown('');
        setDriverSuspension(prev => ({
          ...prev,
          isSuspended: false,
          suspendedUntil: null,
          suspensionReason: null,
          remainingMs: 0,
        }));
        loadOnlineStatus();
        return;
      }

      setSuspensionCountdown(formatTimeLeft(remaining));
      setDriverSuspension(prev => ({
        ...prev,
        remainingMs: remaining,
      }));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [driverSuspension.isSuspended, driverSuspension.suspendedUntil]);

  // ── Actions ──────────────────────────────────────────────────────────

  const handleAccept = async (order: any) => {
    try {
      const result = await OrdersAPI.accept(order.id);
      if (result.success && result.trip?.id) {
        // Remove from available list and proceed with real trip UUID
        setAvailableOrders(prev => prev.filter(o => o.id !== order.id));
        setNavigatingOrder({
          ...order,
          tripId: result.trip.id,     // UUID — used for all trip API calls
          payout: result.trip.payout_amount || order.delivery_fee || 0,
        });
      } else {
        // Backend rejected — show error, keep order in list
        const msg = result.message || 'Could not accept order. Please try again.';
        if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
        else { Alert.alert('Error', msg); }
      }
    } catch (e: any) {
      const msg = e.message || 'Network error. Please check your connection.';
      if (Platform.OS === 'web') { window.alert('Error\n\n' + msg); }
      else { Alert.alert('Error', msg); }
    }
  };

  const handleIgnore = async (order: any) => {
    try {
      await OrdersAPI.ignore(order.id);
    } catch {}
    setAvailableOrders(prev => prev.filter(o => o.id !== order.id));
    setHistoryOrders(prev => [{ ...order, status: 'Missed', date: new Date().toLocaleDateString('en-IN') }, ...prev]);
  };

  const handleGoToLocation = () => {
    const order = navigatingOrder;
    if (!order?.tripId) {
      // Safety check — tripId must exist before starting trip
      if (Platform.OS === 'web') { window.alert('Error\n\nTrip ID missing. Please accept the order again.'); }
      else { Alert.alert('Error', 'Trip ID missing. Please accept the order again.'); }
      setNavigatingOrder(null);
      return;
    }
    setNavigatingOrder(null);
    setActiveTrip({ ...order, step: 0 });
  };

  const handleStartVoiceNavigation = () => {
    const lat = activeTrip?.step === 0 ? pickupLocation.latitude  : dropLocation.latitude;
    const lng = activeTrip?.step === 0 ? pickupLocation.longitude : dropLocation.longitude;
    const vType = activeTrip?.vehicle_type ?? '';
    const isBike = vType === '2 Wheeler';
    const iosMode   = isBike ? 'bicycling' : 'driving';
    const droidMode = isBike ? 'b' : 'd';
    const url = Platform.select({
      ios:     `comgooglemaps://?daddr=${lat},${lng}&directionsmode=${iosMode}`,
      android: `google.navigation:q=${lat},${lng}&mode=${droidMode}`,
      web:     `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${iosMode}`,
    });
    if (url) Linking.canOpenURL(url).then(ok => {
      if (ok) Linking.openURL(url);
      else Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${iosMode}`);
    });
  };

  const handleArrivePickup = () => setIsAckModalOpen(true);

  const handleOpenCamera = async () => {
    if (isWeb) {
      // On web, open file gallery instead of camera
      const result = await openGallery();
      if (result) {
        setPackagePhoto(result.uri);
      }
    } else {
      // On mobile, use camera
      const result = await openCamera();
      if (result) {
        setPackagePhoto(result.uri);
      }
    }
  };

  const handleConfirmAck = async () => {
    if (!packagePhoto) {
      if (Platform.OS === 'web') { window.alert('Photo Required\n\nPlease take a photo of the package before proceeding.'); }
      else { Alert.alert('Photo Required', 'Please take a photo of the package before proceeding.'); }
      return;
    }
    // Upload photo to backend
    try {
      const tripId = activeTrip?.tripId || activeTrip?.id;
      if (tripId) await OrdersAPI.confirmPickup(tripId, packagePhoto);
    } catch {}

    setIsAckModalOpen(false);
    if (activeTrip?.step === 0) {
      setActiveTrip({ ...activeTrip, step: 1 });
      setPackagePhoto(null);
      Alert.alert('Pickup Confirmed', "Navigate to the customer's delivery location.");
    }
  };

  const handleArriveDropoff = async () => {
    if (activeTrip?.step === 1) {
      try {
        const tripId = activeTrip?.tripId || activeTrip?.id;
        if (tripId) {
          await OrdersAPI.arrivedDropoff(tripId);
        }
      } catch {}
      setOtpInput('');
      setActiveTrip({ ...activeTrip, step: 2 });
    }
  };

  // ── OTP Verification ─────────────────────────────────────────────────
  // Driver must enter OTP provided by customer from the client app/SMS.
  // Verification always happens on backend.
  const handleVerifyOtp = async () => {
    if (otpInput.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter the 4-digit OTP provided by the customer.');
      setOtpInput('');
      return;
    }

    try {
      const tripId = activeTrip?.tripId || activeTrip?.id;
      const result = await OrdersAPI.complete(tripId, otpInput);

      if (result.success) {
        const earned = result.payout || activeTrip?.payout || 0;
        if (Platform.OS === 'web') {
          window.alert(`🎉 Delivery Completed!\n\n₹${earned} has been added to your Wallet.`);
        } else {
          Alert.alert('🎉 Delivery Completed!', `₹${earned} has been added to your Wallet.`,
            [{ text: 'Great!', style: 'default' }]);
        }
        setHistoryOrders(prev => [
          { ...(activeTrip || {}), status: 'Completed', date: new Date().toLocaleDateString('en-IN') },
          ...prev,
        ]);
        setAvailableOrders(prev => prev.filter(o => o.id !== activeTrip?.id));
        setActiveTrip(null);
        setOtpInput('');
        setTab('history');
        setHistoryFilter('Completed');
        fetchHistory('Completed');
      } else {
        Alert.alert('Invalid OTP', result.message || 'Incorrect OTP. Please try again.');
        setOtpInput('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Verification failed. Please try again.');
      setOtpInput('');
    }
  };

  // ── Cancel — real API ─────────────────────────────────────────────────
  const confirmCancelTrip = async () => {
    if (!cancelReason || driverSuspension.isSuspended) return;
    const nextCancellationCount = driverSuspension.cancellationCountToday + 1;
    let suspensionFromServer: any = null;
    let suspensionApplied = false;
    try {
      const tripId = activeTrip?.tripId || activeTrip?.id;
      if (tripId) {
        const result = await OrdersAPI.cancel(tripId, cancelReason);
        if (result?.suspension) {
          suspensionFromServer = result.suspension;
          suspensionApplied = Boolean(result.suspension.isSuspended);
        }
      }
    } catch (e) {
      console.log('Cancel API error (continuing locally):', e);
    }
    const maxDailyCancellations = driverSuspension.maxDailyCancellations || 5;
    if (suspensionFromServer) {
      setDriverSuspension({
        isSuspended: Boolean(suspensionFromServer.isSuspended),
        suspendedUntil: suspensionFromServer.suspendedUntil || null,
        suspensionReason: suspensionFromServer.suspensionReason || null,
        cancellationCountToday: suspensionFromServer.cancellationCount || nextCancellationCount,
        maxDailyCancellations: suspensionFromServer.maxDailyCancellations || maxDailyCancellations,
        suspensionDurationHours: suspensionFromServer.suspensionDurationHours || driverSuspension.suspensionDurationHours,
        remainingMs: suspensionFromServer.remainingMs || 0,
      });
    } else {
      const updatedCancellationCount = nextCancellationCount;
      const cancellationsLeft = Math.max(0, maxDailyCancellations - updatedCancellationCount);
      if (!driverSuspension.isSuspended && cancellationsLeft <= 0) {
        suspensionApplied = true;
        setDriverSuspension(prev => ({
          ...prev,
          cancellationCountToday: updatedCancellationCount,
          isSuspended: true,
          suspensionReason: 'Cancelled 5 orders today',
          suspendedUntil: new Date(Date.now() + (driverSuspension.suspensionDurationHours || 8) * 60 * 60 * 1000).toISOString(),
          remainingMs: (driverSuspension.suspensionDurationHours || 8) * 60 * 60 * 1000,
        }));
      } else {
        setDriverSuspension(prev => ({
          ...prev,
          cancellationCountToday: updatedCancellationCount,
        }));
      }
    }
    setHistoryOrders(prev => [{ ...(activeTrip || {}), status: 'Cancelled', cancel_reason: cancelReason, date: new Date().toLocaleDateString('en-IN') }, ...prev]);
    setAvailableOrders(prev => prev.filter(o => o.id !== activeTrip?.id));
    setActiveTrip(null); setIsCancelModalOpen(false); setCancelReason(''); setPackagePhoto(null);
    if (suspensionApplied) {
      Alert.alert('Cancelled', `Order cancelled. You are suspended for ${driverSuspension.suspensionDurationHours || 8} hours because you cancelled too many orders today.`);
    } else {
      Alert.alert('Cancelled', 'Order has been cancelled.');
    }
    setTab('history'); setHistoryFilter('Cancelled');
    fetchHistory('Cancelled');
  };

  const mapHtml = driverLocation
    ? buildLeafletHTML(
        driverLocation, pickupLocation, dropLocation,
        activeTrip?.step ?? 0,
        activeTrip?.pickup ?? 'Pickup',
        activeTrip?.drop   ?? 'Drop-off',
        activeTrip?.vehicle_type ?? ''
      )
    : null;

  const activeAvailableOrders = availableOrders.filter(
    o => !['Cancelled', 'Completed', 'Missed', 'Accepted'].includes(o.status)
  );
  // historyOrders already contain the correct status from DB
  // No client-side filter needed — fetchHistory fetches the correct status from backend
  const filteredHistory = historyOrders;

  const handleTabSwitch = (newTab: 'new' | 'history') => {
    setTab(newTab);
    if (newTab === 'history') {
      fetchHistory(historyFilter);
    } else {
      fetchAvailableOrders();
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      {/* ONLINE STATUS — read only. Toggle online/offline from the Home screen. */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: isOnline ? '#ECFDF5' : '#FEF2F2',
        borderBottomWidth: 1,
        borderBottomColor: isOnline ? '#BBF7D0' : '#FECACA',
      }}>
        {/* Pulsing dot */}
        <View style={{
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: isOnline ? '#10B981' : '#EF4444',
        }} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: isOnline ? '#16A34A' : '#DC2626', flex: 1 }}>
          {isOnline ? 'You are Online — Ready to receive orders' : 'You are Offline'}
        </Text>
        {!isOnline && (
          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>
            Go online from Home ↗
          </Text>
        )}
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBg}>
          <TouchableOpacity onPress={() => handleTabSwitch('new')} style={[styles.tabBtn, tab==='new' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab==='new' && styles.tabTextActive]}>Available</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleTabSwitch('history')} style={[styles.tabBtn, tab==='history' && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab==='history' && styles.tabTextActive]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
        {tab === 'new' ? (
          loadingOrders ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.emptySub}>Loading orders...</Text>
            </View>
          ) : activeAvailableOrders.length > 0 ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.dotPulse} />
                <Text style={styles.sectionHeader}>NEW REQUESTS</Text>
              </View>
              {activeAvailableOrders.map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.rowBetween}>
                    <View>
                      <View style={styles.vehicleBadge}><Text style={styles.vehicleBadgeText}>{order.vehicle_type} #{order.id}</Text></View>
                      <Text style={styles.orderTitle}>{order.type}</Text>
                    </View>
                    <View style={{alignItems:'flex-end'}}>
                      <Text style={styles.orderPayout}>₹{order.payout}</Text>
                      {!!order.distance && <Text style={styles.orderDist}>{order.distance}</Text>}
                    </View>
                  </View>
                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={14} color="#94A3B8" style={{marginRight:6}}/>
                    <Text style={styles.addressText}>{order.pickup}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => handleIgnore(order)} style={styles.ignoreBtn}><Text style={styles.ignoreText}>Ignore</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAccept(order)} style={styles.acceptBtn}><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Feather
                name={isOnline ? "package" : "wifi-off"}
                size={48}
                color={isOnline ? "#CBD5E1" : "#EF4444"}
              />
              <Text style={styles.emptyTitle}>
                {isOnline ? 'No Orders Available' : 'You Are Offline'}
              </Text>
              <Text style={styles.emptySub}>
                {isOnline
                  ? "You're all caught up! Waiting for new pings..."
                  : "Go to the Home screen and turn on the toggle to go online."}
              </Text>
              {isOnline && (
                <TouchableOpacity
                  onPress={fetchAvailableOrders}
                  style={{ marginTop: 16, backgroundColor: '#EFF6FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
                >
                  <Text style={{ color: '#0284C7', fontWeight: 'bold' }}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyFiltersRow} contentContainerStyle={{paddingBottom:16}}>
              {['Completed','Cancelled','Missed'].map(f => (
                <TouchableOpacity key={f} onPress={() => { setHistoryFilter(f); fetchHistory(f); }} style={[styles.filterPill, historyFilter===f ? styles.filterPillActive : styles.filterPillInactive]}>
                  <Text style={[styles.filterText, historyFilter===f ? styles.filterTextActive : styles.filterTextInactive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {loadingHistory ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#0284C7" />
              </View>
            ) : filteredHistory.length > 0 ? filteredHistory.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.orderTitle}>{order.type}</Text>
                    <Text style={styles.orderDist}>#{order.id}</Text>
                  </View>
                  <Text style={styles.orderPayout}>₹{order.payout}</Text>
                </View>
                {order.cancel_reason && <View style={styles.reasonBox}><Text style={styles.reasonTextSmall}>Reason: {order.cancel_reason}</Text></View>}
                <View style={styles.historyFooter}>
                  <Text style={styles.historyDate}>{order.date}</Text>
                  <View style={[styles.statusBadge, order.status==='Completed'?styles.statusGreen:order.status==='Cancelled'?styles.statusRed:styles.statusGray]}>
                    <Text style={[styles.statusText,order.status==='Completed'?{color:'#15803D'}:order.status==='Cancelled'?{color:'#B91C1C'}:{color:'#475569'}]}>{order.status}</Text>
                  </View>
                </View>
              </View>
            )) : (
              <View style={styles.emptyState}>
                <Feather name="clipboard" size={48} color="#CBD5E1"/>
                <Text style={styles.emptyTitle}>No {historyFilter} Orders</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* NAVIGATION ACCEPT MODAL */}
      <Modal transparent visible={!!navigatingOrder} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.navModalContent}>
            <View style={styles.successIconBox}><Feather name="check" size={32} color="#FFF"/></View>
            <Text style={styles.navModalTitle}>Order Accepted!</Text>
            <Text style={styles.navModalSub}>Navigate to complete delivery</Text>
            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot,{backgroundColor:'#22C55E'}]}/>
                <View style={{flex:1,marginLeft:12}}>
                  <Text style={styles.routeLabel}>FROM:</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>{navigatingOrder?.pickup}</Text>
                </View>
              </View>
              <View style={styles.routeDivider}/>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot,{backgroundColor:'#0284C7'}]}/>
                <View style={{flex:1,marginLeft:12}}>
                  <Text style={styles.routeLabel}>TO:</Text>
                  <Text style={styles.routeAddress} numberOfLines={2}>{navigatingOrder?.drop}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleGoToLocation} style={styles.goBtn}>
              <Feather name="navigation" size={20} color="#FFF"/>
              <Text style={styles.goBtnText}>Open Active Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════
          FULL SCREEN LOCK: ACTIVE TRIP MAP VIEW
      ═══════════════════════════════════════════════════════════ */}
      <Modal visible={!!activeTrip} animationType="slide" transparent={false}>
        <View style={styles.activeTripContainer}>

          {/* MAP */}
          <View style={styles.mapContainer}>
            {mapHtml ? (
              <WebView
                style={StyleSheet.absoluteFill}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                scrollEnabled={false}
                javaScriptEnabled={true}
                mixedContentMode="always"
              />
            ) : (
              <>
                <LinearGradient colors={['#E0F2FE','#BAE6FD','#7DD3FC']} style={StyleSheet.absoluteFill}/>
                <View style={styles.mapPinContainer}>
                  <View style={styles.mapPulse}/>
                  <View style={styles.mapPin}><Feather name="loader" size={20} color="#FFF"/></View>
                </View>
              </>
            )}
            <View style={styles.mapTopBar}>
              <TouchableOpacity style={styles.mapBackBtn} onPress={() => Alert.alert('Trip Active','You cannot leave until the trip is completed or cancelled.')}>
                <Feather name="shield" size={24} color="#0F172A"/>
              </TouchableOpacity>
              <View style={styles.liveGpsBadge}>
                <View style={styles.liveGpsDot}/>
                <Text style={styles.liveGpsText}>Live GPS Tracking</Text>
              </View>
            </View>
          </View>

          {/* BOTTOM SHEET */}
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle}/>

            {activeTrip?.step === 0 && (
              <>
                <View style={styles.sheetTopRow}>
                  <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>STEP 1 OF 3</Text></View>
                  <View style={styles.vTypePill}><Text style={styles.vTypeText}>
                    {activeTrip?.vehicle_type === '2 Wheeler' ? '🛵' : activeTrip?.vehicle_type === '3 Wheeler' ? '🛺' : '🚚'} {activeTrip?.vehicle_type}
                  </Text></View>
                </View>
                <Text style={styles.sheetSubtitle}>NAVIGATING TO PICKUP</Text>
                <Text style={styles.sheetTitle}>On Route <Text style={{color:'#94A3B8'}}>({activeTrip?.distance || ''})</Text></Text>
                <Text style={styles.sheetAddress} numberOfLines={2}>{activeTrip?.pickup || ''}</Text>
                <View style={styles.sheetActionRow}>
                  <TouchableOpacity onPress={handleStartVoiceNavigation} style={styles.navBtn}>
                    <Feather name="navigation" size={20} color="#FFF"/>
                    <Text style={styles.navBtnText}>Navigate ↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsChatOpen(true)} style={[styles.circleBtn,{backgroundColor:'#E0F2FE'}]}>
                    <Feather name="message-circle" size={22} color="#0284C7"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:+919876543210')} style={[styles.circleBtn,{backgroundColor:'#ECFDF5'}]}>
                    <Feather name="phone" size={22} color="#16A34A"/>
                  </TouchableOpacity>
                </View>
                <View style={styles.quickStrip}>
                  <TouchableOpacity style={styles.quickChip} onPress={() => Alert.alert('Share ETA','ETA shared with customer via SMS.')}>
                    <Feather name="clock" size={15} color="#7C3AED"/>
                    <Text style={styles.quickChipText}>Share ETA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickChip} onPress={() => Alert.alert('Report Issue','Issue reported to support team.')}>
                    <Feather name="alert-triangle" size={15} color="#EF4444"/>
                    <Text style={styles.quickChipText}>Report Issue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickChip} onPress={() => Linking.openURL('https://www.google.com/maps/search/parking+near+me')}>
                    <Feather name="map-pin" size={15} color="#0284C7"/>
                    <Text style={styles.quickChipText}>Find Parking</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleArrivePickup} style={styles.arriveBtn}>
                  <Text style={styles.arriveBtnText}>Arrived at Pickup ✓</Text>
                  <Feather name="check-circle" size={24} color="#0284C7"/>
                </TouchableOpacity>
                <View style={styles.sheetCancelWrapper}>
                  <Text style={styles.sheetCancelHint}>
                    {driverSuspension.isSuspended
                      ? `Cancellation locked for ${suspensionCountdown || formatTimeLeft(driverSuspension.remainingMs)}`
                      : `${Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday)} cancellation${Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday) === 1 ? '' : 's'} left before an 8-hour suspension.`}
                  </Text>
                  <TouchableOpacity onPress={() => setIsCancelModalOpen(true)} style={styles.sheetCancelBtn}>
                    <Text style={styles.sheetCancelText}>Cancel Order</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {activeTrip?.step === 1 && (
              <>
                <View style={styles.sheetTopRow}>
                  <View style={[styles.stepBadge,{backgroundColor:'#ECFDF5'}]}>
                    <Text style={[styles.stepBadgeText,{color:'#16A34A'}]}>STEP 2 OF 3</Text>
                  </View>
                  <View style={styles.payoutPill}>
                    <Feather name="dollar-sign" size={12} color="#0284C7"/>
                    <Text style={styles.payoutPillText}>₹{activeTrip?.payout} on delivery</Text>
                  </View>
                </View>
                <Text style={[styles.sheetSubtitle,{color:'#16A34A'}]}>NAVIGATING TO CUSTOMER</Text>
                <Text style={styles.sheetTitle}>Out for Delivery</Text>
                <Text style={styles.sheetAddress} numberOfLines={2}>{activeTrip?.drop || ''}</Text>
                <View style={styles.sheetActionRow}>
                  <TouchableOpacity onPress={handleStartVoiceNavigation} style={[styles.navBtn,{backgroundColor:'#16A34A'}]}>
                    <Feather name="navigation" size={20} color="#FFF"/>
                    <Text style={styles.navBtnText}>Navigate ↗</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsChatOpen(true)} style={[styles.circleBtn,{backgroundColor:'#E0F2FE'}]}>
                    <Feather name="message-circle" size={22} color="#0284C7"/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:+919876543210')} style={[styles.circleBtn,{backgroundColor:'#ECFDF5'}]}>
                    <Feather name="phone" size={22} color="#16A34A"/>
                  </TouchableOpacity>
                </View>
                <View style={styles.quickStrip}>
                  <TouchableOpacity style={styles.quickChip} onPress={() => Alert.alert('Add Note','Note sent to customer.')}>
                    <Feather name="edit-2" size={15} color="#7C3AED"/>
                    <Text style={styles.quickChipText}>Add Note</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickChip} onPress={() => Alert.alert('Share ETA','ETA shared with customer via SMS.')}>
                    <Feather name="clock" size={15} color="#EF4444"/>
                    <Text style={styles.quickChipText}>Share ETA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickChip} onPress={() => Alert.alert('Safe Drop','Mark for safe-drop at door.')}>
                    <Feather name="home" size={15} color="#0284C7"/>
                    <Text style={styles.quickChipText}>Safe Drop</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleArriveDropoff} style={[styles.arriveBtn,{borderColor:'#10B981',backgroundColor:'#ECFDF5'}]}>
                  <Text style={[styles.arriveBtnText,{color:'#10B981'}]}>Arrived at Drop-off ✓</Text>
                  <Feather name="check-circle" size={24} color="#10B981"/>
                </TouchableOpacity>
                <View style={styles.sheetCancelWrapper}>
                  <Text style={styles.sheetCancelHint}>
                    {driverSuspension.isSuspended
                      ? `Cancellation locked for ${suspensionCountdown || formatTimeLeft(driverSuspension.remainingMs)}`
                      : `${Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday)} cancellation${Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday) === 1 ? '' : 's'} left before an 8-hour suspension.`}
                  </Text>
                  <TouchableOpacity onPress={() => setIsCancelModalOpen(true)} style={styles.sheetCancelBtn}>
                    <Text style={styles.sheetCancelText}>Cancel Order</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {activeTrip?.step === 2 && (
              <View style={styles.otpSection}>
                <View style={styles.otpIconBox}><Feather name="key" size={32} color="#0284C7"/></View>
                <Text style={styles.otpTitle}>Complete Delivery</Text>
                <Text style={styles.otpSub}>Ask customer to open the client app and share the delivery OTP.</Text>

                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter PIN from customer"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otpInput}
                  onChangeText={setOtpInput}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  style={[styles.verifyBtn, otpInput.length!==4&&{opacity:0.5}]}
                  disabled={otpInput.length!==4}
                >
                  <Text style={styles.verifyBtnText}>Verify & Earn ₹{activeTrip?.payout||0}</Text>
                </TouchableOpacity>
                <View style={styles.sheetCancelWrapper}>
                  <Text style={styles.sheetCancelHint}>
                    {driverSuspension.isSuspended
                      ? `Cancellation locked for ${suspensionCountdown || formatTimeLeft(driverSuspension.remainingMs)}`
                      : `${Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday)} cancellation${Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday) === 1 ? '' : 's'} left before an 8-hour suspension.`}
                  </Text>
                  <TouchableOpacity onPress={() => setIsCancelModalOpen(true)} style={styles.sheetCancelBtn}>
                    <Text style={styles.sheetCancelText}>Cancel Order</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ACKNOWLEDGEMENT MODAL */}
          <Modal transparent visible={isAckModalOpen} animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.ackModalContent}>
                <View style={styles.ackHeader}>
                  <View style={styles.ackIconBox}><Feather name="package" size={28} color="#0284C7"/></View>
                  <View style={{flex:1,marginLeft:12}}>
                    <Text style={styles.ackModalTitle}>Pickup Acknowledgement</Text>
                    <Text style={styles.ackModalSub}>Order #{activeTrip?.id}</Text>
                  </View>
                </View>
                <View style={styles.ackWarningBox}>
                  <Feather name="shield" size={16} color="#B45309" style={{marginRight:8}}/>
                  <Text style={styles.ackWarningText}>
                    By confirming, you accept <Text style={{fontWeight:'bold'}}>full responsibility</Text> for this package&apos;s safety until delivery.
                  </Text>
                </View>
                <View style={styles.ackChecklist}>
                  {['Package is sealed & undamaged','Correct item verified','Customer details match order'].map((item,i) => (
                    <View key={i} style={styles.ackCheckRow}>
                      <View style={styles.ackCheckDot}><Feather name="check" size={12} color="#16A34A"/></View>
                      <Text style={styles.ackCheckText}>{item}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.photoUploadBox, packagePhoto && styles.photoUploadBoxSuccess]}
                  onPress={packagePhoto ? undefined : handleOpenCamera}
                  activeOpacity={packagePhoto ? 1 : 0.75}
                >
                  {packagePhoto ? (
                    <View style={styles.photoPreviewWrapper}>
                      <Image source={{uri:packagePhoto}} style={styles.photoPreviewImage} resizeMode="cover"/>
                      <View style={styles.photoPreviewBadge}>
                        <Feather name="check-circle" size={13} color="#10B981"/>
                        <Text style={styles.photoPreviewBadgeText}>Photo Captured</Text>
                      </View>
                      <TouchableOpacity style={styles.retakeBtn} onPress={() => { setPackagePhoto(null); setTimeout(handleOpenCamera, 150); }}>
                        <Feather name="camera" size={13} color="#FFF"/>
                        <Text style={styles.retakeBtnText}>Retake</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoUploadInner}>
                      <View style={styles.cameraIconCircle}><Feather name="camera" size={28} color="#0284C7"/></View>
                      <Text style={styles.photoUploadTitle}>Take Package Photo</Text>
                      <Text style={styles.photoUploadSubtitle}>Required before pickup confirmation</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmAck} style={[styles.confirmAckBtn, !packagePhoto && {backgroundColor:'#CBD5E1'}]} disabled={!packagePhoto}>
                  <Feather name="check-circle" size={20} color="#FFF"/>
                  <Text style={styles.confirmAckText}>Confirm Pickup</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsAckModalOpen(false)} style={styles.cancelAckBtn}>
                  <Text style={styles.cancelAckText}>Not yet — go back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* CANCEL MODAL */}
          <Modal transparent visible={isCancelModalOpen} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.cancelModalContent}>
                <Text style={styles.cancelModalTitle}><Feather name="alert-circle" size={20}/> Cancel Order</Text>
                <Text style={styles.cancelModalSub}>Select a valid reason for cancelling this trip.</Text>
                <View style={[styles.cancelPolicyBox, driverSuspension.isSuspended ? styles.cancelPolicyBoxDanger : styles.cancelPolicyBoxInfo]}>
                  <Feather
                    name={driverSuspension.isSuspended ? 'shield-off' : 'info'}
                    size={16}
                    color={driverSuspension.isSuspended ? '#B91C1C' : '#0369A1'}
                    style={{ marginTop: 2, marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cancelPolicyTitle, driverSuspension.isSuspended && styles.cancelPolicyTitleDanger]}>
                      {driverSuspension.isSuspended ? 'Cancellation temporarily blocked' : 'Cancellation rule'}
                    </Text>
                    <Text style={styles.cancelPolicyText}>
                      {driverSuspension.isSuspended
                        ? `You have cancelled ${driverSuspension.cancellationCountToday} orders today. Unlocks automatically in ${suspensionCountdown || formatTimeLeft(driverSuspension.remainingMs)}.`
                        : `After ${driverSuspension.maxDailyCancellations} cancellations in one day, the driver account is suspended for ${driverSuspension.suspensionDurationHours} hours.`}
                    </Text>
                    {!driverSuspension.isSuspended && (
                      <Text style={styles.cancelPolicyMeta}>
                        {Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday)} cancellation{Math.max(0, driverSuspension.maxDailyCancellations - driverSuspension.cancellationCountToday) === 1 ? '' : 's'} left today.
                      </Text>
                    )}
                  </View>
                </View>
                <ScrollView style={styles.reasonList}>
                  {cancelReasonsList.map((reason,idx) => (
                    <TouchableOpacity key={idx} disabled={driverSuspension.isSuspended} style={[styles.reasonRow, cancelReason===reason&&styles.reasonRowActive, driverSuspension.isSuspended&&{opacity:0.45}]} onPress={() => setCancelReason(reason)}>
                      <View style={[styles.radioOuter, cancelReason===reason&&styles.radioOuterActive]}>
                        {cancelReason===reason && <View style={styles.radioInner}/>}
                      </View>
                      <Text style={[styles.reasonText, cancelReason===reason&&styles.reasonTextActive]}>{reason}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={confirmCancelTrip} disabled={!cancelReason || driverSuspension.isSuspended} style={[styles.confirmCancelBtn, (!cancelReason || driverSuspension.isSuspended)&&{opacity:0.5}]}> 
                  <Text style={styles.confirmCancelText}>Confirm Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsCancelModalOpen(false)} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <ChatModal tripId={activeTrip?.id || ''} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} onCallCustomer={() => Alert.alert('Calling...','+91 9876543210')}/>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES — identical to original
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#FFF'},
  scrollPad:{padding:16,paddingBottom:60},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  tabContainer:{padding:16,paddingTop:8},
  tabBg:{flexDirection:'row',backgroundColor:'#F1F5F9',borderRadius:16,padding:4},
  tabBtn:{flex:1,paddingVertical:12,borderRadius:12,alignItems:'center'},
  tabBtnActive:{backgroundColor:'#FFF',shadowColor:'#000',shadowOpacity:0.1,shadowRadius:2,elevation:2},
  tabText:{fontSize:14,fontWeight:'bold',color:'#64748B'},
  tabTextActive:{color:'#0284C7'},
  sectionHeaderRow:{flexDirection:'row',alignItems:'center',marginBottom:12},
  sectionHeader:{fontSize:12,fontWeight:'900',color:'#94A3B8',letterSpacing:1},
  dotPulse:{width:8,height:8,borderRadius:4,backgroundColor:'#0284C7',marginRight:8},
  orderCard:{backgroundColor:'#FFF',borderRadius:24,padding:20,borderWidth:1,borderColor:'#F1F5F9',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:4,elevation:2,marginBottom:16},
  vehicleBadge:{backgroundColor:'#EFF6FF',alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:4,borderRadius:6,marginBottom:8},
  vehicleBadgeText:{color:'#0284C7',fontSize:10,fontWeight:'900',textTransform:'uppercase'},
  orderTitle:{fontSize:18,fontWeight:'bold',color:'#0F172A'},
  orderPayout:{fontSize:24,fontWeight:'900',color:'#0284C7'},
  orderDist:{fontSize:12,fontWeight:'bold',color:'#94A3B8',marginTop:4},
  addressRow:{flexDirection:'row',alignItems:'center',marginTop:16,marginBottom:20},
  addressText:{fontSize:14,color:'#475569',flex:1},
  actionRow:{flexDirection:'row',gap:12},
  ignoreBtn:{flex:1,backgroundColor:'#F8FAFC',paddingVertical:14,borderRadius:12,alignItems:'center'},
  ignoreText:{color:'#64748B',fontWeight:'bold',fontSize:16},
  acceptBtn:{flex:1,backgroundColor:'#0284C7',paddingVertical:14,borderRadius:12,alignItems:'center'},
  acceptText:{color:'#FFF',fontWeight:'bold',fontSize:16},
  historyFiltersRow:{flexDirection:'row',marginBottom:8},
  filterPill:{paddingHorizontal:20,paddingVertical:10,borderRadius:20,marginRight:8,borderWidth:1},
  filterPillActive:{backgroundColor:'#0F172A',borderColor:'#0F172A'},
  filterPillInactive:{backgroundColor:'#FFF',borderColor:'#E2E8F0'},
  filterText:{fontWeight:'bold',fontSize:14},
  filterTextActive:{color:'#FFF'},
  filterTextInactive:{color:'#64748B'},
  reasonBox:{backgroundColor:'#FEF2F2',padding:8,borderRadius:8,marginTop:12},
  reasonTextSmall:{color:'#EF4444',fontSize:12,fontWeight:'600'},
  historyFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:16,paddingTop:16,borderTopWidth:1,borderTopColor:'#F1F5F9'},
  historyDate:{fontSize:12,fontWeight:'bold',color:'#94A3B8'},
  statusBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:6},
  statusGreen:{backgroundColor:'#DCFCE7'},
  statusRed:{backgroundColor:'#FEE2E2'},
  statusGray:{backgroundColor:'#F1F5F9'},
  statusText:{fontSize:10,fontWeight:'900',textTransform:'uppercase',letterSpacing:0.5},
  emptyState:{alignItems:'center',justifyContent:'center',paddingVertical:60},
  emptyTitle:{fontSize:18,fontWeight:'bold',color:'#475569',marginTop:16},
  emptySub:{fontSize:14,color:'#94A3B8',marginTop:8},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'},
  navModalContent:{width:'90%',backgroundColor:'#FFF',borderRadius:32,padding:24,alignItems:'center'},
  successIconBox:{width:64,height:64,borderRadius:32,backgroundColor:'#22C55E',justifyContent:'center',alignItems:'center',marginBottom:16},
  navModalTitle:{fontSize:24,fontWeight:'900',color:'#0F172A'},
  navModalSub:{fontSize:14,color:'#64748B',marginBottom:24},
  routeBox:{width:'100%',backgroundColor:'#F8FAFC',borderRadius:20,padding:16,marginBottom:24,borderWidth:1,borderColor:'#F1F5F9'},
  routeRow:{flexDirection:'row',alignItems:'flex-start'},
  routeDot:{width:32,height:32,borderRadius:16,marginTop:2},
  routeLabel:{fontSize:10,fontWeight:'bold',color:'#94A3B8',marginBottom:4},
  routeAddress:{fontSize:14,fontWeight:'600',color:'#0F172A'},
  routeDivider:{borderLeftWidth:2,borderStyle:'dashed',borderColor:'#CBD5E1',height:20,marginLeft:15,marginVertical:4},
  goBtn:{width:'100%',backgroundColor:'#0284C7',paddingVertical:16,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},
  goBtnText:{color:'#FFF',fontSize:16,fontWeight:'bold'},
  activeTripContainer:{flex:1,backgroundColor:'#F8FAFC'},
  mapContainer:{flex:1,position:'relative',overflow:'hidden'},
  mapPinContainer:{position:'absolute',top:'50%',left:'50%',transform:[{translateX:-20},{translateY:-40}],alignItems:'center'},
  mapPulse:{position:'absolute',width:60,height:60,borderRadius:30,backgroundColor:'rgba(2,132,199,0.3)',top:-10,left:-10},
  mapPin:{width:40,height:40,borderRadius:20,backgroundColor:'#0284C7',justifyContent:'center',alignItems:'center'},
  mapTopBar:{position:'absolute',top:50,left:16,right:16,flexDirection:'row',justifyContent:'space-between'},
  mapBackBtn:{width:48,height:48,backgroundColor:'#FFF',borderRadius:24,justifyContent:'center',alignItems:'center',shadowColor:'#000',shadowOpacity:0.1,shadowRadius:5},
  liveGpsBadge:{backgroundColor:'#FFF',paddingHorizontal:16,borderRadius:24,flexDirection:'row',alignItems:'center',shadowColor:'#000',shadowOpacity:0.1,shadowRadius:5},
  liveGpsDot:{width:8,height:8,borderRadius:4,backgroundColor:'#22C55E',marginRight:8},
  liveGpsText:{fontWeight:'bold',fontSize:14,color:'#0F172A'},
  bottomSheet:{backgroundColor:'#FFF',borderTopLeftRadius:32,borderTopRightRadius:32,padding:24,shadowColor:'#000',shadowOffset:{width:0,height:-10},shadowOpacity:0.1,shadowRadius:20,elevation:20},
  sheetHandle:{width:40,height:6,backgroundColor:'#E2E8F0',borderRadius:3,alignSelf:'center',marginBottom:20},
  sheetSubtitle:{fontSize:10,fontWeight:'900',color:'#0284C7',letterSpacing:1,marginBottom:4},
  sheetTitle:{fontSize:24,fontWeight:'bold',color:'#0F172A',marginBottom:4},
  sheetAddress:{fontSize:14,color:'#64748B',marginBottom:20},
  sheetActionRow:{flexDirection:'row',gap:12,marginBottom:16},
  sheetTopRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
  stepBadge:{backgroundColor:'#EFF6FF',paddingHorizontal:10,paddingVertical:4,borderRadius:20},
  stepBadgeText:{fontSize:10,fontWeight:'900',color:'#0284C7',letterSpacing:.5},
  vTypePill:{flexDirection:'row',alignItems:'center',backgroundColor:'#F5F3FF',paddingHorizontal:10,paddingVertical:4,borderRadius:20},
  vTypeText:{fontSize:11,fontWeight:'800',color:'#7C3AED'},
  payoutPill:{flexDirection:'row',alignItems:'center',backgroundColor:'#EFF6FF',paddingHorizontal:10,paddingVertical:4,borderRadius:20,gap:4},
  payoutPillText:{fontSize:11,fontWeight:'800',color:'#0284C7'},
  circleBtn:{width:52,height:52,borderRadius:16,justifyContent:'center',alignItems:'center'},
  quickStrip:{flexDirection:'row',gap:8,marginBottom:14},
  quickChip:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,backgroundColor:'#F8FAFC',borderWidth:1.5,borderColor:'#E2E8F0',paddingVertical:10,borderRadius:14},
  quickChipText:{fontSize:11,fontWeight:'700',color:'#334155'},
  sheetCancelWrapper:{marginTop:4},
  sheetCancelHint:{fontSize:11,fontWeight:'700',color:'#64748B',textAlign:'center',marginBottom:6},
  ackHeader:{flexDirection:'row',alignItems:'center',marginBottom:16},
  ackModalSub:{fontSize:12,fontWeight:'600',color:'#64748B'},
  ackChecklist:{backgroundColor:'#F8FAFC',borderRadius:16,padding:14,marginBottom:16,gap:10},
  ackCheckRow:{flexDirection:'row',alignItems:'center',gap:10},
  ackCheckDot:{width:22,height:22,borderRadius:11,backgroundColor:'#DCFCE7',justifyContent:'center',alignItems:'center'},
  ackCheckText:{fontSize:13,fontWeight:'600',color:'#334155'},
  navBtn:{flex:1,backgroundColor:'#2563EB',paddingVertical:16,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},
  navBtnText:{color:'#FFF',fontWeight:'bold',fontSize:16},
  arriveBtn:{backgroundColor:'#F0F9FF',borderWidth:2,borderColor:'#0284C7',paddingVertical:16,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:12},
  arriveBtnText:{color:'#0284C7',fontSize:18,fontWeight:'900'},
  sheetCancelBtn:{marginTop:16,alignItems:'center',paddingVertical:12},
  sheetCancelText:{color:'#EF4444',fontWeight:'bold',fontSize:16},
  otpSection:{alignItems:'center'},
  otpIconBox:{width:64,height:64,borderRadius:32,backgroundColor:'#F0F9FF',justifyContent:'center',alignItems:'center',marginBottom:16},
  otpTitle:{fontSize:24,fontWeight:'bold',color:'#0F172A',marginBottom:8},
  otpSub:{fontSize:14,color:'#64748B',marginBottom:24},
  otpInput:{width:200,height:64,backgroundColor:'#F8FAFC',borderWidth:2,borderColor:'#E2E8F0',borderRadius:16,fontSize:32,fontWeight:'bold',letterSpacing:8,textAlign:'center',color:'#0F172A',marginBottom:24},
  demoOtpBox:{width:'100%',backgroundColor:'#EFF6FF',borderWidth:2,borderColor:'#BFDBFE',borderRadius:20,padding:20,alignItems:'center',marginBottom:20},
  demoOtpTop:{flexDirection:'row',alignItems:'center',marginBottom:8},
  demoOtpLabel:{fontSize:12,fontWeight:'700',color:'#0284C7',textTransform:'uppercase',letterSpacing:0.5},
  demoOtpCode:{fontSize:48,fontWeight:'900',color:'#1D4ED8',letterSpacing:12,marginBottom:6},
  demoOtpHint:{fontSize:11,color:'#64748B',fontWeight:'600',textAlign:'center'},
  verifyBtn:{width:'100%',backgroundColor:'#16A34A',paddingVertical:16,borderRadius:16,alignItems:'center'},
  verifyBtnText:{color:'#FFF',fontSize:18,fontWeight:'900'},
  ackModalContent:{width:'92%',backgroundColor:'#FFF',borderRadius:32,padding:24,alignItems:'stretch'},
  ackIconBox:{width:52,height:52,borderRadius:16,backgroundColor:'#E0F2FE',justifyContent:'center',alignItems:'center'},
  ackModalTitle:{fontSize:18,fontWeight:'900',color:'#0F172A'},
  ackWarningBox:{flexDirection:'row',alignItems:'flex-start',backgroundColor:'#FEF3C7',borderColor:'#FDE68A',borderWidth:1,borderRadius:16,padding:14,marginBottom:14},
  ackWarningText:{fontSize:13,color:'#92400E',lineHeight:20,flex:1},
  photoUploadBox:{width:'100%',borderWidth:2,borderColor:'#CBD5E1',borderStyle:'dashed',borderRadius:16,overflow:'hidden',marginBottom:24,backgroundColor:'#F8FAFC',minHeight:130},
  photoUploadBoxSuccess:{borderColor:'#10B981',borderStyle:'solid',backgroundColor:'#ECFDF5'},
  photoUploadInner:{alignItems:'center',justifyContent:'center',paddingVertical:24,paddingHorizontal:16},
  cameraIconCircle:{width:56,height:56,borderRadius:28,backgroundColor:'#E0F2FE',justifyContent:'center',alignItems:'center',marginBottom:10},
  photoUploadTitle:{fontSize:15,fontWeight:'700',color:'#0F172A',marginBottom:4},
  photoUploadSubtitle:{fontSize:13,color:'#94A3B8'},
  photoPreviewWrapper:{width:'100%',height:180,position:'relative'},
  photoPreviewImage:{width:'100%',height:'100%'},
  photoPreviewBadge:{position:'absolute',top:10,left:10,flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',paddingHorizontal:10,paddingVertical:4,borderRadius:20,gap:4,shadowColor:'#000',shadowOpacity:0.1,shadowRadius:4},
  photoPreviewBadgeText:{fontSize:12,fontWeight:'700',color:'#10B981'},
  retakeBtn:{position:'absolute',bottom:10,right:10,flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,0,0,0.55)',paddingHorizontal:12,paddingVertical:6,borderRadius:20,gap:5},
  retakeBtnText:{color:'#FFF',fontSize:12,fontWeight:'700'},
  confirmAckBtn:{width:'100%',backgroundColor:'#0284C7',paddingVertical:16,borderRadius:16,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8,marginBottom:12},
  confirmAckText:{color:'#FFF',fontWeight:'bold',fontSize:16},
  cancelAckBtn:{paddingVertical:12},
  cancelAckText:{color:'#64748B',fontWeight:'bold',fontSize:14},
  cancelModalContent:{width:'90%',backgroundColor:'#FFF',borderRadius:32,padding:24},
  cancelModalTitle:{fontSize:20,fontWeight:'bold',color:'#EF4444',textAlign:'center',marginBottom:8},
  cancelModalSub:{fontSize:14,color:'#64748B',textAlign:'center',marginBottom:24},
  cancelPolicyBox:{flexDirection:'row',borderRadius:16,padding:14,marginBottom:16,borderWidth:1},
  cancelPolicyBoxInfo:{backgroundColor:'#F0F9FF',borderColor:'#BAE6FD'},
  cancelPolicyBoxDanger:{backgroundColor:'#FEF2F2',borderColor:'#FECACA'},
  cancelPolicyTitle:{fontSize:13,fontWeight:'900',color:'#0369A1',marginBottom:4},
  cancelPolicyTitleDanger:{color:'#B91C1C'},
  cancelPolicyText:{fontSize:12,color:'#334155',lineHeight:17},
  cancelPolicyMeta:{fontSize:11,fontWeight:'700',color:'#0F172A',marginTop:6},
  reasonList:{maxHeight:300,marginBottom:24},
  reasonRow:{flexDirection:'row',alignItems:'center',padding:16,borderRadius:16,borderWidth:2,borderColor:'#F1F5F9',marginBottom:8},
  reasonRowActive:{borderColor:'#EF4444',backgroundColor:'#FEF2F2'},
  radioOuter:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:'#CBD5E1',justifyContent:'center',alignItems:'center',marginRight:12},
  radioOuterActive:{borderColor:'#EF4444'},
  radioInner:{width:12,height:12,borderRadius:6,backgroundColor:'#EF4444'},
  reasonText:{fontSize:14,fontWeight:'600',color:'#475569'},
  reasonTextActive:{color:'#B91C1C'},
  confirmCancelBtn:{backgroundColor:'#EF4444',paddingVertical:16,borderRadius:16,alignItems:'center',marginBottom:12},
  confirmCancelText:{color:'#FFF',fontWeight:'bold',fontSize:16},
  backBtn:{backgroundColor:'#F1F5F9',paddingVertical:16,borderRadius:16,alignItems:'center'},
  backBtnText:{color:'#475569',fontWeight:'bold',fontSize:16},
});
