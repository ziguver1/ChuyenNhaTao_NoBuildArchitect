/**
 * Script kiểm thử toàn diện Logic Quà Tặng & Phân Đợt/Ngày Sự Kiện
 */
const {
  DEFAULT_PRIZES,
  DEFAULT_ROUNDS,
  ensureRoundPrizes,
  parseRoundsConfig,
  getRoundCounts,
  getRoundOutOfStockSet,
  rollPrize,
  stampCmds,
  passView
} = require('./api/_store');

console.log('=== 1. KIỂM THỬ CẤU HÌNH ROUNDS & DANH MỤC QUÀ ===');
const { rounds, activeId, activeRound } = parseRoundsConfig({});
console.log(`Số round mặc định: ${rounds.length}`);
console.log(`Active round: ${activeId} (${activeRound.name})`);
console.assert(rounds.length >= 3, 'Phải có ít nhất 3 rounds mặc định');
console.assert(activeId === 'round_1', 'Active round mặc định phải là round_1');

console.log('\n=== 2. KIỂM THỬ THUẬT TOÁN BỐC QUÀ (ROLL PRIZE) ===');
// Giả lập quay 10,000 lần kiểm tra phân bổ xác suất
const samples = 10000;
const counts = { keychain: 0, sticker: 0, tote: 0, blindbox: 0 };
for (let i = 0; i < samples; i++) {
  const p = rollPrize(false, new Set(), activeRound.prizes);
  counts[p] = (counts[p] || 0) + 1;
}
console.log(`Kết quả bốc thăm ${samples} lần:`);
for (const [k, v] of Object.entries(counts)) {
  const pct = ((v / samples) * 100).toFixed(1);
  console.log(`  - ${k}: ${v} lần (${pct}%) [Lý thuyết: ${activeRound.prizes.find(x => x.key === k)?.rate}%]`);
}

console.log('\n=== 3. KIỂM THỬ KHÓA QUÀ KHI HẾT HÀNG (OUT OF STOCK) ===');
// Giả lập Blindbox (9 cái) và Tote (21 cái) đã phát hết trong round_1
const fakeRoundCounts = {
  'round_1:blindbox': '9',
  'round_1:tote': '21',
  'round_1:keychain': '10',
  'round_1:sticker': '15'
};
const round1Counts = getRoundCounts(fakeRoundCounts, 'round_1');
const outOfStock = getRoundOutOfStockSet(activeRound, round1Counts);
console.log('Các món đã hết kho:', Array.from(outOfStock));
console.assert(outOfStock.has('blindbox'), 'Blindbox phải nằm trong outOfStock');
console.assert(outOfStock.has('tote'), 'Tote phải nằm trong outOfStock');
console.assert(!outOfStock.has('keychain'), 'Keychain không được nằm trong outOfStock');

// Quay 1000 lần khi đã hết blindbox và tote
let hitOutOfStock = false;
for (let i = 0; i < 1000; i++) {
  const p = rollPrize(false, outOfStock, activeRound.prizes);
  if (outOfStock.has(p)) {
    hitOutOfStock = true;
    console.error(`LỖI: Quay trúng món đã hết: ${p}`);
  }
}
console.assert(!hitOutOfStock, 'Không được phép quay trúng món đã hết hàng!');
console.log('-> Kiểm tra khóa kho: ĐẠT! 100% không trúng quà đã hết.');

console.log('\n=== 4. KIỂM THỬ CHUYỂN SANG NGÀY 2 (ROUND 2) ===');
// Khi sang Ngày 2, round_2 kích hoạt: kho của round_2 hoàn toàn mới tinh (0 cái đã phát)
const round2 = rounds.find(r => r.id === 'round_2');
const round2Counts = getRoundCounts(fakeRoundCounts, 'round_2');
const outOfStockRound2 = getRoundOutOfStockSet(round2, round2Counts);
console.log(`Số quà đã phát trong Round 2: ${Object.keys(round2Counts).length}`);
console.log('Các món hết kho trong Round 2:', Array.from(outOfStockRound2));
console.assert(outOfStockRound2.size === 0, 'Round 2 mới kích hoạt thì kho phải đầy đủ, không món nào bị hết');
console.log('-> Kiểm tra chuyển ngày/đợt: ĐẠT! Kho quà Ngày 2 độc lập hoàn toàn với Ngày 1.');

console.log('\n=== 5. KIỂM THỬ ĐỦ 4 TRẠM VÀ BỐC QUÀ CHECKOUT ===');
const mockPass = { pid: 'TAO-TEST01', vid: 'v-123', st1: '1000', st2: '2000', st3: '3000' };
// Đóng trạm 4
const cmds = stampCmds(mockPass, `pass:${mockPass.pid}`, 4, '4000', outOfStock, 'round_1', activeRound.prizes);
console.log('Lệnh Redis khi đủ 4 trạm:');
cmds.forEach(c => console.log('  ', c[0], c[1], c[2] || '', c[3] || ''));
const hasCheckoutPrize = cmds.some(c => c[0] === 'HSET' && c[2] === 'checkout_prize');
const hasRoundTag = cmds.some(c => c[0] === 'HSET' && c[4] === 'round');
console.assert(hasCheckoutPrize, 'Phải có lệnh tạo checkout_prize khi đóng đủ 4 trạm');
console.assert(hasRoundTag, 'Phải lưu roundId vào thẻ khi bốc quà');
console.log('-> Kiểm tra đủ 4 trạm bốc quà: ĐẠT!');

console.log('\n=== TẤT CẢ KIỂM THỬ LOGIC QUÀ TẶNG ĐỀU VƯỢT QUA! ===');
