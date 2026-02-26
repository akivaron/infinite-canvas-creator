import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Mail, Crown, Edit3, Eye, X, Check, Clock,
  Copy, Trash2, Shield, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollaborationContext } from '@/contexts/CollaborationContext';
import * as collaboration from '@/lib/collaboration';
import { useToast } from '@/hooks/use-toast';

interface CollaborationPanelProps {
  projectId: string;
  onClose: () => void;
}

export function CollaborationPanel({ projectId, onClose }: CollaborationPanelProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);

  const { collaborators, activeUsers, refreshCollaborators } = useCollaborationContext();
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsInviting(true);

    const result = await collaboration.inviteUser(projectId, inviteEmail, inviteRole);

    if (result.success && result.invitation) {
      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${inviteEmail}`,
      });

      const inviteLink = `${window.location.origin}/invite/${result.invitation.token}`;

      navigator.clipboard.writeText(inviteLink).then(() => {
        toast({
          title: 'Link Copied',
          description: 'Invitation link copied to clipboard',
        });
      });

      setInviteEmail('');
      refreshCollaborators();
    } else {
      toast({
        title: 'Invitation Failed',
        description: result.error || 'Failed to send invitation',
        variant: 'destructive',
      });
    }

    setIsInviting(false);
  };

  const handleRemove = async (collaboratorId: string) => {
    const result = await collaboration.removeCollaborator(collaboratorId, projectId);

    if (result.success) {
      toast({
        title: 'Collaborator Removed',
        description: 'User has been removed from the project',
      });
      refreshCollaborators();
    } else {
      toast({
        title: 'Failed to Remove',
        description: result.error || 'Failed to remove collaborator',
        variant: 'destructive',
      });
    }
  };

  const loadInvitations = async () => {
    const result = await collaboration.listInvitations(projectId);
    if (result.success && result.invitations) {
      setInvitations(result.invitations);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const result = await collaboration.revokeInvitation(invitationId);
    if (result.success) {
      toast({ title: 'Invitation Revoked' });
      loadInvitations();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor':
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            Active
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Collaboration</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite User
          </h3>

          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInvite();
              }}
            />

            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                <option value="editor">Editor - Can edit</option>
                <option value="viewer">Viewer - Read only</option>
              </select>
              <Button onClick={handleInvite} disabled={isInviting}>
                <Mail className="w-4 h-4 mr-2" />
                Invite
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team ({collaborators.length})
            </h3>
            <button
              onClick={() => {
                setShowInvitations(!showInvitations);
                if (!showInvitations) loadInvitations();
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showInvitations ? 'Hide' : 'Show'} Invitations
            </button>
          </div>

          <div className="space-y-2">
            {collaborators.map((collaborator) => {
              const isActive = activeUsers.some((u) => u.user_id === collaborator.user_id);

              return (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {collaborator.user?.email || 'Unknown'}
                        </span>
                        {getRoleIcon(collaborator.role)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getStatusBadge(collaborator.status)}
                        {isActive && <span>• Online</span>}
                      </div>
                    </div>
                  </div>

                  {collaborator.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(collaborator.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}

            {collaborators.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No collaborators yet. Invite someone to get started!
              </div>
            )}
          </div>
        </div>

        {showInvitations && invitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Pending Invitations ({invitations.filter((i) => i.status === 'pending').length})
            </h3>

            <div className="space-y-2">
              {invitations
                .filter((i) => i.status === 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{invitation.email}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {getRoleIcon(invitation.role)}
                        {invitation.role}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}/invite/${invitation.token}`;
                          navigator.clipboard.writeText(link);
                          toast({ title: 'Link Copied' });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
