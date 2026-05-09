# OSS UI and Architecture Guardrails

This document keeps UI and code structure consistent as contributors add features.

## UI Guardrails

- Use shared page primitives from `logifi.web/app/components/ui/` for side pages.
- Prefer `AppPageShell` + `AppCard` + `AppSectionHeading` over bespoke wrappers.
- Keep card radii/shadows on tokenized defaults (`.app-card` / shared component classes).
- Avoid per-page hardcoded background hex values unless there is an explicit product reason.
- Dark mode should be intentional: app pages should respect theme by default.

## File and Boundary Guardrails

- Keep page files orchestration-first; move data and workflows to composables/services.
- When a file grows beyond about 500-700 lines, split by responsibility before adding more logic.
- Avoid duplicated normalization logic across components and composables.
- Put reusable transforms in one module and import them everywhere else.
- Avoid introducing new `any`; define explicit interfaces at module boundaries.

## Refactor Checklist (Before PR)

- Is this logic already implemented elsewhere?
- Could this be extracted to a composable/service?
- Does the page still read top-to-bottom without deep cross-file hunting?
- Are visual styles using shared primitives and consistent spacing tokens?
- Did you validate light/dark behavior on the touched page(s)?

## Suggested Review Focus

- Behavioral regressions in imports/migration/sync paths.
- Duplicate logic that increases long-term maintenance cost.
- Unscoped visual drift (new radii/shadows/layout rhythm that do not match app standard).
