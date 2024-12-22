import * as vscode from 'vscode';
import * as path from 'path';

export class RandomizationService {
    private readonly decorator: vscode.TextEditorDecorationType;
    private readonly ANIMATION_DELAY = 100; // milisegundos entre cada paso

    constructor() {
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

    public async randomizeFile(document: vscode.TextDocument): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const text = document.getText();
            const lines = text.split('\n');
            const headerSection: string[] = [];
            const dataSection: string[] = [];
            let isData = false;
            let dataStartLine = 0;

            // Procesar cada línea del archivo y guardar la línea donde comienza @data
            for (const [index, line] of lines.entries()) {
                if (!isData && line.trim().toLowerCase() === '@data') {
                    headerSection.push(line);
                    isData = true;
                    dataStartLine = index + 1;
                } else if (isData && line.trim() && !line.startsWith('%')) {
                    dataSection.push(line);
                } else {
                    headerSection.push(line);
                }
            }

            // Solo realizamos la animación si hay datos para aleatorizar
            if (dataSection.length > 0) {
                await this.animateShuffle(editor, dataSection, dataStartLine, headerSection);
            }

            // Preguntar al usuario si desea guardar el archivo
            const saveChoice = await vscode.window.showQuickPick(
                ['Sí, guardar archivo aleatorizado', 'No, descartar cambios'],
                {
                    placeHolder: '¿Desea guardar el archivo aleatorizado?',
                    canPickMany: false
                }
            );

            if (saveChoice === 'Sí, guardar archivo aleatorizado') {
                // Obtener la ruta del archivo original
                const originalPath = document.uri.fsPath;
                const parsedPath = path.parse(originalPath);
                const randomizedPath = path.join(
                    parsedPath.dir,
                    `${parsedPath.name}_random${parsedPath.ext}`
                );

                // Obtener el contenido final
                const finalContent = editor.document.getText();

                // Guardar el nuevo archivo
                await vscode.workspace.fs.writeFile(
                    vscode.Uri.file(randomizedPath),
                    Buffer.from(finalContent, 'utf8')
                );

                // Abrir el nuevo archivo
                const doc = await vscode.workspace.openTextDocument(randomizedPath);
                await vscode.window.showTextDocument(doc, { preview: false });

                vscode.window.showInformationMessage(`Archivo aleatorizado guardado como: ${path.basename(randomizedPath)}`);
            } else {
                // Restaurar el contenido original
                await editor.edit(editBuilder => {
                    const range = new vscode.Range(
                        editor.document.positionAt(0),
                        editor.document.positionAt(editor.document.getText().length)
                    );
                    editBuilder.replace(range, text);
                });
                vscode.window.showInformationMessage('Aleatorización cancelada: no se guardó el archivo');
            }
        } catch (error) {
            console.error('Error al aleatorizar archivo:', error);
            vscode.window.showErrorMessage('Error al aleatorizar el archivo');
        }
    }

    private async animateShuffle(
        editor: vscode.TextEditor, 
        dataArray: string[], 
        dataStartLine: number,
        headerSection: string[]
    ): Promise<void> {
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
                    const range = new vscode.Range(
                        editor.document.positionAt(0),
                        editor.document.positionAt(editor.document.getText().length)
                    );
                    editBuilder.replace(range, fullContent);
                });

                await this.delay(this.ANIMATION_DELAY);

                // Actualizar la barra de progreso
                progressBar.text = `Aleatorizando datos... ${Math.floor(((dataArray.length - i) / dataArray.length) * 100)}%`;
            }
        } finally {
            this.decorator.dispose();
            progressBar.dispose();
        }
    }

    private highlightLines(editor: vscode.TextEditor, lineIndices: number[]): void {
        const decorations = lineIndices.map(index => {
            const line = editor.document.lineAt(index);
            return {
                range: line.range
            };
        });
        editor.setDecorations(this.decorator, decorations);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 