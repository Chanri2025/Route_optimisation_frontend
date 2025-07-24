import React, {useEffect, useMemo, useRef} from "react";
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

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const defaultIcon = new L.Icon.Default();

const startLocationIcon = new L.Icon({
    iconUrl: "/garbage-pickup-point.png",
    iconSize: [40, 60],
    iconAnchor: [20, 60],
    popupAnchor: [0, -60],
});

// Custom control: Home button
function HomeControl({position, pickedLoc, center}) {
    const map = useMap();
    useEffect(() => {
        const HomeButton = L.Control.extend({
            onAdd() {
                const btn = L.DomUtil.create("button", "leaflet-bar leaflet-control leaflet-control-custom");
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>`;
                Object.assign(btn.style, {
                    backgroundColor: "white",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                });
                btn.title = "Center Map";
                L.DomEvent.on(btn, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);
                    if (pickedLoc) {
                        map.setView(pickedLoc, 16);
                    } else if (center) {
                        map.setView(center, 15);
                    } else {
                        map.setView([0, 0], 2);
                    }
                });
                return btn;
            },
        });
        const ctrl = new HomeButton({position});
        map.addControl(ctrl);
        return () => map.removeControl(ctrl);
    }, [map, position, pickedLoc, center]);
    return null;
}

// Screenshot control
function ScreenshotControl({position}) {
    const map = useMap();
    useEffect(() => {
        const ScreenshotButton = L.Control.extend({
            onAdd() {
                const btn = L.DomUtil.create(
                    "button",
                    "leaflet-bar leaflet-control leaflet-control-custom"
                );
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
                    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                    <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>`;
                Object.assign(btn.style, {
                    backgroundColor: "white",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                });
                btn.title = "Take Screenshot";

                L.DomEvent.on(btn, "click", async (e) => {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);

                    const mapContainer = map.getContainer();
                    const size = map.getSize();
                    const canvas = document.createElement("canvas");
                    canvas.width = size.x;
                    canvas.height = size.y;
                    const ctx = canvas.getContext("2d");

                    // Hide controls
                    const ctrls = mapContainer.querySelectorAll(".leaflet-control");
                    ctrls.forEach((c) => (c.style.visibility = "hidden"));

                    // Draw tiles
                    await Promise.all(
                        Array.from(mapContainer.querySelectorAll(".leaflet-tile")).map(
                            (tile) =>
                                new Promise((res) => {
                                    const img = new Image();
                                    img.crossOrigin = "anonymous";
                                    img.onload = () => {
                                        const m = tile.style.transform.match(/translate3d\((-?\d+)px, (-?\d+)px/);
                                        if (m) ctx.drawImage(img, +m[1], +m[2]);
                                        res();
                                    };
                                    img.onerror = res;
                                    img.src = tile.src;
                                })
                        )
                    );

                    ctrls.forEach((c) => (c.style.visibility = "visible"));

                    try {
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                alert("Screenshot failed! Most map tiles (OpenStreetMap, ESRI, etc.) block export due to browser security (CORS). Use a CORS-enabled tile server for downloads.");
                                return;
                            }
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `map-screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        });
                    } catch (e) {
                        alert("Screenshot failed! Most map tiles block export due to browser security (CORS).");
                    }
                });

                return btn;
            },
        });

        const ctrl = new ScreenshotButton({position});
        map.addControl(ctrl);
        return () => map.removeControl(ctrl);
    }, [map, position]);
    return null;
}

// Draw arrows along polyline
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
            const arrowIcon = L.divIcon({
                className: "route-arrow",
                html: `<div style="transform: rotate(${angle}deg); font-size:20px; color:blue;">&#8594;</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });
            const marker = L.marker([(s[0] + e[0]) / 2, (s[1] + e[1]) / 2], {icon: arrowIcon});
            marker.addTo(map);
            layers.push(marker);
        }
        return () => layers.forEach((l) => map.removeLayer(l));
    }, [map, routePath]);
    return null;
}

// Map click handler
function MapClickHandler({pickLocationMode, onPickLocation}) {
    useMapEvents({
        click(e) {
            if (pickLocationMode) onPickLocation(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// Fit map to geofence
function FitBounds({parsedFence}) {
    const map = useMap();
    useEffect(() => {
        if (parsedFence.length > 1) {
            map.fitBounds(parsedFence.map((p) => [p.lat, p.lon]), {padding: [20, 20]});
        }
    }, [map, parsedFence]);
    return null;
}

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
            .filter((p) => p);
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
                            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    }
                />

                <ZoomControl position="topright"/>
                <HomeControl position="topright" pickedLoc={pickedLoc} center={center}/>
                <ScreenshotControl position="topright"/>
                <FitBounds parsedFence={parsedFence}/>
                <MapClickHandler pickLocationMode={pickLocationMode} onPickLocation={onPickLocation}/>

                {parsedFence.length > 1 && (
                    <Polygon
                        positions={parsedFence.map((p) => [p.lat, p.lon])}
                        pathOptions={{color: "blue", weight: 2, fillOpacity: 0.1}}
                    />
                )}

                {showHouses && houses.map(h => {
                    if (!h || !h.house_id) return null;
                    // Safely handle house_id as a string
                    const houseIdStr = typeof h.house_id === "string" ? h.house_id : String(h.house_id || "");
                    return (
                        <Marker
                            key={h.house_id}
                            position={[parseFloat(h.lat), parseFloat(h.lon)]}
                            icon={L.divIcon({
                                className: 'custom-house-marker',
                                html: `<div class="house-circle">${houseIdStr.replace(/[^0-9]/g, '')}</div>`,
                                iconSize: [32, 32],
                                iconAnchor: [16, 16],
                            })}
                        >
                            <Popup>{houseIdStr}</Popup>
                        </Marker>
                    );
                })}

                {selectedDumpIndex != null && dumpYards[selectedDumpIndex] && (
                    <Marker
                        position={[+dumpYards[selectedDumpIndex].lat, +dumpYards[selectedDumpIndex].lon]}
                        icon={L.divIcon({
                            className: "dump-yard-marker",
                            html: `<div class="dump-yard-circle">${selectedDumpIndex + 1}</div>`,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16],
                        })}
                    >
                        <Popup>Dump Yard #{selectedDumpIndex + 1}</Popup>
                    </Marker>
                )}

                {routePath.length > 0 && (
                    <Polyline positions={routePath.map((p) => [p.lat, p.lon])}
                              pathOptions={{color: "green", weight: 4}}/>
                )}

                <RouteWithArrows routePath={routePath}/>

                {stops.map((s, idx) => (
                    <Marker key={s.stop || idx} position={[s.lat, s.lon]} icon={defaultIcon}>
                        <Popup>
                            {s.label} {s.house_id ? `(ID: ${s.house_id})` : ""}
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
