"use client";

import { useEffect, useState } from "react";
import { enrichWithPriceAiOnly } from "@/lib/aiSummary";
import { fetchAiListingTags } from "@/lib/api/ai";

export function useAiListings(listings, aiEnabled) {
  const [displayListings, setDisplayListings] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!aiEnabled) {
        setDisplayListings(
          listings.map((item) => ({
            ...item,
            ai_tags: [],
            ai_summary: "",
            ai_location_meta: null,
          }))
        );
        setAiLoading(false);
        return;
      }

      if (listings.length === 0) {
        setDisplayListings([]);
        setAiLoading(false);
        return;
      }

      setAiLoading(true);

      try {
        const json = await fetchAiListingTags(listings);
        if (!ignore) {
          setDisplayListings(json.data || []);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setDisplayListings(enrichWithPriceAiOnly(listings, true));
        }
      } finally {
        if (!ignore) {
          setAiLoading(false);
        }
      }
    }

    run();

    return () => {
      ignore = true;
    };
  }, [listings, aiEnabled]);

  return {
    displayListings,
    aiLoading,
  };
}
