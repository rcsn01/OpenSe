import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  buildConfiguredAccountsProfileUrl,
  buildConfiguredAccountsSettingsUrl,
} from "@repo/shared/utils";
import {
  AppLayout as SharedAppLayout,
  Button,
  SideNav,
  SideNavBrandSlot,
  SideNavGroup,
  SideNavGroupList,
  SideNavItem,
  useTheme,
} from "../components/ui";
import {
  BarChart3,
  Boxes,
  LayoutPanelTop,
  Layers,
  Moon,
  Palette,
  Package,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  Users,
  Workflow,
} from "lucide-react";

const galleryItems = [
  {
    hash: "#overview",
    label: "Overview",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    hash: "#foundations",
    label: "Foundations",
    icon: <Palette className="h-4 w-4" />,
  },
  { hash: "#actions", label: "Actions", icon: <Layers className="h-4 w-4" /> },
  {
    hash: "#forms",
    label: "Forms",
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
  {
    hash: "#feedback",
    label: "Feedback",
    icon: <Sparkles className="h-4 w-4" />,
  },
  { hash: "#data", label: "Data", icon: <Boxes className="h-4 w-4" /> },
  {
    hash: "#overlays",
    label: "Overlays",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    hash: "#navigation",
    label: "Navigation",
    icon: <Workflow className="h-4 w-4" />,
  },
  {
    hash: "#layout",
    label: "Layout",
    icon: <LayoutPanelTop className="h-4 w-4" />,
  },
  {
    hash: "#analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    hash: "#organisation",
    label: "Organisation",
    icon: <Users className="h-4 w-4" />,
  },
];

const previewItems = [
  {
    path: "/preview/landing-navbar",
    label: "Landing Navbar",
    icon: <LayoutPanelTop className="h-4 w-4" />,
  },
  {
    path: "/preview/stoqr",
    label: "Stoqr Page",
    icon: <Package className="h-4 w-4" />,
  },
];

function AppLayoutContent() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const applyViewport = () => {
      const isMobile = mediaQuery.matches || window.innerWidth <= 767;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setIsMobileNavOpen(false);
      }
    };

    applyViewport();

    const onChange = () => applyViewport();
    mediaQuery.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.hash, location.pathname]);

  const openAccountProfile = () => {
    window.location.assign(buildConfiguredAccountsProfileUrl());
  };

  const openAccountSettings = () => {
    window.location.assign(buildConfiguredAccountsSettingsUrl());
  };

  const sidebar = (
    <>
      <SideNavBrandSlot
        icon={<Palette className="w-5 h-5" />}
        name="Shared UI"
        version="Gallery"
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            onClick={toggleTheme}
          >
            {resolvedTheme === "dark" ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        }
      />
      <SideNav>
        <SideNavGroupList>
          <SideNavGroup category="foundation">
            {galleryItems.map((item) => {
              const isActive =
                location.pathname === "/" &&
                (location.hash === item.hash ||
                  (!location.hash && item.hash === "#overview"));

              return (
                <SideNavItem
                  key={item.hash}
                  active={isActive}
                  renderLink={({ className, children }) => (
                    <Link
                      to={{ pathname: "/", hash: item.hash }}
                      className={className}
                    >
                      {children}
                    </Link>
                  )}
                >
                  {item.icon}
                  {item.label}
                </SideNavItem>
              );
            })}
          </SideNavGroup>
          <SideNavGroup category="test-pages">
            {previewItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");

              return (
                <SideNavItem
                  key={item.path}
                  active={isActive}
                  renderLink={({ className, children }) => (
                    <Link to={item.path} className={className}>
                      {children}
                    </Link>
                  )}
                >
                  {item.icon}
                  {item.label}
                </SideNavItem>
              );
            })}
          </SideNavGroup>
        </SideNavGroupList>
      </SideNav>
    </>
  );

  return (
    <SharedAppLayout
      sidebar={sidebar}
      profileFallback="U"
      onProfileClick={openAccountProfile}
      onSettingsClick={openAccountSettings}
      mobileSidebar={{
        enabled: isMobileViewport,
        isOpen: isMobileNavOpen,
        onOpen: () => setIsMobileNavOpen(true),
        onClose: () => setIsMobileNavOpen(false),
        toggleAriaLabel: "Toggle side navigation",
      }}
    >
      <Outlet />
    </SharedAppLayout>
  );
}

export function AppLayout() {
  return <AppLayoutContent />;
}
