'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/app-shell';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useToast } from '@/components/feedback/toast';
import { ServerUserProfile } from '@/server/domain/user';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Eye,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function AdminUsersPage() {
  const router = useRouter();
  const { role, loading } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<ServerUserProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<ServerUserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  };

  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/login');
    }
  }, [loading, role, router]);

  const loadUsers = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setFetching(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load users list');
      }

      const json = await res.json();
      setUsers(json.data || []);
      setTotalCount(json.meta?.total || 0);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Error fetching user directory');
    } finally {
      setFetching(false);
    }
  }, [roleFilter, searchTerm, toastError]);

  useEffect(() => {
    if (role === 'admin') {
      loadUsers();
    }
  }, [role, loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleVerify = async (targetUser: ServerUserProfile) => {
    const token = getAuthToken();
    if (!token) return;

    const newVerified = !targetUser.verified;
    const actionLabel = newVerified ? 'verify' : 'unverify';
    const reason = window.prompt(
      `Please document a justification to ${actionLabel} ${targetUser.name}:`,
      newVerified ? 'Verified official agricultural KYC credentials' : 'Credentials require renewal'
    );

    if (!reason || reason.trim().length < 3) {
      toastError('Verification actions require a documented justification.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/admin/users/${targetUser.uid}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified: newVerified, reason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Verification update failed');
      }

      success(`User ${targetUser.name} ${newVerified ? 'verified' : 'unverified'} successfully.`);
      loadUsers();
      if (selectedUser?.uid === targetUser.uid) {
        setSelectedUser({ ...selectedUser, verified: newVerified });
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser: ServerUserProfile) => {
    const token = getAuthToken();
    if (!token) return;

    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    const reason = window.prompt(
      `Please state the reason for marking ${targetUser.name} as ${newStatus}:`,
      newStatus === 'suspended' ? 'Administrative compliance review' : 'Account restored by administrator'
    );

    if (!reason || reason.trim().length < 5) {
      toastError('Status adjustments require a clear documented reason.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/admin/users/${targetUser.uid}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Status adjustment failed');
      }

      success(`User ${targetUser.name} account is now ${newStatus}.`);
      loadUsers();
      if (selectedUser?.uid === targetUser.uid) {
        setSelectedUser({ ...selectedUser, status: newStatus as any });
      }
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (userRole: string) => {
    switch (userRole) {
      case 'farmer':
        return <Badge variant="success">Farmer</Badge>;
      case 'fpo':
        return <Badge variant="info">FPO</Badge>;
      case 'buyer':
        return <Badge variant="warning">Buyer</Badge>;
      case 'consumer':
        return <Badge variant="secondary">Consumer</Badge>;
      case 'logistics':
        return <Badge variant="info">Logistics</Badge>;
      case 'admin':
        return <Badge variant="error">Admin</Badge>;
      default:
        return <Badge variant="secondary">{userRole}</Badge>;
    }
  };

  return (
    <AppShell title="User Directory & Governance">
      <div className="space-y-6 max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Admin Dashboard', href: '/admin/dashboard' },
            { label: 'Users & KYC Governance' },
          ]}
        />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-foreground">Platform User Governance</h2>
            <p className="text-body-sm text-foreground/60 mt-0.5">
              Authoritative KYC verification, role segregation, and account status controls
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Overview
            </Button>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <GlassCard variant="strong" className="p-4 sm:p-5">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <Input
                label="Search Users"
                placeholder="Search by name, email, phone, Kisan ID, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-foreground/40" />}
              />
            </div>
            <div className="sm:col-span-4">
              <Select
                label="Filter by Role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { label: 'All Roles', value: 'all' },
                  { label: 'Farmers', value: 'farmer' },
                  { label: 'FPOs (Farmer Producer Orgs)', value: 'fpo' },
                  { label: 'Commercial Buyers', value: 'buyer' },
                  { label: 'Consumers', value: 'consumer' },
                  { label: 'Logistics Fleet', value: 'logistics' },
                  { label: 'Platform Administrators', value: 'admin' },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" size="md" className="w-full">
                Apply Filter
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Users Table */}
        <div className="rounded-2xl border border-surface-border bg-surface-elevated/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-surface-border bg-surface-elevated/70 text-caption text-foreground/60">
                  <th className="py-3.5 px-4 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">KYC Verification</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-body-sm">
                {fetching ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-foreground/50">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-400" />
                      Loading user directory...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-foreground/50">
                      No users match the specified criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.uid} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{u.name}</div>
                        <div className="text-caption text-foreground/50 font-mono">{u.email || u.uid}</div>
                        {u.organization && (
                          <div className="text-[11px] text-primary-400 mt-0.5">{u.organization}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                      <td className="py-3.5 px-4">
                        {u.verified ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified KYC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Pending Verification
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-caption text-foreground/70">
                        {u.location?.district ? `${u.location.district}, ${u.location.state}` : 'Not Specified'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUser(u)}
                            title="Inspect User Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleToggleVerify(u)}
                            title={u.verified ? 'Revoke verification' : 'Approve verification'}
                          >
                            {u.verified ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                          </Button>
                          {u.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleToggleStatus(u)}
                              className={u.status === 'active' ? 'hover:text-red-400' : 'hover:text-emerald-400'}
                              title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-elevated border border-surface-border rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h3 className="text-h4 font-bold text-foreground">{selectedUser.name}</h3>
                  <p className="text-caption text-foreground/50 font-mono">UID: {selectedUser.uid}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-foreground/60 hover:text-foreground p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-body-sm">
                <div>
                  <span className="text-caption text-foreground/60 block">Canonical Role</span>
                  <strong className="text-foreground">{selectedUser.role}</strong>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">Account Status</span>
                  <strong className={selectedUser.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>
                    {selectedUser.status}
                  </strong>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">Email Address</span>
                  <span className="text-foreground font-mono text-xs">{selectedUser.email || 'None'}</span>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">Phone Number</span>
                  <span className="text-foreground font-mono text-xs">{selectedUser.phone || 'None'}</span>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">Registration Date</span>
                  <span className="text-foreground">{selectedUser.joinedDate || 'Recent'}</span>
                </div>
                <div>
                  <span className="text-caption text-foreground/60 block">KYC Verification</span>
                  <span className={selectedUser.verified ? 'text-emerald-400' : 'text-amber-400'}>
                    {selectedUser.verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>

              {/* Role-Specific Identifiers */}
              {selectedUser.kisanId && (
                <div className="p-3 rounded-xl bg-surface-base border border-surface-border">
                  <span className="text-caption text-foreground/60 block">Kisan ID</span>
                  <span className="font-mono text-primary-300 font-semibold">{selectedUser.kisanId}</span>
                </div>
              )}
              {selectedUser.fpoRegNumber && (
                <div className="p-3 rounded-xl bg-surface-base border border-surface-border">
                  <span className="text-caption text-foreground/60 block">FPO Registration No.</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedUser.fpoRegNumber}</span>
                </div>
              )}
              {selectedUser.gstin && (
                <div className="p-3 rounded-xl bg-surface-base border border-surface-border">
                  <span className="text-caption text-foreground/60 block">GSTIN Identifier</span>
                  <span className="font-mono text-amber-300 font-semibold">{selectedUser.gstin}</span>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-surface-border">
                <Button variant="secondary" size="sm" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
