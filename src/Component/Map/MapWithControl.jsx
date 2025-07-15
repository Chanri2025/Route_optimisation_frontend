import {useState, useEffect} from "react";
import * as XLSX from "xlsx";
import {ControlPanel} from "./controlpanel.jsx";
import {Map} from "./Map.jsx";
import {Button} from "@/components/ui/button";
import {API_URL} from "@/config.js";

export default function MapWithControl() {
    const [layer, setLayer] = useState("streets");
    const [pickMode, setPickMode] = useState(false);
    const [geofence, setGeofence] = useState("");
    const [pickedLoc, setPickedLoc] = useState(null);
    const [houses, setHouses] = useState([{house_id: "", lat: "", lon: ""}]);
    const [routeResult, setRouteResult] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

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
        const wb = XLSX.read(data, {type: "array"});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, {defval: null});
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
        const payload = {
            geofence,
            houses: houses.map((h) => ({
                lat: parseFloat(h.lat),
                lon: parseFloat(h.lon),
            })),
            nn_steps: 0,
            center: null,
            current_location: pickedLoc ? {lat: pickedLoc[0], lon: pickedLoc[1]} : null,
        };
        const res = await fetch(`${API_URL}optimize_route`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        });
        const data = await res.json();
        setRouteResult(data);
        setIsPlaying(false);
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
        setHouses([...houses, {house_id: "", lat: "", lon: ""}]);
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
            <div className="w-1/4 p-4">
                <ControlPanel
                    geofence={geofence}
                    onGeofenceChange={setGeofence}
                    onGeofenceConfirm={handleGeofenceConfirm}
                    onOptimizeRoute={handleOptimizeRoute}
                    houses={houses}
                    setHouses={setHouses}
                    onHouseChange={handleHouseChange}
                    onAddHouse={addHouse}
                    onRemoveHouse={removeHouse}
                    onHousePickLocation={pickHouse}
                    onLayerChange={setLayer}
                    onSetCurrentLocation={() => setPickMode(true)}
                    routeResult={routeResult}
                />

                {/* Play / Pause */}
                <div className="mt-4 flex space-x-2">
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
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <Map
                    layer={layer}
                    pickLocationMode={pickMode}
                    onPickLocation={handleLocationPicked}
                    geofence={geofence}
                    houses={houses}
                    routePath={routeResult?.route_path}
                    isPlaying={isPlaying}
                />

                {pickedLoc && (
                    <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow">
                        <strong>Picked:</strong> {pickedLoc[0].toFixed(6)}, {pickedLoc[1].toFixed(6)}
                    </div>
                )}
            </div>
        </div>
    );
}
