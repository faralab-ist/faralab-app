# Creative Objects Menu

Menu modular que aparece abaixo da toolbar quando o modo criativo está ativo. Permite adicionar objetos de forma rápida e organizada.

## Como Usar

O menu aparece automaticamente quando o modo criativo é ativado (botão Edit na toolbar).

## Como Adicionar Novos Objetos

Para adicionar um novo objeto ao menu, edite o array `CREATIVE_OBJECTS` em `CreativeObjectsMenu.jsx`:

```javascript
{
  id: 'uniqueId',           // ID único do objeto
  label: 'Nome no Menu',    // Texto que aparece no botão
  type: 'objectType',       // Tipo do objeto para addObject()
  defaultProps: {           // Props padrão ao criar
    position: [0, 0, 0],
    // outras props específicas
  },
  category: 'electric'      // Categoria: 'electric', 'magnetic', 'test'
}
```

### Exemplo - Adicionar Novo Objeto:

```javascript
{
  id: 'newObject',
  label: 'Novo Objeto',
  type: 'newObjectType',
  defaultProps: { 
    position: [0, 0, 0],
    someProperty: 'value'
  },
  category: 'electric'
}
```

## Categorias

Os objetos são automaticamente agrupados por categoria:

- **Electric**: Objetos de campo elétrico
- **Magnetic**: Objetos de campo magnético  
- **Test**: Objetos de teste

Para adicionar uma nova categoria, basta usar um novo nome de categoria no objeto e adicionar uma nova seção no render do componente.

## Estrutura

```
CreativeObjectsMenu/
├── CreativeObjectsMenu.jsx  # Componente principal
├── CreativeObjectsMenu.css  # Estilos
└── README.md               # Esta documentação
```

## Props

- `addObject`: Função para adicionar objetos à cena
- `isVisible`: Booleano que controla se o menu está visível

## Personalização de Estilos

Os estilos principais podem ser ajustados em `CreativeObjectsMenu.css`:

- `.creative-menu-panel`: Painel principal
- `.creative-menu-item`: Botões individuais
- `.creative-menu-title`: Títulos das categorias
- `.creative-menu-grid`: Grid de botões (atualmente 2 colunas)

Para alterar o número de colunas, modifique:

```css
.creative-menu-grid {
  grid-template-columns: repeat(3, minmax(110px, 1fr)); /* 3 colunas */
}
```
