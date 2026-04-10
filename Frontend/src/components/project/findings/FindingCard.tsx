import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, Upload, X, RefreshCw, Trash2, Image as ImageIcon, Terminal, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getSeverityBadge,
  getRetestBadge,
  findingTypeConfig
} from '@/utils/severityHelpers';
import { authHeaders, authHeadersNoContent, STATIC_BASE } from '@/hooks/useProjectData';
import type { Finding, FindingPoc, FindingType, RetestStatus } from '@/utils/projectTypes';
import { API as API_BASE } from '@/utils/api';

// Re-export getRetestBadge from here for convenience — it's defined in severityHelpers
export { getRetestBadge };

// ─── POC URL helper ───────────────────────────────────────────────────────────
// Handles three cases for poc.file_path:
//   1. Complete data URL  → "data:image/png;base64,iVBORw..."  (backend returns this)
//      Use as-is. This is what Findings.tsx already does with src={poc.file_path}.
//   2. Relative disk path → "uploads/uuid.png"
//      Prepend STATIC_BASE to get the full URL.
//   3. Raw base64 string  → "iVBORw..." (no prefix, legacy DB records)
//      Wrap in a data: URL with the correct MIME type.
//
// IMPORTANT: data URLs contain "/" so we must check for "data:" FIRST before
// any path-detection logic, otherwise the data URL gets incorrectly treated as
// a file path and STATIC_BASE gets prepended to it.
const getPocSrc = (filePath: string): string => {
  if (!filePath) return '';

  // Case 1 — already a complete data URL, use directly
  if (filePath.startsWith('data:')) return filePath;

  // Strip any accidental leading slash so STATIC_BASE + path never double-slashes
  const clean = filePath.replace(/^\/+/, '');

  // Case 2 — looks like a disk path
  if (clean.startsWith('uploads/') || /\.(png|jpe?g|gif|webp)$/i.test(clean)) {
    return `${STATIC_BASE}${clean}`;
  }

  // Case 3 — raw base64, sniff MIME from magic bytes at the start of the string:
  //   PNG  → "iVBORw"   JPEG → "/9j/"   GIF → "R0lG"   WebP → "UklG"
  let mime = 'image/png'; // safe default
  if (clean.startsWith('/9j/')) mime = 'image/jpeg';
  if (clean.startsWith('R0lG')) mime = 'image/gif';
  if (clean.startsWith('UklG')) mime = 'image/webp';

  return `data:${mime};base64,${clean}`;
};

// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  finding: Finding;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  findingPocs: FindingPoc[];
  userId: string;
  projectName: string;
  getUsername: (uid: string | null | undefined) => string;
  onDelete: (findingId: string) => void;
  onAddPoc: (findingId: string, poc: FindingPoc) => void;
  onRemovePoc: (findingId: string, pocId: string) => void;
  onUpdateRetest: (findingId: string, status: RetestStatus) => void;
};

export default function FindingCard({
  finding, index, isExpanded, onToggleExpand,
  findingPocs, userId, projectName,
  getUsername, onDelete, onAddPoc, onRemovePoc, onUpdateRetest,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canDelete = !!userId && finding.created_by === userId;
  const findingType = (finding.finding_type || 'pentest') as FindingType;
  const typeConfig = findingTypeConfig[findingType];
  const LlmCategoryIcon = findingTypeConfig.llm.Icon;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { toast.error('Only JPEG and PNG allowed'); return; }
    try {
      const p = new FormData(); p.append('file', file); p.append('uploaded_by', userId);
      const res = await fetch(`${API_BASE}/findings/${finding.id}/pocs`, { method: 'POST', headers: authHeadersNoContent(), body: p });
      if (!res.ok) { const e = await res.json(); toast.error('Upload failed: ' + (e.message ?? res.statusText)); return; }
      const np: FindingPoc = await res.json();
      onAddPoc(finding.id, np);
      toast.success('POC uploaded!');
    } catch { toast.error('Failed to upload POC'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeletePoc = async (poc: FindingPoc) => {
    if (!userId || poc.uploaded_by !== userId) { toast.error('You can only delete your own POCs'); return; }
    try {
      const res = await fetch(`${API_BASE}/findings/${poc.finding_id}/pocs/${poc.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { const e = await res.json(); toast.error('Failed: ' + (e.message ?? res.statusText)); return; }
      onRemovePoc(poc.finding_id, poc.id);
      toast.success('POC deleted');
    } catch { toast.error('Failed to delete POC'); }
  };

  return (
    <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: `${index * 30}ms` }}>
      {/* ── Header row (always visible) ── */}
      <div className="p-4 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              {getSeverityBadge(finding.severity)}
              {finding.cvss_score && <span className="text-sm font-mono text-muted-foreground">CVSS {finding.cvss_score}</span>}
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{projectName}</Badge>
              {findingPocs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <ImageIcon className="h-3 w-3 mr-1" />{findingPocs.length} POC{findingPocs.length > 1 ? 's' : ''}
                </Badge>
              )}
              {finding.finding_type === 'sast' && finding.file_path && (
                <Badge variant="outline" className={`text-xs ${findingTypeConfig.sast.bgColor} ${findingTypeConfig.sast.color} ${findingTypeConfig.sast.borderColor}`}>
                  <Terminal className="h-3 w-3 mr-1" />{finding.file_path.split('/').pop()}
                </Badge>
              )}
              {finding.finding_type === 'asm' && finding.asset_type && (
                <Badge variant="outline" className={`text-xs ${findingTypeConfig.asm.bgColor} ${findingTypeConfig.asm.color} ${findingTypeConfig.asm.borderColor}`}>
                  <Zap className="h-3 w-3 mr-1" />{finding.asset_type}{finding.port ? `:${finding.port}` : ''}
                </Badge>
              )}
              {finding.finding_type === 'llm' && finding.llm_category && (
                <Badge variant="outline" className={`text-xs ${findingTypeConfig.llm.bgColor} ${findingTypeConfig.llm.color} ${findingTypeConfig.llm.borderColor}`}>
                  <LlmCategoryIcon className="h-3 w-3 mr-1" />{finding.llm_category}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold mt-2">{finding.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{finding.description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>{finding.status}</Badge>
            {finding.retest_status && getRetestBadge(finding.retest_status)}
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(finding.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {/* ── Expanded details ── */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 animate-fade-in">
          {finding.steps_to_reproduce && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Steps to Reproduce</h4>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">{finding.steps_to_reproduce}</pre>
            </div>
          )}
          {finding.impact && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Impact</h4>
              <p className="text-sm text-muted-foreground">{finding.impact}</p>
            </div>
          )}
          {finding.remediation && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Remediation</h4>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-lg">{finding.remediation}</pre>
            </div>
          )}
          {finding.affected_component && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">Affected Component</h4>
              <Badge variant="secondary" className="font-mono text-xs">{finding.affected_component}</Badge>
            </div>
          )}
          {finding.cwe_id && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">CWE</h4>
              <Badge variant="outline" className="font-mono text-xs">{finding.cwe_id}</Badge>
            </div>
          )}

          {/* SAST details */}
          {finding.finding_type === 'sast' && (
            <>
              {finding.file_path && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">File Location</h4>
                  <code className="text-xs bg-secondary/30 p-2 rounded">{finding.file_path}{finding.line_number ? `:${finding.line_number}` : ''}</code>
                </div>
              )}
              {finding.tool_name && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Tool</h4>
                  <Badge variant="secondary">{finding.tool_name}</Badge>
                </div>
              )}
            </>
          )}

          {/* ASM details */}
          {finding.finding_type === 'asm' && (
            <>
              {finding.asset_type && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Asset Type</h4>
                  <Badge variant="secondary">{finding.asset_type}</Badge>
                </div>
              )}
              {finding.port && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Port</h4>
                  <code className="text-xs bg-secondary/30 p-2 rounded">{finding.port}</code>
                </div>
              )}
              {finding.protocol && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Protocol</h4>
                  <Badge variant="secondary">{finding.protocol}</Badge>
                </div>
              )}
            </>
          )}

          {/* LLM details */}
          {finding.finding_type === 'llm' && (
            <>
              {finding.llm_category && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">LLM Vulnerability Category</h4>
                  <Badge variant="secondary" className={`${findingTypeConfig.llm.bgColor} ${findingTypeConfig.llm.color}`}>{finding.llm_category}</Badge>
                </div>
              )}
              {finding.prompt_example && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Example Prompt</h4>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-lg font-mono">{finding.prompt_example}</pre>
                </div>
              )}
            </>
          )}

          {/* POC section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-primary">Proof of Concept (POC)</h4>
              <div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Upload className="h-4 w-4 mr-1" />Upload POC
                </Button>
              </div>
            </div>
            {findingPocs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {findingPocs.map(poc => {
                  const src = getPocSrc(poc.file_path);
                  return (
                    <div key={poc.id} className="relative group">
                      <img
                        src={src}
                        alt={poc.file_name}
                        className="rounded-lg border border-border/50 w-full h-32 object-cover cursor-pointer hover:opacity-80"
                        onClick={(e) => { e.stopPropagation(); window.open(src, '_blank'); }}
                      />
                      {!!userId && poc.uploaded_by === userId && (
                        <button
                          type="button"
                          title="Delete POC"
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                          onClick={(e) => { e.stopPropagation(); handleDeletePoc(poc); }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 truncate">{poc.file_name}</p>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">No POC images uploaded yet.</p>}
          </div>

          {/* Retest section */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-primary mb-1">Retest Status</h4>
                <div className="flex items-center gap-2">
                  {finding.retest_status ? (
                    <>
                      {getRetestBadge(finding.retest_status)}
                      {finding.retest_date && <span className="text-xs text-muted-foreground ml-2">Last tested: {new Date(finding.retest_date).toLocaleDateString()}</span>}
                      {finding.retested_by && <span className="text-xs text-muted-foreground">by {getUsername(finding.retested_by)}</span>}
                    </>
                  ) : <span className="text-sm text-muted-foreground">Not retested yet</span>}
                </div>
              </div>
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Select value={finding.retest_status || ''} onValueChange={(v) => onUpdateRetest(finding.id, v as RetestStatus)}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Update status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Fixed">Fixed</SelectItem>
                    <SelectItem value="Not Fixed">Not Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border/50">
            <span>Reported by: {getUsername(finding.created_by)}</span>
            <span>Created: {new Date(finding.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </Card>
  );
}