const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withAndroidDesugaring(config) {
  // Step 1: Patch app/build.gradle for desugaring
  config = withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;

    if (!gradle.includes('coreLibraryDesugaringEnabled')) {
      if (gradle.includes('compileOptions')) {
        gradle = gradle.replace(
          /compileOptions\s*\{/,
          `compileOptions {\n        coreLibraryDesugaringEnabled true`
        );
      } else {
        gradle = gradle.replace(
          /android\s*\{/,
          `android {\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }`
        );
      }
    }

    if (!gradle.includes('desugar_jdk_libs_nio')) {
      gradle = gradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs_nio:2.0.4'`
      );
    }

    config.modResults.contents = gradle;
    return config;
  });

  // Step 2: Patch gradle.properties for Jetifier
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const hasJetifier = props.some(
      (p) => p.type === 'property' && p.key === 'android.enableJetifier'
    );
    if (!hasJetifier) {
      props.push({ type: 'property', key: 'android.enableJetifier', value: 'true' });
    }
    return config;
  });

  return config;
};