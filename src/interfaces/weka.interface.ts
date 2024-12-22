import * as vscode from 'vscode';

export interface IAttributeStats {
    name: string;
    type: string;
    missing: number;
    unique: number;
    distribution: Record<string, number>;
    mean?: number;
    stdDev?: number;
}

export interface IWekaMetrics {
    accuracy: number;
    kappa: number;
    meanAbsoluteError: number;
    rootMeanSquaredError: number;
    relativeAbsoluteError: number;
    rootRelativeSquaredError: number;
    totalInstances: number;
    timeElapsed: number;
    modelInfo?: {
        modelType?: string;
        numberOfLeaves?: number;
        sizeOfTree?: number;
        numberOfRules?: number;
        modelDescription?: string;
    };
    classDetails?: Array<{
        className: string;
        truePositiveRate: number;
        falsePositiveRate: number;
        precision: number;
        recall: number;
        fMeasure: number;
        mcc: number;
        rocArea: number;
        prcArea: number;
    }>;
    confusionMatrix?: number[][];
}

export interface IAlgorithmQuickPickItem extends vscode.QuickPickItem {
    kind?: vscode.QuickPickItemKind;
}

export interface IWekaAlgorithm {
    id: string;
    name: string;
    category: string;
    command: string;
    description: string;
    defaultParams: string;
    complexity: 'baja' | 'media' | 'alta';
    parameterDescriptions: Record<string, string>;
}

export interface IWekaAlgorithmSubcategory {
    id: string;
    name: string;
    description: string;
}

export interface IWekaAlgorithmCategory {
    id: string;
    name: string;
    description: string;
    subcategories: IWekaAlgorithmSubcategory[];
}

export interface IAlgorithmRecommendation {
    name: string;
    command: string;
    params: string;
    confidence: number;
    reason: string;
    bestFor: string[];
    limitations: string[];
    isRecommended: boolean;
    notRecommendedReason?: string;
}

export interface IDatasetStats {
    numInstances: number;
    numAttributes: number;
    numClasses?: number;
    numNumerical: number;
    numNominal: number;
    numMissing: number;
    className?: string;
    attributeTypes: Record<string, string>;
    classDistribution?: Record<string, number>;
    attributeStats: IAttributeStats[];
    missingValues: number;
    uniqueValues: Record<string, number>;
    correlations: number[][];
    recommendedAlgorithms: {
        recommended: IAlgorithmRecommendation[];
        notRecommended: IAlgorithmRecommendation[];
    };
}

export interface IWekaExecutionOptions {
    onProgress?: (progress: number) => void;
    onComplete?: (output: string) => void;
    saveModel?: boolean;
    evaluationMode?: 'split' | 'cross-validation' | 'training';
    splitPercentage?: number;
    numFolds?: number;
    seed?: number;
} 