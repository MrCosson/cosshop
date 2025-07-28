import React, { useEffect, useState, useRef } from "react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

//const API = window.location.origin + "/api";
const API = "http://localhost:8000/api";

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function SortableItem({ item, toggleChecked, deleteItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => toggleChecked(item.id, item.checked)}
      style={{
        background: item.checked ? "#c0ffcb" : "#f8f8f8",
        color: item.checked ? "#198754" : "#222",
        borderRadius: 8,
        marginBottom: 8,
        padding: "12px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 18,
        cursor: isDragging ? "grabbing" : "pointer",
        textDecoration: item.checked ? "line-through" : "none",
        opacity: item.checked ? 0.7 : 1,
        boxShadow: isDragging ? "0 4px 20px #2222" : "",
        transform: CSS.Transform.toString(transform),
        transition,
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        <span
          style={{
            wordBreak: "break-word",
            whiteSpace: "normal",
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {item.name}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "#999",
            fontWeight: 400,
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {formatDate(item.added_at)}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteItem(item.id);
        }}
        style={{
          background: "none",
          border: "none",
          fontSize: 22,
          color: "#cc2b2b",
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </li>
  );
}

function App() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef();
  const [showHistory, setShowHistory] = useState(false);
  const [fullHistory, setFullHistory] = useState([]);
  const [toast, setToast] = useState(null);

  // DND-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetch(`${API}/items/`)
      .then((res) => res.json())
      .then(setItems);
  }, []);

  useEffect(() => {
    if (input.trim().length > 0) {
      fetch(`${API}/history/?q=${input.trim()}`)
        .then((res) => res.json())
        .then(setSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [input]);

  const fetchFullHistory = () => {
    fetch(`${API}/historyall/`)
      .then((res) => res.json())
      .then((data) => setFullHistory(data));
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const addItem = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;
    if (
      items.some(
        (item) => item.name.toLowerCase() === input.trim().toLowerCase()
      )
    ) {
      alert("Cet article est déjà dans la liste !");
      return;
    }
    fetch(`${API}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw err;
          });
        }
        return res.json();
      })
      .then((data) => {
        setItems([...items, data]);
        setInput("");
        setSuggestions([]);
        showToast(`Article ${data.name} ajouté !`);
        inputRef.current.focus();
      })
      .catch((err) => {
        alert(
          err?.name?.[0] ||
            "Erreur lors de l’ajout. L’article est peut-être déjà présent."
        );
      });
  };

  const deleteItem = (id) => {
    fetch(`${API}/items/${id}/`, { method: "DELETE" }).then(() => {
      setItems(items.filter((i) => i.id !== id));
    });
  };

  const addItemFromHistory = (name) => {
    if (
      items.some(
        (item) => item.name.toLowerCase() === name.trim().toLowerCase()
      )
    ) {
      alert("Cet article est déjà dans la liste !");
      return;
    }
    fetch(`${API}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw err;
          });
        }
        return res.json();
      })
      .then((data) => {
        setItems([...items, data]);
        showToast(`Article ${data.name} ajouté !`);
      })
      .catch((err) => {
        alert(
          err?.name?.[0] ||
            "Erreur lors de l’ajout. L’article est peut-être déjà présent."
        );
      });
  };

  const toggleChecked = (id, checked) => {
    fetch(`${API}/items/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !checked }),
    })
      .then((res) => res.json())
      .then((updated) => {
        setItems(items.map((item) => (item.id === id ? updated : item)));
      });
  };

  const deleteAllChecked = () => {
    const checkedItems = items.filter((item) => item.checked);
    Promise.all(
      checkedItems.map((item) =>
        fetch(`${API}/items/${item.id}/`, { method: "DELETE" })
      )
    ).then(() => {
      setItems(items.filter((item) => !item.checked));
    });
  };

  const handleSuggestion = (name) => {
    setInput(name);
    setSuggestions([]);
    inputRef.current.focus();
  };

  const persistOrder = (orderedItems) => {
    fetch(`${API}/items/reorder/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: orderedItems.map((item) => item.id),
      }),
    });
  };

  // dnd-kit: handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    persistOrder(newItems);
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "40px auto",
        fontFamily: "sans-serif",
        padding: "0 4vw",
      }}
    >
      <h1
        style={{ textAlign: "center", fontWeight: 300, letterSpacing: "2px" }}
      >
        CosShop 🛒
      </h1>
      <form onSubmit={addItem} style={{ display: "flex", marginBottom: 16 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          placeholder="Ajouter un article..."
          autoFocus
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #eee",
            outline: "none",
            fontSize: 18,
          }}
        />
        <button
          type="submit"
          style={{
            marginLeft: 8,
            padding: "0 16px",
            border: "none",
            borderRadius: 8,
            background: "#222",
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul
          style={{
            background: "#fff",
            boxShadow: "0 2px 8px #eee",
            borderRadius: 8,
            margin: 0,
            marginBottom: 16,
            padding: 8,
            listStyle: "none",
            position: "relative",
            zIndex: 10,
          }}
        >
          {suggestions.map((s) => (
            <li
              key={s.id}
              onClick={() => handleSuggestion(s.name)}
              style={{ padding: "8px 4px", cursor: "pointer" }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}

      {items.some((item) => item.checked) && (
        <button
          onClick={deleteAllChecked}
          style={{
            marginBottom: 16,
            background: "#cc2b2b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 16,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Delete all checked.
        </button>
      )}

      {/* DRAG & DROP */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul style={{ padding: 0, listStyle: "none" }}>
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                toggleChecked={toggleChecked}
                deleteItem={deleteItem}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => {
          fetchFullHistory();
          setShowHistory(true);
        }}
        style={{
          marginBottom: 16,
          background: "#f1f1f1",
          color: "#222",
          border: "none",
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: 16,
          cursor: "pointer",
          width: "100%",
          fontWeight: 500,
        }}
      >
        Voir l’historique
      </button>

      {showHistory && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 4px 32px #3332",
              padding: 24,
              maxWidth: 340,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowHistory(false)}
              style={{
                position: "sticky",
                top: 10,
                right: 12,
                background: "none",
                border: "none",
                fontSize: 30,
                color: "#888",
                cursor: "pointer",
                float: "right",
                zIndex: 10,
              }}
            >
              ×
            </button>

            <h2
              style={{
                fontSize: 22,
                fontWeight: 400,
                margin: "0 0 14px 0",
                textAlign: "center",
              }}
            >
              Historique des articles
            </h2>
            <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
              {fullHistory.length === 0 ? (
                <li style={{ color: "#aaa", textAlign: "center" }}>
                  Aucun historique...
                </li>
              ) : (
                fullHistory.map((h) => (
                  <li
                    key={h.id}
                    onClick={() => addItemFromHistory(h.name)}
                    style={{
                      padding: "9px 0",
                      borderBottom: "1px solid #f1f1f1",
                      fontSize: 17,
                      color: "#333",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title="Ajouter à la liste"
                  >
                    {h.name}
                    <div style={{ fontSize: 12, color: "#bbb", marginTop: 1 }}>
                      {formatDate(h.last_added)}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2ecc40",
            color: "#fff",
            padding: "14px 32px",
            borderRadius: 30,
            fontWeight: 500,
            boxShadow: "0 4px 18px #0003",
            fontSize: 17,
            zIndex: 10000,
            transition: "opacity 0.3s",
            opacity: toast ? 1 : 0,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
