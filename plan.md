"Refactor the Folder Card component in the Folder view. Currently, the 'Rename', 'Move', and 'Delete' buttons are always visible, which clutters the UI. Please redesign this to use a 'kebab' menu (three vertical dots icon) located in the top-right corner of each card. When clicked, this icon should open a dropdown menu containing the actions. This will free up space to make the Folder Name prominent and perhaps display metadata like 'Item Count' or 'Total Value' inside the folder card. Use a subtle hover effect on the card to indicate it is clickable."



"Redesign the Dashboard KPI cards (Low Stock Alerts and Total Asset Value) to look more professional.

    Add a relevant icon to each card (e.g., an alert triangle for Low Stock, a dollar sign or stack of coins for Asset Value). Place the icon in a rounded, colored container (e.g., light red background for the alert icon).

    Increase the font weight of the main number to make it pop.

    If possible, add a 'trend' indicator (e.g., a small green arrow saying '+5% from last month') to give the user more context.

    Ensure the cards have a subtle shadow and rounded corners (lg or xl) to lift them off the background."


"Enhance the main Inventory Table component to support 'Inline Editing' for the 'On Hand' and 'Price' columns.

    When a user hovers over a cell in the 'On Hand' column, show a subtle pencil icon or border to indicate it is editable.

    On click, turn the text into an input field.

    On blur or 'Enter' key press, trigger a Supabase update function to save the new value immediately.

    Add a toast notification (success/error) upon completion. This will allow users to do stock-takes much faster without opening a modal for every product."


"Update the 'Status' column in the product table to use a standardized Badge component.

    'In Stock' should use a green background with dark green text.

    'Low Stock' should use a vibrant amber/yellow background with dark yellow text.

    'Out of Stock' should use a light red background with red text.

    'Allocated' could use a blue or neutral gray. Ensure the badges have a pill shape (fully rounded corners) and slightly bolder font weight for better readability at a glance."


"Implement a 'Bulk Action Bar' for the inventory table. When one or more rows are selected via the checkbox:

    Hide the standard table filters (Search, Status dropdown).

    Replace them with an Action Bar showing 'X items selected' on the left.

    On the right, show bulk action buttons such as 'Bulk Delete', 'Move to Folder', 'Print Labels', or 'Export Selected'.

    Use a distinct background color (like a very light blue) for the header when in 'Selection Mode' to make it obvious to the user."


"Refine the overall layout structure and spacing using Tailwind CSS:

    Add a subtle bottom border to the secondary navigation tabs (All Products, Folders, etc.) so they feel anchored to the page structure.

    Increase the padding inside the main content area container to give the table more 'breathing room'.

    Change the page background to a very light gray (e.g., bg-gray-50) and keep the Table and Cards white. This creates a 'layered' effect that separates content from the background and reduces eye strain."



