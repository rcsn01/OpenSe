import { supabase } from '@repo/shared/supabase'

const db = supabase.schema('stoqr')

type CompanySummary = {
  id: string
  name: string
  description: string | null
  subscription_tier: string | null
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

type CompanyMemberCountRow = {
  company_id: string
}

type CompanyMemberQueryRow = {
  id: string
  user_id: string
  joined_at: string
  roles: { name: string | null } | Array<{ name: string | null }> | null
  profiles: { full_name: string | null; email: string | null } | Array<{ full_name: string | null; email: string | null }> | null
}

export const listCompanies = async () => {
  const { data, error } = await db
    .from('companies')
    .select('id, name, description, subscription_tier, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  const companies = (data ?? []) as Array<{
    id: string
    name: string
    description: string | null
    subscription_tier: string | null
    created_at: string
  }>

  if (companies.length === 0) return [] as CompanySummary[]

  const { data: members, error: memberError } = await db
    .from('company_members')
    .select('company_id')
    .in(
      'company_id',
      companies.map((company) => company.id),
    )

  if (memberError) throw memberError

  const memberRows = (members ?? []) as CompanyMemberCountRow[]
  const counts = memberRows.reduce<Record<string, number>>((acc, row) => {
    const companyId = row.company_id as string
    acc[companyId] = (acc[companyId] ?? 0) + 1
    return acc
  }, {})

  return companies.map((company) => ({
    ...company,
    member_count: counts[company.id] ?? 0,
  }))
}

export const updateCompany = async (
  companyId: string,
  updates: { name?: string; description?: string; subscription_tier?: string },
) => {
  const { error } = await db.from('companies').update(updates).eq('id', companyId)
  if (error) throw error
}

export const listCompanyMembers = async (companyId: string) => {
  const { data, error } = await db
    .from('company_members')
    .select('id, user_id, joined_at, roles (name), profiles (full_name, email)')
    .eq('company_id', companyId)
    .order('joined_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as CompanyMemberQueryRow[]

  return rows.map(
    (member): CompanyMember => ({
      id: member.id,
      user_id: member.user_id,
      joined_at: member.joined_at,
      role_name: Array.isArray(member.roles) ? member.roles[0]?.name ?? null : member.roles?.name ?? null,
      full_name: Array.isArray(member.profiles)
        ? member.profiles[0]?.full_name ?? null
        : member.profiles?.full_name ?? null,
      email: Array.isArray(member.profiles) ? member.profiles[0]?.email ?? null : member.profiles?.email ?? null,
    }),
  )
}

export const removeMember = async (memberId: string) => {
  const { error } = await db.from('company_members').delete().eq('id', memberId)
  if (error) throw error
}

export const inviteMember = async (companyId: string, email: string) => {
  const cleanedEmail = email.trim().toLowerCase()
  if (!cleanedEmail) throw new Error('Email is required')

  const { data: ownerRole, error: ownerRoleError } = await db
    .from('roles')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', 'Owner')
    .single()

  if (ownerRoleError) throw ownerRoleError

  const { error } = await db.from('company_invitations').insert({
    company_id: companyId,
    email: cleanedEmail,
    role_id: ownerRole.id,
  })

  if (error) throw error
}
