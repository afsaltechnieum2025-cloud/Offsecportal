import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, Search, FolderOpen, User } from 'lucide-react';
import { NOTIFY_EVENT } from '@/utils/notifyRefresh';

const API = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, '')
         || 'http://localhost:5000/api';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_CONFIG: Record<string, {
  IconComponent: React.ElementType;
  bg: string;
  iconColor: string;
  dot: string;
}> = {
  finding: {
    IconComponent: Search,
    bg: 'rgba(239,68,68,0.08)',
    iconColor: '#ef4444',
    dot: '#ef4444',
  },
  project: {
    IconComponent: FolderOpen,
    bg: 'rgba(59,130,246,0.08)',
    iconColor: '#3b82f6',
    dot: '#3b82f6',
  },
  user: {
    IconComponent: User,
    bg: 'rgba(249,115,22,0.1)',
    iconColor: '#f97316',
    dot: '#f97316',
  },
  general: {
    IconComponent: Bell,
    bg: 'rgba(249,115,22,0.06)',
    iconColor: '#f97316',
    dot: '#f97316',
  },
};

const DEFAULT_CFG = TYPE_CONFIG.general;

function NotificationList({ notifications }: { notifications: Notification[] }) {
  if (notifications.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 16px', color: '#4b5563',
      }}>
        <Bell size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
        <p style={{ fontSize: '13px', margin: 0 }}>No notifications yet</p>
        <p style={{ fontSize: '11px', margin: '4px 0 0', opacity: 0.6 }}>
          Actions you take will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      {notifications.map((n, i) => {
        const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CFG;
        const { IconComponent } = cfg;
        return (
          <div
            key={n.id}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              borderBottom: i < notifications.length - 1
                ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: !n.is_read ? 'rgba(249,115,22,0.04)' : 'transparent',
            }}
          >
            <div style={{
              width: '36px', height: '36px',
              borderRadius: '10px',
              background: cfg.bg,
              border: `1px solid ${cfg.iconColor}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IconComponent size={15} color={cfg.iconColor} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: !n.is_read ? 600 : 400,
                  color: !n.is_read ? '#ffffff' : '#d1d5db',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                }}>
                  {n.title}
                </p>
                {!n.is_read && (
                  <div style={{
                    width: '7px', height: '7px',
                    borderRadius: '50%',
                    background: cfg.dot,
                    flexShrink: 0,
                    marginTop: '4px', marginLeft: '8px',
                    boxShadow: `0 0 6px ${cfg.dot}`,
                  }} />
                )}
              </div>
              <p style={{
                margin: '3px 0 0', fontSize: '11px',
                color: '#6b7280', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {n.message}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#374151' }}>
                {timeAgo(n.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}

function PanelHeader({ count }: { count: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(249,115,22,0.05)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '3px', height: '16px',
          background: 'linear-gradient(180deg, #f97316, #ef4444)',
          borderRadius: '2px',
        }} />
        <Bell size={14} color="#f97316" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
          Notifications
        </span>
        <span style={{
          fontSize: '10px', color: '#6b7280',
          background: 'rgba(255,255,255,0.06)',
          padding: '1px 6px', borderRadius: '999px',
        }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <CheckCheck size={12} color="#22c55e" />
        <span style={{ fontSize: '11px', color: '#22c55e' }}>All read</span>
      </div>
    </div>
  );
}

function PanelFooter({ count, isMobile }: { count: number; isMobile: boolean }) {
  if (count === 0) return null;
  return (
    <div style={{
      padding: '10px 16px',
      paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom))' : '10px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(249,115,22,0.03)',
      textAlign: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: '11px', color: '#4b5563' }}>
        Showing last {count} notifications
      </span>
    </div>
  );
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen]                   = useState(false);
  const [isMobile, setIsMobile]           = useState(false);
  const bellRef                           = useRef<HTMLDivElement>(null);
  const desktopDropRef                    = useRef<HTMLDivElement>(null);
  const token                             = localStorage.getItem('token');
  const unreadCount                       = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/notifications`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.error('[Notify] fetch error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.addEventListener(NOTIFY_EVENT, fetchNotifications);
    return () => window.removeEventListener(NOTIFY_EVENT, fetchNotifications);
  }, []);

  // Desktop only: close on outside click
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideBell = bellRef.current && !bellRef.current.contains(target);
      const outsideDrop = desktopDropRef.current && !desktopDropRef.current.contains(target);
      if (outsideBell && outsideDrop) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMobile]);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  const handleOpen = async () => {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      await fetch(`${API}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  // ── Mobile bottom sheet via portal — bypasses all parent clipping ──
  const mobileSheet = (open && isMobile) ? createPortal(
    <>
      {/* Backdrop — separate from sheet so it doesn't affect sheet layout */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />

      {/* Sheet — position:fixed with explicit top/bottom anchors.
          This is the most reliable approach across all mobile browsers:
          no flexbox height calculation, no svh units, no parent dependency.
          bottom:0 + top:20% = exactly 80% of the real viewport height.     */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          top: '20%',           // sheet occupies bottom 80% of viewport
          zIndex: 99999,
          background: '#0d0d1a',
          borderRadius: '20px 20px 0 0',
          border: '1px solid rgba(249,115,22,0.25)',
          borderBottom: 'none',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',   // clip children — scroll lives inside only
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{
            width: '40px', height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.18)',
          }} />
        </div>

        {/* Header — fixed, never shrinks */}
        <PanelHeader count={notifications.length} />

        {/* Scroll area — takes all remaining space between header & footer.
            flex:1 works reliably here because the parent has a definite   
            height (fixed positioning gives it one automatically).          */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          } as React.CSSProperties}
        >
          <NotificationList notifications={notifications} />
        </div>

        {/* Footer — fixed, never shrinks, respects home-bar safe area */}
        <PanelFooter count={notifications.length} isMobile={true} />
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
      <div style={{ position: 'relative' }} ref={bellRef}>
        {/* Bell button */}
        <button
          onClick={handleOpen}
          style={{
            position: 'relative',
            padding: '8px',
            borderRadius: '10px',
            background: open ? 'rgba(249,115,22,0.12)' : 'transparent',
            border: open ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
            cursor: 'pointer',
            color: open ? '#f97316' : '#9ca3af',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px', right: '-4px',
              minWidth: '18px', height: '18px',
              padding: '0 4px',
              fontSize: '10px', fontWeight: 700,
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              color: '#fff',
              borderRadius: '999px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px #0a0a14',
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Desktop dropdown — stays in normal DOM flow */}
        {open && !isMobile && (
          <div
            ref={desktopDropRef}
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '380px',
              background: '#0d0d1a',
              border: '1px solid rgba(249,115,22,0.2)',
              borderRadius: '14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              zIndex: 9999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PanelHeader count={notifications.length} />
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <NotificationList notifications={notifications} />
            </div>
            <PanelFooter count={notifications.length} isMobile={false} />
          </div>
        )}
      </div>

      {/* Mobile sheet injected directly into <body> via portal */}
      {mobileSheet}
    </>
  );
}