# OnceButler Role System

A Discord bot that dynamically assigns roles based on hidden member statistics, inspired by Once Human status effects.

## Overview

Each member has three hidden stats (0-100):
- **Mood** - Emotional state
- **Energy** - Physical vitality
- **Activity** - Engagement level

**Maximum 2 roles per user** are assigned at any time, prioritized by importance.

## Role Categories & Assignment Rules

### Mood Roles
| Stat Range | Role |
|------------|------|
| 80-100 | Optimist 3 |
| 60-79 | Optimist 2 |
| 40-59 | Optimist 1 |
| 20-39 | Feeling blue 1 |
| 0-19 | Feeling blue 2 |

### Energy Roles
| Stat Range | Role |
|------------|------|
| 80-100 | Power Rewind 2 |
| 60-79 | Power Rewind 1 |
| 30-59 | Stable Energy |
| 15-29 | Worn-out |
| 0-14 | Worn-out 2 |

### Activity Roles
| Stat Range | Role |
|------------|------|
| 80-100 | Come As One |
| 50-79 | Little Helper |
| 20-49 | Panovision |
| 0-19 | Holding the team back |

### Time-Based Roles
| Time Period | Role |
|-------------|------|
| 00:00-06:00 | Lunar Oracle |
| 06:00-18:00 | Praise the Sun |
| 18:00-00:00 | Two-Shift System |

### Chaos Roles (Temporary)
Random roles that can override normal assignments:
- Worn-out
- Lazy
- Snooze Aficionado
- Optimist 1
- Unplanned Production

## Role Priority System

Since only 2 roles are assigned per user, roles are prioritized:

1. **Chaos roles** (highest) - Always takes a slot if active
2. **Mood roles** - High priority (Optimist 3 > Optimist 2 > others)
3. **Energy roles** - Medium-high priority
4. **Activity roles** - Medium priority
5. **Time roles** - Lowest priority

## Stat Modification Triggers

### Global Tick (Every 60 seconds)
Processes only **online members**:

**Base Drain:**
- Energy: -1
- Mood: -0.5
- Activity: -0.3

**Idle/AFK Status:**
- Energy: additional -1
- Activity: additional -1

**Voice Channel:**
- Mood: +0.5
- Activity: +0.5

### Time of Day Effects

**Night (00:00-06:00):**
- Mood: -0.5 per tick
- Energy: +0.5 per tick

**Day (06:00-18:00):**
- Mood: +0.3 per tick

**Evening (18:00-00:00):**
- Energy: -0.3 per tick

### Member Join Events
- 10% chance: Mood +5
- 5% chance: Energy -5
- 1% chance: Random stat ±10

### Chaos Events
- Triggered once every 6 hours per user
- 5% chance to apply a temporary chaos role
- Chaos roles expire after 60 minutes

## Rate Limiting

- Role updates are limited to 1 per user per 30 seconds
- Prevents API spam and Discord rate limits

## Admin Commands

| Command | Description |
|---------|-------------|
| `/roles list` | List all managed role definitions |
| `/roles add` | Add or update a role definition |
| `/roles remove` | Remove a role from storage |
| `/roles import` | Create missing roles in Discord |
| `/roles export` | Export Discord roles to JSON |
| `/roles reload` | Reload role definitions from disk |

## Data Persistence

- **SQLite** - Member statistics (survives restarts)
- **JSON files** - Role definitions (editable, hot-reloadable)
- Both stored in Docker volumes for persistence
