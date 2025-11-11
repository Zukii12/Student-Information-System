document.addEventListener('DOMContentLoaded', () => {
  let db;
  let editingId = null;

 
  const form = document.getElementById('studentForm');
  const nameInput = document.getElementById('name');
  const idInput = document.getElementById('id');
  const courseInput = document.getElementById('course');
  const yearInput = document.getElementById('year');
  const emailInput = document.getElementById('email');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const studentTable = document.getElementById('studentTable');
  const searchInput = document.getElementById('search');


  setFormEnabled(false);

  
  const openRequest = indexedDB.open("StudentDB", 1);

  openRequest.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("students")) {
      const store = db.createObjectStore("students", { keyPath: "id" });
      store.createIndex("name", "name", { unique: false });
      store.createIndex("course", "course", { unique: false });
      store.createIndex("year", "year", { unique: false });
      store.createIndex("email", "email", { unique: false });
    }
  };

  openRequest.onsuccess = function (event) {
    db = event.target.result;
    setFormEnabled(true);
    displayStudents();
  };

  openRequest.onerror = function (event) {
    console.error("Database error:", event.target.errorCode);
    alert('Failed to open database.');
  };


  function setFormEnabled(enabled) {
    [nameInput, idInput, courseInput, yearInput, emailInput, saveBtn].forEach(el => {
      if (el) el.disabled = !enabled;
    });
    if (cancelBtn) cancelBtn.disabled = !enabled;
  }

  
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!db) return alert('Database not ready.');

    const name = nameInput.value.trim();
    const id = idInput.value.trim();
    const course = courseInput.value.trim();
    const year = yearInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !id || !course || !year || !email) {
      alert("Please fill out all fields!");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      alert("Please enter a valid email address!");
      return;
    }

    const student = { name, id, course, year, email };

    if (!editingId) {
      // ADD: check uniqueness first
      const checkTx = db.transaction(["students"], "readonly");
      const checkStore = checkTx.objectStore("students");
      const getReq = checkStore.get(id);

      getReq.onsuccess = function () {
        if (getReq.result) {
          alert("Student ID already exists. Use a unique ID or edit the existing record.");
          return;
        }
        const tx = db.transaction(["students"], "readwrite");
        const store = tx.objectStore("students");
        const addReq = store.add(student);
        addReq.onsuccess = () => {
          form.reset();
          displayStudents();
        };
        addReq.onerror = () => alert('Failed to add student.');
      };

      getReq.onerror = function () {
        alert('Error validating Student ID.');
      };
    } else {
     
      const tx = db.transaction(["students"], "readwrite");
      const store = tx.objectStore("students");
      const putReq = store.put(student);
      putReq.onsuccess = () => {
        editingId = null;
        idInput.disabled = false;
        saveBtn.textContent = 'Save Record';
        if (cancelBtn) cancelBtn.style.display = 'none';
        form.reset();
        displayStudents();
      };
      putReq.onerror = () => alert('Failed to update student.');
    }
  });

 
  function displayStudents() {
    if (!db) return;
    const tx = db.transaction(['students'], 'readonly');
    const store = tx.objectStore('students');
    const req = store.getAll();
    req.onsuccess = function (event) {
      const students = event.target.result || [];
      studentTable.innerHTML = '';
      students.forEach(student => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td'); tdName.textContent = student.name || '';
        const tdId = document.createElement('td'); tdId.textContent = student.id || '';
        const tdCourse = document.createElement('td'); tdCourse.textContent = student.course || '';
        const tdYear = document.createElement('td'); tdYear.textContent = student.year || '';
        const tdEmail = document.createElement('td'); tdEmail.textContent = student.email || '';
        const tdActions = document.createElement('td');

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editStudent(student.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn delete';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteStudent(student.id));

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);

        tr.appendChild(tdName);
        tr.appendChild(tdId);
        tr.appendChild(tdCourse);
        tr.appendChild(tdYear);
        tr.appendChild(tdEmail);
        tr.appendChild(tdActions);

        studentTable.appendChild(tr);
      });
    };
    req.onerror = function () {
      console.error('Failed to retrieve students.');
    };
  }

 
  function editStudent(id) {
    if (!db) return;
    const tx = db.transaction(['students'], 'readonly');
    const store = tx.objectStore('students');
    const req = store.get(id);
    req.onsuccess = function (e) {
      const student = e.target.result;
      if (!student) return alert('Student not found.');
      nameInput.value = student.name;
      idInput.value = student.id;
      courseInput.value = student.course;
      yearInput.value = student.year;
      emailInput.value = student.email;
      idInput.disabled = true;
      editingId = id;
      saveBtn.textContent = 'Update Record';
      if (cancelBtn) cancelBtn.style.display = 'inline-block';
      nameInput.focus();
    };
    req.onerror = function () {
      alert('Failed to load student for editing.');
    };
  }

 
  function deleteStudent(id) {
    if (!db) return;
    if (!confirm('Are you sure you want to delete this record?')) return;
    const tx = db.transaction(['students'], 'readwrite');
    const store = tx.objectStore('students');
    const delReq = store.delete(id);
    delReq.onsuccess = function () {
      if (editingId === id) {
        editingId = null;
        idInput.disabled = false;
        form.reset();
        saveBtn.textContent = 'Save Record';
        if (cancelBtn) cancelBtn.style.display = 'none';
      }
      displayStudents();
    };
    delReq.onerror = function () {
      alert('Failed to delete record.');
    };
  }


  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      editingId = null;
      form.reset();
      idInput.disabled = false;
      saveBtn.textContent = 'Save Record';
      cancelBtn.style.display = 'none';
    });
  }

  
  searchInput.addEventListener('input', function () {
    if (!db) return;
    const query = (this.value || '').toLowerCase();
    const tx = db.transaction(['students'], 'readonly');
    const store = tx.objectStore('students');
    const req = store.getAll();
    req.onsuccess = function (e) {
      const all = e.target.result || [];
      const results = all.filter(student =>
        (student.id || '').toLowerCase().includes(query) ||
        (student.course || '').toLowerCase().includes(query) ||
        (student.year || '').toLowerCase().includes(query)
      );
      studentTable.innerHTML = '';
      results.forEach(student => {
        const tr = document.createElement('tr');

        const tdName = document.createElement('td'); tdName.textContent = student.name || '';
        const tdId = document.createElement('td'); tdId.textContent = student.id || '';
        const tdCourse = document.createElement('td'); tdCourse.textContent = student.course || '';
        const tdYear = document.createElement('td'); tdYear.textContent = student.year || '';
        const tdEmail = document.createElement('td'); tdEmail.textContent = student.email || '';
        const tdActions = document.createElement('td');

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editStudent(student.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn delete';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => deleteStudent(student.id));

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);

        tr.appendChild(tdName);
        tr.appendChild(tdId);
        tr.appendChild(tdCourse);
        tr.appendChild(tdYear);
        tr.appendChild(tdEmail);
        tr.appendChild(tdActions);

        studentTable.appendChild(tr);
      });
    };
  });
});

