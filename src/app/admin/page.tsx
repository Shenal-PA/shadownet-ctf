'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface OverviewStats {
  totalUsers: number;
  totalPlayers: number;
  totalAdmins: number;
  totalChallenges: number;
  activeChallenges: number;
  totalSubmissions: number;
  totalSolves: number;
  solveRate: number;
}

interface Hint {
  id: number;
  challenge_id: number;
  hint_level: number;
  hint_text: string;
  point_penalty: number;
}

interface Challenge {
  id: number;
  name: string;
  domain: string;
  difficulty: string;
  description: string;
  points: number;
  delivery_method: string;
  stage_number: number;
  is_active: boolean;
  flag_hash?: string;
  hints?: Hint[];
  default_hints?: Hint[];
}

interface Operative {
  id: string;
  username: string;
  email: string;
  team_name: string;
  is_admin: boolean;
  created_at: string;
  total_points: number;
  challenges_solved: number;
  last_submission_at: string | null;
}

interface OperativeDossier extends Operative {
  total_attempts: number;
  solved_challenges: Array<{
    challenge_id: number;
    name: string;
    stage_number: number;
    points: number;
    domain: string;
    difficulty: string;
    solved_at: string;
  }>;
  submission_history: Array<{
    id: string | number;
    challenge_id: number;
    challenge_name: string;
    stage_number: number;
    submitted_flag: string;
    is_correct: boolean;
    created_at: string;
  }>;
}

interface SubmissionLog {
  id: string | number;
  user_id?: string;
  username: string;
  challenge_id?: number;
  challenge_name: string;
  stage_number: number;
  submitted_flag: string;
  is_correct: boolean;
  submitted_at?: string;
  created_at?: string;
}

function formatTimestamp(ts?: string | null, withDate = true): string {
  if (!ts) return 'N/A';
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 'N/A' : (withDate ? d.toLocaleString() : d.toLocaleTimeString());
  } catch {
    return 'N/A';
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'operatives' | 'submissions' | 'danger'>('overview');

  // Overview Data
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Challenges Data
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [newChallengeForm, setNewChallengeForm] = useState({
    name: '',
    stage_number: 1,
    domain: 'Web Exploitation',
    difficulty: 'easy',
    points: 100,
    delivery_method: 'Docker',
    description: '',
    raw_flag: '',
    is_active: true,
    initial_hint_text: '',
    initial_hint_cost: 40,
  });

  // Hints Management State
  const [activeHintChallengeId, setActiveHintChallengeId] = useState<number | null>(null);
  const [showAddHintFor, setShowAddHintFor] = useState<number | null>(null);
  const [newHintForm, setNewHintForm] = useState({
    hint_level: 1,
    hint_text: '',
    point_penalty: 40,
  });
  const [editingHint, setEditingHint] = useState<Hint | null>(null);

  // Operatives Data
  const [operatives, setOperatives] = useState<Operative[]>([]);
  const [searchOperative, setSearchOperative] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<OperativeDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Submissions Data
  const [submissions, setSubmissions] = useState<SubmissionLog[]>([]);

  // State feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // 1. Check Authentication & Clearance
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data?.user?.is_admin) {
          setCurrentUser(res.data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // 2. Fetch Tab Specific Data
  const fetchOverview = async () => {
    try {
      const res = await axios.get('/api/admin/overview');
      setStats(res.data.stats);
      setRecentLogs(res.data.recentSubmissions || []);
    } catch (err: any) {
      console.error('Fetch overview error:', err);
    }
  };

  const fetchChallenges = async () => {
    try {
      const res = await axios.get('/api/admin/challenges');
      setChallenges(res.data.challenges || []);
    } catch (err: any) {
      console.error('Fetch challenges error:', err);
    }
  };

  const fetchOperatives = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setOperatives(res.data.users || []);
    } catch (err: any) {
      console.error('Fetch operatives error:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axios.get('/api/admin/submissions');
      setSubmissions(res.data.submissions || []);
    } catch (err: any) {
      console.error('Fetch submissions error:', err);
    }
  };

  const handleRefreshAll = async () => {
    setLoadingAction(true);
    await Promise.allSettled([
      fetchOverview(),
      fetchChallenges(),
      fetchOperatives(),
      fetchSubmissions(),
    ]);
    setLoadingAction(false);
  };

  useEffect(() => {
    if (!currentUser?.is_admin) return;

    fetchOverview();
    fetchChallenges();
    fetchOperatives();

    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab, currentUser]);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setActionMessage(null);
    } else {
      setActionMessage(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionMessage(null);
      setActionError(null);
    }, 4500);
  };

  // Open User Dossier Details
  const handleOpenDossier = async (userId: string) => {
    try {
      setLoadingDossier(true);
      const res = await axios.get(`/api/admin/users/${userId}`);
      setSelectedDossier(res.data.operative);
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to load operative dossier', true);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Delete a Player / Normal User
  const handleDeleteUser = async (userId: string, username: string) => {
    const confirmed = window.confirm(
      `CRITICAL CONFIRMATION: Are you sure you want to permanently DELETE operative "${username}"?\nThis will purge their account, score, and all submission logs.`
    );
    if (!confirmed) return;

    try {
      setLoadingAction(true);
      const res = await axios.delete(`/api/admin/users?id=${userId}`);
      showNotification(res.data.message || `Operative ${username} removed successfully.`);
      if (selectedDossier?.id === userId) {
        setSelectedDossier(null);
      }
      fetchOperatives();
      fetchOverview();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to delete operative', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Reset an Individual Operative's Score
  const handleResetUserScore = async (userId: string, username: string) => {
    const confirmed = window.confirm(
      `Confirm score reset for "${username}". Points will be set to 0 and solve history cleared.`
    );
    if (!confirmed) return;

    try {
      setLoadingAction(true);
      const res = await axios.patch('/api/admin/users', { id: userId, action: 'reset_score' });
      showNotification(res.data.message || `Score reset for ${username}`);
      if (selectedDossier?.id === userId) {
        handleOpenDossier(userId);
      }
      fetchOperatives();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to reset score', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Toggle Operative Admin Role
  const handleToggleAdminRole = async (op: Operative) => {
    if (op.id === currentUser?.id) {
      showNotification('Cannot revoke your own administrative status!', true);
      return;
    }
    try {
      setLoadingAction(true);
      await axios.patch('/api/admin/users', {
        id: op.id,
        is_admin: !op.is_admin,
      });
      showNotification(`Privileges updated for operative: ${op.username}`);
      if (selectedDossier?.id === op.id) {
        handleOpenDossier(op.id);
      }
      fetchOperatives();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to update operative role', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Toggle Challenge Active State
  const handleToggleChallenge = async (challenge: Challenge) => {
    try {
      setLoadingAction(true);
      await axios.patch('/api/admin/challenges', {
        id: challenge.id,
        is_active: !challenge.is_active,
      });
      showNotification(`Stage ${challenge.stage_number} is now ${!challenge.is_active ? 'ACTIVE' : 'DEACTIVATED'}`);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to update challenge status', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Save Challenge Edits
  const handleSaveChallengeConfig = async () => {
    if (!editingChallenge) return;
    try {
      setLoadingAction(true);
      const payload: any = {
        id: editingChallenge.id,
        name: editingChallenge.name,
        stage_number: editingChallenge.stage_number,
        domain: editingChallenge.domain,
        difficulty: editingChallenge.difficulty,
        points: editingChallenge.points,
        delivery_method: editingChallenge.delivery_method,
        description: editingChallenge.description,
        is_active: editingChallenge.is_active,
      };
      if (editingChallenge.flag_hash && editingChallenge.flag_hash.startsWith('RAW:')) {
        payload.new_raw_flag = editingChallenge.flag_hash.replace('RAW:', '').trim();
      }
      await axios.patch('/api/admin/challenges', payload);
      showNotification(`Challenge "${editingChallenge.name}" updated successfully`);
      setEditingChallenge(null);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to update challenge', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Create Challenge
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingAction(true);
      const payload: any = {
        name: newChallengeForm.name,
        stage_number: newChallengeForm.stage_number,
        domain: newChallengeForm.domain,
        difficulty: newChallengeForm.difficulty,
        points: newChallengeForm.points,
        delivery_method: newChallengeForm.delivery_method,
        description: newChallengeForm.description,
        raw_flag: newChallengeForm.raw_flag,
        is_active: newChallengeForm.is_active,
      };
      if (newChallengeForm.initial_hint_text && newChallengeForm.initial_hint_text.trim()) {
        payload.hints = [
          {
            hint_level: 1,
            hint_text: newChallengeForm.initial_hint_text.trim(),
            point_penalty: newChallengeForm.initial_hint_cost,
          },
        ];
      }
      await axios.post('/api/admin/challenges', payload);
      showNotification(`New challenge "${newChallengeForm.name}" created successfully!`);
      setShowCreateChallengeModal(false);
      setNewChallengeForm({
        name: '',
        stage_number: challenges.length + 1,
        domain: 'Web Exploitation',
        difficulty: 'easy',
        points: 100,
        delivery_method: 'Docker',
        description: '',
        raw_flag: '',
        is_active: true,
        initial_hint_text: '',
        initial_hint_cost: 40,
      });
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to create challenge', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete Challenge
  const handleDeleteChallenge = async (challengeId: number, challengeName: string) => {
    const confirmed = window.confirm(
      `DANGER: Are you sure you want to permanently delete challenge "${challengeName}" (#${challengeId})?\nAll hints and related submissions will also be deleted.`
    );
    if (!confirmed) return;

    try {
      setLoadingAction(true);
      await axios.delete(`/api/admin/challenges?id=${challengeId}`);
      showNotification(`Challenge "${challengeName}" deleted.`);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to delete challenge', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Add Hint to a Challenge
  const handleAddHint = async (challengeId: number) => {
    if (!newHintForm.hint_text.trim()) {
      showNotification('Hint text cannot be empty', true);
      return;
    }
    try {
      setLoadingAction(true);
      const res = await axios.post('/api/admin/hints', {
        challenge_id: challengeId,
        hint_level: newHintForm.hint_level,
        hint_text: newHintForm.hint_text.trim(),
        point_penalty: newHintForm.point_penalty,
      });
      showNotification(res.data.message || 'Hint added successfully');
      setShowAddHintFor(null);
      setNewHintForm({
        hint_level: 1,
        hint_text: '',
        point_penalty: 40,
      });
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to add hint', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Update existing Hint
  const handleUpdateHint = async () => {
    if (!editingHint || !editingHint.hint_text.trim()) {
      showNotification('Hint text cannot be empty', true);
      return;
    }
    try {
      setLoadingAction(true);
      const res = await axios.patch('/api/admin/hints', {
        id: editingHint.id,
        hint_level: editingHint.hint_level,
        hint_text: editingHint.hint_text.trim(),
        point_penalty: editingHint.point_penalty,
      });
      showNotification(res.data.message || 'Hint updated successfully');
      setEditingHint(null);
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to update hint', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete Hint
  const handleDeleteHint = async (hintId: number, hintLevel: number) => {
    const confirmed = window.confirm(`Are you sure you want to delete Hint #${hintLevel}?`);
    if (!confirmed) return;
    try {
      setLoadingAction(true);
      const res = await axios.delete(`/api/admin/hints?id=${hintId}`);
      showNotification(res.data.message || 'Hint deleted successfully');
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to delete hint', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Import Default Hints for a Stage
  const handleImportDefaultHints = async (challengeId: number, stageNumber: number) => {
    const confirmed = window.confirm(
      `Import predefined default hints for Stage 0${stageNumber} into the database? Operatives will immediately have access to them.`
    );
    if (!confirmed) return;
    try {
      setLoadingAction(true);
      const res = await axios.post('/api/admin/hints', {
        challenge_id: challengeId,
        stage_number: stageNumber,
        action: 'import_defaults',
      });
      showNotification(res.data.message || 'Default hints imported');
      fetchChallenges();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to import default hints', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // Reset Leaderboard Scores
  const handleResetScores = async () => {
    const confirmed = window.confirm(
      'WARNING: Are you sure you want to reset all operative scores and wipe submission history? This action cannot be undone!'
    );
    if (!confirmed) return;

    try {
      setLoadingAction(true);
      const res = await axios.post('/api/admin/reset', { action: 'reset_scores' });
      showNotification(res.data.message || 'Scores reset successfully');
      fetchOverview();
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to execute score reset', true);
    } finally {
      setLoadingAction(false);
    }
  };

  // 3. Render Locked Screen if Not Admin
  if (authChecking) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 font-mono text-center">
          <div className="w-12 h-12 rounded-xl bg-[#171B20] border border-[#FF6B00] animate-spin flex items-center justify-center text-[#FF6B00] text-xl">
            ⚡
          </div>
          <span className="text-[#8B949E] text-xs tracking-widest uppercase">
            VERIFYING COMMAND CLEARANCE...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser?.is_admin) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111417] border border-[#EF4444]/40 rounded-2xl p-8 sm:p-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#EF4444]"></div>
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444] text-[#EF4444] text-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            🚫
          </div>
          <div className="inline-block px-3 py-1 bg-[#090B0D] border border-[#EF4444]/40 rounded-full text-[10px] font-mono text-[#EF4444] uppercase tracking-widest mb-3">
            CLEARANCE REFUSED // ERROR 403
          </div>
          <h2 className="font-mono text-2xl font-black text-[#F5F5F5] mb-3">
            RESTRICTED ACCESS
          </h2>
          <p className="text-xs text-[#8B949E] leading-relaxed mb-6 font-sans">
            Administrative privileges required to access the ShadowNet Control Matrix. Your callsign does not possess Tier-5 command authorization.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="btn-primary w-full py-3 text-xs font-mono font-bold"
            >
              AUTHENTICATE AS ADMIN →
            </Link>
            <Link
              href="/dashboard/challenges"
              className="btn-secondary w-full py-3 text-xs font-mono"
            >
              RETURN TO OPERATIVE DASHBOARD
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Admin Dashboard
  return (
    <div className="admin-console w-full py-6 sm:py-9">
      {/* Notifications */}
      {actionMessage && (
        <div className="mb-6 p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 font-mono text-xs text-[#22C55E] flex items-center justify-between shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-fade-in">
          <div className="flex items-center gap-3">
            <span>✅</span>
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-[#8B949E] hover:text-[#F5F5F5]">✕</button>
        </div>
      )}
      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 font-mono text-xs text-[#EF4444] flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-fade-in">
          <div className="flex items-center gap-3">
            <span>⚠️</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-[#8B949E] hover:text-[#F5F5F5]">✕</button>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111417] border border-[#252A30] mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9FEF00] via-[#9FEF00] to-[#9FEF00]"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-[#EF4444]/15 border border-[#EF4444]/40 rounded-full text-[10px] font-mono font-bold text-[#EF4444] tracking-widest uppercase">
                SUPREME COMMAND ACCESS
              </span>
              <span className="text-[#8B949E] text-xs font-mono">
                CALLSIGN: <span className="text-[#F5F5F5] font-bold">{currentUser.username}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#171B20] border border-[#252A30] text-[10px] font-mono text-[#FF8533]">
                LEADERBOARD: EXCLUDED (ADMIN NOT PLAYER)
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-mono text-[#F5F5F5] tracking-tight">
              SHADOW<span className="text-[#FF6B00]">COMMAND</span> {'//'} PLATFORM CONTROLLER
            </h1>
            <p className="text-xs sm:text-sm text-[#8B949E] mt-1 max-w-2xl font-sans">
              Full enterprise CTF management: operative dossiers & player removal, stage CRUD & dynamic flag hashes, live telemetry, and scoring governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#171B20] border border-[#252A30] rounded-xl text-xs font-mono text-[#FF8533]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping"></span>
              CORE_ENGINE: ARMED
            </div>
            <button
              onClick={handleRefreshAll}
              disabled={loadingAction}
              className="btn-secondary text-xs font-mono px-4 py-2 flex items-center gap-2"
            >
              🔄 REFRESH DATA
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#252A30] pb-4 mb-8 font-mono text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          aria-pressed={activeTab === 'overview'}
          className="admin-tab"
        >
          📊 TELEMETRY OVERVIEW
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          aria-pressed={activeTab === 'challenges'}
          className="admin-tab"
        >
          🎯 MANAGE CHALLENGES ({challenges.length})
        </button>
        <button
          onClick={() => setActiveTab('operatives')}
          aria-pressed={activeTab === 'operatives'}
          className="admin-tab"
        >
          👥 MANAGE OPERATIVES ({operatives.length})
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          aria-pressed={activeTab === 'submissions'}
          className="admin-tab"
        >
          📋 SUBMISSIONS AUDIT
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          aria-pressed={activeTab === 'danger'}
          className="admin-tab admin-tab--danger"
        >
          ⚠️ DANGER ZONE
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] relative overflow-hidden">
              <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-2">
                ACTIVE PLAYERS (NON-ADMIN)
              </div>
              <div className="text-3xl font-black font-mono text-[#F5F5F5]">
                {stats?.totalPlayers ?? '...'}
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#FF8533]">
                {stats?.totalAdmins ?? 1} COMMAND ADMIN(S) (EXCLUDED FROM RANKS)
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] relative overflow-hidden">
              <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-2">
                CHALLENGE STAGES
              </div>
              <div className="text-3xl font-black font-mono text-[#FF6B00]">
                {stats?.activeChallenges ?? '...'}{' '}
                <span className="text-base text-[#8B949E] font-normal">/ {stats?.totalChallenges ?? '...'}</span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#22C55E]">
                STAGES ARMED & ACTIVE
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] relative overflow-hidden">
              <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-2">
                SUCCESSFUL SOLVES
              </div>
              <div className="text-3xl font-black font-mono text-[#22C55E]">
                {stats?.totalSolves ?? '...'}
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#8B949E]">
                CONFIRMED FLAGS BREACHED
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] relative overflow-hidden">
              <div className="text-xs font-mono text-[#8B949E] uppercase tracking-wider mb-2">
                SOLVE ACCURACY RATE
              </div>
              <div className="text-3xl font-black font-mono text-[#FF9F43]">
                {stats?.solveRate ?? '0'}%
              </div>
              <div className="mt-2 text-[11px] font-mono text-[#8B949E]">
                OF {stats?.totalSubmissions ?? '0'} TOTAL ATTEMPTS
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30]">
            <h3 className="text-base font-mono font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
              <span className="text-[#FF8533]">⚡</span> PLATFORM & COMPETITION CONTROLS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                <div className="text-[#8B949E] mb-1">LEADERBOARD ISOLATION</div>
                <div className="text-[#22C55E] font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
                  ADMINS FILTERED OUT
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                <div className="text-[#8B949E] mb-1">USER DELETION PRIVILEGE</div>
                <div className="text-[#FF8533] font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF8533]"></span>
                  ENABLED WITH CASCADE PURGE
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                <div className="text-[#8B949E] mb-1">STAGE PROGRESSION MODE</div>
                <div className="text-[#FF6B00] font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B00]"></span>
                  SEQUENTIAL UNLOCK ENFORCED
                </div>
              </div>
            </div>
          </div>

          {/* Recent Submissions Feed */}
          <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-mono font-bold text-[#F5F5F5] flex items-center gap-2">
                <span className="text-[#FF6B00]">●</span> RECENT SUBMISSION ACTIVITY
              </h3>
              <button
                onClick={() => setActiveTab('submissions')}
                className="text-xs font-mono text-[#FF8533] hover:underline"
              >
                VIEW FULL AUDIT LOG →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#252A30] text-[#8B949E]">
                    <th className="pb-3 font-semibold">TIME</th>
                    <th className="pb-3 font-semibold">OPERATIVE</th>
                    <th className="pb-3 font-semibold">CHALLENGE</th>
                    <th className="pb-3 font-semibold">SUBMITTED FLAG</th>
                    <th className="pb-3 font-semibold text-right">RESULT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252A30]/50">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#8B949E]">
                        No submissions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#171B20]/40 transition-colors">
                        <td className="py-3 text-[#8B949E]">
                          {formatTimestamp(log.submitted_at || log.created_at, false)}
                        </td>
                        <td className="py-3 text-[#F5F5F5] font-bold">
                          {log.username}
                        </td>
                        <td className="py-3 text-[#FF8533]">
                          {log.challenge_name}
                        </td>
                        <td className="py-3 text-[#8B949E] max-w-[200px] truncate font-mono">
                          {log.submitted_flag}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              log.is_correct
                                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40'
                                : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40'
                            }`}
                          >
                            {log.is_correct ? 'CORRECT' : 'FAILED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHALLENGES */}
      {activeTab === 'challenges' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-mono font-bold text-[#F5F5F5]">
                CHALLENGE MATRIX & STAGE MANAGEMENT
              </h2>
              <p className="text-xs text-[#8B949E] font-sans mt-0.5">
                Create new stages, reconfigure point rewards, edit descriptions, adjust difficulty, and update flag hashes.
              </p>
            </div>
            <button
              onClick={() => {
                setNewChallengeForm({
                  name: '',
                  stage_number: challenges.length + 1,
                  domain: 'Web Exploitation',
                  difficulty: 'easy',
                  points: 100,
                  delivery_method: 'Docker',
                  description: '',
                  raw_flag: '',
                  is_active: true,
                });
                setShowCreateChallengeModal(true);
              }}
              className="btn-primary text-xs font-mono px-4 py-2.5 flex items-center gap-2"
            >
              ➕ CREATE NEW STAGE
            </button>
          </div>

          {/* Modal / Form: Create Challenge */}
          {showCreateChallengeModal && (
            <div className="p-6 rounded-2xl bg-[#111417] border border-[#FF6B00]/40 space-y-4 shadow-[0_0_40px_rgba(255,107,0,0.15)]">
              <div className="flex items-center justify-between border-b border-[#252A30] pb-3">
                <h3 className="text-sm font-mono font-bold text-[#FF6B00]">
                  ➕ NEW STAGE DEPLOYMENT
                </h3>
                <button
                  onClick={() => setShowCreateChallengeModal(false)}
                  className="text-xs text-[#8B949E] hover:text-[#F5F5F5]"
                >
                  ✕ CANCEL
                </button>
              </div>

              <form onSubmit={handleCreateChallenge} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                  <div>
                    <label className="block text-[#8B949E] mb-1">STAGE NUMBER</label>
                    <input
                      type="number"
                      required
                      value={newChallengeForm.stage_number}
                      onChange={(e) => setNewChallengeForm({ ...newChallengeForm, stage_number: parseInt(e.target.value) || 1 })}
                      className="cyber-input text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[#8B949E] mb-1">CHALLENGE NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operation Deep Water"
                      value={newChallengeForm.name}
                      onChange={(e) => setNewChallengeForm({ ...newChallengeForm, name: e.target.value })}
                      className="cyber-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
                  <div>
                    <label className="block text-[#8B949E] mb-1">DOMAIN</label>
                    <select
                      value={newChallengeForm.domain}
                      onChange={(e) => setNewChallengeForm({ ...newChallengeForm, domain: e.target.value })}
                      className="cyber-input text-xs bg-[#171B20]"
                    >
                      <option value="Web Exploitation">Web Exploitation</option>
                      <option value="Cryptography">Cryptography</option>
                      <option value="Network & Pivot">Network & Pivot</option>
                      <option value="Reverse Engineering">Reverse Engineering</option>
                      <option value="Forensics">Forensics</option>
                      <option value="Privilege Escalation">Privilege Escalation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8B949E] mb-1">DIFFICULTY</label>
                    <select
                      value={newChallengeForm.difficulty}
                      onChange={(e) => setNewChallengeForm({ ...newChallengeForm, difficulty: e.target.value })}
                      className="cyber-input text-xs bg-[#171B20]"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="insane">Insane</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8B949E] mb-1">POINTS (XP)</label>
                    <input
                      type="number"
                      required
                      value={newChallengeForm.points}
                      onChange={(e) => setNewChallengeForm({ ...newChallengeForm, points: parseInt(e.target.value) || 0 })}
                      className="cyber-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8B949E] mb-1">DELIVERY METHOD</label>
                    <input
                      type="text"
                      placeholder="e.g. Docker, VM, Static"
                      value={newChallengeForm.delivery_method}
                      onChange={(e) => setNewChallengeForm({ ...newChallengeForm, delivery_method: e.target.value })}
                      className="cyber-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#8B949E] mb-1">DESCRIPTION & SCENARIO</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Brief the operatives on their target and objectives..."
                    value={newChallengeForm.description}
                    onChange={(e) => setNewChallengeForm({ ...newChallengeForm, description: e.target.value })}
                    className="cyber-input text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#8B949E] mb-1">SECRET FLAG (AUTO SHA-256 HASHED)</label>
                  <input
                    type="text"
                    required
                    placeholder="SN{custom_secret_flag_value}"
                    value={newChallengeForm.raw_flag}
                    onChange={(e) => setNewChallengeForm({ ...newChallengeForm, raw_flag: e.target.value })}
                    className="cyber-input text-xs font-mono"
                  />
                </div>

                {/* Optional Initial Tactical Hint */}
                <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono font-bold text-[#FF8533]">
                      💡 INITIAL TACTICAL HINT (OPTIONAL)
                    </label>
                    <span className="text-[10px] font-mono text-[#8B949E]">
                      You can also add or edit hints anytime from the challenge card
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div className="sm:col-span-3">
                      <label className="block text-[#8B949E] mb-1">HINT INTEL DESCRIPTION</label>
                      <input
                        type="text"
                        placeholder="e.g. Inspect the hidden metadata inside public download files..."
                        value={newChallengeForm.initial_hint_text}
                        onChange={(e) => setNewChallengeForm({ ...newChallengeForm, initial_hint_text: e.target.value })}
                        className="cyber-input text-xs font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8B949E] mb-1">XP COST (PENALTY)</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={newChallengeForm.initial_hint_cost}
                          onChange={(e) => setNewChallengeForm({ ...newChallengeForm, initial_hint_cost: parseInt(e.target.value) || 0 })}
                          className="cyber-input text-xs"
                        />
                        <span className="text-[11px] text-[#F59E0B] font-bold">XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="btn-primary text-xs px-6 py-2.5 font-mono font-bold"
                  >
                    DEPLOY STAGE TO PLATFORM →
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateChallengeModal(false)}
                    className="btn-secondary text-xs px-4 py-2.5 font-mono"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Challenges List */}
          <div className="grid grid-cols-1 gap-4">
            {challenges.map((c) => {
              const isEditing = editingChallenge?.id === c.id;

              return (
                <div
                  key={c.id}
                  className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] flex flex-col lg:flex-row lg:items-start justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-xs font-mono font-bold text-[#FF6B00]">
                        STAGE {c.stage_number}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#171B20] border border-[#252A30] text-[11px] font-mono text-[#8B949E]">
                        {c.domain}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#171B20] border border-[#252A30] text-[11px] font-mono text-[#FF8533]">
                        {c.delivery_method}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          c.is_active
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40'
                        }`}
                      >
                        {c.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </div>

                    {!isEditing ? (
                      <>
                        <h3 className="text-lg font-mono font-bold text-[#F5F5F5]">
                          {c.name}
                        </h3>
                        <p className="text-xs text-[#8B949E] mt-1 max-w-3xl font-sans">
                          {c.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-mono text-[#8B949E]">
                          <div>
                            REWARD: <span className="text-[#FF6B00] font-bold">{c.points} XP</span>
                          </div>
                          <div>
                            DIFFICULTY: <span className="text-[#F5F5F5] uppercase">{c.difficulty}</span>
                          </div>
                          {c.flag_hash && (
                            <div className="text-[11px] text-[#8B949E] truncate max-w-sm">
                              HASH: <span className="text-[#FF8533]">{c.flag_hash.substring(0, 16)}...</span>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* Full Edit Form */
                      <div className="mt-2 p-5 rounded-xl bg-[#171B20] border border-[#FF6B00]/40 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                          <div>
                            <label className="block text-[#8B949E] mb-1">STAGE #</label>
                            <input
                              type="number"
                              value={editingChallenge.stage_number}
                              onChange={(e) =>
                                setEditingChallenge({
                                  ...editingChallenge,
                                  stage_number: parseInt(e.target.value) || 1,
                                })
                              }
                              className="cyber-input text-xs"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[#8B949E] mb-1">NAME</label>
                            <input
                              type="text"
                              value={editingChallenge.name}
                              onChange={(e) =>
                                setEditingChallenge({
                                  ...editingChallenge,
                                  name: e.target.value,
                                })
                              }
                              className="cyber-input text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                          <div>
                            <label className="block text-[#8B949E] mb-1">POINTS (XP)</label>
                            <input
                              type="number"
                              value={editingChallenge.points}
                              onChange={(e) =>
                                setEditingChallenge({
                                  ...editingChallenge,
                                  points: parseInt(e.target.value) || 0,
                                })
                              }
                              className="cyber-input text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[#8B949E] mb-1">DIFFICULTY</label>
                            <select
                              value={editingChallenge.difficulty}
                              onChange={(e) =>
                                setEditingChallenge({
                                  ...editingChallenge,
                                  difficulty: e.target.value,
                                })
                              }
                              className="cyber-input text-xs bg-[#111417]"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                              <option value="insane">Insane</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8B949E] mb-1">DELIVERY</label>
                            <input
                              type="text"
                              value={editingChallenge.delivery_method}
                              onChange={(e) =>
                                setEditingChallenge({
                                  ...editingChallenge,
                                  delivery_method: e.target.value,
                                })
                              }
                              className="cyber-input text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-[#8B949E] mb-1">DESCRIPTION</label>
                          <textarea
                            rows={3}
                            value={editingChallenge.description}
                            onChange={(e) =>
                              setEditingChallenge({
                                ...editingChallenge,
                                description: e.target.value,
                              })
                            }
                            className="cyber-input text-xs font-sans"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-[#8B949E] mb-1">
                            OVERRIDE FLAG (ENTER RAW FLAG TO COMPUTE NEW SHA-256 HASH)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. SN{new_custom_flag_here}"
                            onChange={(e) =>
                              setEditingChallenge({
                                ...editingChallenge,
                                flag_hash: e.target.value ? `RAW:${e.target.value}` : c.flag_hash,
                              })
                            }
                            className="cyber-input text-xs font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={handleSaveChallengeConfig}
                            disabled={loadingAction}
                            className="btn-primary text-xs px-4 py-2 font-mono font-bold"
                          >
                            SAVE CHANGES
                          </button>
                          <button
                            onClick={() => setEditingChallenge(null)}
                            className="btn-secondary text-xs px-4 py-2 font-mono"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stage Action Controls */}
                  <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/dashboard/challenges/${c.id}`}
                      className="w-full btn-primary text-xs font-mono px-4 py-2 flex items-center justify-center gap-1.5 text-center"
                    >
                      OPEN STAGE →
                    </Link>

                    <button
                      onClick={() => handleToggleChallenge(c)}
                      disabled={loadingAction}
                      className={`w-full text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all ${
                        c.is_active
                          ? 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/40'
                          : 'bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/40'
                      }`}
                    >
                      {c.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                    </button>

                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingChallenge(null);
                        } else {
                          setEditingChallenge({ ...c });
                        }
                      }}
                      className="w-full btn-secondary text-xs font-mono px-4 py-2"
                    >
                      {isEditing ? 'CLOSE' : 'EDIT STAGE'}
                    </button>

                    <button
                      onClick={() => handleDeleteChallenge(c.id, c.name)}
                      disabled={loadingAction}
                      className="w-full text-xs font-mono text-[#8B949E] hover:text-[#EF4444] px-4 py-1.5 hover:bg-[#EF4444]/10 rounded-lg transition-colors"
                    >
                      🗑️ DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: OPERATIVES & PLAYER MANAGEMENT */}
      {activeTab === 'operatives' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-mono font-bold text-[#F5F5F5]">
                OPERATIVE & PLAYER CLEARANCE ROSTER
              </h2>
              <p className="text-xs text-[#8B949E] font-sans mt-0.5">
                Inspect complete player dossiers, review solved stages and submission audits, reset scores, or purge accounts.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search callsign or team..."
                value={searchOperative}
                onChange={(e) => setSearchOperative(e.target.value)}
                className="cyber-input text-xs"
              />
            </div>
          </div>

          {/* Dossier Modal / Drawer */}
          {selectedDossier && (
            <div className="p-6 rounded-2xl bg-[#111417] border border-[#FF8533]/50 shadow-[0_0_50px_rgba(34,211,238,0.15)] space-y-6 animate-fade-in relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#252A30] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-[#FF8533]/15 border border-[#FF8533]/40 text-[10px] font-mono text-[#FF8533]">
                      DOSSIER // {selectedDossier.id}
                    </span>
                    {selectedDossier.is_admin ? (
                      <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 border border-[#EF4444]/40 text-[10px] font-mono font-bold text-[#EF4444]">
                        ADMINISTRATOR
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#22C55E]/15 border border-[#22C55E]/40 text-[10px] font-mono font-bold text-[#22C55E]">
                        COMPETITIVE PLAYER
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-mono font-black text-[#F5F5F5]">
                    {selectedDossier.username}
                  </h3>
                  <div className="text-xs font-mono text-[#8B949E] mt-0.5 flex flex-wrap gap-3">
                    <span>EMAIL: <strong className="text-[#F5F5F5]">{selectedDossier.email}</strong></span>
                    <span>TEAM: <strong className="text-[#FF8533]">{selectedDossier.team_name || 'Solo Operative'}</strong></span>
                    <span>REGISTERED: <strong className="text-[#8B949E]">{new Date(selectedDossier.created_at).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedDossier.is_admin && (
                    <button
                      onClick={() => handleDeleteUser(selectedDossier.id, selectedDossier.username)}
                      disabled={loadingAction}
                      className="px-4 py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/50 font-mono text-xs font-bold transition-all"
                    >
                      🗑️ PURGE OPERATIVE
                    </button>
                  )}
                  <button
                    onClick={() => handleResetUserScore(selectedDossier.id, selectedDossier.username)}
                    disabled={loadingAction}
                    className="btn-secondary text-xs font-mono px-3 py-2"
                  >
                    RESET SCORE (0 XP)
                  </button>
                  <button
                    onClick={() => setSelectedDossier(null)}
                    className="p-2 rounded-lg bg-[#171B20] text-[#8B949E] hover:text-[#F5F5F5]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Stats overview for user */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                  <div className="text-[#8B949E] mb-1">TOTAL SCORE</div>
                  <div className="text-2xl font-bold text-[#FF6B00]">{selectedDossier.total_points} XP</div>
                </div>
                <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                  <div className="text-[#8B949E] mb-1">CHALLENGES SOLVED</div>
                  <div className="text-2xl font-bold text-[#22C55E]">{selectedDossier.challenges_solved} / 8</div>
                </div>
                <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                  <div className="text-[#8B949E] mb-1">TOTAL ATTEMPTS</div>
                  <div className="text-2xl font-bold text-[#FF8533]">{selectedDossier.total_attempts}</div>
                </div>
                <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30]">
                  <div className="text-[#8B949E] mb-1">LAST SUBMISSION</div>
                  <div className="text-xs font-bold text-[#F5F5F5] truncate mt-1">
                    {formatTimestamp(selectedDossier.last_submission_at, true)}
                  </div>
                </div>
              </div>

              {/* Solved Stages List */}
              <div>
                <h4 className="text-xs font-mono font-bold text-[#22C55E] mb-3 flex items-center gap-2">
                  <span>🎯</span> CONFIRMED SOLVES ({selectedDossier.solved_challenges?.length || 0})
                </h4>
                {selectedDossier.solved_challenges?.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#171B20] text-xs font-mono text-[#8B949E] text-center">
                    No stages solved yet by this operative.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {selectedDossier.solved_challenges.map((sc) => (
                      <div key={sc.challenge_id} className="p-3 rounded-xl bg-[#171B20] border border-[#22C55E]/30 flex items-center justify-between">
                        <div>
                          <div className="text-[#F5F5F5] font-bold">Stage {sc.stage_number}: {sc.name}</div>
                          <div className="text-[10px] text-[#8B949E]">{sc.domain} • Solved: {formatTimestamp(sc.solved_at, false)}</div>
                        </div>
                        <span className="text-[#FF6B00] font-bold">+{sc.points} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Complete Submission Log for this Operative */}
              <div>
                <h4 className="text-xs font-mono font-bold text-[#FF8533] mb-3 flex items-center gap-2">
                  <span>📋</span> ATTEMPT HISTORY LEDGER ({selectedDossier.submission_history?.length || 0})
                </h4>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-[#252A30] bg-[#171B20]">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="sticky top-0 bg-[#171B20] border-b border-[#252A30] text-[#8B949E]">
                      <tr>
                        <th className="p-2.5">TIMESTAMP</th>
                        <th className="p-2.5">STAGE</th>
                        <th className="p-2.5">FLAG ATTEMPTED</th>
                        <th className="p-2.5 text-right">RESULT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252A30]/50">
                      {selectedDossier.submission_history?.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-[#8B949E]">No attempts logged.</td>
                        </tr>
                      ) : (
                        selectedDossier.submission_history.map((sub: any) => (
                          <tr key={sub.id} className="hover:bg-[#111417]/50">
                            <td className="p-2.5 text-[#8B949E] whitespace-nowrap">
                              {formatTimestamp(sub.submitted_at || sub.created_at, false)}
                            </td>
                            <td className="p-2.5 text-[#FF8533]">
                              Stage {sub.stage_number}
                            </td>
                            <td className="p-2.5 text-[#8B949E] font-mono break-all max-w-xs">
                              {sub.submitted_flag}
                            </td>
                            <td className="p-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.is_correct ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                              }`}>
                                {sub.is_correct ? 'SOLVED' : 'INCORRECT'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Operatives Table */}
          <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#252A30] text-[#8B949E]">
                  <th className="pb-3 font-semibold">CALLSIGN</th>
                  <th className="pb-3 font-semibold">EMAIL</th>
                  <th className="pb-3 font-semibold">TEAM</th>
                  <th className="pb-3 font-semibold">SCORE / SOLVES</th>
                  <th className="pb-3 font-semibold">ROLE</th>
                  <th className="pb-3 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A30]/50">
                {operatives
                  .filter((op) =>
                    op.username.toLowerCase().includes(searchOperative.toLowerCase()) ||
                    op.team_name?.toLowerCase().includes(searchOperative.toLowerCase())
                  )
                  .map((op) => (
                    <tr key={op.id} className="hover:bg-[#171B20]/40 transition-colors">
                      <td className="py-3 text-[#F5F5F5] font-bold">
                        {op.username}
                      </td>
                      <td className="py-3 text-[#8B949E]">
                        {op.email}
                      </td>
                      <td className="py-3 text-[#FF8533]">
                        {op.team_name || 'Solo'}
                      </td>
                      <td className="py-3">
                        <span className="text-[#FF6B00] font-bold">{op.total_points} XP</span>
                        <span className="text-[#8B949E] ml-2">({op.challenges_solved}/8)</span>
                      </td>
                      <td className="py-3">
                        {op.is_admin ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40">
                            ADMINISTRATOR
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#171B20] text-[#8B949E] border border-[#252A30]">
                            PLAYER
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDossier(op.id)}
                            disabled={loadingDossier}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#FF8533]/15 hover:bg-[#FF8533]/25 text-[#FF8533] border border-[#FF8533]/40 transition-all"
                          >
                            👁️ VIEW DETAILS
                          </button>

                          <button
                            onClick={() => handleToggleAdminRole(op)}
                            disabled={loadingAction || op.id === currentUser?.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                              op.is_admin
                                ? 'text-[#8B949E] hover:text-[#EF4444] hover:bg-[#171B20]'
                                : 'text-[#FF6B00] hover:bg-[#FF6B00]/10 border border-[#FF6B00]/30'
                            }`}
                          >
                            {op.is_admin ? 'DEMOTE' : 'MAKE ADMIN'}
                          </button>

                          {!op.is_admin ? (
                            <button
                              onClick={() => handleDeleteUser(op.id, op.username)}
                              disabled={loadingAction}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-[#8B949E] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                              title="Delete player from database"
                            >
                              🗑️ PURGE
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#8B949E] px-2" title="Admins cannot be deleted">
                              PROTECTED
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUBMISSIONS AUDIT */}
      {activeTab === 'submissions' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-mono font-bold text-[#F5F5F5]">
                SUBMISSION AUDIT LOG (LAST 100 ATTEMPTS)
              </h2>
              <p className="text-xs text-[#8B949E] font-sans mt-0.5">
                Full chronological ledger of flag submission attempts across the competition.
              </p>
            </div>
            <button
              onClick={fetchSubmissions}
              className="btn-secondary text-xs font-mono px-3 py-1.5"
            >
              REFRESH LOGS
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-[#111417] border border-[#252A30] overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#252A30] text-[#8B949E]">
                  <th className="pb-3 font-semibold">TIMESTAMP</th>
                  <th className="pb-3 font-semibold">CALLSIGN</th>
                  <th className="pb-3 font-semibold">STAGE</th>
                  <th className="pb-3 font-semibold">SUBMITTED STRING</th>
                  <th className="pb-3 font-semibold text-right">VERIFICATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A30]/50">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8B949E]">
                      No submissions logged in the system.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#171B20]/40 transition-colors">
                      <td className="py-3 text-[#8B949E] whitespace-nowrap">
                        {formatTimestamp(sub.submitted_at || sub.created_at, true)}
                      </td>
                      <td className="py-3 text-[#F5F5F5] font-bold">
                        {sub.username}
                      </td>
                      <td className="py-3 text-[#FF8533]">
                        Stage {sub.stage_number}: {sub.challenge_name}
                      </td>
                      <td className="py-3 text-[#8B949E] font-mono break-all max-w-xs">
                        {sub.submitted_flag}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            sub.is_correct
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/40'
                              : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40'
                          }`}
                        >
                          {sub.is_correct ? 'CORRECT FLAG' : 'INVALID FLAG'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DANGER ZONE */}
      {activeTab === 'danger' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-mono font-bold text-[#EF4444]">
              ⚠️ DANGER ZONE // IRREVERSIBLE COMMANDS
            </h2>
            <p className="text-xs text-[#8B949E] font-sans mt-0.5">
              High-consequence operations affecting global competitive state and database integrity.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111417] border border-[#EF4444]/40 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252A30]">
              <div>
                <h3 className="font-mono text-sm font-bold text-[#F5F5F5]">
                  RESET LEADERBOARD & SUBMISSION HISTORY
                </h3>
                <p className="text-xs text-[#8B949E] mt-1 font-sans">
                  Resets total points and solved counts for all operatives back to 0, and purges all recorded submission logs.
                  Existing user accounts and stage configurations will remain intact.
                </p>
              </div>
              <button
                onClick={handleResetScores}
                disabled={loadingAction}
                className="px-5 py-3 rounded-xl bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444] font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] whitespace-nowrap"
              >
                EXECUTE SCORE RESET
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#171B20] border border-[#252A30] text-xs font-mono text-[#8B949E]">
              <span className="text-[#FF6B00] font-bold">NOTE:</span> Database backups are handled automatically by Supabase. If you need a complete drop or rebuild of stages, execute via the database manager.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
