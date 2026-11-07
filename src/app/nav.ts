import { BadgeCheck, BarChart3, Flag, MessageSquare, Bookmark, Briefcase, Building2, FileText, Home, LayoutGrid, ScrollText, Search, User, UserSearch, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string; short?: string; to: string; icon: LucideIcon; end?: boolean;
  /** false = only in the desktop navigation (phone tab bar shows at most 5). */
  mobile?: boolean;
  /** false = not in the worker top bar (still in the phone tab bar and the account menu). */
  top?: boolean;
  /** Sidebar section for employer and admin. */
  group?: string;
}

/** Phone tab bar shows the items without `mobile: false` (max 5). */
export const NAV: Record<Role, NavItem[]> = {
  worker: [
    { label: "Home", to: "/worker", icon: Home, end: true },
    { label: "Find Jobs", short: "Jobs", to: "/worker/jobs", icon: Search },
    { label: "Applications", short: "Applied", to: "/worker/applications", icon: FileText },
    { label: "Saved", to: "/worker/saved", icon: Bookmark, mobile: false },
    { label: "Messages", to: "/worker/messages", icon: MessageSquare },
    { label: "Profile", short: "Me", to: "/worker/profile", icon: User, top: false },
  ],
  employer: [
    { label: "Dashboard", short: "Home", to: "/employer", icon: LayoutGrid, end: true, group: "Main menu" },
    { label: "Jobs", to: "/employer/jobs", icon: Briefcase, group: "Main menu" },
    { label: "Candidates", to: "/employer/candidates", icon: Users, group: "Main menu" },
    { label: "Find workers", short: "Find", to: "/employer/find-workers", icon: UserSearch, mobile: false, group: "Main menu" },
    { label: "Messages", to: "/employer/messages", icon: MessageSquare, group: "Main menu" },
    { label: "Analytics", to: "/employer/analytics", icon: BarChart3, mobile: false, group: "Insights" },
    { label: "Company profile", short: "Company", to: "/employer/company", icon: Building2, group: "Company" },
  ],
  admin: [
    { label: "Dashboard", short: "Home", to: "/admin", icon: LayoutGrid, end: true, group: "Main menu" },
    { label: "Company approvals", short: "Approvals", to: "/admin/verifications", icon: BadgeCheck, group: "Main menu" },
    { label: "Reports & help", short: "Reports", to: "/admin/reports", icon: Flag, group: "Main menu" },
    { label: "Users", to: "/admin/users", icon: Users, group: "Main menu" },
    { label: "Jobs", to: "/admin/jobs", icon: Briefcase, group: "Main menu" },
    { label: "Activity log", short: "Log", to: "/admin/activity", icon: ScrollText, mobile: false, group: "Records" },
  ],
};

export const ROLE_LABEL: Record<Role, string> = { worker: "Worker", employer: "Employer", admin: "Admin" };
