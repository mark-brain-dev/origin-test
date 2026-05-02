import { useState } from "react";
import { Check, ChevronDown, Plus, Building } from "lucide-react";
import { useListWorkspaces, useCreateWorkspace } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function WorkspaceSwitcher() {
  const qc = useQueryClient();
  const { currentWorkspaceId, setCurrentWorkspace } = useAppStore();
  const { data: workspaces = [] } = useListWorkspaces();

  const { mutate: createWorkspace } = useCreateWorkspace({
    mutation: {
      onSuccess: (ws: any) => {
        qc.invalidateQueries({ queryKey: ["workspaces"] });
        setCurrentWorkspace(ws.id);
        toast.success(`Workspace "${ws.name}" created`);
      },
    },
  });

  const current = (workspaces as any[]).find((w: any) => w.id === currentWorkspaceId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 gap-2 px-2 max-w-[180px] text-sm font-semibold">
          <span className="text-base">{current?.iconEmoji || "🏠"}</span>
          <span className="truncate">{current?.name || "My Workspace"}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {(workspaces as any[]).map((ws: any) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => setCurrentWorkspace(ws.id)}
            className="gap-2"
          >
            <span>{ws.iconEmoji || "🏠"}</span>
            <span className="flex-1 truncate">{ws.name}</span>
            {ws.id === currentWorkspaceId && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => createWorkspace({ data: { name: "New Workspace", slug: `ws-${Date.now()}`, iconEmoji: "🚀" } } as any)}
          className="gap-2"
        >
          <Plus className="h-3.5 w-3.5" />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
