# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Midway.js (v3) WebSocket + Koa application with custom messaging architecture.

## Commands

```bash
npm run dev          # Development mode (local env)
npm start            # Production start
npm test             # Run unit tests
npm test -- -t "pattern"  # Run specific test
npm run lint         # Check code style
npm run lint:fix     # Fix code style
npm run build        # Build for production
```

## Architecture

**Framework**: Midway.js v3 with dependency injection using decorators

**Core Components**:
- `src/configuration.ts` - Main configuration, imports modules (koa, ws, validate, static-file)
- `src/config/` - Environment-specific configs (default, unittest, plugin)
- `src/controller/` - HTTP API (`api.controller.ts`) and WebSocket (`websocket.controller.ts`)
- `src/service/` - Business logic (ChatService, UserService, GuitarService)
- `src/middleware/` - Koa middleware (ReportMiddleware, HeartbeatMiddleware)
- `src/util/` - Utilities (heartbeat.util.ts for WebSocket heartbeat management)
- `src/enums/` - TypeScript enums (socket.enum.ts for WebSocket message types)

**WebSocket Messaging**:
- Uses `@midwayjs/ws` with custom protocol
- Message types: join, ping/pong, message, chat
- Endpoint types: server, client, member (defines message routing behavior)
- Groups enable isolated communication channels
- Heartbeat mechanism: 3s interval, 5s timeout, max 2 missed pongs

**HTTP Endpoints**:
- `GET /api/get_user?uid` - Get user info
- `GET /api/guitar/all` - List files in public/pic directory

**Port**: 80 (configured in `src/config/config.default.ts`)

## Testing

Jest + ts-jest with Midway mock utilities. Tests in `test/controller/`. Use `@midwayjs/mock` for app creation and HTTP requests.
