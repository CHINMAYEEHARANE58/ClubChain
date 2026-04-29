import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { queryClient } from "./queryClient";
import { AuthProvider } from "../context/AuthContext";
import { ClubProvider } from "../context/ClubContext";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ClubProvider>{children}</ClubProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
