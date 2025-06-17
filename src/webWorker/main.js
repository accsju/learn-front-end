const worker = new Worker("worker.js");
// get message from worker.
worker.onmessage = function(e) {
    console.log("結果",e,data);
}
// send message from worker.
worker.postMessage(5); 
worker.terminate(); 


