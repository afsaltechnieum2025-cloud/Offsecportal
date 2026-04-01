import { Bug, Crown, Briefcase, ShieldCheck, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Finding, Assignee, AppRole } from '@/utils/projectTypes';

const avatarGradientMap: Record<string, string> = {
  admin: 'from-yellow-500 to-orange-500',
  manager: 'from-blue-500 to-blue-700',
  tester: 'from-orange-400 to-yellow-400',
};

const roleStyleMap: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30',
  manager: 'bg-primary/15 text-primary border-primary/40',
  tester: 'bg-secondary text-muted-foreground border-border',
};

const getRoleIcon = (memberRole: AppRole | null | undefined) => {
  if (memberRole === 'admin') return <Crown className="h-4 w-4" />;
  if (memberRole === 'manager') return <Briefcase className="h-4 w-4" />;
  return <ShieldCheck className="h-4 w-4" />;
};

type Props = {
  assignees: Assignee[];
  findings: Finding[];
  allUsers: Record<string, string>;
};

export default function TeamTab({ assignees, findings, allUsers }: Props) {
  if (assignees.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-lg font-medium">No team members assigned</p>
        <p className="text-sm text-muted-foreground mt-1">Assign testers from the Projects page</p>
      </Card>
    );
  }

  return (
    <>
      <p className="text-muted-foreground">{assignees.length} member{assignees.length !== 1 ? 's' : ''} assigned</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignees.map((member, index) => {
          const resolvedName = allUsers[String(member.user_id)] || member.username || '';
          const sn = String(resolvedName).replace(/<[^>]*>/g, '').trim() || 'Unknown';
          const findingsByMember = findings.filter(f => String(f.created_by) === String(member.user_id)).length;
          const memberRole = member.role ?? null;
          const gradientClass = avatarGradientMap[memberRole ?? 'tester'] ?? 'from-orange-400 to-yellow-400';
          const badgeClass = roleStyleMap[memberRole ?? 'tester'] ?? roleStyleMap.tester;
          const roleLabel = memberRole ? memberRole.charAt(0).toUpperCase() + memberRole.slice(1) : 'Tester';

          return (
            <Card
              key={member.id}
              glow
              className="animate-fade-in hover:scale-[1.02] hover:shadow-lg transition-all group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-semibold text-lg shadow-lg shrink-0`}>
                    {sn.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate flex items-center gap-1">
                      {sn}
                      {memberRole === 'admin' && <Crown className="h-3 w-3 text-primary inline-block" />}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Bug className="h-3 w-3 shrink-0" />
                      <span>{findingsByMember} finding{findingsByMember !== 1 ? 's' : ''} reported</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(memberRole)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Assigned {new Date(member.assigned_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}