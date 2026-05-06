import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui'
import { toast } from 'sonner'
import {
  useCreateInventoryFolder,
  useRenameFolderInInventory,
  useDeleteFolderInInventory,
  useMoveInventoryProducts,
  useMoveFolderInInventory,
} from '../../hooks/queries/useInventory'
import { InventoryFiltersBar } from './all-products/InventoryFiltersBar'
import { ProductListView } from './all-products/ProductListView'
import { BulkAdjustModal } from './all-products/BulkAdjustModal'
import { FolderNavigationPanel } from './FolderNavigationPanel'
import type { AllProductsTabProps } from './all-products/types'
import './InventorySurface.css'

export const AllProductsTab = ({
  companyId,
  folderView,
  setFolderView,
  selectedFolderId,
  setSelectedFolderId,
  stockFilter,
  setStockFilter,
  activeCustomFieldFilters,
  onAddFilter,
  onRemoveFilter,
  pendingFilterKey,
  setPendingFilterKey,
  customFieldFilters,
  onImportOpen,
  onCreateOpen,
  products,
  isLoading,
  selectedRowIds,
  toggleSelection,
  toggleAll,
  sortField,
  sortDir,
  onSortChange,
  page,
  pageSize,
  setPageSize,
  totalCount,
  setPage,
  folders,
  handleBulkDelete,
  onClearSelection,
  onRefresh,
}: AllProductsTabProps) => {
  const isSelectionMode = selectedRowIds.size > 0
  const [view, setView] = useState<'list' | 'grid'>('list')

  // Folder creation inline state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<string | null>(null)

  // Folder delete dialog state
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)
  const [deleteStep, setDeleteStep] = useState<'choose' | 'confirm' | null>(null)
  const [deleteAction, setDeleteAction] = useState<'move-uncategorised' | 'delete-products' | null>(null)
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [moveTargetFolderId, setMoveTargetFolderId] = useState('__uncategorised__')
  const [bulkModalMode, setBulkModalMode] = useState<'price' | 'quantity' | null>(null)
  const [isMobileExplorerOpen, setIsMobileExplorerOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

  const createFolderMutation = useCreateInventoryFolder(companyId)
  const renameFolderMutation = useRenameFolderInInventory(companyId)
  const deleteFolderMutation = useDeleteFolderInInventory(companyId)
  const moveProductsMutation = useMoveInventoryProducts(companyId)
  const moveFolderMutation = useMoveFolderInInventory(companyId)

  const moveTargetOptions = useMemo(() => {
    const folderById = new Map(folders.map((folder) => [folder.id, folder]))

    const getFolderPath = (folderId: string) => {
      const segments: string[] = []
      const seen = new Set<string>()
      let currentId: string | null = folderId

      while (currentId && !seen.has(currentId)) {
        const currentFolder = folderById.get(currentId)
        if (!currentFolder) break

        segments.unshift(currentFolder.name)
        seen.add(currentId)
        currentId = currentFolder.parent_id
      }

      return segments.join(' / ')
    }

    return folders
      .map((folder) => ({ value: folder.id, label: getFolderPath(folder.id) || folder.name }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }, [folders])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const applyViewport = () => {
      const isMobile = mediaQuery.matches || window.innerWidth <= 767
      setIsMobileViewport(isMobile)
      if (!isMobile) {
        setIsMobileExplorerOpen(false)
      }
    }

    applyViewport()

    const onChange = () => applyViewport()
    mediaQuery.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  const closeMobileExplorerIfNeeded = () => {
    if (isMobileViewport) {
      setIsMobileExplorerOpen(false)
    }
  }

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId)
    setPage(1)
  }

  const resetFolderCreation = () => {
    setIsCreatingFolder(false)
    setNewFolderName('')
    setCreatingFolderParentId(null)
  }

  const handleOpenCreateFolder = (parentId: string | null) => {
    setCreatingFolderParentId(parentId)
    setNewFolderName('')
    setIsCreatingFolder(true)
  }

  const handleCreateFolderSubmit = async () => {
    if (!newFolderName.trim()) return

    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName,
        parentId: creatingFolderParentId,
      })
      toast.success('Folder created')
      resetFolderCreation()
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder'
      toast.error(message)
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await renameFolderMutation.mutateAsync({ folderId, newName })
      toast.success('Folder renamed')
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename folder'
      toast.error(message)
    }
  }

  const handleDeleteStepChoose = (folderId: string) => {
    setDeletingFolderId(folderId)
    setDeleteStep('choose')
    setDeleteAction(null)
  }

  const handleDeleteActionSelect = (action: 'move-uncategorised' | 'delete-products') => {
    setDeleteAction(action)
    setDeleteStep('confirm')
  }

  const handleDeleteConfirm = async () => {
    if (!deletingFolderId || !deleteAction) return
    try {
      await deleteFolderMutation.mutateAsync({ folderId: deletingFolderId, action: deleteAction })
      toast.success('Folder deleted')
      if (selectedFolderId === deletingFolderId) {
        setFolderView('all')
        setSelectedFolderId(null)
      }
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete folder'
      toast.error(message)
    } finally {
      setDeletingFolderId(null)
      setDeleteStep(null)
      setDeleteAction(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeletingFolderId(null)
    setDeleteStep(null)
    setDeleteAction(null)
  }

  const handleOpenMoveDialog = () => {
    if (selectedRowIds.size === 0) return
    setMoveTargetFolderId('__uncategorised__')
    setIsMoveDialogOpen(true)
  }

  const handleCloseMoveDialog = () => {
    if (moveProductsMutation.isPending) return
    setIsMoveDialogOpen(false)
    setMoveTargetFolderId('__uncategorised__')
  }

  const handleMoveSelectedProducts = async () => {
    if (selectedRowIds.size === 0) return

    try {
      const movedCount = await moveProductsMutation.mutateAsync({
        productIds: Array.from(selectedRowIds),
        folderId: moveTargetFolderId === '__uncategorised__' ? null : moveTargetFolderId,
      })

      toast.success(`Moved ${movedCount} product${movedCount === 1 ? '' : 's'}`)
      onClearSelection()
      onRefresh()
      handleCloseMoveDialog()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move selected products'
      toast.error(message)
    }
  }

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedRowIds.has(p.id)),
    [products, selectedRowIds],
  )

  const exportSelectedCsv = () => {
    if (selectedProducts.length === 0) return
    const toCsv = (rows: string[][]) =>
      rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const rows = [
      ['Name', 'SKU', 'Quantity', 'Reorder Point', 'Cost Price', 'Selling Price'],
      ...selectedProducts.map((p) => [
        p.name,
        p.sku,
        String(p.quantity_on_hand),
        String(p.reorder_point),
        String(p.cost_price ?? 0),
        String(p.selling_price ?? 0),
      ]),
    ]
    const content = toCsv(rows)
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'inventory-export.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleMoveFolder = async (folderId: string, newParentId: string | null, sortOrder: number) => {
    try {
      await moveFolderMutation.mutateAsync({ folderId, newParentId, sortOrder })
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move folder'
      toast.error(message)
    }
  }

  return (
    <div
      className={`explorer-container flex min-h-0 flex-1 ${isMobileViewport ? 'mobile-explorer-enabled' : ''} ${isMobileExplorerOpen ? 'mobile-explorer-open' : ''}`}
    >
      {isMobileViewport && isMobileExplorerOpen ? (
        <button
          type="button"
          className="explorer-mobile-backdrop"
          aria-label="Close folder navigation"
          onClick={() => setIsMobileExplorerOpen(false)}
        />
      ) : null}

      <div
        id="inventory-folder-navigation"
        className={`explorer-sidebar-shell ${isMobileExplorerOpen ? 'is-open' : ''}`}
        role="complementary"
        aria-label="Folder navigation"
        aria-hidden={isMobileViewport ? !isMobileExplorerOpen : undefined}
      >
        <FolderNavigationPanel
          folders={folders}
          activeFolderId={selectedFolderId}
          folderView={folderView}
          onSelectFolder={(folderId) => {
            handleFolderSelect(folderId)
            closeMobileExplorerIfNeeded()
          }}
          onSelectView={(view) => {
            setFolderView(view)
            if (view !== 'folder') setSelectedFolderId(null)
            setPage(1)
            closeMobileExplorerIfNeeded()
          }}
          onCreateFolder={(parentId) => {
            handleOpenCreateFolder(parentId)
          }}
          isCreatingFolder={isCreatingFolder}
          creatingFolderParentId={creatingFolderParentId}
          newFolderName={newFolderName}
          onCreateFolderNameChange={setNewFolderName}
          onCreateFolderSubmit={() => void handleCreateFolderSubmit()}
          onCreateFolderCancel={resetFolderCreation}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={(folderId) => handleDeleteStepChoose(folderId)}
          onMoveFolder={handleMoveFolder}
          deletingFolderId={deletingFolderId}
          deleteStep={deleteStep}
          deleteAction={deleteAction}
          onDeleteStepChoose={handleDeleteStepChoose}
          onDeleteActionSelect={handleDeleteActionSelect}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={handleDeleteCancel}
        />
      </div>

      <div className="explorer-main">
        <Card padding="none" variant="plain" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryFiltersBar
            isSelectionMode={isSelectionMode}
            selectedRowIds={selectedRowIds}
            stockFilter={stockFilter}
            setStockFilter={setStockFilter}
            view={view}
            setView={setView}
            activeCustomFieldFilters={activeCustomFieldFilters}
            onAddFilter={onAddFilter}
            onRemoveFilter={onRemoveFilter}
            pendingFilterKey={pendingFilterKey}
            setPendingFilterKey={setPendingFilterKey}
            customFieldFilters={customFieldFilters}
            showMobileExplorerToggle={isMobileViewport && !isMobileExplorerOpen}
            onMobileExplorerToggle={() => setIsMobileExplorerOpen(true)}
            mobileExplorerControlsId="inventory-folder-navigation"
            onImportOpen={onImportOpen}
            onCreateOpen={onCreateOpen}
            handleBulkDelete={handleBulkDelete}
            onMoveSelected={handleOpenMoveDialog}
            onBulkPriceAdjust={() => setBulkModalMode('price')}
            onBulkQuantityAdjust={() => setBulkModalMode('quantity')}
            onExportCsv={exportSelectedCsv}
          />

          <ProductListView
            companyId={companyId}
            view={view}
            products={products}
            isLoading={isLoading}
            selectedRowIds={selectedRowIds}
            toggleSelection={toggleSelection}
            toggleAll={toggleAll}
            sortField={sortField}
            sortDir={sortDir}
            onSortChange={onSortChange}
            page={page}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalCount={totalCount}
            setPage={setPage}
            folders={folders}
            onRefresh={onRefresh}
          />
        </Card>
      </div>

      {bulkModalMode && (
        <BulkAdjustModal
          mode={bulkModalMode}
          companyId={companyId}
          selectedProducts={selectedProducts}
          onClose={() => setBulkModalMode(null)}
          onComplete={() => {
            setBulkModalMode(null)
            onClearSelection()
            onRefresh()
          }}
        />
      )}

      {isMoveDialogOpen && (
        <Dialog open onClose={handleCloseMoveDialog}>
          <DialogContent className="max-w-[420px]">
            <DialogHeader>
              <DialogTitle>
                Move {selectedRowIds.size} selected product{selectedRowIds.size === 1 ? '' : 's'}
              </DialogTitle>
              <DialogDescription>
                Choose where the selected products should be moved.
              </DialogDescription>
            </DialogHeader>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--color-foreground)]">Destination folder</span>
              <select
                className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm transition-colors hover:border-[var(--color-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1"
                value={moveTargetFolderId}
                onChange={(event) => setMoveTargetFolderId(event.target.value)}
              >
                <option value="__uncategorised__">Uncategorised</option>
                {moveTargetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <DialogFooter>
              <Button variant="ghost" size="sm" type="button" onClick={handleCloseMoveDialog}>
                Cancel
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => void handleMoveSelectedProducts()}
                disabled={moveProductsMutation.isPending}
              >
                {moveProductsMutation.isPending
                  ? 'Moving...'
                  : `Move ${selectedRowIds.size} Product${selectedRowIds.size === 1 ? '' : 's'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
