import { useState, useRef } from 'react';
import type { ArchComponent } from '@/utils/projectTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

type ComponentType =
  | 'firewall' | 'vpn' | 'dns' | 'cdn' | 'loadbalancer'
  | 'frontend' | 'mobile' | 'auth' | 'api' | 'server'
  | 'database' | 'cloud' | 'monitoring' | 'email' | 'external';

interface CompFormValues {
  name: string;
  type: ComponentType;
  ip: string;
  port: string;
  tech: string;
  notes: string;
}

interface Props {
  stage: 'upload' | 'map';
  setStage: (s: 'upload' | 'map') => void;
  components: ArchComponent[];
  setComponents: React.Dispatch<React.SetStateAction<ArchComponent[]>>;
  companyName: string;
  setCompanyName: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
}

// ── Static data ───────────────────────────────────────────────────────────────

const TYPE_META: Record<ComponentType, { label: string; icon: string }> = {
  firewall:     { label: 'Firewall',      icon: '🔥' },
  vpn:          { label: 'VPN',           icon: '🔒' },
  dns:          { label: 'DNS',           icon: '📡' },
  cdn:          { label: 'CDN',           icon: '🌐' },
  loadbalancer: { label: 'Load Balancer', icon: '⚖️' },
  frontend:     { label: 'Frontend',      icon: '🖥️' },
  mobile:       { label: 'Mobile',        icon: '📱' },
  auth:         { label: 'Auth / IAM',    icon: '🔐' },
  api:          { label: 'API / Gateway', icon: '🔌' },
  server:       { label: 'Server',        icon: '⚙️' },
  database:     { label: 'Database',      icon: '🗄️' },
  cloud:        { label: 'Cloud',         icon: '☁️' },
  monitoring:   { label: 'Monitoring',    icon: '📊' },
  email:        { label: 'Email',         icon: '📧' },
  external:     { label: 'External',      icon: '🌍' },
};

const LAYER_ORDER: ComponentType[] = [
  'firewall','vpn','dns','cdn','loadbalancer',
  'frontend','mobile','auth','api','server',
  'database','cloud','monitoring','email','external',
];

const KEYWORDS: Record<ComponentType, string[]> = {
  firewall:     ['firewall','sonicwall','palo alto','fortinet','checkpoint','asa','pfsense','watchguard','waf'],
  vpn:          ['vpn','openvpn','wireguard','ipsec','ssl vpn','zscaler','tunnel'],
  dns:          ['dns','route53','cloudflare dns','azure dns','bind'],
  cdn:          ['cdn','cloudfront','akamai','fastly','cloudflare','edge'],
  loadbalancer: ['load balancer','nginx','haproxy','f5','elb','alb','nlb','traefik'],
  frontend:     ['react','vue','angular','next.js','nextjs','nuxt','svelte','frontend','web app','spa','html','javascript','typescript','gatsby'],
  mobile:       ['mobile','ios','android','react native','flutter','swift','kotlin','xamarin','expo'],
  auth:         ['auth','oauth','saml','sso','ldap','active directory','azure ad','okta','keycloak','cognito','iam','identity','ping'],
  api:          ['api','rest','graphql','grpc','express','fastapi','django rest','spring boot','api gateway','gateway','microservice'],
  server:       ['server','node.js','nodejs','python','java','go','ruby','php','dotnet','.net','spring','flask','django','laravel','rails','tomcat','apache','iis','linux','windows server','ubuntu','centos','rhel','vmware','docker','kubernetes','k8s','container'],
  database:     ['database','mysql','postgres','postgresql','mongodb','redis','elasticsearch','cassandra','dynamodb','oracle','mssql','sql server','mariadb','sqlite','cosmos','firebase','supabase','db'],
  cloud:        ['aws','azure','gcp','google cloud','amazon','ec2','s3','lambda','azure blob','azure functions','heroku','digitalocean','vercel','netlify'],
  monitoring:   ['monitor','datadog','grafana','prometheus','splunk','elk','logstash','kibana','new relic','dynatrace','sentry','pagerduty','cloudwatch','logging'],
  email:        ['email','smtp','sendgrid','mailgun','ses','postmark','exchange','office 365','gmail','mail server'],
  external:     ['third-party','stripe','paypal','twilio','slack','salesforce','hubspot','jira','external api','webhook','integration'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectType(text: string): ComponentType {
  const t = text.toLowerCase();
  for (const [type, keys] of Object.entries(KEYWORDS) as [ComponentType, string[]][]) {
    if (keys.some(k => t.includes(k))) return type;
  }
  return 'server';
}

function parseTextFile(raw: string): { companyName: string; summary: string; components: ArchComponent[] } {
  const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean);
  let companyName = '', summary = '';

  for (const line of lines.slice(0, 5)) {
    const m = line.match(/(?:client|company|org|organization)[:\s]+(.+)/i);
    if (m) { companyName = m[1].trim(); break; }
    if (!companyName && line.length < 60 && !line.includes(':')) companyName = line;
  }
  for (const line of lines.slice(0, 8)) {
    if (line.length > 30 && line.length < 200) { summary = line; break; }
  }

  const bigText = raw.replace(/[,;|•\-–]/g, '\n');
  const segments = bigText.split(/\n/).map(s => s.trim()).filter(s => s.length > 2);
  const components: ArchComponent[] = [];
  const seen = new Set<string>();
  const typeCount: Record<string, number> = {};

  for (const seg of segments) {
    const type = detectType(seg);
    typeCount[type] = (typeCount[type] || 0) + 1;
    if (typeCount[type] > 4) continue;

    let name = seg;
    const pm = seg.match(/\b([A-Z][a-zA-Z0-9.+#\s]{2,30})\b/);
    if (pm) name = pm[1].trim();
    if (name.length > 40) name = name.substring(0, 38) + '…';

    const key = `${type}:${name.toLowerCase()}`;
    if (!seen.has(key) && name.length > 2) {
      seen.add(key);
      const ipMatch  = seg.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
      const portMatch = seg.match(/(?:port[:\s]*)(\d{2,5})/i) || seg.match(/:(\d{2,5})\b/);
      components.push({
        id: crypto.randomUUID(),
        name, type, connections: [],
        ip:    ipMatch?.[1]  ?? '',
        port:  portMatch?.[1] ?? '',
        tech:  name,
        notes: seg.length < 120 ? seg : '',
      });
    }
  }
  return { companyName, summary, components: components.slice(0, 22) };
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  card:        '#161b22',
  cardAlt:     '#1c2128',
  border:      'rgba(255,255,255,0.08)',
  primary:     '#f0883e',
  primaryGlow: 'rgba(240,136,62,0.12)',
  primaryDim:  'rgba(240,136,62,0.06)',
  gradBg:      'linear-gradient(to bottom right, rgba(234,179,8,0.10), rgba(249,115,22,0.05), rgba(234,179,8,0.08))',
  gradBorder:  'rgba(234,179,8,0.35)',
  gradLeftBar: 'linear-gradient(to bottom, #facc15, #f97316)',
  text:        '#e6edf3',
  textOrange:  'rgba(255,237,213,0.90)',
  textMuted:   '#7d8590',
  textDim:     '#484f58',
  danger:      '#f85149',
  dangerDim:   'rgba(248,81,73,0.12)',
  dangerBorder:'rgba(248,81,73,0.35)',
  btnGrad:     'linear-gradient(135deg, #f0883e 0%, #d83c1e 100%)',
} as const;

const S = {
  input: {
    height: 36, fontSize: 13, borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.cardAlt,
    padding: '0 10px', color: C.text, outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    padding: '8px 18px', fontSize: 13, fontWeight: 600,
    borderRadius: 8, border: 'none', background: C.btnGrad,
    color: '#fff', cursor: 'pointer',
  },
  btnOutline: {
    padding: '8px 18px', fontSize: 13, fontWeight: 500,
    borderRadius: 8, border: `1px solid ${C.border}`,
    background: 'transparent', color: C.textMuted, cursor: 'pointer',
  },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20,
    background: C.primaryGlow, border: `1px solid rgba(240,136,62,0.35)`,
    color: C.primary, fontSize: 11, fontWeight: 600,
  },
  chipMuted: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20,
    background: C.cardAlt, border: `1px solid ${C.border}`,
    color: C.textMuted, fontSize: 11,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 10,
    background: C.primaryGlow, border: `1px solid rgba(240,136,62,0.3)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  },
} as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function GradCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', borderRadius: 10, border: `1px solid ${C.gradBorder}`, background: C.gradBg, padding: '14px 16px 14px 20px', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', borderRadius: '8px 0 0 8px', background: C.gradLeftBar }} />
      {children}
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.09em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span style={{ color: C.primary, fontSize: 13 }}>{icon}</span>{children}
    </p>
  );
}

function CompForm({
  value, onChange, onSave, onCancel, saveLabel = 'Save',
}: {
  value: CompFormValues;
  onChange: (v: CompFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const fields: [keyof CompFormValues, string, string][] = [
    ['name', 'Name *', 'e.g. React App'],
    ['ip',   'IP / Hostname', 'e.g. 10.0.0.1'],
    ['port', 'Port(s)', 'e.g. 443'],
    ['tech', 'Technology', 'e.g. Nginx'],
    ['notes','Notes', 'Security notes'],
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {fields.map(([k, label, ph]) => (
        <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</label>
          <input
            value={value[k] as string}
            onChange={e => onChange({ ...value, [k]: e.target.value })}
            placeholder={ph}
            style={S.input}
          />
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.07em' }}>Type</label>
        <select
          value={value.type}
          onChange={e => onChange({ ...value, type: e.target.value as ComponentType })}
          style={S.input}
        >
          {(Object.entries(TYPE_META) as [ComponentType, { label: string; icon: string }][]).map(([v, m]) => (
            <option key={v} value={v}>{m.icon} {m.label}</option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button onClick={onCancel} style={S.btnOutline}>Cancel</button>
        <button onClick={onSave} style={S.btnPrimary}>{saveLabel}</button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY_FORM: CompFormValues = { name: '', type: 'server', ip: '', port: '', tech: '', notes: '' };

export default function ArchitectureTab({
  stage, setStage,
  components, setComponents,
  companyName, setCompanyName,
  summary, setSummary,
}: Props) {
  const [fileContent, setFileContent]   = useState('');
  const [fileName,    setFileName]      = useState('');
  const [error,       setError]         = useState('');
  const [editingId,   setEditingId]     = useState<string | null>(null);
  const [editForm,    setEditForm]      = useState<CompFormValues>(EMPTY_FORM);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [addForm,     setAddForm]       = useState<CompFormValues>(EMPTY_FORM);
  const [selectedId,  setSelectedId]    = useState<string | null>(null);
  const [activeTab,   setActiveTab]     = useState<'map' | 'table'>('map');
  const [dragOver,    setDragOver]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.name.endsWith('.txt')) { setError('Please upload a .txt file.'); return; }
    setError(''); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setFileContent((e.target?.result as string) ?? '');
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (!fileContent.trim()) { setError('File is empty.'); return; }
    const result = parseTextFile(fileContent);
    if (!result.components.length) { setError('No components detected. Check your file format.'); return; }
    setCompanyName(result.companyName);
    setSummary(result.summary);
    setComponents(result.components);
    setStage('map');
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleReupload = () => {
    setStage('upload');
    setFileContent('');
    setFileName('');
    setError('');
    setShowAddForm(false);
    setEditingId(null);
  };

  const deleteComp = (id: string) =>
    setComponents(prev => prev.filter(c => c.id !== id));

  const startEdit = (comp: ArchComponent) => {
    setEditingId(comp.id);
    setEditForm({ name: comp.name, type: comp.type as ComponentType, ip: comp.ip ?? '', port: comp.port ?? '', tech: comp.tech ?? '', notes: comp.notes ?? '' });
    setShowAddForm(false);
  };

  const saveEdit = () => {
    setComponents(prev => prev.map(c => c.id === editingId ? { ...c, ...editForm } : c));
    setEditingId(null);
  };

  const addComponent = () => {
    if (!addForm.name.trim()) return;
    setComponents(prev => [...prev, { id: crypto.randomUUID(), ...addForm, connections: [] }]);
    setAddForm(EMPTY_FORM);
    setShowAddForm(false);
  };

  const layerGroups = LAYER_ORDER.reduce<Record<string, ArchComponent[]>>((acc, layer) => {
    const comps = components.filter(c => c.type === layer);
    if (comps.length) acc[layer] = comps;
    return acc;
  }, {});

  const css = `
    input, textarea, select { font-family: inherit; }
    input::placeholder, textarea::placeholder { color: ${C.textDim}; }
    select option { background: ${C.cardAlt}; color: ${C.text}; }
    .comp-card:hover { border-color: rgba(240,136,62,0.5) !important; background: ${C.primaryDim} !important; }
    .inv-row:hover td { background: ${C.primaryGlow} !important; }
    .tab-btn:hover { color: ${C.primary} !important; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: ${C.card}; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  `;

  // ── Upload screen ──────────────────────────────────────────────────────────
  if (stage === 'upload') return (
    <div style={{ color: C.text, paddingBottom: 24 }}>
      <style>{css}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <div style={S.iconBox}>🗂️</div>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Architecture from Text File</h3>
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>
            Upload a{' '}
            <code style={{ background: C.cardAlt, border: `1px solid ${C.gradBorder}`, padding: '1px 7px', borderRadius: 5, fontSize: 12, color: C.primary, fontFamily: 'monospace' }}>.txt</code>
            {' '}file or paste details. The flow diagram builds automatically.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SectionLabel icon="📄">Suggested file format</SectionLabel>
        <GradCard>
          <pre style={{ fontSize: 12, color: C.textOrange, lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{`Client: Acme Corp
Industry: FinTech

Network & Security:
- SonicWall Firewall
- Cisco VPN, port 1194
- Cloudflare CDN

Frontend: React web app
Mobile: React Native
Backend: Node.js / Express, port 3000
Database: PostgreSQL 10.0.1.10:5432, Redis
Cloud: AWS (EC2, S3, Lambda)
Auth: Okta SSO, Azure AD
Monitoring: Datadog, PagerDuty`}</pre>
        </GradCard>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver || fileName ? C.primary : C.border}`,
          borderRadius: 12, padding: '30px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragOver || fileName ? C.primaryGlow : C.primaryDim,
          transition: 'all .2s', marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 8 }}>{fileName ? '📄' : '📁'}</div>
        {fileName ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.primary, marginBottom: 3 }}>{fileName}</p>
            <p style={{ fontSize: 12, color: C.textMuted }}>File ready — click Generate below</p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 3 }}>Drop your .txt file here</p>
            <p style={{ fontSize: 12, color: C.textMuted }}>or click to browse</p>
          </>
        )}
        <input ref={fileRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
      </div>

      <div style={{ marginBottom: 8 }}>
        <SectionLabel icon="✏️">Or paste text directly</SectionLabel>
        <textarea
          value={fileContent}
          onChange={e => { setFileContent(e.target.value); setFileName(''); }}
          rows={5}
          placeholder="Paste your architecture description here…"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardAlt, padding: '10px 12px', color: C.text, resize: 'vertical', lineHeight: 1.7, outline: 'none', fontFamily: 'monospace' }}
        />
      </div>

      {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>⚠️ {error}</p>}

      <button
        onClick={handleGenerate}
        disabled={!fileContent.trim()}
        style={{ ...S.btnPrimary, width: '100%', padding: '11px 0', fontSize: 14, opacity: fileContent.trim() ? 1 : 0.4, cursor: fileContent.trim() ? 'pointer' : 'default' }}
      >
        🗺️ Generate Architecture Diagram
      </button>
    </div>
  );

  // ── Map screen ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, color: C.text }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={S.iconBox}>🏢</div>
          <div>
            {companyName && <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 3 }}>{companyName}</h3>}
            {summary && <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 520, lineHeight: 1.6 }}>{summary}</p>}
            <p style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
              {components.length} components · {Object.keys(layerGroups).length} layers
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setShowAddForm(v => !v); setEditingId(null); }} style={S.btnPrimary}>+ Add Component</button>
          <button onClick={handleReupload} style={S.btnOutline}>↩ Re-upload</button>
        </div>
      </div>

      {/* Layer chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {LAYER_ORDER.map(layer => {
          const count = components.filter(c => c.type === layer).length;
          if (!count) return null;
          const m = TYPE_META[layer];
          return (
            <span key={layer} style={S.chipMuted}>
              {m.icon} {m.label} <strong style={{ color: C.primary, marginLeft: 2 }}>{count}</strong>
            </span>
          );
        })}
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 2, background: C.cardAlt, borderRadius: 8, padding: 3, width: 'fit-content', border: `1px solid ${C.border}` }}>
        {(['map', 'table'] as const).map(t => (
          <button
            key={t}
            className="tab-btn"
            onClick={() => setActiveTab(t)}
            style={{
              padding: '6px 18px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
              fontWeight: activeTab === t ? 700 : 400,
              border: activeTab === t ? `1px solid rgba(240,136,62,0.45)` : '1px solid transparent',
              background: activeTab === t ? C.primaryGlow : 'transparent',
              color: activeTab === t ? C.primary : C.textMuted,
              transition: 'color .15s',
            }}
          >
            {t === 'map' ? '🗺️ Flow Map' : '📋 Inventory'}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ borderRadius: 10, border: `1px solid rgba(240,136,62,0.45)`, background: C.card, padding: '14px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 12 }}>New Component</p>
          <CompForm
            value={addForm}
            onChange={setAddForm}
            onSave={addComponent}
            onCancel={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}
            saveLabel="Add Component"
          />
        </div>
      )}

      {/* ── Flow Map ── */}
      {activeTab === 'map' && (
        <div>
          <SectionLabel icon="⛓">Architecture Flow</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(Object.entries(layerGroups) as [ComponentType, ArchComponent[]][]).map(([layer, comps], idx) => {
              const m = TYPE_META[layer];
              return (
                <div key={layer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {idx > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
                      <div style={{ width: 1, height: 14, background: C.border }} />
                      <div style={{ width: 7, height: 7, borderRight: `2px solid ${C.primary}`, borderBottom: `2px solid ${C.primary}`, transform: 'rotate(45deg)', marginTop: -5, opacity: .7 }} />
                    </div>
                  )}
                  <div style={{ width: '100%', position: 'relative', borderRadius: 10, border: `1px solid ${C.gradBorder}`, background: C.gradBg, padding: '10px 12px 10px 20px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', borderRadius: '8px 0 0 8px', background: C.gradLeftBar }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid rgba(234,179,8,0.15)` }}>
                      <span style={{ fontSize: 15 }}>{m.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '.09em' }}>{m.label}</span>
                      <span style={{ fontSize: 11, color: C.textDim }}>({comps.length})</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {comps.map(comp => (
                        editingId === comp.id ? (
                          <div key={comp.id} style={{ width: '100%', background: C.card, borderRadius: 8, padding: 12, border: `1px solid rgba(240,136,62,0.4)` }}>
                            <CompForm value={editForm} onChange={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} saveLabel="Save Changes" />
                          </div>
                        ) : (
                          <div
                            key={comp.id}
                            className="comp-card"
                            onClick={() => setSelectedId(selectedId === comp.id ? null : comp.id)}
                            style={{
                              position: 'relative', minWidth: 120, maxWidth: 200, padding: '9px 11px',
                              borderRadius: 8, cursor: 'pointer', transition: 'all .15s',
                              border: selectedId === comp.id ? `1px solid ${C.primary}` : `1px solid rgba(234,179,8,0.2)`,
                              background: selectedId === comp.id ? C.primaryGlow : 'rgba(0,0,0,0.25)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: C.textOrange, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.name}</p>
                                {comp.tech && comp.tech !== comp.name && (
                                  <p style={{ fontSize: 11, color: C.primary, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.tech}</p>
                                )}
                                {comp.ip && (
                                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: C.textMuted, whiteSpace: 'nowrap' }}>
                                    {comp.ip}{comp.port ? `:${comp.port}` : ''}
                                  </p>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }} onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => startEdit(comp)}
                                  title="Edit"
                                  style={{ width: 22, height: 22, fontSize: 11, borderRadius: 4, border: `1px solid ${C.border}`, background: C.cardAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >✏️</button>
                                <button
                                  onClick={() => deleteComp(comp.id)}
                                  title="Delete"
                                  style={{ width: 22, height: 22, fontSize: 11, borderRadius: 4, border: C.dangerBorder, background: C.dangerDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >🗑</button>
                              </div>
                            </div>
                            {selectedId === comp.id && comp.notes && (
                              <div style={{ marginTop: 7, paddingTop: 7, borderTop: `1px solid rgba(234,179,8,0.15)`, fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
                                💡 {comp.notes}
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!components.length && (
            <GradCard style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: 28, marginBottom: 8 }}>🗺️</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.textOrange, marginBottom: 4 }}>No components yet</p>
              <p style={{ fontSize: 12, color: C.textMuted }}>Add a component using the button above</p>
            </GradCard>
          )}
          <p style={{ fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 12 }}>
            Click a component to view notes · ✏️ edit · 🗑 remove
          </p>
        </div>
      )}

      {/* ── Inventory Table ── */}
      {activeTab === 'table' && (
        <div style={{ borderRadius: 10, border: `1px solid ${C.gradBorder}`, background: C.gradBg, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: C.gradLeftBar, borderRadius: '8px 0 0 8px' }} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid rgba(234,179,8,0.2)` }}>
                  {['Type', 'Name', 'Technology', 'IP / Host', 'Port(s)', 'Notes', 'Actions'].map((h, i) => (
                    <th key={i} style={{ padding: `11px 14px 11px ${i === 0 ? '18px' : '14px'}`, textAlign: 'left', fontWeight: 700, color: C.primary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.2)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {components.map((comp, i) => {
                  const m = TYPE_META[comp.type as ComponentType] ?? TYPE_META.external;
                  return (
                    <tr key={comp.id} className="inv-row" style={{ borderBottom: `1px solid rgba(234,179,8,0.10)`, transition: 'background .15s' }}>
                      <td style={{ padding: '10px 14px 10px 18px' }}>
                        <span style={S.chip}>{m.icon} {m.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.textOrange, whiteSpace: 'nowrap' }}>{comp.name}</td>
                      <td style={{ padding: '10px 14px', color: C.textMuted }}>{comp.tech || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.textMuted, fontSize: 12 }}>{comp.ip || '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: C.textMuted, fontSize: 12 }}>{comp.port || '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.textMuted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.notes || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { startEdit(comp); setActiveTab('map'); }}
                            style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: `1px solid rgba(240,136,62,0.4)`, background: C.primaryGlow, cursor: 'pointer', color: C.primary }}
                          >Edit</button>
                          <button
                            onClick={() => deleteComp(comp.id)}
                            style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: C.dangerBorder, background: C.dangerDim, cursor: 'pointer', color: C.danger }}
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!components.length && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontSize: 26, marginBottom: 8 }}>🗄️</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.textOrange, marginBottom: 4 }}>No components yet</p>
                <p style={{ fontSize: 12, color: C.textMuted }}>Generate from a file or add manually</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}