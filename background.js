// ============================================================================
// BACKGROUND.JS - Service Worker chính của Extension
// Giải thích: Đây là "bộ não" của extension, xử lý tất cả yêu cầu từ popup và content script
// ============================================================================

// Khởi tạo dữ liệu từ điển khi extension khởi chạy
let dictionaryData = {};
let koreanData = {};

// Tải dữ liệu từ điển
initializeDictionary();

function initializeDictionary() {
    // Dữ liệu từ điển English-Vietnamese-Korean
    // Trong thực tế, bạn nên tải từ file dictionary.json hoặc API
    dictionaryData = {
        'hello': {
            word: 'hello',
            pronunciation: 'həˈloʊ',
            definitions: [
                {
                    partOfSpeech: 'verb',
                    vietnamese: 'xin chào, chào hỏi',
                    korean: '안녕하다, 인사하다',
                    examples: [
                        {
                            en: 'Hello, how are you?',
                            vi: 'Xin chào, bạn khỏe không?',
                            ko: '안녕하세요, 어떻게 지내세요?'
                        }
                    ]
                }
            ]
        },
        'world': {
            word: 'world',
            pronunciation: 'wɜːrld',
            definitions: [
                {
                    partOfSpeech: 'noun',
                    vietnamese: 'thế giới, trái đất',
                    korean: '세계, 지구',
                    examples: [
                        {
                            en: 'The world is beautiful',
                            vi: 'Thế giới rất đẹp',
                            ko: '세계는 아름답습니다'
                        }
                    ]
                }
            ]
        },
        'love': {
            word: 'love',
            pronunciation: 'lʌv',
            definitions: [
                {
                    partOfSpeech: 'verb/noun',
                    vietnamese: 'yêu, tình yêu',
                    korean: '사랑, 사랑하다',
                    examples: [
                        {
                            en: 'I love you',
                            vi: 'Anh yêu em',
                            ko: '나는 당신을 사랑합니다'
                        }
                    ]
                }
            ]
        },
        'study': {
            word: 'study',
            pronunciation: 'ˈstʌdi',
            definitions: [
                {
                    partOfSpeech: 'verb',
                    vietnamese: 'học tập, nghiên cứu',
                    korean: '공부하다, 연구하다',
                    examples: [
                        {
                            en: 'I study English every day',
                            vi: 'Tôi học tiếng Anh mỗi ngày',
                            ko: '나는 매일 영어를 공부합니다'
                        }
                    ]
                }
            ]
        },
        'friend': {
            word: 'friend',
            pronunciation: 'frend',
            definitions: [
                {
                    partOfSpeech: 'noun',
                    vietnamese: 'bạn bè, người bạn',
                    korean: '친구',
                    examples: [
                        {
                            en: 'She is my best friend',
                            vi: 'Cô ấy là bạn thân nhất của tôi',
                            ko: '그녀는 나의 가장 친한 친구입니다'
                        }
                    ]
                }
            ]
        }
    };
}

// ============================================================================
// LẮNG NGHE CÁC TIN NHẮN TỪ POPUP VÀ CONTENT SCRIPT
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Tra từ
    if (request.action === 'searchWord') {
        const word = request.word.toLowerCase();
        if (dictionaryData[word]) {
            sendResponse({
                found: true,
                data: dictionaryData[word]
            });
        } else {
            sendResponse({ found: false });
        }
    }

    // Lưu từ
    else if (request.action === 'saveWord') {
        chrome.storage.local.get(['savedWords'], (result) => {
            const saved = result.savedWords || [];
            // Kiểm tra từ đã tồn tại chưa
            if (!saved.find(w => w.word === request.data.word)) {
                saved.push(request.data);
                chrome.storage.local.set({ savedWords: saved }, () => {
                    sendResponse({ success: true });
                });
            } else {
                sendResponse({ success: false, message: 'Từ đã tồn tại' });
            }
        });
        return true;
    }

    // Lấy danh sách từ cần highlight
    else if (request.action === 'getHighlightWords') {
        chrome.storage.local.get(['highlightWords'], (result) => {
            const words = result.highlightWords || [];
            sendResponse({ words: words });
        });
        return true;
    }

    // Đặt từ để tìm kiếm
    else if (request.action === 'setSearchWord') {
        chrome.storage.local.set({ searchWord: request.word }, () => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// ============================================================================
// TẠO MENU CHUỘT PHẢI
// ============================================================================

chrome.contextMenus.create({
    id: 'search-word',
    title: '🔍 Tra từ điển',
    contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'search-word') {
        const selectedText = info.selectionText;
        chrome.storage.local.set({ searchWord: selectedText }, () => {
            chrome.action.openPopup();
        });
    }
});

// ============================================================================
// PHÍM TẮT (Keyboard Shortcut)
// ============================================================================

chrome.commands.onCommand.addListener((command) => {
    if (command === 'search-selected-word') {
        chrome.action.openPopup();
    }
});
