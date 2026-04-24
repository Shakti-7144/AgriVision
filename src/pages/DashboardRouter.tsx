import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import FarmerDashboard from "./FarmerDashboard";
import BuyerDashboard from "./BuyerDashboard";

export default function DashboardRouter() {
  const { role, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (role === "buyer") return <BuyerDashboard />;
  if (role === "admin") return <Navigate to="/marketplace" replace />;
  return <FarmerDashboard />;
}
