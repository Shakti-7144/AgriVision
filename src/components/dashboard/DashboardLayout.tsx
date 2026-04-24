import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, LogOut, LayoutDashboard, Store, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({ title, children }: { title: string; children: ReactNode }) {
  const { signOut, role, user } = useAuth();
  const navigate = useNavigate();

  const dashHref = role === "buyer" ? "/buyer" : role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
              <Leaf className="h-5 w-5" />
            </span>
            AgriVision
          </Link>

          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link to={dashHref}><Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4" />Dashboard</Button></Link>
            <Link to="/marketplace"><Button variant="ghost" size="sm"><Store className="h-4 w-4" />Marketplace</Button></Link>
            {role === "buyer" && (
              <Link to="/buyer"><Button variant="ghost" size="sm"><ShoppingBag className="h-4 w-4" />My Orders</Button></Link>
            )}
            {role === "farmer" && (
              <Link to="/farmer/orders"><Button variant="ghost" size="sm"><ShoppingBag className="h-4 w-4" />My Orders</Button></Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-muted-foreground capitalize">
              {role} · {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}
