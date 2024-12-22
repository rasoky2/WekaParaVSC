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
exports.DataViewService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class DataViewService {
    constructor(context) {
        this.dataCache = new Map();
        this.pendingChanges = [];
        this.disposables = [];
        this.isDisposed = false;
        this.context = context;
    }
    dispose() {
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
    async showDataPreview(document) {
        if (this.isDisposed) {
            return;
        }
        try {
            this.currentDocument = document;
            const documentKey = document.uri.toString();
            let arffData;
            // Usar caché si existe
            if (this.dataCache.has(documentKey)) {
                arffData = this.dataCache.get(documentKey);
            }
            else {
                arffData = this.parseArffData(document.getText());
                this.dataCache.set(documentKey, arffData);
            }
            // Crear o mostrar el panel
            if (!this.panel) {
                this.panel = vscode.window.createWebviewPanel('arffPreview', 'Vista Previa ARFF', vscode.ViewColumn.Two, {
                    enableScripts: true,
                    retainContextWhenHidden: true
                });
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
        }
        catch (error) {
            console.error('Error en showDataPreview:', error);
            vscode.window.showErrorMessage('Error al mostrar la vista previa');
        }
    }
    setupMessageHandling() {
        this.panel?.webview.onDidReceiveMessage(async (message) => {
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
    handleCellChange(change) {
        this.pendingChanges.push(change);
        // Actualizar el estado de los botones
        this.panel?.webview.postMessage({
            type: 'updateButtons',
            hasChanges: this.pendingChanges.length > 0
        });
    }
    handleSelection(selection) {
        this.currentSelection = selection;
    }
    async handleSaveChanges(changes) {
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
                const range = new vscode.Range(new vscode.Position(lineIndex, 0), new vscode.Position(lineIndex, line.length));
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
            const updatedArffData = this.parseArffData(this.currentDocument.getText());
            this.panel?.webview.postMessage({
                type: 'updateData',
                data: updatedArffData.data
            });
        }
        catch (error) {
            console.error('Error al guardar cambios:', error);
            await this.showError('Error al guardar los cambios');
        }
    }
    async showError(message) {
        await this.panel?.webview.postMessage({
            type: 'error',
            error: message
        });
    }
    validateCellValue(value, attributeInfo) {
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
    async handleExport() {
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
        }
        catch (error) {
            console.error('Error al exportar:', error);
            await this.panel?.webview.postMessage({
                type: 'error',
                error: 'Error al exportar los datos'
            });
        }
    }
    parseArffData(content) {
        const lines = content.split('\n');
        let relation = '';
        const attributes = [];
        const data = [];
        let isData = false;
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('@relation')) {
                relation = trimmedLine.split(' ')[1];
            }
            else if (trimmedLine.startsWith('@attribute')) {
                const match = RegExp(/@attribute\s+(\S+)\s+({[^}]+}|[^\s]+)/).exec(trimmedLine);
                if (match) {
                    const name = match[1];
                    let type = match[2];
                    let values;
                    if (type.startsWith('{') && type.endsWith('}')) {
                        values = type.slice(1, -1).split(',').map(v => v.trim());
                        type = 'nominal';
                    }
                    attributes.push({ name, type, values });
                }
            }
            else if (trimmedLine === '@data') {
                isData = true;
            }
            else if (isData && trimmedLine && !trimmedLine.startsWith('%')) {
                data.push(trimmedLine.split(',').map(value => value.trim()));
            }
        });
        return { relation, attributes, data };
    }
    setupLiveUpdate(document) {
        // Disposar los listeners anteriores si existen
        const changeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document === document && this.panel && !this.isDisposed) {
                setTimeout(() => {
                    const arffData = this.parseArffData(document.getText());
                    this.updateWebviewContent(arffData);
                    this.panel?.webview.postMessage({
                        type: 'updateData',
                        data: arffData.data
                    });
                }, 100);
            }
        });
        const saveDisposable = vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc === document && this.panel && !this.isDisposed) {
                const arffData = this.parseArffData(doc.getText());
                this.updateWebviewContent(arffData);
                this.panel?.webview.postMessage({
                    type: 'updateData',
                    data: arffData.data
                });
            }
        });
        // Agregar los nuevos disposables
        this.disposables.push(changeDisposable, saveDisposable);
    }
    async renderInitialView(arffData) {
        if (!this.panel) {
            return;
        }
        // Inicializar la vista con los encabezados y estadísticas
        await this.updateWebviewContent(arffData);
        // Esperar a que el webview esté listo
        await new Promise((resolve) => {
            const disposable = this.panel.webview.onDidReceiveMessage(message => {
                if (message.type === 'ready') {
                    disposable.dispose();
                    this.loadDataChunks(arffData.data);
                    resolve();
                }
            });
        });
    }
    async loadDataChunks(data) {
        if (!this.panel)
            return;
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
    async updateWebviewContent(arffData) {
        if (!this.panel)
            return;
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
        }
        catch (error) {
            console.error('Error al cargar el template:', error);
            vscode.window.showErrorMessage('Error al cargar la vista previa');
        }
    }
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    async exportData(arffData) {
        const csvContent = [
            arffData.attributes.map(attr => attr.name).join(','),
            ...arffData.data.map((row) => row.join(','))
        ].join('\n');
        const uri = await vscode.window.showSaveDialog({
            filters: { 'CSV': ['csv'] }
        });
        if (uri) {
            try {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(csvContent, 'utf8'));
                vscode.window.showInformationMessage('Datos exportados correctamente');
            }
            catch (error) {
                console.error('Error al exportar datos:', error);
                vscode.window.showErrorMessage('Error al exportar datos');
            }
        }
    }
    async handleAddRow(rowIndex) {
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
                if (attr.type === 'numeric')
                    return '0';
                if (attr.type === 'nominal' && attr.values?.length)
                    return attr.values[0];
                if (attr.type === 'date')
                    return new Date().toISOString();
                return '?';
            });
            const newLine = defaultValues.join(',') + '\n';
            const position = new vscode.Position(dataStartLine + rowIndex, 0);
            edit.insert(this.currentDocument.uri, position, newLine);
            await vscode.workspace.applyEdit(edit);
            await this.currentDocument.save();
            // Actualizar la vista después de agregar la fila
            const updatedArffData = this.parseArffData(this.currentDocument.getText());
            this.panel?.webview.postMessage({
                type: 'updateData',
                data: updatedArffData.data
            });
        }
        catch (error) {
            console.error('Error al agregar fila:', error);
            await this.showError('Error al agregar la nueva fila');
        }
    }
}
exports.DataViewService = DataViewService;
DataViewService.CHUNK_SIZE = 50;
DataViewService.SCROLL_THRESHOLD = 100;
//# sourceMappingURL=dataViewService.js.map