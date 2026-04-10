import { useState } from 'react';
import {
  Bug, FileText, Globe, Server, RefreshCw, CheckSquare,
  AlertTriangle, Hash, Crosshair, Calendar, KeyRound,
  GitBranch, Network, ShieldCheck, BookOpen, Layers,
  ChevronDown, ChevronUp, Lock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { normalizeSeverity, findingTypeConfig, FindingOverviewTypeIcon } from '@/utils/severityHelpers';
import { YellowAccentBlock, OrangeAccentBlock, SectionHeading } from '@/components/project/accent-blocks';
import { cn } from '@/lib/utils';
import type { Project, Finding, FindingPoc, Assignee, FindingType } from '@/utils/projectTypes';

type Props = {
  project: Project;
  findings: Finding[];
  assignees: Assignee[];
  pocs: Record<string, FindingPoc[]>;
  allUsers: Record<string, string>;
  getUsername: (uid: string | null | undefined) => string;
  formatDate: (d: string | null) => string;
  getStatusBadge: (status: string | null) => React.ReactNode;
};

const EmptyNote = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground italic">{text}</p>
);

const Divider = () => <div className="border-t border-border/40" />;

/** Same order & labels as Findings tab triggers */
const FINDING_OVERVIEW_TYPES: { key: FindingType | 'sca'; label: string }[] = [
  { key: 'pentest', label: findingTypeConfig.pentest.label },
  { key: 'sast',    label: findingTypeConfig.sast.label },
  { key: 'sca',     label: 'SCA' },
  { key: 'asm',     label: findingTypeConfig.asm.label },
  { key: 'llm',     label: findingTypeConfig.llm.label },
  { key: 'secret',  label: findingTypeConfig.secret.label },
];

function typeRowIcon(key: FindingType | 'sca') {
  return <FindingOverviewTypeIcon type={key} className="h-3.5 w-3.5 text-primary-foreground" />;
}

const accentBodyClass = 'text-sm leading-relaxed whitespace-pre-wrap text-orange-100/90';

export default function OverviewTab({
  project, findings, assignees, pocs, allUsers,
  getUsername, formatDate, getStatusBadge,
}: Props) {
  const [showCreds, setShowCreds] = useState(false);

  const countByType = (type: string) =>
    findings.filter(f => (f.finding_type || 'pentest') === type).length;

  const totalFindings = findings.length;

  const typeOverviewCount = (key: FindingType | 'sca') =>
    key === 'sca'
      ? findings.filter(f => (f.finding_type || 'pentest') === 'sast').length
      : countByType(key as FindingType);

  const hasTimeline = !!(project.start_date && project.end_date);
  let pct = 0, daysLeft = 0, isOver = false;
  if (hasTimeline) {
    const start   = new Date(project.start_date!).getTime();
    const end     = new Date(project.end_date!).getTime();
    const now     = Date.now();
    const total   = end - start;
    const elapsed = Math.min(Math.max(now - start, 0), total);
    pct      = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));
    isOver   = now > end;
  }

  const fixed    = findings.filter(f => f.retest_status === 'Fixed').length;
  const notFixed = findings.filter(f => f.retest_status === 'Not Fixed').length;
  const open     = findings.filter(f => !f.retest_status || f.retest_status === 'Open').length;
  const fixedPct = Math.round((fixed / (findings.length || 1)) * 100);
  const critHighOpen = findings.filter(f =>
    (normalizeSeverity(f.severity) === 'Critical' || normalizeSeverity(f.severity) === 'High') &&
    f.retest_status !== 'Fixed'
  ).length;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {hasTimeline && (
          <Card className="border-orange-500/15 bg-card/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />Timeline Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[11px] text-muted-foreground leading-snug sm:text-xs break-words">
                  {new Date(project.start_date!).toLocaleDateString()} → {new Date(project.end_date!).toLocaleDateString()}
                </span>
                <span className={cn('text-xs font-semibold shrink-0', isOver ? 'text-orange-400' : 'text-primary')}>
                  {isOver ? 'Overdue' : `${daysLeft}d left`}
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-orange-500/15">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    isOver ? 'bg-gradient-to-r from-orange-600 to-orange-400' : 'bg-gradient-to-r from-orange-500 to-yellow-400',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-end">
                <span className="text-xs font-bold text-primary">{pct}% complete</span>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                {[
                  { label: 'Status',  value: project.status ?? '—' },
                  { label: 'Code',    value: project.project_code ?? '—' },
                  { label: 'Client',  value: project.client ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-orange-500/15 bg-orange-500/[0.06] px-2 py-1.5 text-center">
                    <p className="text-[10px] text-orange-100/60 uppercase tracking-wider">{label}</p>
                    <p className="text-xs font-semibold truncate text-orange-100/95">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={cn('border-orange-500/15 bg-card/80', !hasTimeline && 'md:col-span-2')}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />Findings Overview
              {/* <span className="ml-auto text-xs font-mono bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-md">
                {totalFindings} total
              </span> */}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-1.5">
              {FINDING_OVERVIEW_TYPES.map(({ key, label }) => {
                const count = typeOverviewCount(key);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 rounded-md border border-orange-500/15 bg-orange-500/[0.06] px-2 py-1.5"
                  >
                    <div className="h-7 w-7 rounded-md gradient-primary flex items-center justify-center shrink-0 shadow-sm">
                      {typeRowIcon(key)}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <span className="block text-[10px] font-medium text-orange-100/75 leading-tight truncate">{label}</span>
                      <span className="text-xs font-bold tabular-nums text-orange-100/95">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-orange-500/15 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
            {[
              { label: 'Client',       value: project.client || '—' },
              { label: 'Project Name', value: project.name },
              { label: 'Status',       render: () => getStatusBadge(project.status) },
              { label: 'Start Date',   value: formatDate(project.start_date) },
              { label: 'End Date',     value: formatDate(project.end_date) },
              {
                label: 'Project Code',
                render: () => project.project_code
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
                      <Hash className="h-3 w-3" />{project.project_code}
                    </span>
                  : <span className="font-mono text-xs text-muted-foreground italic">Not assigned</span>,
              },
            ].map(({ label, value, render }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                {render ? render() : <p className="font-semibold text-sm">{value}</p>}
              </div>
            ))}
          </div>

          <Divider />

          <div>
            <SectionHeading icon={Server}>{`IP Addresses / Ranges (${project.ip_addresses?.length || 0})`}</SectionHeading>
            {project.ip_addresses?.length ? (
              <YellowAccentBlock contentClassName="flex flex-wrap gap-2">
                {project.ip_addresses.map((ip, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-md border border-orange-500/20 bg-orange-500/10 font-mono text-xs text-orange-100/90"
                  >
                    {ip}
                  </span>
                ))}
              </YellowAccentBlock>
            ) : <EmptyNote text="No IPs specified" />}
          </div>

          <Divider />

          <div>
            <SectionHeading icon={Globe}>Primary Domain</SectionHeading>
            {project.domain ? (
              <OrangeAccentBlock>
                <div className="flex items-center gap-2">
                  {/* <Globe className="h-4 w-4 text-primary shrink-0" /> */}
                  <span className="font-mono text-sm text-orange-100/90">{project.domain}</span>
                </div>
              </OrangeAccentBlock>
            ) : <EmptyNote text="No domain specified" />}
          </div>

          <Divider />

          <div>
            <SectionHeading icon={BookOpen}>Project Description</SectionHeading>
            {project.description ? (
              <YellowAccentBlock>
                <p className={accentBodyClass}>{project.description}</p>
              </YellowAccentBlock>
            ) : <EmptyNote text="No description provided" />}
          </div>

        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <Card className="border-orange-500/15 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />Business Logic Flows
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.business_logic ? (
              <OrangeAccentBlock>
                <p className={accentBodyClass}>{project.business_logic}</p>
              </OrangeAccentBlock>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <GitBranch className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground italic">No business logic flows defined</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Document how the app works for testers</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-500/15 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />Entry Points & Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.entry_points ? (
              <YellowAccentBlock>
                <p className={accentBodyClass}>{project.entry_points}</p>
              </YellowAccentBlock>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <Network className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground italic">No entry points documented</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Login pages, APIs, upload endpoints, etc.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-orange-500/15 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />Authentication & Access Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.auth_controls ? (
            <OrangeAccentBlock>
              <p className={accentBodyClass}>{project.auth_controls}</p>
            </OrangeAccentBlock>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Lock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground italic">No auth controls documented</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">SSO, OAuth, JWT, role-based access, MFA, etc.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <Card className="border-orange-500/15 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-primary" />Engagement Scope
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.scope ? (
              <YellowAccentBlock>
                <p className={accentBodyClass}>{project.scope}</p>
              </YellowAccentBlock>
            ) : <EmptyNote text="No scope defined" />}
          </CardContent>
        </Card>

        <Card className="border-orange-500/15 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 min-w-0">
                <KeyRound className="h-4 w-4 shrink-0 text-primary" />Testing Credentials
              </span>
              <button
                onClick={() => setShowCreds(v => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors sm:ml-auto"
              >
                <Lock className="h-3 w-3" />
                {showCreds ? (
                  <><ChevronUp className="h-3 w-3" />Hide</>
                ) : (
                  <><ChevronDown className="h-3 w-3" />Reveal</>
                )}
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.test_credentials ? (
              <OrangeAccentBlock>
                {showCreds ? (
                  <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-orange-100/90">{project.test_credentials}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary/70" />
                    <p className="text-sm text-orange-100/50 font-mono tracking-widest select-none">{'•'.repeat(32)}</p>
                  </div>
                )}
              </OrangeAccentBlock>
            ) : <EmptyNote text="No test credentials provided" />}
          </CardContent>
        </Card>
      </div>

      {project.tech_stack && (
        <Card className="border-orange-500/15 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />Tech Stack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.tech_stack.split(',').map((t: string) => (
                <span key={t} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-medium">
                  {t.trim()}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-orange-500/15 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />Remediation Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <div className="p-3 rounded-lg bg-yellow-500/15 border border-yellow-400/35">
                  <p className="text-2xl font-bold text-yellow-300">{fixed}</p>
                  <p className="text-xs text-orange-100/70 mt-0.5">Fixed</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/15 border border-orange-500/40">
                  <p className="text-2xl font-bold text-orange-400">{notFixed}</p>
                  <p className="text-xs text-orange-100/70 mt-0.5">Not Fixed</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/30">
                  <p className="text-2xl font-bold text-orange-100/90">{open}</p>
                  <p className="text-xs text-orange-100/70 mt-0.5">Pending</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-orange-100/80">Fix Rate</span>
                  <span className="text-xs font-bold text-yellow-300">{fixedPct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden bg-secondary/40 border border-yellow-500/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-700"
                    style={{ width: `${fixedPct}%` }}
                  />
                </div>
              </div>
              {critHighOpen > 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/15 border border-orange-500/35">
                  <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-200/95">
                    <span className="font-semibold text-orange-300">{critHighOpen} Critical/High</span> finding{critHighOpen !== 1 ? 's' : ''} still unresolved
                  </p>
                </div>
              ) : findings.length > 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/15 border border-yellow-400/35">
                  <CheckSquare className="h-4 w-4 text-yellow-300" />
                  <p className="text-xs text-orange-100/90 font-medium">All Critical/High findings resolved ✓</p>
                </div>
              ) : null}
        </CardContent>
      </Card>

    </div>
  );
}