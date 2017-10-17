// ==UserScript==
// @name      danbooru-ipfs-pin
// @namespace flan
// @match     *://danbooru.donmai.us/posts/*
// @run-at    document-end
// @grant     none
// @license   http://unlicense.org/
// ==/UserScript==

// ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5001", "http://danbooru.donmai.us"]'
// ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["POST"]'

const httpEndpoint = "http://localhost:5001";
const httpsEndpoint = ""; // not set up by default
const gatewayRoot = "http://gateway.ipfs.io";

const endpoint = window.location.protocol === "https:" ? httpsEndpoint : httpEndpoint;

if(!endpoint)
  return;

const ipfsRoot = endpoint + "/api/v0";

const imageContainer = document.querySelector("#image-container");
const postOptions = document.querySelector("#post-options");

const optionList = document.querySelector("#post-options ul");

function basename(path) {
  const elems = path.split('/');
  return elems[elems.length - 1];
}

function pin(data, filename) {
  const file = new File([data], filename, {type: data.type});
  let form = new FormData();
  form.append("file", file);

  let r = new XMLHttpRequest();
  r.open("POST", ipfsRoot + "/add");
  r.responseType = "json";
  r.onload = () => {
    addPostOption("Open pinned file", () => void(0), true, gatewayRoot + "/ipfs/" + r.response.Hash);
  }
  r.send(form);
}

function getPostImage(callback) {
  const metadata = imageContainer.dataset;
  let r = new XMLHttpRequest();
  r.open("GET", metadata.fileUrl);
  r.responseType = "blob";
  r.onload = () => callback(r.response, basename(metadata.fileUrl));
  r.send();
}

function addPostOption(label, callback, prepend = false, href = "#") {
  let a = document.createElement("a");

  a.innerText = label;
  a.href = href;
  a.onclick = () => { callback(); return false; };

  if(prepend)
    optionList.insertBefore(a, optionList.firstChild);
  else
    optionList.appendChild(a);
}

addPostOption("Pin", () => getPostImage(pin), true);
