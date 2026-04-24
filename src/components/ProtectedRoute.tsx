import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/context/AuthContext";
import { ReactNode } from "react";

export default function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: AppRole[];
}) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (allow && role && !allow.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
