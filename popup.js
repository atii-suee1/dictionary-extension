// ============================================================================
// POPUP.JS - Quản lý giao diện popup của extension
// Giải thích: File này điều khiển tất cả nút bấm và hiển thị trên popup
// ============================================================================

// Lấy tất cả nút tab
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Khi người dùng ấn tab, thay đổi hiển thị
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Bỏ chọn tất cả tab
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Chọn tab mới
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        document.getElementById(tabName).classList.add('active');
    });
});

// ============================================================================
// TAB TRA TỪ - Search Tab
// ============================================================================

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultArea = document.getElementById('result');

// Khi ấn nút Tra hoặc Enter
searchBtn.addEventListener('click', searchWord);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWord();
});

function searchWord() {
    const word = searchInput.value.trim().toLowerCase();
    
    if (!word) {
        resultArea.innerHTML = '<p class="placeholder">Vui lòng nhập từ</p>';
        return;
    }

    // Lấy dữ liệu từ điển từ background script
    chrome.runtime.sendMessage(
        { action: 'searchWord', word: word },
        (response) => {
            if (response && response.found) {
                displayResult(response.data);
            } else {
                resultArea.innerHTML = `
                    <div class="no-result">
                        <p>❌ Không tìm thấy từ "${word}"</p>
                        <p class="small-text">Thử nhập từ khác hoặc kiểm tra chính tả</p>
                    </div>
                `;
            }
        }
    );
}

// Hiển thị kết quả tra từ
function displayResult(wordData) {
    const { word, pronunciation, definitions } = wordData;
    
    let html = `
        <div class="word-result">
            <div class="word-header">
                <h2>${word}</h2>
                <button class="save-btn" onclick="saveWord('${word}')" title="Lưu từ này">
                    ⭐ Lưu
                </button>
            </div>
            <p class="pronunciation">Phiên âm: /${pronunciation}/</p>
            <div class="definitions">
    `;

    definitions.forEach((def, index) => {
        html += `
            <div class="definition">
                <div class="part-of-speech">${def.partOfSpeech}</div>
                <p class="meaning">🇻🇳 <strong>${def.vietnamese}</strong></p>
                <p class="meaning">🇰🇷 <strong>${def.korean}</strong></p>
        `;
        
        if (def.examples && def.examples.length > 0) {
            html += '<div class="examples"><strong>Ví dụ:</strong>';
            def.examples.forEach(ex => {
                html += `
                    <div class="example">
                        <p>🇬🇧 ${ex.en}</p>
                        <p>🇻🇳 ${ex.vi}</p>
                        <p>🇰🇷 ${ex.ko}</p>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
    });

    html += '</div></div>';
    resultArea.innerHTML = html;
}

// Lưu từ
function saveWord(word) {
    chrome.runtime.sendMessage(
        { action: 'searchWord', word: word },
        (response) => {
            if (response && response.found) {
                StorageManager.saveWord(response.data, () => {
                    alert('✅ Đã lưu từ "' + word + '"');
                    loadSavedWords();
                });
            }
        }
    );
}

// ============================================================================
// TAB FLASHCARD - Flashcard Tab
// ============================================================================

const flashcardCard = document.getElementById('flashcardCard');
const prevCardBtn = document.getElementById('prevCard');
const nextCardBtn = document.getElementById('nextCard');
const markLearnedBtn = document.getElementById('markLearned');

let currentCardIndex = 0;
let allSavedWords = [];

// Khi người dùng ấn vào flashcard, lật nó
flashcardCard.addEventListener('click', () => {
    const front = flashcardCard.querySelector('.card-front');
    const back = flashcardCard.querySelector('.card-back');
    
    front.style.display = front.style.display === 'none' ? 'block' : 'none';
    back.style.display = back.style.display === 'none' ? 'block' : 'none';
});

prevCardBtn.addEventListener('click', () => {
    currentCardIndex = (currentCardIndex - 1 + allSavedWords.length) % allSavedWords.length;
    displayFlashcard();
});

nextCardBtn.addEventListener('click', () => {
    currentCardIndex = (currentCardIndex + 1) % allSavedWords.length;
    displayFlashcard();
});

markLearnedBtn.addEventListener('click', () => {
    alert('✅ Tốt lắm! Bạn đã học từ này.');
    nextCardBtn.click();
});

function displayFlashcard() {
    if (allSavedWords.length === 0) return;
    
    const word = allSavedWords[currentCardIndex];
    const front = flashcardCard.querySelector('.card-front');
    const back = flashcardCard.querySelector('.card-back');
    
    front.querySelector('.card-word').textContent = word.word;
    back.querySelector('.card-meaning').textContent = 
        word.definitions[0]?.vietnamese || 'N/A';
    back.querySelector('.card-korean').textContent = 
        word.definitions[0]?.korean || 'N/A';
    
    document.getElementById('cardProgress').textContent = 
        `${currentCardIndex + 1}/${allSavedWords.length}`;
    
    front.style.display = 'block';
    back.style.display = 'none';
}

// ============================================================================
// TAB TỪ ĐÃ LƯU - Saved Words Tab
// ============================================================================

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const clearBtn = document.getElementById('clearBtn');
const importFile = document.getElementById('importFile');
const savedList = document.getElementById('savedList');

exportBtn.addEventListener('click', exportWords);
importBtn.addEventListener('click', () => importFile.click());
clearBtn.addEventListener('click', () => {
    if (confirm('⚠️ Bạn chắc chắn muốn xóa tất cả từ đã lưu?')) {
        StorageManager.clearAllWords(() => {
            loadSavedWords();
            alert('✅ Đã xóa tất cả');
        });
    }
});

importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                StorageManager.importWords(data, () => {
                    loadSavedWords();
                    alert('✅ Đã nhập từ thành công');
                });
            } catch (err) {
                alert('❌ Lỗi: File không đúng định dạng');
            }
        };
        reader.readAsText(file);
    }
});

function exportWords() {
    StorageManager.getAllWords((words) => {
        const dataStr = JSON.stringify(words, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tu-dien-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

function loadSavedWords() {
    StorageManager.getAllWords((words) => {
        allSavedWords = words;
        
        if (words.length === 0) {
            savedList.innerHTML = '<p class="placeholder">Chưa có từ đã lưu</p>';
            document.getElementById('flashcardContainer').classList.add('flashcard-empty');
            document.getElementById('flashcardContent').style.display = 'none';
        } else {
            let html = '';
            words.forEach((word, index) => {
                html += `
                    <div class="saved-item">
                        <div class="item-content">
                            <p class="item-word">${word.word}</p>
                            <p class="item-meaning">${word.definitions[0]?.vietnamese || 'N/A'}</p>
                        </div>
                        <button onclick="deleteWord(${index})" class="delete-btn">🗑️</button>
                    </div>
                `;
            });
            savedList.innerHTML = html;
            
            // Cập nhật flashcard
            document.getElementById('flashcardContainer').classList.remove('flashcard-empty');
            document.getElementById('flashcardContent').style.display = 'block';
            currentCardIndex = 0;
            displayFlashcard();
        }
    });
}

function deleteWord(index) {
    StorageManager.deleteWord(index, () => {
        loadSavedWords();
    });
}

// ============================================================================
// NỘI DUNG TÍNH NĂNG KHÁC
// ============================================================================

document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

document.getElementById('guideBtn').addEventListener('click', () => {
    alert(`
📚 HƯỚNG DẪN SỬ DỤNG EXTENSION

1️⃣ TRA TỪ NHANH:
   - Bôi đen từ trên trang web
   - Nhấp chuột phải → "Tra từ điển"
   - Xem kết quả ngay

2️⃣ LƯU TỪ:
   - Tra từ → ấn nút ⭐ Lưu
   - Từ được lưu vào danh sách

3️⃣ HỌC FLASHCARD:
   - Đi tới tab "Flashcard"
   - Ấp vào thẻ để lật
   - Ấn "Sau" để tiếp tục

4️⃣ XUẤT/NHẬP:
   - Tab "Từ đã lưu"
   - "📥 Xuất Excel" để tải về
   - "📤 Nhập từ file" để thêm từ

💡 MẸO: Ấn Ctrl+Shift+D để tra từ nhanh!
    `);
});

// ============================================================================
// KHỞI TẠO KHI MỞ POPUP
// ============================================================================

window.addEventListener('load', () => {
    loadSavedWords();
});
