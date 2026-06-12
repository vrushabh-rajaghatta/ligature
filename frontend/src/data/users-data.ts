// Users & Team Data
// Centralized user data used across all modules

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  initials: string;
  status: 'active' | 'inactive' | 'away';
  lastLogin?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberIds: string[];
}

// ============================================================================
// USERS
// ============================================================================

export const users: User[] = [
  { id: 'u-1', name: 'Sarah Chen', email: 'schen@ligature.com', role: 'VP Regulatory Operations', department: 'Regulatory Affairs', initials: 'SC', status: 'active', lastLogin: '2024-12-14T08:30:00Z' },
  { id: 'u-2', name: 'Michael Roberts', email: 'mroberts@ligature.com', role: 'CMC Lead', department: 'CMC', initials: 'MR', status: 'active', lastLogin: '2024-12-14T09:15:00Z' },
  { id: 'u-3', name: 'Jennifer Walsh', email: 'jwalsh@ligature.com', role: 'Senior Medical Writer', department: 'Medical Writing', initials: 'JW', status: 'active', lastLogin: '2024-12-14T07:45:00Z' },
  { id: 'u-4', name: 'David Kim', email: 'dkim@ligature.com', role: 'Clinical Lead', department: 'Clinical Operations', initials: 'DK', status: 'active', lastLogin: '2024-12-13T16:20:00Z' },
  { id: 'u-5', name: 'Emily Thompson', email: 'ethompson@ligature.com', role: 'Publishing Specialist', department: 'Regulatory Publishing', initials: 'ET', status: 'active', lastLogin: '2024-12-14T08:00:00Z' },
  { id: 'u-6', name: 'James Martinez', email: 'jmartinez@ligature.com', role: 'QA Manager', department: 'Quality Assurance', initials: 'JM', status: 'active', lastLogin: '2024-12-14T09:00:00Z' },
  { id: 'u-7', name: 'Lisa Park', email: 'lpark@ligature.com', role: 'Safety Scientist', department: 'Pharmacovigilance', initials: 'LP', status: 'active', lastLogin: '2024-12-14T08:45:00Z' },
  { id: 'u-8', name: 'Robert Johnson', email: 'rjohnson@ligature.com', role: 'SVP Regulatory', department: 'Regulatory Affairs', initials: 'RJ', status: 'active', lastLogin: '2024-12-13T14:30:00Z' },
  { id: 'u-9', name: 'Amanda Foster', email: 'afoster@ligature.com', role: 'Regulatory Project Manager', department: 'Project Management', initials: 'AF', status: 'active', lastLogin: '2024-12-14T07:30:00Z' },
  { id: 'u-10', name: 'Tom Anderson', email: 'tanderson@ligature.com', role: 'Nonclinical Lead', department: 'Nonclinical', initials: 'TA', status: 'away', lastLogin: '2024-12-12T17:00:00Z' },
  { id: 'u-11', name: 'Rachel Green', email: 'rgreen@ligature.com', role: 'Labeling Specialist', department: 'Regulatory Affairs', initials: 'RG', status: 'active', lastLogin: '2024-12-14T08:15:00Z' },
  { id: 'u-12', name: 'Chris Wilson', email: 'cwilson@ligature.com', role: 'System Administrator', department: 'IT', initials: 'CW', status: 'active', lastLogin: '2024-12-14T06:00:00Z' },
];

// ============================================================================
// TEAMS
// ============================================================================

export const teams: Team[] = [
  { id: 'team-1', name: 'Regulatory Affairs', description: 'Global regulatory strategy and submissions', leaderId: 'u-1', memberIds: ['u-1', 'u-8', 'u-9', 'u-11'] },
  { id: 'team-2', name: 'Medical Writing', description: 'Clinical and regulatory document authoring', leaderId: 'u-3', memberIds: ['u-3'] },
  { id: 'team-3', name: 'CMC', description: 'Chemistry, Manufacturing, and Controls', leaderId: 'u-2', memberIds: ['u-2'] },
  { id: 'team-4', name: 'Clinical Operations', description: 'Clinical trial management and data', leaderId: 'u-4', memberIds: ['u-4'] },
  { id: 'team-5', name: 'Pharmacovigilance', description: 'Safety surveillance and signal detection', leaderId: 'u-7', memberIds: ['u-7'] },
  { id: 'team-6', name: 'Quality Assurance', description: 'GxP compliance and quality management', leaderId: 'u-6', memberIds: ['u-6'] },
  { id: 'team-7', name: 'Regulatory Publishing', description: 'eCTD compilation and submission', leaderId: 'u-5', memberIds: ['u-5'] },
  { id: 'team-8', name: 'Nonclinical', description: 'Preclinical and toxicology', leaderId: 'u-10', memberIds: ['u-10'] },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getUserById = (id: string): User | undefined => 
  users.find(u => u.id === id);

export const getUserByEmail = (email: string): User | undefined => 
  users.find(u => u.email === email);

export const getTeamById = (id: string): Team | undefined => 
  teams.find(t => t.id === id);

export const getTeamMembers = (teamId: string): User[] => {
  const team = getTeamById(teamId);
  if (!team) return [];
  return team.memberIds.map(id => getUserById(id)).filter((u): u is User => u !== undefined);
};

export const getUsersByDepartment = (department: string): User[] => 
  users.filter(u => u.department === department);

export const getUserStatusColor = (status: User['status']): string => {
  const colors: Record<User['status'], string> = {
    active: 'bg-green-500',
    inactive: 'bg-slate-500',
    away: 'bg-amber-500',
  };
  return colors[status];
};

// Current logged-in user (for demo purposes)
export const currentUser = users[0]; // Sarah Chen
