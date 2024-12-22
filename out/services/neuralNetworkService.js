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
exports.NeuralNetworkService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const neuralNetworkParserService_1 = require("./neuralNetworkParserService");
class NeuralNetworkService {
    constructor(wekaService) {
        this.isTraining = false;
        this.wekaService = wekaService;
        this.parserService = new neuralNetworkParserService_1.NeuralNetworkParserService();
    }
    async showNNInterface(document) {
        if (this.panel) {
            this.panel.reveal();
            return;
        }
        this.panel = vscode.window.createWebviewPanel('wekaNN', 'WEKA Neural Network', vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        this.panel.iconPath = {
            light: vscode.Uri.file(path.join(__dirname, '..', '..', 'resources', 'light', 'neural.svg')),
            dark: vscode.Uri.file(path.join(__dirname, '..', '..', 'resources', 'dark', 'neural.svg'))
        };
        this.panel.webview.html = this.getWebviewContent();
        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.isTraining = false;
        });
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'trainNN':
                    if (!this.isTraining) {
                        this.isTraining = true;
                        await this.trainNetwork(document, message.config);
                        this.isTraining = false;
                    }
                    break;
                case 'stopTraining':
                    this.isTraining = false;
                    break;
                case 'saveModel':
                    await this.saveModel(message.modelData);
                    break;
                case 'loadModel':
                    await this.loadModel();
                    break;
            }
        });
    }
    async trainNetwork(document, config) {
        try {
            // Construir comando WEKA
            const wekaCommand = this.buildWekaCommand(document.uri.fsPath, config);
            // Iniciar entrenamiento
            this.trainingProcess = await this.wekaService.executeWekaCommand(wekaCommand, {
                onProgress: (progress) => {
                    if (this.panel) {
                        // Parsear la salida de WEKA
                        const data = this.parserService.parseWekaOutput(progress);
                        this.panel.webview.postMessage({
                            type: 'trainingProgress',
                            data: {
                                epoch: data.epoch,
                                error: data.error,
                                accuracy: data.accuracy,
                                raw: progress
                            }
                        });
                    }
                },
                onComplete: (result) => {
                    if (this.panel) {
                        const metrics = this.parserService.parseMetrics(result);
                        this.panel.webview.postMessage({
                            type: 'trainingComplete',
                            data: metrics
                        });
                    }
                    this.isTraining = false;
                }
            });
        }
        catch (error) {
            console.error('Error en entrenamiento:', error);
            vscode.window.showErrorMessage('Error al entrenar la red neuronal');
            this.isTraining = false;
        }
    }
    buildWekaCommand(filePath, config) {
        return [
            'weka.classifiers.functions.MultilayerPerceptron',
            '-L', config.learningRate.toString(),
            '-M', config.momentum.toString(),
            '-N', config.trainingTime.toString(),
            '-V', config.validationSetSize.toString(),
            '-S', config.seed.toString(),
            '-B', config.batchSize.toString(),
            config.decay ? '-D' : '',
            config.normalizeAttributes ? '-I' : '',
            config.normalizeNumericClass ? '-C' : '',
            config.reset ? '-R' : '',
            config.autoBuild ? '-A' : '',
            '-H', config.hiddenLayers,
            '-t', `"${filePath}"`,
            '-v',
            '-split-percentage', '80',
            '-o', `"${filePath}.model"`,
            '-no-cv' // No mostrar GUI de validación cruzada
        ].filter(Boolean).join(' ');
    }
    async saveModel(modelData) {
        const uri = await vscode.window.showSaveDialog({
            filters: { 'Modelo WEKA': ['model'] }
        });
        if (uri) {
            try {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(modelData)));
                vscode.window.showInformationMessage('Modelo guardado correctamente');
            }
            catch (error) {
                vscode.window.showErrorMessage('Error al guardar el modelo');
            }
        }
    }
    async loadModel() {
        const uri = await vscode.window.showOpenDialog({
            filters: { 'Modelo WEKA': ['model'] },
            canSelectMany: false
        });
        if (uri?.[0]) {
            try {
                const modelData = await vscode.workspace.fs.readFile(uri[0]);
                if (this.panel) {
                    this.panel.webview.postMessage({
                        type: 'loadModel',
                        data: JSON.parse(modelData.toString())
                    });
                }
            }
            catch (error) {
                vscode.window.showErrorMessage('Error al cargar el modelo');
            }
        }
    }
    getWebviewContent() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
                <style>
                    body {
                        padding: 15px;
                        font-family: var(--vscode-font-family);
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                    }
                    input, select {
                        width: 100%;
                        padding: 5px;
                        margin-bottom: 10px;
                    }
                    button {
                        padding: 8px 15px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        cursor: pointer;
                    }
                    .results {
                        margin-top: 20px;
                        padding: 10px;
                        border-left: 4px solid var(--vscode-textLink-activeForeground);
                    }
                    .progress {
                        margin-top: 10px;
                        display: none;
                    }
                    .chart-container {
                        height: 300px;
                        margin: 20px 0;
                    }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 10px;
                        margin: 20px 0;
                    }
                    .metric-card {
                        padding: 15px;
                        border-radius: 5px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                    }
                </style>
            </head>
            <body>
                <h2>Configuración de Red Neuronal</h2>
                <div class="form-group">
                    <label>Capas Ocultas (ej: "3,2" para dos capas)</label>
                    <input type="text" id="hiddenLayers" value="3" />
                </div>
                <div class="form-group">
                    <label>Tasa de Aprendizaje (0-1)</label>
                    <input type="number" id="learningRate" value="0.3" min="0" max="1" step="0.1" />
                </div>
                <div class="form-group">
                    <label>Momentum (0-1)</label>
                    <input type="number" id="momentum" value="0.2" min="0" max="1" step="0.1" />
                </div>
                <div class="form-group">
                    <label>Épocas de Entrenamiento</label>
                    <input type="number" id="trainingTime" value="500" min="1" />
                </div>
                <div class="form-group">
                    <label>Tamaño Set Validación (%)</label>
                    <input type="number" id="validationSize" value="20" min="0" max="100" />
                </div>
                <div class="form-group">
                    <label>Semilla Aleatoria</label>
                    <input type="number" id="seed" value="1" />
                </div>
                <div class="form-group">
                    <label>Tamaño de Lote</label>
                    <input type="number" id="batchSize" value="32" min="1" />
                </div>
                <div class="form-group">
                    <label>Decay</label>
                    <input type="checkbox" id="decay" checked />
                </div>
                <div class="form-group">
                    <label>Normalizar Atributos</label>
                    <input type="checkbox" id="normalizeAttributes" checked />
                </div>
                <div class="form-group">
                    <label>Normalizar Clase Numérica</label>
                    <input type="checkbox" id="normalizeNumericClass" checked />
                </div>
                <div class="form-group">
                    <label>Reset</label>
                    <input type="checkbox" id="reset" checked />
                </div>
                <div class="form-group">
                    <label>Auto Build</label>
                    <input type="checkbox" id="autoBuild" checked />
                </div>
                <button onclick="startTraining()">Entrenar Red</button>
                <div id="progress" class="progress">
                    Entrenando... <span id="progressText">0%</span>
                </div>
                <div id="results" class="results" style="display:none">
                    <h3>Resultados</h3>
                    <pre id="resultText"></pre>
                </div>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h3>Error de Entrenamiento</h3>
                        <div id="trainingError">-</div>
                    </div>
                    <div class="metric-card">
                        <h3>Precisión</h3>
                        <div id="accuracy">-</div>
                    </div>
                    <div class="metric-card">
                        <h3>Época Actual</h3>
                        <div id="currentEpoch">-</div>
                    </div>
                </div>

                <div class="chart-container">
                    <div id="errorChart"></div>
                </div>
                <div class="chart-container">
                    <div id="accuracyChart"></div>
                </div>

                <script>
                    let errorData = [];
                    let accuracyData = [];
                    let epochData = [];

                    function updateCharts(epoch, error, accuracy) {
                        epochData.push(epoch);
                        errorData.push(error);
                        accuracyData.push(accuracy);

                        Plotly.newPlot('errorChart', [{
                            x: epochData,
                            y: errorData,
                            type: 'scatter',
                            name: 'Error'
                        }], {
                            title: 'Error de Entrenamiento',
                            xaxis: { title: 'Época' },
                            yaxis: { title: 'Error' }
                        });

                        Plotly.newPlot('accuracyChart', [{
                            x: epochData,
                            y: accuracyData,
                            type: 'scatter',
                            name: 'Precisión'
                        }], {
                            title: 'Precisión',
                            xaxis: { title: 'Época' },
                            yaxis: { title: 'Precisión (%)' }
                        });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'trainingProgress':
                                const { epoch, error, accuracy } = message.data;
                                document.getElementById('currentEpoch').textContent = epoch;
                                document.getElementById('trainingError').textContent = error.toFixed(4);
                                document.getElementById('accuracy').textContent = accuracy.toFixed(2) + '%';
                                updateCharts(epoch, error, accuracy);
                                break;
                            case 'trainingComplete':
                                document.getElementById('progress').style.display = 'none';
                                document.getElementById('results').style.display = 'block';
                                document.getElementById('resultText').textContent = 
                                    JSON.stringify(message.data, null, 2);
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
exports.NeuralNetworkService = NeuralNetworkService;
//# sourceMappingURL=neuralNetworkService.js.map