import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (login(username, password)) {
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-navy-foreground">Kasi P.O.S</h1>
          <p className="text-navy-foreground/60 mt-1">Point of Sale System</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-8 shadow-xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              className="h-11"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="h-11"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Button type="submit" className="w-full h-11 text-base font-semibold">
            Login
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Default: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
