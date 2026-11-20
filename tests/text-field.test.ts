import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextField } from "@/components/ui/field";

describe("separate labels for fields that share a form-data name", () => {
  it("uses distinct input identifiers without changing submitted field names", () => {
    const html = renderToStaticMarkup(createElement(Fragment, null,
      createElement(TextField, { name: "email", label: "Email address", type: "email" }),
      createElement(TextField, { id: "admin-password-email", name: "email", label: "Administrator email", type: "email" })
    ));
    const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(html).toContain('for="field-email"');
    expect(html).toContain('for="admin-password-email"');
    expect(html.match(/name="email"/g)).toHaveLength(2);
  });

  it("keeps custom labels, hints and errors associated with the same control", () => {
    const html = renderToStaticMarkup(createElement(TextField, {
      id: "admin-password-email", name: "email", label: "Administrator email",
      hint: "Use your administrator address", error: "Enter an email address", required: true
    }));
    expect(html).toContain('for="admin-password-email"');
    expect(html).toContain('id="admin-password-email"');
    expect(html).toContain('id="admin-password-email-hint"');
    expect(html).toContain('id="admin-password-email-error"');
    expect(html).toContain('aria-describedby="admin-password-email-hint admin-password-email-error"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("preserves identifiers for callers that do not supply a custom id", () => {
    const html = renderToStaticMarkup(createElement(TextField, { name: "title", label: "Title" }));
    expect(html).toContain('for="field-title"');
    expect(html).toContain('id="field-title"');
  });
});
