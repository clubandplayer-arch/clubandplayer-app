type AccountType = 'athlete' | 'club' | 'fan';

function normalizeAccountType(value: unknown): AccountType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'athlete' || normalized === 'club' || normalized === 'fan') return normalized;
  return null;
}

function roleToAccountType(role: unknown): AccountType | null {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'player') return 'athlete';
  if (normalized === 'athlete' || normalized === 'club' || normalized === 'fan') return normalized;
  return null;
}

export function inferAccountType(...inputs: unknown[]): AccountType | null {
  for (const value of inputs) {
    const accountType = normalizeAccountType(value) ?? roleToAccountType(value);
    if (accountType) return accountType;
  }
  return null;
}

export async function ensureSingleProfileRowForUser(
  supabase: any,
  userId: string,
  opts?: {
    accountTypeHint?: unknown;
    displayNameHint?: unknown;
    authRoleHint?: unknown;
  },
) {
  const accountType = inferAccountType(opts?.accountTypeHint, opts?.authRoleHint);
  const displayName =
    typeof opts?.displayNameHint === 'string' && opts.displayNameHint.trim()
      ? opts.displayNameHint.trim()
      : null;

  const { data: byUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: dirtyById } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .is('user_id', null)
    .maybeSingle();

  if (byUser) {
    const needsTypePatch = !(byUser.account_type || byUser.type) && accountType;
    if (needsTypePatch) {
      await supabase
        .from('profiles')
        .update({
          account_type: accountType,
          type: accountType,
          role: accountType === 'club' ? 'Club' : byUser.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', byUser.id);
    }
    if (dirtyById && dirtyById.id !== byUser.id) {
      await supabase.from('profiles').delete().eq('id', dirtyById.id).is('user_id', null);
    }
    return;
  }

  if (dirtyById) {
    await supabase
      .from('profiles')
      .update({
        user_id: userId,
        account_type: accountType ?? dirtyById.account_type ?? inferAccountType(dirtyById.role),
        type: accountType ?? dirtyById.type ?? inferAccountType(dirtyById.role),
        role:
          (accountType ?? inferAccountType(dirtyById.role)) === 'club'
            ? 'Club'
            : dirtyById.role,
        display_name: dirtyById.display_name ?? displayName,
        full_name: dirtyById.full_name ?? displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dirtyById.id)
      .is('user_id', null);
  }
}
