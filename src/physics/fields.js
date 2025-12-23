import * as THREE from 'three';

/**
 * Gera uma chave hash única para uma posição 3D
 * @param {THREE.Vector3 | {x, y, z}} position 
 * @param {number} precision - número de casas decimais
 * @returns {string}
 */
export function positionHash(position, precision = 2) {
    const x = position.x.toFixed(precision);
    const y = position.y.toFixed(precision);
    const z = position.z.toFixed(precision);
    return `${x},${y},${z}`;
}

/**
 * Converte hash de posição de volta para Vector3
 * @param {string} hash 
 * @returns {THREE.Vector3}
 */
export function hashToPosition(hash) {
    const [x, y, z] = hash.split(',').map(Number);
    return new THREE.Vector3(x, y, z);
}

/**
 * Classe base para qualquer tipo de campo físico (elétrico, magnético, etc)
 */
export class BaseField {
    constructor(name = 'field', precision = 2) {
        this.name = name;
        this.precision = precision;
        // Mapa: hash de posição -> dados do vetor
        this.vectors = new Map();
    }

    /**
     * Adiciona ou atualiza um vetor no campo
     * @param {THREE.Vector3} position 
     * @param {THREE.Vector3} direction - direção do campo
     * @param {Object} metadata - dados adicionais (cor, intensidade, tipo, etc)
     */
    setVector(position, direction, metadata = {}) {
        const key = positionHash(position, this.precision);
        
        this.vectors.set(key, {
            position: position.clone(),
            direction: direction.clone(),
            magnitude: direction.length(),
            ...metadata
        });
    }

    /**
     * Obtém um vetor do campo
     * @param {THREE.Vector3 | string} positionOrKey 
     * @returns {Object | undefined}
     */
    getVector(positionOrKey) {
        const key = typeof positionOrKey === 'string' 
            ? positionOrKey 
            : positionHash(positionOrKey, this.precision);
        return this.vectors.get(key);
    }

    /**
     * Remove um vetor do campo
     * @param {THREE.Vector3 | string} positionOrKey 
     */
    removeVector(positionOrKey) {
        const key = typeof positionOrKey === 'string' 
            ? positionOrKey 
            : positionHash(positionOrKey, this.precision);
        return this.vectors.delete(key);
    }

    /**
     * Verifica se existe um vetor em determinada posição
     * @param {THREE.Vector3 | string} positionOrKey 
     */
    hasVector(positionOrKey) {
        const key = typeof positionOrKey === 'string' 
            ? positionOrKey 
            : positionHash(positionOrKey, this.precision);
        return this.vectors.has(key);
    }

    /**
     * Limpa todos os vetores do campo
     */
    clear() {
        this.vectors.clear();
    }

    /**
     * Retorna todos os vetores como array
     * @returns {Array}
     */
    toArray() {
        return Array.from(this.vectors.values());
    }

    /**
     * Retorna array de vetores filtrados
     * @param {Function} filterFn - função de filtro
     */
    filter(filterFn) {
        return this.toArray().filter(filterFn);
    }

    /**
     * Itera sobre todos os vetores
     * @param {Function} callback - (vectorData, key) => {}
     */
    forEach(callback) {
        this.vectors.forEach((value, key) => callback(value, key));
    }

    /**
     * Número total de vetores
     */
    get size() {
        return this.vectors.size;
    }

    /**
     * Calcula estatísticas do campo
     */
    getStats() {
        const vectors = this.toArray();
        if (vectors.length === 0) return null;

        let maxMag = 0;
        let minMag = Infinity;
        let avgMag = 0;

        for (const v of vectors) {
            const mag = v.magnitude;
            if (mag > maxMag) maxMag = mag;
            if (mag < minMag) minMag = mag;
            avgMag += mag;
        }

        avgMag /= vectors.length;

        return {
            count: vectors.length,
            maxMagnitude: maxMag,
            minMagnitude: minMag,
            avgMagnitude: avgMag,
            logMax: Math.log1p(maxMag)
        };
    }
}

/**
 * Campo Elétrico - extensão específica de BaseField
 */
export class EField extends BaseField {
    constructor(precision = 2) {
        super('electric_field', precision);
        this.type = 'electric';
    }

    /**
     * Adiciona vetor de campo elétrico com cálculo automático de cor
     * @param {THREE.Vector3} position 
     * @param {THREE.Vector3} fieldVector 
     * @param {Object} options
     */
    setElectricVector(position, fieldVector, options = {}) {
        const magnitude = fieldVector.length();
        
        // Calcula cor baseada na magnitude (vermelho = forte, azul = fraco)
        const stats = this.getStats();
        const logMax = stats ? stats.logMax : Math.log1p(magnitude);
        const logMag = Math.log1p(magnitude);
        const normalized = logMax > 0 ? logMag / logMax : 0;
        const hue = (1 - normalized) * 0.66; // 0.66 = azul, 0 = vermelho
        const color = new THREE.Color().setHSL(hue, 1, 0.5);

        this.setVector(position, fieldVector, {
            type: 'electric',
            intensity: magnitude,
            color: color,
            logMagnitude: logMag,
            ...options
        });
    }

    /**
     * Atualiza cores de todos os vetores baseado na magnitude máxima atual
     */
    updateColors() {
        const stats = this.getStats();
        if (!stats) return;

        const logMax = stats.logMax;

        this.vectors.forEach((vectorData, key) => {
            const normalized = logMax > 0 ? vectorData.logMagnitude / logMax : 0;
            const hue = (1 - normalized) * 0.66;
            vectorData.color = new THREE.Color().setHSL(hue, 1, 0.5);
        });
    }

    /**
     * Filtra vetores por threshold de magnitude
     * @param {number} threshold 
     */
    filterByMagnitude(threshold) {
        return this.filter(v => v.magnitude > threshold);
    }
}

/**
 * Objeto global para campo elétrico
 */
export const globalEField = new EField();

/**
 * Factory para criar campos magnéticos (para uso futuro)
 */
export class BField extends BaseField {
    constructor(precision = 2) {
        super('magnetic_field', precision);
        this.type = 'magnetic';
    }

    setMagneticVector(position, fieldVector, options = {}) {
        // Implementação futura para campo magnético
        this.setVector(position, fieldVector, {
            type: 'magnetic',
            intensity: fieldVector.length(),
            ...options
        });
    }
}
