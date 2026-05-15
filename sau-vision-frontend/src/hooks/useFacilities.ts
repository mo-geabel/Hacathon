import { useState, useEffect, useCallback } from "react";
import { facilitiesApi } from "../lib/api";

export interface FacilityDensity {
  id: string;
  name: string;
  building: string;
  type: string;
  capacity: number;
  currentOccupancy: number;
  occupancyPercent: number;
  status: "available" | "occupied" | "ghosted" | "maintenance";
}

/** Polls the density-map endpoint every 10 seconds for live occupancy data */
export function useFacilities(pollIntervalMs = 10_000) {
  const [facilities, setFacilities] = useState<FacilityDensity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await facilitiesApi.densityMap();
      setFacilities(data.data);
      setError(null);
    } catch {
      setError("Failed to load facility data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchData, pollIntervalMs]);

  return { facilities, loading, error, refetch: fetchData };
}
