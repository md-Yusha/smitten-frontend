const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const INLINE_TRIM_START = `  private fun startTrim() {
    // Keep the editor visible while trimming instead of opening a system dialog.
    sendEvent("onStartTrimming", null)
    trimmerView?.onSaveClicked()
  }`;

function withVideoTrimInlineProgress(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const moduleSource = path.join(
        modConfig.modRequest.projectRoot,
        'node_modules/react-native-video-trim/android/src/main/java/com/videotrim/BaseVideoTrimModule.kt',
      );
      const trimmerSource = path.join(
        modConfig.modRequest.projectRoot,
        'node_modules/react-native-video-trim/android/src/main/java/com/videotrim/widgets/VideoTrimmerView.kt',
      );
      if (!fs.existsSync(moduleSource) || !fs.existsSync(trimmerSource)) return modConfig;

      const currentModule = fs.readFileSync(moduleSource, 'utf8');
      let nextModule = currentModule;
      if (!nextModule.includes('Keep the editor visible while trimming')) {
        nextModule = nextModule.replace(
          /  private fun startTrim\(\) \{[\s\S]*?\n  \}\n\n  private fun hideDialog/,
          `${INLINE_TRIM_START}\n\n  private fun hideDialog`,
        );
      }
      if (!nextModule.includes('Keep the editor visible while trimming')) {
        throw new Error('Could not patch react-native-video-trim progress dialog.');
      }
      if (nextModule !== currentModule) fs.writeFileSync(moduleSource, nextModule);

      const currentTrimmer = fs.readFileSync(trimmerSource, 'utf8');
      let nextTrimmer = currentTrimmer;
      if (!nextTrimmer.includes('import android.content.res.ColorStateList')) {
        nextTrimmer = nextTrimmer.replace(
          'import android.content.res.Configuration',
          `import android.content.res.ColorStateList
import android.content.res.Configuration`,
        );
      }
      if (!nextTrimmer.includes('Use the app accent color while the first video frame loads')) {
        nextTrimmer = nextTrimmer.replace(
          '    loadingIndicator = findViewById(R.id.loadingIndicator)',
          `    loadingIndicator = findViewById(R.id.loadingIndicator)
    // Use the app accent color while the first video frame loads.
    loadingIndicator.indeterminateTintList = ColorStateList.valueOf("#D94E74".toColorInt())`,
        );
      }
      if (!nextTrimmer.includes('Use the app accent color while the first video frame loads')) {
        throw new Error('Could not patch react-native-video-trim loading indicator.');
      }
      if (nextTrimmer !== currentTrimmer) fs.writeFileSync(trimmerSource, nextTrimmer);
      return modConfig;
    },
  ]);
}

module.exports = withVideoTrimInlineProgress;
