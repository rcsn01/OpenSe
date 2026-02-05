import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ToRun npx ts-node scripts/seed.ts
// ⚠️ REPLACE WITH YOUR LOCAL SUPABASE URL AND SERVICE_ROLE KEY
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PASSWORD = 'orange';

const SUPERADMIN = { email: 'ivan.earth2024@gmail.com', password: PASSWORD, name: 'Ivan Super Admin' };

const ORG_NAMES = [
  'Northwind Labs',
  'Orion Freight',
  'Pinecone Analytics',
  'Azurely Health',
  'Nimbus Robotics',
  'Halcyon Systems',
  'Redwood Bio',
  'Sundial Finance',
  'Atlas Media',
  'Polaris AI',
];

const FIRST_NAMES = [
  'Avery', 'Blake', 'Casey', 'Dakota', 'Elliot', 'Finley', 'Gray', 'Harper', 'Indigo', 'Jordan',
  'Kai', 'Logan', 'Morgan', 'Noah', 'Oakley', 'Parker', 'Quinn', 'Riley', 'Sawyer', 'Taylor',
  'Uma', 'Violet', 'Winter', 'Xavier', 'Yara', 'Zane'
];

const LAST_NAMES = [
  'Carter', 'Reed', 'Brooks', 'Hayes', 'Morgan', 'Powell', 'Foster', 'Jensen', 'Perry', 'Bennett',
  'Murphy', 'Ellis', 'Hughes', 'Ward', 'Mason', 'Rogers', 'Cole', 'Patterson', 'Simmons', 'Fleming'
];

const DOMAINS = ['example.com', 'mailbox.dev', 'acme.test', 'mock.io', 'seed.local'];

const usedEmails = new Set<string>();
const usedOrgNames = new Set<string>();

const randomItem = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const randomName = () => `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;

const randomEmail = () => {
  let email = '';
  while (!email || usedEmails.has(email)) {
    const first = randomItem(FIRST_NAMES).toLowerCase();
    const last = randomItem(LAST_NAMES).toLowerCase();
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    email = `${first}.${last}.${suffix}@${randomItem(DOMAINS)}`;
  }
  usedEmails.add(email);
  return email;
};

const uniqueOrgName = () => {
  let name = '';
  let attempts = 0;
  while (!name || usedOrgNames.has(name)) {
    const base = randomItem(ORG_NAMES);
    attempts += 1;
    name = attempts > ORG_NAMES.length ? `${base} ${Math.floor(Math.random() * 900 + 100)}` : base;
  }
  usedOrgNames.add(name);
  return name;
};

const getSeatLimitForTier = (tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  if (tier === 'tier-1') return 5;
  if (tier === 'tier-2') return 15;
  return 50;
};

const getTargetMemberCount = (tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  const seats = getSeatLimitForTier(tier);
  return Math.floor(seats * 0.8);
};

async function seed() {
  console.log('🌱 Starting Seed...');

  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'your-service-role-key-here') {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing. Set it in your environment before seeding.');
    return;
  }

  const userMap: Record<string, string> = {};

  // 1. Create Super Admin
  console.log(`Creating user: ${SUPERADMIN.email}...`);
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  let superAdminId = existingUsers.users.find((x: { email?: string; id: string }) => x.email === SUPERADMIN.email)?.id;

  if (!superAdminId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SUPERADMIN.email,
      password: SUPERADMIN.password,
      email_confirm: true,
      user_metadata: { full_name: SUPERADMIN.name },
    });

    if (error) {
      console.error(`Error creating ${SUPERADMIN.email}:`, error.message);
      return;
    }
    superAdminId = data.user.id;
  }

  userMap[SUPERADMIN.email] = superAdminId;

  // Ensure Ivan is a super admin
  const { error: superAdminError } = await supabase
    .from('super_admin_members')
    .upsert({ user_id: superAdminId }, { onConflict: 'user_id' });

  if (superAdminError) {
    console.error('Error setting super admin:', superAdminError.message);
  }

  // 2. Create Organisations
  // Note: We use the 'public' schema now, assuming RLS allows insert or we are bypassing it.
  // Ideally, use the service role key to insert directly into DB via Supabase client.
  
  console.log('Building Organisations...');

  const orgs = [
    { name: uniqueOrgName(), tier: 'tier-1' as const },
    { name: uniqueOrgName(), tier: 'tier-1' as const },
    { name: uniqueOrgName(), tier: 'tier-2' as const },
    { name: uniqueOrgName(), tier: 'tier-2' as const },
    { name: uniqueOrgName(), tier: 'tier-3' as const },
  ];

  for (let index = 0; index < orgs.length; index += 1) {
    const org = orgs[index];
    const memberCount = getTargetMemberCount(org.tier);

    // Create owner for this org (use superadmin for the first org to keep access)
    const ownerProfile = index === 0
      ? SUPERADMIN
      : { email: randomEmail(), password: PASSWORD, name: randomName() };

    if (!userMap[ownerProfile.email]) {
      console.log(`Creating user: ${ownerProfile.email}...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: ownerProfile.email,
        password: ownerProfile.password,
        email_confirm: true,
        user_metadata: { full_name: ownerProfile.name },
      });

      if (error) {
        console.error(`Error creating ${ownerProfile.email}:`, error.message);
        continue;
      }
      userMap[ownerProfile.email] = data.user.id;
    }

    const ownerId = userMap[ownerProfile.email];
    if (!ownerId) continue;

    // Insert Org
    const { data: orgData, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: org.name, owner_id: ownerId, tier: org.tier })
      .select()
      .single();

    if (orgError) {
      console.error(`Error creating org ${org.name}:`, orgError.message);
      continue;
    }

    const orgId = orgData.id;

    // Add Owner as Admin member
    await supabase.from('organisation_members').insert({
      org_id: orgId,
      user_id: ownerId,
      role: 'admin',
    });

    // Add other members to reach ~80% seat usage
    const roles: Array<'admin' | 'editor' | 'member'> = ['admin', 'editor', 'member'];
    const additionalMembersNeeded = Math.max(memberCount - 1, 0);

    for (let i = 0; i < additionalMembersNeeded; i += 1) {
      const memberProfile = { email: randomEmail(), password: PASSWORD, name: randomName() };

      console.log(`Creating user: ${memberProfile.email}...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: memberProfile.email,
        password: memberProfile.password,
        email_confirm: true,
        user_metadata: { full_name: memberProfile.name },
      });

      if (error) {
        console.error(`Error creating ${memberProfile.email}:`, error.message);
        continue;
      }

      userMap[memberProfile.email] = data.user.id;

      await supabase.from('organisation_members').insert({
        org_id: orgId,
        user_id: data.user.id,
        role: roles[i % roles.length],
      });
    }
  }

  console.log('✅ Seed Complete!');
}

seed().catch(console.error);