"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const datasetRecommendationService_1 = require("./datasetRecommendationService");
class StatisticsService {
    constructor() {
        this.recommendationService = new datasetRecommendationService_1.DatasetRecommendationService();
    }
    parseWekaOutput(output) {
        // Verificar si hay errores en la salida
        if (output.includes('Exception') || output.includes('Error')) {
            const errorMatch = output.match(/Exception.*|Error.*/g);
            if (errorMatch) {
                throw new Error(errorMatch[0]);
            }
        }
        // Extraer métricas básicas
        const accuracyMatch = RegExp(/Correctly Classified Instances\s+\d+\s+([\d.]+)\s*%/).exec(output);
        const kappaMatch = RegExp(/Kappa statistic\s+([\d.]+)/).exec(output);
        const maeMatch = RegExp(/Mean absolute error\s+([\d.]+)/).exec(output);
        const rmseMatch = RegExp(/Root mean squared error\s+([\d.]+)/).exec(output);
        const raeMatch = RegExp(/Relative absolute error\s+([\d.]+)\s*%/).exec(output);
        const rrseMatch = RegExp(/Root relative squared error\s+([\d.]+)\s*%/).exec(output);
        const timeMatch = RegExp(/Time taken to build model:\s+([\d.]+)/).exec(output);
        const totalInstancesMatch = RegExp(/Total Number of Instances\s+(\d+)/).exec(output);
        // Extraer información del modelo
        const modelInfo = {};
        const leavesMatch = RegExp(/Number of Leaves\s*:\s*(\d+)/).exec(output);
        const treeSizeMatch = RegExp(/Size of the tree\s*:\s*(\d+)/).exec(output);
        const rulesMatch = RegExp(/Number of Rules\s*:\s*(\d+)/).exec(output);
        if (leavesMatch)
            modelInfo.numberOfLeaves = Number(leavesMatch[1]);
        if (treeSizeMatch)
            modelInfo.sizeOfTree = Number(treeSizeMatch[1]);
        if (rulesMatch)
            modelInfo.numberOfRules = Number(rulesMatch[1]);
        // Extraer tipo de modelo y descripción
        const modelTypeMatch = RegExp(/=== Classifier model ===\n(.*?)(?=\n)/).exec(output);
        if (modelTypeMatch) {
            modelInfo.modelType = modelTypeMatch[1].trim();
            // Extraer descripción del modelo
            const modelDescMatch = RegExp(/=== Classifier model ===\n([\s\S]*?)(?=\n={2,}|$)/).exec(output);
            if (modelDescMatch) {
                modelInfo.modelDescription = modelDescMatch[1].trim();
            }
        }
        // Extraer métricas detalladas por clase
        const detailedMetricsMatch = RegExp(/=== Detailed Accuracy By Class ===[\s\S]*?(?=\n\n)/).exec(output);
        const classDetails = [];
        if (detailedMetricsMatch) {
            const lines = detailedMetricsMatch[0].split('\n');
            // Buscar líneas que contengan métricas por clase
            lines.forEach(line => {
                const metrics = line.trim().split(/\s+/);
                if (metrics.length >= 9 && !isNaN(Number(metrics[0]))) {
                    classDetails.push({
                        className: metrics[metrics.length - 1],
                        truePositiveRate: Number(metrics[0]),
                        falsePositiveRate: Number(metrics[1]),
                        precision: Number(metrics[2]),
                        recall: Number(metrics[3]),
                        fMeasure: Number(metrics[4]),
                        mcc: Number(metrics[5]),
                        rocArea: Number(metrics[6]),
                        prcArea: Number(metrics[7])
                    });
                }
            });
        }
        // Extraer matriz de confusión
        const confusionMatrixMatch = RegExp(/=== Confusion Matrix ===\n\n([\s\S]*?)(?=\n\n|$)/).exec(output);
        let confusionMatrix;
        if (confusionMatrixMatch) {
            const matrixLines = confusionMatrixMatch[1].trim().split('\n');
            confusionMatrix = matrixLines
                .filter(line => !line.includes('<--')) // Excluir la línea de leyenda
                .map(line => line.trim().split(/\s+/)
                .filter(val => !isNaN(Number(val))) // Solo incluir números
                .map(Number));
        }
        return {
            accuracy: Number(accuracyMatch?.[1] ?? 0),
            kappa: Number(kappaMatch?.[1] ?? 0),
            meanAbsoluteError: Number(maeMatch?.[1] ?? 0),
            rootMeanSquaredError: Number(rmseMatch?.[1] ?? 0),
            relativeAbsoluteError: Number(raeMatch?.[1] ?? 0),
            rootRelativeSquaredError: Number(rrseMatch?.[1] ?? 0),
            timeElapsed: Number(timeMatch?.[1] ?? 0),
            totalInstances: Number(totalInstancesMatch?.[1] ?? 0),
            modelInfo,
            classDetails,
            confusionMatrix
        };
    }
    formatDetailedOutput(output) {
        // Dividir la salida en secciones
        const sections = [
            '=== Run information ===',
            '=== Classifier model ===',
            '=== Summary ===',
            '=== Detailed Accuracy By Class ===',
            '=== Confusion Matrix ==='
        ];
        let formattedOutput = output;
        sections.forEach(section => {
            formattedOutput = formattedOutput.replace(new RegExp(section, 'g'), `\n${section}\n${'='.repeat(section.length)}\n`);
        });
        // Resaltar números y porcentajes
        formattedOutput = formattedOutput.replace(/(\d+\.?\d*%?)/g, '**$1**');
        return formattedOutput;
    }
    parseBasicStats(lines) {
        const stats = {
            numInstances: 0,
            numAttributes: 0,
            numNumerical: 0,
            numNominal: 0,
            numMissing: 0,
            attributeTypes: {},
            attributeStats: [],
            missingValues: 0,
            uniqueValues: {},
            correlations: []
        };
        for (const line of lines) {
            const instancesMatch = RegExp(/Instances:\s+(\d+)/).exec(line);
            if (instancesMatch) {
                stats.numInstances = parseInt(instancesMatch[1]);
                continue;
            }
            const attributesMatch = RegExp(/Attributes:\s+(\d+)/).exec(line);
            if (attributesMatch) {
                stats.numAttributes = parseInt(attributesMatch[1]);
            }
        }
        return stats;
    }
    parseAttributeInfo(line) {
        const attributeMatch = RegExp(/(\w+)\s+(\w+)\s+\[(\d+)\]/).exec(line);
        if (!attributeMatch)
            return null;
        return {
            name: attributeMatch[1],
            type: attributeMatch[2].toLowerCase(),
            missing: 0,
            unique: parseInt(attributeMatch[3]),
            distribution: {}
        };
    }
    updateAttributeStats(currentAttribute, line, stats) {
        const missingMatch = RegExp(/Missing:\s+(\d+)/).exec(line);
        if (missingMatch) {
            currentAttribute.missing = parseInt(missingMatch[1]);
            stats.numMissing += currentAttribute.missing;
            return;
        }
        const distributionMatch = RegExp(/(\w+)\s*:\s*(\d+)/).exec(line);
        if (distributionMatch) {
            currentAttribute.distribution[distributionMatch[1]] = parseInt(distributionMatch[2]);
        }
        const numericStatsMatch = RegExp(/Mean: ([\d.]+)\s+StdDev: ([\d.]+)/).exec(line);
        if (numericStatsMatch) {
            currentAttribute.mean = parseFloat(numericStatsMatch[1]);
            currentAttribute.stdDev = parseFloat(numericStatsMatch[2]);
        }
    }
    parseDatasetStats(output) {
        const lines = output.split('\n');
        const stats = this.parseBasicStats(lines);
        let currentAttribute = null;
        for (const line of lines) {
            const newAttribute = this.parseAttributeInfo(line);
            if (newAttribute) {
                if (currentAttribute) {
                    stats.attributeStats.push(currentAttribute);
                    if (currentAttribute.type === 'numeric') {
                        stats.numNumerical++;
                    }
                    else if (currentAttribute.type === 'nominal') {
                        stats.numNominal++;
                    }
                }
                currentAttribute = newAttribute;
                stats.attributeTypes[newAttribute.name] = newAttribute.type;
                continue;
            }
            if (currentAttribute) {
                this.updateAttributeStats(currentAttribute, line, stats);
            }
        }
        // Agregar el último atributo si existe
        if (currentAttribute) {
            stats.attributeStats.push(currentAttribute);
            if (currentAttribute.type === 'numeric') {
                stats.numNumerical++;
            }
            else if (currentAttribute.type === 'nominal') {
                stats.numNominal++;
            }
        }
        // Calcular recomendaciones de algoritmos basadas en las características del dataset
        const characteristics = {
            hasNumericAttributes: stats.numNumerical > 0,
            hasNominalAttributes: stats.numNominal > 0,
            hasMissingValues: stats.numMissing > 0,
            isLargeDataset: stats.numInstances > 1000,
            numInstances: stats.numInstances,
            numAttributes: stats.numAttributes
        };
        stats.recommendedAlgorithms = this.recommendationService.getRecommendations(characteristics);
        return stats;
    }
    calculateCorrelations(attributes) {
        // Implementar cálculo real de correlaciones aquí
        // Por ahora retornamos una matriz vacía
        return Array(attributes.length).fill([]).map(() => Array(attributes.length).fill(0));
    }
    getDefaultStats() {
        return {
            numInstances: 0,
            numAttributes: 0,
            numNumerical: 0,
            numNominal: 0,
            numMissing: 0,
            attributeTypes: {},
            attributeStats: [],
            missingValues: 0,
            uniqueValues: {},
            correlations: [],
            recommendedAlgorithms: {
                recommended: [],
                notRecommended: []
            }
        };
    }
}
exports.StatisticsService = StatisticsService;
//# sourceMappingURL=statisticsService.js.map