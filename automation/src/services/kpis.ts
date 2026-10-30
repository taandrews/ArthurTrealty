import type { Lead, MilestoneType } from '../types';
import { daysBetween } from '../lib/time';

export interface Kpis {
  since?: string;
  newLeads: number;
  bySource: Record<string, number>;
  contactRate: number;
  responseRate: number;
  smartCreditCompletionRate: number;
  loanApplicationCompletionRate: number;
  landTrustCompletionRate: number;
  workshopRegistrationRate: number;
  workshopAttendanceRate: number;
  counselingCompletionRate: number;
  mortgageReadyRate: number;
  earnestMoneyReadinessRate: number;
  averageDaysToMortgageReady: number | null;
  homePurchaseConversionRate: number;
}

/**
 * Funnel metrics over leads created on or after `since`. Rates are fractions of all new leads (0–1).
 * Contact = at least one call, text, or email went out. Response = the client replied or completed any step.
 */
export function computeKpis(allLeads: Lead[], since?: string): Kpis {
  const leads = since ? allLeads.filter((l) => l.createdAt >= since) : allLeads;
  const n = leads.length;
  const rate = (count: number) => (n ? Math.round((count / n) * 1000) / 1000 : 0);
  const reached = (m: MilestoneType) => leads.filter((l) => l.milestones?.[m]).length;

  const bySource: Record<string, number> = {};
  for (const l of leads) bySource[l.source] = (bySource[l.source] ?? 0) + 1;

  const ready = leads.filter((l) => l.mortgageReadyAt);
  const avgDays = ready.length
    ? Math.round((ready.reduce((sum, l) => sum + daysBetween(l.createdAt, new Date(l.mortgageReadyAt!)), 0) / ready.length) * 10) / 10
    : null;

  return {
    since,
    newLeads: n,
    bySource,
    contactRate: rate(leads.filter((l) => l.contactedAt).length),
    responseRate: rate(leads.filter((l) => l.firstResponseAt).length),
    smartCreditCompletionRate: rate(reached('smart_credit_activated')),
    loanApplicationCompletionRate: rate(reached('loan_application_submitted')),
    landTrustCompletionRate: rate(reached('land_trust_submitted')),
    workshopRegistrationRate: rate(reached('workshop_registered')),
    workshopAttendanceRate: rate(reached('workshop_attended')),
    counselingCompletionRate: rate(reached('counseling_completed')),
    mortgageReadyRate: rate(ready.length),
    earnestMoneyReadinessRate: rate(reached('funds_ready')),
    averageDaysToMortgageReady: avgDays,
    homePurchaseConversionRate: rate(reached('purchased')),
  };
}
