import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Network, Cpu, Upload, Plus, X, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ArchComponent, ArchUpload } from '@/utils/projectTypes';

const COMPONENT_TYPES = [
  { type: 'frontend', label: 'Frontend', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '🖥️' },
  { type: 'api', label: 'API', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🔌' },
  { type: 'server', label: 'Server', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '⚙️' },
  { type: 'database', label: 'Database', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🗄️' },
  { type: 'cloud', label: 'Cloud', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: '☁️' },
  { type: 'firewall', label: 'Firewall', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔥' },
  { type: 'loadbalancer', label: 'Load Balancer', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⚖️' },
  { type: 'mobile', label: 'Mobile', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', icon: '📱' },
  { type: 'external', label: 'External', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '🌐' },
] as const;

const typeStyles: Record<string, string> = {
  frontend: 'bg-blue-500/10 text-blue-400 border-blue-500/20', api: 'bg-green-500/10 text-green-400 border-green-500/20',
  server: 'bg-orange-500/10 text-orange-400 border-orange-500/20', database: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  cloud: 'bg-sky-500/10 text-sky-400 border-sky-500/20', firewall: 'bg-red-500/10 text-red-400 border-red-500/20',
  loadbalancer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', mobile: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  external: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const typeIcons: Record<string, string> = {
  frontend: '🖥️', api: '🔌', server: '⚙️', database: '🗄️', cloud: '☁️', firewall: '🔥', loadbalancer: '⚖️', mobile: '📱', external: '🌐',
};

const MAP_LAYER_ORDER = ['firewall', 'loadbalancer', 'frontend', 'mobile', 'api', 'server', 'database', 'cloud', 'external'] as const;
const layerColors: Record<string, string> = {
  firewall: 'border-red-500/40 bg-red-500/5', loadbalancer: 'border-yellow-500/40 bg-yellow-500/5',
  frontend: 'border-blue-500/40 bg-blue-500/5', mobile: 'border-pink-500/40 bg-pink-500/5',
  api: 'border-green-500/40 bg-green-500/5', server: 'border-orange-500/40 bg-orange-500/5',
  database: 'border-purple-500/40 bg-purple-500/5', cloud: 'border-sky-500/40 bg-sky-500/5',
  external: 'border-gray-500/40 bg-gray-500/5',
};
const layerTextColors: Record<string, string> = {
  firewall: 'text-red-400', loadbalancer: 'text-yellow-400', frontend: 'text-blue-400', mobile: 'text-pink-400',
  api: 'text-green-400', server: 'text-orange-400', database: 'text-purple-400', cloud: 'text-sky-400', external: 'text-gray-400',
};

export default function ArchitectureTab() {
  const [archMode, setArchMode] = useState<'builder' | 'upload'>('builder');
  const [archComponents, setArchComponents] = useState<ArchComponent[]>([]);
  const [archUploads, setArchUploads] = useState<ArchUpload[]>([]);
  const [addingComponent, setAddingComponent] = useState(false);
  const [newComp, setNewComp] = useState<Omit<ArchComponent, 'id' | 'connections'>>({
    name: '', type: 'server', ip: '', port: '', tech: '', notes: '',
  });
  const archFileRef = useRef<HTMLInputElement>(null);

  const resetNewComp = () => setNewComp({ name: '', type: 'server', ip: '', port: '', tech: '', notes: '' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Network className="h-5 w-5 text-primary" />Application Architecture</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Document the target's architecture — add components to auto-generate a map, or upload an existing diagram</p>
        </div>
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg">
          <button onClick={() => setArchMode('builder')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${archMode === 'builder' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Cpu className="h-3.5 w-3.5" />Component Builder
          </button>
          <button onClick={() => setArchMode('upload')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${archMode === 'upload' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Upload className="h-3.5 w-3.5" />Upload Diagram
          </button>
        </div>
      </div>

      {/* ── Builder mode ── */}
      {archMode === 'builder' && (
        <div className="space-y-4">
          {/* Type legend */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Component types:</span>
            {COMPONENT_TYPES.map(({ type, label, color, icon }) => (
              <span key={type} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{icon} {label}</span>
            ))}
          </div>

          {!addingComponent && (
            <Button variant="outline" className="w-full border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors" onClick={() => setAddingComponent(true)}>
              <Plus className="h-4 w-4 mr-2 text-primary" />Add Component
            </Button>
          )}

          {addingComponent && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">New Component</p>
                  <button onClick={() => { setAddingComponent(false); resetNewComp(); }}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input placeholder="e.g., React Frontend" className="h-8 text-sm bg-background" value={newComp.name} onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type *</Label>
                    <Select value={newComp.type} onValueChange={v => setNewComp(p => ({ ...p, type: v as any }))}>
                      <SelectTrigger className="h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COMPONENT_TYPES.map(({ type, label, icon }) => (
                          <SelectItem key={type} value={type}>{icon} {label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IP / Hostname</Label>
                    <Input placeholder="e.g., 192.168.1.10" className="h-8 text-sm bg-background font-mono" value={newComp.ip} onChange={e => setNewComp(p => ({ ...p, ip: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Port(s)</Label>
                    <Input placeholder="e.g., 80, 443, 8080" className="h-8 text-sm bg-background font-mono" value={newComp.port} onChange={e => setNewComp(p => ({ ...p, port: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Technology</Label>
                    <Input placeholder="e.g., React, Node.js, MySQL" className="h-8 text-sm bg-background" value={newComp.tech} onChange={e => setNewComp(p => ({ ...p, tech: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input placeholder="Any relevant notes" className="h-8 text-sm bg-background" value={newComp.notes} onChange={e => setNewComp(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => { setAddingComponent(false); resetNewComp(); }}>Cancel</Button>
                  <Button size="sm" className="gradient-technieum" onClick={() => {
                    if (!newComp.name.trim()) { toast.error('Component name is required'); return; }
                    const comp: ArchComponent = { id: crypto.randomUUID(), ...newComp, connections: [] };
                    setArchComponents(prev => [...prev, comp]);
                    resetNewComp();
                    setAddingComponent(false);
                    toast.success('Component added');
                  }}>Add Component</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {archComponents.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Component list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Components ({archComponents.length})</p>
                {archComponents.map(comp => (
                  <Card key={comp.id} className="group">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className={`mt-0.5 shrink-0 text-xs px-2 py-1 rounded-full border font-medium ${typeStyles[comp.type]}`}>{typeIcons[comp.type]} {comp.type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{comp.name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                              {comp.ip && <span className="text-xs font-mono text-muted-foreground">{comp.ip}</span>}
                              {comp.port && <span className="text-xs font-mono text-muted-foreground">:{comp.port}</span>}
                              {comp.tech && <span className="text-xs text-muted-foreground">{comp.tech}</span>}
                            </div>
                            {comp.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{comp.notes}</p>}
                          </div>
                        </div>
                        <button onClick={() => { setArchComponents(prev => prev.filter(c => c.id !== comp.id)); toast.success('Component removed'); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Trash2 className="h-4 w-4 text-destructive/60 hover:text-destructive" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Architecture map */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Architecture Map</p>
                <Card className="border-border/50 bg-secondary/10 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="relative min-h-64 flex flex-col items-center gap-3 py-4">
                      {MAP_LAYER_ORDER.map(layer => {
                        const comps = archComponents.filter(c => c.type === layer);
                        if (comps.length === 0) return null;
                        return (
                          <div key={layer} className="w-full">
                            <div className="flex justify-center mb-2">
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="w-px h-4 bg-border/60" />
                                <div className="w-2 h-2 border-r border-b border-border/60 rotate-45 -mt-1.5" />
                              </div>
                            </div>
                            <div className={`rounded-lg border ${layerColors[layer]} p-3`}>
                              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${layerTextColors[layer]}`}>{typeIcons[layer]} {layer}</p>
                              <div className="flex flex-wrap gap-2">
                                {comps.map(c => (
                                  <div key={c.id} className={`px-3 py-1.5 rounded-md border ${layerColors[layer]} text-center min-w-20`}>
                                    <p className="text-xs font-semibold truncate max-w-28">{c.name}</p>
                                    {c.ip && <p className="text-xs font-mono text-muted-foreground/70 truncate">{c.ip}</p>}
                                    {c.tech && <p className="text-xs text-muted-foreground/60 truncate">{c.tech}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground mt-2 text-center">Architecture map auto-updates as you add components</p>
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-border/40">
              <CardContent className="py-16 text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><span className="text-xs">🖥️</span></div>
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-px h-4 bg-border/50" />
                  <div className="absolute top-12 left-1/2 -translate-x-1/2 w-10 h-6 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center"><span className="text-xs">🔌</span></div>
                  <div className="absolute bottom-0 left-0 w-10 h-6 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center"><span className="text-xs">🗄️</span></div>
                  <div className="absolute bottom-0 right-0 w-10 h-6 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center"><span className="text-xs">⚙️</span></div>
                </div>
                <p className="text-sm font-semibold mt-2">No components yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Add servers, databases, APIs, firewalls and more — an architecture map will generate automatically</p>
                <Button variant="outline" size="sm" className="mt-4 border-primary/30 text-primary hover:bg-primary/5" onClick={() => setAddingComponent(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add First Component
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Upload mode ── */}
      {archMode === 'upload' && (
        <div className="space-y-4">
          <input ref={archFileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg,.pdf" multiple
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              files.forEach(file => {
                const reader = new FileReader();
                reader.onload = ev => { setArchUploads(prev => [...prev, { name: file.name, preview: ev.target?.result as string, notes: '' }]); };
                reader.readAsDataURL(file);
              });
              if (archFileRef.current) archFileRef.current.value = '';
            }}
          />
          {archUploads.length === 0 ? (
            <div className="border-2 border-dashed border-border/40 rounded-xl p-16 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group" onClick={() => archFileRef.current?.click()}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-secondary/60 border border-border/50 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                <Upload className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-semibold">Upload Architecture Diagram</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG or PDF — Visio exports, draw.io, Lucidchart, screenshots</p>
              <Button variant="outline" size="sm" className="mt-4 pointer-events-none">Choose Files</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {archUploads.map((upload, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative group">
                      <img src={upload.preview} alt={upload.name} className="w-full max-h-96 object-contain bg-secondary/20" />
                      <button onClick={() => setArchUploads(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 h-7 w-7 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-4 border-t border-border/50 space-y-2">
                      <p className="text-sm font-medium truncate">{upload.name}</p>
                      <Textarea placeholder="Add notes about this diagram — scope boundaries, trust zones, data flows..." className="text-xs resize-none bg-secondary/30" rows={2}
                        value={upload.notes} onChange={e => setArchUploads(prev => prev.map((u, i) => i === idx ? { ...u, notes: e.target.value } : u))} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={() => archFileRef.current?.click()}>
                <Plus className="h-4 w-4 mr-2" />Add Another Diagram
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground">Supported formats:</span>
            {['PNG', 'JPG', 'SVG', 'PDF', 'draw.io export', 'Visio export', 'Lucidchart'].map(f => (
              <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-secondary/60 border border-border/40 text-muted-foreground">{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}