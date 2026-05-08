import {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Menu, X } from "lucide-react";

export const LANDING_NAVBAR_OFFSET = "6rem";
export const LANDING_NAVBAR_SCROLL_OFFSET = "7rem";

export interface LandingNavbarLink {
  label: string;
  href: string;
  external?: boolean;
  testId?: string;
}

export interface LandingNavbarMobileMenu {
  open: boolean;
  onToggle: () => void;
  items: LandingNavbarLink[];
  action?: ReactNode;
  buttonLabel?: string;
}

export interface LandingNavbarRenderLinkOptions {
  className?: string;
  onClick?: () => void;
}

export interface LandingNavbarProps {
  as?: "div" | "nav" | "header";
  brand: ReactNode;
  segmentedLinks?: LandingNavbarLink[];
  segmentedLinksAriaLabel?: string;
  links?: LandingNavbarLink[];
  actions?: ReactNode;
  renderLink?: (
    link: LandingNavbarLink,
    options: LandingNavbarRenderLinkOptions,
  ) => ReactNode;
  mobileMenu?: LandingNavbarMobileMenu;
}

const renderAnchor = (
  link: LandingNavbarLink,
  options: LandingNavbarRenderLinkOptions,
) => (
  <a
    key={`${link.label}-${link.href}`}
    href={link.href}
    data-testid={link.testId}
    className={options.className}
    onClick={options.onClick}
    target={link.external ? "_blank" : undefined}
    rel={link.external ? "noopener noreferrer" : undefined}
  >
    {link.label}
  </a>
);

export const LandingNavbar = forwardRef<HTMLElement, LandingNavbarProps>(
  function LandingNavbar(
    {
      as = "div",
      brand,
      segmentedLinks,
      segmentedLinksAriaLabel,
      links,
      actions,
      renderLink = renderAnchor,
      mobileMenu,
    },
    ref,
  ) {
    const Root = as;
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 24);
      };

      handleScroll();
      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }, []);

    const rootStyle: CSSProperties = {
      fontFamily: "var(--font-family)",
      backgroundColor: isScrolled
        ? "color-mix(in srgb, var(--color-card) 88%, transparent)"
        : "transparent",
      backdropFilter: isScrolled ? "blur(20px)" : "none",
      WebkitBackdropFilter: isScrolled ? "blur(20px)" : "none",
      boxShadow: isScrolled
        ? "0 14px 40px color-mix(in srgb, var(--color-foreground) 10%, transparent)"
        : "none",
      color: isScrolled
        ? "var(--color-foreground)"
        : "var(--landing-navbar-transparent-foreground, var(--color-background))",
    };

    const segmentedGroupClassName = [
      "flex items-center gap-1 rounded-full p-1 text-xs font-medium backdrop-blur transition-colors duration-300",
      isScrolled
        ? "bg-white/75 text-[var(--color-muted-foreground)]"
        : "bg-white/10 text-white/75",
    ].join(" ");

    const segmentedLinkClassName = [
      "rounded-full px-3 py-1.5 transition-colors duration-200",
      isScrolled
        ? "hover:bg-[var(--color-foreground)] hover:text-[var(--color-background)]"
        : "hover:bg-white/15 hover:text-white",
    ].join(" ");

    const mobilePanelStyle: CSSProperties = {
      backgroundColor: "color-mix(in srgb, var(--color-card) 92%, transparent)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      boxShadow:
        "0 14px 40px color-mix(in srgb, var(--color-foreground) 10%, transparent)",
      color: "var(--color-foreground)",
    };

    return (
      <Root
        ref={ref as never}
        className="fixed left-1/2 top-6 z-40 flex w-[90%] max-w-5xl -translate-x-1/2 items-center justify-between gap-4 rounded-full px-6 py-3 transition-all duration-300"
        style={rootStyle}
      >
        <div className="shrink-0">{brand}</div>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {segmentedLinks?.length ? (
            <div
              aria-label={segmentedLinksAriaLabel}
              className={segmentedGroupClassName}
            >
              {segmentedLinks.map((link) =>
                renderLink(link, { className: segmentedLinkClassName }),
              )}
            </div>
          ) : null}

          {links?.map((link) =>
            renderLink(link, {
              className:
                "text-sm font-medium transition-transform duration-200 hover:-translate-y-px",
            }),
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {actions}

          {mobileMenu ? (
            <button
              type="button"
              className="p-1 md:hidden"
              onClick={mobileMenu.onToggle}
              aria-label={mobileMenu.buttonLabel ?? "Toggle navigation"}
              aria-expanded={mobileMenu.open}
            >
              {mobileMenu.open ? <X size={22} /> : <Menu size={22} />}
            </button>
          ) : null}
        </div>

        {mobileMenu?.open ? (
          <div
            className="absolute left-0 right-0 top-full mt-3 flex flex-col gap-3 rounded-[1.5rem] p-4"
            style={mobilePanelStyle}
          >
            {mobileMenu.items.map((link) =>
              renderLink(link, {
                className:
                  "text-sm font-medium px-3 py-2 transition-transform duration-200 hover:-translate-y-px",
                onClick: mobileMenu.onToggle,
              }),
            )}
            {mobileMenu.action}
          </div>
        ) : null}
      </Root>
    );
  },
);
