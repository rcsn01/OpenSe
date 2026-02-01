Role: Expert React/TypeScript Developer

Task: Refactor the codebase to improve modularity and mobile responsiveness.

1. Component Refactoring (Tabs): For the following pages, extract the inline sub-components/tabs into their own files under src/components/(pagename)/.

    Target Pages:

        src/pages/Inventory.tsx (Tabs: AllProducts, Folders, Variants, Transfer, Bundles)

        src/pages/LabelStudio.tsx (Tabs: ItemLabels, LocationLabels, ShippingLabels)

        src/pages/Procurement.tsx (Tabs: Replenishment, POs, Suppliers, Receiving)

        src/pages/Reports.tsx (Tabs: Valuation, Profitability, Turnover, Audit)

        src/pages/TeamSettings.tsx (Tabs: Members, Roles, Activity)

        src/pages/Scan.tsx (Tabs: QuickScan, PickPack, CycleCount, Putaway)

        src/pages/ProductDetail.tsx (Tabs: Overview, Suppliers, BatchHistory, Attachments)

2. Component Refactoring (General): For pages without tabs, break down large chunks of JSX into smaller, reusable components under src/components/(pagename)/ to clean up the main page file.

    Target Pages:

        src/pages/Dashboard.tsx (Extract: StatsCards, ValuationChart, StockHealth, TopMovers, RecentActivity)

        src/pages/Alerts.tsx (Extract: LowStockList, ExpiryList)

3. Mobile Responsiveness: Review src/App.css and the layout components.

    Update the main Layout and Sidebar to be responsive. On mobile (screen width < 768px), the sidebar should likely be hidden behind a hamburger menu or converted to a bottom navigation bar.

    Ensure data tables in the refactored components have horizontal scrolling or a card-view fallback for small screens.