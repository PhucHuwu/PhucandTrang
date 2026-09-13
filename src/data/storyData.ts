export interface LoveStoryPage {
  id: string;
  chapterNumber: string;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
}

export const LOVE_STORY_DATA = {
  couple: {
    he: "Phúc",
    she: "Trang",
    anniversaryDate: "2022-10-20T00:00:00",
    proposalQuote: "Thế cậu đồng ý làm bạn gái tớ không?",
    songTitle: "Vạn vật như muốn ta bên nhau",
    songSrc: "/music/van-vat-nhu-muon-ta-ben-nhau.mp3"
  },
  bookPages: [
    {
      id: "prologue",
      chapterNumber: "Trang I",
      chapterTitle: "Lời Mở Đầu",
      pageNumber: 1
    },
    {
      id: "confession",
      chapterNumber: "Trang II",
      chapterTitle: "Khoảnh Khắc 20.10",
      pageNumber: 2
    },
    {
      id: "memories-1",
      chapterNumber: "Trang III",
      chapterTitle: "Ký Ức Đôi Ta (1)",
      pageNumber: 3
    },
    {
      id: "memories-2",
      chapterNumber: "Trang IV",
      chapterTitle: "Ký Ức Đôi Ta (2)",
      pageNumber: 4
    },
    {
      id: "love-letter",
      chapterNumber: "Trang V",
      chapterTitle: "Bức Thư Tình",
      pageNumber: 5
    },
    {
      id: "epilogue",
      chapterNumber: "Trang VI",
      chapterTitle: "Mãi Mãi Về Sau",
      pageNumber: 6
    }
  ],
  gallery: [
    {
      id: 1,
      src: "/img/1.JPEG",
      title: "Chúng Mình",
      caption: "Ánh mắt đầu tiên trao nhau trọn vẹn sự dịu dàng của cả đất trời.",
      rotation: "-rotate-2",
      stamp: "20.10.2022"
    },
    {
      id: 2,
      src: "/img/2.JPEG",
      title: "Inseparable Souls",
      caption: "Bên nhau là nơi an yên nhất giữa thế giới hối hả ngoài kia.",
      rotation: "rotate-1",
      stamp: "Together"
    },
    {
      id: 3,
      src: "/img/3.JPEG",
      title: "Love In Our Eyes",
      caption: "Nụ cười rạng rỡ của em là lý do mỗi ngày đều trở nên kỳ diệu.",
      rotation: "-rotate-2",
      stamp: "Sweet Moment"
    },
    {
      id: 4,
      src: "/img/4.JPEG",
      title: "Hand In Hand",
      caption: "Cùng nắm tay nhau đi qua từng con phố, gom góp những yêu thương bình dị.",
      rotation: "rotate-2",
      stamp: "Holding Hands"
    },
    {
      id: 5,
      src: "/img/5.JPEG",
      title: "Loving You Forever",
      caption: "Cảm ơn vì đã luôn ở đây, đồng hành và sưởi ấm trái tim tớ suốt những năm tháng qua.",
      rotation: "-rotate-1",
      stamp: "Eternity"
    }
  ]
};
