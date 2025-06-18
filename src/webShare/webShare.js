const shareButton = document.getElementById("webShareButton");

const descriptionMeta = document.querySelector("meta[name='description']:");
const description = description ? descriptionMeta.getAttribute("content") : "";

shareButton.addEventListener("click", async() => {
    try {
        await navigator.share({
            title: document.title,
            text: description,
            url: window.location.href
        });
        console.log("success");
    } catch (error) {
        console.error("failed", error);
    }
});

//サポート状況を確認するように

