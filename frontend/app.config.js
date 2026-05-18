const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const appConfig = require('./app.json');

const googleServicesPath = './google-services.json';
const resolvedGoogleServicesPath = path.join(__dirname, googleServicesPath);

const withCleartextTraffic = (config) =>
  withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    mainApplication.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });

module.exports = ({ config }) => {
  const staticConfig = appConfig.expo;
  const mergedConfig = { ...config, ...staticConfig };
  const plugins = [...(mergedConfig.plugins || []), withCleartextTraffic];
  const configWithPlugins = { ...mergedConfig, plugins };
  const android = { ...(configWithPlugins.android || {}) };

  if (fs.existsSync(resolvedGoogleServicesPath)) {
    android.googleServicesFile = googleServicesPath;
  } else {
    delete android.googleServicesFile;
  }

  return {
    ...configWithPlugins,
    android,
  };
};
