// src/diagnostics/diagnosticManager.ts
import * as vscode from 'vscode';
import { ArffSyntaxValidator, ISyntaxError } from '../validators/syntaxValidator';

export class DiagnosticManager {
    private readonly _diagnosticCollection: vscode.DiagnosticCollection;
    private readonly _validator: ArffSyntaxValidator;
    private readonly _maxNumberOfProblems: number;

    constructor() {
        this._diagnosticCollection = vscode.languages.createDiagnosticCollection('arff');
        this._validator = new ArffSyntaxValidator();
        this._maxNumberOfProblems = vscode.workspace.getConfiguration('arff').get('maxNumberOfProblems', 100);
    }

    public async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
        try {
            if (document.languageId !== 'arff') {
                return;
            }

            const validationResults = await this._validator.validate(document);
            const diagnostics = validationResults
                .slice(0, this._maxNumberOfProblems)
                .map((error: ISyntaxError) => this._createDiagnostic(document, error));

            this._diagnosticCollection.set(document.uri, diagnostics);
        } catch (error: unknown) {
            console.error('Error al actualizar diagnósticos:', error instanceof Error ? error.message : 'Error desconocido');
            this._diagnosticCollection.clear();
        }
    }

    private _createDiagnostic(document: vscode.TextDocument, error: ISyntaxError): vscode.Diagnostic {
        const range = error.range || this._calculateRange(document, error);
        const diagnostic = new vscode.Diagnostic(
            range,
            error.message,
            error.severity
        );
        diagnostic.source = error.source ?? 'arff';
        diagnostic.code = error.code;
        return diagnostic;
    }

    private _calculateRange(document: vscode.TextDocument, error: ISyntaxError): vscode.Range {
        const line = document.lineAt(error.line);
        const start = new vscode.Position(error.line, error.column);
        const end = new vscode.Position(error.line, line.text.length);
        return new vscode.Range(start, end);
    }

    public dispose(): void {
        this._diagnosticCollection.dispose();
    }
}