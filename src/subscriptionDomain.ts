export type Subscription = { provider: string; testMode: boolean; active: boolean; status: string; expiresAt: number; cancelAtPeriodEnd: boolean };
export function hasPremium(data: Partial<Subscription> | null, now = Date.now()) {
  return data?.provider === 'stripe' && data.testMode === true && data.active === true && data.status === 'active'
    && typeof data.expiresAt === 'number' && Number.isFinite(data.expiresAt) && data.expiresAt > now;
}
