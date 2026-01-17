# Sentinel Bot

Sentinel Bot is a **modular, Discord-first server monitoring and control bot** written in JavaScript.
It provides real-time server status, automated embeds, server administration tools, and community automation, all centralized through Discord.

---

## Features

* **Server Monitoring**

  * Query game and service servers using **A2S**
  * Real-time player count and server status
  * Automatic embed updates in Discord channels

* **Server Control**

  * Integration with **Crafty Controller**
  * Start, stop, restart, and restore servers directly from Discord

* **Discord Automation**

  * Auto-updating status messages (embeds)
  * Admin and moderation commands

* **User Verification**

  * Anti-bot verification system
  * Modal-based challenges (captcha-style)
  * Rate limits and account age checks

* **Highly Configurable**

  * Modular architecture
  * Easy to extend with new protocols or services
  * Discord-first, but not Discord-only by design

---

## Architecture

The project is structured in modules to keep responsibilities separated and scalable:

```
sentinel-bot
├── core            # Core logic and shared utilities
├── discord         # Discord bot, commands, embeds, events
├── a2s             # A2S server querying
├── crafty          # Crafty Controller integration
└── config          # Configuration files
```

---

## Technology Stack

* **JavaScript (Node.js)**
* **Discord API**
* **A2S protocol**
* **Crafty Controller**
* Optional integrations (Redis, databases, etc.)

---

## Use Cases

* Monitor game servers from Discord
* Display live server status in auto-updating embeds
* Remotely control servers without direct panel access
* Protect Discord communities with verification workflows

---

## Project Status

This project is under active development.
New modules and integrations can be added without affecting the core system.

---
