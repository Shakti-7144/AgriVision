import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FarmerOrders from "@/components/dashboard/FarmerOrders";
import { Percent } from "lucide-react";

export default function FarmerOrdersPage() {
  return (
    <DashboardLayout title="My Orders">
      <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/10 p-4 flex gap-3 items-start">
        <Percent className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Platform fee: 2 – 2.5% commission on total sales</p>
          <p className="text-muted-foreground">
            A minimum of 2% (up to 2.5%) of every successful order is retained by AgriVision as the platform fee. The remainder is paid out to you.
          </p>
        </div>
      </div>
      <FarmerOrders />
    </DashboardLayout>
  );
}
