"use client";

import { useEffect, useState } from "react";

export function useSelectedListing(displayListings) {
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    if (displayListings.length === 0) {
      setSelectedListing(null);
      return;
    }

    setSelectedListing((prev) => {
      if (!prev) return displayListings[0];
      const matched = displayListings.find((item) => item.id === prev.id);
      return matched || displayListings[0];
    });
  }, [displayListings]);

  return {
    selectedListing,
    setSelectedListing,
  };
}
