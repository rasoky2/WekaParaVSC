import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfigurationService } from './configurationService';
import * as os from 'os';

import { StatisticsService } from './statisticsService';
import { WebviewService } from './webviewService';
import { IWekaMetrics, IDatasetStats, IAlgorithmRecommendation } from '../interfaces/weka.interface';
import { WekaAlgorithmsService } from './wekaAlgorithmsService';

const execAsync = promisify(exec);

export class WekaService implements vscode.Disposable {
    private readonly _context: vscode.ExtensionContext;
    private readonly _configService: ConfigurationService;
    private readonly _statisticsService: StatisticsService;
    private readonly _webviewService: WebviewService;
    private readonly _algorithmsService: WekaAlgorithmsService;
    private readonly _outputChannel: vscode.OutputChannel;
    private _disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext, configService: ConfigurationService) {
        this._context = context;
        this._configService = configService;
        this._statisticsService = new StatisticsService();
        this._webviewService = WebviewService.getInstance();
        this._algorithmsService = new WekaAlgorithmsService();
        this._outputChannel = vscode.window.createOutputChannel('WEKA Service');
        
        // Agregar el outputChannel a los disposables
        this._disposables.push(this._outputChannel);
    }

    public dispose(): void {
        this._outputChannel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }

    private async _findJavaInPath(): Promise<string | undefined> {
        const command = process.platform === 'win32' ? 'where java' : 'which java';
        try {
            const { stdout } = await execAsync(command);
            return stdout.trim();
        } catch {
            return undefined;
        }
    }

    private async _promptForJavaSelection(): Promise<string | undefined> {
        const selection = await vscode.window.showInformationMessage(
            'No se encontró Java. ¿Desea seleccionar manualmente el ejecutable de Java?',
            'Seleccionar Java',
            'Descargar Java'
        );

        if (selection === 'Seleccionar Java') {
            const result = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                filters: {
                    executableJava: process.platform === 'win32' ? ['exe'] : []
                },
                title: 'Seleccionar ejecutable de Java'
            });

            return result?.[0]?.fsPath;
        }

        if (selection === 'Descargar Java') {
            await vscode.env.openExternal(vscode.Uri.parse('https://adoptium.net/'));
            throw new Error('Por favor, instale Java y vuelva a intentarlo');
        }

        return undefined;
    }

    private async _getJavaPath(): Promise<string | undefined> {
        try {
            let javaPath = this._configService.getConfiguration().get<string>('javaPath');

            if (!javaPath) {
                const javaHome = process.env.JAVA_HOME;
                if (javaHome) {
                    const binPath = path.join(javaHome, 'bin', 'java');
                    javaPath = process.platform === 'win32' ? `${binPath}.exe` : binPath;
                }
            }

            if (!javaPath) {
                javaPath = await this._findJavaInPath();
            }

            if (!javaPath || !fs.existsSync(javaPath)) {
                javaPath = await this._promptForJavaSelection();
            }

            if (javaPath && fs.existsSync(javaPath)) {
                await this._configService.getConfiguration().update('javaPath', javaPath, true);
                return javaPath;
            }

            return undefined;
        } catch (error) {
            console.error('Error al obtener Java:', error);
            return undefined;
        }
    }

    private async _getWekaPath(): Promise<string | undefined> {
        try {
            const wekaPath = this._configService.getConfiguration().get<string>('wekaPath');
            if (wekaPath?.length && fs.existsSync(wekaPath)) {
                return wekaPath;
            }

            const result = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                filters: {
                    jarFiles: ['jar']
                },
                title: 'Seleccionar archivo JAR de WEKA'
            });

            const jarPath = result?.[0]?.fsPath;
            if (jarPath) {
                await this._configService.getConfiguration().update('wekaPath', jarPath, true);
                return jarPath;
            }

            return undefined;
        } catch (error) {
            console.error('Error al obtener WEKA:', error);
            return undefined;
        }
    }

    private _handleError(error: Error): void {
        const errorMessage = error.message;
        this._outputChannel.appendLine(`\nError: ${errorMessage}`);
        
        // Mostrar el error en un panel
        this._showResults('Error en WEKA', null, '', errorMessage);
        
        vscode.window.showErrorMessage(`Error: ${errorMessage}`);
    }

    public async executeWekaAlgorithm(document: vscode.TextDocument, algorithm: string, options: string[] = []): Promise<string> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Ejecutando WEKA',
            cancellable: false
        }, async (progress) => {
            try {
                const javaPath = await this._getJavaPath();
                const wekaPath = await this._getWekaPath();
                
                if (!javaPath || !wekaPath) {
                    throw new Error('No se pudo encontrar Java o WEKA');
                }

                progress.report({ 
                    increment: 25,
                    message: 'Preparando datos...'
                });

                const tmpFile = path.join(os.tmpdir(), `temp_${Date.now()}.arff`);
                await vscode.workspace.fs.writeFile(
                    vscode.Uri.file(tmpFile),
                    Buffer.from(document.getText())
                );

                progress.report({ 
                    increment: 25,
                    message: 'Iniciando algoritmo...'
                });

                const command = [
                    javaPath,
                    '-cp',
                    wekaPath,
                    algorithm,
                    '-t',
                    tmpFile,
                    ...options
                ].join(' ');

                progress.report({ 
                    increment: 25,
                    message: 'Procesando resultados...'
                });

                const { stdout } = await execAsync(command);
                
                fs.unlinkSync(tmpFile);

                progress.report({ 
                    increment: 25,
                    message: 'Completado'
                });
                
                return stdout;
            } catch (error) {
                this._handleError(error instanceof Error ? error : new Error(String(error)));
                return '';
            }
        });
    }

    public async showAlgorithmSelector(document: vscode.TextDocument): Promise<void> {
        const algorithm = await this._algorithmsService.showAlgorithmSelector('classification');
        if (algorithm) {
            await this._runAlgorithm(document, `${algorithm.command} ${algorithm.defaultParams}`);
        }
    }

    private async _runAlgorithm(document: vscode.TextDocument, algorithmCommand: string): Promise<void> {
        try {
            // Construir el comando con opciones específicas para ejecución sin GUI
            const command = [
                algorithmCommand,
                '-t', `"${document.uri.fsPath}"`,  // Archivo de entrenamiento
                '-v',                              // Mostrar estadísticas detalladas
                '-split-percentage', '80',         // 80% entrenamiento, 20% prueba
                '-preserve-order',                 // Mantener orden de instancias
                '-d', `"${document.uri.fsPath}.model"`, // Guardar modelo (con opción -d)
                '-no-cv',                         // No usar validación cruzada
                '-classifications', '"weka.classifiers.evaluation.output.prediction.PlainText"' // Formato de salida
            ].join(' ');
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Ejecutando algoritmo...',
                cancellable: true
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Iniciando...' });
                
                const result = await this.executeWekaCommand(command, {
                    onProgress: (p) => {
                        progress.report({ 
                            increment: p, 
                            message: `Procesando... ${p}%` 
                        });
                    },
                    onComplete: (output) => {
                        const metrics = this._statisticsService.parseWekaOutput(output);
                        this._showResults('Resultados WEKA', metrics, output);
                    }
                });

                return result;
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error al ejecutar el algoritmo: ${error}`);
        }
    }

    private _getKappaInterpretation(kappa: number): string {
        if (kappa > 0.8) {
            return '✅ Concordancia casi perfecta';
        } else if (kappa > 0.6) {
            return '✅ Concordancia sustancial';
        } else if (kappa > 0.4) {
            return '⚠️ Concordancia moderada';
        } else {
            return '❌ Concordancia débil';
        }
    }

    private _getAccuracyInterpretation(accuracy: number): string {
        if (accuracy > 80) {
            return '✅ Excelente';
        } else if (accuracy > 60) {
            return '⚠️ Aceptable';
        } else {
            return '❌ Necesita mejora';
        }
    }

    private _getTimeInterpretation(timeElapsed: number): string {
        if (timeElapsed < 1) {
            return '✅ Muy rápido';
        } else if (timeElapsed < 5) {
            return '✅ Rápido';
        } else if (timeElapsed < 30) {
            return '⚠️ Moderado';
        } else {
            return '❌ Lento';
        }
    }

    private _getDatasetSizeInterpretation(totalInstances: number): string {
        if (totalInstances > 1000) {
            return '✅ Dataset grande';
        } else if (totalInstances > 100) {
            return '✅ Dataset mediano';
        } else {
            return '⚠️ Dataset pequeño';
        }
    }

    private _generateSummarySection(metrics: IWekaMetrics): string {
        return `
            <div class="section">
                <div class="section-title">Métricas Principales</div>
                <div class="metric-card">
                    <div class="metric-title">Precisión Global</div>
                    <div class="metric-value">${metrics.accuracy.toFixed(2)}%</div>
                    <div class="metric-description">
                        Porcentaje de instancias correctamente clasificadas del total.
                        ${this._getAccuracyInterpretation(metrics.accuracy)}
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Estadístico Kappa</div>
                    <div class="metric-value">${metrics.kappa.toFixed(4)}</div>
                    <div class="metric-description">
                        Mide la concordancia entre las predicciones y los valores reales, corrigiendo el azar.
                        ${this._getKappaInterpretation(metrics.kappa)}
                    </div>
                </div>
                ${metrics.modelInfo ? `
                    <div class="metric-card">
                        <div class="metric-title">Información del Modelo</div>
                        <div class="metric-description">
                            ${metrics.modelInfo.modelType ? `<strong>Tipo:</strong> ${metrics.modelInfo.modelType}<br>` : ''}
                            ${metrics.modelInfo.numberOfLeaves ? `<strong>Número de Hojas:</strong> ${metrics.modelInfo.numberOfLeaves}<br>` : ''}
                            ${metrics.modelInfo.sizeOfTree ? `<strong>Tamaño del Árbol:</strong> ${metrics.modelInfo.sizeOfTree}<br>` : ''}
                            ${metrics.modelInfo.numberOfRules ? `<strong>Número de Reglas:</strong> ${metrics.modelInfo.numberOfRules}<br>` : ''}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private _generateConfusionMatrixSection(metrics: IWekaMetrics): string {
        if (!metrics.confusionMatrix || !metrics.confusionMatrix.length) {
            return '';
        }

        return `
            <div class="section">
                <div class="section-title">Matriz de Confusión</div>
                <div class="confusion-matrix">
                    <table>
                        <thead>
                            <tr>
                                <th colspan="2" rowspan="2"></th>
                                <th colspan="${metrics.confusionMatrix[0].length}">Predicción</th>
                            </tr>
                            <tr>
                                ${metrics.classDetails ? 
                                    metrics.classDetails.map(detail => 
                                        `<th>${detail.className}</th>`
                                    ).join('') :
                                    metrics.confusionMatrix[0].map((_, i) => 
                                        `<th>Clase ${i + 1}</th>`
                                    ).join('')
                                }
                            </tr>
                        </thead>
                        <tbody>
                            ${metrics.confusionMatrix.map((row, i) => `
                                <tr>
                                    ${i === 0 ? '<th rowspan="' + metrics.confusionMatrix!.length + '">Real</th>' : ''}
                                    <th>${metrics.classDetails ? metrics.classDetails[i].className : 'Clase ' + (i + 1)}</th>
                                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    private _generateDetailsSection(metrics: IWekaMetrics): string {
        return `
            <div class="section">
                <div class="section-title">Métricas Detalladas por Clase</div>
                ${metrics.classDetails ? `
                    <div class="class-details">
                        <table class="metric-table">
                            <thead>
                                <tr>
                                    <th>Clase</th>
                                    <th>TP Rate</th>
                                    <th>FP Rate</th>
                                    <th>Precisión</th>
                                    <th>Recall</th>
                                    <th>F-Measure</th>
                                    <th>MCC</th>
                                    <th>ROC Area</th>
                                    <th>PRC Area</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${metrics.classDetails.map(detail => `
                                    <tr>
                                        <td>${detail.className}</td>
                                        <td>${detail.truePositiveRate.toFixed(3)}</td>
                                        <td>${detail.falsePositiveRate.toFixed(3)}</td>
                                        <td>${detail.precision.toFixed(3)}</td>
                                        <td>${detail.recall.toFixed(3)}</td>
                                        <td>${detail.fMeasure.toFixed(3)}</td>
                                        <td>${detail.mcc.toFixed(3)}</td>
                                        <td>${detail.rocArea.toFixed(3)}</td>
                                        <td>${detail.prcArea.toFixed(3)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>

            <div class="section">
                <div class="section-title">Métricas de Error</div>
                <div class="metric-card">
                    <div class="metric-title">Error Medio Absoluto (MAE)</div>
                    <div class="metric-value">${metrics.meanAbsoluteError.toFixed(4)}</div>
                    <div class="metric-description">
                        Promedio de la magnitud de los errores en las predicciones.
                        Útil para entender el error típico del modelo.
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Error Cuadrático Medio (RMSE)</div>
                    <div class="metric-value">${metrics.rootMeanSquaredError.toFixed(4)}</div>
                    <div class="metric-description">
                        Raíz cuadrada del promedio de los errores al cuadrado.
                        Penaliza más los errores grandes que el MAE.
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Error Relativo Absoluto</div>
                    <div class="metric-value">${metrics.relativeAbsoluteError.toFixed(2)}%</div>
                    <div class="metric-description">
                        Error absoluto normalizado respecto a lo que sería el error de un predictor simple.
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Error Relativo Cuadrático</div>
                    <div class="metric-value">${metrics.rootRelativeSquaredError.toFixed(4)}%</div>
                    <div class="metric-description">
                        Error cuadrático normalizado respecto a lo que sería el error de un predictor simple.
                    </div>
                </div>
            </div>

            ${this._generateConfusionMatrixSection(metrics)}

            <div class="section">
                <div class="section-title">Información del Modelo</div>
                ${metrics.modelInfo?.modelDescription ? `
                    <div class="model-description">
                        <pre class="code-block">${metrics.modelInfo.modelDescription}</pre>
                    </div>
                ` : ''}
                <div class="metric-card">
                    <div class="metric-title">Tiempo de Construcción</div>
                    <div class="metric-value">${metrics.timeElapsed.toFixed(2)} segundos</div>
                    <div class="metric-description">
                        Tiempo necesario para entrenar el modelo.
                        ${this._getTimeInterpretation(metrics.timeElapsed)}
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-title">Instancias Totales</div>
                    <div class="metric-value">${metrics.totalInstances}</div>
                    <div class="metric-description">
                        Número total de instancias utilizadas en la evaluación.
                        ${this._getDatasetSizeInterpretation(metrics.totalInstances)}
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Interpretación General</div>
                <div class="metric-description">
                    ${this._generateModelInterpretation(metrics)}
                </div>
            </div>
        `;
    }

    private _generateModelInterpretation(metrics: IWekaMetrics): string {
        const interpretations: string[] = [];

        // Interpretación de la precisión global
        if (metrics.accuracy > 90) {
            interpretations.push('El modelo muestra una excelente precisión global, clasificando correctamente más del 90% de las instancias.');
        } else if (metrics.accuracy > 80) {
            interpretations.push('El modelo tiene una buena precisión global, con más del 80% de clasificaciones correctas.');
        } else if (metrics.accuracy > 60) {
            interpretations.push('La precisión global del modelo es moderada, sugiriendo que podría beneficiarse de ajustes adicionales.');
        } else {
            interpretations.push('La precisión global del modelo es baja, indicando que podría necesitar una revisión significativa.');
        }

        // Interpretación del estadístico Kappa
        if (metrics.kappa > 0.8) {
            interpretations.push('El estadístico Kappa indica una concordancia casi perfecta entre las predicciones y los valores reales.');
        } else if (metrics.kappa > 0.6) {
            interpretations.push('El estadístico Kappa muestra una concordancia sustancial en las predicciones.');
        } else if (metrics.kappa > 0.4) {
            interpretations.push('El estadístico Kappa indica una concordancia moderada.');
        } else {
            interpretations.push('El bajo valor del estadístico Kappa sugiere una concordancia débil.');
        }

        // Interpretación de los errores
        if (metrics.rootMeanSquaredError < 0.2) {
            interpretations.push('Los errores de predicción son bajos, indicando predicciones consistentes y precisas.');
        } else if (metrics.rootMeanSquaredError < 0.4) {
            interpretations.push('Los errores de predicción están en un rango moderado.');
        } else {
            interpretations.push('Los errores de predicción son significativos, sugiriendo variabilidad en las predicciones.');
        }

        // Interpretación del tiempo de construcción
        if (metrics.timeElapsed < 1) {
            interpretations.push('El modelo se construyó muy rápidamente, lo que es excelente para aplicaciones en tiempo real.');
        } else if (metrics.timeElapsed < 5) {
            interpretations.push('El tiempo de construcción del modelo es razonable.');
        } else {
            interpretations.push('El modelo requirió un tiempo considerable para su construcción, lo que podría ser un factor a considerar en aplicaciones con restricciones de tiempo.');
        }

        // Interpretación del tamaño del conjunto de datos
        if (metrics.totalInstances > 1000) {
            interpretations.push('El modelo fue evaluado con un conjunto de datos grande, lo que aumenta la confiabilidad de las métricas.');
        } else if (metrics.totalInstances > 100) {
            interpretations.push('El tamaño del conjunto de datos es moderado, proporcionando una evaluación razonable del modelo.');
        } else {
            interpretations.push('El conjunto de datos es relativamente pequeño, las métricas podrían no ser completamente representativas del rendimiento real.');
        }

        // Interpretación específica del tipo de modelo si está disponible
        if (metrics.modelInfo?.modelType) {
            const modelType = metrics.modelInfo.modelType.toLowerCase();
            if (modelType.includes('tree')) {
                interpretations.push(`El árbol de decisión ${metrics.modelInfo.numberOfLeaves ? `tiene ${metrics.modelInfo.numberOfLeaves} hojas y ` : ''}${metrics.modelInfo.sizeOfTree ? `un tamaño de ${metrics.modelInfo.sizeOfTree}` : ''}, lo que indica su complejidad estructural.`);
            } else if (modelType.includes('rules')) {
                interpretations.push(`El modelo basado en reglas ${metrics.modelInfo.numberOfRules ? `utiliza ${metrics.modelInfo.numberOfRules} reglas` : 'genera un conjunto de reglas'} para realizar sus predicciones.`);
            }
        }

        // Interpretación de métricas por clase si están disponibles
        if (metrics.classDetails && metrics.classDetails.length > 0) {
            const bestClass = metrics.classDetails.reduce((prev, current) => 
                current.fMeasure > prev.fMeasure ? current : prev
            );
            const worstClass = metrics.classDetails.reduce((prev, current) => 
                current.fMeasure < prev.fMeasure ? current : prev
            );

            interpretations.push(`El modelo muestra el mejor rendimiento para la clase "${bestClass.className}" (F-measure: ${bestClass.fMeasure.toFixed(3)}) y el rendimiento más bajo para la clase "${worstClass.className}" (F-measure: ${worstClass.fMeasure.toFixed(3)}).`);
        }

        return interpretations.join(' ');
    }

    public async executeWekaCommand(command: string, options: {
        onProgress?: (progress: number) => void;
        onComplete?: (output: string) => void;
    } = {}): Promise<string> {
        try {
            const javaPath = await this._getJavaPath();
            const wekaPath = await this._getWekaPath();

            if (!javaPath || !wekaPath) {
                throw new Error('No se pudo encontrar Java o WEKA');
            }

            // Mejorado el comando Java con opciones optimizadas
            const javaCommand = [
                `"${javaPath}"`,
                '--add-opens java.base/java.lang=ALL-UNNAMED', // Para compatibilidad con Java 9+
                '-Xmx2048m',                                   // Memoria máxima para JVM
                '-XX:+UseG1GC',                               // Usar G1 Garbage Collector
                '-cp',
                `"${wekaPath}"`,
                command
            ].join(' ');
            
            this._outputChannel.appendLine('Ejecutando comando:');
            this._outputChannel.appendLine(javaCommand);

            const { stdout, stderr } = await execAsync(javaCommand);
            
            // Guardar la salida completa en el canal de salida
            this._outputChannel.appendLine('\nSalida de WEKA:');
            this._outputChannel.appendLine(stdout);

            if (stderr) {
                this._outputChannel.appendLine('\nErrores de WEKA:');
                this._outputChannel.appendLine(stderr);
                if (stderr.includes('Weka exception')) {
                    throw new Error(stderr);
                }
            }

            // Mostrar resultados en un panel
            this._showResults('Salida de WEKA', null, stdout, stderr);

            if (options.onComplete) {
                options.onComplete(stdout);
            }

            return stdout;
        } catch (error: any) {
            this._handleError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    private _formatWekaOutput(output: string): string {
        // Escapar caracteres HTML usando WebviewService
        output = WebviewService.escapeHtml(output);

        // Resaltar secciones importantes
        const sections = [
            '=== Run information ===',
            '=== Classifier model ===',
            '=== Summary ===',
            '=== Detailed Accuracy By Class ===',
            '=== Confusion Matrix ===',
            'Time taken to build model',
            'Time taken to test model on training data'
        ];

        for (const section of sections) {
            output = output.replace(
                new RegExp(`(${section})`, 'g'),
                '<span class="highlight">$1</span>'
            );
        }

        // Resaltar números y porcentajes
        output = output.replace(
            /(\d+\.?\d*%?)/g,
            '<span style="color: var(--vscode-charts-blue)">$1</span>'
        );

        return output;
    }

    public async analyzeDataset(document: vscode.TextDocument): Promise<IDatasetStats> {
        try {
            const command = [
                'weka.core.Instances',
                '-i',
                `"${document.uri.fsPath}"`,
                '-o',
                'summary-stats'
            ].join(' ');

            const output = await this.executeWekaCommand(command);
            return this._statisticsService.parseDatasetStats(output);
        } catch (error) {
            this._handleError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    public async recommendAlgorithms(datasetStats: IDatasetStats): Promise<IAlgorithmRecommendation[]> {
        const recommendations: IAlgorithmRecommendation[] = [];
        const algorithms = this._algorithmsService.getClassificationAlgorithms();
        
        // Recomendar algoritmos basados en las características del dataset
        for (const algorithm of algorithms) {
            let confidence = 0;
            let reason = '';
            let bestFor: string[] = [];
            let limitations: string[] = [];
            let isRecommended = false;

            switch (algorithm.id) {
                case 'j48':
                    if (datasetStats.numInstances > 100 && datasetStats.numInstances < 1000000) {
                        confidence = 0.8;
                        reason = 'Bueno para datasets medianos con atributos categóricos';
                        bestFor = ['clasificación', 'interpretabilidad'];
                        limitations = ['no maneja bien valores continuos'];
                        isRecommended = true;
                    }
                    break;
                case 'randomForest':
                    if (datasetStats.numInstances > 1000) {
                        confidence = 0.9;
                        reason = 'Excelente para datasets grandes con múltiples atributos';
                        bestFor = ['clasificación', 'regresión', 'robustez'];
                        limitations = ['tiempo de entrenamiento largo'];
                        isRecommended = true;
                    }
                    break;
                // Agregar más casos según sea necesario
            }

            if (isRecommended) {
                recommendations.push({
                    name: algorithm.name,
                    command: algorithm.command,
                    params: algorithm.defaultParams,
                    confidence,
                    reason,
                    bestFor,
                    limitations,
                    isRecommended
                });
            }
        }

        return recommendations;
    }

    public async crossValidate(document: vscode.TextDocument, algorithm: string, folds: number = 10): Promise<IWekaMetrics> {
        try {
            const command = [
                algorithm,
                '-t', `"${document.uri.fsPath}"`,  // Archivo de entrenamiento
                '-x', folds.toString(),            // Número de folds
                '-v',                              // Mostrar estadísticas detalladas
                '-d', `"${document.uri.fsPath}.model"`, // Guardar modelo
                '-preserve-order',                 // Mantener orden de instancias
                '-classifications', '"weka.classifiers.evaluation.output.prediction.CSV"'
            ].join(' ');

            const output = await this.executeWekaCommand(command);
            return this._statisticsService.parseWekaOutput(output);
        } catch (error: any) {
            this._handleError(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    public async showClusteringSelector(document: vscode.TextDocument): Promise<void> {
        const algorithm = await this._algorithmsService.showAlgorithmSelector('clustering');
        if (algorithm) {
            await this._runClusteringAlgorithm(document, `${algorithm.command} ${algorithm.defaultParams}`);
        }
    }

    private async _runClusteringAlgorithm(document: vscode.TextDocument, algorithmCommand: string): Promise<void> {
        try {
            const command = [
                algorithmCommand,
                '-t', `"${document.uri.fsPath}"`,  // Archivo de entrenamiento
                '-d', `"${document.uri.fsPath}.model"`, // Guardar modelo (con opción -d)
                '-p', '0',                         // No mostrar atributos de instancias
                '-preserve-order',                 // Mantener orden de instancias
                '-v'                              // Mostrar estadísticas detalladas
            ].join(' ');
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Ejecutando clustering...',
                cancellable: true
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Iniciando...' });
                
                const result = await this.executeWekaCommand(command, {
                    onProgress: (p) => {
                        progress.report({ 
                            increment: p, 
                            message: `Procesando... ${p}%` 
                        });
                    },
                    onComplete: (output) => {
                        this._showClusteringResults(output);
                    }
                });

                return result;
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error al ejecutar el clustering: ${error}`);
        }
    }

    private _showClusteringResults(output: string): void {
        this._showResults('Resultados del Clustering', null, output);
    }

    private async _showResults(title: string, metrics: IWekaMetrics | null, stdout: string, stderr?: string): Promise<void> {
        // Leer el template HTML
        const templatePath = path.join(this._context.extensionPath, 'src', 'templates', 'wekaResults.html');
        let template = await fs.promises.readFile(templatePath, 'utf8');

        // Reemplazar las variables en el template
        const replacements = {
            title,
            timestamp: new Date().toLocaleString(),
            metrics: metrics ? 'true' : '',
            summarySection: metrics ? this._generateSummarySection(metrics) : '',
            detailsSection: metrics ? this._generateDetailsSection(metrics) : '',
            stdout: this._formatWekaOutput(stdout),
            stderr: stderr ?? ''
        };

        // Realizar las sustituciones
        for (const [key, value] of Object.entries(replacements)) {
            template = template.replace(new RegExp(`\\\${${key}}`, 'g'), value);
        }

        // Mostrar el webview
        this._webviewService.createOrShowWebview(
            'wekaResults',
            title,
            template
        );
    }
}