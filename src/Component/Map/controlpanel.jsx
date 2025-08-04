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
                                     }) {
    const gotAnyBatches = routeResult.batches?.length > 0;

    const getStartLocationInfo = () =>
        pickedLoc?.length === 2
            ? `Custom: ${pickedLoc[0].toFixed(4)}, ${pickedLoc[1].toFixed(4)}`
            : "None";

    return (
        <Card className="mx-3.5 my-2 shadow-lg">
            {/* ───────────────────────── HEADER ─────────────────────────── */}
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    {appName && (
                        <h2 className="text-2xl font-bold text-red-600 inline">{appName}</h2>
                    )}
                    {userName && (
                        <span className="ml-3 text-lg font-medium text-blue-600">{userName}</span>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                    Start:&nbsp;{getStartLocationInfo()} & End:&nbsp;{getStartLocationInfo()}
                </div>
            </CardHeader>

            {/* ───────────────────────── CONTENT ────────────────────────── */}
            <CardContent>
                {/* Denser grid, more columns on larger screens */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6 items-start">
                    {/* Map Style */}
                    <div className="flex flex-col w-full min-w-[150px] max-w-[220px]">
                        <Label className="text-sm leading-tight">Map Style</Label>
                        <select
                            value={layer}
                            onChange={(e) => setLayer(e.target.value)}
                            className="mt-1 h-9 px-2 border rounded focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="streets">Streets</option>
                            <option value="satellite">Satellite</option>
                        </select>
                    </div>

                    {/* Start Location */}
                    <div className="flex flex-col w-full min-w-[150px] max-w-[220px]">
                        <Label className="text-sm leading-tight">Start Location</Label>
                        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
                            <Button
                                size="sm"
                                variant={pickMode === "start" ? "destructive" : "default"}
                                onClick={() => setPickMode(pickMode === "start" ? null : "start")}
                                disabled={loading}
                            >
                                <MapPin className="mr-1 h-4 w-4"/>
                                {pickMode === "start" ? "Cancel" : "Pick"}
                            </Button>
                            {pickedLoc && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setPickedLoc(null)}
                                    disabled={loading}
                                    title="Clear start"
                                >
                                    ✕
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* End Location */}
                    <div className="flex flex-col w-full min-w-[150px] max-w-[220px]">
                        <Label className="text-sm leading-tight">End Location</Label>
                        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
                            <Button
                                size="sm"
                                variant={pickMode === "end" ? "destructive" : "default"}
                                onClick={() => setPickMode(pickMode === "end" ? null : "end")}
                                disabled={loading || useStartAsEnd}
                            >
                                <MapPin className="mr-1 h-4 w-4"/>
                                {pickMode === "end" ? "Cancel" : "Pick"}
                            </Button>
                            {endLoc && !useStartAsEnd && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setEndLoc(null)}
                                    disabled={loading}
                                    title="Clear end"
                                >
                                    ✕
                                </Button>
                            )}
                        </div>
                        <label
                            className="mt-1 inline-flex items-center text-xs text-gray-700 select-none cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useStartAsEnd}
                                onChange={(e) => setUseStartAsEnd(e.target.checked)}
                                className="mr-2 accent-blue-600"
                            />
                            Use start location as end location
                        </label>
                    </div>

                    {/* Dump Yard */}
                    <div className="flex flex-col w-full min-w-[150px] max-w-[220px]">
                        <Label className="text-sm leading-tight">Dump Yard</Label>
                        <select
                            disabled={loading}
                            value={selectedDumpIndex ?? ""}
                            onChange={(e) => setSelectedDumpIndex(Number(e.target.value))}
                            className="mt-1 h-9 px-2 border rounded focus:ring-2 focus:ring-blue-200"
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

                    {/* House Collection Per Trip */}
                    <div className="flex flex-col w-full min-w-[150px] max-w-[220px]">
                        <Label className="text-sm leading-tight">House Collection Per Dump Trip</Label>
                        <Input
                            disabled={loading}
                            type="number"
                            min={1}
                            value={batchSize}
                            onChange={(e) => setBatchSize(+e.target.value)}
                            className="mt-1 h-9"
                        />
                    </div>

                    {/* Optimize */}
                    <div className="flex flex-col w-full min-w-[150px] max-w-[220px]">
                        <Label className="opacity-0">Optimize</Label>
                        <Button
                            onClick={handleOptimizeRoute}
                            disabled={loading || selectedDumpIndex === null || !dataReady || !pickedLoc}
                            className="mt-1 w-full flex justify-center"
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

                        {/* Slimmer status area */}
                        <div className="mt-1 text-xs text-gray-700 text-center min-h-[40px]">
                            {loading && progressData?.totalBatches > 0 && (
                                <>
                                    <div>
                                        Batch {progressData.currentBatch} of {progressData.totalBatches} |{" "}
                                        {Math.round(
                                            (progressData.currentBatch / (progressData.totalBatches || 1)) * 100
                                        )}
                                        %
                                    </div>
                                    <div>
                                        Houses processed: {progressData.housesProcessed} / {progressData.totalHouses}
                                    </div>
                                    <div className="text-blue-600">{progressData.currentStatus}</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Trips */}
                    <div
                        className={`flex flex-col w-full min-w-[150px] max-w-[220px] ${
                            gotAnyBatches ? "" : "invisible"
                        }`}
                    >
                        <Label className="text-sm leading-tight">Trips</Label>
                        <select
                            disabled={loading || !gotAnyBatches}
                            value={selectedBatchIndex}
                            onChange={(e) => setSelectedBatchIndex(Number(e.target.value))}
                            className="mt-1 h-9 px-2 border rounded focus:ring-2 focus:ring-blue-200"
                        >
                            {routeResult.batches.map((_, idx) => (
                                <option key={idx} value={idx}>
                                    Trip {idx + 1}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Mobile “data loading” hint */}
                {!dataReady && (
                    <p className="mt-3 text-center text-sm text-orange-600 lg:hidden">Loading data…</p>
                )}
            </CardContent>
        </Card>
    );
}
