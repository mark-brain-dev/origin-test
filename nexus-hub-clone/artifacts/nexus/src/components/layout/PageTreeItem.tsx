import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronDown, MoreHorizontal, Plus, Trash2, Star, StarOff, Edit2, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdatePage, useDeletePage, useCreatePage } from "@workspace/api-client-react";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PageTreeItemProps {
  page: any;
  depth: number;
}

const PAGE_ICONS: Record<string, string> = {
  page: "📄", database: "🗃️", wiki: "📚", project: "📁", daily: "📅", canvas: "🎨",
};

export default function PageTreeItem({ page, depth }: PageTreeItemProps) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { currentPageId, activeView, setCurrentPage, isPageExpanded, togglePageExpanded, currentWorkspaceId } = useAppStore();
  const [showActions, setShowActions] = useState(false);

  const isActive = currentPageId === page.id && activeView === "page";
  const hasChildren = page.children && page.children.length > 0;
  const isExpanded = isPageExpanded(page.id);

  const { mutate: updatePage } = useUpdatePage({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["pages"] }) },
  });

  const { mutate: deletePage } = useDeletePage({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["pages"] });
        toast.success("Page deleted");
      },
    },
  });

  const { mutate: createPage } = useCreatePage({
    mutation: {
      onSuccess: (newPage: any) => {
        qc.invalidateQueries({ queryKey: ["pages"] });
        togglePageExpanded(page.id);
        setCurrentPage(newPage.id);
        navigate(`/page/${newPage.id}`);
        toast.success("Sub-page created");
      },
    },
  });

  const handleClick = () => {
    setCurrentPage(page.id);
    navigate(`/page/${page.id}`);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePageExpanded(page.id);
  };

  const handleAddSubpage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentWorkspaceId) return;
    createPage({
      workspaceId: currentWorkspaceId,
      data: { title: "Untitled", type: "page", parentId: page.id },
    } as any);
  };

  const handleDelete = () => {
    deletePage({ pageId: page.id });
    if (currentPageId === page.id) setCurrentPage(null);
  };

  const handleToggleFavorite = () => {
    updatePage({ pageId: page.id, data: { isFavorite: !page.isFavorite } } as any);
  };

  const icon = page.icon || PAGE_ICONS[page.type] || "📄";
  const indentWidth = depth * 16;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-all duration-100",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
        style={{ paddingLeft: `${8 + indentWidth}px` }}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <button
          onClick={handleToggle}
          className={cn(
            "h-4 w-4 flex-shrink-0 flex items-center justify-center rounded-sm hover:bg-accent transition-colors",
            !hasChildren && "opacity-0 pointer-events-none"
          )}
        >
          {hasChildren && (
            isExpanded
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
          )}
        </button>

        <span className="text-sm leading-none flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm truncate leading-none">
          {page.title || "Untitled"}
        </span>

        <div className={cn("flex items-center gap-0.5 transition-opacity", showActions ? "opacity-100" : "opacity-0")}>
          <button
            onClick={handleAddSubpage}
            className="h-5 w-5 flex items-center justify-center rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="h-5 w-5 flex items-center justify-center rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={handleAddSubpage}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add sub-page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleFavorite}>
                {page.isFavorite
                  ? <><StarOff className="h-3.5 w-3.5 mr-2" />Remove from favorites</>
                  : <><Star className="h-3.5 w-3.5 mr-2" />Add to favorites</>
                }
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {page.children.map((child: any) => (
              <PageTreeItem key={child.id} page={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
