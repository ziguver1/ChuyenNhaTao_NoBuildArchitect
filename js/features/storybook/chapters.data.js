/**
 * Dữ liệu 4 chương sách điện tử Chuyện Nhà Táo và cấu hình phân trang
 */

export const CHAPTERS = [
  {
    short: 'Tôn kính',
    title: 'Thành kính và tôn kính cội nguồn',
    meaning: 'Trân trọng cội nguồn',
    icon: 'flower-lotus',
    img: 'images/chuong-3.webp',
    alt: 'Ông dạy cháu thắp hương trước bàn thờ có mũ áo giấy ông Táo',
    seed: 'Nhà bạn đang giữ lại một nếp nào từ ông bà?',
    story:
      'Mỗi nhà có một mạch nguồn riêng: chiếc kiềng của bà, thúng gạo nếp của mẹ, nén hương ông thắp mỗi chiều cuối năm. Tôn kính nếp nhà là những điều giản dị được trao qua nhiều thế hệ: kính trọng tổ tiên, biết ơn từng giọt mồ hôi. Ngày tiễn ông Táo, mùi hương trầm nhắc ta nhớ mình từ đâu đến.',
    badge: {
      name: 'Huy hiệu Tôn Kính',
      desc: 'Trân trọng cội nguồn và thành kính với tổ tiên.',
      img: 'images/huychuong/huychuong3.webp'
    },
    listen: {
      object: 'nén hương',
      icon: 'flower-lotus',
      teller: 'Ông kể',
      lines: [
        'Ông dạy cháu thắp hương: hai tay cầm nén, cúi đầu ba lần cho thành kính.',
        'Cháu hỏi vì sao phải làm vậy. Ông cười, ngày xưa cụ dạy ông y như thế.',
        'Giờ ông dạy cháu, mai kia cháu lại dạy con của cháu.',
        'Nếp nhà không nằm trong sách, nó nằm trong những lần mình làm cùng nhau.'
      ],
      takeaway: 'Tôn kính và biết ơn cội nguồn nhắc ta nhớ mình từ đâu đến.'
    }
  },
  {
    short: 'Mái ấm',
    title: 'Gìn giữ mái ấm và hòa thuận',
    meaning: 'Giữ ấm một mái nhà',
    icon: 'house-line',
    img: 'images/chuong-2.webp',
    pos: '44% 50%', // tranh ngang: giữ bà và cháu ở giữa khung
    alt: 'Gia đình ba thế hệ quây quần bên mâm cơm chiều cuối năm',
    seed: 'Lần gần nhất cả nhà ngồi ăn cơm cùng nhau là khi nào?',
    story:
      'Ba vị Táo, hai ông một bà, như ba chân kiềng đỡ nồi cơm của cả nhà. Ngoài kia có giông gió đến đâu, về bên bếp lửa thì mọi bất đồng đều nhường chỗ cho thấu hiểu. Giữ lửa không chỉ là giữ than hồng, mà là giữ lời nói nhẹ nhàng và sự bao dung cho người thương dưới một mái nhà.',
    badge: {
      name: 'Huy hiệu Mái Ấm',
      desc: 'Giữ lửa bằng sự lắng nghe và bao dung.',
      img: 'images/huychuong/huychuong2.webp'
    },
    listen: {
      object: 'mâm cơm',
      icon: 'bowl-food',
      teller: 'Mẹ kể',
      lines: [
        'Năm ấy bố đi làm xa, tới tận chiều 23 mới về tới nhà.',
        'Cả nhà vẫn ngồi đợi, nồi cơm được ủ trong rơm cho khỏi nguội.',
        'Bố bước vào, chẳng ai trách một câu, chỉ có tiếng xới cơm và tiếng cười.',
        'Mẹ bảo: mái ấm là nơi lúc nào cũng có người chờ mình về.'
      ],
      takeaway: 'Mái ấm được giữ bằng sự chờ đợi và bao dung.'
    }
  },
  {
    short: 'Nhìn lại',
    title: 'Tự soi xét và nhìn lại bản thân',
    meaning: 'Nhìn lại chính mình',
    icon: 'sparkle',
    img: 'images/chuong-1.webp',
    alt: 'Người phụ nữ quét dọn gian bếp bên bếp lửa đỏ ngày 23 tháng Chạp',
    seed: 'Một năm qua, khi nhìn lại bản thân, điều gì khiến bạn muốn làm lại tốt hơn?',
    story:
      'Gian bếp là nơi kín đáo nhất trong nhà, nhưng cũng là nơi thấy rõ lòng người nhất. Bát cơm dẻo hay khê, bếp lửa đượm hay nguội, đều kể lại sự chăm chút của từng người. Ngày 23 tháng Chạp, ông Táo cưỡi cá chép về trời. Tự soi xét và nhìn lại bản thân không phải để tự trách, mà để nhận rõ những thiếu sót, nhẹ lòng buông điều chưa tốt và sống tử tế hơn.',
    badge: {
      name: 'Huy hiệu Nhìn Lại',
      desc: 'Dám nhìn lại thật lòng mình để sống tốt hơn.',
      img: 'images/huychuong/huychuong1.webp'
    },
    listen: {
      object: 'bếp lửa',
      icon: 'fire',
      teller: 'Bà kể',
      lines: [
        'Hồi bà còn nhỏ, chiều 23 tháng Chạp nào cụ cũng gọi cả nhà ra lau bếp.',
        'Cụ bảo: lau tro cho sạch để ông Táo về trời thấy nhà mình sống tử tế.',
        'Bà lau mãi rồi mới hiểu, cụ muốn mỗi người tự nhìn lại mình sau một năm.',
        'Lỗi nào thì nhận, việc tốt nào thì giữ, để sang năm lòng nhẹ như gian bếp mới lau.'
      ],
      takeaway: 'Nhìn lại bản thân bắt đầu từ việc dám nhìn thật lòng mình.'
    }
  },
  {
    short: 'Hướng thiện',
    title: 'Khát vọng vươn lên và hướng thiện',
    meaning: 'Mang điều thiện đi tiếp',
    icon: 'fish',
    img: 'images/chuong-4.webp',
    alt: 'Mẹ và con thả cá chép đỏ xuống hồ lúc bình minh',
    seed: 'Bạn muốn mang điều thiện lành nào sang năm mới?',
    story:
      'Cá chép vượt vũ môn hóa rồng là biểu tượng của ý chí bền bỉ và khát vọng vươn lên. Thả cá chép ngày 23 tháng Chạp không chỉ là một nghi lễ, mà gửi theo niềm tin vào tâm hướng thiện: buông điều sân si, gieo mầm tử tế và mang những điều thiện lành đi tiếp sang năm mới.',
    badge: {
      name: 'Huy hiệu Hướng Thiện',
      desc: 'Mang tâm thiện và ước mong tốt đẹp đi tiếp sang năm mới.',
      img: 'images/huychuong/huychuong4.webp'
    },

    listen: {
      object: 'cá chép',
      icon: 'fish',
      teller: 'Mẹ kể cho con',
      lines: [
        'Sáng 23, hai mẹ con mang chậu cá chép đỏ ra bờ hồ.',
        'Con hỏi: cá có bị lạc không mẹ? Mẹ bảo cá sẽ bơi ngược dòng, vượt vũ môn.',
        'Như người mình, gặp khó vẫn cố đi tiếp, sống hướng thiện rồi sẽ tới nơi tốt đẹp.',
        'Con thả cá xuống nước, thì thầm một điều ước cho cả nhà.'
      ],
      takeaway: 'Hướng thiện là khi mình dám mang tâm thiện và ước mong tốt đẹp đi tiếp.'
    }
  }
];

// Cấu trúc 22 trang sách
export const P = {
  cover: 0,
  intro: 1,
  toc: 2,
  art: (i) => 3 + i * 4,
  text: (i) => 4 + i * 4,
  game: (i) => 5 + i * 4,
  badge: (i) => 6 + i * 4,
  summary: 19,
  event: 20,
  back: 21,
  count: 22
};

export const ROMAN = ['I', 'II', 'III', 'IV'];

export const chapterOfPage = (p) => (p >= 3 && p <= 18 ? Math.floor((p - 3) / 4) : null);

export const folio = (n) => `<span class="pg-folio" aria-hidden="true">${n}</span>`;
