// STORAGE.JS - Quản lý lưu trữ dữ liệu

const StorageManager = {
    saveWord: function(wordData, callback) {
        chrome.storage.local.get(['savedWords'], (result) => {
            const saved = result.savedWords || [];
            const exists = saved.some(w => w.word.toLowerCase() === wordData.word.toLowerCase());
            if (!exists) {
                saved.push(wordData);
                chrome.storage.local.set({ savedWords: saved }, callback);
            } else if (callback) {
                callback();
            }
        });
    },

    getAllWords: function(callback) {
        chrome.storage.local.get(['savedWords'], (result) => {
            const saved = result.savedWords || [];
            callback(saved);
        });
    },

    deleteWord: function(index, callback) {
        chrome.storage.local.get(['savedWords'], (result) => {
            const saved = result.savedWords || [];
            saved.splice(index, 1);
            chrome.storage.local.set({ savedWords: saved }, callback);
        });
    },

    clearAllWords: function(callback) {
        chrome.storage.local.set({ savedWords: [] }, callback);
    },

    importWords: function(newWords, callback) {
        chrome.storage.local.get(['savedWords'], (result) => {
            let saved = result.savedWords || [];
            newWords.forEach(word => {
                if (!saved.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
                    saved.push(word);
                }
            });
            chrome.storage.local.set({ savedWords: saved }, callback);
        });
    }
};
