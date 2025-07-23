// RouteInfo.jsx
import React from "react";

export default function RouteInfo({batch}) {
    if (!batch) return null;

    return (
        <div className="space-y-8 p-4">
            <div className="border rounded-lg shadow-sm p-4">
                <h4 className="text-lg font-semibold mb-4">
                    Dump Yard Trip #{batch.batch_index + 1}
                </h4>

                {/* Speed Profiles */}
                <div className="mb-6">
                    <div className="font-medium mb-2">Speed Profiles</div>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-2 py-1 text-left">Speed (km/h)</th>
                            <th className="border px-2 py-1 text-left">Distance</th>
                            <th className="border px-2 py-1 text-left">Time</th>
                        </tr>
                        </thead>
                        <tbody>
                        {batch.speed_profiles.map((sp, i) => (
                            <tr key={i}>
                                <td className="border px-2 py-1">{sp.speed_kmph}</td>
                                <td className="border px-2 py-1">
                                    {sp.distance_km.toFixed(2)} km
                                </td>
                                <td className="border px-2 py-1">
                                    {Math.floor(sp.time_minutes / 60)}h{" "}
                                    {Math.round(sp.time_minutes % 60)}m
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* Stops for this batch only */}
                <div>
                    <div className="font-medium mb-2">Stops</div>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-2 py-1 text-left">#</th>
                            <th className="border px-2 py-1 text-left">Label</th>
                            <th className="border px-2 py-1 text-left">House ID</th>
                            <th className="border px-2 py-1 text-left">Lat</th>
                            <th className="border px-2 py-1 text-left">Lon</th>
                        </tr>
                        </thead>
                        <tbody>
                        {batch.stops.map((stop) => (
                            <tr key={stop.stop}>
                                <td className="border px-2 py-1">{stop.stop}</td>
                                <td className="border px-2 py-1">{stop.label}</td>
                                <td className="border px-2 py-1">
                                    {stop.house_id ?? "-"}
                                </td>
                                <td className="border px-2 py-1">
                                    {stop.lat.toFixed(6)}
                                </td>
                                <td className="border px-2 py-1">
                                    {stop.lon.toFixed(6)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
