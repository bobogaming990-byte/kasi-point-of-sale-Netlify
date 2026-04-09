
import { useState, useMemo, useCallback } from "react";
import { auditStore, AuditLog, ActionType, LogStatus } from "@/lib/audit-store";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Package, AlertTriangle, Users, XCircle,
  RefreshCw, Trash2, Search, ChevronLeft, ChevronRight,
  ClipboardList, Shield, LogIn, LogOut, UserPlus, UserMinus,
  Printer, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PrintReportModal from "@/components/PrintReportModal";
import BusinessProfileModal from "@/components/BusinessProfileModal";

const PAGE_SIZE = 15;

const ACTION_LABELS: Record<ActionType, string> = {
  SALE_COMPLETED:       'Sale',
  STOCK_RECEIVED:       'Stock In',
  STOCK_ADJUSTED:       'Stock Adj.',
  PRODUCT_ADDED:        'Product Added',
  PRODUCT_EDITED:       'Product Edited',
  PRODUCT_DELETED:      'Product Deleted',
  EXPIRED_REMOVED:      'Expired Removed',
  USER_LOGIN:           'Login',
  USER_LOGOUT:          'Logout',
  USER_ADDED:           'User Added',
  USER_REMOVED:         'User Removed',
  ADMIN_OVERRIDE:       'Admin Override',
  VOID_ACTION:          'Void',
  LOGIN_FAILED:         'Login Failed',
  SUBSCRIPTION_CHANGED: 'Subscription',
};

const ACTION_COLORS: Record<ActionType, string> = {
  SALE_COMPLETED:       'bg-green-100 text-green-700 border-green-200',
  STOCK_RECEIVED:       'bg-blue-100 text-blue-700 border-blue-200',
  STOCK_ADJUSTED:       'bg-blue-100 text-blue-700 border-blue-200',
  PRODUCT_ADDED:        'bg-sky-100 text-sky-700 border-sky-200',
  PRODUCT_EDITED:       'bg-sky-100 text-sky-700 border-sky-200',
  PRODUCT_DELETED:      'bg-red-100 text-red-700 border-red-200',
  EXPIRED_REMOVED:      'bg-red-100 text-red-700 border-red-200',
  USER_LOGIN:           'bg-slate-100 text-slate-600 border-slate-200',
  USER_LOGOUT:          'bg-slate-100 text-slate-600 border-slate-200',
  USER_ADDED:           'bg-purple-100 text-purple-700 border-purple-200',
  USER_REMOVED:         'bg-purple-100 text-purple-700 border-purple-200',
  ADMIN_OVERRIDE:       'bg-orange-100 text-orange-700 border-orange-200',
  VOID_ACTION:          'bg-orange-100 text-orange-700 border-orange-200',
  LOGIN_FAILED:         'bg-red-100 text-red-700 border-red-200',
  SUBSCRIPTION_CHANGED: 'bg-violet-100 text-violet-700 border-violet-200',
};

const STATUS_COLORS: Record<LogStatus, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  failed:  'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function formatFull(ts: string): string {
  return new Date(ts).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}

function SummaryCard({ icon, label, value, colorClass }: SummaryCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActivityLog() {
  const { role, username } = useAuth();
  const isAdmin = role === 'admin';

  const [logs, setLogs] = useState<AuditLog[]>(() => auditStore.getAll());
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [page, setPage] = useState(1);
  const [showPrint, setShowPrint] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const refresh = useCallback(() => {
    setLogs(auditStore.getAll());
    setPage(1);
  }, []);

  const today = todayStr();

  const todayLogs = useMemo(
    () => logs.filter(l => l.timestamp.startsWith(today)),
    [logs, today],
  );

  const summary = useMemo(() => ({
    sales:       todayLogs.filter(l => l.action_type === 'SALE_COMPLETED').length,
    stockIn:     todayLogs.filter(l => l.action_type === 'STOCK_RECEIVED' || l.action_type === 'PRODUCT_ADDED').length,
    expired:     todayLogs.filter(l => l.action_type === 'EXPIRED_REMOVED').length,
    activeUsers: new Set(todayLogs.map(l => l.username)).size,
    failed:      todayLogs.filter(l => l.status === 'failed').length,
  }), [todayLogs]);

  const uniqueUsers = useMemo(
    () => Array.from(new Set(logs.map(l => l.username))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    let result = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.description.toLowerCase().includes(q) ||
        l.username.toLowerCase().includes(q) ||
        (l.item_name?.toLowerCase().includes(q) ?? false) ||
        (l.reference_id?.toLowerCase().includes(q) ?? false),
      );
    }

    if (filterAction !== 'all') {
      result = result.filter(l => l.action_type === filterAction);
    }

    if (filterDate !== 'all') {
      const cutoffs: Record<string, number> = {
        today: new Date(today + 'T00:00:00').getTime(),
        week:  Date.now() - 7  * 24 * 60 * 60 * 1000,
        month: Date.now() - 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = cutoffs[filterDate];
      if (cutoff) result = result.filter(l => new Date(l.timestamp).getTime() >= cutoff);
    }

    if (filterUser !== 'all') {
      result = result.filter(l => l.username === filterUser);
    }

    return result;
  }, [logs, search, filterAction, filterDate, filterUser, today]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetFilters = () => {
    setSearch('');
    setFilterAction('all');
    setFilterDate('all');
    setFilterUser('all');
    setPage(1);
  };

  const handleClear = () => {
    if (!window.confirm('Clear ALL activity logs? This cannot be undone.')) return;
    auditStore.clear();
    refresh();
    toast.success('Activity log cleared');
  };

  const hasActiveFilter = search || filterAction !== 'all' || filterDate !== 'all' || filterUser !== 'all';

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          icon={<ShoppingCart className="w-5 h-5 text-green-600" />}
          label="Today's Sales"
          value={summary.sales}
          colorClass="bg-green-100"
        />
        <SummaryCard
          icon={<Package className="w-5 h-5 text-blue-600" />}
          label="Stock Received"
          value={summary.stockIn}
          colorClass="bg-blue-100"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          label="Expired Removed"
          value={summary.expired}
          colorClass="bg-red-100"
        />
        <SummaryCard
          icon={<Users className="w-5 h-5 text-slate-600" />}
          label="Active Users Today"
          value={summary.activeUsers}
          colorClass="bg-slate-100"
        />
        <SummaryCard
          icon={<XCircle className="w-5 h-5 text-orange-600" />}
          label="Failed Actions"
          value={summary.failed}
          colorClass="bg-orange-100"
        />
      </div>

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search logs…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Action type */}
            <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm w-[150px]">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {(Object.keys(ACTION_LABELS) as ActionType[]).map(k => (
                  <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <Select value={filterDate} onValueChange={v => { setFilterDate(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm w-[120px]">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            {/* User */}
            <Select value={filterUser} onValueChange={v => { setFilterUser(v); setPage(1); }}>
              <SelectTrigger className="h-8 text-sm w-[120px]">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {uniqueUsers.map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset filters */}
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetFilters}>
                Reset
              </Button>
            )}

            <div className="flex-1" />

            {/* Print Report (admin only) */}
            {isAdmin && (
              <Button size="sm" className="h-8 px-3 gap-1.5" onClick={() => setShowPrint(true)} title="Print A4 Report">
                <Printer className="w-3.5 h-3.5" /> Print Report
              </Button>
            )}

            {/* Business Profile (admin only) */}
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setShowProfile(true)} title="Business Profile">
                <Building2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Refresh */}
            <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={refresh} title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            {/* Clear (admin only) */}
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleClear} title="Clear all logs">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="font-medium text-sm">
              {logs.length === 0 ? 'No activity recorded yet' : 'No results match your filters'}
            </p>
            {hasActiveFilter && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline mt-1">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap">Time</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap">User</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap">Action</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap hidden sm:table-cell">Module</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap hidden md:table-cell">Item / Ref</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Description</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((log, i) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b last:border-0 transition-colors hover:bg-muted/20",
                        i % 2 === 0 ? "" : "bg-muted/10",
                      )}
                    >
                      {/* Time */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span title={formatFull(log.timestamp)} className="text-xs text-muted-foreground cursor-default">
                          {relativeTime(log.timestamp)}
                        </span>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(log.timestamp).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                        </p>
                      </td>

                      {/* User */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {log.user_role === 'admin'
                              ? <Shield className="w-3 h-3 text-primary" />
                              : <Users className="w-3 h-3 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate max-w-[80px]">{log.username}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{log.user_role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action badge */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                          ACTION_COLORS[log.action_type],
                        )}>
                          {ACTION_LABELS[log.action_type]}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        {log.module_name}
                      </td>

                      {/* Item / Ref */}
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className="text-xs text-foreground/70 truncate block max-w-[120px]" title={log.item_name}>
                          {log.item_name ?? log.reference_id ?? '—'}
                        </span>
                        {log.quantity != null && (
                          <span className="text-[10px] text-muted-foreground">qty: {log.quantity}</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-foreground/80 max-w-[260px] truncate" title={log.description}>
                          {log.description}
                        </p>
                        {(log.previous_value || log.new_value) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[260px]">
                            {log.previous_value && <span className="text-red-500 mr-1">↓{log.previous_value}</span>}
                            {log.new_value && <span className="text-green-600">↑{log.new_value}</span>}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize",
                          STATUS_COLORS[log.status],
                        )}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      {isAdmin && (
        <>
          <PrintReportModal
            open={showPrint}
            onClose={() => setShowPrint(false)}
            currentUser={username}
            onOpenProfile={() => setShowProfile(true)}
          />
          <BusinessProfileModal
            open={showProfile}
            onClose={() => setShowProfile(false)}
          />
        </>
      )}
    </div>
  );
}
