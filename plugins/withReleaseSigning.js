/**
 * Expo config plugin: sign the *release* APK with our own keystore instead of the
 * debug key. Values come from Gradle properties (-Ptasknest.keystore=... etc.), which the
 * GitHub Actions workflow passes in. Without them the build falls back to the debug key.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const MARKER = '// tasknest-release-signing';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    // 1) add a "release" signing config right after the existing "debug" one
    gradle = gradle.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s*\}\n)/,
      `$1        ${MARKER}
        release {
            if (project.hasProperty('tasknest.keystore')) {
                storeFile file(project.property('tasknest.keystore'))
                storePassword project.property('tasknest.storePassword')
                keyAlias project.property('tasknest.keyAlias')
                keyPassword project.property('tasknest.keyPassword')
            }
        }
`,
    );

    // 2) make the release build type use it (when provided)
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      `$1signingConfig project.hasProperty('tasknest.keystore') ? signingConfigs.release : signingConfigs.debug`,
    );

    if (!gradle.includes("signingConfigs.release")) {
      throw new Error('withReleaseSigning: could not patch android/app/build.gradle (template changed?)');
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
