import React, { useEffect, useState, useRef } from "react";

import { v4 as uuidv4 } from "uuid";
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

const API = window.location.origin + "/api";
//const API = "http://localhost:8000/api";

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
  const [activeTab, setActiveTab] = useState("paris"); // <-- Onglet actif
  const inputRef = useRef();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
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

  // --- Online/offline detection ---
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // --- Offline queue processing ---
  useEffect(() => {
    if (!isOnline) return;
    const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    queue.forEach(async (action) => {
      try {
        switch (action.type) {
          case "ADD_ITEM":
            await fetch(`${API}/items/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.payload),
            });
            break;
          case "DELETE_ITEM":
            await fetch(`${API}/items/${action.payload.id}/`, { method: "DELETE" });
            break;
          case "TOGGLE_CHECKED":
            await fetch(`${API}/items/${action.payload.id}/`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checked: action.payload.checked }),
            });
            break;
          case "REORDER":
            await fetch(`${API}/items/reorder/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: action.payload.ids, list: action.payload.list }),
            });
            break;
          case "HISTORY_ADD":
            await fetch(`${API}/items/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(action.payload),
            });
            break;
          case "HISTORY_DELETE":
            await fetch(`${API}/history/${action.payload.id}/`, { method: "DELETE" });
            break;
          default:
            break;
        }
      } catch (e) {
        console.log("Erreur replay offline action:", e);
      }
    });
    localStorage.removeItem("offlineQueue");
    fetchItems();
    fetchFullHistory();
  }, [isOnline, activeTab]);

  const enqueueOfflineAction = (action) => {
    const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    queue.push(action);
    localStorage.setItem("offlineQueue", JSON.stringify(queue));
  };

  const fetchItems = () => {
    fetch(`${API}/items/?list=${activeTab}`)
      .then((res) => res.json())
      .then(setItems);
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchFullHistory = () => {
    fetch(`${API}/historyall/`)
      .then((res) => res.json())
      .then(setFullHistory);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    // Bloquer doublon
    if (items.some((i) => i.name.toLowerCase() === input.trim().toLowerCase() && i.list_name === activeTab)) {
      showToast("Cet article est déjà dans la liste !");
      return;
    }
    const payload = { name: input, list_name: activeTab };

    // Crée un id temporaire unique pour le DnD
    const tempId = uuidv4();
    const tempItem = {
      ...payload,
      id: tempId,           // id stable pour DnD
      checked: false,
      added_at: new Date().toISOString(),
      serverId: null        // ici on stockera l'id backend
    };

    setItems([...items, tempItem]);
    setInput("");
    setSuggestions([]);

    if (!isOnline) {
      enqueueOfflineAction({ type: "ADD_ITEM", payload });
      showToast("Article ajouté offline !");
      return;
    }
  
    // POST vers le backend
    fetch(`${API}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(data => {
        // Ne change pas l'id, juste stocke l'id réel pour le backend
        setItems(prev => prev.map(i =>
          i.id === tempId ? { ...i, serverId: data.id } : i
        ));
        showToast(`Article ${data.name} ajouté !`);
      });
  };

  const deleteItem = (id) => {
    setItems(items.filter((i) => i.id !== id));
    if (!isOnline) {
      enqueueOfflineAction({ type: "DELETE_ITEM", payload: { id } });
      return;
    }
    fetch(`${API}/items/${id}/`, { method: "DELETE" });
  };

  const toggleChecked = (id, checked) => {
    setItems(items.map((i) => (i.id === id ? { ...i, checked: !checked } : i)));
    if (!isOnline) {
      enqueueOfflineAction({ type: "TOGGLE_CHECKED", payload: { id, checked: !checked } });
      return;
    }
    fetch(`${API}/items/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !checked }),
    });
  };

  const deleteAllChecked = () => {
    const checkedItems = items.filter((i) => i.checked);
    setItems(items.filter((i) => !i.checked));
    checkedItems.forEach((i) => {
      if (!isOnline) {
        enqueueOfflineAction({ type: "DELETE_ITEM", payload: { id: i.id } });
      } else {
        fetch(`${API}/items/${i.id}/`, { method: "DELETE" });
      }
    });
  };

  const persistOrder = (orderedItems) => {
    if (!isOnline) {
      enqueueOfflineAction({
        type: "REORDER",
        payload: { ids: orderedItems.map((i) => i.id), list: activeTab },
      });
      return;
    }
    fetch(`${API}/items/reorder/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: orderedItems.map((i) => i.id), list: activeTab }),
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);
    persistOrder(newItems);
  };

  useEffect(() => {
    if (input.trim().length > 0) {
      fetch(`${API}/history/?q=${input.trim()}`)
        .then(async (res) => {
          try { return await res.json(); } catch { return []; }
        })
        .then(setSuggestions);
    } else setSuggestions([]);
  }, [input]);

  const handleSuggestion = (name) => {
    setInput(name);
    setSuggestions([]);
    inputRef.current.focus();
  };

  const addItemFromHistory = (name) => {
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) return;
    const payload = { name, list_name: activeTab };
    const tempId = uuidv4();
    const tempItem = {
      ...payload,
      id: tempId,
      checked: false,
      added_at: new Date().toISOString(),
      serverId: null
    };

    setItems([...items, tempItem]);
    showToast(`Article ${name} ajouté!`)

    if (!isOnline) {
      enqueueOfflineAction({ type: "HISTORY_ADD", payload });
      return;
    }
  
    fetch(`${API}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    .then(res => res.json())
    .then(data => {
      setItems(prev => prev.map(i =>
        i.id === tempId ? { ...i, serverId: data.id } : i
      ));
    });
  };

  const deleteFromHistory = (id) => {
    setFullHistory(fullHistory.filter((x) => x.id !== id));
    if (!isOnline) {
      enqueueOfflineAction({ type: "HISTORY_DELETE", payload: { id } });
      return;
    }
    fetch(`${API}/history/${id}/`, { method: "DELETE" });
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif", padding: "0 4vw" }}>
      <h1 style={{ textAlign: "center", fontWeight: 300, letterSpacing: "2px" }}>CosShop 🛒</h1>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab("paris")}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "paris" ? "#222" : "#f1f1f1",
            color: activeTab === "paris" ? "#fff" : "#222",
            cursor: "pointer",
          }}
        >
          Paris
        </button>
        <button
          onClick={() => setActiveTab("saussaye")}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "saussaye" ? "#222" : "#f1f1f1",
            color: activeTab === "saussaye" ? "#fff" : "#222",
            cursor: "pointer",
          }}
        >
          Saussaye
        </button>
      </div>

      {/* Formulaire */}
      <form onSubmit={addItem} style={{ display: "flex", marginBottom: 16 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          placeholder="Ajouter un article..."
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

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul style={{ background: "#ddd", boxShadow: "0 2px 8px #eee", borderRadius: 8, marginBottom: 16, padding: 8, listStyle: "none" }}>
          {suggestions.map((s) => (
            <li key={s.id} onClick={() => handleSuggestion(s.name)} style={{ padding: 8, cursor: "pointer" }}>{s.name}</li>
          ))}
        </ul>
      )}

      {/* Liste */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul style={{ padding: 0, listStyle: "none" }}>
            {items.map((item) => (
              <SortableItem key={item.id} item={item} toggleChecked={toggleChecked} deleteItem={deleteItem} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Bouton de suppression des coches */}
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
          Delete all checked
        </button>
      )}

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

      {/* Toast, overlay historique, etc.*/}
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
                    style={{
                      padding: "9px 0",
                      borderBottom: "1px solid #f1f1f1",
                      fontSize: 17,
                      color: "#333",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    title="Ajouter à la liste"
                  >
                    <span
                      onClick={() => addItemFromHistory(h.name)}
                      style={{ flex: 1 }}
                    >
                      {h.name}
                      <div
                        style={{ fontSize: 12, color: "#bbb", marginTop: 1 }}
                      >
                        {formatDate(h.last_added)}
                      </div>
                    </span>
                    <button onClick={e=>{e.stopPropagation(); if(window.confirm("Supprimer cet article de l'historique ?")) deleteFromHistory(h.id);}} style={{background:"none",border:"none",color:"#cc2b2b",fontSize:22,cursor:"pointer",marginLeft:10,lineHeight:1}} title="Supprimer de l'historique">🗑️</button>
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
