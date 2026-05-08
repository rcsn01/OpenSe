import { useParams } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { ProductFormPage } from './ProductFormPage'

export const EditProductPage = () => {
  const { id } = useParams<{ id?: string }>()

  if (!id) {
    return <EmptyState title="Product not found" description="Missing product id in route." />
  }

  return <ProductFormPage mode="edit" productId={id} />
}
