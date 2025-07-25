// src/components/PanControl.jsx
import {useEffect} from "react";
import {useMap} from "react-leaflet";
import L from "leaflet";

export function PanControl({position = "bottomleft", delta = 0.005}) {
    const map = useMap();

    useEffect(() => {
        const Pan = L.Control.extend({
            options: {position},
            onAdd() {
                const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");

                const dirs = [
                    {label: "⬆", lat: +delta, lng: 0},
                    {label: "⬇", lat: -delta, lng: 0},
                    {label: "⬅", lat: 0, lng: -delta},
                    {label: "➡", lat: 0, lng: +delta},
                ];

                dirs.forEach(({label, lat, lng}) => {
                    const btn = L.DomUtil.create("a", "", container);
                    btn.innerText = label;
                    btn.href = "#";

                    Object.assign(btn.style, {
                        display: "block",
                        width: "35px",
                        height: "35px",
                        lineHeight: "40px",
                        textAlign: "center",
                        fontSize: "24px",
                        cursor: "pointer",
                        userSelect: "none",
                    });

                    L.DomEvent.on(btn, "click", (e) => {
                        L.DomEvent.stopPropagation(e);
                        L.DomEvent.preventDefault(e);
                        const c = map.getCenter();
                        map.panTo([c.lat + lat, c.lng + lng], {animate: true});
                    });
                });

                return container;
            },
        });

        const ctrl = new Pan();
        map.addControl(ctrl);
        return () => map.removeControl(ctrl);
    }, [map, position, delta]);

    return null;
}
