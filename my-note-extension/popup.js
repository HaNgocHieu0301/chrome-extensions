// Khai báo các biến DOM
const listView = document.getElementById("list-view");
const detailView = document.getElementById("detail-view");

const notesList = document.getElementById("notes-list");
const addNoteBtn = document.getElementById("add-note");

const noteTitleInput = document.getElementById("note-title");
const noteContentInput = document.getElementById("note-content");
const saveNoteBtn = document.getElementById("save-note");
const deleteNoteBtn = document.getElementById("delete-note");
const backBtn = document.getElementById("back-button");

// Biến tạm lưu note hiện tại đang thao tác (để biết khi lưu sẽ update hay thêm mới)
let currentNoteId = null;

// Khi DOMContentLoaded, chúng ta sẽ load danh sách note và hiển thị
document.addEventListener("DOMContentLoaded", async () => {
  await loadNotes();
  showListView(); // Hiển thị giao diện danh sách
});

// Lấy danh sách note từ storage
function getNotesFromStorage() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["myNotes"], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      const notes = result.myNotes || [];
      resolve(notes);
    });
  });
}

// Lưu danh sách note vào storage
function saveNotesToStorage(notes) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ myNotes: notes }, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

// Hiển thị danh sách note
async function loadNotes() {
  const notes = await getNotesFromStorage();
  notesList.innerHTML = ""; // Xoá danh sách cũ

  notes.forEach((note) => {
    // Tạo container cho 1 note trong list
    const noteItem = document.createElement("div");
    // Phần hiển thị Title
    const titleDiv = document.createElement("div");
    titleDiv.className = "note-title";
    titleDiv.textContent = note.title;
    // Phần hiển thị tóm tắt Content (50 ký tự)
    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";
    const maxLength = 50;
    if (note.content && note.content.length > maxLength) {
      contentDiv.textContent = note.content.slice(0, maxLength) + "...";
    } else {
      contentDiv.textContent = note.content || "";
    }
    // Nút Copy content
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", (e) => {
      // Chặn sự kiện click nổi lên noteItem (mở detail)
      e.stopPropagation();
      // Gọi hàm copy toàn bộ content
      copyTextToClipboard(note.content || "");
    });

    // Tạo container cho content + nút copy
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "content-wrapper";

    contentWrapper.appendChild(contentDiv);
    contentWrapper.appendChild(copyBtn);

    // Gắn titleDiv + contentWrapper vào noteItem
    noteItem.appendChild(titleDiv);
    noteItem.appendChild(contentWrapper);
    noteItem.appendChild(document.createElement("hr"));

    noteItem.addEventListener("click", () => {
      openNoteDetail(note.id);
    });
    notesList.appendChild(noteItem);
  });
}

function copyTextToClipboard(text) {
  // Cách đơn giản (cần quyền "clipboardWrite" trong manifest):
  navigator.clipboard.writeText(text).catch((err) => {
    console.error("Could not copy text: ", err);
  });
}

// Mở chi tiết 1 note để xem/sửa
async function openNoteDetail(noteId) {
  const notes = await getNotesFromStorage();
  const note = notes.find((n) => n.id === noteId);
  if (!note) return;

  // Cập nhật biến tạm
  currentNoteId = noteId;

  // Đổ dữ liệu vào input
  noteTitleInput.value = note.title;
  noteContentInput.value = note.content;

  showDetailView();
}

// Chế độ hiển thị giao diện
function showListView() {
  listView.classList.add("visible");
  detailView.classList.remove("visible");
}

function showDetailView() {
  listView.classList.remove("visible");
  detailView.classList.add("visible");
}

// Thêm note mới
addNoteBtn.addEventListener("click", () => {
  // Bỏ trống form, gán currentNoteId = null để biết là thêm mới
  currentNoteId = null;
  noteTitleInput.value = "";
  noteContentInput.value = "";
  showDetailView();
});

// Lưu note (tạo mới hoặc cập nhật)
saveNoteBtn.addEventListener("click", async () => {
  const notes = await getNotesFromStorage();

  // Nếu currentNoteId có giá trị => đang sửa note cũ
  if (currentNoteId) {
    const index = notes.findIndex((n) => n.id === currentNoteId);
    if (index !== -1) {
      notes[index].title = noteTitleInput.value;
      notes[index].content = noteContentInput.value;
    }
  } else {
    // Tạo ID mới (đơn giản dùng thời gian hiện tại)
    const newNote = {
      id: Date.now(),
      title: noteTitleInput.value,
      content: noteContentInput.value,
    };
    notes.push(newNote);
  }

  await saveNotesToStorage(notes);
  await loadNotes();

  showListView();
});

// Xoá note
deleteNoteBtn.addEventListener("click", async () => {
  if (!currentNoteId) {
    // Nếu chưa chọn note nào mà bấm xoá => không làm gì
    showListView();
    return;
  }

  const notes = await getNotesFromStorage();
  const updatedNotes = notes.filter((n) => n.id !== currentNoteId);

  await saveNotesToStorage(updatedNotes);
  await loadNotes();

  showListView();
});

// Nút quay lại danh sách
backBtn.addEventListener("click", () => {
  showListView();
});
