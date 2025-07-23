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
                                         dataReady,
                                         houses,
                                     }) {
    const getStartLocationInfo = () => {
        if (pickedLoc?.length === 2) {
            return `Custom: ${pickedLoc[0].toFixed(4)}, ${pickedLoc[1].toFixed(4)}`;
        }
        return "None";
    };

    return (
        <Card className="mx-3.5 my-2 shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    {appName && (
                        <h2 className="text-2xl font-bold text-red-600 inline">{appName}</h2>
                    )}
                    {userName && (
                        <span className="ml-3 text-lg font-medium text-blue-600">
              {userName}
            </span>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                    Start: {getStartLocationInfo()}
                </div>
            </CardHeader>

            <CardContent>
                <div className="flex flex-wrap items-end gap-6">
                    {/* Map Style */}
                    <div className="flex flex-col min-w-[160px]">
                        <Label>Map Style</Label>
                        <select
                            value={layer}
                            onChange={(e) => setLayer(e.target.value)}
                            className="mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="streets">Streets</option>
                            <option value="satellite">Satellite</option>
                        </select>
                    </div>

                    {/* Start Location */}
                    <div className="flex flex-col flex-1 min-w-[240px]">
                        <Label>Start Location</Label>
                        <div className="flex items-center gap-4 mt-1">
                            <Button
                                size="sm"
                                variant={pickMode ? "destructive" : "default"}
                                onClick={() => setPickMode(!pickMode)}
                                className="w-2/4"
                            >
                                <MapPin className="mr-1 h-4 w-4"/>
                                {pickMode ? "Cancel" : "Pick"}
                            </Button>
                            {pickedLoc && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setPickedLoc(null)}
                                    title="Clear picked loc"
                                    className="w-10"
                                >
                                    ✕
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dump Yard */}
                    <div className="flex flex-col min-w-[200px]">
                        <Label>Dump Yard</Label>
                        <select
                            value={selectedDumpIndex ?? ""}
                            onChange={(e) => setSelectedDumpIndex(Number(e.target.value))}
                            className="mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="" disabled>
                                Choose…
                            </option>
                            {dumpYards.map((dy, i) => (
                                <option key={i} value={i}>
                                    #{i + 1} — {dy.lat.toFixed(5)}, {dy.lon.toFixed(5)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Batch Size */}
                    <div className="flex flex-col min-w-[100px]">
                        <Label>Batch Size</Label>
                        <Input
                            type="number"
                            min={1}
                            value={batchSize}
                            onChange={(e) => setBatchSize(+e.target.value)}
                            className="mt-1 w-full"
                        />
                    </div>

                    {/* Optimize */}
                    <div className="flex flex-col min-w-[180px]">
                        <Label className="opacity-0">Optimize</Label>
                        <Button
                            onClick={handleOptimizeRoute}
                            disabled={
                                loading ||
                                selectedDumpIndex === null ||
                                !dataReady ||
                                (!pickedLoc)
                            }
                            className="mt-1 w-full flex justify-center"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Optimizing…
                                </>
                            ) : (
                                <>
                                    <RouteIcon className="mr-2 h-4 w-4"/> Optimize
                                </>
                            )}
                        </Button>
                    </div>


                    {/* Batch Selector */}
                    {routeResult?.batches?.length > 0 && (
                        <div className="flex flex-col min-w-[160px]">
                            <Label>Batch</Label>
                            <select
                                value={selectedBatchIndex}
                                onChange={(e) => setSelectedBatchIndex(Number(e.target.value))}
                                className="mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-200"
                            >
                                {routeResult.batches.map((_, idx) => (
                                    <option key={idx} value={idx}>
                                        #{idx + 1}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Loading indicator on small screens */}
                {!dataReady && (
                    <p className="mt-4 text-center text-sm text-orange-600 lg:hidden">
                        Loading data…
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
