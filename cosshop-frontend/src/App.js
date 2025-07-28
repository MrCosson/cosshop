import React, { useEffect, useState, useRef } from "react";

const API = window.location.origin + "/api";

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function App() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef();

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

  const addItem = (e) => {
    e.preventDefault();
    if (input.trim() === "") return;
    // Vérifie unicité côté frontend (insensible à la casse)
    if (items.some(item => item.name.toLowerCase() === input.trim().toLowerCase())) {
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
          return res.json().then(err => { throw err; });
        }
        return res.json();
      })
      .then((data) => {
        setItems([...items, data]);
        setInput("");
        setSuggestions([]);
        inputRef.current.focus();
      })
      .catch((err) => {
        // Gestion de l’erreur backend (ex : si 2 navigateurs ouverts)
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

  // Toggle checked state for an item
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

  // Delete all checked items
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

  return (
    <div
      style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif" }}
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
          placeholder="Add Item..."
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
          Delete all checked
        </button>
      )}

      <ul style={{ padding: 0, listStyle: "none" }}>
        {items.map((item) => (
          <li
            key={item.id}
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
              cursor: "pointer",
              textDecoration: item.checked ? "line-through" : "none",
              opacity: item.checked ? 0.7 : 1,
              transition: "background 0.15s, color 0.15s, opacity 0.15s",
            }}
          >
            {/* Nom + date dans une div flex */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12, // espace entre nom et date
                minWidth: 0, // utile pour que le texte ne déborde pas
                flex: 1,
              }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 200, // adapte si tu veux
                  display: "inline-block",
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
        ))}
      </ul>
    </div>
  );
}

export default App;
