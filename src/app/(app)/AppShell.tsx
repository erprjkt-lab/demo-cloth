"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { BrandMark, BrandName } from "@/components/Brand";
import { logout } from "../login/actions";

type Role = "ADMIN" | "STAFF" | "JOBBER";
type Item = { href: string; label: string; icon: React.ReactNode; badge?: number };

function navItems(role: Role, taskBadge: number): Item[] {
  const tasks = { href: "/tasks", label: role === "JOBBER" ? "My Tasks" : "Tasks", icon: <CheckSquareOutlined />, badge: taskBadge };
  if (role === "JOBBER") return [{ href: "/challans", label: "My Challans", icon: <FileTextOutlined /> }, tasks];
  return [
    { href: "/", label: "Dashboard", icon: <DashboardOutlined /> },
    { href: "/challans", label: "Challans", icon: <FileTextOutlined /> },
    { href: "/catalogs", label: "Catalogues", icon: <BookOutlined /> },
    { href: "/jobbers", label: "Jobbers", icon: <TeamOutlined /> },
    { href: "/transfers", label: "Job Transfer", icon: <SwapOutlined /> },
    tasks,
    ...(role === "ADMIN" ? [{ href: "/admin/users", label: "Users", icon: <UsergroupAddOutlined /> }] : []),
  ];
}

const HEADER = "h-12 shrink-0 border-b"; // 48px, shared by top bar and sidebar logo block so borders line up

export function AppShell({
  user,
  taskBadge,
  children,
}: {
  user: { name: string; role: Role };
  taskBadge: number;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const items = navItems(user.role, taskBadge);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const menu = (rail: boolean) => (
    <nav className="space-y-1 px-1 pt-2 pb-4">
      {items.map((it) => {
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            title={rail ? it.label : undefined}
            onClick={() => setDrawer(false)}
            className={`relative mx-1 flex h-10 items-center gap-2.5 rounded-md text-sm transition ${rail ? "justify-center" : "px-5"} ${
              active
                ? "nav-item-active bg-[#00a0e3]/16 text-white"
                : "text-white/72 hover:bg-[#00a0e3]/8 hover:text-white"
            }`}
          >
            <span className={`relative text-[15px] ${active ? "text-[#00a0e3]" : ""}`}>
              {it.icon}
              {rail && !!it.badge && <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-red-500" />}
            </span>
            {!rail && <span className="flex-1 truncate">{it.label}</span>}
            {!rail && !!it.badge && (
              <span className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-[11px] leading-5 font-semibold text-white">
                {it.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop sider: 220px, or a 64px icon rail when collapsed */}
      <aside
        className={`app-sidebar-scroll hidden shrink-0 flex-col overflow-y-auto border-r border-white/8 bg-navy transition-[width] md:flex ${
          collapsed ? "w-16" : "w-[220px]"
        }`}
      >
        <div className={`${HEADER} sticky top-0 z-[1] flex items-center gap-2.5 border-white/8 bg-navy ${collapsed ? "justify-center" : "px-5"}`}>
          <BrandMark />
          {!collapsed && <BrandName />}
        </div>
        {menu(collapsed)}
      </aside>

      {/* Mobile off-canvas drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-[280px] flex-col bg-navy shadow-xl">
            <div className={`${HEADER} flex items-center justify-between border-white/8 px-4`}>
              <div className="flex items-center gap-2.5">
                <BrandMark size={30} />
                <BrandName />
              </div>
              <button onClick={() => setDrawer(false)} aria-label="Close navigation" className="p-1 text-white/70">
                <CloseOutlined />
              </button>
            </div>
            <div className="app-sidebar-scroll flex-1 overflow-y-auto">{menu(false)}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className={`${HEADER} flex items-center justify-between border-line bg-white px-3 md:px-4`}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              className="rounded-md p-2 text-base text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <MenuOutlined />
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              className="hidden rounded-md p-2 text-base text-slate-700 hover:bg-slate-100 md:inline-flex"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <div className="flex items-center gap-1.5 md:hidden">
              <BrandMark size={22} />
              <span className="font-display text-sm font-bold">
                Yash <span className="text-[#00a0e3]">Enterprise</span>
              </span>
            </div>
          </div>
          <UserMenu user={user} />
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] px-2.5 py-3 md:p-4">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function UserMenu({ user }: { user: { name: string; role: Role } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-[34px] max-w-[140px] items-center gap-1.5 rounded-md px-1 hover:bg-slate-100 md:max-w-[200px] md:px-2"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-white">
          <UserOutlined />
        </span>
        <span className="truncate text-sm font-medium">{user.name}</span>
        <DownOutlined className="shrink-0 text-[10px] text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-10 right-0 z-30 w-48 rounded-lg border border-line bg-white py-1 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
          <div className="px-3 py-2 text-xs text-slate-500">
            Signed in as <b className="text-slate-700">{user.role.toLowerCase()}</b>
          </div>
          <div className="my-1 border-t border-line" />
          <form action={logout}>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
              <LogoutOutlined /> Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
