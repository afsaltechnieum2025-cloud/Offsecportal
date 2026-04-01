import { CheckSquare, Globe, Plug, Cloud, Brain, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { webChecklist, apiChecklist, cloudChecklist, aiLlmChecklist } from '@/data/Checklistdata';
import type { CLType } from '@/utils/projectTypes';
import { useState } from 'react';

type Props = {
  clProgress: Record<string, Record<string, boolean>>;
  clSaving: Record<string, boolean>;
  checklistDetails: Record<string, { updated_by: string | null; updated_at: string | null }>;
  getUsername: (uid: string | null | undefined) => string;
  onToggleItem: (type: CLType, category: string, item: string) => Promise<void>;
};

const checklistTabs: { type: CLType; label: string; icon: React.ReactNode; data: any[] }[] = [
  { type: 'web', label: 'Web', icon: <Globe className="h-3.5 w-3.5" />, data: webChecklist },
  { type: 'api', label: 'API', icon: <Plug className="h-3.5 w-3.5" />, data: apiChecklist },
  { type: 'cloud', label: 'Cloud', icon: <Cloud className="h-3.5 w-3.5" />, data: cloudChecklist },
  { type: 'aiLlm', label: 'AI/LLM', icon: <Brain className="h-3.5 w-3.5" />, data: aiLlmChecklist },
];

const checklistTitles: Record<CLType, { title: string; subtitle: string }> = {
  web: { title: 'Web Application Security Checklist', subtitle: 'Comprehensive web app testing checklist. Progress is saved per project.' },
  api: { title: 'API Security Checklist', subtitle: 'REST & GraphQL API security testing checklist. Progress is saved per project.' },
  cloud: { title: 'Cloud Security Checklist', subtitle: 'AWS, Azure & GCP security misconfiguration checklist. Progress is saved per project.' },
  aiLlm: { title: 'AI/LLM Security Checklist', subtitle: 'LLM-specific vulnerabilities: prompt injection, excessive agency, data exposure and more.' },
};

export default function ChecklistTab({ clProgress, clSaving, checklistDetails, getUsername, onToggleItem }: Props) {
  const [activeChecklistTab, setActiveChecklistTab] = useState<CLType>('web');

  const renderChecklistContent = (type: CLType, data: { category: string; icon: string; items: string[] }[]) => {
    const prog = clProgress[type] || {};
    const totalAll = data.reduce((s, sec) => s + sec.items.length, 0);
    const doneAll = data.reduce((s, sec) => s + sec.items.filter(i => prog[`${sec.category}::${i}`]).length, 0);
    const pctAll = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-primary">{pctAll}% ({doneAll}/{totalAll})</span>
          </div>
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pctAll}%` }} />
          </div>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {data.map((section) => {
            const done = section.items.filter(i => prog[`${section.category}::${i}`]).length;
            const pct = Math.round((done / section.items.length) * 100);
            return (
              <AccordionItem key={section.category} value={section.category} className="border border-border/50 rounded-lg px-4 bg-secondary/20">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{section.icon}</span>
                      <span className="font-medium text-left">{section.category}</span>
                      {done === section.items.length && section.items.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">Complete</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{done}/{section.items.length}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2 pb-1">
                    {section.items.map((item) => {
                      const key = `${section.category}::${item}`;
                      const isChecked = prog[key] || false;
                      const isSaving = clSaving[`${type}::${key}`] || false;
                      const details = checklistDetails[`${type}::${key}`];
                      const updatedByName = details?.updated_by ? getUsername(details.updated_by) : null;
                      const updatedAt = details?.updated_at ? new Date(details.updated_at).toLocaleDateString() : null;
                      return (
                        <div key={item} className="space-y-1">
                          <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                            <div className="mt-0.5 shrink-0">
                              {isSaving
                                ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                : <Checkbox checked={isChecked} onCheckedChange={() => onToggleItem(type, section.category, item)} />
                              }
                            </div>
                            <div className="flex-1">
                              <span className={`text-sm leading-relaxed ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                {item}
                              </span>
                              {isChecked && updatedByName && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <CheckSquare className="h-3 w-3" />
                                  <span>Checked by {updatedByName}{updatedAt && ` on ${updatedAt}`}</span>
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          {checklistTitles[activeChecklistTab].title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{checklistTitles[activeChecklistTab].subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg w-fit flex-wrap">
          {checklistTabs.map(({ type, label, icon }) => {
            const prog = clProgress[type] || {};
            const data = checklistTabs.find(t => t.type === type)!.data;
            const total = data.reduce((s: number, sec: any) => s + sec.items.length, 0);
            const done = data.reduce((s: number, sec: any) => s + sec.items.filter((i: string) => prog[`${sec.category}::${i}`]).length, 0);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isActive = activeChecklistTab === type;
            return (
              <button key={type} onClick={() => setActiveChecklistTab(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {icon}{label}
                {pct > 0 && (
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{pct}%</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active checklist content */}
        {checklistTabs.map(({ type, data }) =>
          activeChecklistTab === type ? <div key={type}>{renderChecklistContent(type, data)}</div> : null
        )}
      </CardContent>
    </Card>
  );
}