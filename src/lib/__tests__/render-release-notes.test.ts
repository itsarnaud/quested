import { describe, expect, it } from "vitest";
import { renderReleaseNotesHtml } from "@/lib/render-release-notes";

describe("renderReleaseNotesHtml", () => {
  it("renders a heading", () => {
    expect(renderReleaseNotesHtml("## Fonctionnalités")).toBe("<h2>Fonctionnalités</h2>");
  });

  it("groups consecutive bullet lines into a single list", () => {
    const html = renderReleaseNotesHtml("- First\n- Second");
    expect(html).toBe("<ul>\n<li>First</li>\n<li>Second</li>\n</ul>");
  });

  it("closes the list on a blank line", () => {
    const html = renderReleaseNotesHtml("- First\n\n- Second");
    expect(html).toBe("<ul>\n<li>First</li>\n</ul>\n<ul>\n<li>Second</li>\n</ul>");
  });

  it("renders a plain line as a paragraph", () => {
    expect(renderReleaseNotesHtml("Just some text")).toBe("<p>Just some text</p>");
  });

  it("escapes HTML-significant characters", () => {
    expect(renderReleaseNotesHtml("- A <script> & \"quotes\"")).toBe(
      "<ul>\n<li>A &lt;script&gt; &amp; &quot;quotes&quot;</li>\n</ul>",
    );
  });

  it("handles a realistic mixed release note", () => {
    const markdown = "## Fixes\n\n- Fixed a bug\n- Fixed another bug\n\nThanks for reading.";
    const html = renderReleaseNotesHtml(markdown);
    expect(html).toBe(
      "<h2>Fixes</h2>\n<ul>\n<li>Fixed a bug</li>\n<li>Fixed another bug</li>\n</ul>\n<p>Thanks for reading.</p>",
    );
  });
});
