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
exports.RandomizationService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class RandomizationService {
    constructor() {
        this.ANIMATION_DELAY = 100; // milisegundos entre cada paso
        this.decorator = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
            light: {
                color: new vscode.ThemeColor('editor.foreground')
            },
            dark: {
                color: new vscode.ThemeColor('editor.foreground')
            }
        });
    }
    async randomizeFile(document) {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor)
                return;
            const text = document.getText();
            const lines = text.split('\n');
            const headerSection = [];
            const dataSection = [];
            let isData = false;
            let dataStartLine = 0;
            // Procesar cada línea del archivo y guardar la línea donde comienza @data
            for (const [index, line] of lines.entries()) {
                if (!isData && line.trim().toLowerCase() === '@data') {
                    headerSection.push(line);
                    isData = true;
                    dataStartLine = index + 1;
                }
                else if (isData && line.trim() && !line.startsWith('%')) {
                    dataSection.push(line);
                }
                else {
                    headerSection.push(line);
                }
            }
            // Solo realizamos la animación si hay datos para aleatorizar
            if (dataSection.length > 0) {
                await this.animateShuffle(editor, dataSection, dataStartLine, headerSection);
            }
            // Preguntar al usuario si desea guardar el archivo
            const saveChoice = await vscode.window.showQuickPick(['Sí, guardar archivo aleatorizado', 'No, descartar cambios'], {
                placeHolder: '¿Desea guardar el archivo aleatorizado?',
                canPickMany: false
            });
            if (saveChoice === 'Sí, guardar archivo aleatorizado') {
                // Obtener la ruta del archivo original
                const originalPath = document.uri.fsPath;
                const parsedPath = path.parse(originalPath);
                const randomizedPath = path.join(parsedPath.dir, `${parsedPath.name}_random${parsedPath.ext}`);
                // Obtener el contenido final
                const finalContent = editor.document.getText();
                // Guardar el nuevo archivo
                await vscode.workspace.fs.writeFile(vscode.Uri.file(randomizedPath), Buffer.from(finalContent, 'utf8'));
                // Abrir el nuevo archivo
                const doc = await vscode.workspace.openTextDocument(randomizedPath);
                await vscode.window.showTextDocument(doc, { preview: false });
                vscode.window.showInformationMessage(`Archivo aleatorizado guardado como: ${path.basename(randomizedPath)}`);
            }
            else {
                // Restaurar el contenido original
                await editor.edit(editBuilder => {
                    const range = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
                    editBuilder.replace(range, text);
                });
                vscode.window.showInformationMessage('Aleatorización cancelada: no se guardó el archivo');
            }
        }
        catch (error) {
            console.error('Error al aleatorizar archivo:', error);
            vscode.window.showErrorMessage('Error al aleatorizar el archivo');
        }
    }
    async animateShuffle(editor, dataArray, dataStartLine, headerSection) {
        const progressBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        progressBar.text = "Aleatorizando datos... ";
        progressBar.show();
        try {
            for (let i = dataArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Resaltar las líneas que se van a intercambiar
                const lineI = dataStartLine + i;
                const lineJ = dataStartLine + j;
                this.highlightLines(editor, [lineI, lineJ]);
                // Realizar el intercambio en el array
                [dataArray[i], dataArray[j]] = [dataArray[j], dataArray[i]];
                // Actualizar el contenido del editor en tiempo real
                await editor.edit(editBuilder => {
                    const fullContent = [...headerSection, ...dataArray].join('\n');
                    const range = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(editor.document.getText().length));
                    editBuilder.replace(range, fullContent);
                });
                await this.delay(this.ANIMATION_DELAY);
                // Actualizar la barra de progreso
                progressBar.text = `Aleatorizando datos... ${Math.floor(((dataArray.length - i) / dataArray.length) * 100)}%`;
            }
        }
        finally {
            this.decorator.dispose();
            progressBar.dispose();
        }
    }
    highlightLines(editor, lineIndices) {
        const decorations = lineIndices.map(index => {
            const line = editor.document.lineAt(index);
            return {
                range: line.range
            };
        });
        editor.setDecorations(this.decorator, decorations);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RandomizationService = RandomizationService;
//# sourceMappingURL=randomizationService.js.map