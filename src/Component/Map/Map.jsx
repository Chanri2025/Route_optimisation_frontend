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
import {FiMaximize2, FiMinimize2} from "react-icons/fi";
import {createRoot} from "react-dom/client";
import html2canvas from 'html2canvas';

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

const arrowSVG = (color = "blue") => `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right" viewBox="0 0 24 24">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
    </svg>
`;

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
                    width: "35px",
                    height: "35px",
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
                const btn = L.DomUtil.create("button", "leaflet-bar leaflet-control leaflet-control-custom");
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

                    // Hide controls temporarily
                    const mapContainer = map.getContainer();
                    const ctrls = mapContainer.querySelectorAll(".leaflet-control");
                    ctrls.forEach((c) => (c.style.visibility = "hidden"));

                    // Wait for tiles to load
                    const tilesLoaded = new Promise((resolve) => {
                        map.once('moveend', () => {
                            // Optional: Wait for tiles to load again if map moved
                            resolve();
                        });
                        map.invalidateSize(); // Ensure map size is correct
                    });

                    await tilesLoaded;

                    // Capture the map container
                    html2canvas(mapContainer, {
                        scale: 2, // Higher resolution
                        useCORS: true, // Try to bypass CORS if tiles allow it
                    }).then((canvas) => {
                        // Restore controls
                        ctrls.forEach((c) => (c.style.visibility = "visible"));

                        // Convert to blob and trigger download
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                alert("Screenshot failed! Ensure tiles support CORS.");
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
                    });
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

// Fullscreen control
function FullscreenControl({position = "topright"}) {
    const map = useMap();

    useEffect(() => {
        const Fullscreen = L.Control.extend({
            options: {position},

            onAdd(map) {
                // wrapper uses Leaflet’s .leaflet-bar
                const container = L.DomUtil.create("div", "leaflet-bar");

                // anchor picks up default sizing/borders
                const link = L.DomUtil.create("a", "", container);
                link.href = "#";
                link.title = "Toggle Fullscreen";

                // <<< these three lines center your icon >>>
                Object.assign(link.style, {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                });

                L.DomEvent.disableClickPropagation(link);

                // render react‑icon into the <a>
                const root = createRoot(link);
                const renderIcon = () => {
                    const isFs = !!document.fullscreenElement;
                    root.render(
                        isFs
                            ? <FiMinimize2 size={17}/>
                            : <FiMaximize2 size={17}/>
                    );
                };

                renderIcon();

                L.DomEvent.on(link, "click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);

                    const el = map.getContainer();
                    if (!document.fullscreenElement) {
                        el.requestFullscreen().catch(console.error);
                    } else {
                        document.exitFullscreen();
                    }

                    renderIcon();
                });

                return container;
            }
        });

        const control = new Fullscreen();
        map.addControl(control);
        return () => map.removeControl(control);
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
            // Compute angle in degrees for SVG rotation
            const angle = (Math.atan2(e[0] - s[0], e[1] - s[1]) * 180) / Math.PI;
            const iconHtml = `
                <div style="transform: rotate(${angle}deg); display:flex; align-items:center; justify-content:center;">
                  ${arrowSVG("blue")}
                </div>
            `;
            const arrowIcon = L.divIcon({
                className: "route-arrow",
                html: iconHtml,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
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
            <MapContainer ref={mapRef} center={center} zoom={15} zoomControl={false} className="h-full w-full">
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
                {/*<ScreenshotControl position="topright"/>*/}
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
                                <Popup>{houseIdStr}</Popup>
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