
// =============================================================================
// SERVER-SIDE IN-MEMORY USER STORE
// =============================================================================
// Module-level singleton — persists for the lifetime of the Vercel function
// instance (typically 15–30 min of inactivity before cold start).
// No database required. Survives navigation and page refreshes within a session.
// =============================================================================

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'invited' | 'inactive';
  lastLogin: string;
  initials: string;
  createdAt: string;
}

// Seed with the default demo users so the list is never empty
const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'u1',
    name: 'Sarah Chen',
    email: 'sarah.chen@ligaturerd.io',
    role: 'VP Regulatory Strategy',
    department: 'Regulatory',
    status: 'active',
    lastLogin: '2 hours ago',
    initials: 'SC',
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'u2',
    name: 'Marcus Johnson',
    email: 'm.johnson@ligaturerd.io',
    role: 'Clinical Operations Lead',
    department: 'Clinical',
    status: 'active',
    lastLogin: '1 day ago',
    initials: 'MJ',
    createdAt: new Date('2025-01-15').toISOString(),
  },
  {
    id: 'u3',
    name: 'Dr. Elena Vasquez',
    email: 'e.vasquez@ligaturerd.io',
    role: 'Chief Medical Officer',
    department: 'Medical Affairs',
    status: 'active',
    lastLogin: '3 hours ago',
    initials: 'EV',
    createdAt: new Date('2025-02-01').toISOString(),
  },
  {
    id: 'u4',
    name: 'James Liu',
    email: 'j.liu@ligaturerd.io',
    role: 'Safety Officer',
    department: 'Pharmacovigilance',
    status: 'active',
    lastLogin: 'Just now',
    initials: 'JL',
    createdAt: new Date('2025-02-10').toISOString(),
  },
  {
    id: 'u5',
    name: 'Lisa Park',
    email: 'l.park@ligaturerd.io',
    role: 'Quality Reviewer',
    department: 'Quality',
    status: 'invited',
    lastLogin: 'Never',
    initials: 'LP',
    createdAt: new Date('2026-01-20').toISOString(),
  },
];

// Module-level store — survives page navigations and refreshes
const userStore = new Map<string, StoredUser>(
  DEFAULT_USERS.map(u => [u.id, u])
);

export function getAllUsers(): StoredUser[] {
  return Array.from(userStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getUserByEmail(email: string): StoredUser | undefined {
  return Array.from(userStore.values()).find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function getUserById(id: string): StoredUser | undefined {
  return userStore.get(id);
}

export function addUser(user: StoredUser): StoredUser {
  userStore.set(user.id, user);
  return user;
}

export function updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
  const existing = userStore.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  userStore.set(id, updated);
  return updated;
}

export function upsertUserByEmail(email: string, data: Partial<StoredUser>): StoredUser {
  const existing = getUserByEmail(email);
  if (existing) {
    return updateUser(existing.id, data) ?? existing;
  }
  const newUser: StoredUser = {
    id: data.id ?? 'u-' + Date.now(),
    name: data.name ?? email.split('@')[0],
    email,
    role: data.role ?? 'Reviewer',
    department: data.department ?? 'Pending',
    status: data.status ?? 'invited',
    lastLogin: data.lastLogin ?? 'Never',
    initials: data.initials ?? email.slice(0, 2).toUpperCase(),
    createdAt: data.createdAt ?? new Date().toISOString(),
  };
  userStore.set(newUser.id, newUser);
  return newUser;
}

export function markUserActive(email: string, name: string): StoredUser | null {
  const user = getUserByEmail(email);
  if (!user) return null;
  return updateUser(user.id, {
    name,
    status: 'active',
    lastLogin: 'Just now',
  });
}
