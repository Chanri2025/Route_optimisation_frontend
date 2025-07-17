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

export function ControlPanel({ lastVisitedHouseId = null, 
                                 geofence,
                                 onGeofenceChange,
                                 onOptimizeRoute,
                                 houses,
                                 routeResult,
                                 setHouses,
                                 setRouteResult,
                                 employeeId,
                                 setEmployeeId,
                                 currentHouse = 0,
                                 currentDistance = 0,
                                 isLoading = false,
                                 houseIdToSeq // <-- added for houseId to sequence mapping
                             }) {
    const [showRouteDetails, setShowRouteDetails] = useState(false);
    
    // Debug logging
    console.log("ControlPanel props:", {
        housesLength: houses.length,
        currentHouse,
        currentDistance,
        hasRouteResult: !!routeResult
    });

    const handleClearData = () => {
        onGeofenceChange("");
        setHouses([]);
        setRouteResult(null);
    };

    const handleOptimizeWithLoading = async () => {
        try {
            await onOptimizeRoute();
        } catch (error) {
            console.error('Error optimizing route:', error);
        }
    };

    return (
        <Card className="p-4 space-y-6 max-h-[90vh] overflow-auto">
            {/* Employee ID */}
            <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter Employee ID"
                />
            </div>

            {/* Get Route Button */}
            <Button 
                onClick={handleOptimizeWithLoading} 
                className="w-full" 
                disabled={isLoading || !employeeId}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...
                    </>
                ) : (
                    "Get Route"
                )}
            </Button>

            {/* Route Details */}
            {isLoading ? (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500"/>
                    <span className="ml-2 text-sm text-gray-600">Loading route data...</span>
                </div>
            ) : (houses.length > 0 || routeResult) && (
                <div className="mt-4 space-y-4">
                    <div>
                        <h3 className="font-medium mb-2">Route Information</h3>
                        <div className="text-sm text-gray-600 space-y-2">
                            <div className="flex justify-between items-center">
                                <p>Total Houses:</p>
                                <p className="font-medium">{houses.length}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p>Houses Visited:</p>
                                <p className="font-medium text-green-600">
                                    {currentHouse} / {houses.length}
                                    {currentHouse > 0 && lastVisitedHouseId && houseIdToSeq && (
                                        <span className="ml-2 text-xs text-gray-500">
                                            (House ID: {lastVisitedHouseId}, Seq: {houseIdToSeq[lastVisitedHouseId]})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p>Current Distance:</p>
                                <p className="font-medium">
                                    {currentDistance.toFixed(2)} km
                                </p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p>Total Distance:</p>
                                <p className="font-medium">
                                    {(routeResult?.total_distance || 0).toFixed(2)} km
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{
                                    width: `${houses.length ? (currentHouse / houses.length * 100) : 0}%`
                                }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                            {Math.round(houses.length ? (currentHouse / houses.length * 100) : 0)}% Complete
                        </p>
                    </div>
                </div>
            )}

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
