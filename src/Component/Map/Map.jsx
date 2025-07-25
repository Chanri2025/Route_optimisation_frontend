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
import html2canvas from "html2canvas";
import {PanControl} from "./PanControl.jsx";

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
const startLocationIcon = new L.Icon({
    iconUrl: "/garbage-pickup-point.png",
    iconSize: [40, 60],
    iconAnchor: [20, 60],
    popupAnchor: [0, -60],
});

const arrowSVG = (color = "blue") => `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
`;

// ─── Center‑Map Button with FiHome ──────────────────────────────────────────
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
function FullscreenControl({position = "topright"}) {
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
                const renderIcon = () => {
                    root.render(
                        document.fullscreenElement ? (
                            <FiMinimize2 size={17}/>
                        ) : (
                            <FiMaximize2 size={17}/>
                        )
                    );
                };
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

// ─── Draw arrows along route ─────────────────────────────────────────────────
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
            const iconHtml = `<div style="transform: rotate(${angle}deg); display:flex; align-items:center; justify-content:center;">${arrowSVG(
                "blue"
            )}</div>`;
            const arrowIcon = L.divIcon({
                className: "route-arrow",
                html: iconHtml,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
            const m = L.marker([(s[0] + e[0]) / 2, (s[1] + e[1]) / 2], {icon: arrowIcon});
            m.addTo(map);
            layers.push(m);
        }
        return () => layers.forEach((l) => map.removeLayer(l));
    }, [map, routePath]);

    return null;
}

// ─── Map click handler ─────────────────────────────────────────────────────
function MapClickHandler({pickLocationMode, onPickLocation}) {
    useMapEvents({
        click(e) {
            if (pickLocationMode) onPickLocation(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// ─── Fit to geofence bounds ─────────────────────────────────────────────────
function FitBounds({parsedFence}) {
    const map = useMap();

    useEffect(() => {
        if (parsedFence.length > 1) {
            map.fitBounds(parsedFence.map((p) => [p.lat, p.lon]), {padding: [20, 20]});
        }
    }, [map, parsedFence]);

    return null;
}

// ─── Main Map Component ─────────────────────────────────────────────────────
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
                                pickLocationMode,
                                onPickLocation,
                                pickedLoc,
                            }) {
    const mapRef = useRef(null);

    const parsedFence = useMemo(() => {
        if (typeof geofence !== "string") return Array.isArray(geofence) ? geofence : [];
        return geofence
            .split(";")
            .map((seg) => {
                const [lat, lon] = seg.split(",").map(parseFloat);
                return isNaN(lat) || isNaN(lon) ? null : {lat, lon};
            })
            .filter(Boolean);
    }, [geofence]);

    return (
        <div className="h-full w-full shadow-2xl rounded-2xl overflow-hidden">
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
                    attribution={
                        layer === "satellite"
                            ? 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
                            : '&copy; OpenStreetMap contributors'
                    }
                />

                <ZoomControl position="topright"/>
                <HomeControl position="topright" pickedLoc={pickedLoc} center={center}/>
                <PanControl position="bottomleft" delta={0.005}/>
                <FullscreenControl position="topright"/>
                <FitBounds parsedFence={parsedFence}/>
                <MapClickHandler pickLocationMode={pickLocationMode} onPickLocation={onPickLocation}/>

                {parsedFence.length > 1 && (
                    <Polygon
                        positions={parsedFence.map((p) => [p.lat, p.lon])}
                        pathOptions={{color: "blue", weight: 2, fillOpacity: 0.1}}
                    />
                )}

                {showHouses &&
                    houses.map((h) => {
                        if (!h || !h.house_id) return null;
                        const houseIdStr = String(h.house_id);
                        return (
                            <Marker
                                key={h.house_id}
                                position={[parseFloat(h.lat), parseFloat(h.lon)]}
                                icon={L.divIcon({
                                    html: `
                    <div style="
                        background-color: #2196f3;
                        color: white;
                        font-weight: bold;
                        border-radius: 50%;
                        text-align: center;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        font-size: .9rem;
                        box-shadow: 0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3);
                    ">
                        ${houseIdStr.replace(/[^0-9]/g, "")}
                    </div>
                `,
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 16],
                                })}
                            >
                                <Popup>House ID : {houseIdStr}</Popup>
                            </Marker>
                        );
                    })}

                {selectedDumpIndex != null && dumpYards[selectedDumpIndex] && (
                    <Marker
                        position={[+dumpYards[selectedDumpIndex].lat, +dumpYards[selectedDumpIndex].lon]}
                        icon={L.divIcon({
                            html: `
                    <div style="
                        background-color: #e00a0a;
                        color: white;
                        font-weight: bold;
                        border-radius: 50%;
                        text-align: center;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        font-size: .9rem;
                        box-shadow: 0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3);
                    ">
                        ${selectedDumpIndex + 1}
                    </div>
                `,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                        })}
                    >
                        <Popup>Dump Yard #{selectedDumpIndex + 1}</Popup>
                    </Marker>
                )}

                {routePath.length > 0 && (
                    <Polyline
                        positions={routePath.map((p) => [p.lat, p.lon])}
                        pathOptions={{color: "green", weight: 4}}
                    />
                )}

                <RouteWithArrows routePath={routePath}/>

                {stops.map((s, idx) => (
                    <Marker
                        key={s.stop != null ? s.stop : idx}
                        position={[s.lat, s.lon]}
                        icon={defaultIcon}
                    >
                        <Popup>
                            <div><strong>Stop #:</strong> {s.stop ?? idx + 1}</div>
                            {s.house_id != null && (
                                <div><strong>House ID:</strong> {s.house_id}</div>
                            )}
                            <div>
                                <strong>Coordinates:</strong>{" "}
                                {parseFloat(s.lat).toFixed(5)}, {parseFloat(s.lon).toFixed(5)}
                            </div>
                        </Popup>
                    </Marker>
                ))}


                {pickedLoc && (
                    <Marker position={[pickedLoc[0], pickedLoc[1]]} icon={startLocationIcon}>
                        <Popup>
                            Start Location: {pickedLoc[0].toFixed(6)}, {pickedLoc[1].toFixed(6)}
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
