# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

An issue opened without these labels is an incoming request: `.github/workflows/triage.yml` triages it automatically. An issue opened with `ready-for-agent`, `ready-for-human` or `wontfix` already has its outcome, and the workflow skips it; that is how the spec and tickets published by `to-spec` and `to-tickets` stay out of triage.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.
