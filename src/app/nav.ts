import { BadgeCheck, Flag, Bookmark, Briefcase, Building2, FileText, Home, LayoutGrid, ScrollText, Search, User, UserSearch, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string; short?: string; to: string; icon: LucideIcon; end?: boolean;
  /** false = only in the desktop sidebar (phone tab bar shows at most 5). */
  mobile?: boolean;
}

/** Phone tab bar shows the items without `mobile: false` (max 5). */
export const NAV: Record<Role, NavItem[]> = {
  worker: [
    { label: "Home", to: "/worker", icon: Home, end: true },
    { label: "Find Jobs", short: "Jobs", to: "/worker/jobs", icon: Search },
    { label: "Applications", short: "Applied", to: "/worker/applications", icon: FileText },
    { label: "Saved", to: "/worker/saved", icon: Bookmark },
    { label: "Profile", short: "Me", to: "/worker/profile", icon: User },
  ],
  employer: [
    { label: "Home", to: "/employer", icon: Home, end: true },
    { label: "Jobs", to: "/employer/jobs", icon: Briefcase },
    { label: "Candidates", to: "/employer/candidates", icon: UserSearch },
    { label: "Company", to: "/employer/company", icon: Building2 },
  ],
  admin: [
    { label: "Home", to: "/admin", icon: LayoutGrid, end: true },
    { label: "Company approvals", short: "Approvals", to: "/admin/verifications", icon: BadgeCheck },
    { label: "Reports & help", short: "Reports", to: "/admin/reports", icon: Flag },
    { label: "Users", to: "/admin/users", icon: Users },
    { label: "Jobs", to: "/admin/jobs", icon: Briefcase },
    { label: "Activity Log", short: "Log", to: "/admin/activity", icon: ScrollText, mobile: false },
  ],
};

export const ROLE_LABEL: Record<Role, string> = { worker: "Worker", employer: "Employer", admin: "Admin" };
