// src/components/MapWithControl.jsx
import React, {useState, useEffect, useCallback, useMemo} from "react";
import Map from "./Map.jsx";
import ControlPanel from "./ControlPanel.jsx";
import RouteInfo from "./RouteInfo.jsx";
import {API_URL} from "@/config.js";

export default function MapWithControl() {
    const [layer, setLayer] = useState("streets");
    const [pickMode, setPickMode] = useState(false);
    const [loading, setLoading] = useState(false);

    const [geofence, setGeofence] = useState("");
    const [houses, setHouses] = useState([]);
    const [dumpYards, setDumpYards] = useState([]);
    const [selectedDumpIndex, setSelectedDumpIndex] = useState(null);
    const [batchSize, setBatchSize] = useState(250);
    const [pickedLoc, setPickedLoc] = useState(null);

    const [batches, setBatches] = useState([]);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
    const [showHouses, setShowHouses] = useState(false);

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

    // parse URL params
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get("AppId")) setAppId(p.get("AppId"));
        if (p.get("UserId")) setUserId(p.get("UserId"));
        if (p.get("AppName")) setAppName(decodeURIComponent(p.get("AppName")));
        if (p.get("UserName")) setUserName(decodeURIComponent(p.get("UserName")));
    }, []);

    // fetch geofence, houses, dump yards
    useEffect(() => {
        if (!appId || !userId) return;
        const ctrl = new AbortController();
        (async () => {
            try {
                const res = await fetch(
                    "https://weight.ictsbm.com/api/Get/GeoFencingWiseHouseList",
                    {
                        method: "GET",
                        headers: {AppId: appId, userId},
                        signal: ctrl.signal,
                    }
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

    const dataReady = houses.length > 0 && dumpYards.length > 0;

    const handleOptimizeRoute = useCallback(async () => {
        if (selectedDumpIndex == null) {
            alert("Select a dump yard");
            return;
        }
        if (!geofence.trim()) {
            alert("Missing geofence");
            return;
        }
        if (!pickedLoc) {
            alert("Pick start location");
            return;
        }

        setLoading(true);
        setBatches([]);
        setSelectedBatchIndex(0);
        setProgressData({
            show: true,
            currentBatch: 0,
            totalBatches: 0,
            currentStatus: "Preparing optimization…",
            housesProcessed: 0,
            totalHouses: houses.length,
        });

        // Prepare batch arrays
        const dump = dumpYards[selectedDumpIndex];
        const userStart = {lat: +pickedLoc[0], lon: +pickedLoc[1]};
        const dumpLoc = {lat: +dump.lat, lon: +dump.lon};
        const coords = houses.map((h) => ({...h, lat: +h.lat, lon: +h.lon}));
        const houseBatches = [];
        for (let i = 0; i < coords.length; i += batchSize) {
            houseBatches.push(coords.slice(i, i + batchSize));
        }

        setProgressData((p) => ({
            ...p,
            totalBatches: houseBatches.length,
        }));

        try {
            let processed = 0;

            for (let idx = 0; idx < houseBatches.length; idx++) {
                const batchHouses = houseBatches[idx];
                const startLoc = idx === 0 ? userStart : dumpLoc;

                setProgressData((p) => ({
                    ...p,
                    currentBatch: idx + 1,
                    currentStatus: `Processing batch ${idx + 1} of ${houseBatches.length}…`,
                }));

                const payload = {
                    geofence: geofence.trim(),
                    houses: batchHouses.map((h) => ({lat: h.lat, lon: h.lon})),
                    start_location: startLoc,
                    dump_location: dumpLoc,
                    batch_size: batchHouses.length,
                    nn_steps: 0,
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
                    total_batches: houseBatches.length,
                    start_type: idx === 0 ? "User Location" : "Dump Yard",
                    houses_in_batch: batchHouses.length,
                    stops: b.stops.map((s, i) => ({
                        ...s,
                        house_id: batchHouses[i]?.house_id,
                    })),
                };

                // append and select
                setBatches((prev) => [...prev, batchObj]);
                setSelectedBatchIndex(idx);

                processed += batchHouses.length;
                setProgressData((p) => ({
                    ...p,
                    housesProcessed: processed,
                }));
            }

            setShowHouses(true);
        } catch (err) {
            console.error(err);
            alert("Failed to optimize route.");
        } finally {
            setProgressData((p) => ({...p, show: false}));
            setLoading(false);
        }
    }, [
        selectedDumpIndex,
        geofence,
        houses,
        dumpYards,
        batchSize,
        pickedLoc,
    ]);

    const mapCenter = useMemo(
        () => (houses.length ? [+houses[0].lat, +houses[0].lon] : [0, 0]),
        [houses]
    );
    const currentBatch = useMemo(
        () => batches[selectedBatchIndex] || null,
        [batches, selectedBatchIndex]
    );
    const handlePickLocation = useCallback((lat, lng) => {
        setPickedLoc([lat, lng]);
        setPickMode(false);
    }, []);

    return (
        <div
            className="h-screen w-full flex flex-col overflow-hidden bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
            <div className="flex-shrink-0 mr-4">
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
                    setSelectedBatchIndex={setSelectedBatchIndex}
                    pickedLoc={pickedLoc}
                    setPickedLoc={setPickedLoc}
                    dataReady={dataReady}
                    progressData={progressData}
                />
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="px-4 mb-5">
                    <div className="h-[530px] mb-5 rounded-lg overflow-hidden shadow-lg">
                        <Map
                            layer={layer}
                            pickLocationMode={pickMode}
                            onPickLocation={handlePickLocation}
                            geofence={geofence}
                            houses={currentBatch?.stops || []}
                            dumpYards={dumpYards}
                            selectedDumpIndex={selectedDumpIndex}
                            routePath={currentBatch?.route_path || []}
                            stops={currentBatch?.stops || []}
                            showHouses={showHouses}
                            pickedLoc={pickedLoc}
                            center={mapCenter}
                        />
                    </div>

                    {currentBatch && (
                        <div className="rounded-lg shadow-lg">
                            <div className="bg-white p-4 rounded-t-lg border-b">
                                <h3 className="text-lg font-semibold">
                                    Batch {currentBatch.batch_number} of{" "}
                                    {currentBatch.total_batches}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Starting from:{" "}
                                    <span className="font-medium">{currentBatch.start_type}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Houses in this batch:{" "}
                                    <span className="font-medium">
                    {currentBatch.houses_in_batch}
                  </span>
                                </p>
                            </div>
                            <RouteInfo batch={currentBatch}/>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
