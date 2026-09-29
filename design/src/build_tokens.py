"""Emit tokens.json, tokens.css and contrast-report.md from tokens.py. stdlib only."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import tokens as T

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'system'))

# ── colour math ──
def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 8: h = h[:6]
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lum(h):
    r, g, b = [c / 255 for c in hex_to_rgb(h)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

# ── tokens.json (Design System artifact shape: lists with usage) ──
def build_json():
    color_tokens = []
    for name, light, dark, _var, usage in T.SEMANTIC:
        color_tokens.append({"name": name, "value": {"light": light, "dark": dark}, "usage": usage})
    for key, acc in T.ACCENTS.items():
        prefix = "accent" if key == T.DEFAULT_ACCENT else f"alt-{key}"
        note = f"{acc['label']}: {acc['why']}"
        for role in ("primary", "hover", "pressed", "tint", "on-tint", "on-primary", "ring"):
            usage = {
                "primary": "Primary buttons, active tab icon, links, the running-timer dot, current stage.",
                "hover": "Primary button hover (web).",
                "pressed": "Primary button pressed.",
                "tint": "Tinted surfaces: selected rows, accent pills, the Capture sheet icon wells.",
                "on-tint": "Text and icons on accent-tint.",
                "on-primary": "Text and icons on accent-primary.",
                "ring": "Focus ring (2px outline, 2px offset) on every focusable control.",
            }[role]
            if key != T.DEFAULT_ACCENT:
                usage = f"ALTERNATE accent, not the default. {note} " + usage
            color_tokens.append({"name": f"{prefix}-{role}", "value": {"light": acc["light"][role], "dark": acc["dark"][role]}, "usage": usage})
    for st, v in T.STATUS.items():
        for role in ("bg", "ink", "dot", "solid", "on"):
            usage = {"bg": f"Pill and banner background. {v['usage']}", "ink": "Text and icon on the matching bg (≥4.5:1).", "dot": "Saturated 8px marker in pills and rows; charts never reuse it.", "solid": "Solid fills: destructive-solid button, notification badge, progress.", "on": "Text on the solid fill."}[role]
            color_tokens.append({"name": f"status-{st}-{role}", "value": {"light": v["light"][role], "dark": v["dark"][role]}, "usage": usage})
    for i, (l, d) in enumerate(zip(T.DATAVIZ["categorical"], T.DATAVIZ["categorical_dark"]), 1):
        color_tokens.append({"name": f"chart-cat-{i}", "value": {"light": l, "dark": d}, "usage": f"Categorical series {i}. Assign in fixed order, never cycle; >6 series fold into ‘Other’."})
    for i, (l, d) in enumerate(zip(T.DATAVIZ["sequential_light"], T.DATAVIZ["sequential_dark"]), 1):
        color_tokens.append({"name": f"chart-seq-{i}", "value": {"light": l, "dark": d}, "usage": f"Sequential step {i} of 6 (magnitude: AR aging, heatmaps)."})
    for k, v in T.DATAVIZ["diverging"].items():
        color_tokens.append({"name": f"chart-div-{k}", "value": {"light": v, "dark": v}, "usage": "Diverging scale (realization vs target): warm negative, neutral midpoint, accent positive."})
    for k, v in T.NEUTRAL.items():
        color_tokens.append({"name": f"neutral-{k}", "value": {"light": v, "dark": v}, "usage": "Raw ramp step. Components use the semantic tokens above, never the ramp directly."})

    type_groups = {}
    for name, fam, size, lh, w, ls, usage in T.TYPE_SCALE:
        grp = {"mono": "Identifiers & timer"}.get(fam, "Interface")
        type_groups.setdefault(grp, {"name": grp, "family": fam, "styles": []})["styles"].append(
            {"name": name, "fontSize": f"{size}px", "lineHeight": f"{lh}px", "fontWeight": w, "letterSpacing": ls, "usage": usage})
    data = {
        "name": "Clepso", "version": 1,
        "meta": {"source": "design/src/tokens.py", "defaultAccent": T.DEFAULT_ACCENT, "generated": "python3 design/src/build.py"},
        "color": {"themes": [{"id": "light", "name": "Light"}, {"id": "dark", "name": "Dark (courthouse mode)"}], "tokens": color_tokens},
        "type": {
            "fonts": [],
            "families": {k: v["stack"] for k, v in T.FONTS.items()},
            "hosted": {k: {"google": v["google"], "expo": v["expo"]} for k, v in T.FONTS.items()},
            "groups": list(type_groups.values()),
        },
        "spacing": {"tokens": [{"name": n, "value": f"{v}px", "usage": T.SPACING_USAGE[n]} for n, v in T.SPACING]},
        "radius": {"tokens": [{"name": n, "value": f"{v}px", "usage": u} for n, v, u in T.RADIUS]},
        "shadow": {"tokens": [{"name": n, "value": v, "usage": u} for n, v, u in T.SHADOW]},
        "size": {"tokens": [{"name": n, "value": f"{v}px", "usage": u} for n, v, u in T.SIZES]},
        "motion": {"tokens": [{"name": n, "value": v, "usage": u} for n, v, u in T.MOTION]},
        "breakpoint": {"tokens": [{"name": f"bp-{n}", "value": f"{v}px", "usage": "Web breakpoint."} for n, v in T.BREAKPOINTS]},
    }
    return data

# ── tokens.css ──
def theme_block(theme, accent_key):
    acc = T.ACCENTS[accent_key][theme]
    lines = []
    for name, light, dark, var, _u in T.SEMANTIC:
        lines.append(f"  --{var}: {light if theme == 'light' else dark};")
    for role in ("primary", "hover", "pressed", "tint", "on-tint", "on-primary", "ring"):
        var = {"primary": "accent", "hover": "accent-hover", "pressed": "accent-pressed", "tint": "accent-tint",
               "on-tint": "accent-ink", "on-primary": "on-accent", "ring": "focus-ring"}[role]
        lines.append(f"  --{var}: {acc[role]};")
    for st, v in T.STATUS.items():
        for role in ("bg", "ink", "dot", "solid", "on"):
            lines.append(f"  --{st}-{role}: {v[theme][role]};")
    for n, v, _u in T.SHADOW:
        lines.append(f"  --{n}: {v if theme == 'light' else T.SHADOW_DARK[n]};")
    cats = T.DATAVIZ["categorical" if theme == "light" else "categorical_dark"]
    for i, c in enumerate(cats, 1):
        lines.append(f"  --chart-{i}: {c};")
    seq = T.DATAVIZ["sequential_light" if theme == "light" else "sequential_dark"]
    for i, c in enumerate(seq, 1):
        lines.append(f"  --chart-seq-{i}: {c};")
    lines.append(f"  color-scheme: {theme};")
    return "\n".join(lines)

def accent_only_block(theme, accent_key):
    acc = T.ACCENTS[accent_key][theme]
    m = {"primary": "accent", "hover": "accent-hover", "pressed": "accent-pressed", "tint": "accent-tint",
         "on-tint": "accent-ink", "on-primary": "on-accent", "ring": "focus-ring"}
    lines = [f"  --{m[r]}: {acc[r]};" for r in m]
    lines.append(f"  --chart-1: {acc['primary']};")
    return "\n".join(lines)

def build_css():
    out = []
    out.append("/* Clepso tokens — GENERATED by design/src/build.py from design/src/tokens.py. Do not edit by hand. */")
    out.append("/* Light is the default; dark is a designed set. Accent: Cobalt. */")
    static = []
    for fk, fv in T.FONTS.items():
        static.append(f"  --font-{fk}: {fv['stack']};")
    for n, v in T.SPACING:
        static.append(f"  --{n.replace('.', '_')}: {v}px;")
    for n, v, _u in T.RADIUS:
        static.append(f"  --{n}: {v}px;")
    for n, v, _u in T.SIZES:
        static.append(f"  --size-{n}: {v}px;")
    for n, v, _u in T.MOTION:
        static.append(f"  --{n}: {v};")
    for name, fam, size, lh, w, ls, _u in T.TYPE_SCALE:
        static.append(f"  --text-{name}: {w} {size}px/{lh}px var(--font-{fam});")
        static.append(f"  --tracking-{name}: {ls};")
    indent = lambda s: "\n".join("  " + l for l in s.split("\n"))
    out.append(":root {\n" + "\n".join(static) + "\n}")
    out.append("/* Theme: light is the default. `.cl-theme-light` / `.cl-theme-dark` scope a theme to any container (side-by-side frames). */")
    out.append(":root, .cl-theme-light {\n" + theme_block("light", T.DEFAULT_ACCENT) + "\n}")
    out.append("@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {\n" + indent(theme_block("dark", T.DEFAULT_ACCENT)) + "\n  }\n}")
    out.append(":root[data-theme=\"dark\"], .cl-theme-dark {\n" + theme_block("dark", T.DEFAULT_ACCENT) + "\n}")
    for key in T.ACCENTS:
        if key == T.DEFAULT_ACCENT: continue
        out.append(f"/* Accent variant: {T.ACCENTS[key]['label']} — set data-accent=\"{key}\" on <html>. */")
        out.append(f":root[data-accent=\"{key}\"], :root[data-accent=\"{key}\"] .cl-theme-light {{\n" + accent_only_block("light", key) + "\n}")
        out.append(f"@media (prefers-color-scheme: dark) {{\n  :root[data-accent=\"{key}\"]:not([data-theme=\"light\"]) {{\n" + indent(accent_only_block("dark", key)) + "\n  }}\n}}")
        out.append(f":root[data-theme=\"dark\"][data-accent=\"{key}\"], :root[data-accent=\"{key}\"] .cl-theme-dark {{\n" + accent_only_block("dark", key) + "\n}")
    return "\n\n".join(out) + "\n"

# ── contrast report ──
def build_contrast():
    rows = []
    def check(label, fg, bg, need):
        c = contrast(fg, bg)
        rows.append((label, fg, bg, need, c, "PASS" if c >= need else "FAIL"))
    sem = {n: (l, d) for n, l, d, _v, _u in T.SEMANTIC}
    for ti, theme in enumerate(("light", "dark")):
        S = {n: v[ti] for n, v in sem.items()}
        for surf in ("surface-canvas", "surface-default", "surface-sunken", "surface-raised"):
            check(f"{theme} · ink-primary on {surf}", S["ink-primary"], S[surf], 4.5)
            check(f"{theme} · ink-secondary on {surf}", S["ink-secondary"], S[surf], 4.5)
            check(f"{theme} · ink-tertiary on {surf} (3:1 non-text)", S["ink-tertiary"], S[surf], 3.0)
            check(f"{theme} · line-strong on {surf} (3:1 control edge)", S["line-strong"], S[surf], 3.0)
        check(f"{theme} · ink-inverse on surface-inverse", S["ink-inverse"], S["surface-inverse"], 4.5)
        for key, acc in T.ACCENTS.items():
            a = acc[theme]
            check(f"{theme} · {key}: on-primary on primary", a["on-primary"], a["primary"], 4.5)
            check(f"{theme} · {key}: primary as text on surface-default", a["primary"], S["surface-default"], 4.5)
            check(f"{theme} · {key}: primary as text on canvas", a["primary"], S["surface-canvas"], 4.5)
            check(f"{theme} · {key}: on-tint on tint", a["on-tint"], a["tint"], 4.5)
            check(f"{theme} · {key}: primary vs surface (3:1 UI edge)", a["primary"], S["surface-default"], 3.0)
        for st, v in T.STATUS.items():
            check(f"{theme} · status {st}: ink on bg", v[theme]["ink"], v[theme]["bg"], 4.5)
            check(f"{theme} · status {st}: ink on surface-default", v[theme]["ink"], S["surface-default"], 4.5)
            check(f"{theme} · status {st}: dot on surface-default (3:1)", v[theme]["dot"], S["surface-default"], 3.0)
            check(f"{theme} · status {st}: on-colour on solid fill", v[theme]["on"], v[theme]["solid"], 4.5)
    md = ["# Contrast report", "", "Generated by `design/src/build.py`. WCAG 2.x contrast ratios for every token pairing the components use.", "",
          "| Pair | Foreground | Background | Needs | Ratio | Result |", "|---|---|---|---|---|---|"]
    for label, fg, bg, need, c, res in rows:
        md.append(f"| {label} | `{fg}` | `{bg}` | {need}:1 | {c:.2f}:1 | {res} |")
    fails = [r for r in rows if r[5] == "FAIL"]
    md.insert(4, f"**{len(rows) - len(fails)} of {len(rows)} pairs pass.**" + ("" if not fails else f" {len(fails)} FAIL — fix before shipping."))
    md.insert(5, "")
    return "\n".join(md) + "\n", fails

def main():
    os.makedirs(ROOT, exist_ok=True)
    with open(os.path.join(ROOT, "tokens.json"), "w") as f:
        json.dump(build_json(), f, indent=2, ensure_ascii=False); f.write("\n")
    with open(os.path.join(ROOT, "tokens.css"), "w") as f:
        f.write(build_css())
    report, fails = build_contrast()
    with open(os.path.join(ROOT, "contrast-report.md"), "w") as f:
        f.write(report)
    print(f"tokens.json, tokens.css, contrast-report.md written. {len(fails)} contrast failures.")
    for r in fails:
        print(f"  FAIL {r[0]}: {r[1]} on {r[2]} = {r[4]:.2f} (needs {r[3]})")

if __name__ == "__main__":
    main()
