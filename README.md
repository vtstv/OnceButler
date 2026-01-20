# OnceButler

A dynamic role management bot for Discord that automatically assigns roles based on member activity, engagement patterns.

![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Features

- **Dynamic Roles** — Auto-assign roles based on mood, energy, activity stats
- **Economy System** — Currency, daily rewards, work commands, shop with role rewards
- **Casino & Mini-Games** — Slots, roulette, blackjack, coinflip, dice with interactive menu
- **Leveling System** — XP from messages and voice, level roles, announcements
- **Giveaways** — Create timed giveaways with multiple winners
- **Reaction Roles** — Self-assignable roles via reactions
- **Welcome/Leave** — Customizable messages with placeholders
- **Temp Voice** — Auto-create temporary voice channels
- **Steam News** — Auto-post Once Human updates with AI translation and summary
- **AI Chat** — Cloudflare/Gemini AI chat integration and translation
- **Image Generation** — AI image generation via Cloudflare/Gemini
- **Achievements** — Unlock achievements based on milestones
- **Custom Roles** — Create conditional role rules
- **Activity Tracking** — Monitors chat activity, voice participation, and online time
- **Stat System** — Mood, Energy, and Activity stats that evolve over time
- **Custom Triggers** — Create server-wide events that affect member stats
- **Achievements** — Unlock achievements based on milestones and behavior
- **Manager Roles** — Delegate bot administration without granting full admin
- **Localization** — English, Russian, German support

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

| Command        | Description                  | Permission |
| -------------- | ---------------------------- | ---------- |
| `/setup`       | Interactive setup menu       | Admin      |
| `/stats`       | View dynamic role statistics | Everyone   |
| `/level`       | View your level and XP       | Everyone   |
| `/leaderboard` | Server rankings              | Everyone   |
| `/balance`     | Check your wallet            | Everyone   |
| `/daily`       | Claim daily reward           | Everyone   |
| `/work`        | Earn currency                | Everyone   |
| `/shop`        | Browse server shop           | Everyone   |
| `/casino`      | Interactive casino menu      | Everyone   |
| `/games`       | Mini-games (slots, roulette) | Everyone   |
| `/giveaway`    | Create/manage giveaways      | Admin      |
| `/ai`          | Chat with AI                 | Everyone   |
| `/imagine`     | Generate AI images           | Everyone   |
| `/version`     | Bot version info             | Everyone   |

## Configuration

### Environment Variables

| Variable            | Description                             | Required |
| ------------------- | --------------------------------------- | -------- |
| `DISCORD_TOKEN`     | Bot token from Discord Developer Portal | Yes      |
| `DISCORD_CLIENT_ID` | Application client ID                   | Yes      |
| `ADMIN`             | Admin user ID for DM commands           | No       |
| `DATA_PATH`         | Database storage path (default: ./data) | No       |

### Module Configuration

All features are configured via `/setup` command:

- **Dynamic Roles** — Optional stat-based role system
- **Economy** — Currency name, daily amounts, shop items
- **Leveling** — XP rates, level roles, announcements
- **Giveaways** — Duration limits, max winners
- **AI/Image Gen** — API keys for Cloudflare/Gemini
- **Steam News** — Gemini API for translation

## Project Structure

```
src/
├── bot/           # Discord client and event handlers
│   └── commands/  # Slash command implementations
├── ai/            # AI chat and image generation
├── database/      # SQLite database and repositories
├── roles/         # Dynamic role engine
├── scheduler/     # Background tasks
├── stats/         # Stat calculation
├── steamnews/     # Steam news fetcher
├── voice/         # Voice tracking and temp channels
└── utils/         # Helper utilities
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
