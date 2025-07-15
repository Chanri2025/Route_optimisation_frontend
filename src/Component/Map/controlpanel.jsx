import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {MapPin, Route, ChevronDown, ChevronUp, Loader2} from "lucide-react";

export function ControlPanel({
                                 geofence,
                                 onGeofenceChange,
                                 onGeofenceConfirm,
                                 onOptimizeRoute,
                                 houses,
                                 onHouseChange,
                                 onAddHouse,
                                 onRemoveHouse,
                                 onHousePickLocation,
                                 onLayerChange,
                                 onSetCurrentLocation,
                                 routeResult,
                                 setHouses,
                                 setRouteResult,
                             }) {
    const [showRouteDetails, setShowRouteDetails] = useState(false);
    const [appId, setAppId] = useState("");
    const [userId, setUserId] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGetData = async () => {
        try {
            const res = await fetch("https://weight.ictsbm.com/api/Get/GeoFencingWiseHouseList", {
                method: "GET",
                headers: {
                    AppId: appId,
                    userId: userId,
                },
            });
            const data = await res.json();
            if (data.geofence) onGeofenceChange(data.geofence);
            if (Array.isArray(data.houses)) {
                setHouses(
                    data.houses.map((h, idx) => ({
                        house_id: `H${idx + 1}`,
                        lat: h.lat.toString(),
                        lon: h.lon.toString(),
                    }))
                );
            }
        } catch (error) {
            console.error("Fetch failed:", error);
            alert("Failed to fetch geofence data.");
        }
    };

    const handleClearData = () => {
        onGeofenceChange("");
        setHouses([]);
        setRouteResult(null);
    };

    const handleOptimizeWithLoading = async () => {
        setLoading(true);
        await onOptimizeRoute();
        setLoading(false);
    };

    return (
        <Card className="p-4 space-y-6 max-h-[90vh] overflow-auto">
            {/* API Inputs */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="mb-2">AppId</Label>
                    <Input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="e.g. 3366"/>
                </div>
                <div>
                    <Label className="mb-2">UserId</Label>
                    <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. 6"/>
                </div>
                <div className="col-span-2 flex gap-2">
                    <Button className="flex-1" onClick={handleGetData}>
                        Get Geofence + Houses
                    </Button>
                    <Button variant="outline" onClick={handleClearData}>
                        Clear
                    </Button>
                </div>
            </div>

            {/* Geofence View Only */}
            <div className="space-y-2">
                <Label>Geofence Coordinates</Label>
                <Input value={geofence} onChange={(e) => onGeofenceChange(e.target.value)} readOnly/>
                <Button onClick={onGeofenceConfirm}>Confirm Geofence</Button>
            </div>

            {/* Layer and Location */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Map Layer</Label>
                    <Select onValueChange={onLayerChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select layer"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="streets">Streets</SelectItem>
                            <SelectItem value="satellite">Satellite</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Current Location</Label>
                    <Button onClick={onSetCurrentLocation} className="w-full flex items-center gap-2">
                        <MapPin size={16}/> Pick from Map
                    </Button>
                </div>
            </div>

            {/* Houses List */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label>Houses</Label>
                    <span className="text-sm font-semibold text-muted-foreground">Count: {houses.length}</span>
                </div>
                <div className="max-h-[30vh] overflow-y-auto pr-2 border rounded-md p-2">
                    {houses.map((h, idx) => (
                        <div key={idx} className="grid grid-cols-5 gap-2 mb-2 items-center">
                            <Input
                                placeholder="House ID"
                                value={h.house_id}
                                onChange={(e) => onHouseChange(idx, "house_id", e.target.value)}
                            />
                            <Input
                                placeholder="Lat"
                                value={h.lat}
                                onChange={(e) => onHouseChange(idx, "lat", e.target.value)}
                            />
                            <Input
                                placeholder="Lon"
                                value={h.lon}
                                onChange={(e) => onHouseChange(idx, "lon", e.target.value)}
                            />
                            <Button variant="outline" onClick={() => onHousePickLocation(idx)}>
                                Pick
                            </Button>
                            <Button variant="destructive" onClick={() => onRemoveHouse(idx)}>
                                Remove
                            </Button>
                        </div>
                    ))}
                </div>
                <Button onClick={onAddHouse} className="flex items-center gap-1">
                    + Add House
                </Button>
            </div>

            {/* Optimize Button */}
            <Button onClick={handleOptimizeWithLoading} className="w-full" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Optimizing...
                    </>
                ) : (
                    "Optimize Route"
                )}
            </Button>

            {/* Route Info */}
            {routeResult && (
                <div className="space-y-2 border rounded-md p-3">
                    <div
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => setShowRouteDetails(!showRouteDetails)}
                    >
                        <Label className="text-lg font-medium flex items-center gap-2 m-0">
                            <Route size={18}/> Route Information Summary
                        </Label>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                            {showRouteDetails ? (
                                <ChevronUp size={18}/>
                            ) : (
                                <ChevronDown size={18}/>
                            )}
                        </Button>
                    </div>

                    {showRouteDetails && (
                        <div className="mt-3 space-y-4">
                            {/* Google Maps URL */}
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex items-center">
                                {routeResult.google_maps_url && (
                                    <a
                                        href={routeResult.google_maps_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M15 3h6v6"/>
                                            <path d="M14 10l6.1-6.1"/>
                                            <path d="M9 21H3v-6"/>
                                            <path d="M10 14l-6.1 6.1"/>
                                        </svg>
                                        View in Google Maps
                                    </a>
                                )}
                            </div>

                            {/* Speed Profiles */}
                            <div className="bg-green-50 p-3 rounded-md border border-green-100">
                                <h3 className="text-sm font-medium mb-2 text-green-800">
                                    Route Statistics (Speed Profiles)
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {routeResult.speed_profiles.map((profile, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white p-3 rounded shadow-sm border border-gray-100"
                                        >
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div>
                                                    <p className="text-xs text-gray-500">Speed</p>
                                                    <p className="font-medium">{profile.speed_kmph} km/h</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Distance</p>
                                                    <p className="font-medium">
                                                        {profile.distance_km > 1
                                                            ? `${Math.floor(profile.distance_km)} km ${Math.round((profile.distance_km % 1) * 1000)} m`
                                                            : `${Math.round(profile.distance_km * 1000)} m`}
                                                    </p>

                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Est. Time</p>
                                                    <p className="font-medium">
                                                        {Math.floor(profile.time_minutes / 60)}h {Math.round(profile.time_minutes % 60)}m
                                                    </p>
                                                </div>

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Optimized Path */}
                            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                <h3 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 3v18h18"/>
                                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
                                    </svg>
                                    Optimized Path
                                </h3>
                                <div
                                    className="bg-white p-2 rounded-md max-h-[120px] overflow-auto border border-gray-100 shadow-sm">
                                    <ol className="list-decimal list-inside space-y-1 text-xs">
                                        {routeResult.pathway.map((step, i) => (
                                            <li key={i} className="py-1 px-2 hover:bg-gray-50 rounded">
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>

                            {/* Route Coordinates */}
                            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                <h3 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    Route Coordinates
                                </h3>
                                <div className="bg-white rounded-md border border-gray-100 shadow-sm relative">
                                    <table className="w-full text-xs">
                                        <thead>
                                        <tr className="bg-gray-50 border-b">
                                            <th className="text-left p-2 font-medium sticky top-0 z-10 bg-gray-50">
                                                Point
                                            </th>
                                            <th className="text-left p-2 font-medium sticky top-0 z-10 bg-gray-50">
                                                Latitude
                                            </th>
                                            <th className="text-left p-2 font-medium sticky top-0 z-10 bg-gray-50">
                                                Longitude
                                            </th>
                                        </tr>
                                        </thead>
                                    </table>

                                    <div className="max-h-[120px] overflow-auto">
                                        <table className="w-full text-xs">
                                            <thead className="invisible">
                                            <tr>
                                                <th className="text-left p-2">Point</th>
                                                <th className="text-left p-2">Latitude</th>
                                                <th className="text-left p-2">Longitude</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {routeResult.route_path.map((pt, i) => (
                                                <tr
                                                    key={i}
                                                    className="border-b border-gray-100 hover:bg-gray-50"
                                                >
                                                    <td className="p-2 font-medium">{i + 1}</td>
                                                    <td className="p-2">{pt.lat.toFixed(6)}</td>
                                                    <td className="p-2">{pt.lon.toFixed(6)}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
