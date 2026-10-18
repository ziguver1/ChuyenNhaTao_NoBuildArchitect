// Test pseudo-random function and spacing
function pseudoRnd(col, row, seed = 1) {
  const n = Math.sin(col * 12.9898 + row * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

const W = 1080, H = 1920;
const stepX = 195;
const stepY = 165;
const baseR = 30;

let colCount = 0;
let rowCount = 0;
for (let cy = -baseR; cy <= H + stepY; cy += stepY) {
  rowCount++;
}
for (let cx = -stepX; cx <= W + stepX; cx += stepX) {
  colCount++;
}
console.log(`Grid cols: ${colCount}, rows: ${rowCount}`);

let solidCount = 0, ringCount = 0, starCount = 0;
let minR = 999, maxR = 0;

let rowIndex = 0;
for (let cy = -baseR; cy <= H + stepY; cy += stepY) {
  let colIndex = 0;
  for (let cx = -stepX; cx <= W + stepX; cx += stepX) {
    const rFactor = 0.68 + pseudoRnd(colIndex, rowIndex, 13) * 0.65;
    const dotR = baseR * rFactor;
    if (dotR < minR) minR = dotR;
    if (dotR > maxR) maxR = dotR;

    const typeVal = pseudoRnd(colIndex, rowIndex, 14);
    if (typeVal > 0.85) ringCount++;
    else if (typeVal < 0.08) starCount++;
    else solidCount++;

    colIndex++;
  }
  rowIndex++;
}

console.log(`Min R: ${minR.toFixed(1)}, Max R: ${maxR.toFixed(1)}`);
console.log(`Solid: ${solidCount}, Ring: ${ringCount}, Star: ${starCount}`);
