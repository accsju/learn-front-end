const fragment = document.createDocumentFragment();
for (let i=0;i<3;i++) {
    const li = document.createElement("li");
    li.textContent = `Item ${i + 1}`;
    fragment.appendChild(li);
}
document.querySelector("ul").appendChild(fragment);

const frag = document.createDocumentFragment();
console.log(frag.nodeType); // li (DOCUMENT_FRAGMENT_NODE)
console.log(frag.nodeName); // "#document-fragment"
console.log(frag instanceof DocumentFragment); // true

const frag2 = document.createDocumentFragment();
["A","B","C"].forEach(txt => {
    const p = document.createElement("p");
    p.textContent = txt; 
    frag.appendChild(p)
});
document.body.appendChild(frag); // <- 一括追加

const tpl = document.getElementById("tpl");
const fragment2 = tpl.contentEditable.cloneNode(true); // 返り値の型は、template.contentの型はDocumentFragment
document.body.appendChild(fragment); // 中身だけ挿入される                        

const template = document.createElement("template");
template.innerHTML = "<div>OK</div>";
const frag3 = template.content.cloneNode(true);

const frag4 = document.createDocumentFragment();
frag4.appendChild(document.getElementById("myDiv")); // 移動される fragmentに追加されたノードは元の位置から削除されます。

