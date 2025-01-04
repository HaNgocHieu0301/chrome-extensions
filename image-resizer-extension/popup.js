const fileInput = document.getElementById("file-input");
const dropArea = document.getElementById("drop-area");
const resizeBtn = document.getElementById("resize-btn");
const previewImg = document.getElementById("preview-img");
const actions = document.getElementById("actions");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const clearBtn = document.getElementById("clear-btn");
const placeholderText = document.getElementById("placeholder-text");

let originalImage = null;
let resizedImageDataUrl = null;

const STORAGE_KEY = "image_data"; // Tên key lưu ảnh trong chrome.storage
const STORAGE_TIME_KEY = "image_time"; // Tên key lưu timestamp

document.addEventListener("DOMContentLoaded", async () => {
  // Lấy dữ liệu từ storage
  const { image_data, image_time } = await chrome.storage.local.get([
    STORAGE_KEY,
    STORAGE_TIME_KEY,
  ]);

  if (image_data && image_time) {
    const now = Date.now();
    const savedTime = parseInt(image_time, 10);
    const diff = now - savedTime; // ms

    // 10 phút = 10 * 60 * 1000 = 600000 ms
    const TEN_MINUTES = 600000;

    if (diff <= TEN_MINUTES) {
      // Còn hạn -> hiển thị lại ảnh
      originalImageDataUrl = image_data;
      originalImage = image_data;
      previewImg.src = image_data;
      previewImg.style.display = "block";
      placeholderText.style.display = "none";
      resizeBtn.disabled = false;
      clearBtn.disabled = false;
      fileInput.disabled = true;

      // Nếu bạn có logic lưu "resizedImageDataUrl" thì cũng load
      // Ở đây demo chỉ lưu originalImage. Khi user ấn Resize, ta làm lại.
    } else {
      // Quá 10 phút => Xoá data
      await clearImageData();
    }
  }
});

// Hàm xoá data trong storage + reset UI
async function clearImageData() {
  await chrome.storage.local.remove([STORAGE_KEY, STORAGE_TIME_KEY]);
  originalImageDataUrl = null;
  resizedImageDataUrl = null;

  // Reset UI
  previewImg.src = "";
  previewImg.style.display = "none";
  placeholderText.style.display = "block";
  fileInput.disabled = false;
  resizeBtn.disabled = true;
  clearBtn.disabled = true;
  actions.style.display = "none";
}

// Khi người dùng chọn file
fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

// Ngăn chặn sự kiện mặc định
["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );
});

// Xử lý drop
dropArea.addEventListener("drop", function (e) {
  const dt = e.dataTransfer;
  const file = dt.files[0];
  if (file) {
    handleFile(file);
  }
});

dropArea.addEventListener("paste", function (e) {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      handleFile(file);
      break;
    }
  }
});

function handleFile(file) {
  const reader = new FileReader();
  fileInput.disabled = true;
  reader.onload = async function (e) {
    originalImageDataUrl = e.target.result;

    previewImg.src = e.target.result;
    previewImg.style.display = "block";
    placeholderText.style.display = "none";

    originalImage = e.target.result; // Lưu ảnh gốc dưới dạng base64

    // Bật nút Resize, Clear
    resizeBtn.disabled = false;
    clearBtn.disabled = false;

    // Lưu vào chrome.storage để không bị mất khi đóng popup
    await chrome.storage.local.set({
      [STORAGE_KEY]: originalImageDataUrl,
      [STORAGE_TIME_KEY]: Date.now().toString(),
    });
  };
  reader.readAsDataURL(file);
}

resizeBtn.addEventListener("click", function () {
  console.log("resizeBtn.addEventListener");
  console.log("originalImage", originalImage);
  console.log("originalImageDataUrl", originalImageDataUrl);
  if (!originalImageDataUrl) return;

  // Tạo image để load dữ liệu base64
  const img = new Image();
  img.src = originalImage;
  img.onload = () => {
    // Tạo canvas với kích thước bằng với ảnh gốc
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    // Vẽ ảnh lên canvas
    ctx.drawImage(img, 0, 0);

    // Lấy base64 dưới dạng jpeg, quality ~ 0.7 (tuỳ chỉnh)
    const quality = 0.7;
    const resizedDataUrl = canvas.toDataURL("image/png", quality);

    resizedImageDataUrl = resizedDataUrl;

    // Hiển thị ảnh đã nén
    previewImg.src = resizedImageDataUrl;
    actions.style.display = "block";

    // Lưu vào storage
    chrome.storage.local.set({
      [STORAGE_KEY]: resizedImageDataUrl,
      [STORAGE_TIME_KEY]: Date.now().toString(),
    });
  };
});

copyBtn.addEventListener("click", async () => {
  if (!resizedImageDataUrl) return;

  try {
    // Chuyển base64 -> Blob
    const blob = dataURLtoBlob(resizedImageDataUrl);
    // Tạo ClipboardItem
    const item = new ClipboardItem({
      "image/png": blob,
    });
    await navigator.clipboard.write([item]);
  } catch (error) {
    console.error("Copy lỗi: ", error);
    alert("Copy ảnh thất bại: ", error);
  }
});

downloadBtn.addEventListener("click", () => {
  if (!resizedImageDataUrl) return;
  const link = document.createElement("a");
  link.download = "resized-image.jpg";
  link.href = resizedImageDataUrl;
  link.click();
});

function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

clearBtn.addEventListener("click", async () => {
  await clearImageData();
});
