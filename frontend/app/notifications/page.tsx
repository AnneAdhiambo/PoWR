"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card, ConfirmDialog } from "../components/ui";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Info, 
  Warning, 
  Briefcase, 
  ChatCircle,
  Star,
  Trash,
  Check
} from "phosphor-react";
import { Pagination } from "../components/ui";

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning" | "job" | "message" | "match";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const itemsPerPage = 8;

  useEffect(() => {
    const storedUsername = localStorage.getItem("github_username");
    const storedEmail = localStorage.getItem("github_email");
    
    if (storedUsername) {
      setUsername(storedUsername);
      setDisplayName(storedUsername);
    }
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
    
    // Load notifications (mock data)
    setNotifications([
      {
        id: "1",
        type: "match",
        title: "New Job Match",
        message: "You have a 92% match for Senior Backend Engineer at TechCorp",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        read: false,
        actionUrl: "/jobs",
      },
      {
        id: "2",
        type: "message",
        title: "New Message",
        message: "Sarah Chen sent you a message",
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: false,
        actionUrl: "/chat",
      },
      {
        id: "3",
        type: "success",
        title: "Profile Updated",
        message: "Your proof of work profile has been successfully updated",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: "4",
        type: "job",
        title: "Job Application Status",
        message: "Your application for Full Stack Developer has been reviewed",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        read: true,
        actionUrl: "/jobs",
      },
      {
        id: "5",
        type: "match",
        title: "New Gig Match",
        message: "You have an 88% match for API Development & Integration project",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        read: false,
        actionUrl: "/gigs",
      },
      {
        id: "6",
        type: "info",
        title: "Weekly Summary",
        message: "Your profile views increased by 15% this week",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: true,
      },
      {
        id: "7",
        type: "warning",
        title: "Subscription Reminder",
        message: "Your free plan update is scheduled for tomorrow",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        read: true,
        actionUrl: "/subscription",
      },
      {
        id: "8",
        type: "message",
        title: "New Message",
        message: "Alex Rodriguez sent you a message",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        read: true,
        actionUrl: "/chat",
      },
    ]);
  }, []);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" weight="fill" />;
      case "info":
        return <Info className="w-5 h-5 text-[#FF5500]" weight="fill" />;
      case "warning":
        return <Warning className="w-5 h-5 text-yellow-500" weight="fill" />;
      case "job":
        return <Briefcase className="w-5 h-5 text-[#FF5500]" weight="regular" />;
      case "message":
        return <ChatCircle className="w-5 h-5 text-[#FF5500]" weight="regular" />;
      case "match":
        return <Star className="w-5 h-5 text-[#FF5500]" weight="fill" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" weight="regular" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
    setNotificationToDelete(null);
  };

  const handleDeleteClick = (id: string) => {
    setNotificationToDelete(id);
  };

  const filteredNotifications = filter === "all"
    ? notifications
    : filter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.read).length;

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <Sidebar 
        username={username} 
        email={userEmail || undefined}
        displayName={displayName}
      />

      <div className="flex-1 overflow-y-auto ml-60">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight mb-1.5" style={{ fontWeight: 500 }}>
                Notifications
              </h1>
              <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] text-xs text-gray-400 hover:text-white transition-colors border border-[rgba(255,255,255,0.04)] flex items-center gap-2"
              >
                <Check className="w-4 h-4" weight="regular" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6">
            {["all", "unread", "job", "message", "match"].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filter === type
                    ? "bg-[#FF5500] text-white"
                    : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
                }`}
              >
                {type === "all" ? "All" : type === "unread" ? "Unread" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {paginatedNotifications.map((notif) => (
              <Card
                key={notif.id}
                className={`p-4 hover:bg-[rgba(255,255,255,0.04)] transition-colors ${
                  !notif.read ? "bg-[rgba(255,85,0,0.05)] border-[rgba(255,85,0,0.2)]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <h3 className={`text-sm font-semibold mb-1 ${!notif.read ? "text-white" : "text-gray-300"}`}>
                          {notif.title}
                        </h3>
                        <p className="text-xs text-gray-400" style={{ opacity: 0.7 }}>
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-[#FF5500] flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500" style={{ opacity: 0.6 }}>
                        {notif.timestamp.toLocaleDateString([], { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        {notif.actionUrl && (
                          <button
                            onClick={() => router.push(notif.actionUrl!)}
                            className="text-xs text-[#FF5500] hover:text-[#4d85f0] transition-colors"
                          >
                            View
                          </button>
                        )}
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(notif.id)}
                          className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                        >
                          <Trash className="w-4 h-4 text-gray-500 hover:text-red-400" weight="regular" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}

          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
              <p className="text-gray-400 mb-2">No notifications found</p>
              <p className="text-xs text-gray-500" style={{ opacity: 0.6 }}>
                {filter === "unread" ? "You're all caught up!" : "Try adjusting your filters"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={notificationToDelete !== null}
        onClose={() => setNotificationToDelete(null)}
        onConfirm={() => {
          if (notificationToDelete) {
            deleteNotification(notificationToDelete);
          }
        }}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

