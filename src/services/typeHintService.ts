import * as vscode from 'vscode';

export interface IAttributeInfo {
    name: string;
    type: string;
    values?: string[];
}

type HintStyle = 'inline' | 'background';

interface FontConfig {
    family: string;
    size: string;
    weight: string;
    style: string;
}

export class TypeHintService {
    private static readonly GOOGLE_FONTS_INTER = '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");';
    
    private static readonly _hintDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            margin: '0 0.3em 0 0.3em',
            color: new vscode.ThemeColor('editorCodeLens.foreground'),
            contentText: '',
            textDecoration: `none; 
                ${TypeHintService.GOOGLE_FONTS_INTER}
                font-family: "Inter", var(--arff-hint-font-family, sans-serif);
                font-size: var(--arff-hint-font-size, 11px);
                color: var(--vscode-descriptionForeground);
                background: transparent;`
        },
        light: {
            before: {
                color: 'var(--arff-hint-color-light, #787878)',
                textDecoration: `none; 
                    font-family: "Inter", var(--arff-hint-font-family, sans-serif);
                    font-size: var(--arff-hint-font-size, 11px);
                    color: var(--vscode-descriptionForeground);
                    background: transparent;`
            }
        },
        dark: {
            before: {
                color: 'var(--arff-hint-color-dark, #787878)',
                textDecoration: `none; 
                    font-family: "Inter", var(--arff-hint-font-family, sans-serif);
                    font-size: var(--arff-hint-font-size, 11px);
                    color: var(--vscode-descriptionForeground);
                    background: transparent;`
            }
        }
    });

    private static readonly _errorDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editorError.background'),
        before: {
            margin: '0 0.3em 0 0.3em',
            color: new vscode.ThemeColor('editorError.foreground'),
            contentText: '',
            textDecoration: `none; 
                ${TypeHintService.GOOGLE_FONTS_INTER}
                font-family: "Inter", var(--arff-hint-font-family, sans-serif);
                font-size: var(--arff-hint-font-size, 11px);
                color: var(--vscode-errorForeground);
                background: transparent;`
        }
    });

    private static readonly _MAX_VALUES_TO_SHOW = 3;
    private _fontConfig: FontConfig;
    private readonly _styleDisposable: vscode.Disposable;

    private readonly _attributes: Map<string, IAttributeInfo> = new Map();
    private readonly _disposables: vscode.Disposable[] = [];
    private _enabled = true;
    private readonly _diagnosticCollection: vscode.DiagnosticCollection;
    private readonly decorationType: vscode.TextEditorDecorationType;
    private readonly statusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        this._diagnosticCollection = vscode.languages.createDiagnosticCollection('arff');
        this._disposables.push(this._diagnosticCollection);

        this._registerCommands(context);
        this._registerEventHandlers();

        this.decorationType = vscode.window.createTextEditorDecorationType({});
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.setupStatusBar();

        // Inicializar configuración de fuente
        this._fontConfig = this._loadFontConfig();
        this._styleDisposable = this._registerFontConfigurationWatcher();
        
        context.subscriptions.push(this._styleDisposable);
    }

    private _registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('weka-arff.toggleTypeHints', () => {
                this._toggleTypeHints();
            })
        );
    }

    private async _toggleTypeHints(): Promise<void> {
        const config = vscode.workspace.getConfiguration('arff');
        const currentValue = config.get('typeHints.enabled');
        await config.update('typeHints.enabled', !currentValue, true);
        this._updateDecorations();
        vscode.window.showInformationMessage(
            `Sugerencias de tipo ${!currentValue ? 'activadas' : 'desactivadas'}`
        );
    }

    private _registerEventHandlers(): void {
        let timeout: NodeJS.Timeout | undefined;

        this._disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('arff.showTypeHints')) {
                    this._enabled = vscode.workspace.getConfiguration('arff').get('showTypeHints', true);
                    this._updateDecorations();
                }
            }),

            vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.languageId === 'arff') {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(() => {
                        this._parseAttributes(e.document);
                        this._updateDecorations();
                        this._validateDocument(e.document);
                    }, 500);
                }
            }),

            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor?.document.languageId === 'arff') {
                    this._parseAttributes(editor.document);
                    this._updateDecorations();
                    this._validateDocument(editor.document);
                }
            })
        );
    }

    private _parseAttributes(document: vscode.TextDocument): void {
        this._attributes.clear();
        const text = document.getText();
        const lines = text.split('\n');
        let dataSection = false;

        for (const line of lines) {
            if (line.trim().startsWith('@data')) {
                dataSection = true;
                continue;
            }

            if (!dataSection && line.trim().startsWith('@attribute')) {
                this._parseAttributeLine(line);
            }
        }
    }

    private _parseAttributeLine(line: string): void {
        const match = RegExp(/@attribute\s+(\w+)\s+({[^}]+}|numeric|string|date|real|integer|\{si,\s*no\}|\{true,\s*false\})/i).exec(line);
        if (match) {
            const [, name, type] = match;
            const info: IAttributeInfo = {
                name,
                type: this._normalizeType(type.toLowerCase())
            };

            if (type.startsWith('{')) {
                info.values = type
                    .slice(1, -1)
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v);
            }

            if (this._isBooleanType(type)) {
                info.type = 'boolean';
                info.values = ['si', 'no'];
            }

            this._attributes.set(name, info);
        }
    }

    private _normalizeType(type: string): string {
        if (this._isBooleanType(type)) {
            return 'boolean';
        }
        return type.replace(/[{}]/g, '').toLowerCase();
    }

    private _isBooleanType(type: string): boolean {
        const lowerType = type.toLowerCase();
        return (
            lowerType === '{si,no}' ||
            lowerType === '{no,si}' ||
            lowerType === '{true,false}' ||
            lowerType === '{false,true}' ||
            /\{\s*si\s*,\s*no\s*\}/i.test(type) ||
            /\{\s*no\s*,\s*si\s*\}/i.test(type)
        );
    }

    private _validateDocument(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const lines = document.getText().split('\n');
        
        this._processDataSection(lines, document, diagnostics);
        this._diagnosticCollection.set(document.uri, diagnostics);
    }

    private _processDataSection(lines: string[], document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        let dataSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('@data')) {
                dataSection = true;
                continue;
            }

            if (dataSection && line) {
                this._validateDataLine(line, i, document, diagnostics);
            }
        }
    }

    private _validateDataLine(line: string, lineIndex: number, document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const values = line.split(',').map(v => v.trim());
        let index = 0;

        for (const [name, info] of this._attributes.entries()) {
            if (index < values.length) {
                const value = values[index];
                const startPos = line.indexOf(value);
                const range = new vscode.Range(
                    new vscode.Position(lineIndex, startPos),
                    new vscode.Position(lineIndex, startPos + value.length)
                );

                if (!this._isValidValue(value, info)) {
                    diagnostics.push(this._createDiagnostic(range, name, info));
                }
            }
            index++;
        }
    }

    private _createDiagnostic(range: vscode.Range, name: string, info: IAttributeInfo): vscode.Diagnostic {
        return new vscode.Diagnostic(
            range,
            `Valor inválido para ${name} (${info.type})${
                info.values ? `. Valores permitidos: ${info.values.join(', ')}` : ''
            }`,
            vscode.DiagnosticSeverity.Error
        );
    }

    private _isValidValue(value: string, info: IAttributeInfo): boolean {
        if (value === '?' || value === '') return true;

        if (info.type === 'boolean') {
            const normalizedValue = value.toLowerCase().trim();
            return ['si', 'no', 'true', 'false'].includes(normalizedValue);
        }

        switch (info.type) {
            case 'numeric':
            case 'real':
                return !isNaN(Number(value));
            case 'integer':
                return Number.isInteger(Number(value));
            case 'string':
                return true;
            case 'date':
                return !isNaN(Date.parse(value));
            default:
                return info.values ? info.values.includes(value.toLowerCase()) : true;
        }
    }

    private _updateDecorations(): void {
        const editor = vscode.window.activeTextEditor;
        if (!this._shouldUpdateDecorations(editor)) return;

        const config = vscode.workspace.getConfiguration('arff');
        const enabled = config.get('typeHints.enabled', true);
        const style = config.get<HintStyle>('typeHints.style', 'inline');

        if (!enabled || !editor) {
            this._clearDecorations(editor);
            return;
        }

        const { decorations, errorDecorations } = this._processEditorContent(editor, style);
        
        editor.setDecorations(TypeHintService._hintDecorationType, decorations);
        editor.setDecorations(TypeHintService._errorDecorationType, errorDecorations);
    }

    private _shouldUpdateDecorations(editor: vscode.TextEditor | undefined): boolean {
        return editor !== undefined && editor.document.languageId === 'arff';
    }

    private _clearDecorations(editor: vscode.TextEditor | undefined): void {
        if (!editor) return;
        editor.setDecorations(TypeHintService._hintDecorationType, []);
        editor.setDecorations(TypeHintService._errorDecorationType, []);
    }

    private _processEditorContent(editor: vscode.TextEditor | undefined, style: HintStyle): {
        decorations: vscode.DecorationOptions[];
        errorDecorations: vscode.DecorationOptions[];
    } {
        if (!editor) return { decorations: [], errorDecorations: [] };

        const decorations: vscode.DecorationOptions[] = [];
        const errorDecorations: vscode.DecorationOptions[] = [];
        const lines = editor.document.getText().split('\n');
        let dataSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.trim().startsWith('@data')) {
                dataSection = true;
                continue;
            }

            if (dataSection && line.trim()) {
                this._processDataLine(line, i, style, decorations, errorDecorations);
            }
        }

        return { decorations, errorDecorations };
    }

    private _processDataLine(
        line: string,
        lineIndex: number,
        style: HintStyle,
        decorations: vscode.DecorationOptions[],
        errorDecorations: vscode.DecorationOptions[]
    ): void {
        const values = line.split(',').map(v => v.trim());
        let index = 0;

        for (const [, info] of this._attributes.entries()) {
            if (index < values.length) {
                const value = values[index];
                const range = new vscode.Range(
                    new vscode.Position(lineIndex, line.indexOf(value)),
                    new vscode.Position(lineIndex, line.indexOf(value) + value.length)
                );

                const decoration = this._createDecoration(range, info, style);
                const isValid = this._isValidValue(value, info);

                if (isValid) {
                    decorations.push(decoration);
                } else {
                    errorDecorations.push(this._createErrorDecoration(decoration, info));
                }
            }
            index++;
        }
    }

    private _createDecoration(range: vscode.Range, info: IAttributeInfo, style: HintStyle): vscode.DecorationOptions {
        const decoration: vscode.DecorationOptions = {
            range,
            renderOptions: {
                before: {
                    contentText: style === 'inline' ? this._formatTypeHint(info) : '',
                    textDecoration: `none; 
                        ${TypeHintService.GOOGLE_FONTS_INTER}
                        font-family: "Inter", var(--arff-hint-font-family, sans-serif);
                        font-size: ${this._fontConfig.size};
                        font-weight: ${this._fontConfig.weight};
                        font-style: ${this._fontConfig.style};
                        color: var(--vscode-descriptionForeground);
                        background: transparent;`
                }
            }
        };

        const hoverContent = new vscode.MarkdownString();
        hoverContent.supportHtml = true;
        hoverContent.isTrusted = true;
        
        // Agregar estilos para la animación y cargar Inter
        hoverContent.appendMarkdown(`<style>
            ${TypeHintService.GOOGLE_FONTS_INTER}
            
            .values-list {
                max-height: 200px;
                overflow-y: auto;
                animation: slideDown 0.2s ease-out;
                font-family: "Inter", sans-serif;
                font-size: ${this._fontConfig.size};
                font-weight: ${this._fontConfig.weight};
                letter-spacing: -0.011em;
                background-color: var(--vscode-editor-background);
                border-radius: 3px;
                padding: 6px;
                border: 1px solid var(--vscode-panel-border);
            }
            @keyframes slideDown {
                from {
                    max-height: 0;
                    opacity: 0;
                }
                to {
                    max-height: 200px;
                    opacity: 1;
                }
            }
            .type-header {
                margin-bottom: 8px;
                padding-bottom: 6px;
                border-bottom: 1px solid var(--vscode-panel-border);
                font-family: "Inter", sans-serif;
                font-size: ${this._fontConfig.size};
                font-weight: 500;
                letter-spacing: -0.011em;
                display: flex;
                align-items: center;
                gap: 6px;
                color: var(--vscode-descriptionForeground);
            }
            .value-item {
                font-family: "Inter", sans-serif;
                font-size: ${this._fontConfig.size};
                font-weight: ${this._fontConfig.weight};
                letter-spacing: -0.011em;
                padding: 4px 8px;
                margin: 2px 0;
                border-radius: 3px;
                background-color: var(--vscode-editor-background);
                transition: all 0.2s ease;
                color: var(--vscode-descriptionForeground);
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .value-item:hover {
                background-color: var(--vscode-list-hoverBackground);
                color: var(--vscode-foreground);
            }
            .boolean-value {
                font-weight: 500;
                color: var(--vscode-symbolIcon-booleanForeground);
            }
            .attribute-name {
                font-weight: 500;
                color: var(--vscode-symbolIcon-propertyForeground);
            }
        </style>`);
        
        // Encabezado con nombre y tipo
        hoverContent.appendMarkdown(`<div class="type-header">`);
        hoverContent.appendMarkdown(`<span class="attribute-name">${info.name}</span>`);
        hoverContent.appendMarkdown(`<span style="opacity: 0.7">:</span>`);
        if (info.type === 'boolean') {
            hoverContent.appendMarkdown(`<span class="boolean-value">boolean (si|no)</span>`);
        } else {
            hoverContent.appendMarkdown(`<span style="color: var(--vscode-symbolIcon-typeParameterForeground)">${info.type}</span>`);
        }
        hoverContent.appendMarkdown(`</div>`);

        // Lista de valores con animación
        if (info.values && info.type !== 'boolean') {
            hoverContent.appendMarkdown(`<div class="values-list">`);
            hoverContent.appendMarkdown('**Valores permitidos**\n');
            info.values.forEach(value => {
                hoverContent.appendMarkdown(`<div class="value-item">${value}</div>\n`);
            });
            hoverContent.appendMarkdown(`</div>`);
        }

        decoration.hoverMessage = hoverContent;
        return decoration;
    }

    private _formatTypeHint(info: IAttributeInfo): string {
        const config = vscode.workspace.getConfiguration('arff');
        const displayStyle = config.get<'type' | 'attribute' | 'both'>('typeHints.displayStyle', 'type');

        let hint = '';
        
        if (displayStyle === 'attribute' || displayStyle === 'both') {
            hint += `: ${info.name}`;
        }

        if (displayStyle === 'type' || displayStyle === 'both') {
            const typeHint = this._getTypeHint(info);
            if (displayStyle === 'both') {
                hint += ` (${typeHint})`;
            } else {
                hint = `: ${typeHint}`;
            }
        }

        return hint;
    }

    private _getTypeHint(info: IAttributeInfo): string {
        if (info.type === 'boolean') {
            return 'si|no';
        }

        if (info.values) {
            if (info.values.length > TypeHintService._MAX_VALUES_TO_SHOW) {
                return '...';
            }
            return info.values.join('|');
        }
        return info.type;
    }

    private _createErrorDecoration(decoration: vscode.DecorationOptions, info: IAttributeInfo): vscode.DecorationOptions {
        const errorDecoration = { ...decoration };
        const hoverContent = new vscode.MarkdownString();
        hoverContent.supportHtml = true;
        
        hoverContent.appendMarkdown(`<span style="color: var(--vscode-errorForeground)">**Error de tipo**</span>\n\n`);
        hoverContent.appendMarkdown(`El valor no es válido para el atributo **${info.name}** (${info.type})`);
        
        if (info.values) {
            hoverContent.appendMarkdown('\n\n**Valores permitidos:**\n');
            info.values.forEach(value => {
                hoverContent.appendMarkdown(`- ${value}\n`);
            });
        }

        errorDecoration.hoverMessage = hoverContent;
        return errorDecoration;
    }

    public dispose(): void {
        this._styleDisposable.dispose();
        this._disposables.forEach(d => d.dispose());
        this.decorationType.dispose();
        this.statusBarItem.dispose();
    }

    private setupStatusBar() {
        this.statusBarItem.text = "$(eye) Type Hints";
        this.statusBarItem.tooltip = "Click para activar/desactivar los Type Hints";
        this.statusBarItem.command = 'weka-arff.toggleTypeHints';
        this.updateStatusBar();
        this.statusBarItem.show();
    }

    private updateStatusBar() {
        this.statusBarItem.text = `$(${this._enabled ? 'eye' : 'eye-closed'}) Type Hints`;
        this.statusBarItem.tooltip = `Click para ${this._enabled ? 'desactivar' : 'activar'} los Type Hints`;
    }

    public toggleTypeHints() {
        this._enabled = !this._enabled;
        this.updateStatusBar();
        
        // Actualizar la vista actual
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (this._enabled) {
                this._updateDecorations();
            } else {
                editor.setDecorations(TypeHintService._hintDecorationType, []);
            }
        }

        // Mostrar notificación
        vscode.window.showInformationMessage(
            `Type Hints ${this._enabled ? 'activados' : 'desactivados'}`
        );
    }

    public activate(context: vscode.ExtensionContext) {
        // Registrar el comando para alternar los type hints
        context.subscriptions.push(
            vscode.commands.registerCommand('weka-arff.toggleTypeHints', () => {
                this.toggleTypeHints();
            })
        );

        // Registrar el statusBarItem para limpieza
        context.subscriptions.push(this.statusBarItem);

        // Registrar los event listeners
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor && this._enabled) {
                    this._updateDecorations();
                }
            }),
            vscode.workspace.onDidChangeTextDocument(event => {
                const editor = vscode.window.activeTextEditor;
                if (editor && event.document === editor.document && this._enabled) {
                    this._updateDecorations();
                }
            })
        );

        // Actualizar decoraciones iniciales
        if (vscode.window.activeTextEditor && this._enabled) {
            this._updateDecorations();
        }

        // Registrar configuración de fuentes y tamaño del editor
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('arff.typeHints.font') || 
                    e.affectsConfiguration('editor.fontSize')) {
                    this._fontConfig = this._loadFontConfig();
                    this._updateDecorations();
                }
            })
        );
    }

    private _loadFontConfig(): FontConfig {
        const config = vscode.workspace.getConfiguration('arff.typeHints.font');
        const editorConfig = vscode.workspace.getConfiguration('editor');
        const editorFontSize = editorConfig.get<number>('fontSize', 14);
        
        // Asegurar que el tamaño mínimo sea 9px
        const hintFontSize = Math.max(9, editorFontSize - 2);

        return {
            family: '"Inter", sans-serif', // Siempre usar Inter
            size: `${hintFontSize}px`,
            weight: config.get('weight', '400'),
            style: config.get('style', 'normal')
        };
    }

    private _registerFontConfigurationWatcher(): vscode.Disposable {
        // Combinar los watchers para editor.fontSize y nuestras configuraciones
        const disposables: vscode.Disposable[] = [];

        disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('arff.typeHints.font') || 
                    e.affectsConfiguration('editor.fontSize')) {
                    this._fontConfig = this._loadFontConfig();
                    this._updateDecorations();
                }
            })
        );

        return {
            dispose: () => {
                disposables.forEach(d => d.dispose());
            }
        };
    }
} 