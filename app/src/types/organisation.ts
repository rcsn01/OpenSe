export type OrgSimple = {
    id: string
    name: string
    owner_id?: string
    created_at?: string
    tier?: 'tier-1' | 'tier-2' | 'tier-3'
    seat_limit?: number
    subscription_status?: 'active' | 'past_due' | 'canceled'
}

export type OrgInvite = {
    id: string
    org_name: string
    org_id: string
    inviter_name: string
    role: 'admin' | 'editor' | 'member'
    created_at: string
}
