// src/components/ControlPanel.jsx
import React from "react";
import {Card, CardHeader, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {MapPin, Route as RouteIcon, Loader2} from "lucide-react";

export default function ControlPanel({
                                         appName,
                                         userName,
                                         layer,
                                         setLayer,
                                         pickMode,
                                         setPickMode,
                                         dumpYards,
                                         selectedDumpIndex,
                                         setSelectedDumpIndex,
                                         batchSize,
                                         setBatchSize,
                                         handleOptimizeRoute,
                                         loading,
                                         routeResult,
                                         selectedBatchIndex,
                                         setSelectedBatchIndex,
                                         pickedLoc,
                                         setPickedLoc,
                                         endLoc,
                                         setEndLoc,
                                         useStartAsEnd,
                                         setUseStartAsEnd,
                                         dataReady,
                                         progressData,
                                         scrollToRouteInfo,
                                         houses,
                                     }) {
    const gotAnyBatches = routeResult.batches?.length > 0;

    const getStartLocationInfo = () =>
        pickedLoc?.length === 2 ? `${pickedLoc[0].toFixed(4)}, ${pickedLoc[1].toFixed(4)}` : "None";
    const getEndLocationInfo = () => {
        if (useStartAsEnd && pickedLoc?.length === 2) return `${pickedLoc[0].toFixed(4)}, ${pickedLoc[1].toFixed(4)}`;
        if (endLoc?.length === 2) return `${endLoc[0].toFixed(4)}, ${endLoc[1].toFixed(4)}`;
        return "None";
    };

    return (
        <Card className="mx-1 my-1 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="py-1 px-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {appName && <h2 className="text-xl font-bold text-red-600 leading-none">{appName}</h2>}
                        {userName &&
                            <span className="text-base font-medium text-blue-600 leading-none">{userName}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-700">
            <span className="font-medium">
              Total Houses: <span className="font-semibold text-gray-900">{houses?.length || 0}</span>
            </span>
                        <span className="hidden sm:inline">|</span>
                        <span>Start: <span
                            className="font-semibold text-gray-900">{getStartLocationInfo()}</span></span>
                        <span className="hidden sm:inline">|</span>
                        <span>End: <span className="font-semibold text-gray-900">{getEndLocationInfo()}</span></span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="py-2 px-3">
                <div className="flex flex-wrap items-center ml-5 gap-2">
                    {/* Map Style */}
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-600">Map</Label>
                        <select
                            value={layer}
                            onChange={(e) => setLayer(e.target.value)}
                            className="h-8 px-2 rounded border border-gray-300/70 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="streets">Streets</option>
                            <option value="satellite">Satellite</option>
                        </select>
                    </div>

                    {/* Start */}
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-600">Start</Label>
                        <Button
                            size="sm"
                            className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => setPickMode(pickMode === "start" ? null : "start")}
                            disabled={loading}
                        >
                            <MapPin className="mr-1 h-3.5 w-3.5"/>
                            {pickMode === "start" ? "Cancel" : "Pick"}
                        </Button>
                        {pickedLoc && (
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2 text-xs"
                                onClick={() => setPickedLoc(null)}
                                disabled={loading}
                                title="Clear start"
                            >
                                ✕
                            </Button>
                        )}
                    </div>

                    {/* End */}
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-600">End</Label>
                        <Button
                            size="sm"
                            className="h-8 px-2 text-xs bg-red-600 hover:bg-red-700"
                            onClick={() => setPickMode(pickMode === "end" ? null : "end")}
                            disabled={loading || useStartAsEnd}
                        >
                            <MapPin className="mr-1 h-3.5 w-3.5"/>
                            {pickMode === "end" ? "Cancel" : "Pick"}
                        </Button>
                        {endLoc && !useStartAsEnd && (
                            <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2 text-xs"
                                onClick={() => setEndLoc(null)}
                                disabled={loading}
                                title="Clear end"
                            >
                                ✕
                            </Button>
                        )}
                    </div>

                    {/* Dump */}
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-600">Dump</Label>
                        <select
                            disabled={loading}
                            value={selectedDumpIndex ?? ""}
                            onChange={(e) => setSelectedDumpIndex(Number(e.target.value))}
                            className="h-8 px-2 rounded border border-gray-300/70 bg-transparent text-sm min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="" disabled>Choose…</option>
                            {dumpYards.map((dy, i) => (
                                <option key={i} value={i}>
                                    #{i + 1} — {dy.lat.toFixed(5)}, {dy.lon.toFixed(5)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Per Trip */}
                    <div className="flex items-center gap-1">
                        <Label className="text-xs text-gray-600">Per Trip</Label>
                        <Input
                            disabled={loading}
                            type="number"
                            min={1}
                            value={batchSize}
                            onChange={(e) => setBatchSize(+e.target.value)}
                            className="h-8 w-20 text-sm bg-transparent border border-gray-300/70 focus-visible:ring-2 focus-visible:ring-blue-200"
                        />
                    </div>

                    {/* Optimize area */}
                    <div className="flex items-center gap-3">
                        {/* Button with text UNDER it */}
                        <div className="flex flex-col items-start gap-1">
                            <Button
                                onClick={handleOptimizeRoute}
                                disabled={
                                    loading ||
                                    selectedDumpIndex === null ||
                                    !dataReady ||
                                    !pickedLoc ||
                                    (!useStartAsEnd && !endLoc)
                                }
                                className="h-8 px-3 text-sm bg-blue-500 hover:bg-blue-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        Optimizing…
                                    </>
                                ) : (
                                    <>
                                        <RouteIcon className="mr-2 h-4 w-4"/>
                                        Optimize
                                    </>
                                )}
                            </Button>

                            {/* moved status line BELOW button */}
                            {loading && progressData?.totalBatches > 0 && (
                                <div className="text-[10px] text-gray-700 whitespace-nowrap leading-none">
                                    Batch {progressData.currentBatch}/{progressData.totalBatches} •{" "}
                                    {progressData.housesProcessed}/{progressData.totalHouses}
                                </div>
                            )}
                        </div>

                        {/* Progress bar to the right (keeps panel slim) */}
                        {loading && progressData?.totalBatches > 0 && (
                            <div className="w-44 bg-blue-100 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.round(
                                            (progressData.currentBatch / (progressData.totalBatches || 1)) * 100
                                        )}%`,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Trips + Show Detail aligned right */}
                    <div className="flex items-center gap-1 ml-10">
                        <Label className="text-xs text-gray-600">Trips</Label>
                        <select
                            disabled={loading && routeResult.batches.length === 0}
                            value={selectedBatchIndex ?? ""}
                            onChange={(e) => setSelectedBatchIndex(Number(e.target.value))}
                            className="h-8 px-2 rounded border border-gray-300/70 bg-transparent text-sm min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="" disabled>Select…</option>
                            {routeResult.batches.map((_, idx) => (
                                <option key={idx} value={idx}>Trip {idx + 1}</option>
                            ))}
                        </select>

                        {gotAnyBatches && (
                            <Button
                                onClick={scrollToRouteInfo}
                                className="h-8 px-3 text-sm bg-green-600 hover:bg-green-700 text-white"
                            >
                                Show Trip Detail
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
