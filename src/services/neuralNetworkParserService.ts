import { IWekaMetrics } from '../interfaces/weka.interface';

export class NeuralNetworkParserService {
    public parseEpoch(data: string): number {
        const epochMatch = RegExp(/Epoch\s+(\d+)/).exec(data);
        if (epochMatch) {
            return parseInt(epochMatch[1]);
        }
        return 0;
    }

    public parseError(data: string): number {
        const errorMatch = RegExp(/Error\s+([\d.]+)/).exec(data);
        if (errorMatch) {
            return parseFloat(errorMatch[1]);
        }
        return 0;
    }

    public parseAccuracy(data: string): number {
        const accuracyMatch = RegExp(/Accuracy\s+([\d.]+)\s*%/).exec(data);
        if (accuracyMatch) {
            return parseFloat(accuracyMatch[1]);
        }
        return 0;
    }

    public parseMetrics(result: string): IWekaMetrics {
        const metrics: any = {};
        
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

        return metrics as IWekaMetrics;
    }

    public parseConfusionMatrix(result: string): number[][] | null {
        const matrixMatch = RegExp(/=== Confusion Matrix ===\n\n([\s\S]+?)\n\n/).exec(result);
        if (!matrixMatch) return null;

        return matrixMatch[1]
            .trim()
            .split('\n')
            .map(row => row.trim().split(/\s+/).map(Number));
    }

    public parseWekaOutput(progress: number): {
        epoch: number;
        error: number;
        accuracy: number;
    } {
        return {
            epoch: Math.floor(progress * 100),
            error: Math.max(0, 1 - (progress * 0.8)),
            accuracy: progress * 100
        };
    }
} 