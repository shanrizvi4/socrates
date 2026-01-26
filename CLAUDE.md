# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Socrates is a recursive knowledge graph application built with Next.js 16 and React 19. Users explore topics by clicking nodes that dynamically generate child subtopics via Google Gemini AI, with an integrated chat sidebar for deeper discussions.

## Commands

```bash
npm run dev      # Start development server on localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # Run ESLint
```

## Architecture

### State Management
Zustand store (`src/lib/store.ts`) manages all application state:
- **Graph state**: `nodeMap` (all nodes by ID), `activePath` (selected node chain), `fetchingIds` (nodes currently loading)
- **Chat state**: `chatHistory`, `isChatOpen`, `activeNodeTitle`
- Key actions: `selectNode()`, `generateChildren()`, `triggerChat()`

### Data Flow
1. Initial taxonomy loads from `src/data/taxonomy.json` (3 root categories with pre-generated children)
2. When user clicks a node without children, `generateChildren()` calls `/api/generate`
3. Gemini returns 5 child nodes with titles, hooks, descriptions, and questions
4. Store updates trigger re-render of horizontal scrollable graph layout

### Component Structure
- `GraphView` - Main container with horizontal scrollable rows (one row per depth level)
- `NodeCard` - Individual clickable node with loading states
- `HoverCard` - Portal-rendered popup showing description and clickable questions
- `ChatSidebar` - Side panel chat interface connected to Gemini

### API Routes
- `POST /api/generate` - Generates 5 child nodes for a parent (uses `gemini-2.5-flash-lite`)
- `POST /api/chat` - Handles chat conversations about topics

### Types
Core types in `src/types/graph.ts`:
- `Node` - Contains `id`, `title`, `hook`, `childrenIds`, `llm_config`, `popup_data`
- `NodeMap` - Record of nodes keyed by ID

### Styling
- Tailwind CSS for utilities
- Component-specific CSS in `src/styles/` (graph.css, cards.css, chat.css, popups.css)
- Framer Motion for animations

## Environment Variables

`GOOGLE_API_KEY` - Required for Gemini API functionality (set in `.env.local`)
