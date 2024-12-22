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
exports.DiagnosticManager = void 0;
// src/diagnostics/diagnosticManager.ts
const vscode = __importStar(require("vscode"));
const syntaxValidator_1 = require("../validators/syntaxValidator");
class DiagnosticManager {
    constructor() {
        this._diagnosticCollection = vscode.languages.createDiagnosticCollection('arff');
        this._validator = new syntaxValidator_1.ArffSyntaxValidator();
        this._maxNumberOfProblems = vscode.workspace.getConfiguration('arff').get('maxNumberOfProblems', 100);
    }
    async updateDiagnostics(document) {
        try {
            if (document.languageId !== 'arff') {
                return;
            }
            const validationResults = await this._validator.validate(document);
            const diagnostics = validationResults
                .slice(0, this._maxNumberOfProblems)
                .map((error) => this._createDiagnostic(document, error));
            this._diagnosticCollection.set(document.uri, diagnostics);
        }
        catch (error) {
            console.error('Error al actualizar diagnósticos:', error instanceof Error ? error.message : 'Error desconocido');
            this._diagnosticCollection.clear();
        }
    }
    _createDiagnostic(document, error) {
        const range = error.range || this._calculateRange(document, error);
        const diagnostic = new vscode.Diagnostic(range, error.message, error.severity);
        diagnostic.source = error.source ?? 'arff';
        diagnostic.code = error.code;
        return diagnostic;
    }
    _calculateRange(document, error) {
        const line = document.lineAt(error.line);
        const start = new vscode.Position(error.line, error.column);
        const end = new vscode.Position(error.line, line.text.length);
        return new vscode.Range(start, end);
    }
    dispose() {
        this._diagnosticCollection.dispose();
    }
}
exports.DiagnosticManager = DiagnosticManager;
//# sourceMappingURL=diagnosticManager.js.map