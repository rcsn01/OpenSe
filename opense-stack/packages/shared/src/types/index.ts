/**
 * Shared type definitions used across both ETL and StoQR apps.
 */

// Common profile type used by both apps
export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  username?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at?: string | null
}

// Organisation/Company member role (superset of both apps)
export type MemberRole = 'admin' | 'editor' | 'member'

// Common pagination params
export interface PaginationParams {
  page: number
  perPage: number
}

// Common API response shape
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
