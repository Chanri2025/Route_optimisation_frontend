// MapWithControl.jsx
import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Map} from "./Map.jsx";
import {
    MapPin,
    Route as RouteIcon,
    Loader2,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import {API_URL} from "@/config.js";

export default function MapWithControl() {
    // UI / loading
    const [layer, setLayer] = useState("streets");
    const [pickMode, setPickMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // Data & map
    const [geofence, setGeofence] = useState("");
    const [pickedLoc, setPickedLoc] = useState(null);
    const [houses, setHouses] = useState([]);
    const [dumpYards, setDumpYards] = useState([]);
    const [selectedDumpIndex, setSelectedDumpIndex] = useState(null);
    const [batchSize, setBatchSize] = useState(200);

    // Route playback
    const [routeResult, setRouteResult] = useState(null);
    const [showHouses, setShowHouses] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showRouteInfo, setShowRouteInfo] = useState(false);

    // App/User
    const [appId, setAppId] = useState("");
    const [userId, setUserId] = useState("");
    const [appName, setAppName] = useState("");
    const [userName, setUserName] = useState("");

    // Read URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const a = params.get("AppId"),
            u = params.get("UserId");
        let A = params.get("AppName"),
            U = params.get("UserName");
        if (A) A = decodeURIComponent(A);
        if (U) U = decodeURIComponent(U);
        if (a) setAppId(a);
        if (u) setUserId(u);
        if (A) setAppName(A);
        if (U) setUserName(U);
    }, []);

    // Fetch geofence, houses & dumpYards
    useEffect(() => {
        if (!appId || !userId) return;
        (async () => {
            try {
                const res = await fetch(
                    "https://weight.ictsbm.com/api/Get/GeoFencingWiseHouseList",
                    {method: "GET", headers: {AppId: appId, userId: userId}}
                );
                const data = await res.json();
                if (data.geofence) setGeofence(data.geofence);
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
                if (Array.isArray(data.dumpyards)) {
                    setDumpYards(data.dumpyards);
                }
            } catch (err) {
                console.error("Fetch failed:", err);
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
                geofence,
                houses: houses.map((h) => ({lat: +h.lat, lon: +h.lon})),
                dump_location: dumpYards[selectedDumpIndex],
                batch_size: batchSize,
                start_location: pickedLoc
                    ? {lat: pickedLoc[0], lon: pickedLoc[1]}
                    : null
            };
            const res = await fetch(`${API_URL}optimize_route`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            // console.log(data.batches);
            setRouteResult(data);
            setShowHouses(true);
            setShowRouteInfo(false);
            setIsPlaying(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Center on first house
    const firstHouseCenter =
        houses.length > 0
            ? [parseFloat(houses[0].lat), parseFloat(houses[0].lon)]
            : [0, 0];

    function formatDistance(km) {
        return km > 1
            ? `${Math.floor(km)} km ${Math.round((km % 1) * 1000)} m`
            : `${Math.round(km * 1000)} m`;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Top Navbar + Controls */}
            <div className="bg-white shadow-md p-4 z-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* App/User */}
                    <div className="flex items-center gap-4">
                        {appName && (
                            <span className="text-lg font-bold text-red-600">{appName}</span>
                        )}
                        {userName && (
                            <span className="text-md font-semibold text-blue-600">
                {userName}
              </span>
                        )}
                    </div>

                    {/* Main Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Layer */}
                        <select
                            value={layer}
                            onChange={(e) => setLayer(e.target.value)}
                            className="w-[140px] p-2 border rounded"
                        >
                            <option value="streets">Streets</option>
                            <option value="satellite">Satellite</option>
                        </select>

                        {/* Pick */}
                        <Button
                            onClick={() => setPickMode(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <MapPin className="mr-1 h-4 w-4"/> Pick Location
                        </Button>


                        {/* Dump Yard selector */}
                        <div className="flex flex-col">
                            <Label className="mb-1 text-sm">Dump Yard</Label>
                            <select
                                value={selectedDumpIndex ?? ""}
                                onChange={(e) => setSelectedDumpIndex(Number(e.target.value))}
                                className="p-2 border rounded"
                            >
                                <option value="" disabled>
                                    Choose
                                </option>
                                {dumpYards.map((dy, i) => (
                                    <option key={i} value={i}>
                                        #{i + 1} — {dy.lat.toFixed(5)}, {dy.lon.toFixed(5)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Batch Size */}
                        <div className="flex flex-col">
                            <Label className="mb-1 text-sm">Batch Size</Label>
                            <Input
                                type="number"
                                min={1}
                                value={batchSize}
                                onChange={(e) => setBatchSize(+e.target.value)}
                                className="w-20"
                            />
                        </div>
                        {/* Optimize */}
                        <Button
                            onClick={handleOptimizeRoute}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin"/> Optimizing…
                                </>
                            ) : (
                                <>
                                    <RouteIcon className="mr-1 h-4 w-4"/> Optimize Route
                                </>
                            )}
                        </Button>

                        {/* Route Info toggle */}
                        {routeResult && (
                            <Button
                                variant="ghost"
                                className="flex items-center ml-auto"
                                onClick={() => setShowRouteInfo((v) => !v)}
                            >
                                Route Info {showRouteInfo ? <ChevronUp/> : <ChevronDown/>}
                            </Button>
                        )}
                    </div>

                </div>

                {/* Optional Route Info Panel */}
                {showRouteInfo && routeResult && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded shadow-sm">
                                <div className="text-sm text-gray-500">Total Distance</div>
                                <div className="font-medium">
                                    {formatDistance(routeResult.speed_profiles[0]?.distance_km || 0)}
                                </div>
                            </div>
                            {routeResult.speed_profiles.map((pr, idx) => (
                                <div key={idx} className="bg-white p-3 rounded shadow-sm">
                                    <div className="text-sm text-gray-500">
                                        At {pr.speed_kmph} km/h
                                    </div>
                                    <div className="font-medium">
                                        {Math.floor(pr.time_minutes / 60)}h{" "}
                                        {Math.round(pr.time_minutes % 60)}m
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <Map
                    layer={layer}
                    pickLocationMode={pickMode}
                    onPickLocation={(lat, lng) => {
                        setPickedLoc([lat, lng]);
                        setPickMode(false);
                    }}
                    geofence={geofence}
                    houses={houses}
                    dumpYards={dumpYards}
                    selectedDumpIndex={selectedDumpIndex}
                    routePath={routeResult?.route_path}
                    showHouses={showHouses}
                    isPlaying={isPlaying}
                    pickedLoc={pickedLoc}
                    onAnimationEnd={() => setShowHouses(true)}
                    center={firstHouseCenter}
                />
                {pickedLoc && (
                    <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow">
                        <strong>Picked:</strong> {pickedLoc[0].toFixed(6)},{" "}
                        {pickedLoc[1].toFixed(6)}
                    </div>
                )}
            </div>
        </div>
    );
}