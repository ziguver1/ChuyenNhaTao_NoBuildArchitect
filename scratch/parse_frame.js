const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function parsePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8; // skip signature

  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
      bitDepth = buf.readUInt8(offset + 16);
      colorType = buf.readUInt8(offset + 17);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.slice(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  console.log(`Dimensions: ${width}x${height}, BitDepth: ${bitDepth}, ColorType: ${colorType}`);

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);

  // Unfilter PNG scanlines
  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
  const stride = width * bpp;
  const raw = Buffer.alloc(width * height * 4);

  let srcPos = 0;
  const prevRow = Buffer.alloc(stride);
  const curRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < stride; x++) {
      let val = decompressed[srcPos++];
      const a = x >= bpp ? curRow[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;

      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        val = (val + pr) & 0xff;
      }
      curRow[x] = val;
    }
    curRow.copy(prevRow);

    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      const srcIdx = x * bpp;
      if (bpp === 4) {
        raw[dstIdx] = curRow[srcIdx];
        raw[dstIdx + 1] = curRow[srcIdx + 1];
        raw[dstIdx + 2] = curRow[srcIdx + 2];
        raw[dstIdx + 3] = curRow[srcIdx + 3];
      } else if (bpp === 3) {
        raw[dstIdx] = curRow[srcIdx];
        raw[dstIdx + 1] = curRow[srcIdx + 1];
        raw[dstIdx + 2] = curRow[srcIdx + 2];
        raw[dstIdx + 3] = 255;
      }
    }
  }

  // Find overall non-transparent bounds
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = raw[(y * width + x) * 4 + 3];
      if (a > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`Bounding box: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}, w=${maxX - minX + 1}, h=${maxY - minY + 1}`);

  // Let's sample colors down the vertical center line (x = 1200) to find section boundaries
  const cx = 1200;
  console.log('Vertical center scan (every 50px):');
  for (let y = 100; y < height - 100; y += 100) {
    const idx = (y * width + cx) * 4;
    const r = raw[idx], g = raw[idx+1], b = raw[idx+2], a = raw[idx+3];
    // console.log(`y=${y}: rgb(${r},${g},${b},${a})`);
  }

  // Scan across a horizontal line in photo row 1 (e.g. y = 900)
  // Scan across a horizontal line in photo row 2 (e.g. y = 1400)
  // Let's find boxes by finding connected component or outline pixels
  // Let's scan along x = 300, x = 1200, x = 1800 from y = 400 to 1800
  // Let's find dark border lines (since boxes have dark borders!)
  // Or let's inspect row y from 400 to 3100
  const isBoxBorder = (x, y) => {
    const idx = (y * width + x) * 4;
    const r = raw[idx], g = raw[idx+1], b = raw[idx+2];
    // Check if border is darker
    return raw[idx+3] > 200 && r < 120 && g < 150 && b < 180;
  };

  // Scan vertical profile of row averages / border pixels
  console.log('Scanning for box bounds...');
  // Photo top area is roughly y: 400 to 1800
  // Bottom text area is roughly y: 1900 to 3100
  // Let's print out the exact boxes by checking coordinates!
  // Top row 1 photo center: x ~ 460, 1200, 1940; y ~ 850
  // Top row 2 photo center: y ~ 1400
  // Let's do horizontal & vertical scans to find exact pixel boundaries of all boxes:

  function findRectAround(startX, startY) {
    // Expand in 4 directions until color changes or hits border
    const baseIdx = (startY * width + startX) * 4;
    const br = raw[baseIdx], bg = raw[baseIdx+1], bb = raw[baseIdx+2];

    const match = (x, y) => {
      const i = (y * width + x) * 4;
      const dr = Math.abs(raw[i] - br), dg = Math.abs(raw[i+1] - bg), db = Math.abs(raw[i+2] - bb);
      return dr < 15 && dg < 15 && db < 15;
    };

    let l = startX, r = startX, t = startY, b = startY;
    while (l > 0 && match(l - 1, startY)) l--;
    while (r < width - 1 && match(r + 1, startY)) r++;
    while (t > 0 && match(startX, t - 1)) t--;
    while (b < height - 1 && match(startX, b + 1)) b++;
    return { l, r, t, b, w: r - l + 1, h: b - t + 1 };
  }

  // Probe candidates:
  console.log('Photo 1 (top-left):', findRectAround(500, 900));
  console.log('Photo 2 (top-mid):', findRectAround(1200, 900));
  console.log('Photo 3 (top-right):', findRectAround(1900, 900));
  console.log('Photo 4 (btm-left):', findRectAround(500, 1450));
  console.log('Photo 5 (btm-mid):', findRectAround(1200, 1450));
  console.log('Photo 6 (btm-right):', findRectAround(1900, 1450));

  // Probe bottom 4 text bars:
  console.log('Text Row 1:', findRectAround(1200, 2100));
  console.log('Text Row 2:', findRectAround(1200, 2350));
  console.log('Text Row 3:', findRectAround(1200, 2600));
  console.log('Text Row 4:', findRectAround(1200, 2850));

  return { width, height, raw, minX, maxX, minY, maxY };
}

module.exports = { parsePNG };

if (require.main === module) {
  parsePNG(path.join(__dirname, '..', 'images', 'chuyendem23', 'khungnoidung', '1.png'));
}

