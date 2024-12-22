"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArffSyntaxValidator = void 0;
const vscode = __importStar(require("vscode"));
const arffTheme_1 = require("../themes/arffTheme");
class ArffSyntaxValidator {
    constructor() {
        this._maxLineLength = 1000;
        this._attributes = [];
        this._relationName = '';
        this._dataStartLine = -1;
        // Inicialización básica
    }
    async validate(document) {
        const errors = [];
        try {
            // Validación específica de ARFF
            this._validateArffStructure(document, errors);
        }
        catch (error) {
            console.error('Error durante la validación:', error);
            errors.push({
                line: 0,
                column: 0,
                message: 'Error interno durante la validación',
                severity: vscode.DiagnosticSeverity.Error
            });
        }
        return errors;
    }
    _validateArffStructure(document, errors) {
        this._attributes = [];
        this._relationName = '';
        this._dataStartLine = -1;
        const lines = document.getText().split('\n');
        let hasRelation = false;
        let hasAttributes = false;
        let hasData = false;
        let inDataSection = false;
        let expectedColumns = 0;
        // Primera pasada: validar estructura básica
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Ignorar líneas vacías y comentarios
            if (!line || line.startsWith('%')) {
                continue;
            }
            // Validar longitud máxima de línea
            if (lines[i].length > this._maxLineLength) {
                errors.push(this._createError(i, this._maxLineLength, 'Línea demasiado larga (máximo 1000 caracteres)', vscode.DiagnosticSeverity.Warning));
            }
            // Validar caracteres especiales
            if (/[^\x20-\x7E]/.test(lines[i])) {
                const invalidCharIndex = lines[i].search(/[^\x20-\x7E]/);
                errors.push(this._createError(i, invalidCharIndex, 'Caracteres especiales no permitidos. Use solo caracteres ASCII imprimibles.'));
            }
            // Validar secciones principales
            if (line.toLowerCase().startsWith('@relation')) {
                this._validateRelationSection(line, i, hasRelation, hasAttributes, hasData, errors);
                hasRelation = true;
            }
            else if (line.toLowerCase().startsWith('@attribute')) {
                this._validateAttributeSection(line, i, hasRelation, hasData, errors);
                hasAttributes = true;
                expectedColumns++;
            }
            else if (line.toLowerCase() === '@data') {
                this._validateDataSection(i, hasRelation, hasAttributes, hasData, errors);
                hasData = true;
                inDataSection = true;
                this._dataStartLine = i;
            }
            else if (inDataSection) {
                this._validateDataLine(line, i, expectedColumns, errors);
            }
            else if (!line.startsWith('@') && !inDataSection) {
                errors.push(this._createError(i, 0, 'Línea inválida. Antes de @data solo se permiten @relation, @attribute y comentarios'));
            }
        }
        // Validar estructura general del documento
        this._validateDocumentStructure(hasRelation, hasAttributes, hasData, errors);
    }
    _validateRelationSection(line, lineNumber, hasRelation, hasAttributes, hasData, errors) {
        if (hasRelation) {
            errors.push(this._createError(lineNumber, 0, 'Solo se permite una declaración @relation'));
            return;
        }
        if (hasAttributes || hasData) {
            errors.push(this._createError(lineNumber, 0, '@relation debe ser la primera declaración no comentada'));
            return;
        }
        const match = /^@relation\s+(['"]?)([^'"]+)\1\s*$/i.exec(line);
        if (!match) {
            errors.push(this._createError(lineNumber, 0, 'Formato de @relation inválido. Use: @relation <nombre> o @relation "nombre con espacios"'));
            return;
        }
        const relationName = match[2];
        if (!/^[a-zA-Z][\w\s.-]*$/.test(relationName)) {
            errors.push(this._createError(lineNumber, line.indexOf(relationName), 'Nombre de relación inválido. Debe comenzar con letra y contener solo letras, números, espacios, puntos, guiones o guiones bajos'));
        }
        this._relationName = relationName;
    }
    _validateAttributeSection(line, lineNumber, hasRelation, hasData, errors) {
        if (!hasRelation) {
            errors.push(this._createError(lineNumber, 0, '@attribute debe aparecer después de @relation'));
            return;
        }
        if (hasData) {
            errors.push(this._createError(lineNumber, 0, '@attribute debe aparecer antes de @data'));
            return;
        }
        // Limpiar los type hints antes de validar
        const cleanLine = line.replace(/:\s*(numeric|string|date|real|integer|si\|no|\{[^}]+\})/g, '');
        const match = /^@attribute\s+(['"]?)([^'"]+)\1\s+(.+)$/i.exec(cleanLine);
        if (!match) {
            errors.push(this._createError(lineNumber, 0, 'Formato de @attribute inválido. Use: @attribute <nombre> <tipo> o @attribute "nombre con espacios" <tipo>'));
            return;
        }
        const [, , attributeName, attributeType] = match;
        // Validar nombre del atributo
        if (!/^[a-zA-Z][\w\s.-]*$/.test(attributeName)) {
            errors.push(this._createError(lineNumber, line.indexOf(attributeName), 'Nombre de atributo inválido. Debe comenzar con letra y contener solo letras, números, espacios, puntos, guiones o guiones bajos'));
        }
        // Validar duplicados
        if (this._attributes.some(attr => attr.name === attributeName)) {
            errors.push(this._createError(lineNumber, line.indexOf(attributeName), `Nombre de atributo '${attributeName}' duplicado`));
            return;
        }
        const cleanType = attributeType.trim();
        this._validateAttributeType(cleanType, lineNumber, cleanLine.indexOf(attributeType), errors);
        // Almacenar la definición del atributo
        const attributeDef = {
            name: attributeName,
            type: cleanType
        };
        if (cleanType.startsWith('{')) {
            attributeDef.values = this._getNominalValues(cleanType);
        }
        this._attributes.push(attributeDef);
    }
    _validateAttributeType(type, lineNumber, column, errors) {
        const cleanType = type.replace(/:\s*(numeric|string|date|real|integer|si\|no|\{[^}]+\})/g, '').trim();
        const validTypes = arffTheme_1.arffTokens.types;
        const isNominal = cleanType.startsWith('{') && cleanType.endsWith('}');
        const isDate = cleanType.toLowerCase().startsWith('date');
        if (!validTypes.includes(cleanType.toLowerCase()) && !isNominal && !isDate) {
            errors.push(this._createError(lineNumber, column, `Tipo de atributo '${cleanType}' no válido. Tipos permitidos: numeric, integer, real, string, date, {valor1,valor2,...}`));
            return;
        }
        if (isNominal) {
            this._validateNominalValues(cleanType, lineNumber, column, errors);
        }
        else if (isDate) {
            this._validateDateFormat(cleanType, lineNumber, column, errors);
        }
    }
    _validateNominalValues(type, lineNumber, column, errors) {
        const values = this._getNominalValues(type);
        if (values.length === 0) {
            errors.push(this._createError(lineNumber, column, 'Los atributos nominales deben tener al menos un valor'));
            return;
        }
        // Verificar duplicados ignorando mayúsculas/minúsculas
        const lowerCaseValues = values.map(v => v.toLowerCase());
        const uniqueValues = new Set(lowerCaseValues);
        if (uniqueValues.size !== values.length) {
            errors.push(this._createError(lineNumber, column, 'Valores nominales duplicados (ignorando mayúsculas/minúsculas)'));
        }
        // Validar formato de cada valor nominal
        values.forEach(value => {
            if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(value)) {
                errors.push(this._createError(lineNumber, column + type.indexOf(value), `Valor nominal '${value}' inválido. Debe comenzar con letra y contener solo letras, números, guiones, puntos o guiones bajos`));
            }
        });
    }
    _validateDateFormat(type, lineNumber, column, errors) {
        const formatMatch = /^date(\s+["']([^"']+)["'])?$/i.exec(type);
        const format = formatMatch?.[2];
        if (format && !/^[yMdHmsSa\s/:-]+$/.test(format)) {
            errors.push(this._createError(lineNumber, column, 'Formato de fecha inválido. Use: yyyy-MM-dd o formatos similares'));
        }
    }
    _validateDataLine(line, lineNumber, expectedColumns, errors) {
        // Ignorar líneas vacías y comentarios en la sección de datos
        if (!line || line.startsWith('%')) {
            return;
        }
        // Limpiar los type hints antes de validar
        const cleanLine = line.replace(/:\s*(numeric|string|date|real|integer|si\|no|\{[^}]+\})/g, '');
        const values = cleanLine.split(',').map(v => v.trim());
        // Validar número de columnas
        if (values.length !== expectedColumns) {
            errors.push(this._createError(lineNumber, 0, `Número incorrecto de valores. Esperados: ${expectedColumns}, Encontrados: ${values.length}`));
            return; // Si el número de columnas no coincide, no validar los valores
        }
        // Validar cada valor
        values.forEach((value, index) => {
            if (index >= this._attributes.length)
                return;
            const cleanValue = value.replace(/:\s*(numeric|string|date|real|integer|si\|no|\{[^}]+\})/g, '').trim();
            if (!cleanValue && cleanValue !== '?' && cleanValue !== '0') {
                errors.push(this._createError(lineNumber, line.indexOf(value), `Valor vacío detectado para el atributo '${this._attributes[index].name}'`, vscode.DiagnosticSeverity.Warning));
                return;
            }
            // Validar formato según el tipo de atributo
            this._validateDataValue(cleanValue, this._attributes[index].name, lineNumber, line.indexOf(value), errors);
        });
    }
    _validateDataValue(value, attributeName, lineNumber, column, errors) {
        if (this._isEmptyOrMissing(value))
            return;
        const attribute = this._attributes.find(attr => attr.name === attributeName);
        if (!attribute)
            return;
        const result = this._validateValueByType(value, attribute, lineNumber, column);
        if (!result.isValid && result.error) {
            errors.push(result.error);
        }
    }
    _isEmptyOrMissing(value) {
        return value === '?' || value === '';
    }
    _validateValueByType(value, attribute, lineNumber, column) {
        const validators = {
            'numeric': this._validateNumericValue.bind(this),
            'real': this._validateNumericValue.bind(this),
            'integer': this._validateIntegerValue.bind(this),
            'date': this._validateDateValue.bind(this)
        };
        const attributeType = attribute.type.toLowerCase();
        const validator = validators[attributeType];
        if (validator) {
            return validator(value, attribute.name, lineNumber, column);
        }
        if (attributeType.startsWith('{')) {
            return this._validateNominalValue(value, attribute, lineNumber, column);
        }
        return { isValid: true };
    }
    _validateNumericValue(value, attributeName, lineNumber, column) {
        if (isNaN(Number(value)) || !this._isValidNumeric(value)) {
            return {
                isValid: false,
                error: this._createError(lineNumber, column, `El valor '${value}' debe ser un número válido para el atributo '${attributeName}'`)
            };
        }
        return { isValid: true };
    }
    _validateIntegerValue(value, attributeName, lineNumber, column) {
        if (!Number.isInteger(Number(value)) || isNaN(Number(value))) {
            return {
                isValid: false,
                error: this._createError(lineNumber, column, `El valor '${value}' debe ser un número entero para el atributo '${attributeName}'`)
            };
        }
        return { isValid: true };
    }
    _validateDateValue(value, attributeName, lineNumber, column) {
        if (isNaN(Date.parse(value))) {
            return {
                isValid: false,
                error: this._createError(lineNumber, column, `El valor '${value}' debe ser una fecha válida para el atributo '${attributeName}'`)
            };
        }
        return { isValid: true };
    }
    _validateNominalValue(value, attribute, lineNumber, column) {
        if (!attribute.values) {
            return { isValid: true };
        }
        const valueToCheck = value.trim().toLowerCase();
        const normalizedValues = attribute.values.map(v => v.toLowerCase());
        const isValidValue = normalizedValues.includes(valueToCheck);
        if (!isValidValue) {
            return {
                isValid: false,
                error: this._createError(lineNumber, column, `El valor '${value}' no es válido para el atributo '${attribute.name}'. Valores permitidos: ${attribute.values.join(', ')}`)
            };
        }
        return { isValid: true };
    }
    _isValidNumeric(value) {
        // Validar formato numérico más estricto
        return /^-?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(value);
    }
    _getAttributeType(attributeName) {
        const attribute = this._attributes.find(attr => attr.name === attributeName);
        return attribute?.type;
    }
    _getNominalValues(type) {
        const match = /^\{(.+)\}$/.exec(type);
        if (!match)
            return [];
        // Dividir por comas y limpiar espacios
        return match[1].split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0); // Filtrar valores vacíos
    }
    _createError(line, column, message, severity = vscode.DiagnosticSeverity.Error) {
        return { line, column, message, severity };
    }
    _validateDocumentStructure(hasRelation, hasAttributes, hasData, errors) {
        if (!hasRelation) {
            errors.push(this._createError(0, 0, 'Falta la declaración @relation al inicio del archivo'));
        }
        if (!hasAttributes) {
            errors.push(this._createError(0, 0, 'No se encontraron atributos. Debe definir al menos un @attribute'));
        }
        if (!hasData) {
            errors.push(this._createError(0, 0, 'Falta la sección @data'));
        }
    }
    _validateDataSection(lineNumber, hasRelation, hasAttributes, hasData, errors) {
        if (!hasRelation || !hasAttributes) {
            errors.push(this._createError(lineNumber, 0, '@data debe aparecer después de @relation y @attribute'));
        }
        if (hasData) {
            errors.push(this._createError(lineNumber, 0, 'Múltiples declaraciones @data no están permitidas'));
        }
    }
}
exports.ArffSyntaxValidator = ArffSyntaxValidator;
//# sourceMappingURL=syntaxValidator.js.map