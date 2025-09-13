import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      open: true,
      hmr: {
        port: 3001,
        host: "localhost"
      },
      watch: {
        usePolling: true,
        interval: 100
      },
      fs: {
        strict: false
      },
      proxy: {
        '/api': {
          target: 'http://localhost:54321',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/auth': {
          target: 'http://localhost:54321',
          changeOrigin: true,
          secure: false
        },
        '/storage': {
          target: 'http://localhost:54321',
          changeOrigin: true,
          secure: false
        },
        '/rest': {
          target: 'http://localhost:54321',
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
      }),
      mode === 'development' && componentTagger(),
      // Add Sentry plugin for production builds
      mode === 'production' && env.SENTRY_ORG && sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        sourceMaps: {
          assets: ["./dist/**"],
          ignore: ["node_modules/**"],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@types": path.resolve(__dirname, "./src/types"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@integrations": path.resolve(__dirname, "./src/integrations"),
        "@lib": path.resolve(__dirname, "./src/lib")
      },
    },
    define: {
      // Make env variables available to the app
      __DEV__: mode === 'development',
      __PROD__: mode === 'production',
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 800,
      
      // Additional production optimizations
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      
      // Source maps for production debugging
      sourcemap: mode === 'production' ? 'hidden' : true,
      
      // Target modern browsers for smaller bundles
      target: 'es2020',
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
        'lucide-react',
        'date-fns',
        'clsx',
        'tailwind-merge'
      ],
      exclude: ['@vite/client', '@vite/env']
    },
    // Environment-specific settings
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
    css: {
      devSourcemap: mode === 'development',
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    }
  };
});