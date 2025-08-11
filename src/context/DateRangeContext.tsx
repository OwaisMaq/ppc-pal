import React, { createContext, useContext, useState, PropsWithChildren } from "react";

export type DateRangeValue = 1 | 7 | 30 | 31 | 90 | 365;

type DateRangeContextType = {
  dateRangeDays: number;
  setDateRangeDays: (days: DateRangeValue | number) => void;
  diagnosticMode: boolean;
  setDiagnosticMode: (val: boolean) => void;
};

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DateRangeProvider = ({ children }: PropsWithChildren) => {
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);
  const [diagnosticMode, setDiagnosticMode] = useState<boolean>(false);

  return (
    <DateRangeContext.Provider value={{ dateRangeDays, setDateRangeDays, diagnosticMode, setDiagnosticMode }}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within a DateRangeProvider");
  return ctx;
};
