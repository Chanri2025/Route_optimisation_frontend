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
                        <h2 className="text-2xl font-bold text-red-600 inline">
                            {appName}
                        </h2>
                    )}
                    {userName && (
                        <span className="ml-3 text-lg font-medium text-blue-600">
                            {userName}
                        </span>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                    Start:&nbsp;{getStartLocationInfo()}
                </div>
            </CardHeader>

            {/* ───────────────────────── CONTENT ────────────────────────── */}
            <CardContent>
                {/* 1‑col on mobile • 2‑col on md • flex‑wrap on ≥lg */}
                <div className="grid gap-6 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
                    {/* Map Style */}
                    <div className="flex flex-col flex-1 min-w-[160px]">
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
                    <div className="flex flex-col flex-1 min-w-[200px]">
                        <Label>Start Location</Label>
                        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
                            <Button
                                size="sm"
                                variant={pickMode === "start" ? "destructive" : "default"}
                                onClick={() =>
                                    setPickMode(pickMode === "start" ? null : "start")
                                }
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
                    <div className="flex flex-col flex-1 min-w-[200px]">
                        <Label>End Location</Label>
                        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
                            <Button
                                size="sm"
                                variant={pickMode === "end" ? "destructive" : "default"}
                                onClick={() =>
                                    setPickMode(pickMode === "end" ? null : "end")
                                }
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
                            className="mt-2 inline-flex items-center text-sm text-gray-700 select-none cursor-pointer">
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
                    <div className="flex flex-col flex-1 min-w-[200px]">
                        <Label>Dump Yard</Label>
                        <select
                            disabled={loading}
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
                    <div className="flex flex-col flex-1 min-w-[160px]">
                        <Label>House Collection Per Dump Trip</Label>
                        <Input
                            disabled={loading}
                            type="number"
                            min={1}
                            value={batchSize}
                            onChange={(e) => setBatchSize(+e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    {/* Optimize */}
                    <div className="flex flex-col min-w-[180px] lg:ml-auto lg:self-end">
                        <Label className="opacity-0">Optimize</Label>
                        <Button
                            onClick={handleOptimizeRoute}
                            disabled={
                                loading ||
                                selectedDumpIndex === null ||
                                !dataReady ||
                                !pickedLoc
                            }
                            className="mt-1 w-40 flex justify-center"
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


                        {/* Reserve vertical space so height never changes */}
                        <div className="mt-2 text-xs text-gray-700 text-center min-h-[54px]">
                            {loading && progressData?.totalBatches > 0 && (
                                <>
                                    <div>
                                        Batch {progressData.currentBatch} of{" "}
                                        {progressData.totalBatches} |{" "}
                                        {Math.round(
                                            (progressData.currentBatch /
                                                (progressData.totalBatches || 1)) *
                                            100
                                        )}
                                        %
                                    </div>
                                    <div>
                                        Houses processed: {progressData.housesProcessed} /{" "}
                                        {progressData.totalHouses}
                                    </div>
                                    <div className="text-blue-600">
                                        {progressData.currentStatus}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Trips (always mounted — invisible when not needed) */}
                    <div
                        className={`flex flex-col flex-1 min-w-[160px] ${
                            gotAnyBatches ? "" : "invisible"
                        }`}
                    >
                        <Label>Trips</Label>
                        <select
                            disabled={loading || !gotAnyBatches}
                            value={selectedBatchIndex}
                            onChange={(e) =>
                                setSelectedBatchIndex(Number(e.target.value))
                            }
                            className="mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-200"
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
                    <p className="mt-4 text-center text-sm text-orange-600 lg:hidden">
                        Loading data…
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
