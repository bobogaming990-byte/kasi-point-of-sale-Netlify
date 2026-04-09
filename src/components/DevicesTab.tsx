import { useCallback, useState } from "react";
import { deviceStore, DeviceRecord } from "@/lib/device-store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, CheckCircle, XCircle, Trash2, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: DeviceRecord['status'] }) {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Approved</Badge>;
  if (status === 'blocked')  return <Badge variant="destructive">Blocked</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Pending</Badge>;
}

export default function DevicesTab() {
  const { username } = useAuth();
  const [devices, setDevices] = useState<DeviceRecord[]>(() => deviceStore.getAll());
  const currentId = deviceStore.getDeviceId();

  const refresh = useCallback(() => setDevices(deviceStore.getAll()), []);

  const handleApprove = (id: string) => {
    deviceStore.approve(id, username);
    refresh();
    toast.success("Device approved");
  };

  const handleBlock = (id: string) => {
    deviceStore.block(id);
    refresh();
    toast.warning("Device blocked");
  };

  const handleRemove = (id: string) => {
    if (!window.confirm("Remove this device from the registry?")) return;
    deviceStore.remove(id);
    refresh();
    toast.success("Device removed");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {devices.length} device{devices.length !== 1 ? "s" : ""} registered to this store
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Devices that have been set up using this store's code appear here.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Monitor className="w-9 h-9 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">No devices registered</p>
            <p className="text-xs mt-1">
              Generate a Store Code in <strong>Branding Settings</strong> and set up additional tills.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {devices.map(d => (
            <Card
              key={d.id}
              className={cn(
                "border-0 shadow-sm",
                d.id === currentId && "ring-1 ring-primary/30 bg-primary/5",
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      d.status === 'approved' ? "bg-green-100" : d.status === 'blocked' ? "bg-red-100" : "bg-amber-100",
                    )}>
                      <Monitor className={cn(
                        "w-5 h-5",
                        d.status === 'approved' ? "text-green-700" : d.status === 'blocked' ? "text-red-700" : "text-amber-700",
                      )} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{d.name || "Unnamed Device"}</p>
                        {d.id === currentId && (
                          <span className="text-[11px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">this device</span>
                        )}
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {d.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {d.location}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Last login: {d.last_login_at ? new Date(d.last_login_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5 truncate max-w-[260px]">{d.id}</p>
                    </div>
                  </div>

                  {d.id !== currentId && (
                    <div className="flex items-center gap-2 shrink-0">
                      {d.status !== 'approved' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleApprove(d.id)}>
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Approve
                        </Button>
                      )}
                      {d.status !== 'blocked' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleBlock(d.id)}>
                          <XCircle className="w-3.5 h-3.5 text-red-500" /> Block
                        </Button>
                      )}
                      <button
                        onClick={() => handleRemove(d.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                        title="Remove device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
