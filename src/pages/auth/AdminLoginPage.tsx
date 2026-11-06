import { Link } from "react-router-dom";
import { USE_MOCKS } from "@/api/client";
import { AuthLayout } from "./AuthLayout";
import { EmailLogin, useFinishLogin } from "./LoginPage";

/** Separate, unlinked admin login so workers and HR never see it. */
export default function AdminLoginPage() {
  const done = useFinishLogin();
  return (
    <AuthLayout side="admin" title="Admin login" subtitle="For the IndustriaLink team only.">
      <EmailLogin onSuccess={done}
        footer={<p className="text-center text-small text-ink-muted">Not an admin? <Link to="/login" className="font-medium text-primary hover:underline">Go to the normal login</Link></p>} />
      {USE_MOCKS && <p className="mt-8 rounded-lg border border-dashed border-border-strong bg-surface-muted/60 p-4 text-small text-ink-secondary"><span className="font-medium text-ink">Demo admin:</span> admin@industrialink.demo · demo1234</p>}
    </AuthLayout>
  );
}
