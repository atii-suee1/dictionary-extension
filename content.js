// ============================================================================
// CONTENT.JS - Script chạy trên mỗi trang web
// Giải thích: Đây là code chạy trên các trang web để highlight từ và xử lý menu chuột phải
// ============================================================================

// Thêm hiệu ứng CSS cho từ được highlight
const style = document.createElement('style');
style.textContent = `
    .dictionary-highlight {
        background-color: #FFD700;
        cursor: pointer;
        border-radius: 2px;
        padding: 0 2px;
        transition: background-color 0.2s;
    }
    .dictionary-highlight:hover {
        background-color: #FFC700;
        text-decoration: underline;
    }
`;
document.head.appendChild(style);

// ============================================================================
// SỰ KIỆN MENU CHUỘT PHẢI (Context Menu)
// ============================================================================

// Lắng nghe khi người dùng bôi đen chữ
document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText && selectedText.length > 0 && selectedText.length < 100) {
        // Lưu từ được chọn
        chrome.storage.local.set({ selectedWord: selectedText });
    }
});

// ============================================================================
// XỬ LÝ MENU CHUỘT PHẢI
// ============================================================================

document.addEventListener('contextmenu', (e) => {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText && selectedText.length > 0) {
        // Tạo menu riêng cho extension
        e.preventDefault();
        showCustomContextMenu(e.pageX, e.pageY, selectedText);
    }
});

// Hàm hiển thị menu chuột phải tùy chỉnh
function showCustomContextMenu(x, y, word) {
    // Xóa menu cũ nếu có
    const oldMenu = document.getElementById('dictionary-context-menu');
    if (oldMenu) oldMenu.remove();

    // Tạo menu mới
    const menu = document.createElement('div');
    menu.id = 'dictionary-context-menu';
    menu.innerHTML = `
        <div style="
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            padding: 0;
            min-width: 200px;
        ">
            <div style="
                padding: 8px 12px;
                border-bottom: 1px solid #eee;
                font-weight: bold;
                color: #333;
            ">📚 Từ: "${word}"</div>
            <button id="search-word-btn" style="
                width: 100%;
                padding: 10px;
                background: none;
                border: none;
                text-align: left;
                cursor: pointer;
                color: #0066cc;
                font-size: 14px;
            ">🔍 Tra từ điển</button>
            <button id="save-word-btn" style="
                width: 100%;
                padding: 10px;
                background: none;
                border: none;
                text-align: left;
                cursor: pointer;
                color: #ff6600;
                font-size: 14px;
                border-top: 1px solid #eee;
            ">⭐ Lưu từ này</button>
        </div>
    `;

    document.body.appendChild(menu);

    // Xử lý sự kiện nút Tra từ
    document.getElementById('search-word-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage(
            { action: 'openPopup', word: word },
            () => {
                chrome.action.openPopup();
                menu.remove();
            }
        );
    });

    // Xử lý sự kiện nút Lưu từ
    document.getElementById('save-word-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage(
            { action: 'searchWord', word: word },
            (response) => {
                if (response && response.found) {
                    chrome.runtime.sendMessage(
                        { action: 'saveWord', data: response.data },
                        () => {
                            alert('✅ Đã lưu từ: ' + word);
                            menu.remove();
                        }
                    );
                }
            }
        );
    });

    // Xóa menu khi click bên ngoài
    setTimeout(() => {
        document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
}

// ============================================================================
// HIGHLIGHT TỪ TRÊN TRANG WEB
// ============================================================================

// Lấy danh sách từ cần highlight
chrome.runtime.sendMessage(
    { action: 'getHighlightWords' },
    (response) => {
        if (response && response.words) {
            highlightWords(response.words);
        }
    }
);

function highlightWords(wordsToHighlight) {
    if (wordsToHighlight.length === 0) return;

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const nodesToReplace = [];
    let node;

    while (node = walker.nextNode()) {
        const text = node.nodeValue;
        const regex = new RegExp(`\\b(${wordsToHighlight.join('|')})\\b`, 'gi');

        if (regex.test(text)) {
            nodesToReplace.push(node);
        }
    }

    nodesToReplace.forEach(node => {
        const span = document.createElement('span');
        const text = node.nodeValue;
        const regex = new RegExp(`\\b(${wordsToHighlight.join('|')})\\b`, 'g');

        span.innerHTML = text.replace(regex, '<span class="dictionary-highlight">$1</span>');
        node.parentNode.replaceChild(span, node);
    });

    // Thêm sự kiện click cho các từ highlight
    document.querySelectorAll('.dictionary-highlight').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const word = el.textContent;
            chrome.runtime.sendMessage(
                { action: 'setSearchWord', word: word },
                () => {
                    chrome.action.openPopup();
                }
            );
        });
    });
}
