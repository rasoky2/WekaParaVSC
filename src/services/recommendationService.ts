import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface ArffAttribute {
    name: string;
    type: string;
    isNominal: boolean;
    isNumeric: boolean;
    isDate: boolean;
    isString: boolean;
    possibleValues?: string[];
}

interface ArffAnalysis {
    relationName: string;
    attributes: ArffAttribute[];
    classAttribute?: ArffAttribute;
    dataQuality: {
        missingValuesPercentage: number;
        numericAttributesPercentage: number;
        nominalAttributesPercentage: number;
        classDistribution?: { [key: string]: number };
        outlierScore?: number;
    };
}

interface DatasetCharacteristics {
    numInstances: number;
    numAttributes: number;
    numClasses: number;
    hasNominalAttributes: boolean;
    hasNumericAttributes: boolean;
    hasMissingValues: boolean;
    isBalanced: boolean;
    classType: 'nominal' | 'numeric' | 'unknown';
    hasOutliers?: boolean;
    dataQuality?: 'low' | 'medium' | 'high';
    dimensionality?: 'low' | 'medium' | 'high';
    targetVariable?: {
        type: 'nominal' | 'numeric';
        uniqueValues?: number;
        distribution?: { [key: string]: number };
    };
    attributeTypes: ArffAttribute[];
    classAttributeInfo?: {
        name: string;
        type: string;
        uniqueValues: number;
        distribution: { [key: string]: number };
        entropy?: number;
    };
    dataQualityMetrics: {
        missingValuesPercentage: number;
        outlierScore: number;
        attributeCorrelations?: number[][];
        classImbalanceRatio?: number;
    };
}

interface AlgorithmRecommendation {
    name: string;
    command: string;
    confidence: number;
    reason: string;
    pros: string[];
    cons: string[];
    bestFor: string[];
}

export class RecommendationService implements vscode.Disposable {
    private static instance: RecommendationService;
    private readonly panels: Map<string, vscode.WebviewPanel>;
    private currentDocument?: vscode.TextDocument;
    private disposables: vscode.Disposable[] = [];
    private isDisposed: boolean = false;

    private constructor() {
        this.panels = new Map();
        this.setupEventListeners();
    }

    public static getInstance(): RecommendationService {
        if (!RecommendationService.instance) {
            RecommendationService.instance = new RecommendationService();
        }
        return RecommendationService.instance;
    }

    private setupEventListeners() {
        // Limpiar recursos cuando se cierra un editor
        this.disposables.push(
            vscode.workspace.onDidCloseTextDocument(doc => {
                this.cleanupResources(doc);
            })
        );

        // Actualizar documento actual
        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.currentDocument = editor.document;
                }
            })
        );
    }

    private cleanupResources(document: vscode.TextDocument) {
        if (this.isDisposed) return;

        const panelKey = document.uri.toString();
        const panel = this.panels.get(panelKey);
        if (panel) {
            panel.dispose();
            this.panels.delete(panelKey);
        }
    }

    public dispose() {
        if (this.isDisposed) return;

        this.isDisposed = true;
        this.panels.forEach(panel => panel.dispose());
        this.panels.clear();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.currentDocument = undefined;
    }

    public async analyzeDataset(document: vscode.TextDocument): Promise<void> {
        try {
            // Limpiar análisis previo si existe
            this.cleanupResources(document);

            const characteristics = await this.analyzeDatasetCharacteristics(document);
            const recommendations = this.getRecommendations(characteristics);
            await this.showRecommendations(document, recommendations, characteristics);
        } catch (error) {
            console.error('Error al analizar dataset:', error);
            vscode.window.showErrorMessage('Error al analizar el dataset');
        }
    }

    private async showRecommendations(
        document: vscode.TextDocument,
        recommendations: AlgorithmRecommendation[],
        characteristics: DatasetCharacteristics
    ): Promise<void> {
        const panelKey = document.uri.toString();
        let panel = this.panels.get(panelKey);

        if (panel) {
            panel.reveal();
        } else {
            panel = vscode.window.createWebviewPanel(
                'wekaRecommendations',
                'Recomendaciones de Algoritmos',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    enableFindWidget: true
                }
            );

            panel.onDidDispose(() => {
                this.panels.delete(panelKey);
            });

            this.panels.set(panelKey, panel);
        }

        panel.webview.html = await this.generateRecommendationsHTML(recommendations, characteristics);
    }

    private async analyzeArffStructure(text: string): Promise<ArffAnalysis> {
        const lines = text.split('\n');
        const analysis: ArffAnalysis = {
            relationName: '',
            attributes: [],
            dataQuality: {
                missingValuesPercentage: 0,
                numericAttributesPercentage: 0,
                nominalAttributesPercentage: 0
            }
        };

        let inDataSection = false;
        let totalMissingValues = 0;
        let totalValues = 0;
        const classDistribution: { [key: string]: number } = {};

        for (const line of lines) {
            const trimmedLine = line.trim().toLowerCase();
            
            if (trimmedLine.startsWith('@relation')) {
                analysis.relationName = this.extractRelationName(line);
            } 
            else if (trimmedLine.startsWith('@attribute')) {
                const attribute = this.parseAttribute(line);
                analysis.attributes.push(attribute);
                
                // Asumimos que el último atributo es la clase
                analysis.classAttribute = attribute;
            }
            else if (trimmedLine === '@data') {
                inDataSection = true;
            }
            else if (inDataSection && trimmedLine && !trimmedLine.startsWith('%')) {
                const values = line.split(',');
                totalValues += values.length;
                
                // Contar valores faltantes
                values.forEach(value => {
                    if (value.trim() === '?' || value.trim() === '') {
                        totalMissingValues++;
                    }
                });

                // Actualizar distribución de clases
                if (values.length > 0 && analysis.classAttribute) {
                    const classValue = values[values.length - 1].trim();
                    classDistribution[classValue] = (classDistribution[classValue] || 0) + 1;
                }
            }
        }

        // Calcular métricas de calidad
        analysis.dataQuality = {
            missingValuesPercentage: (totalMissingValues / totalValues) * 100,
            numericAttributesPercentage: (analysis.attributes.filter(a => a.isNumeric).length / analysis.attributes.length) * 100,
            nominalAttributesPercentage: (analysis.attributes.filter(a => a.isNominal).length / analysis.attributes.length) * 100,
            classDistribution: classDistribution,
            outlierScore: await this.calculateOutlierScore(analysis.attributes, lines)
        };

        return analysis;
    }

    private parseAttribute(line: string): ArffAttribute {
        const match = RegExp(/@attribute\s+['"]?([^'"]+)['"]?\s+(.*)/i).exec(line);
        if (!match) {
            throw new Error('Invalid attribute format');
        }

        const [, name, type] = match;
        const cleanType = type.trim().toLowerCase();
        
        const attribute: ArffAttribute = {
            name: name.trim(),
            type: cleanType,
            isNominal: false,
            isNumeric: false,
            isDate: false,
            isString: false
        };

        if (cleanType === 'numeric' || cleanType === 'real' || cleanType === 'integer') {
            attribute.isNumeric = true;
        } else if (cleanType === 'string') {
            attribute.isString = true;
        } else if (cleanType.startsWith('date')) {
            attribute.isDate = true;
        } else if (cleanType.startsWith('{')) {
            attribute.isNominal = true;
            attribute.possibleValues = this.extractNominalValues(cleanType);
        }

        return attribute;
    }

    private extractNominalValues(type: string): string[] {
        const valuesMatch = RegExp(/{([^}]+)}/).exec(type);
        if (!valuesMatch) return [];
        return valuesMatch[1].split(',').map(v => v.trim());
    }

    private extractRelationName(line: string): string {
        const match = RegExp(/@relation\s+['"]?([^'"]+)['"]?/i).exec(line);
        return match ? match[1].trim() : '';
    }

    private async calculateOutlierScore(attributes: ArffAttribute[], lines: string[]): Promise<number> {
        let outlierScore = 0;
        const numericColumns = attributes
            .map((attr, index) => ({ index, attr }))
            .filter(({ attr }) => attr.isNumeric);

        if (numericColumns.length === 0) return 0;

        const values: number[][] = [];
        let dataStartIndex = lines.findIndex(line => line.trim().toLowerCase() === '@data') + 1;

        // Recolectar valores numéricos
        for (let i = dataStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('%')) {
                const rowValues = line.split(',');
                const numericValues = numericColumns.map(({ index }) => {
                    const value = parseFloat(rowValues[index]);
                    return isNaN(value) ? null : value;
                });
                if (numericValues.some(v => v !== null)) {
                    values.push(numericValues as number[]);
                }
            }
        }

        // Calcular score de outliers usando IQR
        numericColumns.forEach((_, colIndex) => {
            const colValues = values.map(row => row[colIndex]).filter(v => v !== null);
            if (colValues.length > 0) {
                const { q1, q3 } = this.calculateQuartiles(colValues);
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;
                
                const outliers = colValues.filter(v => v < lowerBound || v > upperBound);
                outlierScore += outliers.length / colValues.length;
            }
        });

        return outlierScore / numericColumns.length;
    }

    private calculateQuartiles(values: number[]): { q1: number; q3: number } {
        const sorted = values.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        const q1 = sorted[Math.floor(mid / 2)];
        const q3 = sorted[Math.floor(mid + mid / 2)];
        
        return { q1, q3 };
    }

    private async analyzeDatasetCharacteristics(document: vscode.TextDocument): Promise<DatasetCharacteristics> {
        const text = document.getText();
        const arffAnalysis = await this.analyzeArffStructure(text);
        
        const characteristics: DatasetCharacteristics = {
            numInstances: 0,
            numAttributes: arffAnalysis.attributes.length,
            numClasses: arffAnalysis.classAttribute?.isNominal ? 
                       (arffAnalysis.classAttribute.possibleValues?.length ?? 0) : 0,
            hasNominalAttributes: arffAnalysis.attributes.some(a => a.isNominal),
            hasNumericAttributes: arffAnalysis.attributes.some(a => a.isNumeric),
            hasMissingValues: arffAnalysis.dataQuality.missingValuesPercentage > 0,
            isBalanced: this.checkClassBalance(arffAnalysis.dataQuality.classDistribution),
            classType: this.determineClassType(arffAnalysis.classAttribute),
            attributeTypes: arffAnalysis.attributes,
            dataQualityMetrics: {
                missingValuesPercentage: arffAnalysis.dataQuality.missingValuesPercentage,
                outlierScore: arffAnalysis.dataQuality.outlierScore ?? 0,
                classImbalanceRatio: this.calculateImbalanceRatio(arffAnalysis.dataQuality.classDistribution)
            }
        };

        // Determinar calidad general de los datos
        characteristics.dataQuality = this.determineDataQuality(characteristics);

        return characteristics;
    }

    private checkClassBalance(distribution?: { [key: string]: number }): boolean {
        if (!distribution) return true;
        const values = Object.values(distribution);
        if (values.length < 2) return true;
        
        const max = Math.max(...values);
        const min = Math.min(...values);
        return max / min < 1.5; // Umbral de desbalance
    }

    private calculateImbalanceRatio(distribution?: { [key: string]: number }): number {
        if (!distribution) return 1;
        const values = Object.values(distribution);
        if (values.length < 2) return 1;
        
        const max = Math.max(...values);
        const min = Math.min(...values);
        return max / min;
    }

    private determineClassType(classAttr?: ArffAttribute): 'nominal' | 'numeric' | 'unknown' {
        if (!classAttr) return 'unknown';
        if (classAttr.isNominal) return 'nominal';
        if (classAttr.isNumeric) return 'numeric';
        return 'unknown';
    }

    private determineDataQuality(chars: DatasetCharacteristics): 'low' | 'medium' | 'high' {
        let score = 0;
        
        // Penalizar por valores faltantes
        if (chars.dataQualityMetrics.missingValuesPercentage < 5) score += 3;
        else if (chars.dataQualityMetrics.missingValuesPercentage < 15) score += 2;
        else if (chars.dataQualityMetrics.missingValuesPercentage < 30) score += 1;

        // Penalizar por outliers
        if (chars.dataQualityMetrics.outlierScore < 0.05) score += 3;
        else if (chars.dataQualityMetrics.outlierScore < 0.15) score += 2;
        else if (chars.dataQualityMetrics.outlierScore < 0.30) score += 1;

        // Penalizar por desbalance de clases
        if (chars.dataQualityMetrics.classImbalanceRatio) {
            if (chars.dataQualityMetrics.classImbalanceRatio < 1.5) score += 3;
            else if (chars.dataQualityMetrics.classImbalanceRatio < 3) score += 2;
            else if (chars.dataQualityMetrics.classImbalanceRatio < 5) score += 1;
        }

        // Determinar calidad basada en score total
        if (score >= 7) return 'high';
        if (score >= 4) return 'medium';
        return 'low';
    }

    private getRecommendations(characteristics: DatasetCharacteristics): AlgorithmRecommendation[] {
        const allAlgorithms: AlgorithmRecommendation[] = [];

        // 1. J48 (C4.5) - Árbol de decisión
        allAlgorithms.push({
            name: 'J48 (C4.5)',
            command: 'weka.classifiers.trees.J48',
            confidence: this.calculateConfidence(characteristics, {
                interpretability: 0.4,
                nominalAttributes: 0.3,
                balanced: 0.3
            }),
            reason: 'Árbol de decisión con poda para clasificación interpretable',
            pros: [
                'Alta interpretabilidad del modelo',
                'Maneja bien atributos nominales y numéricos',
                'Bueno para datasets pequeños y medianos',
                'Genera reglas de decisión claras'
            ],
            cons: [
                'Puede sufrir de sobreajuste',
                'Sensible a datos ruidosos',
                'No óptimo para datasets muy grandes'
            ],
            bestFor: [
                'Clasificación supervisada',
                'Cuando se necesita explicar el modelo',
                'Datasets balanceados'
            ]
        });

        // 2. RandomForest - Ensemble de árboles
        allAlgorithms.push({
                name: 'Random Forest',
                command: 'weka.classifiers.trees.RandomForest',
            confidence: this.calculateConfidence(characteristics, {
                largeDataset: 0.3,
                robustness: 0.4,
                accuracy: 0.3
            }),
            reason: 'Ensemble de árboles de decisión para alta precisión',
                pros: [
                'Excelente precisión general',
                'Robusto contra overfitting',
                    'Maneja bien valores faltantes',
                'Bueno para datasets grandes'
                ],
                cons: [
                'Menos interpretable que J48',
                'Mayor uso de memoria',
                'Tiempo de entrenamiento más largo'
                ],
                bestFor: [
                    'Datasets grandes',
                'Cuando la precisión es prioritaria',
                'Datos con ruido o valores faltantes'
            ]
        });

        // 3. SMO (SVM)
        allAlgorithms.push({
            name: 'SMO (Support Vector Machine)',
            command: 'weka.classifiers.functions.SMO',
            confidence: this.calculateConfidence(characteristics, {
                numericAttributes: 0.4,
                dataQuality: 0.3,
                balanced: 0.3
            }),
            reason: 'SVM optimizado para clasificación de alta precisión',
            pros: [
                'Excelente para clasificación binaria',
                'Robusto con datos de alta dimensionalidad',
                'Maneja bien datos no lineales'
            ],
            cons: [
                'Más lento en entrenamiento',
                'Requiere normalización de datos',
                'Menos interpretable'
            ],
            bestFor: [
                'Clasificación binaria',
                'Datasets con atributos numéricos',
                'Problemas no lineales'
            ]
        });

        // 4. Naive Bayes
        allAlgorithms.push({
                name: 'Naive Bayes',
                command: 'weka.classifiers.bayes.NaiveBayes',
            confidence: this.calculateConfidence(characteristics, {
                nominalAttributes: 0.4,
                speed: 0.3,
                simplicity: 0.3
            }),
            reason: 'Clasificador probabilístico rápido y simple',
                pros: [
                'Muy rápido en entrenamiento',
                'Bueno para datos textuales',
                'Maneja bien datos faltantes'
                ],
                cons: [
                    'Asume independencia entre atributos',
                'Rendimiento limitado en datos complejos',
                'No óptimo para atributos correlacionados'
                ],
                bestFor: [
                    'Clasificación de texto',
                'Análisis rápido',
                'Datasets pequeños'
            ]
        });

        // 5. MultilayerPerceptron (Red Neuronal)
        allAlgorithms.push({
            name: 'MultilayerPerceptron',
            command: 'weka.classifiers.functions.MultilayerPerceptron',
            confidence: this.calculateConfidence(characteristics, {
                numericAttributes: 0.4,
                complexity: 0.3,
                dataSize: 0.3
            }),
            reason: 'Red neuronal para problemas complejos',
                pros: [
                'Excelente para patrones complejos',
                'Bueno para datos numéricos',
                'Alta capacidad de aprendizaje'
                ],
                cons: [
                'Requiere mucho tiempo de entrenamiento',
                'Necesita normalización de datos',
                'Difícil de interpretar'
                ],
                bestFor: [
                'Problemas no lineales complejos',
                'Datasets grandes',
                'Cuando la interpretabilidad no es crucial'
            ]
        });

        // 6. PART (Reglas de decisión)
        allAlgorithms.push({
            name: 'PART',
            command: 'weka.classifiers.rules.PART',
            confidence: this.calculateConfidence(characteristics, {
                interpretability: 0.4,
                mixed_attributes: 0.3,
                medium_dataset: 0.3
            }),
            reason: 'Generador de reglas de decisión parciales',
                pros: [
                'Genera reglas comprensibles',
                'Bueno para atributos mixtos',
                'Balance entre precisión e interpretabilidad'
                ],
                cons: [
                'Más lento que J48',
                'Puede generar muchas reglas',
                'No óptimo para datasets muy grandes'
                ],
                bestFor: [
                'Cuando se necesitan reglas explícitas',
                'Datasets medianos',
                'Atributos mixtos'
            ]
        });

        // Calcular las mejores recomendaciones basadas en las características del dataset
        const bestRecommendations = this.selectBestAlgorithms(allAlgorithms, characteristics);
        
        // Devolver las 3 mejores recomendaciones ordenadas por confianza
        return bestRecommendations.slice(0, 3);
    }

    private selectBestAlgorithms(algorithms: AlgorithmRecommendation[], characteristics: DatasetCharacteristics): AlgorithmRecommendation[] {
        // Ajustar confianza basada en características específicas del dataset
        algorithms.forEach(algo => {
            let adjustedConfidence = algo.confidence;

            // Ajustes basados en el tamaño del dataset
            if (characteristics.numInstances > 10000) {
                if (algo.name === 'Random Forest' || algo.name === 'SMO') {
                    adjustedConfidence *= 1.2;
                } else if (algo.name === 'J48' || algo.name === 'PART') {
                    adjustedConfidence *= 0.8;
                }
            }

            // Ajustes basados en tipos de atributos
            if (characteristics.hasNumericAttributes && algo.name === 'MultilayerPerceptron') {
                adjustedConfidence *= 1.2;
            }
            if (characteristics.hasNominalAttributes && algo.name === 'Naive Bayes') {
                adjustedConfidence *= 1.1;
            }

            // Ajustes basados en calidad de datos
            if (characteristics.dataQuality === 'high' && algo.name === 'SMO') {
                adjustedConfidence *= 1.1;
            }
            if (characteristics.hasMissingValues && algo.name === 'Random Forest') {
                adjustedConfidence *= 1.2;
            }

            algo.confidence = Math.min(adjustedConfidence, 1);
        });

        // Ordenar por confianza ajustada
        return algorithms.sort((a, b) => b.confidence - a.confidence);
    }

    private calculateConfidence(chars: DatasetCharacteristics, weights: { [key: string]: number }): number {
        let confidence = 0.5; // Base confidence

        // Factores positivos
        if (weights.largeDataset && chars.numInstances > 1000) confidence += weights.largeDataset;
        if (weights.smallDataset && chars.numInstances < 1000) confidence += weights.smallDataset;
        if (weights.numericAttributes && chars.hasNumericAttributes) confidence += weights.numericAttributes;
        if (weights.nominalAttributes && chars.hasNominalAttributes) confidence += weights.nominalAttributes;
        if (weights.balanced && chars.isBalanced) confidence += weights.balanced;
        if (weights.speed) confidence += weights.speed;
        if (weights.simplicity) confidence += weights.simplicity;
        if (weights.interpretability) confidence += weights.interpretability;
        if (weights.dataQuality && chars.dataQuality === 'high') confidence += weights.dataQuality;

        // Factores negativos
        if (chars.hasMissingValues) confidence -= 0.1;
        if (chars.hasOutliers) confidence -= 0.1;
        if (!chars.isBalanced) confidence -= 0.1;

        // Normalizar entre 0 y 1
        return Math.min(Math.max(confidence, 0), 1);
    }

    private async generateRecommendationsHTML(recommendations: AlgorithmRecommendation[], characteristics: DatasetCharacteristics): Promise<string> {
        try {
            // Usar workspaceFile en lugar de rootPath
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No se encontró un workspace abierto');
            }

            const templatePath = path.join(workspaceFolder.uri.fsPath, 'src', 'templates', 'recommendations.html');
            let template = await fs.promises.readFile(templatePath, 'utf8');

            // Reemplazar las variables en el template
            const replacements = {
                characteristics: JSON.stringify(characteristics),
                recommendations: JSON.stringify(recommendations)
            };

            // Realizar las sustituciones
            for (const [key, value] of Object.entries(replacements)) {
                template = template.replace(new RegExp(`\\\${${key}}`, 'g'), value);
            }

            return template;
        } catch (error) {
            console.error('Error al generar HTML:', error);
            return this.generateFallbackHTML(recommendations, characteristics);
        }
    }

    private generateFallbackHTML(recommendations: AlgorithmRecommendation[], characteristics: DatasetCharacteristics): string {
        // Versión simplificada del HTML en caso de error al cargar el template
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: system-ui; padding: 20px; }
                    .recommendation { margin: 20px 0; padding: 10px; border: 1px solid #ccc; }
                </style>
            </head>
            <body>
                    <h2>Características del Dataset</h2>
                <pre>${JSON.stringify(characteristics, null, 2)}</pre>
                <h2>Recomendaciones</h2>
                ${recommendations.map(rec => `
                    <div class="recommendation">
                        <h3>${rec.name}</h3>
                        <p>${rec.reason}</p>
                        <code>${rec.command}</code>
                    </div>
                `).join('')}
            </body>
            </html>
        `;
    }
} 