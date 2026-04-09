import { useState, useCallback } from "react";
import { store, User, hashPassword } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionStore } from "@/lib/subscription-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2, Shield, User as UserIcon, Users, ClipboardList, Monitor } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { auditLog } from "@/lib/audit-logger";
import ActivityLog from "@/components/ActivityLog";
import DevicesTab from "@/components/DevicesTab";

export default function UsersPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [users, setUsers] = useState(store.getUsers());
  const [form, setForm] = useState({ username: "", password: "" });
  const [tab, setTab] = useState<"users" | "activity" | "devices">("users");

  const refresh = useCallback(() => setUsers(store.getUsers()), []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const access = subscriptionStore.checkAccess('users');
    if (!access.allowed) {
      toast.error(access.reason!, { action: { label: 'Subscribe Now', onClick: () => { window.location.href = '/subscription'; } } });
      return;
    }
    const all = store.getUsers();
    if (all.find(u => u.username === form.username)) {
      toast.error("Username already exists");
      return;
    }
    const id = all.length > 0 ? Math.max(...all.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id, username: form.username.trim().toLowerCase(), role: "cashier",
      created_at: new Date().toISOString(),
      password_hash: hashPassword(form.password || form.username),
    };
    all.push(newUser);
    store.setUsers(all);
    auditLog({ action_type: 'USER_ADDED', module_name: 'Users', description: `Cashier "${form.username}" added`, item_name: form.username, reference_id: String(id), new_value: 'role: cashier' });
    setForm({ username: "", password: "" });
    refresh();
    toast.success(`Cashier "${form.username}" added`);
  };

  const handleDelete = (id: number) => {
    const target = store.getUsers().find(u => u.id === id);
    const all = store.getUsers().filter(u => u.id !== id);
    store.setUsers(all);
    if (target) {
      auditLog({ action_type: 'USER_REMOVED', module_name: 'Users', description: `User "${target.username}" removed`, item_name: target.username, reference_id: String(id), previous_value: `role: ${target.role}` });
    }
    refresh();
    toast.success("User removed");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header + tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Users & Activity</h1>
        <div className="flex rounded-lg bg-muted p-1 gap-1 w-full sm:w-auto">
          <button
            onClick={() => setTab("users")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              tab === "users"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
          <button
            onClick={() => setTab("activity")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
              tab === "activity"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Activity Log
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab("devices")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                tab === "devices"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Monitor className="w-3.5 h-3.5" /> Devices
            </button>
          )}
        </div>
      </div>

      {tab === "users" ? (
        /* ── Existing Users UI — completely unchanged ── */
        <div className="space-y-6 max-w-2xl">
          {isAdmin && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Add Cashier</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="flex gap-3">
                  <Input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required className="flex-1" />
                  <Input placeholder="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className="flex-1" />
                  <Button type="submit"><UserPlus className="w-4 h-4 mr-1" /> Add</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">All Users</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No users found. Add your first cashier above.</p>
              )}
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-primary' : 'bg-accent'}`}>
                      {u.role === 'admin' ? <Shield className="w-4 h-4 text-primary-foreground" /> : <UserIcon className="w-4 h-4 text-accent-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                    </div>
                  </div>
                  {isAdmin && u.role !== 'admin' && (
                    <button onClick={() => handleDelete(u.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : tab === "activity" ? (
        /* ── Activity Log tab ── */
        <ActivityLog />
      ) : (
        /* ── Devices tab (admin only) ── */
        <DevicesTab />
      )}
    </div>
  );
}
