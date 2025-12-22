# OnceButler

A dynamic role management bot for Discord that automatically assigns roles based on member activity, engagement patterns, and time of day.

![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Features

- **Dynamic Role Assignment** — Roles change automatically based on member stats
- **Activity Tracking** — Monitors chat activity, voice participation, and online time
- **Stat System** — Mood, Energy, and Activity stats that evolve over time
- **Custom Triggers** — Create server-wide events that affect member stats
- **Achievements** — Unlock achievements based on milestones and behavior
- **Localization** — Supports English, Russian, and German
- **Manager Roles** — Delegate bot administration without granting full admin

## Quick Start

### Prerequisites

- Node.js 20+
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

### Installation

```bash
# Clone the repository
git clone https://github.com/vtstv/OnceButler.git
cd OnceButler

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your bot token and client ID

# Build
npm run build

# Register slash commands
npm run register

# Start the bot
npm start
```

### Docker

```bash
# Build image
docker build -t oncebutler .

# Run container
docker run -d \
  --name once-butler \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  oncebutler
```

## Commands

| Command         | Description                     | Permission |
| --------------- | ------------------------------- | ---------- |
| `/stats`        | View your current statistics    | Everyone   |
| `/achievements` | View your unlocked achievements | Everyone   |
| `/leaderboard`  | Server rankings by stat         | Everyone   |
| `/version`      | Bot version and system info     | Everyone   |
| `/roles`        | Manage role definitions         | Admin      |
| `/trigger`      | Create stat-modifying events    | Admin      |
| `/settings`     | Server configuration            | Admin      |

## Configuration

### Environment Variables

| Variable            | Description                             |
| ------------------- | --------------------------------------- |
| `DISCORD_TOKEN`     | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Application client ID                   |

### Role Categories

Roles are organized into categories that determine assignment logic:

- **mood** — Based on member's mood stat (0-100)
- **energy** — Based on energy levels, affected by time of day
- **activity** — Based on chat and voice activity
- **time** — Changes with day/evening/night cycles
- **chaos** — Random temporary roles for variety

## Project Structure

```
src/
├── bot/           # Discord client and event handlers
│   └── commands/  # Slash command implementations
├── config/        # Environment and version config
├── database/      # SQLite database and repositories
├── locales/       # Internationalization files
├── roles/         # Role engine and rule system
├── scheduler/     # Periodic tick processing
├── stats/         # Stat calculation engines
├── utils/         # Helper utilities
└── voice/         # Voice channel tracking
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Register/update slash commands
npm run register
```

## License

MIT License — see [LICENSE](LICENSE) for details.

## Author

[Murr](https://github.com/vtstv)
