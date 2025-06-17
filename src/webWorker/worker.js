self.onmessage = function(e) {
    const result = e.data * 2; // 単純な計算
    self.postMessage(result); // 結果を送信
}

self.close();