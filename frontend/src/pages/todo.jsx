
import "./todo.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CgStark } from "react-icons/cg";
import { FcFullTrash } from "react-icons/fc";
import { FaFilter } from "react-icons/fa";
import { supabase } from '../supabase';


function TODO() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState("");



  useEffect(() => {
    getcurrentUser();
  }, []);

  async function getcurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUser(user);
      console.log("Current user:", user);
    } catch (error) {
      console.error("Failed to get current user:", error);
      navigate("/");
    }
  }

  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [dueDate, setDueDate] = useState("");

  const [filter, setFilter] = useState("all");

  const normalizeTask = (task) => {
    const { due_date, dueDate, duedate, subtasks, ...rest } = task;
    const dateValue = due_date ?? dueDate ?? duedate ?? "";
    return {
      ...rest,
      due_date: due_date ?? dateValue,
      dueDate: dateValue,
      subtasks: subtasks || [],
    };
  };

  async function fetchWithAuth(url, options = {}) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Authentication required");
    }

    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(options.headers || {}),
      },
    });
  }





  const [tasks, setTasks] = useState([]);

  async function fetchTasks() {
    if (!user) return;

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/tasks/${user.id}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch tasks");
      }
      const data = await res.json();
      setTasks(Array.isArray(data) ? data.map(normalizeTask) : []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }

  useEffect(() => {

    if (user) {
      fetchTasks();
    }

  }, [user]);


  const [newTask, setNewTask] = useState("");
  const [expandedTaskIds, setExpandedTaskIds] = useState([]);
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const [showAI, setShowAI] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);


  async function addSubtask(taskId) {

    const text = subtaskInputs[taskId]?.trim();

    if (!text) return;

    const res = await fetchWithAuth(
      `${import.meta.env.VITE_API_URL}/subtasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          task_id: taskId,
          text
        })
      }
    );

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    await fetchSubtasks(taskId);

    setSubtaskInputs(current => ({
      ...current,
      [taskId]: ""
    }));
  }

  async function fetchSubtasks(taskId) {
    const res = await fetchWithAuth(
      `${import.meta.env.VITE_API_URL}/subtasks/${taskId}`
    );

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const data = await res.json();

    setTasks(current =>
      current.map(task =>
        task.id === taskId
          ? { ...task, subtasks: data }
          : task
      )
    );
  }



  async function addTask() {
    if (!newTask.trim()) {
      alert("Task cannot be empty!");
      return;
    }

    if (!user) {
      alert("You must be logged in to add a task.");
      return;
    }

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newTask.trim(),
          status: "pending",
          due_date: dueDate || null,
          user_id: user.id,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to add task");
      }

      setNewTask("");
      setDueDate("");
      await fetchTasks();
      setToast("Task created. You will receive an email reminder before the due date.");

      setTimeout(() => {
        setToast("");
      }, 4000);
    } catch (error) {
      console.error("Error adding task:", error);
      setToast("Unable to add task. Please try again.");
      setTimeout(() => {
        setToast("");
      }, 2000);
    }
  }

  async function deleteSubtask(taskId, subtaskId) {

    const res = await fetchWithAuth(
      `${import.meta.env.VITE_API_URL}/subtasks/${subtaskId}`,
      {
        method: "DELETE"
      }
    );

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    await fetchSubtasks(taskId);
  }

  async function deleteTask(taskId) {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to delete task");
      }

      await fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Unable to delete task. Please try again.");
    }
  }

  async function toggleTaskStatus(taskId) {
    const task = tasks.find((task) => task.id === taskId);
    if (!task) return;

    const newStatus = task.status === "pending" ? "completed" : "pending";

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update task status");
      }

      await fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Unable to update task status. Please try again.");
    }
  }

  async function toggleTaskExpand(taskId) {

    if (!expandedTaskIds.includes(taskId)) {
      await fetchSubtasks(taskId);
    }

    setExpandedTaskIds(current =>
      current.includes(taskId)
        ? current.filter(id => id !== taskId)
        : [...current, taskId]
    );
  }

  function updateSubtaskInput(taskId, value) {
    setSubtaskInputs((current) => ({ ...current, [taskId]: value }));
  }


  async function toggleSubtaskCompleted(
    taskId,
    subtaskId,
    currentStatus
  ) {

    const res = await fetchWithAuth(
      `${import.meta.env.VITE_API_URL}/subtasks/${subtaskId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          completed: !currentStatus
        })
      }
    );

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    await fetchSubtasks(taskId);
  }

  function startEdit(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setEditingTaskId(taskId);
    setEditText(task.text);
    setEditDueDate(task.due_date ?? task.dueDate ?? "");
  }

  async function saveEdit() {
    if (!editingTaskId || editText.trim() === "") return;

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/tasks/${editingTaskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: editText.trim(),
          due_date: editDueDate || null,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to save task");
      }

      setEditingTaskId(null);
      setEditText("");
      setEditDueDate("");
      await fetchTasks();
    } catch (error) {
      console.error("Error saving task edit:", error);
      alert("Unable to save task. Please try again.");
    }
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setEditText("");
    setEditDueDate("");
  }

  function openAI(task) {
    setSelectedTask(task);
    setShowAI(true);
  }

  return (
    <div className="todo">
      {
        toast && (
          <div className="toast">
            {toast}
          </div>
        )
      }
      <div className="header">
        <div>
          <p className="greeting">
            Hi, {user?.email?.split("@")[0]}
          </p>
          <br></br>
          <h1>Your Tasks</h1>
        </div>

        <button
          className="logout-btn"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/");
          }}
        >  Log Out
        </button>
      </div>
      <div className="stats-card">
        <div className="stats-icon">✓</div>

        <div>
          <p>
            {tasks.filter(t => t.status !== "completed").length} remaining
          </p>

          <h3>
            {tasks.filter(t => t.status === "completed").length}
            {" of "}
            {tasks.length}
            {" complete"}
          </h3>
        </div>
      </div>

      <div className="add-task-card">
        <input
          className="input"
          type="text"
          placeholder="Enter a task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}

        />
        <input
          className="input"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button
          className="add-btn"
          onClick={addTask}
        >
          "Add New Task"
        </button>
        
        <div className="filter-tabs">

          <button onClick={() => setFilter("all")}>
            All
          </button>

          <button onClick={() => setFilter("pending")}>
            Active
          </button>

          <button onClick={() => setFilter("completed")}>
            Done
          </button>

        </div>




      </div>

      <ul className="task-list">
        {tasks
          .filter((task) => {
            if (filter === "pending") return task.status === "pending";
            if (filter === "completed") return task.status === "completed";
            return true;
          })
          .map((task) => {
            const isExpanded = expandedTaskIds.includes(task.id);
            return (
              <li key={task.id} className="task">
                {editingTaskId === task.id ? (
                  <>
                    <input
                      className="input"
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <input
                      className="input"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />

                    <div className="task-buttons">
                      <button
                        className="button"
                        onClick={saveEdit}
                      >
                        Save
                      </button>

                      <button
                        className="button cancel-button"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="task-row">
                      <div className="task-main" onClick={() => toggleTaskExpand(task.id)}>
                        <input
                          className="task-checkbox"
                          type="checkbox"
                          checked={task.status === "completed"}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleTaskStatus(task.id)}
                        />

                        <span className={task.status === "completed" ? "task-text completed" : "task-text"}>
                          {task.text}
                        </span>
                        {task.dueDate && (
                          <p>
                            Due: {task.dueDate}
                          </p>
                        )}
                      </div>

                      <div className="task-buttons">

                        <button
                          className="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(task.id);
                          }}
                        >
                          Update
                        </button>

                        <button
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                        >
                          <FcFullTrash />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {isExpanded && (
                  <div className="subtasks-box">
                    <div className="subtask-list">
                      {(!task.subtasks || task.subtasks.length === 0) ? (
                        <p className="subtask-empty">No subtasks yet.</p>
                      ) : (
                        (task.subtasks || []).map((subtask) => (
                          <label key={subtask.id} className="subtask-item">
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={() => toggleSubtaskCompleted(task.id, subtask.id, subtask.completed)}
                            />
                            <span className={subtask.completed ? "subtask-text completed" : "subtask-text"}>
                              {subtask.text}
                            </span>
                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteSubtask(
                                  task.id,
                                  subtask.id
                                )
                              }
                            >
                              <FcFullTrash />
                            </button>

                          </label>
                        ))
                      )}
                    </div>

                    <div className="add-subtask-row">
                      <input
                        className="input subtask-input"
                        type="text"
                        placeholder="Add a subtask"
                        value={subtaskInputs[task.id] || ""}
                        onChange={(e) => updateSubtaskInput(task.id, e.target.value)}
                      />
                      <button
                        className="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addSubtask(task.id);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}

      </ul>

      

    </div>
  );

}
export default TODO;