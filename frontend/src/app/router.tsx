import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../components/common/ProtectedRoute";
import { ActivityPage } from "../pages/ActivityPage";
import { ClubSelectPage } from "../pages/ClubSelectPage";
import { CreateProposalPage } from "../pages/CreateProposalPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { MembersPage } from "../pages/MembersPage";
import { ProposalDetailPage } from "../pages/ProposalDetailPage";
import { ProposalListPage } from "../pages/ProposalListPage";
import { TreasuryPage } from "../pages/TreasuryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/clubs" replace />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/clubs",
        element: <ClubSelectPage />
      },
      {
        path: "/clubs/:clubId",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "proposals", element: <ProposalListPage /> },
          { path: "proposals/new", element: <CreateProposalPage /> },
          { path: "proposals/:proposalId", element: <ProposalDetailPage /> },
          { path: "treasury", element: <TreasuryPage /> },
          { path: "members", element: <MembersPage /> },
          { path: "activity", element: <ActivityPage /> }
        ]
      }
    ]
  }
]);
