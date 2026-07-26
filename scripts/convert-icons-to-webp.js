/**
 * Converts the Smittenz launcher PNG icon to WEBP at all required mipmap densities
 * and writes clean notification_icon.png to all drawable density folders.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const LAUNCHER_SRC = path.join(__dirname, '../assets/images/icon.png');
const FOREGROUND_SRC = path.join(__dirname, '../assets/images/android-icon-foreground.png');
const NOTIF_SRC    = path.join(__dirname, '../assets/images/circular_notif_icon.png');
const RES = path.join(__dirname, '../android/app/src/main/res');

// Android mipmap sizes for launcher icons
const MIPMAP_DENSITIES = [
  { folder: 'mipmap-mdpi',    size: 48  },
  { folder: 'mipmap-hdpi',    size: 72  },
  { folder: 'mipmap-xhdpi',   size: 96  },
  { folder: 'mipmap-xxhdpi',  size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// Notification icon sizes per density
const NOTIF_DENSITIES = [
  { folder: 'drawable-mdpi',    size: 24  },
  { folder: 'drawable-hdpi',    size: 36  },
  { folder: 'drawable-xhdpi',   size: 48  },
  { folder: 'drawable-xxhdpi',  size: 72  },
  { folder: 'drawable-xxxhdpi', size: 96  },
];

async function run() {
  // 1. Launcher icons as WEBP
  const launcherBuf = fs.readFileSync(LAUNCHER_SRC);
  const foregroundBuf = fs.readFileSync(FOREGROUND_SRC);
  
  for (const { folder, size } of MIPMAP_DENSITIES) {
    const dir = path.join(RES, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const resizedLauncher = await sharp(launcherBuf).resize(size, size).webp({ quality: 95 }).toBuffer();
    const resizedForeground = await sharp(foregroundBuf).resize(size, size).webp({ quality: 95 }).toBuffer();
    
    fs.writeFileSync(path.join(dir, 'ic_launcher.webp'), resizedLauncher);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.webp'), resizedLauncher);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.webp'), resizedForeground);
    console.log(`✅ ${folder}/ic_launcher, ic_launcher_round, ic_launcher_foreground generated (${size}x${size})`);
  }

  // 2. Notification icons as clean PNG (white on transparent)
  const notifBuf = fs.readFileSync(NOTIF_SRC);
  for (const { folder, size } of NOTIF_DENSITIES) {
    const dir = path.join(RES, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const resized = await sharp(notifBuf)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(dir, 'notification_icon.png'), resized);
    console.log(`✅ ${folder}/notification_icon.png (${size}x${size})`);
  }

  console.log('\nAll icons updated!');
}

run().catch(e => { console.error(e); process.exit(1); });
