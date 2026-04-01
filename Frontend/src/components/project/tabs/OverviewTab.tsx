import { useState } from 'react';
import { Bug, FileText, Globe, RefreshCw, Users, CheckSquare, AlertTriangle, Crown, Image as ImageIcon, Hash } from 'lucide-react';
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

// Role → avatar gradient (matches TeamTab exactly)
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
      {/* ── Top row: project brief + findings overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Brief */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />Project Brief
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Client</p>
                <p className="font-semibold">{project.client || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Name</p>
                <p className="font-semibold">{project.name}</p>
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
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Code</p>
                {project.project_code ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
                    <Hash className="h-3 w-3" />
                    {project.project_code}
                  </span>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground italic">Not assigned</p>
                )}
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project ID</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{project.id}</p>
              </div>
            </div>

            {/* Timeline progress */}
            {project.start_date && project.end_date && (() => {
              const start = new Date(project.start_date).getTime();
              const end = new Date(project.end_date).getTime();
              const now = Date.now();
              const total = end - start;
              const elapsed = Math.min(Math.max(now - start, 0), total);
              const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
              const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
              const isOver = now > end;
              return (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground">Timeline Progress</span>
                    <span className={`text-xs font-medium ${isOver ? 'text-destructive' : 'text-primary'}`}>
                      {isOver ? 'Overdue' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-destructive' : 'bg-gradient-to-r from-orange-500 to-yellow-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{new Date(project.start_date).toLocaleDateString()}</span>
                    <span className="text-xs text-muted-foreground">{new Date(project.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Findings overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />Findings Overview
            </CardTitle>
            <CardDescription>Distribution by severity across all finding types</CardDescription>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-secondary/30 flex items-center justify-center">
                  <Bug className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No findings yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Start documenting vulnerabilities</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map(sev => {
                    const count = findings.filter(f => normalizeSeverity(f.severity) === sev).length;
                    if (count === 0) return null;
                    const { text } = SEV[sev];
                    const colorClass =
                      sev === 'Critical' ? 'bg-red-500' :
                      sev === 'High' ? 'bg-orange-500' :
                      (sev === 'Medium' || sev === 'Low') ? 'bg-yellow-500' :
                      'bg-gray-500';
                    return (
                      <div key={sev} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                          <span className={`text-sm ${text}`}>{sev}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{count}</span>
                          <span className="text-xs text-muted-foreground">({Math.round((count / findings.length) * 100)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">By Type</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['pentest', 'sast', 'asm', 'llm'] as FindingType[]).map(type => {
                      const count = getFindingsByType(type).length;
                      const config = findingTypeConfig[type];
                      return (
                        <div key={type} className={`text-center p-2 rounded-lg ${config.bgColor}`}>
                          <div className={config.color}>{config.icon}</div>
                          <p className="text-lg font-bold mt-1">{count}</p>
                          <p className="text-xs text-muted-foreground">{config.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Scope & Target + Remediation Tracker ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scope */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />Scope & Target
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Description */}
            {project.description && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Primary Domain</p>
              {project.domain ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/40 border border-border/50">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-mono text-sm">{project.domain}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No domain specified</p>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                IP Addresses / Ranges ({project.ip_addresses?.length || 0})
              </p>
              {project.ip_addresses?.length ? (
                <div className="flex flex-wrap gap-2">
                  {project.ip_addresses.map((ip, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-xs">{ip}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No IPs specified</p>
              )}
            </div>

            {/* Assessment Coverage */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assessment Coverage</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Web App', icon: '🌐', type: 'pentest' as FindingType },
                  { label: 'API',     icon: '🔌', type: 'pentest' as FindingType },
                  { label: 'SAST',    icon: '🛡️', type: 'sast'    as FindingType },
                  { label: 'SCA',     icon: '📦', type: 'sast'    as FindingType },
                  { label: 'ASM',     icon: '⚡', type: 'asm'     as FindingType },
                  { label: 'LLM/AI',  icon: '🧠', type: 'llm'     as FindingType },
                ].map(({ label, icon, type }) => {
                  const count = label === 'SCA' ? 0 : getFindingsByType(type).length;
                  const config = findingTypeConfig[type];
                  const scaExtra = label === 'SCA'
                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                    : `${config.bgColor} ${config.color} ${config.borderColor}`;
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${scaExtra}`}
                    >
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
            </div>
          </CardContent>
        </Card>

        {/* Remediation tracker */}
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

      {/* ── Team snapshot + Recent findings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />Team Snapshot
            </CardTitle>
            <CardDescription>{assignees.length} member{assignees.length !== 1 ? 's' : ''} assigned to this project</CardDescription>
          </CardHeader>
          <CardContent>
            {assignees.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No testers assigned yet</p>
            ) : (
              <div className="space-y-2">
                <div className={showAllSnapshot ? 'max-h-[300px] overflow-y-auto pr-1 space-y-2' : 'space-y-2'}>
                  {(showAllSnapshot ? assignees : assignees.slice(0, 5)).map(member => {
                    const name = allUsers[String(member.user_id)] || member.username || 'Unknown';
                    const findingsByMember = findings.filter(f => String(f.created_by) === String(member.user_id)).length;
                    const memberRole = member.role ?? 'tester';
                    const gradientClass = avatarGradientMap[memberRole] ?? avatarGradientMap.tester;
                    const roleLabel = memberRole.charAt(0).toUpperCase() + memberRole.slice(1);
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1">
                            {name}
                            {memberRole === 'admin' && <Crown className="h-3 w-3 text-primary inline-block" />}
                          </p>
                          <p className="text-xs text-muted-foreground">{roleLabel} · {findingsByMember} finding{findingsByMember !== 1 ? 's' : ''} reported</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">Active</Badge>
                      </div>
                    );
                  })}
                </div>
                {assignees.length > 5 && (
                  <button
                    onClick={() => setShowAllSnapshot(prev => !prev)}
                    className="w-full text-xs text-primary text-center pt-1 hover:underline transition-colors cursor-pointer"
                  >
                    {showAllSnapshot ? 'Show less ↑' : `+${assignees.length - 5} more — click to show all`}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent findings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />Recent Findings
            </CardTitle>
            <CardDescription>Last {RECENT_PREVIEW} findings added to this project</CardDescription>
          </CardHeader>
          <CardContent>
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No findings yet — start the assessment</p>
            ) : (
              <div className="space-y-2">
                <div className={showAllRecentFindings ? 'max-h-[320px] overflow-y-auto pr-1 space-y-2' : 'space-y-2'}>
                  {(showAllRecentFindings ? sortedFindings : sortedFindings.slice(0, RECENT_PREVIEW)).map(f => {
                    const sev = normalizeSeverity(f.severity);
                    const type = (f.finding_type || 'pentest') as FindingType;
                    const typeConfig = findingTypeConfig[type] ?? findingTypeConfig['pentest'];
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors">
                        <div className="shrink-0">
                          {sev === 'Critical'
                            ? <AlertTriangle className="h-5 w-5 text-red-500" />
                            : typeConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(f.created_at).toLocaleDateString()} · by {getUsername(f.created_by)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className={`text-xs ${typeConfig.bgColor} ${typeConfig.color} border-none`}>{typeConfig.label}</Badge>
                          {getSeverityBadge(f.severity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMoreFindings && (
                  <button
                    onClick={() => setShowAllRecentFindings(prev => !prev)}
                    className="w-full text-xs text-primary text-center pt-1 hover:underline transition-colors cursor-pointer"
                  >
                    {showAllRecentFindings
                      ? 'Show less ↑'
                      : `+${sortedFindings.length - RECENT_PREVIEW} more — click to show all`}
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label:     'Total Findings',
            value:     findings.length,
            icon:      <Bug className="h-5 w-5" />,
            valueCls:  'text-yellow-400',
            borderCls: 'border-yellow-500/30',
            bgCls:     'bg-yellow-500/5',
          },
          {
            label:     'Team Size',
            value:     assignees.length,
            icon:      <Users className="h-5 w-5" />,
            valueCls:  'text-yellow-400',
            borderCls: 'border-yellow-500/30',
            bgCls:     'bg-yellow-500/5',
          },
          {
            label:     'POCs Uploaded',
            value:     Object.values(pocs).reduce((s, a) => s + a.length, 0),
            icon:      <ImageIcon className="h-5 w-5" />,
            valueCls:  'text-orange-400',
            borderCls: 'border-orange-500/30',
            bgCls:     'bg-orange-500/5',
          },
          {
            label:     'Findings Fixed',
            value:     findings.filter(f => f.retest_status === 'Fixed').length,
            icon:      <CheckSquare className="h-5 w-5" />,
            valueCls:  'text-yellow-400',
            borderCls: 'border-yellow-500/30',
            bgCls:     'bg-yellow-500/5',
          },
        ].map(({ label, value, icon, valueCls, borderCls, bgCls }) => (
          <Card key={label} className={`border ${borderCls} ${bgCls}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${valueCls}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
                <div className={`${valueCls} opacity-60`}>{icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}