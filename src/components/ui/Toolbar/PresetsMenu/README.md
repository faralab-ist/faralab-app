# PresetsMenu Component

Menu dropdown que aparece abaixo da toolbar quando o botão "P" é pressionado.

## Funcionalidades

- **Presets Predefinidos**: Lista de presets organizados por categoria (básicos, magnéticos, planos, geometria)
- **Import/Export**: Permite importar e exportar presets personalizados em formato JSON
- **Animação Suave**: Transição animada ao abrir/fechar o menu
- **Design Consistente**: Segue o mesmo padrão visual do CreativeObjectsMenu

## Categorias de Presets

### Basic
- Monopole
- Dipole
- Tripole
- Wire

### Magnetic
- Current Loop

### Plane
- 1 Plane
- 2 Planes

### Geometry
- Sphere
- Cylinder

## Estrutura

```
PresetsMenu/
├── PresetsMenu.jsx      # Componente principal
├── PresetsMenu.css      # Estilos
├── index.js             # Exportação
└── README.md            # Documentação
```

## Props

- `isVisible` (boolean): Controla a visibilidade do menu
- `onApplyPreset` (function): Callback para aplicar um preset
- `sceneObjects` (array): Objetos da cena atual (para export)
- `camera` (object): Estado da câmera (para export)
- `settings` (object): Configurações da aplicação (para export)

## Integração

O componente é integrado na Toolbar através de um botão com a letra "P" que alterna a visibilidade do menu.
