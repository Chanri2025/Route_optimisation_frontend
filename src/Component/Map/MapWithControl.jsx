import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { ControlPanel } from "./controlpanel.jsx";
import { Map } from "./Map.jsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/config.js";
import { Loader2 } from "lucide-react";

export default function MapWithControl() {
    // Keep only essential state
    const [layer, setLayer] = useState("streets");
    const [geofence, setGeofence] = useState("");
    const [houses, setHouses] = useState([]);
    const [houseIdToSeq, setHouseIdToSeq] = useState({}); // Map House_ID -> sequential number
    const [seqToHouseId, setSeqToHouseId] = useState({}); // Map sequential number -> House_ID
    const [lastVisitedHouseId, setLastVisitedHouseId] = useState(null);
    const [routeResult, setRouteResult] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [employeeId, setEmployeeId] = useState("");
    const [loading, setLoading] = useState(false);

    const [currentDistance, setCurrentDistance] = useState(0);
    const [visitedHouseIds, setVisitedHouseIds] = useState(new Set());
    const [currentRouteIndex, setCurrentRouteIndex] = useState(0); // index in route_path

    // Effect to handle route animation
    // Helper to calculate distance between two lat/lon points (Haversine formula)
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371; // km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    useEffect(() => {
        let animationInterval;
        if (isPlaying && routeResult && routeResult.route_path) {
            const totalPoints = routeResult.route_path.length;
            const updateInterval = 1000; // 1 second
            animationInterval = setInterval(() => {
                setCurrentRouteIndex(prevIdx => {
                    const nextIdx = prevIdx + 1;
                    if (nextIdx >= totalPoints) {
                        setIsPlaying(false);
                        return prevIdx;
                    }
                    // Calculate distance from previous point to current
                    const prevPoint = routeResult.route_path[prevIdx];
                    const currPoint = routeResult.route_path[nextIdx];
                    let addDist = 0;
                    if (prevPoint && currPoint) {
                        addDist = haversineDistance(
                            Number(prevPoint.lat), Number(prevPoint.lon),
                            Number(currPoint.lat), Number(currPoint.lon)
                        );
                    }
                    setCurrentDistance(d => d + addDist);

                    // Debug: Animation tick and visitedHouseIds
                    console.log("[ANIMATION] Tick: currentRouteIndex", prevIdx, "→", nextIdx);
                    console.log("[ANIMATION] VisitedHouseIds before:", Array.from(visitedHouseIds));
                    if (currPoint) {
                        // Debug: Print distances from currPoint to all houses
                        houses.forEach(h => {
                            const dist = haversineDistance(
                                Number(h.lat), Number(h.lon),
                                Number(currPoint.lat), Number(currPoint.lon)
                            );
                            console.log(`[MATCH DIST] Route pt (${currPoint.lat},${currPoint.lon}) to house ${h.house_id} (${h.lat},${h.lon}):`, dist);
                        });

                        const found = houses.find(h => {
                            const dist = haversineDistance(
                                Number(h.lat), Number(h.lon),
                                Number(currPoint.lat), Number(currPoint.lon)
                            );
                            return dist < 0.02;
                        });

                        if (found && !visitedHouseIds.has(found.house_id)) {
                            console.log("[ANIMATION] Found house:", found.house_id, "at", currPoint);
                            setLastVisitedHouseId(found.house_id);
                            setVisitedHouseIds(prevSet => {
                                const newSet = new Set(prevSet);
                                newSet.add(found.house_id);
                                console.log("[ANIMATION] Updated visited houses:", Array.from(newSet));
                                return newSet;
                            });
                        }
                    }
                    return nextIdx;
                });
            }, updateInterval);
        }
        return () => {
            if (animationInterval) {
                clearInterval(animationInterval);
            }
        };
    }, [isPlaying, routeResult, houses, visitedHouseIds, currentRouteIndex, currentDistance]);

    // .txt loader
    function handleGeofenceFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            let text = e.target?.result.trim();
            text = text.replace(/\r?\n/g, ";");
            setGeofence(text);
        };
        reader.readAsText(file);
    }

    // .xlsx loader using correct column names
    async function handleHousesFileUpload(file) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
        setHouses(
            rows.map((r) => ({
                house_id: r.House_Id?.toString() || "",
                lat: r.House_Lat?.toString() || "",
                lon: r.House_Long?.toString() || "",
            }))
        );
    }

    function handleGeofenceConfirm() {
        // Optional confirm
    }

    async function handleOptimizeRoute() {
        if (!employeeId) {
            alert("Please enter Employee ID");
            return;
        }
        setLoading(true);
        setRouteResult(null); // Reset previous results
        setHouses([]); // Reset houses
        setGeofence(""); // Reset geofence

        setCurrentDistance(0); // Reset distance
        setVisitedHouseIds(new Set()); // Reset visited house IDs
        setCurrentRouteIndex(0); // Reset route index
        try {
            // Fetch route data for the employee
            const res = await fetch(`http://localhost:5000/optimize_route/${employeeId}`, {
                method: 'GET',
                headers: {
                    "Accept": "application/json",
                },
                credentials: 'include',
            });
            const data = await res.json();
            console.log("[RAW BACKEND DATA]", data);
            if (!res.ok || data.status === "error") {
                throw new Error(data.message || "Failed to fetch route data");
            }
            console.log("Received data:", data); // For debugging
            console.log("Raw house data:", data.house_coords || data.houses);
            // Reset progress tracking

            setCurrentDistance(0);
            setVisitedHouseIds(new Set());
            setCurrentRouteIndex(0);
            // Set the geofence from the response
            if (data.geofence_str) {
                setGeofence(data.geofence_str);
            } else if (data.geofence) {
                // Convert geofence array to string if needed
                const geofenceStr = data.geofence.map(coord => `${coord[0]},${coord[1]}`).join(';');
                setGeofence(geofenceStr);
            }
            // Robustly extract house data for the map
            let housesData = [];
            // Patch: If pathway and route_path exist, reconstruct housesData
            if (Array.isArray(data.pathway) && Array.isArray(data.route_path)) {
                // pathway[1] to pathway[pathway.length-2] are house stops
                // route_path[1] to route_path[route_path.length-2] are house coordinates
                const houseStops = data.pathway.slice(1, -1); // skip depot start/end
                const houseCoords = data.route_path.slice(1, -1); // skip depot start/end
                housesData = houseStops.map((stop, idx) => {
                    // Extract house_id from string like "Stop N: Visit XXX"
                    let house_id = null;
                    const match = stop.match(/Visit (\d+)/);
                    if (match) house_id = match[1];
                    const coord = houseCoords[idx] || {};
                    return {
                        house_id: house_id ? String(house_id) : null,
                        lat: Number(coord.lat),
                        lon: Number(coord.lon)
                    };
                });
                console.log("[RECONSTRUCTED HOUSES ARRAY]", housesData);
            } else if (Array.isArray(data.house_coords)) {
                // Use house_coords if present
                housesData = data.house_coords.map(h => ({
                    house_id: String(h.House_ID || h.house_id),
                    lat: Number(h.lat || h.Lat || h.latitude),
                    lon: Number(h.lon || h.Lon || h.longitude)
                }));
                console.log("[RAW HOUSES ARRAY] (house_coords)", housesData);
            } else if (Array.isArray(data.houses)) {
                housesData = data.houses.map(h => ({
                    house_id: String(h.House_ID || h.house_id),
                    lat: Number(h.lat || h.Lat || h.latitude),
                    lon: Number(h.lon || h.Lon || h.longitude)
                }));
                console.log("[RAW HOUSES ARRAY] (houses)", housesData);
            }
            // Filter out invalid houses
            housesData = housesData.filter(h => h.house_id && !isNaN(h.lat) && !isNaN(h.lon));
            console.log("[CLEANED] housesData:", housesData);
            // Build mapping: House_ID <-> sequential number
            const idToSeq = {};
            const seqToId = {};
            housesData.forEach((house, idx) => {
                idToSeq[String(house.house_id)] = idx + 1;
                seqToId[idx + 1] = String(house.house_id);
            });
            setHouseIdToSeq(idToSeq);
            setSeqToHouseId(seqToId);
            console.log("Processed houses for map:", housesData);
            console.log("House_ID to Seq mapping:", idToSeq);
            console.log("Seq to House_ID mapping:", seqToId);
            console.log("Houses count:", housesData.length);
            setHouses(housesData);
            // Debug logs for real-time update
            console.log("[DEBUG] Houses state set:", housesData);
            console.log("[DEBUG] visitedHouseIds:", visitedHouseIds);
            console.log("[DEBUG] currentHouse (visitedHouseIds.size):", visitedHouseIds.size);
            // Initialize route result
            const initialRouteResult = {
                ...data,
                route_path: data.route_path || data.pathway || [],
                total_distance: data.total_distance || 0
            };
            setRouteResult(initialRouteResult);
            setIsPlaying(false);
        } catch (error) {
            console.error("Error:", error);
            alert(error.message || "Failed to fetch employee data");
        } finally {
            setLoading(false);
        }
    }

    function handleLocationPicked(lat, lng) {
        setPickedLoc([lat, lng]);
        setPickMode(false);
    }

    function handleHouseChange(idx, field, value) {
        const updated = [...houses];
        updated[idx][field] = value;
        setHouses(updated);
    }

    function addHouse() {
        setHouses([...houses, { house_id: "", lat: "", lon: "" }]);
    }

    function removeHouse(idx) {
        setHouses(houses.filter((_, i) => i !== idx));
    }

    function pickHouse(idx) {
        setPickMode(true);
        // Optionally store idx for location pick
    }

    useEffect(() => {
        setIsPlaying(false);
    }, [routeResult]);

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-1/4 p-4 space-y-4">
                <ControlPanel
  lastVisitedHouseId={lastVisitedHouseId}
                    employeeId={employeeId}
                    setEmployeeId={setEmployeeId}
                    geofence={geofence}
                    onGeofenceChange={setGeofence}
                    onOptimizeRoute={handleOptimizeRoute}
                    houses={houses}
                    setHouses={setHouses}
                    routeResult={routeResult}
                    setRouteResult={setRouteResult}
                    currentHouse={visitedHouseIds.size}
                    currentDistance={currentDistance}
                    isLoading={loading}
                    houseIdToSeq={houseIdToSeq}
                    seqToHouseId={seqToHouseId}
                />




                {/* Play Controls */}
                {routeResult && (
                    <div className="flex space-x-2">
                        <Button
                            onClick={() => setIsPlaying(true)}
                            disabled={isPlaying || !(routeResult?.route_path?.length > 1)}
                            className="flex-1"
                        >
                            Play
                        </Button>
                        <Button
                            onClick={() => setIsPlaying(false)}
                            disabled={!isPlaying}
                            className="flex-1"
                        >
                            Pause
                        </Button>
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <Map
                    layer={layer}
                    geofence={geofence}
                    houses={houses}
                    routePath={routeResult?.route_path}
                    isPlaying={isPlaying}
                    visitedHouseIds={visitedHouseIds}
                    currentRouteIndex={currentRouteIndex}
                />
            </div>
        </div>
    );
}

