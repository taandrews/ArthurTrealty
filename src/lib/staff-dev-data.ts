/**
 * Sample data for previewing the staff dashboard during `next dev` without signing in.
 * Only used when NODE_ENV is "development"; production builds always require Cognito sign-in.
 * Every name and number here is fictional.
 */

const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

const PHASE_BY_MILESTONE: Record<string, string> = {
  smart_credit_activated: 'loan_application',
  loan_application_submitted: 'land_trust',
  land_trust_submitted: 'workshop_registration',
  workshop_registered: 'workshop_attendance',
  workshop_attended: 'counseling_scheduling',
  counseling_scheduled: 'counseling_completion',
  counseling_completed: 'earnest_money',
};

interface DevLead {
  leadId: string; firstName: string; lastName: string; email?: string; phone?: string;
  source: string; status: string; phase?: string; createdAt: string;
  assignedTo: { name: string; email: string };
  lastResponseAt?: string;
  milestones: Record<string, string>;
  workshop?: { at: string; location?: string; meetingLink?: string; whatToBring?: string };
  funds: Record<string, number | string | boolean | undefined>;
  tasks: { id: string; title: string; dueAt: string; assignedTo: string; doneAt?: string }[];
  notes?: string;
  quiz?: Record<string, string>;
  activity: { at: string; kind: string; channel?: string; summary: string }[];
}

const coordinator = { name: 'Sample Coordinator', email: 'coordinator@example.com' };

const leads: DevLead[] = [
  {
    leadId: 'DEV-1', firstName: 'Dana', lastName: 'Sample', phone: '(410) 555-0101', email: 'dana@example.com',
    source: 'website', status: 'active', phase: 'smart_credit', createdAt: ago(2), assignedTo: coordinator,
    lastResponseAt: ago(1), milestones: {}, funds: {},
    tasks: [{ id: 't1', title: 'Call back about Smart Credit questions', dueAt: ago(-1), assignedTo: coordinator.name }],
    quiz: { goal: 'Buy my first home', credit: 'Not sure', timeline: '6–12 months' },
    activity: [
      { at: ago(2), kind: 'created', channel: 'web', summary: 'Lead created from the website quiz' },
      { at: ago(2), kind: 'sent', channel: 'call', summary: 'Assistant: Welcome call placed' },
      { at: ago(1), kind: 'received', channel: 'call', summary: 'Caller: What is Smart Credit and why do I need it?' },
    ],
  },
  {
    leadId: 'DEV-2', firstName: 'Marcus', lastName: 'Example', phone: '(443) 555-0102',
    source: 'facebook', status: 'active', phase: 'workshop_attendance', createdAt: ago(21), assignedTo: coordinator,
    lastResponseAt: ago(3),
    milestones: { smart_credit_activated: ago(19), loan_application_submitted: ago(15), land_trust_submitted: ago(10), workshop_registered: ago(5) },
    workshop: { at: new Date(Date.now() + 4 * day).toISOString(), location: 'Online', meetingLink: 'https://example.com/workshop' },
    funds: {}, tasks: [],
    activity: [{ at: ago(5), kind: 'milestone', summary: 'Registered for workshop' }],
  },
  {
    leadId: 'DEV-3', firstName: 'Alicia', lastName: 'Placeholder', email: 'alicia@example.com',
    source: 'referral', status: 'active', phase: 'earnest_money', createdAt: ago(60), assignedTo: coordinator,
    lastResponseAt: ago(16),
    milestones: {
      smart_credit_activated: ago(58), loan_application_submitted: ago(50), land_trust_submitted: ago(45),
      workshop_registered: ago(40), workshop_attended: ago(33), counseling_scheduled: ago(30), counseling_completed: ago(20),
    },
    funds: { hasSaved: true, totalFundsAvailable: 800, estimatedDateFundsAvailable: 'March' },
    tasks: [{ id: 't2', title: 'No response in 14 days: check in', dueAt: ago(0), assignedTo: coordinator.name }],
    activity: [{ at: ago(16), kind: 'received', channel: 'sms', summary: 'Client: I have about $800 saved so far' }],
  },
  {
    leadId: 'DEV-4', firstName: 'Terrence', lastName: 'Demo', phone: '(410) 555-0104',
    source: 'walk_in', status: 'mortgage_ready', createdAt: ago(95), assignedTo: coordinator, lastResponseAt: ago(7),
    milestones: { counseling_completed: ago(30), funds_ready: ago(7) },
    funds: { hasSaved: true, totalFundsAvailable: 1600 }, tasks: [],
    activity: [{ at: ago(7), kind: 'milestone', summary: 'Upfront funds ready: mortgage-ready' }],
  },
];

const kpis = {
  newLeads: 4, contactRate: 1, responseRate: 0.75, smartCreditCompletionRate: 0.75, loanApplicationCompletionRate: 0.5,
  landTrustCompletionRate: 0.5, workshopRegistrationRate: 0.5, workshopAttendanceRate: 0.25, counselingCompletionRate: 0.25,
  mortgageReadyRate: 0.25, earnestMoneyReadinessRate: 0.25, averageDaysToMortgageReady: 88, homePurchaseConversionRate: 0,
};

const row = (l: DevLead) => ({
  leadId: l.leadId, firstName: l.firstName, lastName: l.lastName, email: l.email, phone: l.phone,
  source: l.source, status: l.status, phase: l.phase, createdAt: l.createdAt, assignedTo: l.assignedTo.name,
  lastResponseAt: l.lastResponseAt, openTasks: l.tasks.filter((t) => !t.doneAt).length,
});

/** Answers the same paths as the real staff API, in memory. */
export async function devStaffApi(path: string, body?: unknown): Promise<unknown> {
  const url = new URL(path, 'http://dev');
  const parts = url.pathname.split('/').filter(Boolean); // staff, leads, id, ...
  if (parts[1] === 'kpis') return kpis;
  if (parts[1] !== 'leads') throw new Error(`Sample data has no route for ${path}`);

  if (parts.length === 2) {
    if (body === undefined) return { leads: leads.map(row) };
    const b = body as Partial<DevLead>;
    const lead: DevLead = {
      leadId: `DEV-${leads.length + 1}`, firstName: b.firstName ?? '', lastName: b.lastName ?? '', email: b.email, phone: b.phone,
      source: b.source ?? 'phone', status: 'active', phase: 'smart_credit', createdAt: new Date().toISOString(),
      assignedTo: coordinator, milestones: {}, funds: {}, tasks: [], notes: b.notes,
      activity: [{ at: new Date().toISOString(), kind: 'created', summary: 'Lead added by staff (sample data)' }],
    };
    leads.unshift(lead);
    return { leadId: lead.leadId };
  }

  const lead = leads.find((l) => l.leadId === parts[2]);
  if (!lead) throw new Error('Lead not found');
  const now = new Date().toISOString();

  if (parts.length === 3) {
    const { activity, ...detail } = lead;
    return { lead: detail, activity: [...activity].reverse() };
  }
  if (parts[3] === 'milestones') {
    const { type, workshop } = body as { type: string; workshop?: DevLead['workshop'] };
    lead.milestones[type] = now;
    if (workshop) lead.workshop = workshop;
    if (PHASE_BY_MILESTONE[type]) lead.phase = PHASE_BY_MILESTONE[type];
    if (type === 'funds_ready') { lead.status = 'mortgage_ready'; lead.phase = undefined; }
    if (type === 'purchased') lead.status = 'purchased';
    if (type === 'exited') lead.status = 'exited';
    lead.activity.push({ at: now, kind: 'milestone', summary: `Marked ${type.replace(/_/g, ' ')}` });
    return { ok: true };
  }
  if (parts[3] === 'funds') {
    Object.assign(lead.funds, body);
    lead.activity.push({ at: now, kind: 'note', summary: 'Funds updated' });
    return { ok: true };
  }
  if (parts[3] === 'tasks' && parts[5] === 'done') {
    const task = lead.tasks.find((t) => t.id === parts[4]);
    if (task) task.doneAt = now;
    return { ok: true };
  }
  throw new Error(`Sample data has no route for ${path}`);
}
