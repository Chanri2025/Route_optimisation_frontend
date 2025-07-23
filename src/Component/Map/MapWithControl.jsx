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

    // fetch houses + dumpYards
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
                if (data.geofence) setGeofence(data.geofence);
                if (Array.isArray(data.houses)) setHouses(data.houses);
                if (Array.isArray(data.dumpyards)) setDumpYards(data.dumpyards);
            } catch (e) {
                if (e.name !== "AbortError") console.error(e);
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

            // … rest unchanged …
        } catch (err) {
            // …
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

    const currentBatch = useMemo(
        () => batches[selectedBatchIndex] || null,
        [batches, selectedBatchIndex]
    );

    const handlePickLocation = useCallback((lat, lng) => {
        setPickedLoc([lat, lng]);
        setPickMode(false);
    }, []);

    return (
        <div className="flex flex-col h-screen overflow-hidden">
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

            <div className="flex-1 relative m-5 rounded-b-lg">
                <Map
                    layer={layer}
                    pickLocationMode={pickMode}
                    onPickLocation={handlePickLocation}
                    geofence={typeof geofence === 'string' ? geofence : ''}
                    houses={houses}
                    dumpYards={dumpYards}
                    selectedDumpIndex={selectedDumpIndex}
                    routePath={currentBatch?.route_path || []}
                    stops={currentBatch?.stops || []}
                    showHouses={showHouses}
                    isPlaying={false}
                    pickedLoc={pickedLoc}
                    center={mapCenter}
                />

            </div>

            {currentBatch && (
                <div className="max-h-80 overflow-auto bg-white border-t">
                    <RouteInfo batch={currentBatch}/>
                </div>
            )}
        </div>
    );
}
