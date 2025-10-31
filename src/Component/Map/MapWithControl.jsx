// src/components/MapWithControl.jsx
import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import Map from "./Map.jsx";
import ControlPanel from "./ControlPanel.jsx";
import RouteInfo from "./RouteInfo.jsx";
import {API_URL} from "@/config.js";

export default function MapWithControl() {
    const routeInfoRef = useRef(null);
    const [layer, setLayer] = useState("streets");
    const [pickMode, setPickMode] = useState(null); // "start" | "end" | null
    const [loading, setLoading] = useState(false);

    const [geofence, setGeofence] = useState("");
    const [houses, setHouses] = useState([]);
    const [dumpYards, setDumpYards] = useState([]);
    const [selectedDumpIndex, setSelectedDumpIndex] = useState(null);
    const [batchSize, setBatchSize] = useState(250);

    const [pickedLoc, setPickedLoc] = useState(null);
    const [endLoc, setEndLoc] = useState(null);
    const [useStartAsEnd, setUseStartAsEnd] = useState(false);

    const [batches, setBatches] = useState([]);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(null); // rfix: null until user selects
    const [showHouses, setShowHouses] = useState(false);                 // hidden initially

    const [appId, setAppId] = useState("");
    const [userId, setUserId] = useState("");
    const [appName, setAppName] = useState("");
    const [userName, setUserName] = useState("");

    const [progressData, setProgressData] = useState({
        show: false,
        currentBatch: 0,
        totalBatches: 0,
        currentStatus: "",
        housesProcessed: 0,
        totalHouses: 0,
    });

    const scrollToRouteInfo = () => {
        if (routeInfoRef.current) {
            routeInfoRef.current.scrollIntoView({behavior: "smooth"});
        }
    };

    // Parse URL params once
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get("AppId")) setAppId(p.get("AppId"));
        if (p.get("UserId")) setUserId(p.get("UserId"));
        if (p.get("AppName")) setAppName(decodeURIComponent(p.get("AppName")));
        if (p.get("UserName")) setUserName(decodeURIComponent(p.get("UserName")));
    }, []);

    // Fetch geofence, houses, dump yards
    useEffect(() => {
        if (!appId || !userId) return;
        const ctrl = new AbortController();
        (async () => {
            try {
                const res = await fetch(
                    "https://weight.ictsbm.com/api/Get/GeoFencingWiseHouseList",
                    {method: "GET", headers: {AppId: appId, userId}, signal: ctrl.signal}
                );
                const data = await res.json();
                data.geofence && setGeofence(data.geofence);
                Array.isArray(data.houses) && setHouses(data.houses);
                Array.isArray(data.dumpyards) && setDumpYards(data.dumpyards);
            } catch (e) {
                if (e.name !== "AbortError") {
                    console.error(e);
                    alert("Failed to fetch data.");
                }
            }
        })();
        return () => ctrl.abort();
    }, [appId, userId]);

    // rfix: show markers only when user selects a trip
    useEffect(() => {
        if (selectedBatchIndex !== null) setShowHouses(true);
    }, [selectedBatchIndex]);

    const dataReady = houses.length > 0 && dumpYards.length > 0;

    const handleOptimizeRoute = useCallback(async () => {
        if (selectedDumpIndex == null) return alert("Select a dump yard");
        if (!geofence.trim()) return alert("Missing geofence");
        if (!pickedLoc) return alert("Pick start location");
        if (!useStartAsEnd && !endLoc) return alert("Pick end location or use start as end");

        setLoading(true);
        setBatches([]);
        setSelectedBatchIndex(null); // rfix: require explicit user choice after compute
        setShowHouses(false);        // rfix: hide until a trip is chosen
        setProgressData({
            show: true,
            currentBatch: 0,
            totalBatches: 0,
            currentStatus: "Preparing optimization…",
            housesProcessed: 0,
            totalHouses: houses.length,
        });

        const dump = dumpYards[selectedDumpIndex];
        const userStart = {lat: +pickedLoc[0], lon: +pickedLoc[1]};
        const finalEnd = useStartAsEnd ? userStart : {lat: +endLoc[0], lon: +endLoc[1]};
        const dumpLoc = {lat: +dump.lat, lon: +dump.lon};

        const coords = houses.map((h) => ({
            ...h,
            lat: +(h.lat ?? h.latitude),
            lon: +(h.lon ?? h.longitude),
        }));
        const houseBatches = [];
        for (let i = 0; i < coords.length; i += batchSize) {
            houseBatches.push(coords.slice(i, i + batchSize));
        }

        const totalBatches = houseBatches.length + (!useStartAsEnd ? 1 : 0);
        setProgressData((p) => ({...p, totalBatches}));

        try {
            let processed = 0;
            for (let idx = 0; idx < houseBatches.length; idx++) {
                const batchHouses = houseBatches[idx];
                const batchStart = idx === 0 ? userStart : dumpLoc;
                const batchEnd = dumpLoc;

                setProgressData((p) => ({
                    ...p,
                    currentBatch: idx + 1,
                    currentStatus: `Processing batch ${idx + 1} of ${totalBatches}…`,
                }));

                const payload = {
                    geofence: geofence.trim(),
                    houses: batchHouses.map(({lat, lon}) => ({lat, lon})),
                    start_location: batchStart,
                    dump_location: dumpLoc,
                    batch_size: batchHouses.length,
                    nn_steps: 0,
                    end_location: batchEnd,
                };

                const res = await fetch(`${API_URL}/optimize_route`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(`Batch ${idx + 1} failed`);

                const data = await res.json();
                const b = data.batches[0];
                const batchObj = {
                    ...b,
                    batch_number: idx + 1,
                    total_batches: totalBatches,
                    start_type: idx === 0 ? "User Location" : "Dump Yard",
                    houses_in_batch: batchHouses.length,
                    stops: b.stops.map((s, i) => ({
                        ...s,
                        house_id: batchHouses[i]?.house_id,
                    })),
                };

                setBatches((prev) => [...prev, batchObj]);
                // NOTE: do NOT setSelectedBatchIndex here (user picks later)
                processed += batchHouses.length;
                setProgressData((p) => ({...p, housesProcessed: processed}));
            }

            // Dummy final batch (dump → endLoc)
            if (!useStartAsEnd && endLoc) {
                const dummyIndex = houseBatches.length;
                setProgressData((p) => ({
                    ...p,
                    currentBatch: dummyIndex + 1,
                    currentStatus: `Processing final return to end location…`,
                }));

                const finalPayload = {
                    geofence: geofence.trim(),
                    houses: [],
                    start_location: dumpLoc,
                    dump_location: dumpLoc,
                    batch_size: 0,
                    nn_steps: 0,
                    end_location: finalEnd,
                };

                const res = await fetch(`${API_URL}/optimize_route`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(finalPayload),
                });
                if (!res.ok) throw new Error(`Final dummy batch failed`);

                const data = await res.json();
                const b = data.batches[0];
                const dummyBatch = {
                    ...b,
                    batch_number: dummyIndex + 1,
                    total_batches: totalBatches,
                    start_type: "Dump Yard → Final Location",
                    houses_in_batch: 0,
                    stops: b.stops,
                };

                setBatches((prev) => [...prev, dummyBatch]);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to optimize route.");
        } finally {
            setProgressData((p) => ({...p, show: false}));
            setLoading(false);
            // keep showHouses false until user selects a trip
        }
    }, [
        selectedDumpIndex,
        geofence,
        houses,
        dumpYards,
        batchSize,
        pickedLoc,
        endLoc,
        useStartAsEnd,
    ]);

    const handlePickLocation = useCallback(
        (lat, lng) => {
            if (pickMode === "start") setPickedLoc([lat, lng]);
            if (pickMode === "end") setEndLoc([lat, lng]);
            setPickMode(null);
        },
        [pickMode]
    );

    const mapCenter = useMemo(
        () =>
            houses.length
                ? [+(houses[0].lat ?? houses[0].latitude), +(houses[0].lon ?? houses[0].longitude)]
                : [0, 0],
        [houses]
    );

    const currentBatch = useMemo(
        () =>
            selectedBatchIndex === null ? null : (batches[selectedBatchIndex] || null),
        [batches, selectedBatchIndex]
    );

    return (
        <div
            className="h-screen w-full flex flex-col overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
            {/* Control Panel */}
            <ControlPanel
                appName={appName}
                userName={userName}
                layer={layer}
                setLayer={setLayer}
                pickMode={pickMode}
                setPickMode={setPickMode}
                dumpYards={dumpYards}
                selectedDumpIndex={selectedDumpIndex}
                setSelectedDumpIndex={setSelectedDumpIndex}
                batchSize={batchSize}
                setBatchSize={setBatchSize}
                handleOptimizeRoute={handleOptimizeRoute}
                loading={loading}
                routeResult={{batches}}
                selectedBatchIndex={selectedBatchIndex}
                setSelectedBatchIndex={setSelectedBatchIndex} // user changes this via dropdown
                pickedLoc={pickedLoc}
                setPickedLoc={setPickedLoc}
                endLoc={endLoc}
                setEndLoc={setEndLoc}
                useStartAsEnd={useStartAsEnd}
                setUseStartAsEnd={setUseStartAsEnd}
                dataReady={dataReady}
                progressData={progressData}
                scrollToRouteInfo={scrollToRouteInfo}
                houses={houses}
            />

            {/* Map & Route Info */}
            <div className="flex-1 overflow-y-auto px-4">
                <div className="h-[630px] mb-5 rounded-lg overflow-hidden shadow-lg">
                    <Map
                        center={mapCenter}
                        layer={layer}
                        geofence={geofence}
                        houses={houses}
                        dumpYards={dumpYards}
                        selectedDumpIndex={selectedDumpIndex}
                        routePath={currentBatch?.route_path || []}
                        stops={currentBatch?.stops || []}
                        pickMode={pickMode}
                        onPickLocation={handlePickLocation}
                        onPickEndLocation={handlePickLocation}
                        pickedLoc={pickedLoc}
                        endLoc={endLoc}
                        showHouses={showHouses} // false until a trip is chosen
                    />
                </div>

                <div ref={routeInfoRef} id="route-info" className="mt-10">
                    {currentBatch && <RouteInfo batch={currentBatch}/>}
                </div>
            </div>
        </div>
    );
}
