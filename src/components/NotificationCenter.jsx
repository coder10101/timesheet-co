import { useState, useRef, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock3,
  AlarmClock,
  LogOut,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotificationsData";
import { isoToBSLabel } from "../utils/nepaliCalendar";

/**
 * Formats ISO timestamp to human friendly relative time.
 */
function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "Just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return isoToBSLabel(dateString.slice(0, 10));
}

/**
 * Returns icon, accent colors, and styling based on notification type.
 */
function getNotificationVisuals(type) {
  switch (type) {
    case "leave_requested":
      return {
        icon: <CalendarCheck size={16} className="text-amber-400" />,
        bg: "bg-amber-400/10 border-amber-400/20",
      };
    case "leave_approved":
      return {
        icon: <CheckCircle2 size={16} className="text-emerald-400" />,
        bg: "bg-emerald-400/10 border-emerald-400/20",
      };
    case "leave_rejected":
      return {
        icon: <XCircle size={16} className="text-rose-400" />,
        bg: "bg-rose-400/10 border-rose-400/20",
      };
    case "attendance_edited":
      return {
        icon: <Clock3 size={16} className="text-violet-400" />,
        bg: "bg-violet-400/10 border-violet-400/20",
      };
    case "clockin_reminder":
      return {
        icon: <AlarmClock size={16} className="text-sky-400" />,
        bg: "bg-sky-400/10 border-sky-400/20",
      };
    case "clockout_reminder":
      return {
        icon: <LogOut size={16} className="text-amber-400" />,
        bg: "bg-amber-400/10 border-amber-400/20",
      };
    case "event_reminder":
      return {
        icon: <CalendarDays size={16} className="text-teal-400" />,
        bg: "bg-teal-400/10 border-teal-400/20",
      };
    default:
      return {
        icon: <Bell size={16} className="text-cyan-400" />,
        bg: "bg-cyan-400/10 border-cyan-400/20",
      };
  }
}

export function NotificationCenter({ userId, placement = "auto" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'unread'
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(userId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const handleNotificationClick = (item) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    if (item.link) {
      navigate(item.link);
      setIsOpen(false);
    }
  };

  // Determine modal position so it stays 100% within screen bounds
  const getPopoverClasses = () => {
    if (placement === "sidebar") {
      return "fixed top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] inset-x-3 max-w-[calc(100vw-1.5rem)] mx-auto sm:max-w-md md:fixed md:inset-x-auto md:left-[14.75rem] lg:left-[15.75rem] md:top-3.5 md:w-96 md:max-w-[420px]";
    }
    if (placement === "mobile") {
      return "fixed top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] inset-x-3 max-w-[calc(100vw-1.5rem)] mx-auto sm:left-auto sm:right-3 sm:w-96 sm:max-w-md";
    }
    return "fixed top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] inset-x-3 max-w-[calc(100vw-1.5rem)] mx-auto sm:left-auto sm:right-3 sm:w-96 sm:max-w-md md:absolute md:top-full md:right-0 md:mt-2 md:w-96";
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* BELL TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs ring-2 ring-[#011E26] animate-in fade-in zoom-in pointer-events-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN POPOVER / SHEET */}
      {isOpen && (
        <>
          {/* Backdrop: dimmed on mobile, transparent click-catcher on desktop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`${getPopoverClasses()} z-50 bg-[#011E26] border border-white/15 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85dvh] md:max-h-[550px]`}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-primary">
                  <Bell size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck size={14} />
                    <span className="hidden sm:inline text-[11px]">Mark read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* TABS (All / Unread) */}
            <div className="flex items-center border-b border-white/10 px-3 pt-2 bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "border-primary text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`flex-1 py-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === "unread"
                    ? "border-primary text-white"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* NOTIFICATIONS LIST */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white/5 text-white/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-xs font-semibold text-white/80">
                    {activeTab === "unread" ? "No unread notifications" : "All caught up!"}
                  </p>
                  <p className="text-[11px] text-white/40 max-w-[220px] mx-auto">
                    {activeTab === "unread"
                      ? "You have marked all notifications as read."
                      : "Reminders and team updates will appear here."}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const visuals = getNotificationVisuals(item.type);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`group relative flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                        item.read
                          ? "hover:bg-white/5 opacity-75 hover:opacity-100"
                          : "bg-white/[0.06] hover:bg-white/[0.1] border border-white/10"
                      }`}
                    >
                      {/* TYPE ICON */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${visuals.bg} mt-0.5`}
                      >
                        {visuals.icon}
                      </div>

                      {/* CONTENT */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`text-xs leading-tight truncate ${
                              item.read ? "font-medium text-white/80" : "font-bold text-white"
                            }`}
                          >
                            {item.title}
                          </p>
                          {!item.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-white/60 line-clamp-2 mt-1 leading-normal">
                          {item.message}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-mono text-white/40">
                            {formatRelativeTime(item.created_at)}
                          </span>

                          {item.link && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline">
                              <span>View</span>
                              <ExternalLink size={10} />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* DISMISS / DELETE BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-white/10 transition-all cursor-pointer absolute top-2.5 right-2"
                        title="Dismiss"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* FOOTER */}
            {notifications.length > 0 && (
              <div className="p-2 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => clearAll()}
                  className="text-[11px] text-white/40 hover:text-rose-400 transition-colors px-2 py-1"
                >
                  Clear all history
                </button>
                <span className="text-[10px] text-white/30 px-2 font-mono">
                  {notifications.length} total
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
