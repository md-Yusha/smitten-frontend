const sharp = require('sharp');
const path = require('path');

const heartPath = 'C:/Users/likit/.gemini/antigravity/brain/227df510-465e-44c0-bf10-5d897d3b4349/smitten_notification_icon_1781203687150.png';
const cleanHeartPath = path.join(__dirname, '../assets/images/clean_heart_icon.png');
const circularNotifPath = path.join(__dirname, '../assets/images/circular_notif_icon.png');

async function run() {
  const { data, info } = await sharp(heartPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleanBuf = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = data[i+3];

    // The heart is white (255, 255, 255). The checkerboard background has values around 116-118.
    // If the pixel is close to white, keep it. Otherwise, make it transparent.
    if (r > 240 && g > 240 && b > 240) {
      cleanBuf[i] = 255;
      cleanBuf[i+1] = 255;
      cleanBuf[i+2] = 255;
      cleanBuf[i+3] = a; // keep original alpha
    } else {
      cleanBuf[i] = 0;
      cleanBuf[i+1] = 0;
      cleanBuf[i+2] = 0;
      cleanBuf[i+3] = 0; // completely transparent
    }
  }

  // Save clean heart
  await sharp(cleanBuf, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(cleanHeartPath);

  console.log('Clean heart icon saved to assets/images/clean_heart_icon.png');

  // Now, generate the circular cutout
  const width = 512;
  const height = 512;
  const circleBuf = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const rCircle = 240;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rCircle * rCircle) {
        circleBuf[idx] = 255;
        circleBuf[idx+1] = 255;
        circleBuf[idx+2] = 255;
        circleBuf[idx+3] = 255;
      } else {
        circleBuf[idx+3] = 0;
      }
    }
  }

  const { data: heartData, info: heartInfo } = await sharp(cleanHeartPath)
    .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ox = Math.round((width - heartInfo.width) / 2);
  const oy = Math.round((height - heartInfo.height) / 2);

  for (let hy = 0; hy < heartInfo.height; hy++) {
    for (let hx = 0; hx < heartInfo.width; hx++) {
      const hIdx = (hy * heartInfo.width + hx) * 4;
      const hAlpha = heartData[hIdx + 3];

      if (hAlpha > 0) {
        const targetX = ox + hx;
        const targetY = oy + hy;
        const cIdx = (targetY * width + targetX) * 4;
        
        circleBuf[cIdx + 3] = Math.max(0, circleBuf[cIdx + 3] - hAlpha);
      }
    }
  }

  await sharp(circleBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(circularNotifPath);

  console.log('Successfully generated circular cutout notification icon at assets/images/circular_notif_icon.png!');
}

run().catch(console.error);
