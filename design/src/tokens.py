"""
Clepso design tokens — the single source of truth.

build.py turns this file into:
  design/system/tokens.json   (Design System artifact / design-sync shape: lists with usage notes)
  design/system/tokens.css    (CSS custom properties, light + dark, three accent variants)
  design/system/contrast-report.md

Values are hex. Light theme is the default; dark is a designed set, not an inversion.
"""

# ── Neutral ramp: cool graphite, hue ≈ 222°, chroma kept low so the accent owns colour ──
NEUTRAL = {
    "0": "#FFFFFF",
    "50": "#F7F8FA",
    "100": "#F0F2F5",
    "150": "#E9ECF0",
    "200": "#E1E5EB",
    "300": "#CDD3DC",
    "400": "#A9B1BE",
    "500": "#7F8897",
    "600": "#5B6472",
    "700": "#444B57",
    "800": "#2E343E",
    "900": "#1C2029",
    "950": "#12151B",
    "1000": "#0B0D11",
}

# ── Semantic surfaces, lines and ink. {light, dark} ──
SEMANTIC = [
    # name, light, dark, css var, usage
    ("surface-canvas", NEUTRAL["50"], NEUTRAL["950"], "bg", "Screen and page background."),
    ("surface-default", NEUTRAL["0"], "#191D25", "surface", "Lists, cards, inputs, sheets — the layer content sits on."),
    ("surface-sunken", NEUTRAL["100"], "#0E1015", "surface-2", "Tonal buttons, search fields, segmented-control tracks, code/identifier chips."),
    ("surface-raised", NEUTRAL["0"], "#1F242D", "surface-3", "Floating layers: bottom sheets, popovers, the running-timer bar. Pair with shadow-lg."),
    ("surface-inverse", NEUTRAL["900"], NEUTRAL["50"], "surface-inverse", "Toasts and tooltips: the opposite of the theme."),
    ("line-hairline", NEUTRAL["200"], "#262C36", "hairline", "Row separators, card borders, table rules. 1px, never darker."),
    ("line-border", NEUTRAL["300"], "#353C48", "border", "Input borders, chips at rest, dividers that must read as an edge."),
    ("line-strong", NEUTRAL["500"], "#6E7686", "border-strong", "Checkbox/radio outlines, drag handles, icons on tonal surfaces (3:1)."),
    ("ink-primary", NEUTRAL["900"], "#EEF0F4", "ink", "Titles, body copy, amounts."),
    ("ink-secondary", NEUTRAL["600"], NEUTRAL["400"], "ink-2", "Subtitles, metadata, labels, timestamps. Meets 4.5:1 on every surface."),
    ("ink-tertiary", NEUTRAL["500"], "#7F8897", "ink-3", "Placeholders, decorative icons, disabled-looking helper text. ≥3:1 only — never for information the user needs."),
    ("ink-disabled", NEUTRAL["400"], "#4B5363", "ink-disabled", "Disabled control labels."),
    ("ink-inverse", NEUTRAL["0"], NEUTRAL["900"], "ink-inverse", "Text on surface-inverse and on ink-filled chips."),
]

# ── Accent: Cobalt (chosen 2026-09-29). Add another entry here only to A/B a variant; build emits [data-accent] blocks for non-defaults. ──
ACCENTS = {
    "cobalt": {
        "label": "Cobalt",
        "why": "A clear, modern blue with restraint: trust and precision without the heaviness of navy. The teal info hue keeps court/system state distinct from the accent.",
        "light": {"primary": "#2B52D9", "hover": "#2446BF", "pressed": "#1D3AA3", "tint": "#E7ECFB", "on-tint": "#1F3FAF", "on-primary": "#FFFFFF", "ring": "#2B52D959"},
        "dark": {"primary": "#88A3FF", "hover": "#9FB5FF", "pressed": "#7190F5", "tint": "#1E2A4A", "on-tint": "#B5C6FF", "on-primary": "#0A1440", "ring": "#88A3FF66"},
    },
}
DEFAULT_ACCENT = "cobalt"

# ── Status: reserved for state. Ink on bg must pass 4.5:1; dot is the saturated marker. ──
# roles: bg (tint), ink (text on tint and on surfaces), dot (8px marker), solid (button/badge fill), on (text on solid)
STATUS = {
    "success": {"light": {"bg": "#E4F4EA", "ink": "#176A3E", "dot": "#23A25C", "solid": "#176A3E", "on": "#FFFFFF"}, "dark": {"bg": "#173126", "ink": "#6ED39A", "dot": "#3DBE76", "solid": "#3DBE76", "on": "#06210F"},
                "usage": "Paid, collected, reconciled, done, synced."},
    "warning": {"light": {"bg": "#FBEFD6", "ink": "#7D4F00", "dot": "#B87900", "solid": "#7D4F00", "on": "#FFFFFF"}, "dark": {"bg": "#3A2D14", "ink": "#F4C160", "dot": "#E8A93A", "solid": "#E8A93A", "on": "#2A1B05"},
                "usage": "Due soon (≤7 days), pending approval, unreconciled >30 days, write-downs."},
    "danger": {"light": {"bg": "#FBE7E5", "ink": "#A8271F", "dot": "#D9382E", "solid": "#B3261E", "on": "#FFFFFF"}, "dark": {"bg": "#3D1E1C", "ink": "#FF8B80", "dot": "#F0564A", "solid": "#F0564A", "on": "#2B0906"},
               "usage": "Overdue, missed deadline, trust anomaly, destructive actions."},
    "info": {"light": {"bg": "#DDF3F0", "ink": "#0E5F57", "dot": "#12857A", "solid": "#0E5F57", "on": "#FFFFFF"}, "dark": {"bg": "#133430", "ink": "#66D1C3", "dot": "#2DB3A4", "solid": "#2DB3A4", "on": "#062521"},
             "usage": "Court events, sync notices, neutral system messages. Teal, so it never reads as the blue accent."},
}

# ── Data visualisation (dashboards & reports). Categorical order is fixed; validated with the dataviz validator. ──
DATAVIZ = {
    "categorical": ["#2B52D9", "#C2410C", "#0F8A7A", "#7C3AED", "#A16207", "#BE185D"],
    "categorical_dark": ["#5A7BE6", "#D3661C", "#2C9A80", "#8768E8", "#B08C0C", "#D0407F"],
    "sequential_light": ["#E7ECFB", "#B9C8F5", "#7F98EA", "#4A6BE0", "#2B52D9", "#1B3699"],
    "sequential_dark": ["#1E2A4A", "#2C3F7A", "#4460B8", "#6F8EF5", "#9FB5FF", "#D2DCFF"],
    "diverging": {"neg": "#C2410C", "mid": "#A9B1BE", "pos": "#2B52D9"},
}

# ── Type ──
FONTS = {
    "sans": {"family": "Geist", "stack": '"Geist", -apple-system, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif',
             "expo": "@expo-google-fonts/geist", "google": "Geist:wght@300..700"},
    "mono": {"family": "Geist Mono", "stack": '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
             "expo": "@expo-google-fonts/geist-mono", "google": "Geist+Mono:wght@400..600"},
}

# name, family, size, line-height, weight, letter-spacing, usage
TYPE_SCALE = [
    ("display", "sans", 32, 38, 600, "-0.02em", "The Today greeting on web, hero numbers, invoice totals."),
    ("title-1", "sans", 28, 34, 600, "-0.02em", "Mobile screen titles and the Today greeting (large-title pattern)."),
    ("title-2", "sans", 22, 28, 600, "-0.01em", "Web page titles, sheet titles, matter names on detail screens."),
    ("title-3", "sans", 17, 24, 600, "-0.005em", "Card and section titles, list-row titles that lead a group."),
    ("body", "sans", 15, 22, 400, "0", "Default mobile text. Web dense surfaces use body-sm."),
    ("body-strong", "sans", 15, 22, 600, "0", "Row titles, emphasised values."),
    ("body-sm", "sans", 14, 20, 400, "0", "Web default in tables, drawers, sidebars."),
    ("label", "sans", 13, 18, 500, "0", "Field labels, metadata, secondary row text, tab labels on web."),
    ("caption", "sans", 12, 16, 500, "0.01em", "Timestamps, helper text, pill text."),
    ("overline", "sans", 11, 16, 600, "0.06em", "Uppercase section eyebrows and table headers."),
    ("amount-lg", "sans", 28, 34, 600, "-0.015em", "Invoice totals, trust balances. Always tabular figures."),
    ("amount", "sans", 17, 24, 600, "0", "Amounts and hours in rows and tiles. Always tabular figures."),
    ("mono-id", "mono", 13, 18, 500, "0", "Matter numbers, invoice numbers, UTBMS codes, account suffixes."),
    ("mono-timer", "mono", 40, 44, 500, "-0.01em", "Running timer digits. Tabular by nature."),
]

SPACING = [("space-0.5", 2), ("space-1", 4), ("space-2", 8), ("space-3", 12), ("space-4", 16), ("space-5", 20),
           ("space-6", 24), ("space-8", 32), ("space-10", 40), ("space-12", 48), ("space-16", 64)]
SPACING_USAGE = {
    "space-0.5": "Icon-to-text nudges, dot-to-label.", "space-1": "Inside pills; between stacked captions.",
    "space-2": "Icon gaps inside buttons; between a label and its field.", "space-3": "Row vertical padding; inside cards on web.",
    "space-4": "Row horizontal padding; card padding on mobile; gap between grouped lists.",
    "space-5": "Mobile screen gutter (matches iOS 20pt).", "space-6": "Between sections on mobile; card padding on web.",
    "space-8": "Web section spacing; sheet top padding.", "space-10": "Empty-state padding.", "space-12": "Between web page regions.",
    "space-16": "Onboarding and marketing rhythm only.",
}
RADIUS = [("radius-xs", 4, "Checkboxes, tiny chips, progress bars."), ("radius-sm", 6, "Buttons ≤36px, inputs on web, sidebar items, company avatars."),
          ("radius-md", 8, "Buttons and inputs on mobile, chips, tooltips."), ("radius-lg", 12, "Cards, grouped lists, KPI tiles, the timer bar."),
          ("radius-xl", 16, "Bottom sheets, dialogs."), ("radius-full", 999, "Pills, person avatars, the Capture button, toggles.")]
SHADOW = [("shadow-sm", "0 1px 2px rgba(16,20,28,.06)", "Segmented-control thumb, hovered rows on web."),
          ("shadow-md", "0 4px 14px -2px rgba(16,20,28,.10), 0 1px 2px rgba(16,20,28,.05)", "Popovers, dropdowns, the running-timer bar."),
          ("shadow-lg", "0 16px 40px -12px rgba(16,20,28,.22), 0 2px 6px rgba(16,20,28,.06)", "Bottom sheets, dialogs, the Capture button.")]
SHADOW_DARK = {"shadow-sm": "0 1px 2px rgba(0,0,0,.4)", "shadow-md": "0 4px 14px -2px rgba(0,0,0,.5), 0 0 0 1px #262C36",
               "shadow-lg": "0 16px 40px -12px rgba(0,0,0,.7), 0 0 0 1px #262C36"}
SIZES = [("control-sm", 36, "Web default control height; mobile compact buttons."), ("control-md", 44, "Mobile default control height = minimum tap target."),
         ("control-lg", 52, "Primary call to action at the bottom of a sheet or form."), ("input-mobile", 48, "Text inputs on mobile."),
         ("input-web", 40, "Text inputs on web."), ("row", 60, "List row minimum height on mobile."), ("row-web", 44, "Table row height, comfortable."),
         ("row-web-compact", 36, "Table row height, compact density."), ("tabbar", 56, "Tab bar height before the home-indicator inset."),
         ("capture", 56, "Capture button diameter."), ("sidebar", 256, "Web sidebar expanded; 64 collapsed."), ("content-max", 1440, "Web content max width.")]
MOTION = [("duration-fast", "120ms", "Press feedback, toggles, hover."), ("duration-base", "200ms", "Sheet content, chips, pill state changes."),
          ("duration-slow", "320ms", "Bottom sheets and drawers entering."), ("ease-standard", "cubic-bezier(.2,.8,.2,1)", "Everything that moves on screen."),
          ("ease-exit", "cubic-bezier(.4,0,1,1)", "Dismissals.")]
BREAKPOINTS = [("sm", 640), ("md", 768), ("lg", 1024), ("xl", 1280), ("2xl", 1536)]
