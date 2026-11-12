#!/usr/bin/env node
/**
 * Script xuất 5 mã QR sự kiện Chuyện Nhà Táo:
 * - Cổng check-in: CONG23
 * - Trạm 1 Tôn Kính: TONKI1
 * - Trạm 2 Mái Ấm: MAIAM2
 * - Trạm 3 Nhìn Lại: NHINL3
 * - Trạm 4 Hướng Thiện: HUONG4
 *
 * Xuất cả 2 định dạng:
 * 1. PNG (980x980 px, siêu nét)
 * 2. SVG (Vector vô hạn độ phân giải, chuẩn in ấn nhà in)
 *
 * Cách dùng:
 *   node export-qr.js
 *   node export-qr.js https://ten-mien-cua-ban.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

// 1. Tải thư viện qrcode
const qrcodePath = path.join(__dirname, 'js', 'vendor', 'qrcode.min.js');
if (!fs.existsSync(qrcodePath)) {
  console.error('Không tìm thấy file js/vendor/qrcode.min.js');
  process.exit(1);
}
const qrcodeCode = fs.readFileSync(qrcodePath, 'utf8');

const context = {
  window: {},
  navigator: { userAgent: 'node' },
  document: { documentElement: { tagName: 'html' } }
};
context.window = context;
vm.runInNewContext(qrcodeCode, context);

function generateQRMatrix(text) {
  const qr = new context.QRCode({ title: '' }, {
    width: 256,
    height: 256,
    correctLevel: context.QRCode.CorrectLevel.H
  });
  qr._oDrawing = { draw: () => {}, makeImage: () => {}, clear: () => {} };
  qr.makeCode(text);
  const model = qr._oQRCode;
  const count = model.getModuleCount();
  const matrix = [];
  for (let r = 0; r < count; r++) {
    const row = [];
    for (let c = 0; c < count; c++) {
      row.push(model.isDark(r, c) ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

// 2. Chuyển matrix sang PNG Buffer (24-bit RGB)
function matrixToPngBuffer(matrix, cellSize = 20, margin = 4) {
  const modCount = matrix.length;
  const width = (modCount + margin * 2) * cellSize;
  const height = width;
  const lineSize = 1 + width * 3;
  const rawData = Buffer.alloc(lineSize * height);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter none
    const modY = Math.floor(y / cellSize) - margin;

    for (let x = 0; x < width; x++) {
      const modX = Math.floor(x / cellSize) - margin;
      const isDark = (modY >= 0 && modY < modCount && modX >= 0 && modX < modCount)
        ? (matrix[modY][modX] === 1)
        : false;

      const pxOffset = lineOffset + 1 + x * 3;
      if (isDark) {
        // Dark: #1b120c (27, 18, 12)
        rawData[pxOffset] = 27;
        rawData[pxOffset + 1] = 18;
        rawData[pxOffset + 2] = 12;
      } else {
        // Light: #ffffff (255, 255, 255)
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcBuf = buf.subarray(4, 8 + len);
    buf.writeUInt32BE(crc32(crcBuf), 8 + len);
    return buf;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// 3. Chuyển matrix sang SVG (Vector vô hạn độ phân giải)
function matrixToSvg(matrix, cellSize = 10, margin = 4) {
  const count = matrix.length;
  const size = (count + margin * 2) * cellSize;
  let paths = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r][c] === 1) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
      }
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <path d="${paths}" fill="#1b120c"/>
</svg>`;
}

// 4. Danh mục 5 mã QR cần xuất
const STATIONS = [
  {
    code: 'CONG23',
    filename: '01_CONG_CHECKIN_CONG23',
    title: 'Cổng Khai Hội (Check-in sự kiện)',
    sub: 'Quét để tạo Thẻ Vân Du Ký, nhập tên và bắt đầu',
    param: 'vao=CONG23'
  },
  {
    code: 'TONKI1',
    filename: '02_TRAM1_TON_KINH_TONKI1',
    title: 'Trạm 1: Tôn Kính',
    sub: 'Thắp sáng lòng biết ơn & Tôn kính tổ tiên',
    param: 'tram=TONKI1'
  },
  {
    code: 'MAIAM2',
    filename: '03_TRAM2_MAI_AM_MAIAM2',
    title: 'Trạm 2: Mái Ấm',
    sub: 'Gắn kết yêu thương & Hơi ấm gia đình',
    param: 'tram=MAIAM2'
  },
  {
    code: 'NHINL3',
    filename: '04_TRAM3_NHIN_LAI_NHINL3',
    title: 'Trạm 3: Nhìn Lại',
    sub: 'Lắng đọng tâm tư & Chiêm nghiệm một năm',
    param: 'tram=NHINL3'
  },
  {
    code: 'HUONG4',
    filename: '05_TRAM4_HUONG_THIEN_HUONG4',
    title: 'Trạm 4: Hướng Thiện & Quay Thưởng',
    sub: 'Gieo mầm điều lành & Mở khóa Vòng Quay May Mắn',
    param: 'tram=HUONG4'
  }
];

function main() {
  const args = process.argv.slice(2);
  let baseDomain = (args[0] || 'https://chuyen-nha-tao.vercel.app').trim();
  if (!baseDomain.startsWith('http://') && !baseDomain.startsWith('https://')) {
    baseDomain = 'https://' + baseDomain;
  }
  baseDomain = baseDomain.replace(/\/+$/, '');

  const outDir = path.join(__dirname, 'in_an_qr');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('====================================================');
  console.log('   XUẤT TRỌN BỘ 5 MÃ QR SỰ KIỆN — CHUYỆN NHÀ TÁO');
  console.log('====================================================');
  console.log(`Tên miền mã hóa: ${baseDomain}\nThư mục xuất: ${outDir}\n`);

  const report = [];

  STATIONS.forEach((s) => {
    const fullUrl = `${baseDomain}/?${s.param}`;
    const matrix = generateQRMatrix(fullUrl);

    // PNG độ nét cao (cellSize=20 -> 980x980 px)
    const pngBuf = matrixToPngBuffer(matrix, 20, 4);
    const pngPath = path.join(outDir, `${s.filename}.png`);
    fs.writeFileSync(pngPath, pngBuf);

    // SVG Vector
    const svgStr = matrixToSvg(matrix, 10, 4);
    const svgPath = path.join(outDir, `${s.filename}.svg`);
    fs.writeFileSync(svgPath, svgStr, 'utf8');

    console.log(`✔ Đã tạo: ${s.filename}`);
    console.log(`    Link: ${fullUrl}`);
    console.log(`    PNG : ${(pngBuf.length / 1024).toFixed(1)} KB (980x980 px)`);
    console.log(`    SVG : ${(svgStr.length / 1024).toFixed(1)} KB (Vector in ấn)\n`);

    report.push({
      title: s.title,
      code: s.code,
      url: fullUrl,
      png: `${s.filename}.png`,
      svg: `${s.filename}.svg`
    });
  });

  // Tạo file README hướng dẫn in ấn cho đội hậu cần & designer
  const guideContent = `# HƯỚNG DẪN IN ẤN & VẬN HÀNH MÃ QR SỰ KIỆN
Chuyện Nhà Táo — Đêm Hội Táo Quân
Tên miền sự kiện: ${baseDomain}
Ngày xuất file: ${new Date().toLocaleString('vi-VN')}

====================================================
DANH MỤC 5 MÃ QR SỰ KIỆN
====================================================

1. CỔNG CHECK-IN:
   - Mã dự phòng: CONG23
   - Đường dẫn: ${baseDomain}/?vao=CONG23
   - File PNG: 01_CONG_CHECKIN_CONG23.png (980x980px)
   - File SVG: 01_CONG_CHECKIN_CONG23.svg (Vector)
   - Vị trí dán: Cổng chào ra vào, Bàn lễ tân đón tiếp khách.
   - Nhiệm vụ: Khách quét để mở web, nhập tên & tạo Thẻ Vân Du Ký (TAO-XXXXXX).

2. TRẠM 1 — TÔN KÍNH:
   - Mã dự phòng: TONKI1
   - Đường dẫn: ${baseDomain}/?tram=TONKI1
   - File PNG: 02_TRAM1_TON_KINH_TONKI1.png
   - File SVG: 02_TRAM1_TON_KINH_TONKI1.svg
   - Vị trí: Bàn trải nghiệm Trạm 1.

3. TRẠM 2 — MÁI ẤM:
   - Mã dự phòng: MAIAM2
   - Đường dẫn: ${baseDomain}/?tram=MAIAM2
   - File PNG: 03_TRAM2_MAI_AM_MAIAM2.png
   - File SVG: 03_TRAM2_MAI_AM_MAIAM2.svg
   - Vị trí: Bàn trải nghiệm Trạm 2.

4. TRẠM 3 — NHÌN LẠI:
   - Mã dự phòng: NHINL3
   - Đường dẫn: ${baseDomain}/?tram=NHINL3
   - File PNG: 04_TRAM3_NHIN_LAI_NHINL3.png
   - File SVG: 04_TRAM3_NHIN_LAI_NHINL3.svg
   - Vị trí: Bàn trải nghiệm Trạm 3.

5. TRẠM 4 — HƯỚNG THIỆN:
   - Mã dự phòng: HUONG4
   - Đường dẫn: ${baseDomain}/?tram=HUONG4
   - File PNG: 05_TRAM4_HUONG_THIEN_HUONG4.png
   - File SVG: 05_TRAM4_HUONG_THIEN_HUONG4.svg
   - Vị trí: Bàn trải nghiệm Trạm 4.
   - Khi quét trạm này (đủ 4 dấu), máy của khách sẽ tự động kích hoạt Vòng Quay May Mắn nhận quà!

====================================================
KHUYẾN NGHỊ IN ẤN & THIẾT KẾ STANDEE
====================================================

1. Kích thước & Khung Standee:
   - Standee để bàn: Khổ A5 (148 x 210 mm) hoặc A4 (210 x 297 mm), kẹp chân mica chữ T hoặc chữ L.
   - Bảng cổng check-in: Standee chân cuốn chữ X (60 x 160 cm) hoặc dán decal cán bóng.
   
2. Định dạng gửi xưởng in:
   - Nếu tự in văn phòng: Mở file in-ma-qr.html bằng trình duyệt, bấm "In Standee" hoặc Ctrl+P.
   - Nếu gửi Designer / Nhà in: Gửi trực tiếp các file .svg (file vector không bao giờ vỡ nét) hoặc .png (980x980px).

3. Xử lý sự cố camera khách bị mờ / không quét được:
   - Mỗi standee đều có in sẵn mã 6 ký tự (CONG23, TONKI1, MAIAM2, NHINL3, HUONG4).
   - Khách có thể bấm nút "Nhập mã trạm bằng tay" trên Thẻ Vân Du Ký để nhận dấu bình thường.
`;

  fs.writeFileSync(path.join(outDir, 'HUONG_DAN_IN_AN.txt'), guideContent, 'utf8');

  console.log('====================================================');
  console.log('🎉 XUẤT THÀNH CÔNG TOÀN BỘ 5 MÃ QR & HƯỚNG DẪN IN ẤN!');
  console.log(`📁 Thư mục: ${outDir}`);
  console.log('   Mở file "in-ma-qr.html" trên trình duyệt để in trực tiếp hoặc xem trước Standee.');
  console.log('====================================================\n');
}

main();
