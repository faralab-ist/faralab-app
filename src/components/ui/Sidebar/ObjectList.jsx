import { useState } from "react";

/**
 * Lista de objetos exibida dentro do drawer lateral.
 * Cada item pode ser expandido para mostrar os seus atributos.
 */
export default function ObjectList({ items }) {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!items?.length) {
    return <p className="muted">Ainda não existem objetos.</p>;
  }

  return (
    <ul className="object-list">
      {items.map((obj) => (
        <li key={obj.id} className="object-row-wrapper">
          {/* Linha principal do item */}
          <div
            className="object-row"
            role="button"
            tabIndex={0}
            onClick={() => toggleExpand(obj.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleExpand(obj.id)
              }
            }}
          >
            <span className={`pill ${obj.type}`}>
              {obj.type.charAt(0).toUpperCase() + obj.type.slice(1)}
            </span>

            {/* Nome (ex: "Carga 1", "Fio 1") */}
            <span className="name">{obj.name}</span>

            {/* Botão de expandir (▾ / ▸) - stop propagation so it doesn't double-toggle */}
            <div
              className="expand-btn"
              
              
            >
              {expandedItems[obj.id] ? "▾" : "▸"}
            </div>
          </div>

          {/* Detalhes do objeto */}
          {expandedItems[obj.id] && (
            <div className="object-details">
              <DetailsView object={obj} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Mostra os atributos de cada objeto de forma genérica e organizada.
 * Mostra todos os campos exceto: id, type, name, createdAt.
 */
function DetailsView({ object }) {
  const entries = Object.entries(object).filter(
    ([key]) => !["id", "type", "name", "createdAt", "deformable"].includes(key)
  );

  return (
    <div className="details-grid">
      {entries.map(([key, value]) => (
        <div key={key} className="detail-row">
          <span className="detail-key">{key}</span>
          <span className="detail-value">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Formata valores complexos (ex: arrays [x, y, z] ou objetos {x, y, z}) para leitura simples.
 */
function formatValue(value) {
  // Handle arrays (like position)
  if (Array.isArray(value)) {
    const coordinates = ['x', 'y', 'z']
    return value
      .map((v, i) => `${coordinates[i]}: ${Number(v).toFixed(2)}`)
      .join(', ')
  }
  
  // Handle objects
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }

  return String(value);
}


