import * as vscode from 'vscode';
import { ConfigurationService } from './services/configurationService';
import { RecommendationService } from './services/recommendationService';
import { activateColorization } from './themes/arffTheme';
import { TypeHintService } from './services/typeHintService';
import { WekaService } from './services/wekaService';
import { DataViewService } from './services/dataViewService';
import { RandomizationService } from './services/randomizationService';
import * as path from 'path';
import { NeuralNetworkService } from './services/neuralNetworkService';

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Extensión WEKA ARFF activada');

        // Configuración del lenguaje
        const languageConfig: vscode.LanguageConfiguration = {
            comments: {
                lineComment: '%',
            },
            brackets: [['{', '}'], ['[', ']'], ['(', ')']],
            wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?s]+)/g
        };

        vscode.languages.setLanguageConfiguration('arff', languageConfig);

        // Inicializar servicios
        const configService = new ConfigurationService(context);
        const typeHintService = new TypeHintService(context);
        const recommendationService = RecommendationService.getInstance();
        const wekaService = new WekaService(context, configService);
        const dataViewService = new DataViewService(context);
        const randomizationService = new RandomizationService();
        const neuralNetworkService = new NeuralNetworkService(wekaService);

        // Registrar comandos
        context.subscriptions.push(
            // Comando de vista previa
            vscode.commands.registerCommand('weka-arff.preview', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document.languageId === 'arff') {
                    dataViewService.showDataPreview(editor.document).catch((error: Error) => {
                        console.error('Error en vista previa:', error);
                        vscode.window.showErrorMessage('Error al mostrar vista previa');
                    });
                }
            }),

            // Comando de análisis
            vscode.commands.registerCommand('weka-arff.analyze', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document.languageId === 'arff') {
                    recommendationService.analyzeDataset(editor.document).catch((error: Error) => {
                        console.error('Error al analizar dataset:', error);
                        vscode.window.showErrorMessage('Error al analizar el dataset');
                    });
                }
            }),

            // Comando para abrir en WEKA
            vscode.commands.registerCommand('weka-arff.openInWeka', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document.languageId === 'arff') {
                    wekaService.executeWekaCommand(`weka.gui.GUIChooser "${editor.document.uri.fsPath}"`)
                        .catch((err: Error) => {
                            console.error('Error al abrir en WEKA:', err);
                        });
                }
            }),

            // Comando para ejecutar algoritmo
            vscode.commands.registerCommand('weka-arff.runAlgorithm', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document.languageId === 'arff') {
                    wekaService.showAlgorithmSelector(editor.document)
                        .catch((err: Error) => {
                            console.error('Error al ejecutar algoritmo:', err);
                            vscode.window.showErrorMessage('Error al ejecutar algoritmo WEKA');
                        });
                }
            }),

            // Comando para aleatorizar dataset
            vscode.commands.registerCommand('weka-arff.randomize', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document) {
                    const ext = path.extname(editor.document.fileName).toLowerCase();
                    if (ext === '.arff' || ext === '.data') {
                        randomizationService.randomizeFile(editor.document).catch(err => {
                            console.error('Error al aleatorizar dataset:', err);
                            vscode.window.showErrorMessage('Error al aleatorizar el dataset');
                        });
                    } else {
                        vscode.window.showWarningMessage('Este comando solo funciona con archivos .arff o .data');
                    }
                }
            }),

            // Comando para Red Neuronal
            vscode.commands.registerCommand('weka-arff.neuralNetwork', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor?.document.languageId === 'arff') {
                    neuralNetworkService.showNNInterface(editor.document).catch(err => {
                        console.error('Error en red neuronal:', err);
                        vscode.window.showErrorMessage('Error al ejecutar red neuronal');
                    });
                }
            }),

            // Otros comandos y suscripciones
            vscode.window.onDidChangeActiveColorTheme(async () => {
                await configService.updateSyntaxColors().catch(err => {
                    console.error('Error al actualizar colores:', err);
                });
            }),
            typeHintService
        );

        // Activar colorización
        activateColorization(context);

        // Configuración inicial
        configService.updateSyntaxColors().catch((error: Error) => {
            console.error('Error en configuración inicial:', error);
        });

        // Registrar disposables para limpieza
        context.subscriptions.push(
            recommendationService,
            typeHintService,
            wekaService,
            dataViewService
        );

        return {
            configService,
            typeHintService,
            recommendationService
        };
    } catch (error) {
        console.error('Error al activar la extensión:', error);
        vscode.window.showErrorMessage('Error al activar la extensión WEKA ARFF');
        throw error;
    }
}

export function deactivate() {
    try {
        console.log('Extensión WEKA ARFF desactivada');
    } catch (error) {
        console.error('Error al desactivar la extensión:', error);
    }
} 
