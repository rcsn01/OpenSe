// Uses @repo/ui Pagination under the hood, maintaining StoQR's prop API
import { Pagination as UIPagination } from '@repo/ui'

type PaginationProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export const Pagination = ({ page, pageSize, totalItems, onPageChange, onPageSizeChange, pageSizeOptions }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / pageSize)

  if (totalItems === 0) return null

  return (
    <UIPagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      totalItems={totalItems}
      itemsPerPage={pageSize}
      onItemsPerPageChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
    />
  )
}
