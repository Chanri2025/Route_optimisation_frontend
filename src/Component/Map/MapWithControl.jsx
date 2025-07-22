import {useState, useEffect} from "react";
import Map from "./Map.jsx";
import ControlPanel from "./ControlPanel.jsx";
import RouteInfo from "./RouteInfo.jsx";
import {API_URL} from "@/config.js";

export default function MapWithControl() {
    // UI / loading
    const [layer, setLayer] = useState("streets");
    const [pickMode, setPickMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // Data & map inputs
    const [geofence, setGeofence] = useState("");
    const [houses, setHouses] = useState([]);
    const [dumpYards, setDumpYards] = useState([]);
    const [selectedDumpIndex, setSelectedDumpIndex] = useState(null);
    const [batchSize, setBatchSize] = useState(200);
    const [pickedLoc, setPickedLoc] = useState(null);

    // Optimized batches
    const [batches, setBatches] = useState([]);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
    const [showHouses, setShowHouses] = useState(false);

    // App/User params
    const [appId, setAppId] = useState("");
    const [userId, setUserId] = useState("");
    const [appName, setAppName] = useState("");
    const [userName, setUserName] = useState("");

    // Read URL params
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const a = p.get("AppId"), u = p.get("UserId");
        const A = p.get("AppName"), U = p.get("UserName");
        if (a) setAppId(a);
        if (u) setUserId(u);
        if (A) setAppName(decodeURIComponent(A));
        if (U) setUserName(decodeURIComponent(U));
    }, []);

    // Fetch geofence, houses & dumpYards
    useEffect(() => {
        if (!appId || !userId) return;
        (async () => {
            try {
                const res = await fetch("https://weight.ictsbm.com/api/Get/GeoFencingWiseHouseList", {
                    method: "GET",
                    headers: {AppId: appId, userId}
                });
                const data = await res.json();
                data.geofence && setGeofence(data.geofence);
                if (Array.isArray(data.houses)) {
                    setHouses(
                        data.houses.map((h, i) => ({
                            house_id: `H${i + 1}`,
                            lat: h.lat.toString(),
                            lon: h.lon.toString()
                        }))
                    );
                    setShowHouses(true);
                }
                Array.isArray(data.dumpyards) && setDumpYards(data.dumpyards);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [appId, userId]);

    // Optimize route
    async function handleOptimizeRoute() {
        if (selectedDumpIndex === null) {
            alert("Please select a dump yard.");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                geofence: geofence,
                houses: houses.map(h => ({lat: +h.lat, lon: +h.lon})),
                dump_location: {
                    lat: +dumpYards[selectedDumpIndex].lat,
                    lon: +dumpYards[selectedDumpIndex].lon
                },
                batch_size: Number(batchSize),
                start_location: pickedLoc ? {lat: +pickedLoc[0], lon: +pickedLoc[1]} : null,
                nn_steps: 0
            };
            console.log("Sending payload:", payload);
            const res = await fetch(`${API_URL}optimize_route`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload)
            });
            const text = await res.text();
            console.log("Response:", res.status, text);
            if (!res.ok) throw new Error(text || `Status ${res.status}`);
            const data = JSON.parse(text);
            setBatches(data.batches || []);
            setSelectedBatchIndex(0);
            setShowHouses(true);
        } catch (err) {
            console.error(err);
            alert(`Optimization failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    // Parse geofence for map rendering
    const parsedFence = typeof geofence === "string"
        ? geofence.split(";").map(pair => {
            const [lat, lon] = pair.split(",").map(Number);
            return {lat, lon};
        })
        : geofence;

    // Map center fallback
    const firstHouseCenter = houses.length
        ? [parseFloat(houses[0].lat), parseFloat(houses[0].lon)]
        : [0, 0];

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Controls + Header */}
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
            />

            {/* Map */}
            <div className="flex-1 relative m-5">
                <Map
                    layer={layer}
                    pickLocationMode={pickMode}
                    onPickLocation={(lat, lng) => {
                        setPickedLoc([lat, lng]);
                        setPickMode(false);
                    }}
                    geofence={parsedFence}
                    houses={houses}
                    dumpYards={dumpYards}
                    selectedDumpIndex={selectedDumpIndex}
                    routePath={batches[selectedBatchIndex]?.route_path || []}
                    stops={batches[selectedBatchIndex]?.stops || []}
                    showHouses={showHouses}
                    isPlaying={false}
                    pickedLoc={pickedLoc}
                    onAnimationEnd={() => setShowHouses(true)}
                    center={firstHouseCenter}
                />
            </div>

            {/* Route Info */}
            {batches.length > 0 && (
                <div className="max-h-80 overflow-auto bg-white border-t">
                    <RouteInfo batches={batches}/>
                </div>
            )}
        </div>
    );
}
