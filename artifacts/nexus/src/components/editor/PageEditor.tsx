import { useEffect, useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useLocation } from "wouter";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { useGetPage, useUpdatePage, useGetPageContent, useSavePageContent, useGetPageTree } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Code, Link as LinkIcon, Highlighter, AlignLeft, AlignCenter,
  AlignRight, List, ListOrdered, CheckSquare, Quote, Minus,
  MoreHorizontal, Star, StarOff, Share, Clock, Eye, Hash,
  ChevronLeft, PanelLeft, Sparkles, Command
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SlashCommandExtension from "./SlashCommands";
import BacklinksPanel from "./BacklinksPanel";
import { WikiLinkMark, WikiLinkExtension, updateWikiLinkPagesCache } from "./WikiLinkExtension";

const lowlight = createLowlight(common);

function sanitizeTipTapContent(node: any): any {
  if (!node || typeof node !== "object") return node;
  if (node.type === "paragraph") {
    const filteredContent = (node.content || []).filter(
      (c: any) => !(c.type === "text" && c.text === "")
    );
    return filteredContent.length > 0
      ? { ...node, content: filteredContent.map(sanitizeTipTapContent) }
      : { type: "paragraph" };
  }
  if (Array.isArray(node.content)) {
    return { ...node, content: node.content.map(sanitizeTipTapContent) };
  }
  return node;
}

interface PageEditorProps {
  pageId: string;
}

export default function PageEditor({ pageId }: PageEditorProps) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { setSidebarOpen, sidebarOpen, setCmdkOpen, currentWorkspaceId, setCurrentPage } = useAppStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const [isSaving, setIsSaving] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState("");

  const { data: page, refetch: refetchPage } = useGetPage(pageId, {
    query: { enabled: !!pageId },
  });

  const { data: contentData } = useGetPageContent(pageId, {
    query: { enabled: !!pageId },
  });

  const { data: pageTree } = useGetPageTree(currentWorkspaceId || "", {
    query: { enabled: !!currentWorkspaceId },
  });

  useEffect(() => {
    if (!pageTree) return;
    const flatPages: any[] = [];
    const flatten = (nodes: any[]) => {
      for (const node of nodes) {
        flatPages.push({ id: node.id, title: node.title, type: node.type, icon: node.icon });
        if (node.children?.length) flatten(node.children);
      }
    };
    flatten(Array.isArray(pageTree) ? pageTree : []);
    updateWikiLinkPagesCache(flatPages);
  }, [pageTree]);

  const { mutate: updatePage } = useUpdatePage({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["pages"] }),
    },
  });

  const { mutate: saveContent } = useSavePageContent();

  const handleSave = useCallback((content: any) => {
    if (!pageId) return;
    setIsSaving(true);
    saveContent(
      { pageId, data: { content } } as any,
      {
        onSuccess: () => setIsSaving(false),
        onError: () => setIsSaving(false),
      }
    );
  }, [pageId, saveContent]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading";
          return "Type '/' for commands, or start writing...";
        },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
      TableKit,
      CodeBlockLowlight.configure({ lowlight }),
      WikiLinkMark,
      WikiLinkExtension,
      SlashCommandExtension,
    ],
    content: "",
    editorProps: {
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const wikiEl = target.closest("[data-wiki-link]");
        if (wikiEl) {
          const targetPageId = wikiEl.getAttribute("data-wiki-link");
          if (targetPageId) {
            setCurrentPage(targetPageId);
            navigate(`/page/${targetPageId}`);
            return true;
          }
        }
        return false;
      },
      attributes: {
        class: "outline-none min-h-[calc(100vh-200px)] prose prose-sm sm:prose-base dark:prose-invert max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        handleSave(editor.getJSON());
      }, 1500);
    },
  });

  useEffect(() => {
    if (contentData && editor && !editor.isDestroyed) {
      const raw = (contentData as any).content;
      if (raw && typeof raw === "object") {
        try {
          const sanitized = sanitizeTipTapContent(raw);
          editor.commands.setContent(sanitized, false);
        } catch {
          editor.commands.setContent({ type: "doc", content: [{ type: "paragraph" }] }, false);
        }
      }
    }
  }, [contentData, editor]);

  useEffect(() => {
    if (page) {
      setLocalTitle((page as any).title || "Untitled");
      document.title = `${(page as any).title || "Untitled"} — Nexus OS`;
    }
    return () => { document.title = "Nexus OS"; };
  }, [page]);

  const handleTitleSave = () => {
    if (localTitle.trim()) {
      updatePage({ pageId, data: { title: localTitle.trim() } } as any);
    }
    setEditingTitle(false);
  };

  const handleToggleFavorite = () => {
    updatePage({ pageId, data: { isFavorite: !(page as any)?.isFavorite } } as any);
    toast.success((page as any)?.isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const typeName: Record<string, string> = {
    page: "Page", database: "Database", wiki: "Wiki", project: "Project", daily: "Daily Note", canvas: "Canvas",
  };

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-3 w-full max-w-2xl px-8">
          <div className="h-10 bg-muted animate-pulse rounded-lg w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-full" />
          <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
          <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 flex-shrink-0">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setSidebarOpen(true)}>
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {typeName[(page as any).type] || "Page"}
            </Badge>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            {isSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleToggleFavorite}>
                  {(page as any).isFavorite
                    ? <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    : <Star className="h-3.5 w-3.5" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>{(page as any).isFavorite ? "Remove favorite" : "Add to favorites"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowBacklinks(!showBacklinks)}>
                  <Hash className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Backlinks</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setCmdkOpen(true)}>
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Assistant (⌘K)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 pb-16 pt-8">
            <div
              className="text-5xl mb-4 cursor-pointer hover:scale-110 transition-transform inline-block"
              onClick={() => setIconPickerOpen(!iconPickerOpen)}
            >
              {(page as any).icon || "📄"}
            </div>

            {iconPickerOpen && (
              <EmojiQuickPicker
                onSelect={(emoji) => {
                  updatePage({ pageId, data: { icon: emoji } } as any);
                  setIconPickerOpen(false);
                }}
                onClose={() => setIconPickerOpen(false)}
              />
            )}

            <div className="mb-6">
              {editingTitle ? (
                <input
                  autoFocus
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setEditingTitle(false); }}
                  className="text-4xl font-bold text-foreground bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/40"
                  placeholder="Untitled"
                />
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  className="text-4xl font-bold text-foreground cursor-text hover:text-foreground/80 transition-colors"
                >
                  {(page as any).title || "Untitled"}
                </h1>
              )}
            </div>

            {editor && (
              <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                <div className="flex items-center gap-0.5 p-1 rounded-lg bg-popover border border-border shadow-xl">
                  <EditorToolbarButton icon={<Bold className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Bold" />
                  <EditorToolbarButton icon={<Italic className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Italic" />
                  <EditorToolbarButton icon={<UnderlineIcon className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Underline" />
                  <EditorToolbarButton icon={<Strikethrough className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="Strike" />
                  <Separator orientation="vertical" className="h-4 mx-0.5" />
                  <EditorToolbarButton icon={<Highlighter className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().toggleHighlight({ color: "#7c3aed33" }).run()} active={editor.isActive("highlight")} tooltip="Highlight" />
                  <EditorToolbarButton icon={<Code className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} tooltip="Code" />
                  <Separator orientation="vertical" className="h-4 mx-0.5" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs gap-1 text-violet-400 hover:text-violet-300"
                    onClick={() => useAppStore.getState().setCmdkOpen(true)}
                  >
                    <Sparkles className="h-3 w-3" /> AI
                  </Button>
                </div>
              </BubbleMenu>
            )}

            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showBacklinks && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full border-l border-border overflow-hidden flex-shrink-0"
          >
            <BacklinksPanel pageId={pageId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditorToolbarButton({ icon, onClick, active, tooltip }: {
  icon: React.ReactNode; onClick: () => void; active?: boolean; tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
            active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

const EMOJI_LIST = ["📄", "📝", "📋", "📌", "🗒️", "📁", "🗃️", "📚", "📖", "🔍", "💡", "⚡", "🎯", "🚀", "✅", "🔧", "🎨", "🌟", "💎", "🔥", "🧠", "🌍", "🎓", "💻", "🔐", "📊", "📈", "🎵", "🌱", "🦋"];

function EmojiQuickPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  useEffect(() => {
    const handler = () => onClose();
    setTimeout(() => window.addEventListener("click", handler), 50);
    return () => window.removeEventListener("click", handler);
  }, [onClose]);

  return (
    <div className="absolute z-50 bg-popover border border-border rounded-xl shadow-2xl p-3 grid grid-cols-8 gap-1" onClick={(e) => e.stopPropagation()}>
      {EMOJI_LIST.map((emoji) => (
        <button key={emoji} onClick={() => onSelect(emoji)} className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-accent transition-colors">
          {emoji}
        </button>
      ))}
    </div>
  );
}

