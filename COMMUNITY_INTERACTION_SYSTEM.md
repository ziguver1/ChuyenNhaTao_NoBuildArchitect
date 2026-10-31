# TÀI LIỆU HỆ THỐNG TƯƠNG TÁC SÁCH & CỘNG ĐỒNG (COMMUNITY INTERACTION SYSTEM)
*Tài liệu kỹ thuật tổng hợp toàn bộ cập nhật, kiến trúc và quy chuẩn phát triển cho tính năng Tương tác Cá chép & Bình luận theo trang.*

---

## 1. TỔNG QUAN KIẾN TRÚC & TÀI NGUYÊN

### 1.1. Bộ 4 Icon Cá Chép Bản Địa
Hệ thống tương tác của sách đã được chuyển đổi hoàn toàn sang biểu tượng Cá Chép theo 4 thông điệp cốt lõi:
| Mã Loại (`type`) | Tên Hiển Thị | Ý Nghĩa | Đường dẫn tệp |
| :--- | :--- | :--- | :--- |
| `maiam` | **Mái Ấm** | Tình cảm gia đình, hơi ấm bữa cơm | `images/reaction/maiam_icon.webp` |
| `tonkinh` | **Tôn Kính** | Lễ nghĩa, kính trọng tổ tiên / bề trên | `images/reaction/tonkinh_icon.webp` |
| `nhinlai` | **Nhìn Lại** | Chiêm nghiệm, lắng đọng sau câu chuyện | `images/reaction/nhinlai_icon.webp` |
| `huongthien` | **Hướng Thiện** | Lòng tốt, hành động sẻ chia tích cực | `images/reaction/huongthien_icon.webp` |

> [!NOTE]
> Toàn bộ 4 ảnh WebP đều được nạp sẵn vào RAM/GPU ngay khi mở sách thông qua hàm `preloadReactionAssets()` trong `book-community.js`, đảm bảo độ trễ bật animation và mở picker đạt **0ms**.

---

## 2. GIAO DIỆN & VỊ TRÍ HIỂN THỊ (DOM & CSS)

### 2.1. Vị Trí Thanh Tương Tác (`#ig-book-actions`)
* Nằm trực tiếp **ngay dưới khung sách** (`#flip-stage`) và **ngay trên cụm điều khiển lật trang** (`.flip-controls`).
* Layout dàn ngang (`flex-direction: row`), tự căn sát lề bên phải của trang sách (`justify-content: flex-end`) giúp người đọc dễ bấm bằng ngón tay cái mà **không bị che chữ hoặc tranh trong sách**.
* Chiều rộng tối đa tự động đồng bộ theo độ rộng của sách (`max-width: 900px` trên desktop và `min(92vw, 450px)` trên di động).

### 2.2. Các Thành Phần Con Trong Thanh Tương Tác
1. **Nút Thả Cá Chép (`#btn-ig-reaction`)**:
   - Chứa ảnh đại diện cá chép hiện tại (`#ig-current-reaction-img`).
   - Số đếm reaction của riêng trang đó (`#count-reactions`).
   - Hỗ trợ cả 2 hành vi:
     - **Chạm nhanh (Click / Tap)**: Thả cá chép bay lên.
     - **Nhấn giữ (Long-press > 350ms)**: Bật Bảng chọn 4 cá chép (`#ig-reaction-picker`).
2. **Nút Bình Luận (`#btn-ig-comments`)**:
   - Icon bong bóng chat kèm số đếm bình luận của trang (`#count-comments`).
   - Mở Bottom Sheet (Instagram Drawer) hiển thị bình luận riêng của trang đó.
3. **Nút Gửi / Chia Sẻ (`#btn-ig-share`)**:
   - Icon máy bay giấy kèm nhãn "Gửi", mở popup chia sẻ hoặc liên kết Thẻ Thông Hành.
4. **Bảng Chọn Cá Chép Nổi (`#ig-reaction-picker`)**:
   - Nằm trực tiếp bên trong `#ig-book-actions`, nổi lên phía trên nút bấm:
     ```css
     bottom: calc(100% + 8px);
     right: 4px;
     transform-origin: bottom right;
     ```
   - Thiết kế dạng capsule mờ sang trọng, tự thu nhỏ/phóng to mượt mà (`transform: scale(0.92)` -> `scale(1)`).

### 2.3. Quy Chuẩn Màu Sắc & Hiệu Ứng Nền (Glassmorphism)
* Nền của các nút tròn tương tác (`.ig-act-btn`) sử dụng độ mờ trong suốt thấp:  
  `background: rgba(24, 14, 10, 0.22);` kết hợp `backdrop-filter: blur(8px);`
* Đường viền tinh tế: `border: 1px solid rgba(255, 230, 180, 0.3);`
* Chữ và số hiển thị trắng sáng có drop-shadow chống chìm trên mọi nền tranh.

---

## 3. CƠ CHẾ ĐỊNH DANH & QUY TẮC ĐẾM (IDENTITY & REACTION RULES)

### 3.1. Quy Tắc Đếm Cá Chép
* **Mỗi tài khoản / thiết bị chỉ được tính 1 lượt reaction duy nhất trên mỗi trang sách.**
* **Không tăng khống khi ấn nhiều lần**: Người dùng có thể spam tap hoặc double-tap trên sách, hiệu ứng cá chép bay lượn và âm thanh chuông vẫn phát liên tục để tạo cảm xúc vui thích, nhưng server và local state **không cộng dồn số đếm**.
* **Đổi Icon linh hoạt**: Người dùng có thể chuyển đổi giữa 4 icon bất kỳ lúc nào bằng cách giữ nút hoặc mở picker. Khi đổi icon:
  - Giảm đếm 1 ở icon cũ.
  - Tăng đếm 1 ở icon mới.
  - **Tổng số lượt thả của trang được giữ nguyên không đổi**.
* Đã gỡ bỏ toàn bộ toast popup thông báo khi đổi icon để trải nghiệm đọc không bị gián đoạn.

### 3.2. Cơ Chế Định Danh Người Dùng (Anonymous & Named Users)
Hàm lấy ID `getAccountId()` trong `book-community.js`:
```javascript
export function getAccountId() {
  const pass = getPass();
  if (pass && pass.id) return pass.id; // Nếu đã tạo Thẻ Thông Hành
  let vid = store.get('visitor_device_id', '');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    store.set('visitor_device_id', vid);
  }
  return vid; // Mã khách vãng lai ẩn danh duy nhất
}
```
* **Khi người dùng chưa đặt tên / chưa tạo Thẻ Thông Hành:**
  - Hệ thống tự động cấp `visitor_device_id` duy nhất lưu trong `localStorage`.
  - Phía máy chủ kiểm tra bảng hash `book:react:u:<page>` theo ID này.
  - **Do đó, người dùng chưa đặt tên vẫn được đếm chính xác 100%, không bị đếm trùng lặp.**
* **Đối với bình luận:**
  - Nếu để trống tên: tự động dùng tên `"Bạn đọc"` (hoặc `"Bạn đọc giấu tên"` trên server). Bình luận vẫn lưu và hiển thị bình thường.

---

## 4. BÌNH LUẬN RIÊNG BIỆT THEO TỪNG TRANG (PAGE-SCOPED COMMENTS)

### 4.1. Vòng Đời Chuyển Trang (Page Flip Lifecycle)
1. Người dùng lật sách $\to$ Thư viện lật trang kích hoạt `onFlipbookPageChanged(pageIndex)`:
   - `currentPageIndex = pageIndex`
   - `currentPageKey = 'p_' + pageIndex` (ví dụ: `p_3`, `p_4`...)
2. Tự động cập nhật tiêu đề Drawer:
   ```javascript
   sheetTitle.innerHTML = `Bình luận <span class="ig-page-badge">${pageLabel(pageIndex)}</span> (<span id="ig-sheet-count">0</span>)`;
   ```
3. Nút tương tác `#count-comments` tự động hiển thị số lượng bình luận của **chính trang đó**.
4. Gửi yêu cầu GET về API:  
   `GET /api/community?page=p_X&uid=...` để nạp danh sách bình luận riêng của trang đó.

### 4.2. Cơ Cấu Lưu Trữ Server (Redis)
* **Reactions của trang**: Hash `book:react:${page}` (các field: `total`, `maiam`, `tonkinh`, `nhinlai`, `huongthien`).
* **Lịch sử react của người dùng trên trang**: Hash `book:react:u:${page}` (`uid` $\to$ `type`).
* **Bình luận của từng trang**: Sorted Set `book:comm:${page}` với `score = timestamp`:
  ```json
  {
    "id": "c_xxxx_yyyy",
    "page": "p_3",
    "name": "Thanh Trúc",
    "content": "Nội dung bình luận...",
    "chapter": "ch1",
    "ts": 1730000000000,
    "likes": 0
  }
  ```
* **Dự phòng Offline (Fallback)**: Khi mất kết nối, trình duyệt lưu vào `offline_comm_${currentPageKey}`.

---

## 5. XỬ LÝ SỰ KIỆN CẢM ỨNG & TỐI ƯU HIỆU NĂNG

### 5.1. Ngăn Chặn Xung Đột Với Bộ Lật Sách (`stopStagePropagation`)
Khung sách `StPageFlip` bắt các sự kiện vuốt ngang màn hình để lật trang. Để việc nhấn, giữ hoặc cuộn trong thanh tương tác không làm lật trang ngoài ý muốn:
* Hàm `stopStagePropagation(el)` chặn các sự kiện:  
  `touchstart`, `touchmove`, `touchend`, `touchcancel`, `mousedown`, `mousemove`, `mouseup`, `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `dblclick`.
* Các phần tử tương tác được gán thuộc tính CSS chống trượt mặc định:
  - `.ig-act-btn`: `touch-action: manipulation;`
  - `#ig-reaction-picker`: `touch-action: none;`

### 5.2. Khắc Phục Cảnh Báo Chrome Intervention
* Khi trình duyệt đang xử lý thao tác cuộn (scrolling), sự kiện `touchmove`/`touchend` có thể có thuộc tính `e.cancelable === false`. Việc gọi `e.preventDefault()` trong trường hợp này sẽ gây cảnh báo đỏ trên Console.
* **Cách khắc phục chuẩn đã áp dụng**:
  1. Kiểm tra điều kiện: `if (e.cancelable) e.preventDefault();`
  2. Bọc an toàn toàn cục trong `js/main.js`:
     ```javascript
     const originalPreventDefault = Event.prototype.preventDefault;
     Event.prototype.preventDefault = function () {
       if (this.cancelable) {
         originalPreventDefault.call(this);
       }
     };
     ```

### 5.3. Hiệu Ứng Cá Chép Bay & Pop Trung Tâm
1. **Cá chép nhỏ bay lên (`triggerCarpBurst`)**:
   - Sinh 4–8 hạt cá chép nhỏ bay lệch góc ngẫu nhiên từ vị trí nút bấm hoặc điểm double-tap.
   - Sử dụng CSS Keyframe `igCarpFlyUp` với hiệu ứng xoay lắc nhẹ và mờ dần trong 1.3s.
2. **Cá chép lớn bung nở (`triggerBigCarpPop`)**:
   - Tạo phần tử `.ig-big-carp-burst` gắn trực tiếp vào `document.body` với `position: fixed`.
   - Sử dụng GPU acceleration (`transform: translate3d(-50%, -50%, 0) scale(...)`).
   - Tự hủy phần tử khỏi DOM sau 800ms, không gây rò rỉ bộ nhớ (memory leak).

---

## 6. HƯỚNG DẪN THAM CHIẾU KHI PHÁT TRIỂN CHỨC NĂNG TIẾP THEO

Khi bạn xây dựng tính năng mới (ví dụ: chia sẻ trang, trích dẫn truyện, đánh dấu bookmark, huy chương, v.v.):

1. **Lấy thông tin trang hiện tại**:
   - Tham chiếu biến: `currentPageKey` (định dạng `p_X`) hoặc hàm `currentPageIndex` từ module `book-community.js` / `flipbook.js`.
   - Lấy nhãn hiển thị: `pageLabel(currentPageIndex)` (ví dụ: *"Chương I · Trang 2"*).
2. **Thêm nút thao tác mới vào thanh công cụ**:
   - Đặt thẻ `<button>` bên trong `<aside class="ig-book-actions" id="ig-book-actions">`.
   - Sử dụng class chuẩn `.ig-act-btn` để thừa hưởng style tròn, viền vàng kim và hiệu ứng glassmorphism.
   - Luôn nhớ gọi `stopStagePropagation(newButton)` để tránh lật sách nhầm khi người dùng chạm vào.
3. **Giao tiếp API máy chủ**:
   - Khi mở rộng endpoint, tuân thủ query param `page=p_X` và `uid=getAccountId()`.
   - Luôn có cơ chế fallback lưu tạm vào `store.get('tên_key_' + currentPageKey)` khi offline.
4. **Đồng bộ Nickname**:
   - Dùng `getUserNickname()` và `setUserNickname(name)` để nickname tự động đồng bộ xuyên suốt giữa Thẻ Thông Hành, Form bình luận và Header.

---

## 7. HỆ THỐNG PHÂN TÍCH QUẢN TRỊ KHOA HỌC (ADMIN ANALYTICS DASHBOARD)

Trang quản trị `admin.html` và backend `api/admin.js` được phân chia thành **4 Phân hệ Tab chuyên biệt** để tối ưu hóa trải nghiệm quản lý (UI/UX) cho ban tổ chức:
- **Tab 1: Cảm xúc & Tương tác sách** (`#tab-community`): Thống kê chiều sâu nội dung sách, cảm xúc 4 cá chép, Attention Heatmap từng trang, nhật ký bình luận.
- **Tab 2: Vòng quay & Kho quà** (`#tab-wheel`): Quản lý gamification, thiết lập các đợt quay (Rounds), tùy biến quà mới, điều chỉnh tỉ lệ trúng (%) bắt buộc 100%.
- **Tab 3: Người tham gia & Hộ chiếu** (`#tab-people`): Dàn 8 thẻ KPI card trực quan cao cấp + Bảng CRM chi tiết theo từng mã thẻ/độc giả.
- **Tab 4: Mã QR Sự kiện** (`#tab-qr`): Quản lý mã QR cổng check-in và 4 trạm đóng dấu.

### 7.1. Hệ Chỉ Số Đo Lường (Metrics Framework)
1. **Tổng Lượt Tương Tác (Total Interactions)**:
   $$\text{Total Interactions} = \text{Reactions} + \text{Comments} + \text{Shares}$$
2. **Tỷ Lệ Tương Tác Bình Quân (Engagement Rate)**:
   $$\text{Engagement Rate} = \frac{\text{Total Interactions}}{\max(1, \text{Tổng Độc Giả})}$$
3. **Cảm Xúc Chủ Đạo (Dominant Emotion)**:
   - Tự động thống kê và xếp hạng 4 loại cá chép (`maiam`, `tonkinh`, `nhinlai`, `huongthien`).
   - Xác định loại cá chép chiếm tỷ trọng % cao nhất để nhận diện thông điệp chạm đến người đọc nhiều nhất.
4. **Hệ Số Lan Tỏa (Virality / Share Rate)**:
   $$\text{Share Rate} = \frac{\text{Total Shares}}{\max(1, \text{Tổng Độc Giả})} \times 100\%$$
5. **Tỷ Lệ Bình Luận Sâu (Comment Conversion Rate)**:
   $$\text{Comment Rate} = \frac{\text{Total Comments}}{\max(1, \text{Tổng Độc Giả})} \times 100\%$$

### 7.2. Phân Bổ Hành Vi Chia Sẻ (Share Attribution)
Theo dõi hành vi chia sẻ thực tế và chuẩn xác của người đọc:
- **Chia sẻ qua Di động (`mobile`)**: Người đọc nhấn nút gửi trên điện thoại $\to$ Trình duyệt gọi Web Share API mở trực tiếp Menu chia sẻ của hệ điều hành (iOS / Android Share Sheet) để người đọc chọn bất kỳ ứng dụng nào cài trên máy (Zalo, Messenger, Tin nhắn SMS, Instagram, AirDrop...).
- **Chia sẻ qua Máy tính (`web`)**: Người đọc xem trên máy tính $\to$ Bật modal sao chép liên kết hoặc chia sẻ web.
- **Top Trang Được Chia Sẻ**: Thống kê những trang truyện/nội dung có lượt bấm gửi cao nhất.

### 7.3. Bản Đồ Nhiệt Từng Trang & Điểm Sức Hút (Page Attention Heatmap)
Công thức tính **Điểm Sức Hút (Hotness Index)** cho từng trang sách:
$$\text{Hot Score} = (\text{Reaction} \times 1) + (\text{Comment} \times 3) + (\text{Share} \times 5)$$
*Giải thích logic trọng số*:
- *Reaction ($\times 1$)*: Tương tác chạm cơ bản.
- *Comment ($\times 3$)*: Mức độ đầu tư thời gian và biểu đạt cảm xúc gấp 3 lần.
- *Share ($\times 5$)*: Mức độ tâm đắc muốn lan tỏa đến người khác gấp 5 lần.

Kèm theo thanh nhiệt trực quan (Gradient Heat Bar) giúp người quản trị phát hiện ngay các trang "điểm chạm cao trào" của cuốn sách.

### 7.4. Nhật Ký Bình Luận Thời Gian Thực (Live Comments Stream)
- Tự động tổng hợp bình luận từ toàn bộ 18 trang sách.
- Hỗ trợ bộ lọc theo từng Chương (`Tất cả`, `Chương I`, `Chương II`, `Chương III`, `Chương IV`, `Chung`).
- Ô tìm kiếm thời gian thực theo tên độc giả hoặc từ khóa nội dung.

### 7.5. Xuất Dữ Liệu CSV
Hỗ trợ 2 nút xuất báo cáo độc lập:
1. **Xuất CSV Người chơi**: Danh sách hộ chiếu, check-in sự kiện, quà vòng quay, mã thẻ.
2. **Xuất CSV Tương tác**: Báo cáo chi tiết từng trang sách (Reactions, 4 loại cá chép, Comments, Shares, Hotness) và Toàn bộ nhật ký bình luận.

---

## 8. HỆ THỐNG ĐỢT QUAY (ROUNDS), THÊM QUÀ MỚI & QUY TẮC BẮT BUỘC 100% TỈ LỆ (%)

Để ban tổ chức sự kiện dễ dàng mở rộng và phân bổ quà đều đặn theo từng ca hoặc từng ngày (không bị quay cạn kiệt quà quý ngay trong buổi sáng), hệ thống đã tích hợp kiến trúc **Multi-Round Gamification Engine** với khả năng tùy biến danh mục quà động và kiểm soát xác suất tuyệt đối:

### 8.1. Cấu Trúc Dữ Liệu Của Mỗi Đợt (Round Model Động)
Mỗi Đợt (Round) sở hữu danh mục phần quà riêng biệt với đầy đủ thuộc tính hiển thị:
```json
{
  "id": "round_1",
  "name": "Đợt 1: Khởi động (Sáng 23)",
  "status": "active",
  "prizes": [
    { "key": "aothun", "name": "Áo thun Chuyện Nhà Táo", "short": "Áo thun", "color": "#0284c7", "ink": "#ffffff", "icon": "👕", "stock": 5, "rate": 10, "isGift": true },
    { "key": "sticker", "name": "Sticker Táo Quân", "short": "Sticker", "color": "#b8241c", "ink": "#fff3d6", "icon": "sticker", "stock": 50, "rate": 35, "isGift": true },
    { "key": "keychain", "name": "Móc khoá cá chép", "short": "Móc khoá", "color": "#e3a92b", "ink": "#4a2408", "icon": "key", "stock": 10, "rate": 20, "isGift": true },
    { "key": "blindbox", "name": "Blindbox bí ẩn", "short": "Blindbox", "color": "#33245c", "ink": "#f3d27a", "icon": "gift", "stock": 2, "rate": 5, "isGift": true },
    { "key": "none", "name": "Chúc may mắn lần sau", "short": "Lời chúc", "color": "#2f6a47", "ink": "#fff3d6", "icon": "clover", "stock": 0, "rate": 30, "isGift": false }
  ]
}
```

### 8.2. Cơ Chế Thêm Quà Mới Vào Vòng Quay (+ Thêm Quà Mới)
- Admin có thể nhấn nút **"+ Thêm Quà Mới"** để bổ sung bất kỳ phần quà nào (Áo thun, Bình giữ nhiệt, Sách truyện, Túi tote...).
- Cấu hình từng chi tiết: Tên đầy đủ, Chữ hiển thị trên nan vòng quay (tối đa 12 ký tự), Biểu tượng emoji (👕, 🎁, 📚, ☕, 🎒...), Màu sắc cánh nan quạt, Kho phân bổ của đợt và Tỉ lệ trúng thưởng (%).
- Hỗ trợ xóa quà tự tạo (quà mặc định sự kiện được bảo vệ cấu trúc tối thiểu).

### 8.3. Điều Kiện Bắt Buộc Đủ 100% (Strict 100% Rate Enforcement)
- **Kiểm tra 2 lớp (Frontend & Backend)**:
  - Trên giao diện: Huy hiệu tổng tỉ lệ hiển thị màu xanh khi đúng 100%. Nếu $\neq 100\%$, bảng cảnh báo màu đỏ hiện rõ số % còn thiếu hoặc đang dư, đồng thời **khóa nút "Lưu & Áp Dụng Vòng Quay"**.
  - Dưới API (`POST /api/admin`): Máy chủ tính toán `Math.round(totalRate * 10) / 10`. Nếu $\neq 100\%$, API từ chối với mã lỗi `HTTP 400` (`rates_must_equal_100`), ngăn chặn hoàn toàn sai sót toán học khi vận hành thực tế.

### 8.4. Đồng Bộ Trực Tiếp Lên Vòng Quay Của Độc Giả (Live Dynamic Wheel Layout)
- Vòng quay của độc giả (`lucky-wheel.js`) tự động gọi `GET /api/pass?action=wheel` khi mở app hoặc khi có cấu hình mới.
- Vòng quay tính toán góc chia độ ($\Delta \theta = 360^\circ / N$) dựa trên số nan quạt thực tế của đợt đang kích hoạt.
- Tự động đan xen (interleaving) các ô quà để 2 ô cùng màu không bị đặt cạnh nhau, giữ trọn thẩm mỹ dân gian trang nhã.

### 8.5. Cơ Chế Khóa Kim Tự Động Theo Đợt (Zero-Visual Leak)
- **Kiểm soát kho theo Đợt**: Khi một món quà trong Đợt hiện tại đạt giới hạn kho (ví dụ: đã trao đủ 5 Áo thun), máy chủ lập tức loại món quà đó khỏi xác suất bốc thăm của Đợt.
- **Khóa kim tuyệt đối**: Kim vòng quay trên điện thoại độc giả sẽ không bao giờ dừng lại ở ô đã hết kho.
- **Giữ nguyên giao diện**: Ô quà trên vòng quay vẫn giữ nguyên đồ họa đẹp mắt, không làm mờ, không báo hết hàng để bảo vệ trải nghiệm của độc giả.
- **Mở lại tự động ở Đợt tiếp theo**: Khi Admin chuyển sang Đợt mới, bộ đếm bắt đầu cho đợt đó và kim vòng quay lại tự động mở quay bình thường!

### 8.6. Vòng Quay Mô Phỏng Trực Tiếp (100% Live Clone Wheel Cho Admin)
- **Đồng bộ thời gian thực 100%**: Ngay trong Tab 2 ("Vòng quay & Kho quà"), một cột bên phải hiển thị chiếc Vòng quay may mắn giống hệt 100% như trên điện thoại người chơi (cùng kích thước SVG, 24 bóng đèn viền, hoa đào ngũ phúc, kim chỉ giọt nước, font thư pháp *Potta One* và tâm "PHÚC LỘC").
- **Phản hồi tức thì khi thay đổi cấu hình**: Khi Admin đổi tên chữ nan quạt, thay đổi % tỉ lệ, chuyển đợt hay thêm quà mới, chiếc vòng quay clone này tự động cập nhật lại các nan quạt ngay lập tức mà không cần F5.
- **Tính năng Quay Thử Nghiệm (Test Spin)**:
  - Cho phép Admin nhấn nút *"Quay thử nghiệm"* để chạy thử animation quay thực tế (dùng GSAP với đường cong giảm tốc `power4.out`).
  - Tự động phát âm thanh kim va chạm qua từng nan quạt và nhạc chuông chiến thắng (Web Audio API Synthesizer).
  - Bảng chẩn đoán kim dừng (Diagnostics) phân tích rõ ràng: trúng phần quà nào, xác suất bao nhiêu %, kho còn lại bao nhiêu, và xác nhận kim dừng chính xác vào nan quạt.
- **Nút Đặt lại góc quay (↺)**: Đưa vòng quay về vị trí xuất phát ban đầu để sẵn sàng cho lần thử tiếp theo.




