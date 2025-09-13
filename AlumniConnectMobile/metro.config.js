/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable code splitting and bundle optimization
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Bundle splitting configuration
config.serializer = {
  ...config.serializer,
  createModuleIdFactory: () => {
    const fileToIdMap = new Map();
    let nextId = 0;
    
    return (path) => {
      // Use consistent IDs for better caching
      if (!fileToIdMap.has(path)) {
        fileToIdMap.set(path, nextId++);
      }
      return fileToIdMap.get(path);
    };
  },
};

// Optimize resolver for better tree shaking
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
  },
  // Enable symlinks for monorepo support
  unstable_enableSymlinks: true,
  // Enable package exports
  unstable_enablePackageExports: true,
};

// Cache configuration for faster builds
config.cacheVersion = '1.0';
config.maxWorkers = require('os').cpus().length;

// Source map configuration
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Enable source map support
      if (req.url.endsWith('.map')) {
        res.setHeader('Content-Type', 'application/json');
      }
      return middleware(req, res, next);
    };
  },
};

// Watch configuration for development
config.watchFolders = [
  ...(config.watchFolders || []),
  // Add additional watch folders if needed
];

// Asset configuration
config.transformer.assetRegistryPath = 'node_modules/react-native/Libraries/Image/AssetRegistry';

module.exports = config;