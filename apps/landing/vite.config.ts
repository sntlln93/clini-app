import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import path from 'node:path';
import { defineConfig } from 'vite';

// Server-rendered with TanStack Start (unlike the panel and dashboard SPAs):
// the landing has to ship its content in the initial HTML for search engines
// and link previews. Nitro builds the Node server (.output/server/index.mjs).
export default defineConfig({
    plugins: [tanstackStart(), nitro(), react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true,
        port: 5176,
        strictPort: true,
    },
});
