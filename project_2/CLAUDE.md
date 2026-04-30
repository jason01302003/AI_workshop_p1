# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Anonymous real-time chat system built with React + TypeScript frontend (hosted on GitHub Pages) and AWS serverless backend (API Gateway WebSocket + Lambda + DynamoDB). Users join with a callsign, messages are ephemeral (no persistence), no authentication.

## Current State

**Specification-only repository** — no code has been implemented yet. All implementation specs live in `prompts/`. The intended implementation order:
1. UI design mockups via Pencil tool → `webui/ui_design.pen`
2. Frontend: React components from spec `prompts/07-frontend-design.md`
3. Backend: 3 Lambda handlers from specs `prompts/04-06-lambda-*-spec.md`
4. Deployment: human runs `sam deploy --guided` (interactive), then `sam deploy` for updates

## Architecture

```
Browser (React/Vite/TS, GitHub Pages)
  ↓ WebSocket wss://
API Gateway v2 WebSocket
  ↓ route selection: $request.body.action
Lambda (Python 3.12)
  - $connect    → validate callsign, write connectionId to DynamoDB, broadcast user_joined
  - $disconnect → delete connectionId from DynamoDB, broadcast user_left
  - sendMessage → read sender callsign from DynamoDB (prevents spoofing), fan-out PostToConnection
  ↓
DynamoDB table "ChatConnections" (PK: connectionId, attrs: callsign, connectedAt)
```

## Folder Structure to Create

```
webui/src/
  App.tsx, main.tsx
  components/   JoinScreen, ChatScreen, MessageList, MessageItem, MessageInput, StatusIndicator
  hooks/        useWebSocket.ts
  types/        index.ts
  config.ts     (reads VITE_WS_ENDPOINT env var)
lambda/
  connect/connect.py + requirements.txt
  disconnect/disconnect.py + requirements.txt
  send_message/send_message.py + requirements.txt
template.yaml   (SAM IaC — see prompts/03-aws-configuration.md for full contents)
```

## Commands

### Frontend
```bash
cd webui
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
npm run preview   # preview production build
```

### Backend
```bash
sam validate --template template.yaml
sam build
sam deploy --guided          # first time (interactive — human must run)
sam deploy --no-confirm-changeset  # subsequent deploys

# Local Lambda testing
sam local invoke ConnectFunction -e events/connect_valid.json
sam local invoke SendMessageFunction -e events/send_valid.json

# Tail logs
sam logs -n ConnectFunction --tail
```

### WebSocket testing
```bash
npm install -g wscat
wscat -c "wss://{api-id}.execute-api.{region}.amazonaws.com/prod?callsign=TestUser"
# send: {"action": "sendMessage", "text": "Hello"}
```

### Get deployed endpoint
```bash
aws cloudformation describe-stacks --stack-name anonymous-chat \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue"
```

## Key Implementation Details

**Callsign validation** (both client and Lambda $connect): `^[a-zA-Z0-9_]{1,20}$`

**Message text limit**: 1000 characters max

**Broadcast payload shape**:
```json
{"type": "message", "callsign": "sender", "text": "...", "timestamp": "ISO8601Z"}
{"type": "system", "event": "user_joined|user_left", "callsign": "...", "timestamp": "ISO8601Z"}
```

**Stale connection handling**: On `GoneException` (410) from `PostToConnection`, delete that connectionId from DynamoDB.

**Frontend WebSocket endpoint**: read from `VITE_WS_ENDPOINT` env var; Vite base path is `/ai_course_2/` for GitHub Pages.

**Reconnection**: exponential backoff starting at 2s, max 30s, after 5 failures show manual reconnect button.

**Lambda config**: Python 3.12, 128 MB memory, 10s timeout, `TABLE_NAME` injected by SAM.

**DynamoDB**: on-demand billing (`PAY_PER_REQUEST`), no GSI needed — `sendMessage` does a full scan for fan-out.
