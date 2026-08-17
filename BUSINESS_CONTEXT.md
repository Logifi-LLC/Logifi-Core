# Logifi — product context

How to think about Logifi. Current engineering work lives in `TODO.txt`. Follow this file for product decisions; follow the code for how it is built.

Derek is a working airline pilot. Logifi is both the logbook he wants to use and a public project that is not “just another pilot resume.”

---

## Why it exists

1. **Paper → digital without the two bad options.** Line-by-line typing, or paying someone to transcribe a logbook. Digifi is the middle: photograph paper pages and convert them to a digital logbook.
2. **Pilots pay too much.** Most people at Derek’s airline use Logten Pro ($70–$100/year) mainly because FC View can send schedule entries into it — not because Logten itself is great. Logifi should be cheaper, with a better UI and better features.
3. **A named, open-source project.** Open source is intentional. Keep as much of the product visible and usable as possible.

## Who it is for right now

- **Logten users** (especially airline pilots using FC View). Many do not think Logten is special; they stay for the FC View pipeline.
- **Paper logbook pilots** who will not pay $70–$100/year. ForeFlight is the usual cheap digital option, but many airline pilots do not want a company-issued ForeFlight account as their logbook.

## Who it is not for (yet)

ForeFlight-as-the-logbook users, especially **charter pilots** who file in ForeFlight and get tracking for free. Most airline pilots are not in that group. Do not optimize onboarding or import around them right now.

## Day one

A new user should be able to **import, run Digifi, set up automatic logging (Flica), and export** without waiting for a later release.

---

## What “ready for users” means

It works. It is fast. Offline actually works. It does not look or read like generic AI output.

**Build first:** finish the open-source logbook — customization, connectability, a trustworthy MVP. Derek already considers the core close.

**Build later:** extra connectability and quality-of-life that makes daily use easier (see `TODO.txt`).

**Do not build:** not specified. Ask before adding a large new surface that is not logbook, Digifi, import/export, or auto-logging.

## If two things conflict

1. **Data integrity always wins.** A logbook that can lose or silently corrupt flights is pointless. Design against AC 120-78B (audit trail, integrity, export) as the bar for a legitimate electronic logbook — amend/void signed rows; never quietly edit them.
2. **Then UI.** Robinhood-style: overview first, side panel, scroll for entries. The current dashboard shape is the target; do not invent a new information architecture.

## What is embarrassing today

- **Offline.** A stuck “offline” banner that never clears. Saves that are slow or fail offline. Offline is a requirement, not a badge.
- **Digifi accuracy ~70%**, and only Derek’s logbook has been tested. Treat that number as honest, not a slogan to inflate.
- **New pages look AI-generated.** Older screens have been cleaned up; new ones often come back verbose and sloppy. Cut helper essays, filler labels, and generic empty states.

---

## Free vs paid

| Surface | Now | Later |
| --- | --- | --- |
| Core logbook | Free | Stay free. Goal is $0, not a cheaper Logten. |
| Digifi | Credits. First **10 pages on the house** (enough to try it and to cover a typical PPL). | Credits remain the meter. Longer-term: plug-and-play so Digifi can also go toward $0. |
| Automatic logging (Flica / schedule → logbook) | Free | Likely a subscription, **grandfathered**. |
| Data dashboard on a Logifi API | Not the current push | Closed source and paid. |

**Grandfathering (non-negotiable):** whoever signs up keeps that auto-logging price forever.

- Users today → **$0 forever**
- If it later becomes $12/year → **only new users** pay $12
- If it later becomes $24/year → $12 people stay at $12; free people stay at $0

Do not put the **core logbook** behind a paywall. Do not charge existing users for something they already had free.

**Open source:** as much as possible, including a future path to make Digifi cheaper/free for the user.

**Closed / ours:** a data dashboard that consumes a Logifi API.

---

## How to write and design

- Short copy. No marketing paragraphs in the app. No “welcome to your journey” empty states.
- Match existing screens (dashboard, settings stack, iOS shells). New pages should not look like a different product.
- Quicksand, light/dark, overview + list + side panel. Extract from `dashboard.vue` instead of growing it.
- Do not claim FAA certification, “we’re approved,” or Digifi accuracy above what has been tested.

## Unspecified — ask Derek

These prompts were left blank. Do not invent answers:

- Hard “this would no longer be Logifi” line (implied: untrustworthy data, or a pricey Logten clone with generic AI UI)
- Explicit never-build list
- Apps Logifi must not copy (Logten is the competitor to beat on price/UI, not a layout to clone; ForeFlight is out of scope as a logbook)
- Extra “always ask first” items beyond pricing, paywalls for existing users, and legal/FAA claims
