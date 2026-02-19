import { defineConfig } from 'vite';

export default defineConfig({
    base: '/MathRunner/',
    // Basic configuration
    build: {
        outDir: 'dist',
    },
    server: {
        open: true,
    }
});
