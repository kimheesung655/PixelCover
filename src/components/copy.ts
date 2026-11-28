export const siteCopy = {
  ko: {
    title: "PixelCover | 이미지 개인정보 보호 도구",
    home: "PixelCover 홈",
    navigation: "주요 메뉴",
    tools: "편집 도구",
    howTo: "사용 방법",
    faq: "자주 묻는 질문",
    switchTheme: { light: "White 테마로 전환", dark: "Black 테마로 전환" },
    privacy: "브라우저에서 안전하게 처리",
    menu: "메뉴 열기",
    closeMenu: "메뉴 닫기",
    ad: { left: "왼쪽 광고 영역", right: "오른쪽 광고 영역" },
    heroTitle: ["사진 속 민감한 부분을", "깔끔하게 가려보세요."],
    heroDescription: [
      "설치 없이 바로 시작하는 이미지 개인정보 보호 도구.",
      "이미지 선택부터 다운로드까지, 모든 작업은 내 브라우저 안에서 처리됩니다.",
    ],
    noUpload: "서버 전송 없음",
    noAccount: "회원가입 없음",
    howHeading: "세 단계면 충분해요.",
    steps: [
      { title: "이미지 추가", description: "사진을 선택하거나 화면에 붙여넣어요." },
      { title: "영역 선택", description: "가리고 싶은 부분을 마우스로 칠하거나 드래그해요." },
      { title: "결과 다운로드", description: "완성된 이미지를 내 기기에 저장해요." },
    ],
    trustHeading: "당신의 이미지는 당신의 기기에만",
    trustDescription: "PixelCover는 이미지를 서버로 보내지 않습니다. 모든 편집은 브라우저에서 처리됩니다.",
    showAll: "전체 보기",
    hideAll: "전체 접기",
    faqs: [
      {
        q: "이미지는 서버에 저장되나요?",
        a: "아니요. 이미지는 내 브라우저 안에서만 처리되고 어떤 서버로도 전송되거나 저장되지 않아요. 창을 닫으면 편집 내용도 함께 사라져요.",
      },
      {
        q: "어떤 파일을 지원하나요?",
        a: "JPG, PNG, WebP 이미지를 열 수 있어요. 파일은 20MB 이하, 한 변 8,192px·총 1,600만 픽셀 이하여야 해요. 결과는 원본 해상도 그대로 PNG로 저장돼요.",
      },
      {
        q: "모자이크와 가리기의 차이는 무엇인가요?",
        a: "모자이크와 블러는 강도가 약하면 글자를 알아볼 수 있어요. 가리기는 선택 영역을 불투명한 단색으로 덮어요. 전화번호·주소·이름 같은 글자에는 가리기를 추천해요.",
      },
    ],
    footer: "개인정보를 지키는 간편한 도구.",
  },
  en: {
    title: "PixelCover | Image privacy editor",
    home: "PixelCover home",
    navigation: "Main navigation",
    tools: "Editing tools",
    howTo: "How to use",
    faq: "Frequently asked questions",
    switchTheme: { light: "Switch to light theme", dark: "Switch to dark theme" },
    privacy: "Processed in your browser",
    menu: "Open menu",
    closeMenu: "Close menu",
    ad: { left: "Left ad space", right: "Right ad space" },
    heroTitle: ["Hide sensitive details", "in your photos."],
    heroDescription: [
      "Edit photos for privacy with nothing to install.",
      "From choosing an image to downloading it, everything happens in your browser.",
    ],
    noUpload: "No server uploads",
    noAccount: "No account required",
    howHeading: "Three steps to edit an image.",
    steps: [
      { title: "Add an image", description: "Choose a photo or paste it right into the editor." },
      { title: "Select an area", description: "Paint over the details you want to hide or drag to select them." },
      { title: "Download the result", description: "Save the edited image to your device." },
    ],
    trustHeading: "Your images stay on your device",
    trustDescription: "PixelCover processes your images in your browser. It never sends them to a server.",
    showAll: "Expand all",
    hideAll: "Collapse all",
    faqs: [
      {
        q: "Are my images stored on a server?",
        a: "No. PixelCover processes your images in your browser without uploading or storing them on a server. Your edits are discarded when you close the tab.",
      },
      {
        q: "Which file formats are supported?",
        a: "You can open JPG, PNG, and WebP images up to 20 MB. Each side can be up to 8,192 px, with a total limit of 16 million pixels. Your result is saved as a PNG at the original resolution.",
      },
      {
        q: "What is the difference between Mosaic and Cover?",
        a: "Mosaic and Blur can leave text readable at low strengths. Cover fills the selected area with a solid, opaque color. Use Cover for text such as phone numbers, addresses, and names.",
      },
    ],
    footer: "Simple tools for a more private internet.",
  },
};

export type Language = keyof typeof siteCopy;
export type SiteCopy = (typeof siteCopy)[Language];
