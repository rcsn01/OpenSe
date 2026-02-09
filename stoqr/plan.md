Role: Expert React/TypeScript Developer Context: We are refactoring the web-app project (Vite + React + TypeScript + Supabase + Tailwind CSS). Task: Implement the following comprehensive UI/UX improvements and feature enhancements. Please follow the implementation details strictly.
1. Global UI & System Enhancements

    Layout & Spacing: Refine the global layout in App.css and Layout.tsx.

        Change the main page background to a very light gray (e.g., bg-gray-50) while keeping Cards and Tables white to create a layered effect.

        Increase padding inside the main content area for better "breathing room."

        Add a subtle bottom border to secondary navigation tabs (e.g., in Tabs.tsx) to anchor them to the page structure.

    Toast Notifications: Implement a global toast notification system (using sonner or react-hot-toast).

        Trigger a success toast when labels are added to the queue in Label Studio.

        Show a "Generating label..." loading state followed by a success toast when creating a Shipping Label.

        Show success/error toasts after inline editing in the Inventory table.

2. Dashboard Redesign (src/pages/Dashboard.tsx)

    KPI Cards (StatsCards.tsx): Redesign to look professional.

        Add relevant icons (e.g., alert triangle for Low Stock, dollar sign for Asset Value) inside rounded, colored containers (e.g., light red bg for alerts).

        Increase the font weight of the main number.

        Add a "trend" indicator (e.g., small green arrow "+5% from last month").

        Apply shadow-lg or shadow-xl and rounded corners to lift cards off the background.

    Valuation Trend: Refactor ValuationChart.tsx. Replace the static placeholder with a Recharts AreaChart. If no data exists, show a faint gray baseline or a sample "projected" dotted line.

    Stock Health: Make the progress bars in StockHealth.tsx interactive. Clicking the orange "Low Stock" bar should navigate to the Inventory page with the "Low Stock" filter pre-applied.

    Empty States: Create a dedicated EmptyState component with a subtle SVG illustration (e.g., grayed-out box or ghost icon) for TopMovers and RecentActivity cards.

3. Inventory Management (src/components/Inventory/)

    Folder Card (FoldersTab.tsx): Remove the always-visible "Rename/Move/Delete" buttons.

        Implement a "Kebab" menu (three vertical dots) in the top-right corner.

        Clicking the icon opens a dropdown with the actions.

        Display metadata inside the card (e.g., "Item Count" or "Total Value").

        Add a subtle hover effect to the card.

    Inventory Table (AllProductsTab.tsx):

        Inline Editing: Make "On Hand" and "Price" columns editable. Hover shows a pencil icon; click converts to input. On Blur/Enter, trigger a Supabase update and show a Toast.

        Status Badges: Create a standardized Badge component:

            In Stock: Green bg / Dark Green text.

            Low Stock: Vibrant Amber bg / Dark Yellow text.

            Out of Stock: Light Red bg / Red text.

            Allocated: Blue or Neutral Gray.

            Style: Pill shape, fully rounded, bold font weight.

        Bulk Action Bar: When rows are selected:

            Hide standard filters (Search, Status).

            Show an Action Bar with "X items selected" on the left.

            Show buttons on the right: "Bulk Delete", "Move to Folder", "Print Labels", "Export Selected".

            Change header background to a distinct color (e.g., very light blue) in Selection Mode.

4. Label Studio Enhancements (src/components/LabelStudio/)

    Item Labels (ItemLabelsTab.tsx):

        When an item is selected, reveal a number input/stepper (+/-) next to the name to specify print quantity per SKU.

        Update "Label Preview": Add a toggle for "Single Label View" vs "Sheet View" (e.g., Avery 5160).

        If "Sheet View" is active, render a CSS grid showing the dynamic layout of labels based on quantities.

    Location/Shelf Labels (LocationLabelsTab.tsx):

        Add a toggle for "Single" vs "Bulk" creation.

        Bulk Mode: Allow range inputs (e.g., Aisle "1-5", Shelf "A-D").

        "Add to Queue" should programmatically generate all permutations (1-A, 1-B... 5-D).

        Allow users to hover over items in the Print Queue to see a "Remove" (trash can) icon.

    Shipping Labels (ShippingLabelsTab.tsx):

        Add a "Select Order" searchable dropdown at the top. Selecting an order auto-fills Recipient and Address.

        Structured Address: Break the textarea into: "Street 1", "Street 2", "City", "State", "Zip".

        Rate Calculation: Add a "Calculate Rate" button below the Service dropdown. Clicking it displays a mocked "Estimated Cost" price tag next to the Create button.