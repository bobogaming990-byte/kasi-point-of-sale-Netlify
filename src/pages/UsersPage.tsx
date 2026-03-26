import { useState, useCallback } from "react";
import { store, User } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [users, setUsers] = useState(store.getUsers());
  const [form, setForm] = useState({ username: "", password: "" });

  const refresh = useCallback(() => setUsers(store.getUsers()), []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const all = store.getUsers();
    if (all.find(u => u.username === form.username)) {
      toast.error("Username already exists");
      return;
    }
    const id = all.length > 0 ? Math.max(...all.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id, username: form.username, role: "cashier",
      created_at: new Date().toISOString(),
    };
    all.push(newUser);
    store.setUsers(all);
    setForm({ username: "", password: "" });
    refresh();
    toast.success(`Cashier "${form.username}" added`);
  };

  const handleDelete = (id: number) => {
    const all = store.getUsers().filter(u => u.id !== id);
    store.setUsers(all);
    refresh();
    toast.success("User removed");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Manage Users</h1>

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
  );
}
