const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 3D model file extensions as assets
config.resolver.assetExts.push('glb', 'gltf', 'obj', 'mtl');

module.exports = config;
