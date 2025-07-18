import {useState, useEffect, useRef} from "react";
import * as XLSX from "xlsx";
import {ControlPanel} from "./controlpanel.jsx";
import {Map} from "./Map.jsx";
import {Button} from "@/components/ui/button";
import {API_URL} from "@/config.js";
import {PanelLeftOpen, PanelRightOpen} from "lucide-react";

export default function MapWithControl() {
    const [layer, setLayer] = useState("streets");
    const [pickMode, setPickMode] = useState(false);
    const [geofence, setGeofence] = useState("");
    const [pickedLoc, setPickedLoc] = useState(null);
    const [houses, setHouses] = useState([{house_id: "", lat: "", lon: ""}]);
    const [routeResult, setRouteResult] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showHouses, setShowHouses] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const resizerRef = useRef(null);

    function handleGeofenceFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            let text = e.target?.result.trim();
            text = text.replace(/\r?\n/g, ";");
            setGeofence(text);
        };
        reader.readAsText(file);
    }

    async function handleHousesFileUpload(file) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, {type: "array"});
        const ws = wb.Sheets[wb.SheetNames];
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
        setShowHouses(true);
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
    }

    useEffect(() => {
        setIsPlaying(false);
    }, [routeResult]);

    function handleAnimationEnd() {
        setShowHouses(true);
    }

    const firstHouseCenter = (() => {
        if (houses.length === 0) return null;
        const lat = parseFloat(houses[0].lat);
        const lon = parseFloat(houses[0].lon);
        if (isNaN(lat) || isNaN(lon)) return null;
        return [lat, lon];
    })();

    const handleMouseDown = (e) => {
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const doDrag = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth >= 250 && newWidth <= 600) setSidebarWidth(newWidth);
        };

        const stopDrag = () => {
            document.removeEventListener("mousemove", doDrag);
            document.removeEventListener("mouseup", stopDrag);
        };

        document.addEventListener("mousemove", doDrag);
        document.addEventListener("mouseup", stopDrag);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <div
                className={`relative bg-white border-r shadow-md transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-[60px]' : ''}`}
                style={{width: sidebarCollapsed ? "60px" : `${sidebarWidth}px`}}
            >
                {/* Collapse Toggle */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="absolute top-2 right-2 z-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-2 transition duration-300 ease-in-out"
                >
                    {sidebarCollapsed ? <PanelRightOpen size={28}/> : <PanelLeftOpen size={28}/>}
                </button>

                {/* Control Panel */}
                {!sidebarCollapsed && (
                    <div className="h-full overflow-y-auto p-2 animate-fade-in">
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
                            setShowHouses={setShowHouses}
                        />

                        <div className="mt-4 flex space-x-2">
                            <Button
                                onClick={() => setIsPlaying(true)}
                                disabled={isPlaying || !(routeResult?.route_path?.length > 1)}
                                className="flex-1 transition duration-300 ease-in-out"
                            >
                                Play
                            </Button>
                            <Button
                                onClick={() => setIsPlaying(false)}
                                disabled={!isPlaying}
                                className="flex-1 transition duration-300 ease-in-out"
                            >
                                Pause
                            </Button>
                        </div>
                    </div>
                )}

                {/* Drag Handle */}
                {!sidebarCollapsed && (
                    <div
                        ref={resizerRef}
                        onMouseDown={handleMouseDown}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-blue-200 hover:bg-blue-400 transition-colors duration-300 ease-in-out"
                    />
                )}
            </div>

            {/* Map */}
            <div className="flex-1 relative transition-all duration-500 ease-in-out">
                <Map
                    layer={layer}
                    pickLocationMode={pickMode}
                    onPickLocation={handleLocationPicked}
                    geofence={geofence}
                    houses={houses}
                    routePath={routeResult?.route_path}
                    isPlaying={isPlaying}
                    pickedLoc={pickedLoc}
                    showHouses={showHouses}
                    onAnimationEnd={handleAnimationEnd}
                    center={firstHouseCenter}
                />

                {pickedLoc &&
                    Array.isArray(pickedLoc) &&
                    pickedLoc.length === 2 &&
                    typeof pickedLoc[0] === "number" &&
                    typeof pickedLoc[1] === "number" && (
                        <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow animate-fade-in">
                            <strong>Picked:</strong> {pickedLoc[0].toFixed(6)}, {pickedLoc[1].toFixed(6)}
                        </div>
                    )}
            </div>
        </div>
    );
}
