// src/components/Map.jsx
import React, {useMemo, useRef, useEffect} from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    useMap,
    useMapEvents,
    ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import {FiMaximize2, FiMinimize2, FiHome} from "react-icons/fi";
import {createRoot} from "react-dom/client";
import {PanControl} from "./PanControl.jsx";
import {RiRecycleFill} from "react-icons/ri";
import {PiGarageThin} from "react-icons/pi";
import {MdOutlineOtherHouses} from "react-icons/md";
import ReactDOMServer from "react-dom/server";

// ─── Fix default marker icons ────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const defaultIcon = new L.Icon.Default();

// Start‑location (garbage pickup) icon
const startLocationIcon = new L.Icon({
    iconUrl: "/garbage-pickup-point.png",
    iconSize: [40, 60],
    iconAnchor: [20, 60],
    popupAnchor: [0, -60],
});

/* ── NEW: red icon for END location ───────────────────────────────────────── */
const endLocationIcon = new L.Icon({
    iconRetinaUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red-2x.png",
    iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// ─── Home Control ───────────────────────────────────────────────────────────
export function HomeControl({position = "topright", pickedLoc, center}) {
    const map = useMap();
    useEffect(() => {
        const Home = L.Control.extend({
            options: {position},
            onAdd() {
                const container = L.DomUtil.create("div", "leaflet-bar");
                const link = L.DomUtil.create("a", "", container);
                link.href = "#";
                link.title = "Center Map";
                Object.assign(link.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    background: "white",
                    cursor: "pointer",
                });
                L.DomEvent.disableClickPropagation(link);

                const root = createRoot(link);
                root.render(<FiHome size={17}/>);

                L.DomEvent.on(link, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    if (pickedLoc) map.setView(pickedLoc, 16);
                    else if (center) map.setView(center, 15);
                    else map.setView([0, 0], 2);
                });
                return container;
            },
        });
        const ctrl = new Home();
        map.addControl(ctrl);
        return () => map.removeControl(ctrl);
    }, [map, position, pickedLoc, center]);
    return null;
}

// ─── Fullscreen Control ─────────────────────────────────────────────────────
export function FullscreenControl({position = "topright"}) {
    const map = useMap();
    useEffect(() => {
        const FS = L.Control.extend({
            options: {position},
            onAdd() {
                const container = L.DomUtil.create("div", "leaflet-bar");
                const link = L.DomUtil.create("a", "", container);
                link.href = "#";
                link.title = "Toggle Fullscreen";
                Object.assign(link.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "30px",
                    height: "30px",
                    background: "white",
                    cursor: "pointer",
                });
                L.DomEvent.disableClickPropagation(link);

                const root = createRoot(link);
                const renderIcon = () =>
                    root.render(
                        document.fullscreenElement ? (
                            <FiMinimize2 size={17}/>
                        ) : (
                            <FiMaximize2 size={17}/>
                        )
                    );
                renderIcon();

                L.DomEvent.on(link, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    const el = map.getContainer();
                    if (!document.fullscreenElement) el.requestFullscreen().catch(console.error);
                    else document.exitFullscreen();
                    renderIcon();
                });
                return container;
            },
        });
        const ctrl = new FS();
        map.addControl(ctrl);
        return () => map.removeControl(ctrl);
    }, [map, position]);
    return null;
}

// ─── Draw arrows ────────────────────────────────────────────────────────────
function RouteWithArrows({routePath}) {
    const map = useMap();
    useEffect(() => {
        if (!routePath?.length) return;
        const layers = [];
        for (let i = 0; i < routePath.length - 1; i += 3) {
            const [s, e] = [
                [routePath[i].lat, routePath[i].lon],
                [routePath[i + 1].lat, routePath[i + 1].lon],
            ];
            const angle = (Math.atan2(e[0] - s[0], e[1] - s[1]) * 180) / Math.PI;
            const html = `<div style="transform: rotate(${angle}deg);"></div>`;
            const icon = L.divIcon({html, className: ""});
            const marker = L.marker([(s[0] + e[0]) / 2, (s[1] + e[1]) / 2], {icon});
            marker.addTo(map);
            layers.push(marker);
        }
        return () => layers.forEach((l) => map.removeLayer(l));
    }, [map, routePath]);
    return null;
}

// ─── Click Handler ──────────────────────────────────────────────────────────
function MapClickHandler({pickMode, onPickLocation, onPickEndLocation}) {
    useMapEvents({
        click(e) {
            if (pickMode === "start") onPickLocation(e.latlng.lat, e.latlng.lng);
            if (pickMode === "end") onPickEndLocation(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// ─── Fit to Fence ───────────────────────────────────────────────────────────
function FitBounds({parsedFence}) {
    const map = useMap();
    useEffect(() => {
        if (parsedFence.length > 1) {
            map.fitBounds(parsedFence.map((p) => [p.lat, p.lon]), {padding: [20, 20]});
        }
    }, [map, parsedFence]);
    return null;
}

// ─── Main Map ───────────────────────────────────────────────────────────────
export default function Map({
                                center,
                                layer,
                                geofence,
                                houses,
                                showHouses,
                                dumpYards,
                                selectedDumpIndex,
                                routePath,
                                stops,
                                pickMode,
                                onPickLocation,
                                onPickEndLocation,
                                pickedLoc,
                                endLoc,
                            }) {
    const mapRef = useRef(null);

    const parsedFence = useMemo(() => {
        if (typeof geofence !== "string") return [];
        return geofence
            .split(";")
            .map((seg) => {
                const [lat, lon] = seg.split(",").map(parseFloat);
                return isNaN(lat) || isNaN(lon) ? null : {lat, lon};
            })
            .filter(Boolean);
    }, [geofence]);

    return (
        <MapContainer
            ref={mapRef}
            center={center}
            zoom={15}
            zoomControl={false}
            className="h-full w-full"
        >
            <TileLayer
                url={
                    layer === "satellite"
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
            />

            <ZoomControl position="topright"/>
            <HomeControl pickedLoc={pickedLoc} center={center}/>
            <PanControl delta={0.005} position="bottomleft"/>
            <FullscreenControl/>
            <FitBounds parsedFence={parsedFence}/>
            <MapClickHandler
                pickMode={pickMode}
                onPickLocation={onPickLocation}
                onPickEndLocation={onPickEndLocation}
            />

            {/* Geofence polygon */}
            {parsedFence.length > 1 && (
                <Polygon
                    positions={parsedFence.map((p) => [p.lat, p.lon])}
                    pathOptions={{color: "#031854", weight: 2, fillOpacity: 0.1, dashArray: "10 4 2 4"}}
                />
            )}

            {/* House stops with custom icon */}
            {showHouses &&
                stops.map((s, i) => {
                    const isFirst = i === 0;
                    const isLast = i === stops.length - 1;

                    // Skip the first house icon in first batch (startLoc shown separately)
                    if (isFirst && pickedLoc && s.lat === pickedLoc[0] && s.lon === pickedLoc[1]) {
                        return null;
                    }

                    // Determine icon based on position
                    let icon = L.divIcon({
                        html: ReactDOMServer.renderToString(
                            <div
                                style={{
                                    backgroundColor: "#1e3a8a",
                                    color: "#fff",
                                    borderRadius: "50%",
                                    width: "32px",
                                    height: "32px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    fontSize: "1.2rem",
                                    boxShadow: "0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3)",
                                }}
                            >
                                <MdOutlineOtherHouses/>
                            </div>
                        ),
                        iconSize: [32, 32],
                        iconAnchor: [16, 16],
                        className: "",
                    });

                    // Replace icon based on batch position
                    if (isFirst && selectedDumpIndex != null) {
                        icon = L.divIcon({
                            html: ReactDOMServer.renderToString(
                                <div
                                    style={{
                                        backgroundColor: "#086b03",
                                        color: "white",
                                        fontWeight: "bold",
                                        borderRadius: "50%",
                                        width: "36px",
                                        height: "36px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        fontSize: "1.2rem",
                                        boxShadow: "0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3)",
                                    }}
                                >
                                    <RiRecycleFill/>
                                </div>
                            ),
                            iconSize: [36, 36],
                            iconAnchor: [18, 18],
                            className: "",
                        });
                    }

                    if (isLast && endLoc && s.lat === endLoc[0] && s.lon === endLoc[1]) {
                        icon = L.divIcon({
                            html: ReactDOMServer.renderToString(
                                <div
                                    style={{
                                        backgroundColor: "#e00a0a",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        width: "36px",
                                        height: "36px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        fontSize: "1.2rem",
                                        boxShadow: "0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3)",
                                    }}
                                >
                                    <PiGarageThin/>
                                </div>
                            ),
                            iconSize: [36, 36],
                            iconAnchor: [18, 18],
                            className: "",
                        });
                    }

                    return (
                        <Marker key={i} position={[s.lat, s.lon]} icon={icon}>
                            <Popup>
                                Stop {s.stop ?? i + 1}
                                {s.house_id && <div>House: {s.house_id}</div>}
                            </Popup>
                        </Marker>
                    );
                })}


            {/* Selected dump yard */}
            {selectedDumpIndex != null && dumpYards[selectedDumpIndex] && (
                <Marker
                    position={[
                        +dumpYards[selectedDumpIndex].lat,
                        +dumpYards[selectedDumpIndex].lon,
                    ]}
                    icon={L.divIcon({
                        html: ReactDOMServer.renderToString(
                            <div
                                style={{
                                    backgroundColor: "#086b03",
                                    color: "white",
                                    fontWeight: "bold",
                                    borderRadius: "50%",
                                    textAlign: "center",
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    fontSize: "1.2rem",
                                    boxShadow: "0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3)",
                                }}
                            >
                                <RiRecycleFill/>
                            </div>
                        ),
                        iconSize: [36, 36],
                        iconAnchor: [18, 18],
                        className: "", // Disable default marker styles
                    })}
                >
                    <Popup>
                        Dump Yard #{selectedDumpIndex + 1}
                    </Popup>
                </Marker>
            )}

            {/* Route polyline */}
            {routePath.length > 0 && (
                <Polyline
                    positions={routePath.map((p) => [p.lat, p.lon])}
                    pathOptions={{color: "#fb03b8", weight: 2}}
                />
            )}
            <RouteWithArrows routePath={routePath}/>

            {/* Picked start */}
            {pickedLoc && (
                <Marker position={pickedLoc} icon={startLocationIcon}>
                    <Popup>
                        Start: {pickedLoc[0].toFixed(6)}, {pickedLoc[1].toFixed(6)}
                    </Popup>
                </Marker>
            )}

            {/* Picked end location with garage icon */}
            {endLoc && (
                <Marker
                    position={endLoc}
                    icon={L.divIcon({
                        html: ReactDOMServer.renderToString(
                            <div
                                style={{
                                    backgroundColor: "#e00a0a",
                                    color: "#fff",
                                    borderRadius: "50%",
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    fontSize: "1.2rem",
                                    boxShadow: "0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3)",
                                }}
                            >
                                <PiGarageThin/>
                            </div>
                        ),
                        iconSize: [36, 36],
                        iconAnchor: [18, 18],
                        className: "", // prevent default marker styling
                    })}
                >
                    <Popup>
                        End: {endLoc[0].toFixed(6)}, {endLoc[1].toFixed(6)}
                    </Popup>
                </Marker>
            )}

        </MapContainer>
    );
}
