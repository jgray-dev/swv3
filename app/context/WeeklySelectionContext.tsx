import React, { createContext, useContext, useMemo, useState } from "react";

export type SelectionType = "sunrise" | "sunset";

export interface WeeklySelectionState {
  date: string | null;
  type: SelectionType;
  rating: number | null;
  eventTime: number | null; // Unix timestamp (seconds)
  timeZoneId: string | null;
  isPending: boolean;
  eventString: string | null;
  relative: "future" | "past" | "current" | null;
}

interface WeeklySelectionContextValue {
  selection: WeeklySelectionState;
  setSelection: (nextState: WeeklySelectionState) => void;
  updateSelection: (
    partial: Partial<
      Omit<
        WeeklySelectionState,
        "isPending" | "timeZoneId" | "eventString" | "relative"
      >
    > & {
      timeZoneId?: string | null;
      eventString?: string | null;
      relative?: "future" | "past" | "current" | null;
    },
    options?: { isPending?: boolean }
  ) => void;
}

export type WeeklySelectionOptimisticPayload = {
  date: string;
  type: SelectionType;
  rating: number | null;
  eventTime: number | null;
  eventString: string | null;
  relative: "future" | "past" | "current" | null;
  timeZoneId?: string | null;
};

const defaultState: WeeklySelectionState = {
  date: null,
  type: "sunrise",
  rating: null,
  eventTime: null,
  timeZoneId: null,
  isPending: false,
  eventString: null,
  relative: null,
};

const WeeklySelectionContext = createContext<WeeklySelectionContextValue | null>(
  null
);

export function WeeklySelectionProvider({
  initialState,
  children,
}: {
  initialState?: Partial<WeeklySelectionState>;
  children: React.ReactNode;
}) {
  const mergedInitial = useMemo(() => {
    return { ...defaultState, ...initialState } satisfies WeeklySelectionState;
  }, [initialState]);

  const [selection, setSelection] = useState<WeeklySelectionState>(mergedInitial);

  const updateSelection: WeeklySelectionContextValue["updateSelection"] = (
    partial,
    options
  ) => {
    setSelection((prev) => ({
      ...prev,
      ...partial,
      isPending: options?.isPending ?? prev.isPending,
      timeZoneId:
        partial.timeZoneId !== undefined ? partial.timeZoneId : prev.timeZoneId,
      eventString:
        partial.eventString !== undefined ? partial.eventString : prev.eventString,
      relative:
        partial.relative !== undefined ? partial.relative : prev.relative,
    }));
  };

  const value = useMemo<WeeklySelectionContextValue>(
    () => ({
      selection,
      setSelection,
      updateSelection,
    }),
    [selection]
  );

  return (
    <WeeklySelectionContext.Provider value={value}>
      {children}
    </WeeklySelectionContext.Provider>
  );
}

export function useWeeklySelection() {
  const context = useContext(WeeklySelectionContext);
  if (!context) {
    throw new Error("useWeeklySelection must be used within WeeklySelectionProvider");
  }
  return context;
}

export function useWeeklySelectionValue() {
  return useWeeklySelection().selection;
}
