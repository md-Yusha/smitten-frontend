const fs = require('node:fs');
const path = require('node:path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const ICONS = {
  default: {
    alias: 'MainActivityDefault',
    label: 'Smittenz',
    icon: '@mipmap/ic_launcher',
    roundIcon: '@mipmap/ic_launcher_round',
    enabled: 'true',
  },
  calculator: {
    alias: 'MainActivityCalculator',
    label: 'Calculator',
    icon: '@drawable/ic_launcher_calculator',
    roundIcon: '@drawable/ic_launcher_calculator',
    enabled: 'false',
  },
  clock: {
    alias: 'MainActivityClock',
    label: 'Clock',
    icon: '@drawable/ic_launcher_clock',
    roundIcon: '@drawable/ic_launcher_clock',
    enabled: 'false',
  },
};

function hasLauncherIntent(activity) {
  const filters = activity['intent-filter'] ?? [];
  return filters.some((filter) => {
    const actions = filter.action ?? [];
    const categories = filter.category ?? [];
    return (
      actions.some((a) => a.$?.['android:name'] === 'android.intent.action.MAIN') &&
      categories.some((c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER')
    );
  });
}

function launcherIntentFilter() {
  return {
    action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
    category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
  };
}

function upsertAlias(app, aliasConfig) {
  app['activity-alias'] = app['activity-alias'] ?? [];
  const name = `.${aliasConfig.alias}`;
  const existing = app['activity-alias'].find((a) => a.$?.['android:name'] === name);
  const node = existing ?? { $: {} };
  node.$ = {
    ...node.$,
    'android:name': name,
    'android:enabled': aliasConfig.enabled,
    'android:exported': 'true',
    'android:targetActivity': '.MainActivity',
    'android:label': aliasConfig.label,
    'android:icon': aliasConfig.icon,
    'android:roundIcon': aliasConfig.roundIcon,
  };
  node['intent-filter'] = [launcherIntentFilter()];
  if (!existing) app['activity-alias'].push(node);
}

function javaModule(packageName) {
  return `package ${packageName};

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AppIconModule extends ReactContextBaseJavaModule {
  private static final String DEFAULT_ALIAS = "MainActivityDefault";
  private static final String CALCULATOR_ALIAS = "MainActivityCalculator";
  private static final String CLOCK_ALIAS = "MainActivityClock";

  public AppIconModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return "AppIconModule";
  }

  @ReactMethod
  public void changeIcon(String icon, Promise promise) {
    try {
      String alias = aliasForIcon(icon);
      Context context = getReactApplicationContext();
      PackageManager pm = context.getPackageManager();
      String packageName = context.getPackageName();

      setAliasEnabled(pm, packageName, alias, true);
      setAliasEnabled(pm, packageName, DEFAULT_ALIAS, DEFAULT_ALIAS.equals(alias));
      setAliasEnabled(pm, packageName, CALCULATOR_ALIAS, CALCULATOR_ALIAS.equals(alias));
      setAliasEnabled(pm, packageName, CLOCK_ALIAS, CLOCK_ALIAS.equals(alias));

      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("APP_ICON_CHANGE_FAILED", e);
    }
  }

  @ReactMethod
  public void getCurrentIcon(Promise promise) {
    try {
      Context context = getReactApplicationContext();
      PackageManager pm = context.getPackageManager();
      String packageName = context.getPackageName();

      if (isAliasEnabled(pm, packageName, CALCULATOR_ALIAS)) {
        promise.resolve("calculator");
      } else if (isAliasEnabled(pm, packageName, CLOCK_ALIAS)) {
        promise.resolve("clock");
      } else {
        promise.resolve("default");
      }
    } catch (Exception e) {
      promise.resolve("default");
    }
  }

  private String aliasForIcon(String icon) {
    if ("calculator".equals(icon)) return CALCULATOR_ALIAS;
    if ("clock".equals(icon)) return CLOCK_ALIAS;
    return DEFAULT_ALIAS;
  }

  private void setAliasEnabled(PackageManager pm, String packageName, String alias, boolean enabled) {
    ComponentName componentName = new ComponentName(packageName, packageName + "." + alias);
    pm.setComponentEnabledSetting(
      componentName,
      enabled ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
      PackageManager.DONT_KILL_APP
    );
  }

  private boolean isAliasEnabled(PackageManager pm, String packageName, String alias) {
    ComponentName componentName = new ComponentName(packageName, packageName + "." + alias);
    int state = pm.getComponentEnabledSetting(componentName);
    return state == PackageManager.COMPONENT_ENABLED_STATE_ENABLED ||
      (DEFAULT_ALIAS.equals(alias) && state == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT);
  }
}
`;
}

function javaPackage(packageName) {
  return `package ${packageName};

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AppIconPackage implements ReactPackage {
  @NonNull
  @Override
  public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new AppIconModule(reactContext));
    return modules;
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;
}

function patchMainApplication(filePath, packageName) {
  if (!fs.existsSync(filePath)) return false;
  let src = fs.readFileSync(filePath, 'utf8');
  const hasRegistration = filePath.endsWith('.kt')
    ? /add\(AppIconPackage\(\)\)|packages\.add\(AppIconPackage\(\)\)/.test(src)
    : /packages\.add\(new AppIconPackage\(\)\)/.test(src);
  if (hasRegistration) return true;

  if (filePath.endsWith('.kt')) {
    const importLine = `import ${packageName}.AppIconPackage\n`;
    if (!src.includes(importLine)) {
      const lastImport = src.lastIndexOf('import ');
      if (lastImport >= 0) {
        const end = src.indexOf('\n', lastImport) + 1;
        src = `${src.slice(0, end)}${importLine}${src.slice(end)}`;
      }
    }

    const registrationLine = 'packages.add(AppIconPackage())';
    const replacements = [
      {
        from: /val packages = PackageList\(this\)\.packages\n/,
        to: `val packages = PackageList(this).packages\n          ${registrationLine}\n`,
      },
      {
        from: /PackageList\(this\)\.packages\.apply\s*\{\n/,
        to: `PackageList(this).packages.apply {\n            add(AppIconPackage())\n`,
      },
      {
        from: /return PackageList\(this\)\.packages\n/,
        to: `return PackageList(this).packages.apply {\n            add(AppIconPackage())\n          }\n`,
      },
      {
        from: /= PackageList\(this\)\.packages\n/,
        to: `= PackageList(this).packages.apply {\n            add(AppIconPackage())\n          }\n`,
      },
    ];

    let registered = false;
    for (const { from, to } of replacements) {
      if (from.test(src)) {
        src = src.replace(from, to);
        registered = true;
        break;
      }
    }

    if (!registered) return false;
  } else {
    let registered = false;
    src = src.replace(
      /import com\.facebook\.react\.PackageList;\n/,
      `import com.facebook.react.PackageList;\nimport ${packageName}.AppIconPackage;\n`,
    );
    const javaPackageList = /List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);\n/;
    if (javaPackageList.test(src)) {
      src = src.replace(
        javaPackageList,
        `List<ReactPackage> packages = new PackageList(this).getPackages();\n          packages.add(new AppIconPackage());\n`,
      );
      registered = true;
    }
    if (!registered) return false;
  }

  fs.writeFileSync(filePath, src);
  return true;
}

function withAndroidAppIconModule(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);

    if (hasLauncherIntent(mainActivity)) {
      mainActivity['intent-filter'] = (mainActivity['intent-filter'] ?? []).filter((filter) => {
        const actions = filter.action ?? [];
        const categories = filter.category ?? [];
        return !(
          actions.some((a) => a.$?.['android:name'] === 'android.intent.action.MAIN') &&
          categories.some((c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER')
        );
      });
    }

    for (const icon of Object.values(ICONS)) upsertAlias(app, icon);

    return modConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const packageName = modConfig.android?.package ?? 'com.anonymous.smitten';
      const packagePath = packageName.split('.').join('/');
      const javaDir = path.join(androidRoot, 'app/src/main/java', packagePath);
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(path.join(javaDir, 'AppIconModule.java'), javaModule(packageName));
      fs.writeFileSync(path.join(javaDir, 'AppIconPackage.java'), javaPackage(packageName));

      const mainApplicationKt = path.join(javaDir, 'MainApplication.kt');
      const mainApplicationJava = path.join(javaDir, 'MainApplication.java');
      const patchedMainApplication =
        patchMainApplication(mainApplicationKt, packageName) || patchMainApplication(mainApplicationJava, packageName);
      if (!patchedMainApplication) {
        throw new Error('Could not register AppIconPackage in MainApplication. Update withAndroidAppIconModule.js for this Expo Android template.');
      }

      const drawableDir = path.join(androidRoot, 'app/src/main/res/drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(
        path.join(projectRoot, 'assets/images/ic_launcher_calculator.png'),
        path.join(drawableDir, 'ic_launcher_calculator.png'),
      );
      fs.copyFileSync(
        path.join(projectRoot, 'assets/images/ic_launcher_clock.png'),
        path.join(drawableDir, 'ic_launcher_clock.png'),
      );

      return modConfig;
    },
  ]);
}

module.exports = withAndroidAppIconModule;
