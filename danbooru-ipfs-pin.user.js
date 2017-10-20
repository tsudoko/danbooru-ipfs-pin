// ==UserScript==
// @name      danbooru-ipfs-pin
// @namespace flan
// @match     *://danbooru.donmai.us/posts/*
// @match     *://hijiribe.donmai.us/posts/*
// @match     *://sonohara.donmai.us/posts/*
// @match     *://safebooru.donmai.us/posts/*
// @run-at    document-end
// @grant     none
// @license   http://unlicense.org/
// ==/UserScript==

// ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5001", "http://danbooru.donmai.us"]'
// ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["POST", "GET"]'

const httpEndpoint = "http://localhost:5001";
const httpsEndpoint = ""; // not set up by default
const gatewayRoot = "http://localhost:8080";
const filePath = ""; // optional, an IPFS unixfs directory to put the image into

const endpoint = window.location.protocol === "https:" ? httpsEndpoint : httpEndpoint;

if(!endpoint)
  throw new Error(`no endpoint specified for ${window.location.protocol}`);

const ipfsRoot = `${endpoint}/api/v0`;

const metadata = document.querySelector("#image-container").dataset;
const optionList = document.querySelector("#post-options ul");

function basename(path) {
  const elems = path.split('/');
  return elems[elems.length - 1];
}

function ipfsAdd(file) {
  let form = new FormData();
  form.append("file", file);
  return fetch(new Request(`${ipfsRoot}/add`, {method: "POST", body: form})).then((r) => r.json());
}

function ipfsFilesCp(src, dest) {
  src = encodeURIComponent(src);
  dest = encodeURIComponent(dest);
  return fetch(`${ipfsRoot}/files/cp?arg=${src}&arg=${dest}`).then((r) => r.json());
}

function addPostOption(label, callback, prepend = false, href = "#") {
  let li = document.createElement("li");
  let a = document.createElement("a");

  a.innerText = label;
  a.href = href;
  a.onclick = () => { callback(); return false; };
  li.appendChild(a);

  if(prepend)
    optionList.insertBefore(li, optionList.firstChild);
  else
    optionList.appendChild(li);
}

function pin(data) {
  const file = new File([data], basename(metadata.fileUrl), {type: data.type});
  ipfsAdd(file).then((r) => {
    addPostOption("Open pinned file", () => void(0), true, `${gatewayRoot}/ipfs/${r.Hash}`);

    if(!filePath)
      return;

    ipfsFilesCp(`/ipfs/${r.Hash}`, `${filePath}/${metadata.id}.${metadata.fileExt}`).then((r) => {
      if(r.Message)
        console.log("cp returned", r); // TODO: do something better
    });
  });
}

addPostOption("Pin", () => fetch(window.location.origin + metadata.fileUrl).then((r) => r.blob()).then(pin), true);
