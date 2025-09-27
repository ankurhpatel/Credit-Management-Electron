# IT Services Credit Management System - Desktop Edition

A comprehensive desktop application for managing IT service subscriptions using a credit-based system.

## Features

- **Customer Management**: Complete customer database with transaction history
- **Vendor Management**: Track multiple vendors and their services  
- **Credit System**: Purchase credits from vendors and allocate to subscriptions
- **Financial Analytics**: Detailed P&L analysis with profit margins
- **Business Management**: Track money in/out of business operations
- **Desktop Integration**: Native desktop app with menu system and file operations

## Installation

1. Clone or download the project
2. Install dependencies: `npm install`
3. Run in development: `npm run dev`
4. Build for production: `npm run build`

## Usage

The application starts automatically with an embedded database and web server. All your data is stored locally in SQLite database format.

## Database

- **Type**: SQLite (better-sqlite3)
- **Location**: `database/subscription-data.db`
- **Backup**: Use File > Export Data menu option

## Development

- **Framework**: Electron + Node.js + Express
- **Database**: SQLite with better-sqlite3
- **Frontend**: Pure HTML/CSS/JavaScript
- **Architecture**: Embedded web server within Electron app

## Build Targets

- Windows (NSIS Installer)
- macOS (DMG)  
- Linux (AppImage)

Built with ❤️ for IT Services businesses.
