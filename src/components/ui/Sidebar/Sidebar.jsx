import { useState } from "react";
import ObjectList from "./ObjectList";
import "./Sidebar.css";

/**
 * Painel lateral direito (drawer) — mantém todo o estilo e comportamento anteriores:
 * - Botão fixo na lateral direita para abrir/fechar
 * - Largura 320px
 * - Conteúdo com lista de objetos (agora com expansão individual)
 */
export default function Sidebar({ objects, counts }) {
  const [isOpen, setIsOpen] = useState(false);
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
            <h3>Objetos ({counts.total})</h3>
            <div className="legend">
              <span className="pill charge">Charge {counts.charge}</span>
              <span className="pill wire">Wire {counts.wire}</span>
              <span className="pill plane">Plane {counts.plane}</span>
              <span className="pill surface">Surface {counts.surface}</span>
            </div>
          </header>

          <ObjectList items={objects} />
        </div>
      </div>
    </div>
  );
}



