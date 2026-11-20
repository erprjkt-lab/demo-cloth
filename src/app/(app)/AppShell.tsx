"use client";

// One shell for every screen size (design system):
// desktop: navy sidebar with names · tablet: the same sidebar as a 72px icon rail · phone: a top bar with ☰ that opens it.
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AppstoreOutlined,
  BookOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuOutlined,
  SafetyCertificateOutlined,
  ScissorOutlined,
  SwapOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Drawer, Dropdown, Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { BRAND, BrandMark } from "@/components/Brand";
import { useScreen } from "@/components/ui";
import { can, type ModuleKey, type PermMap } from "@/lib/permissions";
import { FONT_DISPLAY, SIDEBAR_BG } from "@/lib/theme";
import { logout } from "../login/actions";

const { Header, Sider, Content } = Layout;

type Role = "ADMIN" | "STAFF" | "JOBBER";

const NAV: { key: string; module: ModuleKey; label: string; jobberLabel?: string; icon: React.ReactNode }[] = [
  { key: "/", module: "dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/jobs", module: "jobs", label: "Job Work", jobberLabel: "My Jobs", icon: <ScissorOutlined /> },
  { key: "/challans", module: "challans", label: "Challans", jobberLabel: "My Challans", icon: <FileTextOutlined /> },
  { key: "/catalogs", module: "catalogs", label: "Catalogues", icon: <BookOutlined /> },
  { key: "/jobbers", module: "jobbers", label: "Jobbers", icon: <TeamOutlined /> },
  { key: "/transfers", module: "transfers", label: "Transfers", icon: <SwapOutlined /> },
  { key: "/tasks", module: "tasks", label: "Tasks", jobberLabel: "My Tasks", icon: <CheckSquareOutlined /> },
  { key: "/admin/users", module: "users", label: "Users", icon: <UsergroupAddOutlined /> },
  { key: "/admin/masters", module: "masters", label: "Masters", icon: <AppstoreOutlined /> },
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
  const { phone, tablet } = useScreen();
  const [navOpen, setNavOpen] = useState(false);

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
      title: label,
      label: (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {label}
          {count > 0 && <span style={{ fontSize: 12, color: "#7DD3FC" }}>{count}</span>}
        </span>
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
      inlineCollapsed={tablet}
      selectedKeys={selected ? [selected] : []}
      items={items}
      onClick={({ key }) => {
        router.push(key);
        setNavOpen(false);
      }}
      className="app-sidebar-menu"
      style={{ border: "none", padding: tablet ? "8px 0" : "8px 4px", background: "transparent" }}
    />
  );

  const brand = (compact: boolean) => (
    <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: compact ? "center" : "flex-start", gap: 10, padding: compact ? 0 : "0 20px", flexShrink: 0 }}>
      <BrandMark size={compact ? 36 : 30} />
      {!compact && (
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>
          {BRAND.name} {BRAND.accent}
        </span>
      )}
    </div>
  );

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const account = (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "who", label: `${user.name} · ${user.role.toLowerCase()}`, disabled: true },
          { type: "divider" },
          { key: "logout", label: "Log out", icon: <LogoutOutlined />, danger: true },
        ],
        onClick: ({ key }) => key === "logout" && logout(),
      }}
    >
      <button
        type="button"
        aria-label="Account"
        style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: 0, border: 0, background: "transparent", cursor: "pointer", font: "inherit" }}
      >
        {!phone && <span style={{ fontSize: 14, color: "#475569", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</span>}
        <Avatar size={32} style={{ background: "#0369A1", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          {initial}
        </Avatar>
      </button>
    </Dropdown>
  );

  return (
    <Layout style={{ height: "100dvh", width: "100%", overflow: "hidden" }}>
      {phone ? (
        <Drawer
          placement="left"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          size="82%"
          styles={{
            body: { padding: 0, background: SIDEBAR_BG, display: "flex", flexDirection: "column" },
            header: { display: "none" },
            wrapper: { maxWidth: 300 },
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 8 }}>
            {brand(false)}
            <Button
              type="text"
              aria-label="Close menu"
              style={{ width: 44, height: 44 }}
              icon={<CloseOutlined style={{ color: "rgba(255,255,255,0.7)" }} />}
              onClick={() => setNavOpen(false)}
            />
          </div>
          <div className="app-sidebar-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
            {menu}
          </div>
        </Drawer>
      ) : (
        <Sider
          collapsed={tablet}
          trigger={null}
          width={224}
          collapsedWidth={72}
          className="app-sidebar-scroll"
          style={{ background: SIDEBAR_BG, height: "100dvh", overflow: "auto" }}
        >
          {brand(tablet)}
          {menu}
        </Sider>
      )}

      <Layout style={{ height: "100%", minWidth: 0, overflow: "hidden" }}>
        <Header
          style={{
            background: "#FFFFFF",
            height: phone ? 56 : 64,
            lineHeight: "normal",
            padding: phone ? "0 12px 0 4px" : tablet ? "0 28px" : "0 40px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #EEF2F6",
          }}
        >
          {phone && (
            <>
              <Button type="text" aria-label="Open menu" style={{ width: 44, height: 44 }} icon={<MenuOutlined style={{ fontSize: 20 }} />} onClick={() => setNavOpen(true)} />
              <BrandMark size={32} solid />
            </>
          )}
          <span style={{ flex: 1 }} />
          {account}
        </Header>

        <Content
          style={{
            // Bottom padding clears the iPhone home bar.
            padding: phone ? "20px 16px calc(20px + env(safe-area-inset-bottom))" : tablet ? 28 : "32px 40px",
            background: "#F8FAFC",
            overflowY: "auto",
            overflowX: "hidden",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ maxWidth: 1440, margin: "0 auto", width: "100%" }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
