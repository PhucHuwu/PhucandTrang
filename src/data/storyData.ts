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
    proposalQuote: "Thế bạn đồng ý làm bạn gái mình không?",
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
      title: "Lần Đầu Gặp Gỡ",
      caption: "Ánh mắt đầu tiên trao nhau trọn vẹn sự dịu dàng của cả đất trời.",
      rotation: "-rotate-2",
      stamp: "13.10.2022"
    },
    {
      id: 2,
      src: "/img/2.JPEG",
      title: "First Anniversary",
      caption: "Bên nhau là nơi an yên nhất giữa thế giới hối hả ngoài kia.",
      rotation: "rotate-1",
      stamp: "19.10.2022"
    },
    {
      id: 3,
      src: "/img/3.JPEG",
      title: "Mùa Giáng Sinh Đầu Tiên",
      caption: "Nụ cười rạng rỡ của em là lý do mỗi ngày đều trở nên kỳ diệu.",
      rotation: "-rotate-2",
      stamp: "25.12.2022"
    },
    {
      id: 4,
      src: "/img/4.JPEG",
      title: "Những Chuyến Đi Cùng Nhau",
      caption: "Cùng nắm tay nhau đi qua từng con phố, gom góp những yêu thương bình dị.",
      rotation: "rotate-2",
      stamp: "05.03.2023"
    },
    {
      id: 5,
      src: "/img/5.JPEG",
      title: "Sinh Nhật Bên Nhau",
      caption: "Cảm ơn vì đã luôn ở đây, đồng hành và sưởi ấm trái tim tớ suốt những năm tháng qua.",
      rotation: "-rotate-1",
      stamp: "25.05.2024"
    }
  ]
};
