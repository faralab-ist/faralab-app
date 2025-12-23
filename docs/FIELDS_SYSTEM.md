# Sistema de Campos (BaseField / EField)

## Visão Geral

O novo sistema de campos usa uma estrutura baseada em **Map** com hash de posições para armazenamento eficiente de vetores de campo. Isso permite acesso rápido O(1) e facilita a extensão para outros tipos de campos (magnético, gravitacional, etc).

## Estrutura de Dados

### Hash de Posição
Cada vetor é indexado por uma chave hash única gerada a partir de sua posição 3D:
```javascript
import { positionHash } from './physics/fields';

const position = new THREE.Vector3(1.5, 2.3, -0.7);
const key = positionHash(position, 2); // "1.50,2.30,-0.70"
```

### Armazenamento do Vetor
Cada entrada no dicionário contém:
```javascript
{
  position: THREE.Vector3,     // Posição do vetor
  direction: THREE.Vector3,    // Direção/vetor do campo
  magnitude: Number,           // Intensidade (length do direction)
  type: String,                // 'electric', 'magnetic', etc
  intensity: Number,           // Alias para magnitude
  color: THREE.Color,          // Cor baseada na intensidade
  logMagnitude: Number,        // log(1 + magnitude) para escala
  // ... outros metadados customizados
}
```

## Classes

### BaseField
Classe base genérica para qualquer tipo de campo físico.

```javascript
import { BaseField } from './physics/fields';

const campo = new BaseField('meu_campo', 2); // nome, precisão

// Adicionar vetor
campo.setVector(position, direction, { custom: 'data' });

// Obter vetor
const vetor = campo.getVector(position); // ou campo.getVector(key)

// Verificar existência
if (campo.hasVector(position)) { ... }

// Remover vetor
campo.removeVector(position);

// Iterar
campo.forEach((vectorData, key) => {
  console.log(vectorData.position, vectorData.magnitude);
});

// Filtrar
const fortes = campo.filter(v => v.magnitude > 10);

// Estatísticas
const stats = campo.getStats();
// { count, maxMagnitude, minMagnitude, avgMagnitude, logMax }
```

### EField (Campo Elétrico)
Extensão especializada para campos elétricos com cálculo automático de cores.

```javascript
import { EField } from './physics/fields';

const campoEletrico = new EField();

// Adiciona vetor com cor automática baseada na intensidade
campoEletrico.setElectricVector(position, fieldVector);

// Filtra por magnitude
const vetoresFortes = campoEletrico.filterByMagnitude(0.5);

// Atualiza todas as cores após mudanças
campoEletrico.updateColors();
```

### BField (Campo Magnético) - Preparado para futuro
```javascript
import { BField } from './physics/fields';

const campoMagnetico = new BField();
campoMagnetico.setMagneticVector(position, fieldVector, { metadata });
```

## Uso no Código

### getFieldVectors (atualizado)
Agora retorna um objeto `EField` ao invés de array:

```javascript
import getFieldVectors from './utils/getFieldVectors';

const eField = getFieldVectors(objects, gridSize, step, onlyGaussian, minThreshold);

// eField é uma instância de EField
console.log(eField.size); // número de vetores
const array = eField.toArray(); // converte para array se necessário
```

### useFieldArrows (atualizado)
Trabalha diretamente com objetos `EField`:

```javascript
// Internamente usa:
const eFieldComplete = getFieldVectors(...); // retorna EField
const validVectors = eFieldComplete.filterByMagnitude(threshold);

validVectors.forEach(vectorData => {
  const { position, direction, magnitude, color } = vectorData;
  // renderiza seta...
});
```

## Vantagens

1. **Acesso O(1)**: Busca por posição é instantânea usando Map
2. **Modular**: Fácil criar novos tipos de campo (BField, GField, etc)
3. **Metadados Flexíveis**: Cada vetor pode ter dados customizados
4. **Estatísticas Built-in**: getStats() fornece análise rápida
5. **Iteração Eficiente**: forEach, filter, map nativos
6. **Propagação Otimizada**: Hash permite verificar se posição já foi atualizada

## Exemplo Completo

```javascript
import { EField } from './physics/fields';
import * as THREE from 'three';

// Criar campo
const eField = new EField();

// Adicionar vetores
for (let x = -5; x <= 5; x++) {
  for (let y = -5; y <= 5; y++) {
    const pos = new THREE.Vector3(x, y, 0);
    const field = calculateFieldAtPoint(charges, pos);
    eField.setElectricVector(pos, field);
  }
}

// Atualizar cores globalmente
eField.updateColors();

// Análise
const stats = eField.getStats();
console.log(`Campo tem ${stats.count} vetores`);
console.log(`Magnitude máxima: ${stats.maxMagnitude}`);

// Renderização
const vetoresVisiveis = eField.filterByMagnitude(0.1);
vetoresVisiveis.forEach(v => {
  renderArrow(v.position, v.direction, v.color, v.magnitude);
});
```

## Migração de Código Antigo

**Antes:**
```javascript
const vectors = getFieldVectors(...); // Array
vectors.forEach(({position, field}) => {
  const mag = field.length();
  // ...
});
```

**Depois:**
```javascript
const eField = getFieldVectors(...); // EField
eField.forEach((vectorData) => {
  const { position, direction, magnitude, color } = vectorData;
  // magnitude já calculado, color já definida
  // ...
});
```

## Próximos Passos

- Implementar `BField` completo para campos magnéticos
- Adicionar `GField` para campos gravitacionais
- Criar combinações de campos (superposição)
- Otimizar ainda mais com spatial hashing para queries por região
