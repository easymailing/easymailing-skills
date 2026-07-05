#!/usr/bin/env -S npx -y bun

/**
 * Markdown to Storyblok Richtext converter
 *
 * Usa markdown-it para parsear markdown y genera ProseMirror JSON
 * compatible con el editor de Storyblok directamente.
 *
 * - Snake_case para listas: bullet_list, ordered_list, list_item
 * - CamelCase para tablas: tableRow, tableCell, tableHeader (con attrs)
 * - Preprocesa: elimina comentarios HTML y frontmatter
 *
 * Uso:
 *   echo "# Titulo" | npx bun scripts/md2rt.ts
 *   npx bun scripts/md2rt.ts --file /path/to/content.md
 *
 * Output: JSON { success: true, data: <richtext> }
 */

import MarkdownIt from "markdown-it";
import { readFileSync } from "fs";

// --- Types ---

interface RTNode {
  type: string;
  content?: RTNode[];
  text?: string;
  marks?: RTMark[];
  attrs?: Record<string, unknown>;
}

interface RTMark {
  type: string;
  attrs?: Record<string, unknown>;
}

// --- Input ---

async function readInput(): Promise<string> {
  const args = process.argv.slice(2);

  const fileIdx = args.indexOf("--file");
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    return readFileSync(args[fileIdx + 1], "utf-8");
  }

  const chunks: Buffer[] = [];
  const stdin = Bun.stdin.stream();
  const reader = stdin.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks).toString("utf-8");
}

// --- Preprocessing ---

function stripHtmlComments(md: string): string {
  return md.replace(/<!--[\s\S]*?-->/g, "");
}

function stripLeadingFrontmatter(md: string): string {
  return md.replace(/^\s*---\s*\n/, "");
}

// --- Token to Richtext conversion ---

const md = MarkdownIt({ html: false, breaks: false });

/** Convert markdown-it inline tokens to richtext text nodes with marks */
function convertInlineTokens(tokens: any[]): RTNode[] {
  const nodes: RTNode[] = [];
  const markStack: RTMark[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if (token.content) {
          const node: RTNode = { type: "text", text: token.content };
          if (markStack.length > 0) node.marks = [...markStack];
          nodes.push(node);
        }
        break;

      case "softbreak":
        nodes.push({ type: "hard_break" });
        break;

      case "hardbreak":
        nodes.push({ type: "hard_break" });
        break;

      case "code_inline":
        nodes.push({
          type: "text",
          text: token.content,
          marks: [{ type: "code" }],
        });
        break;

      case "strong_open":
        markStack.push({ type: "bold" });
        break;
      case "strong_close":
        markStack.pop();
        break;

      case "em_open":
        markStack.push({ type: "italic" });
        break;
      case "em_close":
        markStack.pop();
        break;

      case "s_open":
        markStack.push({ type: "strike" });
        break;
      case "s_close":
        markStack.pop();
        break;

      case "link_open": {
        const href = token.attrGet("href") || "";
        markStack.push({
          type: "link",
          attrs: {
            href,
            uuid: null,
            anchor: null,
            target: "_blank",
            linktype: "url",
          },
        });
        break;
      }
      case "link_close":
        markStack.pop();
        break;

      case "image": {
        const src = token.attrGet("src") || "";
        const alt = token.attrGet("alt") || token.content || "";
        nodes.push({
          type: "image",
          attrs: { src, alt, title: null },
        });
        break;
      }

      case "html_inline":
        // Skip HTML tags in inline content
        break;

      default:
        // Unknown inline token — add content as text if present
        if (token.content) {
          const node: RTNode = { type: "text", text: token.content };
          if (markStack.length > 0) node.marks = [...markStack];
          nodes.push(node);
        }
        break;
    }
  }

  return nodes;
}

/** Convert block-level markdown-it tokens to richtext nodes */
function convertBlockTokens(tokens: any[]): RTNode[] {
  const nodes: RTNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case "heading_open": {
        const level = parseInt(token.tag.slice(1), 10);
        const inlineToken = tokens[i + 1]; // heading content (inline)
        const content =
          inlineToken?.children
            ? convertInlineTokens(inlineToken.children)
            : [];
        nodes.push({
          type: "heading",
          attrs: { level },
          content: content.length > 0 ? content : undefined,
        });
        i += 3; // heading_open, inline, heading_close
        break;
      }

      case "paragraph_open": {
        const inlineToken = tokens[i + 1];
        const content =
          inlineToken?.children
            ? convertInlineTokens(inlineToken.children)
            : inlineToken?.content
              ? [{ type: "text", text: inlineToken.content } as RTNode]
              : [];
        nodes.push({
          type: "paragraph",
          content: content.length > 0 ? content : undefined,
        });
        i += 3; // paragraph_open, inline, paragraph_close
        break;
      }

      case "bullet_list_open": {
        const listItems = collectListItems(tokens, i + 1, "bullet_list_close");
        nodes.push({ type: "bullet_list", content: listItems.items });
        i = listItems.endIndex + 1;
        break;
      }

      case "ordered_list_open": {
        const listItems = collectListItems(
          tokens,
          i + 1,
          "ordered_list_close",
        );
        nodes.push({ type: "ordered_list", content: listItems.items });
        i = listItems.endIndex + 1;
        break;
      }

      case "blockquote_open": {
        const blockContent = collectNestedBlock(
          tokens,
          i + 1,
          "blockquote_close",
        );
        nodes.push({
          type: "blockquote",
          content:
            blockContent.nodes.length > 0 ? blockContent.nodes : undefined,
        });
        i = blockContent.endIndex + 1;
        break;
      }

      case "code_block":
      case "fence": {
        const lang = token.info?.trim() || null;
        nodes.push({
          type: "code_block",
          attrs: lang ? { class: `language-${lang}` } : {},
          content: [{ type: "text", text: token.content }],
        });
        i++;
        break;
      }

      case "hr": {
        nodes.push({ type: "horizontal_rule" });
        i++;
        break;
      }

      case "table_open": {
        const tableResult = collectTable(tokens, i + 1);
        nodes.push(tableResult.node);
        i = tableResult.endIndex + 1;
        break;
      }

      case "html_block":
        // Skip HTML blocks
        i++;
        break;

      default:
        i++;
        break;
    }
  }

  return nodes;
}

/** Collect list items between open and close tokens */
function collectListItems(
  tokens: any[],
  startIdx: number,
  closeType: string,
): { items: RTNode[]; endIndex: number } {
  const items: RTNode[] = [];
  let i = startIdx;

  while (i < tokens.length && tokens[i].type !== closeType) {
    if (tokens[i].type === "list_item_open") {
      const itemContent = collectNestedBlock(
        tokens,
        i + 1,
        "list_item_close",
      );
      items.push({
        type: "list_item",
        content: itemContent.nodes.length > 0 ? itemContent.nodes : undefined,
      });
      i = itemContent.endIndex + 1;
    } else {
      i++;
    }
  }

  return { items, endIndex: i };
}

/** Collect nested block content between open/close tokens */
function collectNestedBlock(
  tokens: any[],
  startIdx: number,
  closeType: string,
): { nodes: RTNode[]; endIndex: number } {
  const nestedTokens: any[] = [];
  let i = startIdx;
  let depth = 0;

  while (i < tokens.length) {
    if (tokens[i].type === closeType && depth === 0) {
      break;
    }
    // Track nesting for same-type blocks
    if (tokens[i].type === closeType.replace("_close", "_open")) {
      depth++;
    }
    if (tokens[i].type === closeType && depth > 0) {
      depth--;
    }
    nestedTokens.push(tokens[i]);
    i++;
  }

  return {
    nodes: convertBlockTokens(nestedTokens),
    endIndex: i,
  };
}

/** Collect table tokens and build the table richtext node */
function collectTable(
  tokens: any[],
  startIdx: number,
): { node: RTNode; endIndex: number } {
  const rows: RTNode[] = [];
  let i = startIdx;
  let inHead = false;

  const cellAttrs = {
    colspan: 1,
    rowspan: 1,
    colwidth: null,
    backgroundColor: null,
  };

  while (i < tokens.length && tokens[i].type !== "table_close") {
    switch (tokens[i].type) {
      case "thead_open":
        inHead = true;
        i++;
        break;
      case "thead_close":
        inHead = false;
        i++;
        break;
      case "tbody_open":
      case "tbody_close":
        i++;
        break;
      case "tr_open": {
        const cells: RTNode[] = [];
        i++;
        while (i < tokens.length && tokens[i].type !== "tr_close") {
          if (
            tokens[i].type === "th_open" ||
            tokens[i].type === "td_open"
          ) {
            const cellType = inHead ? "tableHeader" : "tableCell";
            const inlineToken = tokens[i + 1];
            const content =
              inlineToken?.children
                ? convertInlineTokens(inlineToken.children)
                : inlineToken?.content
                  ? [
                      {
                        type: "text",
                        text: inlineToken.content,
                      } as RTNode,
                    ]
                  : [];
            cells.push({
              type: cellType,
              attrs: { ...cellAttrs },
              content: [
                {
                  type: "paragraph",
                  content: content.length > 0 ? content : undefined,
                },
              ],
            });
            i += 3; // td/th_open, inline, td/th_close
          } else {
            i++;
          }
        }
        rows.push({ type: "tableRow", content: cells });
        i++; // tr_close
        break;
      }
      default:
        i++;
        break;
    }
  }

  return {
    node: { type: "table", content: rows },
    endIndex: i, // points to table_close
  };
}

// --- Main ---

async function main() {
  try {
    let markdown = await readInput();

    // Preprocess
    markdown = stripHtmlComments(markdown);
    markdown = stripLeadingFrontmatter(markdown);
    markdown = markdown.trim();

    if (!markdown) {
      console.error(
        JSON.stringify({
          success: false,
          error:
            "No input provided. Use --file <path> or pipe markdown via stdin.",
        }),
      );
      process.exit(1);
    }

    const tokens = md.parse(markdown, {});
    const content = convertBlockTokens(tokens);
    const richtext: RTNode = { type: "doc", content };

    console.log(JSON.stringify({ success: true, data: richtext }, null, 2));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ success: false, error: msg }));
    process.exit(1);
  }
}

main();
