import React, { useState, useEffect } from "react";

// Single-file React app (App.jsx)
// Usage: paste into src/App.jsx of a Create-React-App or Vite React project and run.
// Data persists in localStorage under key: course_scheduler_data

const STORAGE_KEY = "course_scheduler_data";

const defaultData = {
  users: {
    admins: [
      { username: "admin1", password: "admin1", name: "Admin One" },
      { username: "admin2", password: "admin2", name: "Admin Two" },
    ],
    students: [
      { username: "student1", password: "student1", name: "Student One", registrations: [] },
      { username: "student2", password: "student2", name: "Student Two", registrations: [] },
    ],
  },
  courses: [
    {
      id: "CSE101",
      name: "Introduction to Programming",
      code: "CSE101",
      description: "Basics of programming in Python: variables, loops, functions.",
      days: ["Mon", "Wed"],
      start: "09:00",
      end: "10:30",
      dateRange: "2025-12-01 to 2026-03-30",
      seats: 30,
    },
    {
      id: "MAT201",
      name: "Discrete Mathematics",
      code: "MAT201",
      description: "Logic, sets, relations, combinatorics and graph theory.",
      days: ["Tue", "Thu"],
      start: "11:00",
      end: "12:30",
      dateRange: "2025-12-01 to 2026-03-30",
      seats: 25,
    },
  ],
};

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultData;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse storage, resetting.");
    return defaultData;
  }
}

function timeToMinutes(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function checkConflict(courseA, courseB) {
  // conflict if any day intersects and times overlap
  const daysIntersection = courseA.days.some((d) => courseB.days.includes(d));
  if (!daysIntersection) return false;
  return timesOverlap(timeToMinutes(courseA.start), timeToMinutes(courseA.end), timeToMinutes(courseB.start), timeToMinutes(courseB.end));
}

function App() {
  const [data, setData] = useState(loadFromStorage);
  const [view, setView] = useState("home"); // home | login-admin | login-student | admin-dashboard | student-dashboard | course-desc
  const [auth, setAuth] = useState({ type: null, user: null });
  const [message, setMessage] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // Helpers for auth
  function login(type, username, password) {
    const list = type === "admin" ? data.users.admins : data.users.students;
    const found = list.find((u) => u.username === username && u.password === password);
    if (found) {
      setAuth({ type, user: found });
      setMessage("");
      setView(type === "admin" ? "admin-dashboard" : "student-dashboard");
    } else {
      setMessage("Invalid credentials");
    }
  }
  function logout() {
    setAuth({ type: null, user: null });
    setView("home");
  }

  // Admin actions
  function addCourse(course) {
    if (data.courses.find((c) => c.id === course.id)) {
      setMessage("Course with same ID already exists.");
      return;
    }
    const newData = { ...data, courses: [...data.courses, course] };
    setData(newData);
    setMessage("Course added");
  }
  function updateCourse(updated) {
    const newCourses = data.courses.map((c) => (c.id === updated.id ? updated : c));
    setData({ ...data, courses: newCourses });
    setMessage("Course updated");
  }
  function deleteCourse(id) {
    // remove registrations from students
    const newStudents = data.users.students.map((s) => ({ ...s, registrations: s.registrations ? s.registrations.filter((r) => r !== id) : [] }));
    const newCourses = data.courses.filter((c) => c.id !== id);
    setData({ ...data, courses: newCourses, users: { ...data.users, students: newStudents } });
    setMessage("Course deleted and registrations updated");
  }

  // student actions
  function registerCourse(studentUsername, courseId) {
    const course = data.courses.find((c) => c.id === courseId);
    if (!course) return setMessage("Course not found");

    // check seat
    const registrationsCount = data.users.students.reduce((acc, s) => acc + (s.registrations?.includes(courseId) ? 1 : 0), 0);
    if (registrationsCount >= (course.seats || 9999)) return setMessage("No seats available");

    // check conflict with student's existing regs
    const student = data.users.students.find((s) => s.username === studentUsername);
    const studentRegs = student.registrations || [];
    const regCourses = data.courses.filter((c) => studentRegs.includes(c.id));
    const conflict = regCourses.some((rc) => checkConflict(rc, course));
    if (conflict) return setMessage("Cannot register due to a schedule conflict");

    // add
    const newStudents = data.users.students.map((s) => s.username === studentUsername ? { ...s, registrations: [...(s.registrations || []), courseId] } : s);
    setData({ ...data, users: { ...data.users, students: newStudents } });
    setMessage("Registered successfully");
  }
  function unregisterCourse(studentUsername, courseId) {
    const newStudents = data.users.students.map((s) => s.username === studentUsername ? { ...s, registrations: (s.registrations || []).filter((r) => r !== courseId) } : s);
    setData({ ...data, users: { ...data.users, students: newStudents } });
    setMessage("Unregistered");
  }

  function addUser(type, user) {
    if (type === "admin") {
      if (data.users.admins.find((a) => a.username === user.username)) return setMessage("Admin username taken");
      setData({ ...data, users: { ...data.users, admins: [...data.users.admins, user] } });
      setMessage("Admin added");
    } else {
      if (data.users.students.find((s) => s.username === user.username)) return setMessage("Student username taken");
      setData({ ...data, users: { ...data.users, students: [...data.users.students, { ...user, registrations: [] }] } });
      setMessage("Student added");
    }
  }

  // UI pieces
  function Home() {
    return (
      <div className="centered">
        <h1>Course Scheduler</h1>
        <div className="card actions">
          <button onClick={() => setView("login-student")}>Student Login</button>
          <button onClick={() => setView("login-admin")}>Admin Login</button>
          <button onClick={() => setView("course-desc")}>Course Catalog / Descriptions</button>
        </div>
      </div>
    );
  }

  function Login({ type }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const usersList = type === "admin" ? data.users.admins : data.users.students;
    return (
      <div className="centered">
        <h2>{type === "admin" ? "Admin" : "Student"} Login</h2>
        <div className="card form">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="row">
            <button onClick={() => login(type, username, password)}>Login</button>
            <button onClick={() => {
              // show list of available demo accounts
              setMessage("Demo accounts: " + usersList.map((u) => u.username).join(", "));
            }}>Show demo accounts</button>
            <button onClick={() => setView("home")}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  function AdminDashboard() {
    const [editing, setEditing] = useState(null);
    const [newCourse, setNewCourse] = useState({ id: "", name: "", code: "", description: "", days: [], start: "09:00", end: "10:00", seats: 30, dateRange: "" });
    const [newUser, setNewUser] = useState({ username: "", password: "", name: "" });

    return (
      <div className="centered">
        <h2>Admin Dashboard</h2>
        <div className="row space">
          <div className="card">
            <h3>Courses</h3>
            <table className="table">
              <thead><tr><th>ID</th><th>Name</th><th>Days</th><th>Time</th><th>Seats</th><th>Actions</th></tr></thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.days.join(", ")}</td>
                    <td>{c.start} - {c.end}</td>
                    <td>{c.seats}</td>
                    <td>
                      <button onClick={() => { setEditing(c); setNewCourse(c); }}>Edit</button>
                      <button onClick={() => deleteCourse(c.id)}>Delete</button>
                      <button onClick={() => { setSelectedCourse(c); setView("course-desc"); }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr />
            <h4>{editing ? "Edit course" : "Add new course"}</h4>
            <div className="form-grid">
              <input placeholder="ID" value={newCourse.id} onChange={(e) => setNewCourse({ ...newCourse, id: e.target.value })} />
              <input placeholder="Name" value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} />
              <input placeholder="Code" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} />
              <input placeholder="Date range" value={newCourse.dateRange} onChange={(e) => setNewCourse({ ...newCourse, dateRange: e.target.value })} />
              <input placeholder="Start (HH:MM)" value={newCourse.start} onChange={(e) => setNewCourse({ ...newCourse, start: e.target.value })} />
              <input placeholder="End (HH:MM)" value={newCourse.end} onChange={(e) => setNewCourse({ ...newCourse, end: e.target.value })} />
              <input placeholder="Seats" type="number" value={newCourse.seats} onChange={(e) => setNewCourse({ ...newCourse, seats: Number(e.target.value) })} />
              <input placeholder="Days (comma separated, e.g. Mon,Tue)" value={newCourse.days.join ? newCourse.days.join(",") : newCourse.days} onChange={(e) => setNewCourse({ ...newCourse, days: e.target.value.split(",").map(s => s.trim()) })} />
              <textarea placeholder="Description" value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} />
            </div>
            <div className="row">
              <button onClick={() => {
                if (!editing) addCourse(newCourse);
                else { updateCourse(newCourse); setEditing(null); }
                setNewCourse({ id: "", name: "", code: "", description: "", days: [], start: "09:00", end: "10:00", seats: 30, dateRange: "" });
              }}>{editing ? "Save" : "Add course"}</button>
            </div>
          </div>

          <div className="card">
            <h3>Manage users</h3>
            <h4>Add student</h4>
            <input placeholder="username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
            <input placeholder="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            <input placeholder="name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
            <div className="row">
              <button onClick={() => { addUser("student", newUser); setNewUser({ username: "", password: "", name: "" }); }}>Add student</button>
            </div>

            <hr />
            <h4>Admins</h4>
            <ul>
              {data.users.admins.map((a) => <li key={a.username}>{a.username} ({a.name})</li>)}
            </ul>
            <h4>Students</h4>
            <ul>
              {data.users.students.map((s) => <li key={s.username}>{s.username} ({s.name}) — regs: {(s.registrations||[]).join(", ")}</li>)}
            </ul>
          </div>
        </div>

        <div className="row space">
          <button onClick={() => { setView("course-desc"); }}>Open catalog</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    );
  }

  function StudentDashboard() {
    const me = data.users.students.find((s) => s.username === auth.user.username);
    const registeredIds = me.registrations || [];
    const registeredCourses = data.courses.filter((c) => registeredIds.includes(c.id));

    return (
      <div className="centered">
        <h2>Student Dashboard — {me.name} ({me.username})</h2>
        <div className="row space">
          <div className="card list">
            <h3>Available Courses</h3>
            <table className="table">
              <thead><tr><th>ID</th><th>Name</th><th>Days</th><th>Time</th><th>Seats</th><th>Actions</th></tr></thead>
              <tbody>
                {data.courses.map((c) => {
                  const registered = registeredIds.includes(c.id);
                  const seatsTaken = data.users.students.reduce((acc, s) => acc + (s.registrations?.includes(c.id) ? 1 : 0), 0);
                  return (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.name}</td>
                      <td>{c.days.join(", ")}</td>
                      <td>{c.start} - {c.end}</td>
                      <td>{seatsTaken}/{c.seats}</td>
                      <td>
                        <button onClick={() => { setSelectedCourse(c); setView("course-desc"); }}>View</button>
                        {!registered ? <button onClick={() => registerCourse(me.username, c.id)}>Register</button> : <button onClick={() => unregisterCourse(me.username, c.id)}>Unregister</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Your Timetable</h3>
            <Timetable courses={registeredCourses} />
            <h4>Registered</h4>
            <ul>
              {registeredCourses.map((c) => <li key={c.id}>{c.id} — {c.name} ({c.days.join(", ")}) {c.start}-{c.end}</li>)}
            </ul>
          </div>
        </div>
        <div className="row">
          <button onClick={() => setView("course-desc")}>Open catalog</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    );
  }

  function CourseCatalog({ single }) {
    const list = single ? [single] : data.courses;
    return (
      <div className="centered">
        <h2>Course Catalog</h2>
        <div className="grid-cards">
          {list.map((c) => (
            <div className="card course-card" key={c.id}>
              <h3>{c.name} <span className="muted">({c.id})</span></h3>
              <p><strong>Code:</strong> {c.code}</p>
              <p><strong>Days:</strong> {c.days.join(", ")}</p>
              <p><strong>Time:</strong> {c.start} - {c.end}</p>
              <p><strong>Date range:</strong> {c.dateRange}</p>
              <p><strong>Seats:</strong> {c.seats}</p>
              <p>{c.description}</p>
              <div className="row">
                <button onClick={() => { setSelectedCourse(c); setView("course-desc"); }}>Full</button>
              </div>
            </div>
          ))}
        </div>
        <div className="row">
          <button onClick={() => setView(auth.type === "admin" ? "admin-dashboard" : auth.type === "student" ? "student-dashboard" : "home")}>Back</button>
        </div>
      </div>
    );
  }

  function CourseDescription() {
    const c = selectedCourse || data.courses[0] || null;
    if (!c) return <div className="centered"><p>No course selected</p><button onClick={() => setView("home")}>Home</button></div>;
    return (
      <div className="centered">
        <h2>{c.name} ({c.id})</h2>
        <p><strong>Code:</strong> {c.code}</p>
        <p><strong>Days:</strong> {c.days.join(", ")}</p>
        <p><strong>Time:</strong> {c.start} - {c.end}</p>
        <p><strong>Date range:</strong> {c.dateRange}</p>
        <p><strong>Seats:</strong> {c.seats}</p>
        <p>{c.description}</p>
        <div className="row">
          {auth.type === "student" && <button onClick={() => registerCourse(auth.user.username, c.id)}>Register (as you)</button>}
          <button onClick={() => setView("course-desc")}>Close</button>
          <button onClick={() => setView("home")}>Home</button>
        </div>
      </div>
    );
  }

  // Timetable component: simple grid Monday-Sunday with hours
  function Timetable({ courses }) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    // determine hour range
    const allTimes = courses.flatMap((c) => [timeToMinutes(c.start), timeToMinutes(c.end)]);
    const minTime = allTimes.length ? Math.floor(Math.min(...allTimes) / 60) : 8;
    const maxTime = allTimes.length ? Math.ceil(Math.max(...allTimes) / 60) : 18;
    const hours = [];
    for (let h = minTime; h <= maxTime; h++) hours.push(h);

    return (
      <div className="timetable">
        <div className="tt-header">
          <div className="tt-cell header empty"></div>
          {days.map((d) => <div className="tt-cell header" key={d}>{d}</div>)}
        </div>
        <div className="tt-body">
          {hours.map((h) => (
            <div className="tt-row" key={h}>
              <div className="tt-cell hour">{String(h).padStart(2, "0")}:00</div>
              {days.map((d) => {
                const cellCourse = courses.find((c) => c.days.includes(d) && Math.floor(timeToMinutes(c.start)/60) === h);
                return (
                  <div className="tt-cell" key={d+"-"+h}>
                    {cellCourse ? (
                      <div className="tt-event">
                        <strong>{cellCourse.id}</strong>
                        <div className="small">{cellCourse.name}</div>
                        <div className="small">{cellCourse.start}-{cellCourse.end}</div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Top-level view switch
  let content = null;
  if (view === "home") content = <Home />;
  else if (view === "login-admin") content = <Login type="admin" />;
  else if (view === "login-student") content = <Login type="student" />;
  else if (view === "admin-dashboard") content = auth.type === "admin" ? <AdminDashboard /> : <div className="centered"><p>Not authorized</p><button onClick={() => setView("home")}>Home</button></div>;
  else if (view === "student-dashboard") content = auth.type === "student" ? <StudentDashboard /> : <div className="centered"><p>Not authorized</p><button onClick={() => setView("home")}>Home</button></div>;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-catalog") content = <CourseCatalog />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;
  else if (view === "course-desc") content = <CourseDescription />;

  // simple top bar
  return (
    <div>
      <style>{`/* simple styles for single-file app */
        body { font-family: Inter, Arial, sans-serif; background:#f3f5f7; margin:0; }
        .centered{ max-width:1150px; margin:24px auto; padding:16px; }
        .card{ background:white; padding:12px; border-radius:8px; box-shadow:0 6px 18px rgba(20,30,40,0.06); margin:8px; }
        .actions button{ margin-right:8px; }
        h1,h2,h3{ margin:8px 0 }
        .row{ display:flex; gap:8px; align-items:center; }
        .row.space{ justify-content:space-between; }
        .table{ width:100%; border-collapse:collapse }
        .table th, .table td{ padding:6px 8px; border-bottom:1px solid #eee; text-align:left }
        .list{ width:65% }
        .form{ max-width:600px }
        input, textarea, select{ width:100%; padding:8px; margin:6px 0; border-radius:6px; border:1px solid #ddd }
        .grid-cards{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px }
        .course-card{ min-height:160px }
        .muted{ color:#666; font-size:0.9em }
        .timetable{ overflow:auto; border:1px solid #e8edf0; border-radius:8px }
        .tt-header{ display:flex; }
        .tt-row{ display:flex; }
        .tt-cell{ min-width:120px; border-left:1px solid #f1f4f6; padding:6px; box-sizing:border-box; }
        .tt-cell.header{ background:#fafbfd; font-weight:600; border-bottom:1px solid #e1e7eb }
        .tt-cell.hour{ width:80px; background:#fff; }
        .tt-event{ background:#eaf2ff; padding:6px; border-radius:6px }
        .form-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:8px }
        .small{ font-size:0.85em; color:#444 }
      `}</style>

      <div style={{ background: "linear-gradient(90deg,#2b6cb0,#3b82f6)", color: "white", padding: 12 }}>
        <div className="centered" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Course Scheduler</strong>
            <div style={{ fontSize: 12 }}>{auth.type ? `${auth.type.toUpperCase()}: ${auth.user.name || auth.user.username}` : 'Not logged in'}</div>
          </div>
          <div className="row">
            <button onClick={() => setView("home")} style={{ padding: '8px 10px' }}>Home</button>
            <button onClick={() => setView("course-desc")} style={{ padding: '8px 10px' }}>Catalog</button>
            {!auth.type && <><button onClick={() => setView("login-student")} style={{ padding: '8px 10px' }}>Student Login</button>
            <button onClick={() => setView("login-admin")} style={{ padding: '8px 10px' }}>Admin Login</button></>}
            {auth.type && <button onClick={logout} style={{ padding: '8px 10px' }}>Logout</button>}
          </div>
        </div>
      </div>

      <div className="centered">
        {message && <div className="card"><strong>{message}</strong></div>}
        {content}
        <div style={{ marginTop: 18, fontSize: 12, color: '#666' }}>
        </div>
      </div>
    </div>
  );
}

export default App;
