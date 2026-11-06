import type { AppNotification } from "@/types";
import { get, post } from "./client";

export const notificationsApi = {
  list: () => get<AppNotification[]>("/notifications"),
  markRead: (id: string) => post(`/notifications/${id}/read`),
  markAllRead: () => post("/notifications/read-all"),
};
