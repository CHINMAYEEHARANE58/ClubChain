import React, { createContext, useContext, useMemo, useState } from "react";

interface ClubContextValue {
  selectedClubId: string | null;
  setSelectedClubId: (clubId: string | null) => void;
}

const ClubContext = createContext<ClubContextValue | undefined>(undefined);

const CLUB_KEY = "selectedClubId";

export const ClubProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedClubId, setSelectedClubIdState] = useState<string | null>(
    localStorage.getItem(CLUB_KEY)
  );

  const setSelectedClubId = (clubId: string | null) => {
    if (!clubId) {
      localStorage.removeItem(CLUB_KEY);
      setSelectedClubIdState(null);
      return;
    }

    localStorage.setItem(CLUB_KEY, clubId);
    setSelectedClubIdState(clubId);
  };

  const value = useMemo(
    () => ({
      selectedClubId,
      setSelectedClubId
    }),
    [selectedClubId]
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};

export const useClubContext = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error("useClubContext must be used inside ClubProvider");
  }
  return context;
};
