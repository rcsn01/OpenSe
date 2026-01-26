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

const users = [
  { email: 'ivan.earth2024@gmail.com', password: 'watermelon', name: 'Ivan Super Admin'},
  { email: 'ivany@speedx.com.au', password: 'watermelon', name: 'Ivany SpeedX'},
  { email: 'admin1@gmail.com', password: 'Orange', name: 'Admin One'},
  { email: 'user1@gmail.com', password: 'Orange', name: 'User One'},
  { email: 'admin2@gmail.com', password: 'Orange', name: 'Admin Two'},
  { email: 'user2@gmail.com', password: 'Orange', name: 'User Two'},
];

async function seed() {
  console.log('🌱 Starting Seed...');

  const userMap: Record<string, string> = {};

  // 1. Create Users
  for (const u of users) {
    console.log(`Creating user: ${u.email}...`);
    
    // Check if user exists first to avoid errors on re-run
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId = existingUsers.users.find(x => x.email === u.email)?.id;

    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true, // Auto-verify email!
        user_metadata: { full_name: u.name },
      });

      if (error) {
        console.error(`Error creating ${u.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    }
    
    userMap[u.email] = userId;
  }

  // 2. Create Organisations
  // Note: We use the 'public' schema now, assuming RLS allows insert or we are bypassing it.
  // Ideally, use the service role key to insert directly into DB via Supabase client.
  
  console.log('Buildings Organisations...');

  const orgs = [
    { name: 'Organisation 1', ownerEmail: 'admin1@gmail.com', members: ['user1@gmail.com'] },
    { name: 'Organisation 2', ownerEmail: 'admin2@gmail.com', members: ['user2@gmail.com'] },
    { name: 'SpeeDx', ownerEmail: 'ivan.earth2024@gmail.com', members: ['ivany@speedx.com.au'] },
  ];

  for (const org of orgs) {
    const ownerId = userMap[org.ownerEmail];
    if (!ownerId) continue;

    // Insert Org
    const { data: orgData, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: org.name, owner_id: ownerId })
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

    // Add other members
    for (const memberEmail of org.members) {
      const memberId = userMap[memberEmail];
      if (memberId) {
        await supabase.from('organisation_members').insert({
          org_id: orgId,
          user_id: memberId,
          role: 'member',
        });
      }
    }
  }

  console.log('✅ Seed Complete!');
}

seed().catch(console.error);