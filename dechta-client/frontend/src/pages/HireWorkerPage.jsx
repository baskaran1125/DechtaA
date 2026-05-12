import { Map, Shield, Navigation, X, ChevronRight, BrickWall, SprayCan, Snowflake, Hammer, Zap, HardHat, Flame, User, Mic, Square, Trash2, CheckCircle2, Play, Bell, Loader2, Phone } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchActiveWorkers, fetchManpowerServices, hireWorker, getJobStatus } from '../api/apiClient';

export default function HireWorkerPage({ onBack }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const filterMapTimerRef = useRef(null);
    const audioRef = useRef(null);

    const [status, setStatus] = useState('Loading approved workers...');
    const [workDescription, setWorkDescription] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [workers, setWorkers] = useState([]);
    const [workersLoading, setWorkersLoading] = useState(true);
    const [manpowerServices, setManpowerServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [selectedCategoryKey, setSelectedCategoryKey] = useState(null);

    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hiringWorkerId, setHiringWorkerId] = useState(null);

    // Hire flow: pending (waiting) → accepted / declined
    const [pendingJob, setPendingJob] = useState(null);  // { jobId, workerId, workerName, workerPhone, skill, task }
    const [acceptedJob, setAcceptedJob] = useState(null); // same fields + acceptedAt
    const pollingRef = useRef(null);

    // Keep audioUrl accessible in callbacks without stale closure
    const audioUrlRef = useRef(null);
    const workDescRef = useRef('');

    const workerAppUrl = String(import.meta.env.VITE_WORKER_APP_URL || '').trim() || 'http://localhost:5176';
    const liveWorkers = workers.filter((worker) => worker.hasLiveLocation && Number.isFinite(worker.lat) && Number.isFinite(worker.lng));

    // Keep refs in sync so assignWorker never reads stale values
    useEffect(() => { audioUrlRef.current = audioUrl; }, [audioUrl]);
    useEffect(() => { workDescRef.current = workDescription; }, [workDescription]);

    const buildTaskDescription = useCallback(() => {
        const desc = workDescRef.current.trim();
        const hasAudio = !!audioUrlRef.current;
        if (hasAudio) return desc ? `${desc} (Voice note attached)` : 'Voice note attached';
        return desc || 'General worker assignment';
    }, []); // stable — reads from refs

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    // Clean up polling on unmount
    useEffect(() => () => stopPolling(), [stopPolling]);

    const assignWorker = useCallback(async (worker, categoryLabel = '', serviceName = '') => {
        if (hiringWorkerId) return;
        const taskDesc = buildTaskDescription();
        setHiringWorkerId(worker.id);

        let jobId = null;
        try {
            const result = await hireWorker(worker.id, {
                jobDescription: taskDesc,
                categoryLabel,
                serviceName,
                clientName: 'Client',
                bookingRef: `QC${worker.id}${Date.now().toString().slice(-4)}`,
            });
            jobId = result?.jobId ?? null;
        } catch { /* notification failed but we still show waiting UI */ }

        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

        setHiringWorkerId(null);
        setWorkDescription(''); setAudioUrl(null); setIsPlaying(false); setRecordingTime(0);
        setStatus(`Waiting for ${worker.name} to accept...`);

        const jobPayload = {
            jobId,
            workerId: worker.id,
            workerName: worker.name,
            workerPhone: worker.phone || '',
            skill: worker.skill,
            task: taskDesc,
        };
        setPendingJob(jobPayload);

        if (!jobId) return; // no jobId → can't poll

        // Start polling every 4 seconds
        stopPolling();
        pollingRef.current = setInterval(async () => {
            try {
                const s = await getJobStatus(jobId);
                if (s.status === 'accepted') {
                    stopPolling();
                    setPendingJob(null);
                    setAcceptedJob({
                        jobId:       s.jobId,
                        workerId:    s.workerId,
                        workerName:  s.workerName,
                        workerPhone: s.workerPhone,
                        skill:       worker.skill,
                        task:        taskDesc,
                        acceptedAt:  s.acceptedAt,
                    });
                    setStatus(`${s.workerName} accepted your job!`);
                } else if (s.status === 'declined') {
                    stopPolling();
                    setPendingJob((prev) => prev ? { ...prev, declined: true } : null);
                    setStatus(`${worker.name} declined. Try another worker.`);
                }
            } catch { /* ignore transient poll errors */ }
        }, 4000);
    }, [buildTaskDescription, hiringWorkerId, stopPolling]);

    const cancelPendingJob = useCallback(() => {
        stopPolling();
        setPendingJob(null);
        setStatus('Job request cancelled.');
    }, [stopPolling]);

    const togglePlayback = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }

        setIsPlaying((prev) => !prev);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const deleteRecording = () => {
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getIconForCategory = (name) => {
        const key = String(name || '').toLowerCase();
        if (key.includes('carpenter')) return <Hammer className="w-5 h-5" />;
        if (key.includes('mason')) return <BrickWall className="w-5 h-5" />;
        if (key.includes('electrician')) return <Zap className="w-5 h-5" />;
        if (key.includes('welder') || key.includes('fabricat')) return <Flame className="w-5 h-5" />;
        if (key.includes('construction') || key.includes('loadman') || key.includes('helper')) return <HardHat className="w-5 h-5" />;
        if (key.includes('garden') || key.includes('paint')) return <SprayCan className="w-5 h-5" />;
        if (key.includes('ac') || key.includes('plumb')) return <Snowflake className="w-5 h-5" />;
        return <User className="w-5 h-5" />;
    };

    const getServiceKey = (service) => String(service?.categoryKey || service?.category || service?.serviceName || '').trim().toLowerCase();
    const getWorkerKey = (worker) => String(worker?.category || worker?.skill || '').trim().toLowerCase();
    const getServiceLabel = (service) => String(service?.serviceName || service?.sample_name || service?.category || 'Service').trim();
    const getServiceMeta = (service) => {
        const parts = [];
        if (Number(service?.ratePerHour) > 0) parts.push(`₹${Number(service.ratePerHour)}/hr`);
        if (Number(service?.basePrice) > 0) parts.push(`from ₹${Number(service.basePrice)}`);
        return parts.join(' · ');
    };

    const filteredWorkers = activeCategory === 'all'
        ? workers
        : workers.filter((w) => getWorkerKey(w) === activeCategory);

    const getCategoryWorkerCount = useCallback((category) => {
        if (category === 'all') return workers.length;
        return workers.filter((w) => getWorkerKey(w) === String(category || '').toLowerCase()).length;
    }, [workers]);

    const renderWorkers = useCallback(async (workersToRender = []) => {
        if (!mapInstance.current) return;

        try {
            const L = (await import('leaflet')).default;
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];

            const mapWorkers = workersToRender.filter((worker) => worker.hasLiveLocation && Number.isFinite(worker.lat) && Number.isFinite(worker.lng));

            mapWorkers.forEach((worker) => {
                const markerColor =
                    worker.status === 'Busy'
                        ? '#f59e0b'
                        : worker.status === 'On Job'
                            ? '#3b82f6'
                            : worker.status === 'Location Off'
                                ? '#f97316'
                                : worker.status === 'Offline'
                                    ? '#94a3b8'
                                    : '#10b981';

                const initials = worker.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                const avatarInner = worker.photoUrl
                    ? `<img src="${worker.photoUrl}" alt="${worker.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex';" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:white;">${initials}</span>`
                    : `<span style="font-size:11px;font-weight:900;color:white;">${initials}</span>`;

                const icon = L.divIcon({
                    html: `<div style="background:${markerColor};width:38px;height:38px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.35);overflow:hidden;position:relative;">${avatarInner}</div><div style="width:10px;height:10px;background:#10b981;border:2px solid white;border-radius:50%;position:absolute;bottom:0;right:0;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
                    className: 'worker-marker',
                    iconSize: [38, 38],
                    iconAnchor: [19, 19],
                });

                const marker = L.marker([worker.lat, worker.lng], { icon }).addTo(mapInstance.current);
                const popupContent = document.createElement('div');
                popupContent.className = 'text-center p-3 min-w-[160px]';

                const avatarHtml = worker.photoUrl
                    ? `<img src="${worker.photoUrl}" alt="${worker.name}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid ${markerColor};margin:0 auto 8px;display:block;" onerror="this.outerHTML='<div style=\\'width:56px;height:56px;border-radius:50%;background:${markerColor};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;margin:0 auto 8px;\\'>${initials}</div>';" />`
                    : `<div style="width:56px;height:56px;border-radius:50%;background:${markerColor};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:white;margin:0 auto 8px;">${initials}</div>`;

                popupContent.innerHTML = `
                    ${avatarHtml}
                    <div style="font-weight:900;font-size:14px;margin-bottom:2px;color:#111;">${worker.name}</div>
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${markerColor};margin-bottom:6px;">${worker.skill}</div>
                    <div style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:11px;color:#6b7280;margin-bottom:4px;">
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        ${worker.distance} away
                    </div>
                    <div style="font-size:10px;color:#9ca3af;margin-bottom:10px;">${worker.area || worker.city || worker.state || 'Live location active'}</div>
                `;

                const assignButton = document.createElement('button');
                assignButton.style.cssText = `background:#facc15;color:#000;font-size:12px;font-weight:900;padding:8px 16px;border-radius:10px;width:100%;border:none;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;gap:6px;`;
                assignButton.innerHTML = '<span>🔔</span><span>Hire & Notify Worker</span>';
                assignButton.onmouseover = () => { assignButton.style.transform = 'scale(1.03)'; };
                assignButton.onmouseout = () => { assignButton.style.transform = 'scale(1)'; };
                assignButton.onclick = () => {
                    assignButton.disabled = true;
                    assignButton.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;"></span><span>Notifying...</span>';
                    assignWorker(worker, worker.skill, worker.skill);
                };
                popupContent.appendChild(assignButton);

                marker.bindPopup(popupContent, { maxWidth: 200 });
                markersRef.current.push(marker);
            });

            if (mapWorkers.length > 0) {
                const bounds = L.latLngBounds(mapWorkers.map((worker) => [worker.lat, worker.lng]));
                if (bounds.isValid()) {
                    mapInstance.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                }
            }
        } catch (error) {
            console.error('Marker rendering failed:', error);
        }
    }, [assignWorker]);

    const initMap = useCallback(async () => {
        if (typeof window === 'undefined' || !mapRef.current) return;

        try {
            const L = (await import('leaflet')).default;
            await import('leaflet/dist/leaflet.css');

            if (mapInstance.current) {
                mapInstance.current.remove();
            }

            const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([13.0827, 80.2707], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

            const userPulseDiv = document.createElement('div');
            userPulseDiv.className = 'w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse';

            const userIcon = L.divIcon({
                className: 'user-pulse',
                html: userPulseDiv.outerHTML,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });

            L.marker([13.0827, 80.2707], { icon: userIcon }).addTo(map);
            mapInstance.current = map;
            renderWorkers([]);
        } catch (error) {
            console.error('Map initialization failed:', error);
        }
    }, [renderWorkers]);

    useEffect(() => {
        initMap();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [initMap]);

    useEffect(() => {
        return () => {
            if (filterMapTimerRef.current) {
                clearTimeout(filterMapTimerRef.current);
            }
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (mediaRecorderRef.current) {
                try {
                    mediaRecorderRef.current.stop();
                } catch (error) {
                    // Recorder might already be stopped.
                }
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadWorkers = async (isInitialLoad = false) => {
            if (isInitialLoad) {
                setWorkersLoading(true);
            }

            try {
                const data = await fetchActiveWorkers();
                if (cancelled) return;

                const nextWorkers = Array.isArray(data?.workers) ? data.workers : [];
                setWorkers(nextWorkers);
                setStatus(
                    nextWorkers.length > 0
                        ? `${nextWorkers.length} professional${nextWorkers.length === 1 ? '' : 's'} ready for assignment`
                        : 'No approved workers available yet'
                );
            } catch (error) {
                if (cancelled) return;
                console.error('Failed to load workers:', error);
                if (isInitialLoad) {
                    setWorkers([]);
                    setStatus('Unable to load approved workers right now');
                }
            } finally {
                if (!cancelled && isInitialLoad) {
                    setWorkersLoading(false);
                }
            }
        };

        void loadWorkers(true);
        const pollId = window.setInterval(() => {
            void loadWorkers(false);
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(pollId);
        };
    }, []);

    // Fetch admin-approved service categories
    useEffect(() => {
        let cancelled = false;
        setServicesLoading(true);
        fetchManpowerServices()
            .then((data) => {
                if (!cancelled) {
                    const services = Array.isArray(data?.data?.services)
                        ? data.data.services
                        : Array.isArray(data?.services)
                            ? data.services
                            : [];
                    setManpowerServices(services);
                }
            })
            .catch(() => { if (!cancelled) setManpowerServices([]); })
            .finally(() => { if (!cancelled) setServicesLoading(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!mapInstance.current) return;
        renderWorkers(filteredWorkers);
        if (workersLoading) { setStatus('Loading approved workers...'); return; }
        setStatus(
            workers.length > 0
                ? `${workers.length} professional${workers.length === 1 ? '' : 's'} ready | ${liveWorkers.length} live`
                : 'No approved workers available yet'
        );
    }, [filteredWorkers, liveWorkers.length, renderWorkers, workers, workersLoading]);

    const categoryGroups = useMemo(() => {
        const groups = {};
        manpowerServices.forEach((svc) => {
            const catLabel = String(svc.category || svc.serviceName || 'General').trim();
            // categoryKey from the backend matches worker.category (both normalized via same toServiceKey/mapCategory logic)
            const catKey = svc.categoryKey || catLabel.toLowerCase();
            if (!groups[catKey]) {
                groups[catKey] = { catKey, catLabel, services: [] };
            }
            groups[catKey].services.push(svc);
        });
        return Object.values(groups).sort((a, b) => a.catLabel.localeCompare(b.catLabel));
    }, [manpowerServices]);

    const selectedGroup = selectedCategoryKey
        ? categoryGroups.find((g) => g.catKey === selectedCategoryKey)
        : null;

    const filterMap = (category) => {
        setActiveCategory(category);
        const catGroup = categoryGroups.find((g) => g.catKey === category);
        setStatus(`Filtering ${category === 'all' ? 'all services' : `${catGroup?.catLabel ?? category} services`}...`);
    };

    const handleCategoryClick = (catKey) => {
        filterMap(catKey);
        setSelectedCategoryKey(catKey);
    };

    const handleBackToCategories = () => {
        setSelectedCategoryKey(null);
        filterMap('all');
    };

    return (
        <main className="font-sans min-h-screen bg-gray-50 dark:bg-slate-950">
            <div className="hidden lg:block h-32"></div>

            <div className="lg:max-w-7xl lg:mx-auto lg:px-4 lg:pb-12 h-[calc(100vh-8.5rem)] lg:h-[700px]">
                <div className="relative flex flex-col md:flex-row h-full overflow-hidden bg-white dark:bg-slate-900 lg:rounded-[2.5rem] lg:shadow-2xl lg:border lg:border-gray-100 lg:dark:border-slate-800">
                    <div className="w-full md:w-[380px] h-[55%] md:h-full bg-white dark:bg-slate-900 flex flex-col order-2 md:order-1 border-t md:border-t-0 md:border-r border-gray-100 dark:border-slate-800 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] md:shadow-none">
                        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white leading-tight">
                                <span className="w-8 h-8 md:w-10 md:h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-black shadow-sm">
                                    <Map className="w-4 h-4 md:w-5 md:h-5" />
                                </span>
                                Find Professionals
                            </h3>
                            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4 md:p-6 space-y-3 shrink-0">
                            <div className="relative flex flex-col gap-2">
                                <div className="relative group flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={isRecording ? 'Recording audio...' : 'Describe the work (e.g. Need to lift heavy appliances)...'}
                                        value={workDescription}
                                        onChange={(event) => setWorkDescription(event.target.value)}
                                        disabled={isRecording}
                                        className={`flex-1 bg-white dark:bg-slate-900 border ${isRecording ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-200 dark:border-slate-700'} rounded-xl px-4 py-2.5 md:py-3 text-sm font-medium focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white transition-all shadow-sm`}
                                    />

                                    {!audioUrl ? (
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`p-2.5 md:p-3 rounded-xl transition-all shadow-md flex items-center justify-center ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'}`}
                                            title={isRecording ? 'Stop Recording' : 'Record Voice Note'}
                                        >
                                            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-xl px-3 py-2 flex-1 animate-in slide-in-from-right-4 duration-300">
                                            <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                                            <button
                                                onClick={togglePlayback}
                                                className="w-8 h-8 flex items-center justify-center bg-cyan-500 text-white rounded-lg shadow-sm hover:scale-105 transition-transform"
                                            >
                                                {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current translate-x-0.5" />}
                                            </button>
                                            <span className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest flex-1">Voice note attached</span>
                                            <button
                                                onClick={deleteRecording}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isRecording && (
                                    <div className="flex items-center justify-between px-4 py-2 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1 h-3 items-center">
                                                {[1, 2, 3, 4, 5].map((item) => (
                                                    <div key={item} className="w-1 bg-red-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 100 + 20}%`, animationDelay: `${item * 0.1}s` }} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-black text-red-600 dark:text-red-400 tracking-[0.2em] uppercase">Recording...</span>
                                        </div>
                                        <span className="text-xs font-black text-red-600 dark:text-red-400 font-mono tracking-widest">{formatTime(recordingTime)}</span>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className="flex-1 md:overflow-y-auto px-4 md:px-6 pb-28 md:pb-4 md:custom-scrollbar">
                            {selectedGroup ? (
                                /* ── Service detail view ── */
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <button
                                            onClick={handleBackToCategories}
                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                                {getIconForCategory(selectedGroup.catLabel)}
                                            </div>
                                            <h4 className="text-sm font-black dark:text-white">{selectedGroup.catLabel}</h4>
                                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">{selectedGroup.services.length} service{selectedGroup.services.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedGroup.services.map((svc) => {
                                            const svcWorkers = workers.filter((w) => getWorkerKey(w) === selectedCategoryKey);
                                            return (
                                                <div key={svc.id || svc.serviceCode || svc.serviceName} className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-sm dark:text-white leading-tight">{svc.serviceName}</h5>
                                                        {svc.description && (
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug line-clamp-2">{svc.description}</p>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                            {Number(svc.ratePerHour) > 0 && (
                                                                <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">₹{Number(svc.ratePerHour)}/hr</span>
                                                            )}
                                                            {Number(svc.basePrice) > 0 && (
                                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">from ₹{Number(svc.basePrice)}</span>
                                                            )}
                                                            {Number(svc.minHours) > 0 && (
                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">min {svc.minHours}h</span>
                                                            )}
                                                            {svc.estimatedDuration && (
                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{svc.estimatedDuration}</span>
                                                            )}
                                                        </div>
                                                        {/* Quick-hire buttons for available workers in this category */}
                                                        {svcWorkers.length > 0 && (
                                                            <div className="mt-2 space-y-1.5">
                                                                {svcWorkers.slice(0, 3).map((w) => (
                                                                    <button
                                                                        key={w.id}
                                                                        disabled={hiringWorkerId === w.id}
                                                                        onClick={() => assignWorker(w, selectedGroup.catLabel, svc.serviceName)}
                                                                        className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 rounded-lg text-[11px] font-black text-black transition-all disabled:opacity-60"
                                                                    >
                                                                        {hiringWorkerId === w.id
                                                                            ? <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                                                            : <Bell className="w-3 h-3 shrink-0" />}
                                                                        <span className="truncate">{hiringWorkerId === w.id ? 'Notifying...' : `Hire ${w.name}`}</span>
                                                                        {w.hasLiveLocation && <span className="ml-auto text-green-700 font-bold shrink-0">{w.distance}</span>}
                                                                    </button>
                                                                ))}
                                                                {svcWorkers.length > 3 && (
                                                                    <p className="text-[10px] text-gray-400 text-center">+{svcWorkers.length - 3} more on map</p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {svcWorkers.length === 0 && (
                                                            <p className="text-[10px] text-gray-400 mt-2">No workers online for this service right now</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                /* ── Category list view ── */
                                <>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Available Services</h4>
                                    {servicesLoading ? (
                                        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : categoryGroups.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                                            {/* All services pill */}
                                            <div
                                                onClick={() => { setActiveCategory('all'); setSelectedCategoryKey(null); filterMap('all'); }}
                                                className={`flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3 p-3 rounded-xl cursor-pointer transition-all border col-span-2 md:col-span-1 ${activeCategory === 'all' ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-transparent hover:border-gray-200 dark:hover:border-slate-700'} group`}
                                            >
                                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${activeCategory === 'all' ? 'bg-yellow-400 text-black shadow-sm' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300'}`}>
                                                    <HardHat className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <h4 className={`font-bold text-[11px] md:text-sm dark:text-white ${activeCategory === 'all' ? 'text-yellow-700 dark:text-yellow-400' : ''}`}>All Services</h4>
                                                    <div className="hidden md:flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">Approved</span>
                                                        <span className="text-xs text-gray-400">- {workers.length} listed</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className={`hidden md:block w-4 h-4 ${activeCategory === 'all' ? 'text-yellow-600' : 'text-gray-400'}`} />
                                            </div>
                                            {/* Each admin-approved category */}
                                            {categoryGroups.map((grp) => (
                                                <div
                                                    key={grp.catKey}
                                                    onClick={() => handleCategoryClick(grp.catKey)}
                                                    className={`flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3 p-3 rounded-xl cursor-pointer transition-all border ${activeCategory === grp.catKey ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-slate-800 border-transparent hover:border-gray-200 dark:hover:border-slate-700'} group`}
                                                >
                                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all ${activeCategory === grp.catKey ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-sm'}`}>
                                                        {getIconForCategory(grp.catLabel)}
                                                    </div>
                                                    <div className="flex-1 text-center md:text-left min-w-0">
                                                        <h4 className={`font-bold text-[11px] md:text-sm dark:text-white truncate ${activeCategory === grp.catKey ? 'text-blue-700' : ''}`}>{grp.catLabel}</h4>
                                                        <div className="hidden md:flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">{grp.services.length} service{grp.services.length !== 1 ? 's' : ''}</span>
                                                            <span className="text-xs text-gray-400">- {getCategoryWorkerCount(grp.catKey)} workers</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={`hidden md:block w-4 h-4 shrink-0 ${activeCategory === grp.catKey ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <HardHat className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-400 text-sm font-bold">No services available yet</p>
                                            <p className="text-gray-400 text-xs mt-1">Admin is setting up services</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-slate-800 text-[10px] font-black text-center text-gray-400 uppercase tracking-widest bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
                            <p>{status}</p>
                        </div>
                    </div>

                    <div className="flex-1 relative h-[45%] md:h-full bg-slate-100 overflow-hidden order-1 md:order-2">
                        <div ref={mapRef} className="w-full h-full z-10" />

                        <div className="absolute bottom-6 md:bottom-10 right-4 md:right-10 flex flex-col gap-3 z-20">
                            <button className="w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 dark:border-slate-800 hover:scale-110 active:scale-95 transition-all">
                                <Shield className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                            </button>
                            <button onClick={() => mapInstance.current?.flyTo([13.0827, 80.2707], 15)} className="w-10 h-10 md:w-12 md:h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                                <Navigation className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/20 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black dark:text-white uppercase tracking-widest whitespace-nowrap">{liveWorkers.length} live worker location{liveWorkers.length === 1 ? '' : 's'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Waiting for worker modal ── */}
            {pendingJob && !pendingJob.declined && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] text-center max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-25"></div>
                            <div className="w-full h-full bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center relative z-10">
                                <Bell className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                        <h2 className="text-xl font-black mb-1 dark:text-white tracking-tight uppercase">Waiting for Worker</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                            Alarm sent to <span className="font-bold text-black dark:text-white">{pendingJob.workerName}</span>
                        </p>
                        <p className="text-gray-400 text-xs mb-5">They'll accept or decline shortly — stay on this screen.</p>
                        <div className="flex justify-center gap-1.5 mb-6">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
                            ))}
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl mb-5 text-left">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Job Details</p>
                            <p className="text-sm font-semibold dark:text-white leading-snug">{pendingJob.task}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{pendingJob.skill}</p>
                        </div>
                        <button
                            onClick={cancelPendingJob}
                            className="w-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel Request
                        </button>
                    </div>
                </div>
            )}

            {/* ── Worker declined modal ── */}
            {pendingJob?.declined && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={cancelPendingJob}></div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] text-center max-w-sm w-full mx-4 shadow-2xl relative">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <X className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-black mb-2 dark:text-white uppercase">Unavailable</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                            <span className="font-bold text-black dark:text-white">{pendingJob.workerName}</span> is unavailable right now. Please try another worker.
                        </p>
                        <button
                            onClick={cancelPendingJob}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                        >
                            Try Another Worker
                        </button>
                    </div>
                </div>
            )}

            {/* ── Job accepted modal ── */}
            {acceptedJob && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAcceptedJob(null)}></div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] text-center max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400"></div>
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-black mb-2 dark:text-white tracking-tight uppercase">Job Accepted!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm font-medium">
                            <span className="font-bold text-black dark:text-white">{acceptedJob.workerName}</span> accepted your request.
                        </p>
                        <p className="text-xs text-gray-400 italic mb-6">"{acceptedJob.task}"</p>

                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl mb-4 text-left">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Worker Details</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-black text-base dark:text-white">{acceptedJob.workerName}</p>
                                    <p className="text-xs text-gray-400">{acceptedJob.skill} · ID #{acceptedJob.workerId}</p>
                                </div>
                                <span className="text-[10px] font-black text-green-600 uppercase bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">On the way</span>
                            </div>
                        </div>

                        {acceptedJob.workerPhone && (
                            <>
                                <a
                                    href={`tel:${acceptedJob.workerPhone}`}
                                    className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest mb-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-200 dark:shadow-green-900/30"
                                >
                                    <Phone className="w-4 h-4" /> Call Worker
                                </a>
                                <p className="text-xs text-gray-400 mb-4">{acceptedJob.workerPhone}</p>
                            </>
                        )}

                        <button
                            onClick={() => setAcceptedJob(null)}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            <style>
                {`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0,0,0,0.1);
                        border-radius: 10px;
                    }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.1);
                    }
                    .leaflet-popup-content-wrapper {
                        border-radius: 1.5rem;
                        padding: 0;
                        overflow: hidden;
                    }
                    .leaflet-popup-content {
                        margin: 0;
                        width: auto !important;
                    }
                    .worker-marker {
                        position: relative !important;
                        overflow: visible !important;
                    }
                    .leaflet-popup-tip-container {
                        display: none;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </main>
    );
}
