import { useEffect, useMemo, useState } from 'react';
import api from './api/axios';
import './App.css';

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
};

const filters = ['all', 'pending', 'completed'];

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const priorityRank = {
  high: 1,
  medium: 2,
  low: 3,
};

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const stats = useMemo(() => {
    const completed = todos.filter((todo) => todo.is_completed).length;
    const highPriority = todos.filter((todo) => todo.priority === 'high' && !todo.is_completed).length;

    return {
      total: todos.length,
      completed,
      pending: todos.length - completed,
      highPriority,
      progress: todos.length ? Math.round((completed / todos.length) * 100) : 0,
    };
  }, [todos]);

  const visibleTodos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return todos
      .filter((todo) => {
        if (filter === 'pending') {
          return !todo.is_completed;
        }

        if (filter === 'completed') {
          return todo.is_completed;
        }

        return true;
      })
      .filter((todo) => {
        if (!normalizedQuery) {
          return true;
        }

        return [todo.title, todo.description, todo.priority]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }

        const priorityDifference = priorityRank[a.priority] - priorityRank[b.priority];

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        const aTime = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;

        return aTime - bTime;
      });
  }, [filter, query, todos]);

  const getErrorMessage = (fallback, err) => {
    return err?.response?.data?.message || fallback;
  };

  const toPayload = (data) => ({
    ...data,
    description: data.description || null,
    due_date: data.due_date || null,
  });

  const formatDate = (date) => {
    if (!date) {
      return 'No date';
    }

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getDateTone = (todo) => {
    if (!todo.due_date || todo.is_completed) {
      return 'neutral';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(todo.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      return 'late';
    }

    if (dueDate.getTime() === today.getTime()) {
      return 'today';
    }

    return 'upcoming';
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/todos');
      setTodos(response.data);
    } catch (err) {
      setError(getErrorMessage('Failed to load todos.', err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const response = await api.post('/todos', toPayload(form));
      setTodos((currentTodos) => [response.data, ...currentTodos]);
      setForm(emptyForm);
    } catch (err) {
      setError(getErrorMessage('Failed to create todo.', err));
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditForm({
      title: todo.title || '',
      description: todo.description || '',
      due_date: todo.due_date ? String(todo.due_date).slice(0, 10) : '',
      priority: todo.priority || 'medium',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleUpdate = async (event, id) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      const response = await api.patch(`/todos/${id}`, toPayload(editForm));
      setTodos((currentTodos) =>
        currentTodos.map((todo) => (todo.id === id ? response.data : todo)),
      );
      cancelEditing();
    } catch (err) {
      setError(getErrorMessage('Failed to update todo.', err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (todo) => {
    try {
      setError('');

      const response = await api.patch(`/todos/${todo.id}`, {
        is_completed: !todo.is_completed,
      });

      setTodos((currentTodos) =>
        currentTodos.map((currentTodo) =>
          currentTodo.id === todo.id ? response.data : currentTodo,
        ),
      );
    } catch (err) {
      setError(getErrorMessage('Failed to update todo status.', err));
    }
  };

  const handleDelete = async (id) => {
    try {
      setError('');

      await api.delete(`/todos/${id}`);
      setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
    } catch (err) {
      setError(getErrorMessage('Failed to delete todo.', err));
    }
  };

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-label="Todo overview">
        <div className="hero-copy">
          <p className="eyebrow">Personal task workspace</p>
          <h1>Plan the day, finish the work.</h1>
          <p className="hero-text">
            Keep priorities, due dates, and progress in one clean board connected to your Laravel API.
          </p>
        </div>

        <div className="progress-card" aria-label="Completion progress">
          <div className="progress-ring" style={{ '--progress': `${stats.progress}%` }}>
            <span>{stats.progress}%</span>
          </div>
          <div>
            <strong>{stats.completed} completed</strong>
            <span>{stats.pending} tasks waiting</span>
          </div>
        </div>
      </section>

      <section className="summary-grid" aria-label="Task summary">
        <article>
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{stats.completed}</strong>
        </article>
        <article>
          <span>High priority</span>
          <strong>{stats.highPriority}</strong>
        </article>
      </section>

      <section className="workspace-grid">
        <aside className="composer-panel" aria-label="Create a todo">
          <div className="panel-heading">
            <p className="eyebrow">New task</p>
            <h2>Add a todo</h2>
          </div>

          <form onSubmit={handleSubmit} className="todo-form">
            <label>
              <span>Title</span>
              <input
                type="text"
                name="title"
                placeholder="Finish API integration"
                value={form.title}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Add helpful details"
                value={form.description}
                onChange={handleChange}
                rows="5"
              />
            </label>

            <div className="form-row">
              <label>
                <span>Due date</span>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                />
              </label>

              <label>
                <span>Priority</span>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? 'Saving task' : 'Create task'}
            </button>
          </form>
        </aside>

        <section className="board-panel" aria-label="Todo list">
          <div className="board-topbar">
            <div className="panel-heading">
              <p className="eyebrow">Task board</p>
              <h2>Your todos</h2>
            </div>

            <label className="search-field">
              <span>Search</span>
              <input
                type="search"
                placeholder="Search tasks"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className="filter-tabs" aria-label="Filter tasks">
            {filters.map((filterName) => (
              <button
                key={filterName}
                type="button"
                className={filter === filterName ? 'active' : ''}
                onClick={() => setFilter(filterName)}
              >
                {filterName}
              </button>
            ))}
          </div>

          {error && <p className="alert">{error}</p>}

          {loading && (
            <div className="loading-list" aria-label="Loading todos">
              <span />
              <span />
              <span />
            </div>
          )}

          {!loading && visibleTodos.length === 0 && (
            <div className="empty-state">
              <h3>No tasks found</h3>
              <p>{todos.length === 0 ? 'Create your first task to start the board.' : 'Try a different search or filter.'}</p>
            </div>
          )}

          {!loading && visibleTodos.length > 0 && (
            <ul className="todo-list">
              {visibleTodos.map((todo) => (
                <li key={todo.id} className={todo.is_completed ? 'todo-card completed' : 'todo-card'}>
                  {editingId === todo.id ? (
                    <form onSubmit={(event) => handleUpdate(event, todo.id)} className="edit-form">
                      <label>
                        <span>Title</span>
                        <input
                          type="text"
                          name="title"
                          value={editForm.title}
                          onChange={handleEditChange}
                          required
                        />
                      </label>

                      <label>
                        <span>Description</span>
                        <textarea
                          name="description"
                          value={editForm.description}
                          onChange={handleEditChange}
                          rows="4"
                        />
                      </label>

                      <div className="form-row">
                        <label>
                          <span>Due date</span>
                          <input
                            type="date"
                            name="due_date"
                            value={editForm.due_date}
                            onChange={handleEditChange}
                          />
                        </label>

                        <label>
                          <span>Priority</span>
                          <select
                            name="priority"
                            value={editForm.priority}
                            onChange={handleEditChange}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </label>
                      </div>

                      <div className="card-actions">
                        <button type="submit" className="primary-button" disabled={saving}>
                          Save changes
                        </button>
                        <button type="button" className="ghost-button" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="card-header">
                        <span className={todo.is_completed ? 'status-badge done' : 'status-badge pending'}>
                          {todo.is_completed ? 'Completed' : 'Pending'}
                        </span>

                        <span className={`priority priority-${todo.priority}`}>
                          {priorityLabels[todo.priority] || todo.priority}
                        </span>
                      </div>

                      <div>
                        <h3>{todo.title}</h3>
                        {todo.description && <p className="description">{todo.description}</p>}
                      </div>

                      <div className="meta-row">
                        <span className={`date-pill ${getDateTone(todo)}`}>
                          {formatDate(todo.due_date)}
                        </span>
                      </div>

                      <div className="card-actions">
                        <button
                          type="button"
                          className={todo.is_completed ? 'complete-button undo' : 'complete-button'}
                          onClick={() => handleToggleComplete(todo)}
                        >
                          {todo.is_completed ? 'Mark pending' : 'Mark complete'}
                        </button>
                        <button type="button" className="ghost-button" onClick={() => startEditing(todo)}>
                          Edit
                        </button>
                        <button type="button" className="delete-button" onClick={() => handleDelete(todo.id)}>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;

