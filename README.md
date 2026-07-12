# Systems That Survive

A public field guide for designing, reviewing, testing, and operating production systems.

Live site: https://arunshar.com/production-systems-field-guide/

## What is inside

- A conceptual hierarchy from product outcome to operational evidence
- Ten deep-dive learning modules
- Twenty generic composite production patterns
- A failure-mode matrix
- A four-week system-design interview sprint
- A six-level software-engineer project ladder
- Design, failure, and red-team drills
- A searchable public resource library
- A click-to-define glossary and readiness checklist

## Local use

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`.

## Validation

```bash
node scripts/validate.mjs
node scripts/check-links.mjs
```

The site has no runtime dependencies, build step, analytics, cookies, or remote JavaScript.

## Editorial boundary

The guide contains original synthesis and links to public resources. Generic scenarios are teaching
devices, not claims about a named company. Current vendor and platform behavior should always be
verified against the linked primary documentation.

No guide or checklist can guarantee a defect-free system. The goal is to make guarantees, limits,
failure behavior, recovery, evidence, and residual risk explicit.
