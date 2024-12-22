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
exports.ArffLinter = exports.arffRules = void 0;
const vscode = __importStar(require("vscode"));
exports.arffRules = [
    {
        id: 'arff/relation-declaration',
        description: 'Valida la declaración @relation',
        severity: vscode.DiagnosticSeverity.Error,
        validate: (line, context) => {
            const errors = [];
            if (line.toLowerCase().startsWith('@relation')) {
                const match = /^@relation\s+(['"]?)([^'"]+)\1\s*$/i.exec(line);
                if (!match) {
                    errors.push({
                        message: 'Formato de @relation inválido. Use: @relation <nombre> o @relation "nombre con espacios"',
                        line: context.lineNumber,
                        column: 0,
                        severity: vscode.DiagnosticSeverity.Error
                    });
                }
                else if (!/^[a-zA-Z][\w\s.-]*$/.test(match[2])) {
                    errors.push({
                        message: 'Nombre de relación inválido. Debe comenzar con letra y contener solo letras, números, espacios, puntos, guiones o guiones bajos',
                        line: context.lineNumber,
                        column: line.indexOf(match[2]),
                        severity: vscode.DiagnosticSeverity.Error
                    });
                }
            }
            return errors;
        }
    },
    {
        id: 'arff/attribute-declaration',
        description: 'Valida la declaración @attribute',
        severity: vscode.DiagnosticSeverity.Error,
        validate: (line, context) => {
            const errors = [];
            if (line.toLowerCase().startsWith('@attribute')) {
                const match = /^@attribute\s+(['"]?)([^'"]+)\1\s+(.+)$/i.exec(line);
                if (!match) {
                    errors.push({
                        message: 'Formato de @attribute inválido. Use: @attribute <nombre> <tipo> o @attribute "nombre con espacios" <tipo>',
                        line: context.lineNumber,
                        column: 0,
                        severity: vscode.DiagnosticSeverity.Error
                    });
                }
            }
            return errors;
        }
    },
    {
        id: 'arff/nominal-values',
        description: 'Valida valores nominales',
        severity: vscode.DiagnosticSeverity.Error,
        validate: (line, context) => {
            const errors = [];
            if (context.inDataSection) {
                const values = line.split(',').map(v => v.trim());
                values.forEach((value, index) => {
                    const attribute = context.attributes[index];
                    if (attribute && attribute.type.startsWith('{')) {
                        const validValues = attribute.values?.map(v => v.toLowerCase()) || [];
                        if (!validValues.includes(value.toLowerCase()) && value !== '?') {
                            errors.push({
                                message: `Valor '${value}' no válido para ${attribute.name}. Valores permitidos: ${attribute.values?.join(', ')}`,
                                line: context.lineNumber,
                                column: line.indexOf(value),
                                severity: vscode.DiagnosticSeverity.Error
                            });
                        }
                    }
                });
            }
            return errors;
        }
    },
    {
        id: 'arff/numeric-values',
        description: 'Valida valores numéricos',
        severity: vscode.DiagnosticSeverity.Error,
        validate: (line, context) => {
            const errors = [];
            if (context.inDataSection) {
                const values = line.split(',').map(v => v.trim());
                values.forEach((value, index) => {
                    const attribute = context.attributes[index];
                    if (attribute && (attribute.type === 'numeric' || attribute.type === 'real')) {
                        if (value !== '?' && isNaN(Number(value))) {
                            errors.push({
                                message: `Valor '${value}' debe ser numérico para ${attribute.name}`,
                                line: context.lineNumber,
                                column: line.indexOf(value),
                                severity: vscode.DiagnosticSeverity.Error
                            });
                        }
                    }
                });
            }
            return errors;
        }
    }
];
class ArffLinter {
    constructor() {
        this.rules = exports.arffRules;
    }
    lint(document) {
        const diagnostics = [];
        const lines = document.getText().split('\n');
        const context = {
            lineNumber: 0,
            inDataSection: false,
            attributes: []
        };
        lines.forEach((line, index) => {
            context.lineNumber = index;
            // Actualizar contexto
            if (line.toLowerCase().startsWith('@data')) {
                context.inDataSection = true;
            }
            else if (line.toLowerCase().startsWith('@attribute')) {
                this.processAttribute(line, context);
            }
            // Aplicar reglas
            this.rules.forEach(rule => {
                const errors = rule.validate(line, context);
                errors.forEach(error => {
                    const range = new vscode.Range(error.line, error.column, error.line, error.column + line.length);
                    diagnostics.push(new vscode.Diagnostic(range, error.message, error.severity));
                });
            });
        });
        return diagnostics;
    }
    processAttribute(line, context) {
        const match = /^@attribute\s+(['"]?)([^'"]+)\1\s+(.+)$/i.exec(line);
        if (match) {
            const [, , name, type] = match;
            const values = type.startsWith('{') ?
                type.slice(1, -1).split(',').map(v => v.trim()) :
                undefined;
            context.attributes.push({ name, type, values });
        }
    }
}
exports.ArffLinter = ArffLinter;
//# sourceMappingURL=arffLinterRules.js.map