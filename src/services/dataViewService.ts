import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface AttributeInfo {
    name: string;
    type: string;
    values?: string[];
}

interface ArffData {
    relation: string;
    attributes: AttributeInfo[];
    data: string[][];
    dataStartLine: number;
}

interface DataChange {
    rowIndex: number;
    colIndex: number;
    oldValue: string;
    newValue: string;
}

interface CellSelection {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
}

export class DataViewService implements vscode.Disposable {
    private static readonly CHUNK_SIZE = 50;
    private static readonly SCROLL_THRESHOLD = 100;
    private panel: vscode.WebviewPanel | undefined;
    private readonly context: vscode.ExtensionContext;
    private readonly dataCache: Map<string, ArffData> = new Map();
    private currentDocument: vscode.TextDocument | undefined;
    private pendingChanges: DataChange[] = [];
    private currentSelection: CellSelection | undefined;
    private disposables: vscode.Disposable[] = [];
    private isDisposed: boolean = false;
    private cachedArffData: ArffData | undefined;
    private documentLines: string[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public dispose() {
        if (this.isDisposed) {
            return;
        }

        this.isDisposed = true;
        
        // Limpiar el panel si existe
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }

        // Limpiar el caché
        this.dataCache.clear();

        // Limpiar otros recursos
        this.currentDocument = undefined;
        this.pendingChanges = [];
        this.currentSelection = undefined;

        // Disponer de todos los disposables
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    public async showDataPreview(document: vscode.TextDocument) {
        if (this.isDisposed) {
            return;
        }

        try {
            this.currentDocument = document;
            const documentKey = document.uri.toString();
            let arffData: ArffData;

            // Usar caché si existe
            if (this.dataCache.has(documentKey)) {
                arffData = this.dataCache.get(documentKey)!;
            } else {
                arffData = this.parseArffData(document.getText());
                this.dataCache.set(documentKey, arffData);
            }

            this.cachedArffData = arffData;
            this.documentLines = document.getText().split('\n');

            // Crear o mostrar el panel
            if (!this.panel) {
                this.panel = vscode.window.createWebviewPanel(
                    'arffPreview',
                    'Vista Previa ARFF',
                    vscode.ViewColumn.Two,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                // Agregar el panel a los disposables
                this.disposables.push(this.panel);

                this.panel.onDidDispose(() => {
                    this.panel = undefined;
                });

                // Configurar manejo de mensajes
                this.setupMessageHandling();
            }

            // Configurar actualización en vivo
            this.setupLiveUpdate(document);

            // Renderizar vista inicial
            await this.renderInitialView(arffData);

        } catch (error) {
            console.error('Error en showDataPreview:', error);
            vscode.window.showErrorMessage('Error al mostrar la vista previa');
        }
    }

    private setupMessageHandling() {
        this.panel?.webview.onDidReceiveMessage(async message => {
            switch (message.type) {
                case 'saveChanges':
                    await this.handleSaveChanges(message.changes);
                    break;
                case 'export':
                    await this.handleExport();
                    break;
                case 'cellChange':
                    this.handleCellChange(message.change);
                    break;
                case 'selection':
                    this.handleSelection(message.selection);
                    break;
                case 'addRow':
                    await this.handleAddRow(message.rowIndex);
                    break;
                case 'ready':
                    // Ya manejado en renderInitialView
                    break;
            }
        });
    }

    private handleCellChange(change: DataChange) {
        this.pendingChanges.push(change);
        // Actualizar el estado de los botones
        this.panel?.webview.postMessage({
            type: 'updateButtons',
            hasChanges: this.pendingChanges.length > 0
        });
    }

    private handleSelection(selection: CellSelection) {
        this.currentSelection = selection;
    }

    private async handleSaveChanges(changes: DataChange[]) {
        if (!this.currentDocument) {
            await this.showError('No hay un documento activo para guardar los cambios');
            return;
        }

        try {
            const edit = new vscode.WorkspaceEdit();
            const lines = this.currentDocument.getText().split('\n');
            let dataStartLine = -1;

            // Encontrar la sección @data
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '@data') {
                    dataStartLine = i + 1;
                    break;
                }
            }

            if (dataStartLine === -1) {
                throw new Error('No se encontró la sección @data');
            }

            // Ordenar cambios por línea para evitar conflictos
            const sortedChanges = [...changes];
            sortedChanges.sort((a, b) => a.rowIndex - b.rowIndex);

            // Aplicar cambios
            for (const change of sortedChanges) {
                const lineIndex = dataStartLine + change.rowIndex;
                const line = lines[lineIndex];
                const values = line.split(',');
                values[change.colIndex] = change.newValue;

                const range = new vscode.Range(
                    new vscode.Position(lineIndex, 0),
                    new vscode.Position(lineIndex, line.length)
                );
                edit.replace(this.currentDocument.uri, range, values.join(','));
            }

            // Aplicar el edit y guardar
            await vscode.workspace.applyEdit(edit);
            await this.currentDocument.save();
            this.pendingChanges = [];
            
            // Notificar que los cambios se guardaron
            await this.panel?.webview.postMessage({
                type: 'saveComplete',
                message: 'Cambios guardados correctamente'
            });

            // Actualizar la vista con los nuevos datos
            const updatedContent = this.currentDocument.getText();
            const updatedArffData = this.parseArffData(updatedContent);
            this.cachedArffData = updatedArffData;
            this.documentLines = updatedContent.split('\n');
            this.dataCache.set(this.currentDocument.uri.toString(), updatedArffData);
            this.panel?.webview.postMessage({
                type: 'updateData',
                data: updatedArffData.data
            });

        } catch (error) {
            console.error('Error al guardar cambios:', error);
            await this.showError('Error al guardar los cambios');
        }
    }

    private async showError(message: string) {
        await this.panel?.webview.postMessage({
            type: 'error',
            error: message
        });
    }

    private validateCellValue(value: string, attributeInfo: AttributeInfo): boolean {
        switch (attributeInfo.type.toLowerCase()) {
            case 'numeric':
                return !isNaN(Number(value));
            case 'nominal':
                return attributeInfo.values?.includes(value) ?? false;
            case 'string':
                return true;
            case 'date':
                return !isNaN(Date.parse(value));
            default:
                return true;
        }
    }

    private async handleExport() {
        if (!this.currentDocument) {
            await this.panel?.webview.postMessage({
                type: 'error',
                error: 'No hay un documento activo para exportar'
            });
            return;
        }

        try {
            const arffData = this.parseArffData(this.currentDocument.getText());
            await this.exportData(arffData);
        } catch (error) {
            console.error('Error al exportar:', error);
            await this.panel?.webview.postMessage({
                type: 'error',
                error: 'Error al exportar los datos'
            });
        }
    }

    private parseArffData(content: string): ArffData {
        const lines = content.split('\n');
        let relation = '';
        const attributes: AttributeInfo[] = [];
        const data: string[][] = [];
        let isData = false;
        let dataStartLine = -1;

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('@relation')) {
                relation = trimmedLine.split(' ')[1];
            } else if (trimmedLine.startsWith('@attribute')) {
                const match = RegExp(/@attribute\s+(\S+)\s+({[^}]+}|[^\s]+)/).exec(trimmedLine);
                if (match) {
                    const name = match[1];
                    let type = match[2];
                    let values: string[] | undefined;

                    if (type.startsWith('{') && type.endsWith('}')) {
                        values = type.slice(1, -1).split(',').map(v => v.trim());
                        type = 'nominal';
                    }

                    attributes.push({ name, type, values });
                }
            } else if (trimmedLine === '@data') {
                isData = true;
                dataStartLine = index + 1;
            } else if (isData && trimmedLine && !trimmedLine.startsWith('%')) {
                data.push(trimmedLine.split(',').map(value => value.trim()));
            }
        });

        return { relation, attributes, data, dataStartLine };
    }

    private setupLiveUpdate(document: vscode.TextDocument) {
        let changeTimeout: NodeJS.Timeout | undefined;
        let saveTimeout: NodeJS.Timeout | undefined;
        let pendingChanges: readonly vscode.TextDocumentContentChangeEvent[] = [];

        const changeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === document && this.panel && !this.isDisposed) {
                pendingChanges = pendingChanges.concat(e.contentChanges);
                clearTimeout(changeTimeout);
                changeTimeout = setTimeout(() => {
                    this.applyDocumentChanges(pendingChanges, document);
                    pendingChanges = [];
                }, 200);
            }
        });

        const saveDisposable = vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc === document && this.panel && !this.isDisposed) {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    if (this.cachedArffData) {
                        this.updateWebviewContent(this.cachedArffData);
                        this.panel?.webview.postMessage({
                            type: 'updateData',
                            data: this.cachedArffData.data
                        });
                    }
                }, 200);
            }
        });

        this.disposables.push(changeDisposable, saveDisposable);
    }

    private applyDocumentChanges(changes: readonly vscode.TextDocumentContentChangeEvent[], document: vscode.TextDocument) {
        if (!this.cachedArffData) {
            const arffData = this.parseArffData(document.getText());
            this.cachedArffData = arffData;
            this.documentLines = document.getText().split('\n');
            this.panel?.webview.postMessage({ type: 'updateData', data: arffData.data });
            return;
        }

        let headerChanged = false;
        for (const change of changes) {
            if (change.range.start.line < this.cachedArffData.dataStartLine) {
                headerChanged = true;
                break;
            }
        }

        if (headerChanged) {
            const arffData = this.parseArffData(document.getText());
            this.cachedArffData = arffData;
            this.documentLines = document.getText().split('\n');
            this.panel?.webview.postMessage({ type: 'updateData', data: arffData.data });
            return;
        }

        const updates: { start: number; deleteCount: number; rows: string[][] }[] = [];

        for (const change of changes) {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;
            const newLines = change.text.split('\n');
            this.documentLines.splice(startLine, endLine - startLine, ...newLines);

            const rowStart = startLine - this.cachedArffData.dataStartLine;
            const deleteCount = endLine - startLine;
            const parsedRows: string[][] = [];

            for (const line of newLines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('%')) {
                    parsedRows.push(trimmed.split(',').map(v => v.trim()));
                }
            }

            this.cachedArffData.data.splice(rowStart, deleteCount, ...parsedRows);
            updates.push({ start: rowStart, deleteCount, rows: parsedRows });
        }

        this.panel?.webview.postMessage({ type: 'updateRows', updates });
    }

    private async renderInitialView(arffData: ArffData): Promise<void> {
        if (!this.panel) {
            return;
        }

        // Inicializar la vista con los encabezados y estadísticas
        await this.updateWebviewContent(arffData);

        // Esperar a que el webview esté listo
        await new Promise<void>((resolve) => {
            const disposable = this.panel!.webview.onDidReceiveMessage(
                message => {
                    if (message.type === 'ready') {
                        disposable.dispose();
                        this.loadDataChunks(arffData.data);
                        resolve();
                    }
                }
            );
        });
    }

    private async loadDataChunks(data: string[][]): Promise<void> {
        if (!this.panel) return;

        for (let i = 0; i < data.length; i += DataViewService.CHUNK_SIZE) {
            const chunk = data.slice(i, i + DataViewService.CHUNK_SIZE);
            await this.panel.webview.postMessage({
                type: 'appendData',
                data: chunk,
                progress: Math.min(100, Math.round((i + chunk.length) / data.length * 100))
            });

            // Pequeña pausa para permitir el renderizado
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Notificar que la carga está completa
        await this.panel.webview.postMessage({ type: 'loadComplete' });
    }

    private async updateWebviewContent(arffData: ArffData): Promise<void> {
        if (!this.panel) return;

        try {
            const templatePath = path.join(this.context.extensionPath, 'src', 'templates', 'dataView.html');
            let templateContent = await fs.promises.readFile(templatePath, 'utf8');

            // Reemplazar placeholders básicos
            templateContent = templateContent
                .replace('{{relation}}', this.escapeHtml(arffData.relation))
                .replace('{{attributeCount}}', arffData.attributes.length.toString())
                .replace('{{instanceCount}}', arffData.data.length.toString());

            // Procesar los atributos
            const attributesHtml = arffData.attributes.map(attr => {
                const valuesStr = attr.values ? attr.values.join('|') : '';
                return `<th>
                    ${this.escapeHtml(attr.name)}
                    <div class="attribute-type ${attr.type.toLowerCase()}">
                        ${attr.values ? `[${this.escapeHtml(valuesStr)}]` : this.escapeHtml(attr.type)}
                    </div>
                </th>`;
            }).join('\n                    ');

            // Reemplazar la sección de atributos
            templateContent = templateContent
                .replace(/{{#each attributes}}[\s\S]*?{{\/each}}/m, attributesHtml);

            this.panel.webview.html = templateContent;
        } catch (error) {
            console.error('Error al cargar el template:', error);
            vscode.window.showErrorMessage('Error al cargar la vista previa');
        }
    }

    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private async exportData(arffData: ArffData): Promise<void> {
        const csvContent = [
            arffData.attributes.map(attr => attr.name).join(','),
            ...arffData.data.map((row: string[]) => row.join(','))
        ].join('\n');

        const uri = await vscode.window.showSaveDialog({
            filters: { 'CSV': ['csv'] }
        });

        if (uri) {
            try {
                await vscode.workspace.fs.writeFile(
                    uri,
                    Buffer.from(csvContent, 'utf8')
                );
                vscode.window.showInformationMessage('Datos exportados correctamente');
            } catch (error) {
                console.error('Error al exportar datos:', error);
                vscode.window.showErrorMessage('Error al exportar datos');
            }
        }
    }

    private async handleAddRow(rowIndex: number) {
        if (!this.currentDocument) {
            await this.showError('No hay un documento activo para agregar una fila');
            return;
        }

        try {
            const edit = new vscode.WorkspaceEdit();
            const lines = this.currentDocument.getText().split('\n');
            let dataStartLine = -1;

            // Encontrar la sección @data
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim() === '@data') {
                    dataStartLine = i + 1;
                    break;
                }
            }

            if (dataStartLine === -1) {
                throw new Error('No se encontró la sección @data');
            }

            // Crear una nueva fila con valores por defecto
            const arffData = this.parseArffData(this.currentDocument.getText());
            const defaultValues = arffData.attributes.map(attr => {
                if (attr.type === 'numeric') return '0';
                if (attr.type === 'nominal' && attr.values?.length) return attr.values[0];
                if (attr.type === 'date') return new Date().toISOString();
                return '?';
            });

            const newLine = defaultValues.join(',') + '\n';
            const position = new vscode.Position(dataStartLine + rowIndex, 0);
            
            edit.insert(this.currentDocument.uri, position, newLine);
            await vscode.workspace.applyEdit(edit);
            await this.currentDocument.save();

            // Actualizar la vista después de agregar la fila
            const updatedContent = this.currentDocument.getText();
            const updatedArffData = this.parseArffData(updatedContent);
            this.cachedArffData = updatedArffData;
            this.documentLines = updatedContent.split('\n');
            this.dataCache.set(this.currentDocument.uri.toString(), updatedArffData);
            this.panel?.webview.postMessage({
                type: 'updateData',
                data: updatedArffData.data
            });

        } catch (error) {
            console.error('Error al agregar fila:', error);
            await this.showError('Error al agregar la nueva fila');
        }
    }
} 