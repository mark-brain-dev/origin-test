import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import SlashCommandMenu, { type SlashCommandMenuRef, type SlashCommandItem } from "./SlashCommandMenu";

const slashCommandPluginKey = new PluginKey("slashCommand");

export const SLASH_COMMANDS = [
  { group: "Text", items: [
    { label: "Text", description: "Plain text paragraph", icon: "¶", command: "paragraph" },
    { label: "Heading 1", description: "Large heading", icon: "H1", command: "heading1" },
    { label: "Heading 2", description: "Medium heading", icon: "H2", command: "heading2" },
    { label: "Heading 3", description: "Small heading", icon: "H3", command: "heading3" },
  ]},
  { group: "Lists", items: [
    { label: "Bullet List", description: "Unordered list", icon: "•", command: "bulletList" },
    { label: "Numbered List", description: "Ordered list", icon: "1.", command: "orderedList" },
    { label: "To-do List", description: "Track tasks with checkboxes", icon: "☑", command: "taskList" },
  ]},
  { group: "Blocks", items: [
    { label: "Quote", description: "Highlight a quote", icon: '"', command: "blockquote" },
    { label: "Code Block", description: "Syntax-highlighted code", icon: "</>", command: "codeBlock" },
    { label: "Divider", description: "Horizontal separator", icon: "—", command: "horizontalRule" },
    { label: "Table", description: "Insert a table", icon: "⊞", command: "table" },
  ]},
];

const ALL_ITEMS: SlashCommandItem[] = SLASH_COMMANDS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.group }))
);

const commandMap: Record<string, (editor: any) => void> = {
  paragraph: (e) => e.chain().focus().setParagraph().run(),
  heading1: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  heading2: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  heading3: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  orderedList: (e) => e.chain().focus().toggleOrderedList().run(),
  taskList: (e) => e.chain().focus().toggleTaskList().run(),
  blockquote: (e) => e.chain().focus().toggleBlockquote().run(),
  codeBlock: (e) => e.chain().focus().toggleCodeBlock().run(),
  horizontalRule: (e) => e.chain().focus().setHorizontalRule().run(),
  table: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
};

const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        allowedPrefixes: null,
        command: ({ editor, range, props }: any) => {
          editor.chain().focus().deleteRange(range).run();
          const fn = commandMap[props.command];
          if (fn) fn(editor);
        },
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          const q = query.toLowerCase();
          if (!q) return ALL_ITEMS;
          return ALL_ITEMS.filter(
            (item) =>
              item.label.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q)
          );
        },
        render: () => {
          let container: HTMLElement | null = null;
          let root: ReturnType<typeof createRoot> | null = null;
          let menuRef: SlashCommandMenuRef | null = null;

          const getMenuRef = (ref: SlashCommandMenuRef | null) => {
            menuRef = ref;
          };

          const cleanup = () => {
            if (root) {
              root.unmount();
              root = null;
            }
            if (container && container.parentNode) {
              container.parentNode.removeChild(container);
              container = null;
            }
          };

          const updatePosition = (props: any) => {
            if (!container) return;
            const rect = props.clientRect?.();
            if (!rect) return;
            const scrollY = window.scrollY;
            const scrollX = window.scrollX;
            const menuHeight = 300;
            const windowH = window.innerHeight;
            const top = rect.bottom + scrollY + 4;
            const wouldOverflow = rect.bottom + menuHeight > windowH;
            container.style.position = "absolute";
            container.style.left = `${rect.left + scrollX}px`;
            container.style.top = wouldOverflow
              ? `${rect.top + scrollY - menuHeight - 4}px`
              : `${top}px`;
            container.style.zIndex = "99999";
          };

          return {
            onStart(props: any) {
              container = document.createElement("div");
              document.body.appendChild(container);
              root = createRoot(container);
              updatePosition(props);

              const renderMenu = (items: SlashCommandItem[]) => {
                root!.render(
                  <SlashCommandMenu
                    ref={getMenuRef}
                    items={items}
                    command={(item) => props.command(item)}
                  />
                );
              };
              renderMenu(props.items);
            },
            onUpdate(props: any) {
              if (!root || !container) return;
              updatePosition(props);
              root.render(
                <SlashCommandMenu
                  ref={getMenuRef}
                  items={props.items}
                  command={(item) => props.command(item)}
                />
              );
            },
            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === "Escape") {
                cleanup();
                return true;
              }
              return menuRef?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              cleanup();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: slashCommandPluginKey,
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommandExtension;
