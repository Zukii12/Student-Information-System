
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open("StudentDB", 1);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    const store = db.createObjectStore("students", { keyPath: "id" });
    store.createIndex("name", "name", { unique: false });
    store.createIndex("course", "course", { unique: false });
    store.createIndex("year", "year", { unique: false });
    store.createIndex("email", "email", { unique: false });
  };

  request.onsuccess = (event) => resolve(event.target.result);
  request.onerror = (event) => reject(event.target.error);
});


async function getStore(mode = "readonly") {
  const db = await dbPromise;
  return db.transaction("students", mode).objectStore("students");
}


document.getElementById("studentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const id = document.getElementById("id").value.trim();
  const course = document.getElementById("course").value.trim();
  const year = document.getElementById("year").value.trim();
  const email = document.getElementById("email").value.trim();

 
  if (!name || !id || !course || !year || !email) {
    alert("Please fill out all fields!");
    return;
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailPattern.test(email)) {
    alert("Please enter a valid Gmail address!");
    return;
  }

  const store = await getStore("readwrite");

  
  const existing = await new Promise((res) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => res(getReq.result);
  });

  if (existing) {
    alert("Student ID must be unique!");
    return;
  }

  
  const newStudent = { name, id, course, year, email };
  store.add(newStudent).onsuccess = () => {
    document.getElementById("studentForm").reset();
    displayStudents();
  };
});


async function displayStudents(filter = "") {
  const store = await getStore();
  const request = store.getAll();

  request.onsuccess = () => {
    let students = request.result;

   
    if (filter) {
      const q = filter.toLowerCase();
      students = students.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.course.toLowerCase().includes(q) ||
          s.year.toLowerCase().includes(q)
      );
    }

    const tbody = document.getElementById("studentTable");
    tbody.innerHTML = "";

    for (const s of students) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.name}</td>
        <td>${s.id}</td>
        <td>${s.course}</td>
        <td>${s.year}</td>
        <td>${s.email}</td>
        <td>
          <button class="action-btn edit" data-id="${s.id}">Edit</button>
          <button class="action-btn delete" data-id="${s.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  };
}


document.getElementById("studentTable").addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains("edit")) {
    const store = await getStore();
    const req = store.get(id);
    req.onsuccess = () => {
      const s = req.result;
      if (s && confirm(`Edit record for ${s.name}?`)) {
        document.getElementById("name").value = s.name;
        document.getElementById("id").value = s.id;
        document.getElementById("course").value = s.course;
        document.getElementById("year").value = s.year;
        document.getElementById("email").value = s.email;
        deleteStudent(s.id, false);
      }
    };
  }

  if (e.target.classList.contains("delete")) {
    deleteStudent(id);
  }
});


async function deleteStudent(id, confirmDelete = true) {
  if (confirmDelete && !confirm("Are you sure you want to delete this record?")) return;
  const store = await getStore("readwrite");
  store.delete(id).onsuccess = () => displayStudents();
}


document.getElementById("search").addEventListener("input", (e) => {
  displayStudents(e.target.value);
});


window.addEventListener("DOMContentLoaded", () => displayStudents());
