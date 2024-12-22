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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("./services/configurationService");
const recommendationService_1 = require("./services/recommendationService");
const arffTheme_1 = require("./themes/arffTheme");
const typeHintService_1 = require("./services/typeHintService");
const wekaService_1 = require("./services/wekaService");
const dataViewService_1 = require("./services/dataViewService");
const randomizationService_1 = require("./services/randomizationService");
const path = __importStar(require("path"));
const neuralNetworkService_1 = require("./services/neuralNetworkService");
function activate(context) {
    try {
        console.log('Extensión WEKA ARFF activada');
        // Configuración del lenguaje
        const languageConfig = {
            comments: {
                lineComment: '%',
            },
            brackets: [['{', '}'], ['[', ']'], ['(', ')']],
            wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?s]+)/g
        };
        vscode.languages.setLanguageConfiguration('arff', languageConfig);
        // Inicializar servicios
        const configService = new configurationService_1.ConfigurationService(context);
        const typeHintService = new typeHintService_1.TypeHintService(context);
        const recommendationService = recommendationService_1.RecommendationService.getInstance();
        const wekaService = new wekaService_1.WekaService(context, configService);
        const dataViewService = new dataViewService_1.DataViewService(context);
        const randomizationService = new randomizationService_1.RandomizationService();
        const neuralNetworkService = new neuralNetworkService_1.NeuralNetworkService(wekaService);
        // Registrar comandos
        context.subscriptions.push(
        // Comando de vista previa
        vscode.commands.registerCommand('weka-arff.preview', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'arff') {
                dataViewService.showDataPreview(editor.document).catch((error) => {
                    console.error('Error en vista previa:', error);
                    vscode.window.showErrorMessage('Error al mostrar vista previa');
                });
            }
        }), 
        // Comando de análisis
        vscode.commands.registerCommand('weka-arff.analyze', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'arff') {
                recommendationService.analyzeDataset(editor.document).catch((error) => {
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
                    .catch((err) => {
                    console.error('Error al abrir en WEKA:', err);
                });
            }
        }), 
        // Comando para ejecutar algoritmo
        vscode.commands.registerCommand('weka-arff.runAlgorithm', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'arff') {
                wekaService.showAlgorithmSelector(editor.document)
                    .catch((err) => {
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
                }
                else {
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
        }), typeHintService);
        // Activar colorización
        (0, arffTheme_1.activateColorization)(context);
        // Configuración inicial
        configService.updateSyntaxColors().catch((error) => {
            console.error('Error en configuración inicial:', error);
        });
        // Registrar disposables para limpieza
        context.subscriptions.push(recommendationService, typeHintService, wekaService, dataViewService);
        return {
            configService,
            typeHintService,
            recommendationService
        };
    }
    catch (error) {
        console.error('Error al activar la extensión:', error);
        vscode.window.showErrorMessage('Error al activar la extensión WEKA ARFF');
        throw error;
    }
}
exports.activate = activate;
function deactivate() {
    try {
        console.log('Extensión WEKA ARFF desactivada');
    }
    catch (error) {
        console.error('Error al desactivar la extensión:', error);
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map