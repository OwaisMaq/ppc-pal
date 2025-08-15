import React, { createContext, useContext, PropsWithChildren } from "react";

// Simplified context - no date range or diagnostic functionality needed
type DateRangeContextType = {};

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DateRangeProvider = ({ children }: PropsWithChildren) => {
  return (
    <DateRangeContext.Provider value={{}}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within a DateRangeProvider");
  return ctx;
};
