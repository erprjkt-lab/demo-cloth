import type { ThemeConfig } from "antd";

// Copied from CoreFlow ERP (D:\ERP-FE\src\theme) so both apps look the same.
export const SIDEBAR_BG = "#0B132B";
export const SIDEBAR_BORDER = "rgba(255, 255, 255, 0.08)";
export const FONT_BODY = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_DISPLAY = "var(--font-space-grotesk), var(--font-inter), -apple-system, sans-serif";
export const FONT_MONO = "var(--font-plex-mono), ui-monospace, 'SFMono-Regular', Menlo, monospace";

export const ANTD_THEME: ThemeConfig = {
  token: {
    colorPrimary: "#0369A1",
    colorPrimaryHover: "#0284C7",
    colorPrimaryActive: "#075985",
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    fontFamily: FONT_BODY,
    fontSize: 14,
    controlHeight: 36,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    boxShadowSecondary: "0 4px 16px rgba(15, 23, 42, 0.08)",
    colorBgLayout: "#F8FAFC",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorBorder: "#E2E8F0",
    colorBorderSecondary: "#EEF2F6",
    colorText: "#0F172A",
    colorTextSecondary: "#475569",
    colorTextTertiary: "#94A3B8",
    colorTextQuaternary: "#CBD5E1",
    colorSuccess: "#16A34A",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorInfo: "#0369A1",
  },
  components: {
    Menu: {
      darkItemBg: SIDEBAR_BG,
      darkSubMenuItemBg: "#070E1C",
      darkItemSelectedBg: "rgba(56, 189, 248, 0.14)",
      darkItemSelectedColor: "#FFFFFF",
      darkItemHoverBg: "rgba(56, 189, 248, 0.08)",
      darkItemColor: "rgba(255, 255, 255, 0.72)",
      itemBorderRadius: 8,
      itemHeight: 40,
    },
    Layout: { headerBg: "#FFFFFF", bodyBg: "#F8FAFC", siderBg: SIDEBAR_BG },
    Card: { paddingLG: 20, headerHeight: 52, headerFontSize: 16, colorBorderSecondary: "#EEF2F6" },
    Form: { itemMarginBottom: 12, verticalLabelPadding: "0 0 2px" },
    Table: {
      headerBg: "#FFFFFF",
      headerColor: "#64748B",
      headerSplitColor: "transparent",
      rowHoverBg: "#F8FAFC",
      borderColor: "#F1F5F9",
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
      cellPaddingBlockSM: 6,
    },
    Descriptions: { itemPaddingBottom: 8 },
    Button: { controlHeight: 40, fontWeight: 600, primaryShadow: "none", defaultShadow: "none" },
    Tabs: { itemColor: "#64748B", itemSelectedColor: "#0F172A", itemHoverColor: "#0F172A", inkBarColor: "#0369A1", horizontalItemGutter: 22, horizontalMargin: "0", titleFontSize: 14 },
    Tag: { borderRadiusSM: 4 },
  },
};
