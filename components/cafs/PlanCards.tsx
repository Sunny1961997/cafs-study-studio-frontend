import Link from "next/link";
import { cafs, formatUsd, hrefs } from "@/lib/cafs";

const { plans, featuredPlanId } = cafs.pricing;

// Checkout stays disabled; clicking a plan sends the visitor to the existing Academy login.
export function PlanCards() {
  const sorted = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="cafs-plans">
      {sorted.map((p) => (
        <Link
          key={p.id}
          href={hrefs.studentLogin}
          className={`cafs-plan ${p.id === featuredPlanId ? "cafs-planFeatured" : ""}`}
        >
          <p className="cafs-label cafs-tier">{p.tierLabel}</p>
          <h2 className="cafs-planName">{p.name}</h2>
          <p className="cafs-price">{formatUsd(p.priceMinor)}</p>
          <p className="cafs-billing">{p.billingLabel}</p>
          <div className="cafs-planDivider">
            <p className="cafs-planAccess">{p.accessLabel}</p>
            <p className="cafs-planDesc">{p.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
