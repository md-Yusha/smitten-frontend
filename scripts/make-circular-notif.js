const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const heartPath = 'C:/Users/likit/.gemini/antigravity/brain/227df510-465e-44c0-bf10-5d897d3b4349/smitten_notification_icon_1781203687150.png';
const outputPath = path.join(__dirname, '../assets/images/circular_notif_icon.png');

async function run() {
  // Load resized heart raw pixels
  const { data: heartData, info: heartInfo } = await sharp(heartPath)
    .resize(280, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = 512;
  const height = 512;
  const circleBuf = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const r = 240;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        // inside circle: make it white
        circleBuf[idx] = 255;
        circleBuf[idx+1] = 255;
        circleBuf[idx+2] = 255;
        circleBuf[idx+3] = 255;
      } else {
        // outside circle: transparent
        circleBuf[idx+3] = 0;
      }
    }
  }

  // Composite the heart raw pixels onto the center of the circle
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
        
        // Subtract alpha to create the cutout
        circleBuf[cIdx + 3] = Math.max(0, circleBuf[cIdx + 3] - hAlpha);
      }
    }
  }

  await sharp(circleBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);
    
  console.log('Successfully generated circular cutout notification icon via pixel manipulation!');
}

run().catch(console.error);
