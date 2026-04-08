import { useState } from 'react';
import { Bug, FileText, Globe, Server, RefreshCw, Users, CheckSquare, AlertTriangle, Crown, Image as ImageIcon, Hash, Crosshair, Calendar, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { normalizeSeverity, getSeverityBadge, getSeverityIcon, SEV, findingTypeConfig } from '@/utils/severityHelpers';
import type { Project, Finding, FindingPoc, Assignee, FindingType, Severity } from '@/utils/projectTypes';

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

const avatarGradientMap: Record<string, string> = {
  admin: 'from-yellow-500 to-orange-500',
  manager: 'from-blue-500 to-blue-700',
  tester: 'from-orange-400 to-yellow-400',
};

export default function OverviewTab({
  project, findings, assignees, pocs, allUsers,
  getUsername, formatDate, getStatusBadge,
}: Props) {
  const [showAllSnapshot, setShowAllSnapshot] = useState(false);
  const [showAllRecentFindings, setShowAllRecentFindings] = useState(false);

  const getFindingsByType = (type: FindingType) =>
    findings.filter(f => (f.finding_type || 'pentest') === type);

  const sortedFindings = [...findings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const RECENT_PREVIEW = 5;
  const hasMoreFindings = sortedFindings.length > RECENT_PREVIEW;

  return (
    <div className="space-y-6">

      {/* ── Timeline Progress (full width) ── */}
      {project.start_date && project.end_date && (() => {
        const start    = new Date(project.start_date).getTime();
        const end      = new Date(project.end_date).getTime();
        const now      = Date.now();
        const total    = end - start;
        const elapsed  = Math.min(Math.max(now - start, 0), total);
        const pct      = total > 0 ? Math.round((elapsed / total) * 100) : 0;
        const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
        const isOver   = now > end;
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />Timeline Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className={`text-xs font-medium ${isOver ? 'text-destructive' : 'text-primary'}`}>
                  {isOver ? 'Overdue' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-destructive' : 'bg-gradient-to-r from-orange-500 to-yellow-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">{new Date(project.start_date).toLocaleDateString()}</span>
                <span className="text-xs font-semibold text-primary">{pct}%</span>
                <span className="text-xs text-muted-foreground">{new Date(project.end_date).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Project Details (full width) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />Project Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Meta grid: 7 fields (3 cols, last row has IP spanning full) ── */}
          <div className="grid grid-cols-3 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client</p>
              <p className="font-semibold">{project.client || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Name</p>
              <p className="font-semibold">{project.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Code</p>
              {project.project_code ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
                  <Hash className="h-3 w-3" />{project.project_code}
                </span>
              ) : (
                <p className="font-mono text-xs text-muted-foreground italic">Not assigned</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
              <p className="font-medium text-sm">{formatDate(project.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">End Date</p>
              <p className="font-medium text-sm">{formatDate(project.end_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              {getStatusBadge(project.status)}
            </div>
            {/* IP Addresses — spans full row */}
            <div className="col-span-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-primary" />IP Addresses / Ranges ({project.ip_addresses?.length || 0})
              </p>
              {project.ip_addresses?.length ? (
                <div className="relative rounded-lg border border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 via-orange-400/5 to-yellow-300/10 p-4 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-yellow-400 to-orange-400" />
                  <div className="pl-3 flex flex-wrap gap-2">
                    {project.ip_addresses.map((ip, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/30 font-mono text-xs text-yellow-100/90">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No IPs specified</p>
              )}
            </div>
          </div>

          <div className="border-t border-border/40" />

          {/* ── Description ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />Description
            </p>
            {project.description ? (
              <div className="relative rounded-lg border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-400/10 p-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-yellow-400 to-orange-500" />
                <div className="pl-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-orange-100/90">{project.description}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* ── Engagement Scope ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-primary" />Engagement Scope
            </p>
            {project.scope ? (
              <div className="relative rounded-lg border border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-yellow-400/10 p-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-yellow-400 to-orange-500" />
                <div className="pl-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-orange-100/90">{project.scope}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No scope defined</p>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* ── Testing Credentials ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />Testing Credentials
            </p>
            {project.test_credentials ? (
              <div className="relative rounded-lg border border-orange-500/40 bg-gradient-to-br from-orange-500/10 via-yellow-500/5 to-orange-400/10 p-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-orange-500 to-yellow-400" />
                <div className="pl-3">
                  <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-orange-100/90">{project.test_credentials}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No test credentials provided</p>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* ── Primary Domain ── */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />Primary Domain
            </p>
            {project.domain ? (
              <div className="relative rounded-lg border border-orange-400/40 bg-gradient-to-br from-orange-400/10 via-yellow-400/5 to-orange-300/10 p-4 overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-lg bg-gradient-to-b from-orange-400 to-yellow-300" />
                <div className="pl-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-orange-300 shrink-0" />
                  <span className="font-mono text-sm text-orange-100/90">{project.domain}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No domain specified</p>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* ── Assessment Coverage ── */}
          {/* <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Assessment Coverage</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Web App', icon: '🌐', type: 'pentest' as FindingType },
                { label: 'API',     icon: '🔌', type: 'pentest' as FindingType },
                { label: 'SAST',    icon: '🛡️', type: 'sast'    as FindingType },
                { label: 'SCA',     icon: '📦', type: 'sast'    as FindingType },
                { label: 'ASM',     icon: '⚡', type: 'asm'     as FindingType },
                { label: 'LLM/AI',  icon: '🧠', type: 'llm'     as FindingType },
              ].map(({ label, icon, type }) => {
                const count  = label === 'SCA' ? 0 : getFindingsByType(type).length;
                const config = findingTypeConfig[type];
                const cls    = label === 'SCA'
                  ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                  : `${config.bgColor} ${config.color} ${config.borderColor}`;
                return (
                  <span key={label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
                    {icon} {label}
                    {count > 0 && (
                      <span className={`ml-1 px-1 py-0 rounded-full text-xs ${label === 'SCA' ? 'bg-teal-500/10 text-teal-400' : `${config.bgColor} ${config.color}`}`}>
                        {count}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div> */}

        </CardContent>
      </Card>

      {/* ── Remediation Tracker (full width) ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />Remediation Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const fixed    = findings.filter(f => f.retest_status === 'Fixed').length;
            const notFixed = findings.filter(f => f.retest_status === 'Not Fixed').length;
            const open     = findings.filter(f => !f.retest_status || f.retest_status === 'Open').length;
            const total    = findings.length || 1;
            const fixedPct = Math.round((fixed / total) * 100);
            const critHighOpen = findings.filter(f =>
              (normalizeSeverity(f.severity) === 'Critical' || normalizeSeverity(f.severity) === 'High') &&
              f.retest_status !== 'Fixed'
            ).length;
            return (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-2xl font-bold text-green-500">{fixed}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Fixed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-2xl font-bold text-red-500">{notFixed}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Not Fixed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                    <p className="text-2xl font-bold text-muted-foreground">{open}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Fix Rate</span>
                    <span className="text-xs font-bold text-green-500">{fixedPct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-700"
                      style={{ width: `${fixedPct}%` }}
                    />
                  </div>
                </div>
                {critHighOpen > 0 ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-500">
                      <span className="font-semibold">{critHighOpen} Critical/High</span> finding{critHighOpen !== 1 ? 's' : ''} still unresolved
                    </p>
                  </div>
                ) : findings.length > 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckSquare className="h-4 w-4 text-green-500" />
                    <p className="text-xs text-green-500 font-medium">All Critical/High findings resolved ✓</p>
                  </div>
                ) : null}
              </>
            );
          })()}
        </CardContent>
      </Card>

    </div>
  );
}