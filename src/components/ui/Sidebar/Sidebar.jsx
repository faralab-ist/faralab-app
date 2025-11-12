import React from "react";
import ObjectList from "./ObjectList";
import "./Sidebar.css";

/**
 * Painel lateral direito (drawer) — mantém todo o estilo e comportamento anteriores:
 * - Botão fixo na lateral direita para abrir/fechar
 * - Largura 320px
 * - Conteúdo com lista de objetos (agora com expansão individual)
 */
export default function Sidebar({ objects, counts, isOpen, setIsOpen, updateObject, removeObject }) {
  const togglePanel = () => setIsOpen((p) => !p);

  return (
    <div className={`sidebar-wrap ${isOpen ? "open" : "closed"}`}>
      <button
        className="toggle-tab"
        aria-label={isOpen ? "Fechar painel" : "Abrir painel"}
        onClick={togglePanel}
        title={isOpen ? "Fechar" : "Abrir"}
      >
        {isOpen ? ">" : "<"}
      </button>

      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="panel-content">
          <header className="panel-header">
            <div className="header-left">
              <h3 className="panel-title">Panel</h3>
              <p className="panel-sub">Manage scene objects</p>
            </div>
            <div className="header-pills">
              <span className="pill objects">
                <strong>Objects</strong>
                <span className="count">{counts.total}</span>
              </span>
              <span className="pill surface">
                <strong>Surface</strong>
                <span className="count">{counts.surface}</span>
              </span>
            </div>
          </header>

          {/* Pass update/remove handlers so sidebar tem as mesmas capacidades que o popup */}
          <ObjectList items={objects} updateObject={updateObject} removeObject={removeObject} />
        </div>
      </div>
    </div>
  );
}



