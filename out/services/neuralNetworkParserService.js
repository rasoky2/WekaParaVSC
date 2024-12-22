"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeuralNetworkParserService = void 0;
class NeuralNetworkParserService {
    parseEpoch(data) {
        const epochMatch = RegExp(/Epoch\s+(\d+)/).exec(data);
        if (epochMatch) {
            return parseInt(epochMatch[1]);
        }
        return 0;
    }
    parseError(data) {
        const errorMatch = RegExp(/Error\s+([\d.]+)/).exec(data);
        if (errorMatch) {
            return parseFloat(errorMatch[1]);
        }
        return 0;
    }
    parseAccuracy(data) {
        const accuracyMatch = RegExp(/Accuracy\s+([\d.]+)\s*%/).exec(data);
        if (accuracyMatch) {
            return parseFloat(accuracyMatch[1]);
        }
        return 0;
    }
    parseMetrics(result) {
        const metrics = {};
        // Métricas básicas
        const patterns = {
            accuracy: /Correctly Classified Instances\s+\d+\s+([\d.]+)\s*%/,
            kappa: /Kappa statistic\s+([\d.]+)/,
            meanAbsoluteError: /Mean absolute error\s+([\d.]+)/,
            rootMeanSquaredError: /Root mean squared error\s+([\d.]+)/,
            relativeAbsoluteError: /Relative absolute error\s+([\d.]+)\s*%/,
            rootRelativeSquaredError: /Root relative squared error\s+([\d.]+)\s*%/,
            totalInstances: /Total Number of Instances\s+(\d+)/
        };
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = RegExp(pattern).exec(result);
            if (match) {
                metrics[key] = parseFloat(match[1]);
            }
        }
        // Extraer matriz de confusión
        const confusionMatrix = this.parseConfusionMatrix(result);
        if (confusionMatrix) {
            metrics.confusionMatrix = confusionMatrix;
        }
        return metrics;
    }
    parseConfusionMatrix(result) {
        const matrixMatch = RegExp(/=== Confusion Matrix ===\n\n([\s\S]+?)\n\n/).exec(result);
        if (!matrixMatch)
            return null;
        return matrixMatch[1]
            .trim()
            .split('\n')
            .map(row => row.trim().split(/\s+/).map(Number));
    }
    parseWekaOutput(progress) {
        return {
            epoch: Math.floor(progress * 100),
            error: Math.max(0, 1 - (progress * 0.8)),
            accuracy: progress * 100
        };
    }
}
exports.NeuralNetworkParserService = NeuralNetworkParserService;
//# sourceMappingURL=neuralNetworkParserService.js.map