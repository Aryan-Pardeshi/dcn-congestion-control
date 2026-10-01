# components/ui

This folder follows the shadcn/ui convention: `components/ui` holds reusable
primitive UI components, which the shadcn CLI writes to and which are imported
via the `@/components/ui/...` alias (see `resolve.alias` in `vite.config.js`
and `paths` in `jsconfig.json`).

The project uses plain JavaScript (`.jsx`) + plain CSS — no Tailwind, no
TypeScript, no shadcn dependency. Components here use inline styles or plain
CSS so they work without those tools.

## Migrating later (optional)

1. Tailwind: `npm install tailwindcss @tailwindcss/vite` and add the plugin in
   `vite.config.js` (see the Tailwind + Vite setup guide).
2. TypeScript: `npm install -D typescript @types/react @types/react-dom`,
   then rename files to `.tsx` and add a `tsconfig.json`.
3. shadcn: `npx shadcn@latest init` and add components with
   `npx shadcn@latest add <component>`.
