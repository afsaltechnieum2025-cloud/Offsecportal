import { useState } from 'react';
import { Plus, Search, ShieldCheck, ShieldX, Package, Radar, Info, ListChecks, Trash2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { YellowAccentBlock, OrangeAccentBlock, SectionHeading } from '@/components/project/accent-blocks';
import { cn } from '@/lib/utils';
import { normalizeSeverity, getSeverityIcon, findingTypeConfig, SEV } from '@/utils/severityHelpers';
import { authHeaders } from '@/hooks/useProjectData';
import FindingCard from '../findings/FindingCard';
import AddFindingDialog from '../findings/AddFindingDialog';
import DeleteConfirmDialog from '../shared/DeleteConfirmDialog';
import type { Finding, FindingPoc, FindingType, RetestStatus, Severity } from '@/utils/projectTypes';
import { API as API_BASE } from '@/utils/api';
import { TOIP_TEST_CASE_TEMPLATES, type ToipTestCase, type ToipStatus } from '@/data/toipData';

// ─── SCA config (mirrors findingTypeConfig shape) ────────────────────────────

const SCA_CONFIG = {
  label: 'SCA',
  icon: <Package className="h-4 w-4" />,
  color: 'text-orange-400',
  bgColor: 'bg-orange-500/10',
  borderColor: 'border-orange-500/20',
};

const TOIP_CONFIG = {
  label: 'TOIP',
  icon: <Radar className="h-4 w-4" />,
  color: 'text-orange-400',
  bgColor: 'bg-orange-500/10',
  borderColor: 'border-orange-500/20',
};

const SECRET_CONFIG = {
  label: 'Secret',
  icon: <KeyRound className="h-4 w-4" />,
  color: 'text-amber-400',
  bgColor: 'bg-amber-500/10',
  borderColor: 'border-amber-500/20',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  findings: Finding[];
  pocs: Record<string, FindingPoc[]>;
  projectId: string;
  projectName: string;
  userId: string;
  getUsername: (uid: string | null | undefined) => string;
  onFindingAdded: (finding: Finding, pocs: FindingPoc[]) => void;
  onFindingDeleted: (findingId: string) => void;
  onPocAdded: (findingId: string, poc: FindingPoc) => void;
  onPocRemoved: (findingId: string, pocId: string) => void;
  onFindingUpdated: (finding: Finding) => void;
  onRefresh: () => Promise<void>;
  toipTestCases: ToipTestCase[];
  setToipTestCases: React.Dispatch<React.SetStateAction<ToipTestCase[]>>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FindingsTab({
  findings, pocs, projectId, projectName, userId,
  getUsername, onFindingAdded, onFindingDeleted,
  onPocAdded, onPocRemoved, onFindingUpdated, onRefresh,
  toipTestCases, setToipTestCases,
}: Props) {
  const [searchQuery, setSearchQuery]           = useState('');
  const [severityFilter, setSeverityFilter]     = useState<string>('all');
  const [activeFindingTab, setActiveFindingTab] = useState<string>('pentest');
  const [expandedFinding, setExpandedFinding]   = useState<string | null>(null);
  const [addFindingOpen, setAddFindingOpen]     = useState(false);
  const [currentFindingType, setCurrentFindingType] = useState<FindingType>('pentest');
  const [deletingFindingId, setDeletingFindingId]   = useState<string | null>(null);
  const [deletingToipId, setDeletingToipId]         = useState<string | null>(null);

  const [toipSearch, setToipSearch]               = useState('');
  const [toipCategoryFilter, setToipCategoryFilter] = useState('all');
  const [toipSeverityFilter, setToipSeverityFilter] = useState('all');
  const [showAddToipForm, setShowAddToipForm]     = useState(false);
  const [newToip, setNewToip] = useState<{
    category: string;
    title: string;
    description: string;
    severity: ToipTestCase['severity'];
  }>({ category: '', title: '', description: '', severity: 'High' });

  // ── helpers ──
  const getFindingsByType = (type: FindingType) =>
    findings.filter(f => (f.finding_type || 'pentest') === type);

  const filteredFindingsByType = (type: FindingType) =>
    getFindingsByType(type).filter(f => {
      const ms = f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const mv = severityFilter === 'all' || normalizeSeverity(f.severity) === severityFilter;
      return ms && mv;
    });

  const openAddFindingDialog = (type: FindingType) => {
    setCurrentFindingType(type);
    setAddFindingOpen(true);
  };

  const handleDeleteRequest = (findingId: string) => {
    const f = findings.find(f => f.id === findingId);
    if (!f || !userId || f.created_by !== userId) { toast.error('You can only delete your own findings'); return; }
    setDeletingFindingId(findingId);
  };

  const confirmDelete = async () => {
    if (!deletingFindingId) return;
    try {
      const res = await fetch(`${API_BASE}/findings/${deletingFindingId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const e = await res.json(); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      onFindingDeleted(deletingFindingId);
      toast.success('Finding deleted');
    } catch { toast.error('Failed to delete finding'); }
    finally { setDeletingFindingId(null); }
  };

  const handleUpdateRetestStatus = async (findingId: string, status: RetestStatus) => {
    try {
      const res = await fetch(`${API_BASE}/findings/${findingId}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ retest_status: status, retest_date: new Date().toISOString(), retested_by: userId }),
      });
      if (!res.ok) { const e = await res.json(); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      const updated: Finding = await res.json();
      onFindingUpdated(updated);
      toast.success(`Retest status updated to "${status}"`);
    } catch { toast.error('Failed to update retest status'); }
  };

  // ── TOIP toggle ──
  const toggleToipStatus = (id: string, next: ToipStatus) => {
    setToipTestCases(prev =>
      prev.map(tc => tc.id === id ? { ...tc, status: tc.status === next ? null : next } : tc)
    );
  };

  const confirmDeleteToip = () => {
    if (!deletingToipId) return;
    setToipTestCases(prev => prev.filter(t => t.id !== deletingToipId));
    toast.success('Test case removed');
    setDeletingToipId(null);
  };

  const addToipTestCase = () => {
    if (!newToip.category.trim() || !newToip.title.trim()) {
      toast.error('Category and title are required');
      return;
    }
    setToipTestCases(prev => [
      ...prev,
      {
        id: `toip-${crypto.randomUUID()}`,
        category: newToip.category.trim(),
        title: newToip.title.trim(),
        description: newToip.description.trim() || '—',
        severity: newToip.severity,
        status: null,
      },
    ]);
    setNewToip({ category: '', title: '', description: '', severity: 'High' });
    setShowAddToipForm(false);
    toast.success('Test case added — it will appear in the TOIP Word report');
  };

  // ── Standard findings list renderer ──
  // `displayConfig` lets callers override the label/colors shown in the UI
  // without changing which findings are fetched (used by the SCA tab which
  // reuses the 'sast' finding type but must display "SCA" everywhere).
  const renderFindingsList = (
    type: FindingType,
    displayConfig?: { label: string; icon: React.ReactNode; bgColor: string; color: string; borderColor: string }
  ) => {
    const typeFindings = filteredFindingsByType(type);
    // Use the override if provided, otherwise fall back to the type's own config
    const config = displayConfig ?? findingTypeConfig[type];

    return (
      <div className="space-y-4">
        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${config.label.toLowerCase()} findings...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-secondary/50"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Informational">Informational</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="default" className="gradient-technieum" onClick={() => openAddFindingDialog(type)}>
            <Plus className="h-4 w-4 mr-2" />Add {config.label} Finding
          </Button>
        </div>

        {/* Severity summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['Critical', 'High', 'Medium', 'Low', 'Informational'] as Severity[]).map(sev => {
            const count = typeFindings.filter(f => normalizeSeverity(f.severity) === sev).length;
            const { bg, text, border } = SEV[sev];
            return (
              <Card key={sev} className={`p-4 border ${border} ${bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${text}`}>{count}</p>
                    <p className="text-xs text-muted-foreground">{sev}</p>
                  </div>
                  {getSeverityIcon(sev)}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Finding cards */}
        <div className="space-y-3">
          {typeFindings.map((finding, index) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              index={index}
              isExpanded={expandedFinding === finding.id}
              onToggleExpand={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
              findingPocs={pocs[finding.id] || []}
              userId={userId}
              projectName={projectName}
              getUsername={getUsername}
              onDelete={handleDeleteRequest}
              onAddPoc={onPocAdded}
              onRemovePoc={onPocRemoved}
              onUpdateRetest={handleUpdateRetestStatus}
            />
          ))}
        </div>

        {/* Empty state */}
        {typeFindings.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              {config.icon}
              <p className="text-lg font-medium">No {config.label} findings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start documenting {config.label.toLowerCase()} vulnerabilities found during the assessment
              </p>
              <Button variant="default" className="gradient-technieum mt-4" onClick={() => openAddFindingDialog(type)}>
                <Plus className="h-4 w-4 mr-2" />Add {config.label} Finding
              </Button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ── TOIP renderer (remediation-tracker color language: yellow / orange, no red/green) ──
  const renderToipTab = () => {
    const categories = Array.from(new Set(toipTestCases.map(t => t.category))).sort();
    const addToipCategoryOptions = Array.from(new Set([
      ...TOIP_TEST_CASE_TEMPLATES.map(t => t.category),
      ...toipTestCases.map(t => t.category),
    ])).sort();
    const secureCount   = toipTestCases.filter(t => t.status === 'Secure').length;
    const insecureCount = toipTestCases.filter(t => t.status === 'Not Secure').length;
    const pendingCount  = toipTestCases.filter(t => t.status === null).length;
    const totalCount    = toipTestCases.length;
    const denom         = totalCount || 1;
    const progressPct   = totalCount > 0 ? Math.round(((secureCount + insecureCount) / totalCount) * 100) : 0;

    const filtered = toipTestCases.filter(tc => {
      const matchSearch   = tc.title.toLowerCase().includes(toipSearch.toLowerCase()) ||
        tc.description.toLowerCase().includes(toipSearch.toLowerCase());
      const matchCategory = toipCategoryFilter === 'all' || tc.category === toipCategoryFilter;
      const matchSeverity = toipSeverityFilter === 'all' || tc.severity === toipSeverityFilter;
      return matchSearch && matchCategory && matchSeverity;
    });

    const groupedFiltered: Record<string, ToipTestCase[]> = {};
    filtered.forEach(tc => {
      if (!groupedFiltered[tc.category]) groupedFiltered[tc.category] = [];
      groupedFiltered[tc.category].push(tc);
    });

    const severityBadge: Record<string, string> = {
      Critical: 'border-orange-600/40 bg-orange-600/15 text-orange-300',
      High:     'border-orange-500/35 bg-orange-500/10 text-orange-200',
      Medium:   'border-yellow-500/35 bg-yellow-500/10 text-yellow-300',
      Low:      'border-border bg-muted/50 text-muted-foreground',
    };

    return (
      <div className="space-y-5">
        <OrangeAccentBlock>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-md">
                <Radar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-orange-100/95 text-sm">Technieum OffSec Intelligence Portal</p>
                <p className="text-xs text-orange-100/70 mt-0.5 leading-relaxed">
                  Mark each case <span className="text-yellow-300 font-medium">Secure</span> or <span className="text-orange-400 font-medium">Not Secure</span>. Add custom cases below — they are included in the TOIP Word report.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/35 bg-primary/10 text-primary shrink-0 self-start">
              {totalCount} test cases
            </Badge>
          </div>
        </OrangeAccentBlock>

        

        <div className="flex flex-col lg:flex-row gap-3 flex-wrap lg:items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search test cases..."
              value={toipSearch}
              onChange={e => setToipSearch(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <Select value={toipCategoryFilter} onValueChange={setToipCategoryFilter}>
            <SelectTrigger className="w-full lg:w-48 bg-secondary/50"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={toipSeverityFilter} onValueChange={setToipSeverityFilter}>
            <SelectTrigger className="w-full lg:w-36 bg-secondary/50"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            className="gradient-technieum text-primary-foreground shrink-0"
            onClick={() => setShowAddToipForm(v => !v)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {showAddToipForm ? 'Close form' : 'Add test case'}
          </Button>
        </div>

        {showAddToipForm && (
          <OrangeAccentBlock>
            <p className="text-sm font-semibold text-orange-100/95 mb-3">New test case</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-orange-100/80">Category</Label>
                <Select
                  value={newToip.category || undefined}
                  onValueChange={v => setNewToip(p => ({ ...p, category: v }))}
                >
                  <SelectTrigger className="bg-background/90">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {addToipCategoryOptions.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-orange-100/80">Title</Label>
                <Input
                  value={newToip.title}
                  onChange={e => setNewToip(p => ({ ...p, title: e.target.value }))}
                  placeholder="Short test name"
                  className="bg-background/90"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs text-orange-100/80">Description</Label>
                <Textarea
                  value={newToip.description}
                  onChange={e => setNewToip(p => ({ ...p, description: e.target.value }))}
                  placeholder="What should testers verify?"
                  rows={3}
                  className="bg-background/90 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-orange-100/80">Severity</Label>
                <Select
                  value={newToip.severity}
                  onValueChange={v => setNewToip(p => ({ ...p, severity: v as ToipTestCase['severity'] }))}
                >
                  <SelectTrigger className="bg-background/90"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button type="button" className="gradient-technieum text-primary-foreground" onClick={addToipTestCase}>
                Save test case
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowAddToipForm(false); setNewToip({ category: '', title: '', description: '', severity: 'High' }); }}>
                Cancel
              </Button>
            </div>
          </OrangeAccentBlock>
        )}

        {Object.keys(groupedFiltered).length === 0 ? (
          <YellowAccentBlock contentClassName="pl-4 pr-4 text-center py-8">
            <Radar className="h-10 w-10 mx-auto mb-3 text-primary/80" />
            <p className="text-sm font-medium text-orange-100/90">No test cases match your filters</p>
            <p className="text-xs text-orange-100/65 mt-1">Clear filters or add a new test case above</p>
          </YellowAccentBlock>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedFiltered).map(([category, cases]) => {
              const catSecure   = cases.filter(t => t.status === 'Secure').length;
              const catInsecure = cases.filter(t => t.status === 'Not Secure').length;
              return (
                <Card key={category} className="overflow-hidden border-yellow-500/20 bg-secondary/10">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/15 bg-secondary/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate">{category}</span>
                      <Badge variant="outline" className="text-xs border-primary/25 bg-primary/5 text-primary shrink-0">
                        {cases.length} tests
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      {catSecure > 0 && <span className="text-yellow-300 font-medium">{catSecure} secure</span>}
                      {catInsecure > 0 && <span className="text-orange-400 font-medium">{catInsecure} not secure</span>}
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    {cases.map(tc => (
                      <div
                        key={tc.id}
                        className={cn(
                          'flex items-stretch gap-3 px-4 py-3 transition-colors',
                          tc.status === 'Secure' && 'bg-yellow-500/[0.06]',
                          tc.status === 'Not Secure' && 'bg-orange-500/[0.07]',
                          !tc.status && 'hover:bg-secondary/30',
                        )}
                      >
                        <div
                          className={cn(
                            'w-1 rounded-full shrink-0',
                            tc.status === 'Secure' && 'bg-yellow-400',
                            tc.status === 'Not Secure' && 'bg-orange-500',
                            !tc.status && 'bg-border/60',
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-medium">{tc.title}</span>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', severityBadge[tc.severity] ?? severityBadge.Medium)}>
                              {tc.severity}
                            </span>
                            {tc.status && (
                              <span
                                className={cn(
                                  'text-xs px-1.5 py-0.5 rounded-full border font-medium',
                                  tc.status === 'Secure'
                                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                                    : 'border-orange-500/40 bg-orange-500/10 text-orange-300',
                                )}
                              >
                                {tc.status === 'Secure' ? '✓ Secure' : '✗ Not Secure'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed text-orange-200/90">{tc.description}</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              'text-xs h-8',
                              tc.status === 'Secure'
                                ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-200'
                                : 'border-border hover:border-yellow-500/35 hover:bg-yellow-500/10',
                            )}
                            onClick={() => toggleToipStatus(tc.id, 'Secure')}
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Secure
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              'text-xs h-8',
                              tc.status === 'Not Secure'
                                ? 'border-orange-500/50 bg-orange-500/15 text-orange-200'
                                : 'border-border hover:border-orange-500/35 hover:bg-orange-500/10',
                            )}
                            onClick={() => toggleToipStatus(tc.id, 'Not Secure')}
                          >
                            <ShieldX className="h-3.5 w-3.5 mr-1" />
                            Not Secure
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-destructive/35 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingToipId(tc.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div>
          <SectionHeading icon={ListChecks}>Assessment status</SectionHeading>
          <YellowAccentBlock>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div className="p-3 rounded-lg bg-yellow-500/15 border border-yellow-400/35">
                <p className="text-2xl font-bold text-yellow-300">{secureCount}</p>
                <p className="text-xs text-orange-100/70 mt-0.5">Secure</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/15 border border-orange-500/40">
                <p className="text-2xl font-bold text-orange-400">{insecureCount}</p>
                <p className="text-xs text-orange-100/70 mt-0.5">Not Secure</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/30">
                <p className="text-2xl font-bold text-orange-100/90">{pendingCount}</p>
                <p className="text-xs text-orange-100/70 mt-0.5">Pending</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-orange-100/80">Assessment progress</span>
                <span className="text-xs font-bold text-yellow-300">{progressPct}% reviewed</span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-secondary/40 border border-yellow-500/20 flex">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500 rounded-l-full"
                  style={{ width: `${Math.round((secureCount / denom) * 100)}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                  style={{ width: `${Math.round((insecureCount / denom) * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-orange-100/65">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Secure</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Not Secure</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary inline-block" />Pending</span>
              </div>
            </div>
          </YellowAccentBlock>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 flex gap-2">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            All cases listed here (built-in and added) export to the <span className="text-primary font-medium">TOIP Report</span> with Secure, Not Secure, or N/A. Data is kept for this browser session while you stay on the project.
          </p>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const scaCount = getFindingsByType('sast').length;
  const secretCount = findings.filter(f => (f.finding_type || '').toLowerCase() === 'secret').length;

  return (
    <>
      <Tabs value={activeFindingTab} onValueChange={setActiveFindingTab} className="space-y-4">
        <TabsList className="bg-secondary/50 h-auto gap-1 p-1 flex-wrap">

          {/* Standard finding type tabs */}
          {(['pentest', 'sast', 'asm', 'llm'] as FindingType[]).map(type => {
            const config = findingTypeConfig[type];
            const count  = getFindingsByType(type).length;
            return (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2 text-sm">
                {config.icon}{config.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${config.bgColor} ${config.color} font-semibold`}>
                  {count}
                </span>
              </TabsTrigger>
            );
          })}

          {/* SCA tab — uses SCA_CONFIG colors */}
          <TabsTrigger value="sca" className="flex items-center gap-2 text-sm">
            {SCA_CONFIG.icon}
            {SCA_CONFIG.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${SCA_CONFIG.bgColor} ${SCA_CONFIG.color} font-semibold`}>
              {scaCount}
            </span>
          </TabsTrigger>

          <TabsTrigger value="secret" className="flex items-center gap-2 text-sm">
            {SECRET_CONFIG.icon}
            {SECRET_CONFIG.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${SECRET_CONFIG.bgColor} ${SECRET_CONFIG.color} font-semibold tabular-nums`}>
              {secretCount}
            </span>
          </TabsTrigger>

          {/* TOIP tab — badge shows total test case count (same pattern as other tabs) */}
          <TabsTrigger value="toip" className="flex items-center gap-2 text-sm">
            {TOIP_CONFIG.icon}
            {TOIP_CONFIG.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${TOIP_CONFIG.bgColor} ${TOIP_CONFIG.color} font-semibold tabular-nums`}>
              {toipTestCases.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Standard tabs */}
        <TabsContent value="pentest" className="space-y-4 mt-0">{renderFindingsList('pentest')}</TabsContent>
        <TabsContent value="sast"    className="space-y-4 mt-0">{renderFindingsList('sast')}</TabsContent>
        <TabsContent value="asm"     className="space-y-4 mt-0">{renderFindingsList('asm')}</TabsContent>
        <TabsContent value="llm"     className="space-y-4 mt-0">{renderFindingsList('llm')}</TabsContent>

        {/* SCA tab — fetches 'sast' findings but displays everything as "SCA" */}
        <TabsContent value="sca" className="space-y-4 mt-0">
          {/* Header banner — primary orange to match the app's design language */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 mb-2">
            <div className="h-9 w-9 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <Package className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-orange-300 text-sm">Software Composition Analysis</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track open-source dependency vulnerabilities, outdated packages, and license risks.
              </p>
            </div>
          </div>
          {/* Pass SCA_CONFIG as displayConfig so all labels/buttons say "SCA" */}
          {renderFindingsList('sast', SCA_CONFIG)}
        </TabsContent>

        <TabsContent value="secret" className="space-y-4 mt-0 min-h-[200px]" />

        {/* TOIP */}
        <TabsContent value="toip" className="space-y-4 mt-0">
          {renderToipTab()}
        </TabsContent>
      </Tabs>

      <AddFindingDialog
        open={addFindingOpen}
        onClose={() => setAddFindingOpen(false)}
        projectId={projectId}
        projectName={projectName}
        userId={userId}
        findingType={currentFindingType}
        onSuccess={async (finding, newPocs) => {
          onFindingAdded(finding, newPocs);
          await onRefresh();
        }}
      />

      <DeleteConfirmDialog
        open={!!deletingFindingId}
        onClose={() => setDeletingFindingId(null)}
        onConfirm={confirmDelete}
      />

      <DeleteConfirmDialog
        open={!!deletingToipId}
        onClose={() => setDeletingToipId(null)}
        onConfirm={confirmDeleteToip}
        title="Delete test case"
        description="Remove this TOIP test case from the project list. It will no longer appear in the TOIP Word report."
      />
    </>
  );
}