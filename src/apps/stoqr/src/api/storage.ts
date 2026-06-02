import { supabase } from '../supabaseClient'

export const getProductImagePublicUrl = (pathOrUrl: string) => {
  if (!pathOrUrl) return ''

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(pathOrUrl)
  return data.publicUrl
}
