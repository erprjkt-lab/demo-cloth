"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  DashboardOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  ScissorOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Drawer, Dropdown, Grid, Layout, Menu, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import { BrandMark } from "@/components/Brand";
import { can, type ModuleKey, type PermMap } from "@/lib/permissions";
import { FONT_DISPLAY, SIDEBAR_BG, SIDEBAR_BORDER } from "@/lib/theme";
import { logout } from "../login/actions";

const { Header, Sider, Content } = Layout;
const HEADER_HEIGHT = 48; // shared by the top bar and the sidebar logo block so their borders line up

type Role = "ADMIN" | "STAFF" | "JOBBER";

const NAV: { key: string; module: ModuleKey; label: string; jobberLabel?: string; icon: React.ReactNode }[] = [
  { key: "/", module: "dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/jobs", module: "jobs", label: "Job Work", jobberLabel: "My Jobs", icon: <ScissorOutlined /> },
  { key: "/challans", module: "challans", label: "Challans", jobberLabel: "My Challans", icon: <FileTextOutlined /> },
  { key: "/catalogs", module: "catalogs", label: "Catalogues", icon: <BookOutlined /> },
  { key: "/jobbers", module: "jobbers", label: "Jobbers", icon: <TeamOutlined /> },
  { key: "/transfers", module: "transfers", label: "Job Transfer", icon: <SwapOutlined /> },
  { key: "/tasks", module: "tasks", label: "Tasks", jobberLabel: "My Tasks", icon: <CheckSquareOutlined /> },
  { key: "/admin/users", module: "users", label: "Users", icon: <UsergroupAddOutlined /> },
  { key: "/admin/permissions", module: "permissions", label: "Permissions", icon: <SafetyCertificateOutlined /> },
];

export function AppShell({
  user,
  perms,
  badges,
  children,
}: {
  user: { name: string; role: Role };
  perms: PermMap;
  badges: { jobs: number; tasks: number };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();
  const { token } = theme.useToken();
  // Unknown on the server (and the first client render): assume desktop so both renders match.
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  // Tablets (below 1200px) start with the 64px icon rail to leave room for tables; the toggle overrides.
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
  const collapsed = userCollapsed ?? screens.xl === false;
  const setCollapsed = (fn: (c: boolean) => boolean) => setUserCollapsed(fn(collapsed));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // The menu navigates with router.push (no <Link>), so warm up its pages ahead of the click.
  // Production only: in development Next.js ignores prefetch and builds each page on first visit.
  const navKeys = NAV.filter((n) => can(perms, n.module)).map((n) => n.key).join(",");
  useEffect(() => {
    for (const key of navKeys.split(",")) router.prefetch(key);
  }, [navKeys, router]);

  const badgeFor = (key: string) => (key === "/jobs" ? badges.jobs : key === "/tasks" ? badges.tasks : 0);
  const items: MenuProps["items"] = NAV.filter((n) => can(perms, n.module)).map((n) => {
    const label = (user.role === "JOBBER" && n.jobberLabel) || n.label;
    const count = badgeFor(n.key);
    return {
      key: n.key,
      icon: n.icon,
      label: count ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {label} <Badge count={count} size="small" />
        </span>
      ) : (
        label
      ),
    };
  });
  const selected = NAV.map((n) => n.key)
    .filter((k) => (k === "/" ? path === "/" : path.startsWith(k)))
    .sort((a, b) => b.length - a.length)[0];

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selected ? [selected] : []}
      items={items}
      onClick={({ key }) => {
        router.push(key);
        setMobileNavOpen(false);
      }}
      className="app-sidebar-menu"
      style={{ border: "none", paddingTop: 8, background: "transparent" }}
    />
  );

  const brand = (compact: boolean, size: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <BrandMark size={size} />
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Typography.Text
            style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: FONT_DISPLAY, letterSpacing: "-0.01em", lineHeight: 1.2 }}
          >
            Yash <span style={{ color: "#00A0E3" }}>Enterprise</span>
          </Typography.Text>
          <span style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Job Challan ERP
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ height: "100dvh", width: "100%", overflow: "hidden" }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          size="82%"
          styles={{
            body: { padding: 0, background: SIDEBAR_BG, display: "flex", flexDirection: "column" },
            header: { display: "none" },
            wrapper: { maxWidth: 280 },
          }}
        >
          <div
            style={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: `1px solid ${SIDEBAR_BORDER}`,
              flexShrink: 0,
            }}
          >
            {brand(false, 30)}
            <Button
              type="text"
              aria-label="Close navigation"
              icon={<CloseOutlined style={{ color: "rgba(255,255,255,0.7)" }} />}
              onClick={() => setMobileNavOpen(false)}
            />
          </div>
          <div className="app-sidebar-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
            {menu}
          </div>
        </Drawer>
      ) : (
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={220}
          collapsedWidth={64}
          className="app-sidebar-scroll"
          style={{ background: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}`, height: "100dvh", overflow: "auto" }}
        >
          <div
            style={{
              height: HEADER_HEIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? 0 : "0 20px",
              borderBottom: `1px solid ${SIDEBAR_BORDER}`,
              position: "sticky",
              top: 0,
              background: SIDEBAR_BG,
              zIndex: 1,
            }}
          >
            {brand(collapsed, 32)}
          </div>
          {menu}
        </Sider>
      )}

      <Layout style={{ height: "100%", minWidth: 0, overflow: "hidden" }}>
        <Header
          style={{
            background: token.colorBgContainer,
            padding: isMobile ? "0 12px" : "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            height: HEADER_HEIGHT,
            lineHeight: `${HEADER_HEIGHT}px`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              type="text"
              aria-label="Toggle navigation"
              style={{ fontSize: 16 }}
              icon={isMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={isMobile ? () => setMobileNavOpen(true) : () => setCollapsed((c) => !c)}
            />
            {isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BrandMark size={22} />
                <Typography.Text style={{ fontWeight: 700, fontSize: 14 }}>
                  Yash <span style={{ color: "#00A0E3" }}>Enterprise</span>
                </Typography.Text>
              </div>
            )}
          </div>

          <Dropdown
            menu={{
              items: [
                { key: "role", label: `Signed in as ${user.role.toLowerCase()}`, disabled: true },
                { type: "divider" },
                { key: "logout", label: "Logout", icon: <LogoutOutlined />, danger: true },
              ],
              onClick: ({ key }) => key === "logout" && logout(),
            }}
          >
            <Button
              type="text"
              style={{ height: 34, paddingInline: isMobile ? 4 : 8, display: "flex", alignItems: "center", gap: 6, maxWidth: isMobile ? 140 : 200 }}
            >
              <Avatar size={24} style={{ background: token.colorPrimary, flexShrink: 0 }} icon={<UserOutlined />} />
              <Typography.Text ellipsis style={{ fontWeight: 500, maxWidth: isMobile ? 70 : 120 }}>
                {user.name}
              </Typography.Text>
              <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />
            </Button>
          </Dropdown>
        </Header>

        <Content
          style={{
            // Bottom padding clears the iPhone home bar.
            padding: isMobile ? "12px 10px calc(16px + env(safe-area-inset-bottom))" : 16,
            background: token.colorBgLayout,
            overflowY: "auto",
            overflowX: "hidden",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ maxWidth: 1600, margin: "0 auto", width: "100%" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
