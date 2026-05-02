import { Mark, Extension, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import WikiLinkMenu, { type WikiLinkMenuRef, type WikiLinkItem } from "./WikiLinkMenu";

const wikiLinkPluginKey = new PluginKey("wikiLinkSuggestion");

export type { WikiLinkItem };

export const WikiLinkMark = Mark.create({
  name: "wikiLink",

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-link]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wiki-link": HTMLAttributes.pageId,
        class:
          "wiki-link inline-flex items-center gap-0.5 px-0.5 rounded text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer font-medium transition-colors",
      }),
      0,
    ];
  },
});

let _pagesCache: WikiLinkItem[] = [];

export function updateWikiLinkPagesCache(pages: WikiLinkItem[]) {
  _pagesCache = pages;
}

export const WikiLinkExtension = Extension.create({
  name: "wikiLinkSuggestion",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: wikiLinkPluginKey,
        editor: this.editor,
        char: "[[",
        allowSpaces: true,
        startOfLine: false,
        allowedPrefixes: null,
        command({ editor, range, props }: any) {
          editor
            .chain()
            .focus()
            .insertContentAt({ from: range.from, to: range.to }, [
              {
                type: "text",
                marks: [{ type: "wikiLink", attrs: { pageId: props.id, title: props.title } }],
                text: `[[${props.title}]]`,
              },
              { type: "text", text: " " },
            ])
            .run();
        },
        items({ query }: { query: string }) {
          const q = query.toLowerCase();
          return _pagesCache
            .filter((p) => p.title.toLowerCase().includes(q))
            .slice(0, 10);
        },
        render() {
          let container: HTMLElement | null = null;
          let root: ReturnType<typeof createRoot> | null = null;
          let menuRef: WikiLinkMenuRef | null = null;

          const getRef = (ref: WikiLinkMenuRef | null) => {
            menuRef = ref;
          };

          const cleanup = () => {
            if (root) { root.unmount(); root = null; }
            if (container?.parentNode) { container.parentNode.removeChild(container); container = null; }
          };

          const getStyle = (props: any): Partial<CSSStyleDeclaration> => {
            const rect = props.clientRect?.();
            if (!rect) return {};
            return {
              top: `${rect.bottom + window.scrollY + 4}px`,
              left: `${rect.left + window.scrollX}px`,
            };
          };

          const renderMenu = (props: any) => {
            if (!root) return;
            const style = getStyle(props);
            if (container) Object.assign(container.style, style);
            root.render(
              createElement(WikiLinkMenu, {
                ref: getRef,
                items: props.items,
                command: (item: WikiLinkItem) => props.command(item),
              })
            );
          };

          return {
            onStart(props: any) {
              container = document.createElement("div");
              container.style.position = "absolute";
              container.style.zIndex = "99999";
              document.body.appendChild(container);
              root = createRoot(container);
              renderMenu(props);
            },
            onUpdate(props: any) {
              renderMenu(props);
            },
            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === "Escape") { cleanup(); return true; }
              return menuRef?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              cleanup();
            },
          };
        },
      }),
    ];
  },
});
