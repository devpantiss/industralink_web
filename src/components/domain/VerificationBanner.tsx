import { Clock, XCircle } from "lucide-react";
import { Banner } from "@/components/ui/Misc";
import { LinkButton } from "@/components/ui/Button";
import { useCompany } from "@/hooks/useCompany";

/** Shown to employers until their company is approved. */
export function VerificationBanner() {
  const { data } = useCompany();
  if (!data || data.verification === "approved") return null;
  if (data.verification === "rejected") {
    return (
      <Banner tone="danger" icon={<XCircle className="h-5 w-5" />} action={<LinkButton to="/employer/company" variant="secondary" size="sm">Fix & re-submit</LinkButton>}>
        <strong>Verification not approved.</strong> {data.rejectionReason}
      </Banner>
    );
  }
  return (
    <Banner tone="warning" icon={<Clock className="h-5 w-5" />}>
      <strong>Your company is under review.</strong> You can create draft jobs now and publish them once we verify you (usually within 1 working day).
    </Banner>
  );
}
