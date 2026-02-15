import { supabase } from '@repo/shared/supabase'

type CompanySummary = {
  id: string
  name: string
  created_at: string
  member_count: number
}

type CompanyMember = {
  id: string
  user_id: string
  joined_at: string
  role_name: string | null
  full_name: string | null
  email: string | null
}

type CompanySummaryRpcRow = {
  id: string
  name: string
  created_at: string
  member_count: number
}

type CompanyMemberRpcRow = {
  id: string
  user_id: string
  joined_at: string
  role_name: string | null
  full_name: string | null
  email: string | null
}

export const listCompanies = async (): Promise<CompanySummary[]> => {
  const { data, error } = await supabase.rpc('admin_list_stoqr_organisations')

  if (error) throw error

  return (data ?? []) as CompanySummaryRpcRow[]
}

export const updateCompany = async (
  _companyId: string,
  _updates: { name?: string; description?: string; subscription_tier?: string },
) => {}

export const listCompanyMembers = async (companyId: string) => {
  const { data, error } = await supabase.rpc('admin_list_stoqr_company_members', {
    p_company_id: companyId,
  })

  if (error) throw error

  const rows = (data ?? []) as CompanyMemberRpcRow[]

  return rows.map(
    (member): CompanyMember => ({
      id: member.id,
      user_id: member.user_id,
      joined_at: member.joined_at,
      role_name: member.role_name,
      full_name: member.full_name,
      email: member.email,
    }),
  )
}

export const removeMember = async (memberId: string) => {
  throw new Error(`Member removal is not available in Admin. Use Accounts to manage seats and membership. (${memberId})`)
}

export const inviteMember = async (companyId: string, email: string) => {
  throw new Error(`Invites are not available in Admin. Use Accounts to manage seats and membership. (${companyId}:${email})`)
}
