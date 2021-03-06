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
const optionID = "add-to-ipfs-link";

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
  return fetch(`${ipfsRoot}/files/cp?arg=${src}&arg=${dest}`).then((r) => r.text()).then((t) => t ? JSON.parse(t) : {});
}

function addPostOption(label, options) {
  let li = document.createElement("li");
  let a = document.createElement("a");

  if(options.onclick)
    a.onclick = () => { options.onclick(); return false; };

  a.href = "#";
  a.innerText = label;

  if(options.overrides)
    Object.entries(options.overrides).forEach(([k, v]) => a[k] = v);

  li.appendChild(a);

  if(options.prepend)
    optionList.insertBefore(li, optionList.firstChild);
  else
    optionList.appendChild(li);
}

function pin(data) {
  let a = document.querySelector(`#${optionID}`)
  const file = new File([data], basename(metadata.fileUrl), {type: data.type});

  ipfsAdd(file).then((r) => {
    a.onclick = undefined;
    a.innerText = "Open added file";
    a.href = `${gatewayRoot}/ipfs/${r.Hash}`;

    if(!filePath)
      return;

    ipfsFilesCp(`/ipfs/${r.Hash}`, `${filePath}/${metadata.id}.${metadata.fileExt}`).then((r) => {
      if(r.Message)
        console.log("cp returned", r); // TODO: do something better
    });
  });
}

addPostOption("Add to IPFS", {
  onclick: () => fetch(window.location.origin + metadata.fileUrl).then((r) => r.blob()).then(pin),
  overrides: {id: optionID},
  prepend: true,
});
