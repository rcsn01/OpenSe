import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  Badge,
  Body,
  Button,
  Container,
  Heading,
  LandingNavbar,
  VStack,
} from "@repo/ui";
import { ArrowLeft } from "lucide-react";

export function LandingNavbarPreviewPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="ui-shell-preview-page">
      <LandingNavbar
        as="header"
        brand={
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="ui-shell-preview-brand">UI</span>
            <span className="font-semibold">Shared UI</span>
          </Link>
        }
        segmentedLinks={[
          { label: "Overview", href: "#overview" },
          { label: "Systems", href: "#systems" },
        ]}
        segmentedLinksAriaLabel="Preview sections"
        links={[
          { label: "Analytics", href: "#analytics" },
          { label: "Teams", href: "#teams" },
        ]}
        actions={
          <Button type="button" variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
            Back to gallery
          </Button>
        }
        mobileMenu={{
          open: mobileOpen,
          onToggle: () => setMobileOpen((current) => !current),
          items: [
            { label: "Overview", href: "#overview" },
            { label: "Systems", href: "#systems" },
            { label: "Analytics", href: "#analytics" },
            { label: "Teams", href: "#teams" },
          ],
        }}
      />

      <Container className="ui-shell-preview-content">
        <VStack className="ui-gallery-stack">
          <section id="overview" className="ui-gallery-section">
            <Badge>LandingNavbar preview</Badge>
            <Heading level="h1">Shared Landing Navbar</Heading>
            <Body size="body3" muted>
              This preview gives the shared landing shell enough space to show
              its transparent and scrolled states naturally.
            </Body>
          </section>

          <section id="systems" className="ui-gallery-section">
            <AnalyticsMetricGrid variant="stats-3">
              <AnalyticsMetricCard label="Apps" value="4" />
              <AnalyticsMetricCard label="Shared packages" value="12" />
              <AnalyticsMetricCard label="Preview routes" value="2" />
            </AnalyticsMetricGrid>
          </section>

          <section id="analytics" className="ui-gallery-section">
            <div className="ui-gallery-canvas ui-gallery-canvas--roomy">
              <Heading level="h3">Whitespace-first hero stage</Heading>
              <Body size="body4" muted>
                The navbar should sit over open space and content rhythm, not
                over a stack of bordered cards.
              </Body>
            </div>
          </section>

          <section id="teams" className="ui-gallery-section">
            <div className="ui-gallery-canvas ui-gallery-canvas--roomy">
              <Heading level="h3">Shared action area</Heading>
              <Body size="body4" muted>
                Scroll this page to see the navbar shift into its scrolled
                presentation.
              </Body>
            </div>
          </section>
        </VStack>
      </Container>
    </div>
  );
}
