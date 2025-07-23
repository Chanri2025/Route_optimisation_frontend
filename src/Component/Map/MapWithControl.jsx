import {useState, useEffect, useCallback, useMemo} from "react";
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
    const [batchSize, setBatchSize] = useState(200);
    const [pickedLoc, setPickedLoc] = useState(null);

    const [batches, setBatches] = useState([]);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
    const [showHouses, setShowHouses] = useState(false);

    const [appId, setAppId] = useState("");
    const [userId, setUserId] = useState("");
    const [appName, setAppName] = useState("");
    const [userName, setUserName] = useState("");

    // parse query params
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get("AppId")) setAppId(p.get("AppId"));
        if (p.get("UserId")) setUserId(p.get("UserId"));
        if (p.get("AppName")) setAppName(decodeURIComponent(p.get("AppName")));
        if (p.get("UserName")) setUserName(decodeURIComponent(p.get("UserName")));
    }, []);

    // fetch houses + dumpYards from weight.ictsbm.com
    useEffect(() => {
        if (!appId || !userId) return;
        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch(
                    "https://weight.ictsbm.com/api/Get/GeoFencingWiseHouseList",
                    {
                        method: "GET",
                        headers: {AppId: appId, userId},
                        signal: controller.signal,
                    }
                );
                const data = await res.json();

                // Process the response data
                if (data.geofence) {
                    setGeofence(data.geofence);
                }
                if (Array.isArray(data.houses)) {
                    setHouses(data.houses);
                }
                if (Array.isArray(data.dumpyards)) {
                    setDumpYards(data.dumpyards);
                }
            } catch (e) {
                if (e.name !== "AbortError") {
                    console.error("Error fetching data from weight.ictsbm.com:", e);
                    alert("Failed to fetch houses and dump yards data. Please check your credentials.");
                }
            }
        })();

        return () => controller.abort();
    }, [appId, userId]);

    // only true once both arrays are non-empty
    const dataReady = houses.length > 0 && dumpYards.length > 0;

    const handleOptimizeRoute = useCallback(async () => {
        if (selectedDumpIndex === null) {
            alert("Please select a dump yard.");
            return;
        }
        if (!geofence.trim()) {
            alert("Geofence data is missing.");
            return;
        }
        if (!pickedLoc) {
            alert("Please pick a start location first.");
            return;
        }

        setLoading(true);
        try {
            const dumpYard = dumpYards[selectedDumpIndex];
            const startLocation = {
                lat: +pickedLoc[0],
                lon: +pickedLoc[1],
            };

            const payload = {
                geofence: geofence.trim(),
                houses: houses.map((h) => ({lat: +h.lat, lon: +h.lon})),
                start_location: startLocation,
                dump_location: {lat: +dumpYard.lat, lon: +dumpYard.lon},
                batch_size: Number(batchSize) || 200,
                nn_steps: 0,
            };

            // Make the POST request to optimize_route
            const response = await fetch(`${API_URL}/optimize_route`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Process the response data
            if (data.batches && Array.isArray(data.batches)) {
                setBatches(data.batches);
                setSelectedBatchIndex(0); // Select the first batch by default
                setShowHouses(true); // Show houses on the map when route is optimized

                console.log(`Route optimization successful: ${data.batches.length} batch(es) created`);
            } else {
                throw new Error('Invalid response format: batches array not found');
            }

        } catch (err) {
            console.error('Error optimizing route:', err);
            alert('Failed to optimize route. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [selectedDumpIndex, geofence, houses, dumpYards, batchSize, pickedLoc]);

    const parsedFence = useMemo(() => {
        if (!geofence) return [];
        return geofence.split(";").map((pair) => {
            const [lat, lon] = pair.split(",").map(Number);
            return {lat, lon};
        });
    }, [geofence]);

    const mapCenter = useMemo(() => {
        return houses.length ? [+houses[0].lat, +houses[0].lon] : [0, 0];
    }, [houses]);

    // Get current batch based on selected index
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
            className="h-screen w-full flex flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
                    houses={houses}
                />
            </div>

            {/* Main content area - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="pl-2 ml-2 mr-4 mb-5">
                    {/* Map Container */}
                    <div className="h-[600px] mb-5 rounded-lg overflow-hidden shadow-lg">
                        <Map
                            layer={layer}
                            pickLocationMode={pickMode}
                            onPickLocation={handlePickLocation}
                            geofence={typeof geofence === 'string' ? geofence : ''}
                            houses={currentBatch?.stops || []}
                            dumpYards={dumpYards}
                            selectedDumpIndex={selectedDumpIndex}
                            routePath={currentBatch?.route_path || []}
                            stops={currentBatch?.stops || []}  // Only stops for current batch
                            showHouses={showHouses}
                            isPlaying={false}
                            pickedLoc={pickedLoc}
                            center={mapCenter}
                        />
                    </div>

                    {/* Route Info for Current Batch */}
                    {currentBatch && (
                        <div className="bg-white rounded-lg shadow-lg">
                            <RouteInfo batch={currentBatch}/>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
