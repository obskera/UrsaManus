🐻 UrsaManus

UrsaManus is a micro game engine built with React and TypeScript.

## It is designed for building small, modular, interactive experiences directly in the browser (or desktop via electron) using a component-driven architecture.

✨ Philosophy

UrsaManus embraces:

⚛️ React-driven rendering

🧠 Strong TypeScript typing

🧩 Modular engine systems

🔬 Test-driven architecture

🚀 Lightweight micro-engine principles

This is not a traditional canvas-only engine.

Instead, UrsaManus explores a hybrid model:

Declarative UI (React)

Structured game logic (TypeScript systems)

## Engine-level architecture inside a modern frontend stack

🎯 Goals

Provide a structured engine core

Separate rendering, logic, and services

Encourage testable game systems

Remain lightweight, modular, and developer-friendly

## Support small browser-based games and interactive tools

Architecture Overview:

src/
components/ → React rendering layer
logic/ → Engine systems and core mechanics
services/ → Shared utilities and abstractions
styles/ → Styling and visual themes
tests/ → Test setup and utilities

---

UrsaManus is built around the idea that:

React handles UI rendering.
TypeScript handles structure.
You can make new modules with Typescript and plug them into the engine.
The engine coordinates everything, but you only need to load the modules you want to use.

---

🧪 Testing

UrsaManus uses:

Vitest

React Testing Library

jsdom environment

Both:

Pure TypeScript logic

React components

## are fully testable.

🚀 Getting Started

Install dependencies:
npm install

Run development server:
npm run dev

Run tests:
npm run test

Open Vitest UI:
npm run test:ui

📜 License:
All Rights Reserved, but pretty chill about if you wanna use it (just get a (free) icense, and attribute the core game engine).
