import { IAlgorithmRecommendation } from '../interfaces/weka.interface';

export interface DatasetCharacteristics {
    hasNumericAttributes: boolean;
    hasNominalAttributes: boolean;
    hasMissingValues: boolean;
    isLargeDataset: boolean;
    numInstances: number;
    numAttributes: number;
    classType?: string;
    isBalanced?: boolean;
    hasOutliers?: boolean;
    dimensionality?: 'low' | 'medium' | 'high';
    dataQuality?: 'low' | 'medium' | 'high';
    targetVariable?: {
        type: 'nominal' | 'numeric';
        uniqueValues?: number;
        distribution?: { [key: string]: number };
    };
}

export interface AlgorithmComparison {
    algorithms: string[];
    comparisonMatrix: {
        [key: string]: {
            [criteria: string]: number;
        };
    };
    recommendations: {
        bestOverall: string;
        bestForSpeed: string;
        bestForAccuracy: string;
        bestForInterpretability: string;
    };
    detailedAnalysis: {
        [key: string]: {
            strengths: string[];
            weaknesses: string[];
            useCases: string[];
            performanceMetrics: {
                speed: number;
                accuracy: number;
                interpretability: number;
                memoryUsage: number;
            };
        };
    };
}

export class DatasetRecommendationService {
    public getRecommendations(characteristics: DatasetCharacteristics): {
        recommended: IAlgorithmRecommendation[];
        notRecommended: IAlgorithmRecommendation[];
    } {
        const allAlgorithms = [
            this.getRandomForestRecommendation(characteristics),
            this.getNeuralNetworkRecommendation(characteristics),
            this.getJ48Recommendation(characteristics),
            this.getNaiveBayesRecommendation(characteristics),
            this.getSVMRecommendation(characteristics),
            this.getLogisticRegressionRecommendation(characteristics),
            this.getKNNRecommendation(characteristics),
            this.getAdaBoostRecommendation(characteristics),
            this.getBaggingRecommendation(characteristics),
            this.getZeroRRecommendation(characteristics),
            this.getOneRRecommendation(characteristics),
            this.getDecisionTableRecommendation(characteristics)
        ];

        return {
            recommended: allAlgorithms
                .filter(algo => algo.isRecommended && algo.confidence > 0.3)
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 5),
            notRecommended: allAlgorithms
                .filter(algo => !algo.isRecommended)
                .sort((a, b) => a.confidence - b.confidence)
        };
    }

    public getAllPossibleAlgorithms(characteristics: DatasetCharacteristics): IAlgorithmRecommendation[] {
        return [
            this.getRandomForestRecommendation(characteristics),
            this.getNeuralNetworkRecommendation(characteristics),
            this.getJ48Recommendation(characteristics),
            this.getNaiveBayesRecommendation(characteristics),
            this.getSVMRecommendation(characteristics),
            this.getLogisticRegressionRecommendation(characteristics),
            this.getKNNRecommendation(characteristics),
            this.getAdaBoostRecommendation(characteristics),
            this.getBaggingRecommendation(characteristics),
            this.getZeroRRecommendation(characteristics),
            this.getOneRRecommendation(characteristics),
            this.getDecisionTableRecommendation(characteristics),
            this.getGradientBoostingRecommendation(characteristics),
            this.getXGBoostRecommendation(characteristics),
            this.getLightGBMRecommendation(characteristics),
            this.getStackingRecommendation(characteristics)
        ].sort((a, b) => b.confidence - a.confidence);
    }

    public compareAlgorithms(algorithms: IAlgorithmRecommendation[]): AlgorithmComparison {
        const comparisonMatrix: { [key: string]: { [criteria: string]: number } } = {};
        const detailedAnalysis: { [key: string]: any } = {};

        algorithms.forEach(algo => {
            comparisonMatrix[algo.name] = this.evaluateAlgorithm(algo);
            detailedAnalysis[algo.name] = this.analyzeAlgorithm(algo);
        });

        return {
            algorithms: algorithms.map(a => a.name),
            comparisonMatrix,
            recommendations: this.getBestAlgorithms(comparisonMatrix),
            detailedAnalysis
        };
    }

    private evaluateAlgorithm(algo: IAlgorithmRecommendation): { [criteria: string]: number } {
        return {
            confidence: algo.confidence,
            speed: this.evaluateSpeed(algo),
            accuracy: this.evaluateAccuracy(algo),
            interpretability: this.evaluateInterpretability(algo),
            robustness: this.evaluateRobustness(algo),
            memoryUsage: this.evaluateMemoryUsage(algo)
        };
    }

    private evaluateSpeed(algo: IAlgorithmRecommendation): number {
        const speedMap: { [key: string]: number } = {
            'Naive Bayes': 0.9,
            'ZeroR': 1.0,
            'OneR': 0.95,
            'Decision Table': 0.7,
            'J48 (C4.5)': 0.75,
            'Random Forest': 0.6,
            'Neural Network (MultilayerPerceptron)': 0.4,
            'Support Vector Machine (SMO)': 0.5,
            'K-Nearest Neighbors (IBk)': 0.65,
            'Logistic Regression': 0.8,
            'AdaBoost.M1': 0.55,
            'Bagging': 0.5,
            'Gradient Boosting': 0.45,
            'XGBoost': 0.55,
            'LightGBM': 0.65,
            'Stacking': 0.3
        };
        return speedMap[algo.name] || 0.5;
    }

    private evaluateAccuracy(algo: IAlgorithmRecommendation): number {
        const accuracyMap: { [key: string]: number } = {
            'Random Forest': 0.9,
            'XGBoost': 0.95,
            'LightGBM': 0.9,
            'Neural Network (MultilayerPerceptron)': 0.85,
            'Gradient Boosting': 0.88,
            'Support Vector Machine (SMO)': 0.82,
            'Stacking': 0.92,
            'J48 (C4.5)': 0.75,
            'Naive Bayes': 0.7,
            'K-Nearest Neighbors (IBk)': 0.75,
            'Logistic Regression': 0.72,
            'AdaBoost.M1': 0.8,
            'Bagging': 0.85,
            'Decision Table': 0.65,
            'OneR': 0.5,
            'ZeroR': 0.3
        };
        return accuracyMap[algo.name] || 0.5;
    }

    private evaluateInterpretability(algo: IAlgorithmRecommendation): number {
        const interpretabilityMap: { [key: string]: number } = {
            'Decision Table': 0.9,
            'OneR': 1.0,
            'ZeroR': 1.0,
            'J48 (C4.5)': 0.85,
            'Naive Bayes': 0.8,
            'Logistic Regression': 0.75,
            'K-Nearest Neighbors (IBk)': 0.7,
            'Random Forest': 0.6,
            'AdaBoost.M1': 0.5,
            'Bagging': 0.5,
            'Support Vector Machine (SMO)': 0.4,
            'Neural Network (MultilayerPerceptron)': 0.3,
            'Gradient Boosting': 0.45,
            'XGBoost': 0.4,
            'LightGBM': 0.45,
            'Stacking': 0.2
        };
        return interpretabilityMap[algo.name] || 0.5;
    }

    private evaluateRobustness(algo: IAlgorithmRecommendation): number {
        const robustnessMap: { [key: string]: number } = {
            'Random Forest': 0.9,
            'XGBoost': 0.9,
            'Bagging': 0.85,
            'LightGBM': 0.85,
            'Gradient Boosting': 0.8,
            'Neural Network (MultilayerPerceptron)': 0.75,
            'Support Vector Machine (SMO)': 0.7,
            'J48 (C4.5)': 0.7,
            'Naive Bayes': 0.6,
            'K-Nearest Neighbors (IBk)': 0.6,
            'Logistic Regression': 0.65,
            'AdaBoost.M1': 0.7,
            'Decision Table': 0.5,
            'OneR': 0.3,
            'ZeroR': 0.3,
            'Stacking': 0.8
        };
        return robustnessMap[algo.name] || 0.5;
    }

    private evaluateMemoryUsage(algo: IAlgorithmRecommendation): number {
        const memoryMap: { [key: string]: number } = {
            'ZeroR': 0.95,
            'OneR': 0.9,
            'Naive Bayes': 0.85,
            'Logistic Regression': 0.8,
            'Decision Table': 0.75,
            'J48 (C4.5)': 0.7,
            'Support Vector Machine (SMO)': 0.6,
            'K-Nearest Neighbors (IBk)': 0.5,
            'Neural Network (MultilayerPerceptron)': 0.4,
            'Random Forest': 0.5,
            'AdaBoost.M1': 0.6,
            'Bagging': 0.5,
            'Gradient Boosting': 0.45,
            'XGBoost': 0.5,
            'LightGBM': 0.6,
            'Stacking': 0.3
        };
        return memoryMap[algo.name] || 0.5;
    }

    private analyzeAlgorithm(algo: IAlgorithmRecommendation) {
        return {
            strengths: algo.bestFor,
            weaknesses: algo.limitations,
            useCases: this.getUseCases(algo),
            performanceMetrics: {
                speed: this.evaluateSpeed(algo),
                accuracy: this.evaluateAccuracy(algo),
                interpretability: this.evaluateInterpretability(algo),
                memoryUsage: this.evaluateMemoryUsage(algo)
            }
        };
    }

    private getBestAlgorithms(matrix: { [key: string]: { [criteria: string]: number } }): {
        bestOverall: string;
        bestForSpeed: string;
        bestForAccuracy: string;
        bestForInterpretability: string;
    } {
        let bestOverall = '';
        let bestForSpeed = '';
        let bestForAccuracy = '';
        let bestForInterpretability = '';
        let maxOverall = -1;
        let maxSpeed = -1;
        let maxAccuracy = -1;
        let maxInterpretability = -1;

        Object.entries(matrix).forEach(([algo, metrics]) => {
            const overallScore = (
                metrics.accuracy * 0.4 +
                metrics.speed * 0.2 +
                metrics.interpretability * 0.2 +
                metrics.robustness * 0.2
            );

            if (overallScore > maxOverall) {
                maxOverall = overallScore;
                bestOverall = algo;
            }
            if (metrics.speed > maxSpeed) {
                maxSpeed = metrics.speed;
                bestForSpeed = algo;
            }
            if (metrics.accuracy > maxAccuracy) {
                maxAccuracy = metrics.accuracy;
                bestForAccuracy = algo;
            }
            if (metrics.interpretability > maxInterpretability) {
                maxInterpretability = metrics.interpretability;
                bestForInterpretability = algo;
            }
        });

        return {
            bestOverall,
            bestForSpeed,
            bestForAccuracy,
            bestForInterpretability
        };
    }

    private getUseCases(algo: IAlgorithmRecommendation): string[] {
        const useCases: { [key: string]: string[] } = {
            'Random Forest': [
                'Clasificación de imágenes',
                'Predicción de riesgo crediticio',
                'Detección de fraude',
                'Análisis de sentimientos'
            ],
            'Neural Network (MultilayerPerceptron)': [
                'Reconocimiento de patrones complejos',
                'Procesamiento de lenguaje natural',
                'Predicción de series temporales',
                'Visión por computadora'
            ],
            'Support Vector Machine (SMO)': [
                'Clasificación de texto',
                'Detección de spam',
                'Reconocimiento facial',
                'Análisis biomédico'
            ],
            // ... más casos de uso para otros algoritmos
        };
        return useCases[algo.name] || algo.bestFor;
    }

    private getRandomForestRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.7;
        if (chars.hasNumericAttributes) confidence += 0.1;
        if (chars.hasNominalAttributes) confidence += 0.1;
        if (chars.hasMissingValues) confidence += 0.1;
        if (chars.isLargeDataset) confidence -= 0.1;

        return {
            name: 'Random Forest',
            command: 'weka.classifiers.trees.RandomForest',
            params: '-I 100 -K 0 -S 1',
            confidence,
            reason: 'Excelente para datasets mixtos con buena tolerancia a valores faltantes',
            bestFor: [
                'Datasets con tipos de datos mixtos',
                'Problemas de clasificación complejos',
                'Datasets con valores faltantes'
            ],
            limitations: [
                'Puede ser lento en datasets muy grandes',
                'Requiere más memoria que algoritmos simples',
                'Menos interpretable que árboles individuales'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getNeuralNetworkRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.6;
        if (chars.hasNumericAttributes) confidence += 0.2;
        if (chars.hasNominalAttributes) confidence -= 0.1;
        if (chars.hasMissingValues) confidence -= 0.1;
        if (chars.isLargeDataset) confidence += 0.1;

        return {
            name: 'Neural Network (MultilayerPerceptron)',
            command: 'weka.classifiers.functions.MultilayerPerceptron',
            params: '-L 0.3 -M 0.2 -N 500 -V 0 -S 0 -E 20 -H a',
            confidence,
            reason: 'Potente para patrones complejos, especialmente con datos numéricos',
            bestFor: [
                'Datasets principalmente numéricos',
                'Patrones no lineales complejos',
                'Datasets grandes con buena calidad'
            ],
            limitations: [
                'Sensible a valores faltantes',
                'Puede requerir normalización de datos',
                'Tiempo de entrenamiento largo'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getJ48Recommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.65;
        if (chars.hasNumericAttributes) confidence += 0.1;
        if (chars.hasNominalAttributes) confidence += 0.15;
        if (chars.hasMissingValues) confidence += 0.05;
        if (chars.isLargeDataset) confidence -= 0.15;

        return {
            name: 'J48 (C4.5)',
            command: 'weka.classifiers.trees.J48',
            params: '-C 0.25 -M 2',
            confidence,
            reason: 'Buena interpretabilidad y manejo balanceado de diferentes tipos de datos',
            bestFor: [
                'Cuando se necesita interpretabilidad',
                'Datasets de tamaño medio',
                'Datos categóricos y numéricos'
            ],
            limitations: [
                'Puede sobreajustar en datasets ruidosos',
                'No tan preciso como Random Forest',
                'Rendimiento limitado en datasets muy grandes'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getNaiveBayesRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.55;
        if (chars.hasNominalAttributes) confidence += 0.2;
        if (chars.hasNumericAttributes) confidence -= 0.1;
        if (!chars.isLargeDataset) confidence += 0.1;

        return {
            name: 'Naive Bayes',
            command: 'weka.classifiers.bayes.NaiveBayes',
            params: '',
            confidence,
            reason: 'Rápido y eficiente para clasificación con atributos nominales',
            bestFor: [
                'Datasets pequeños a medianos',
                'Atributos principalmente nominales',
                'Cuando se necesita velocidad'
            ],
            limitations: [
                'Asume independencia entre atributos',
                'Limitado con relaciones complejas',
                'No óptimo para datos numéricos continuos'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getSVMRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.6;
        if (chars.hasNumericAttributes) confidence += 0.15;
        if (!chars.hasMissingValues) confidence += 0.1;
        if (chars.isLargeDataset) confidence -= 0.2;

        return {
            name: 'Support Vector Machine (SMO)',
            command: 'weka.classifiers.functions.SMO',
            params: '-C 1.0 -L 0.001 -P 1.0E-12 -N 0 -V -1 -W 1',
            confidence,
            reason: 'Efectivo para clasificación binaria y datos numéricos',
            bestFor: [
                'Clasificación binaria',
                'Datasets numéricos',
                'Datos sin valores faltantes'
            ],
            limitations: [
                'Lento en datasets grandes',
                'Sensible a valores faltantes',
                'Requiere normalización de datos'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getLogisticRegressionRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.6;
        if (chars.hasNumericAttributes) confidence += 0.15;
        if (chars.hasNominalAttributes) confidence -= 0.1;
        const isRecommended = chars.hasNumericAttributes && !chars.hasMissingValues;

        return {
            name: 'Logistic Regression',
            command: 'weka.classifiers.functions.Logistic',
            params: '-R 1.0E-8 -M -1',
            confidence,
            reason: 'Bueno para problemas de clasificación binaria y probabilidades',
            bestFor: [
                'Clasificación binaria',
                'Cuando se necesitan probabilidades',
                'Datasets linealmente separables'
            ],
            limitations: [
                'No maneja bien relaciones no lineales',
                'Sensible a valores atípicos',
                'Requiere preprocesamiento'
            ],
            isRecommended,
            notRecommendedReason: !isRecommended ? 'No óptimo para datos nominales o con valores faltantes' : undefined
        };
    }

    private getKNNRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.5;
        if (chars.hasNumericAttributes) confidence += 0.2;
        if (chars.isLargeDataset) confidence -= 0.3;
        const isRecommended = !chars.isLargeDataset && chars.hasNumericAttributes;

        return {
            name: 'K-Nearest Neighbors (IBk)',
            command: 'weka.classifiers.lazy.IBk',
            params: '-K 3 -W 0 -A "weka.core.neighboursearch.LinearNNSearch -A "weka.core.EuclideanDistance -R first-last""',
            confidence,
            reason: 'Simple y efectivo para datasets pequeños',
            bestFor: [
                'Datasets pequeños',
                'Datos numéricos',
                'Cuando se necesita un modelo simple'
            ],
            limitations: [
                'Muy lento en datasets grandes',
                'Sensible a atributos irrelevantes',
                'Alto consumo de memoria'
            ],
            isRecommended,
            notRecommendedReason: !isRecommended ? 'No recomendado para datasets grandes' : undefined
        };
    }

    private getAdaBoostRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.65;
        if (chars.hasNumericAttributes) confidence += 0.1;
        if (chars.hasMissingValues) confidence -= 0.2;
        const isRecommended = !chars.hasMissingValues;

        return {
            name: 'AdaBoost.M1',
            command: 'weka.classifiers.meta.AdaBoostM1',
            params: '-P 100 -S 1 -I 10 -W weka.classifiers.trees.DecisionStump',
            confidence,
            reason: 'Bueno para mejorar clasificadores débiles',
            bestFor: [
                'Datasets balanceados',
                'Cuando otros modelos tienen bajo rendimiento',
                'Problemas binarios'
            ],
            limitations: [
                'Sensible a ruido y valores atípicos',
                'Puede sobreajustar',
                'No maneja bien valores faltantes'
            ],
            isRecommended,
            notRecommendedReason: !isRecommended ? 'No recomendado para datos con ruido o valores faltantes' : undefined
        };
    }

    private getBaggingRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.7;
        if (chars.isLargeDataset) confidence -= 0.1;
        if (chars.hasMissingValues) confidence += 0.1;
        const isRecommended = true; // Bagging es generalmente seguro de usar

        return {
            name: 'Bagging',
            command: 'weka.classifiers.meta.Bagging',
            params: '-P 100 -S 1 -num-slots 1 -I 10 -W weka.classifiers.trees.REPTree',
            confidence,
            reason: 'Robusto y estable, reduce varianza',
            bestFor: [
                'Reducir sobreajuste',
                'Mejorar estabilidad',
                'Datasets con ruido'
            ],
            limitations: [
                'Más lento que modelos individuales',
                'Requiere más memoria',
                'Menos interpretable'
            ],
            isRecommended,
            notRecommendedReason: undefined
        };
    }

    private getZeroRRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        return {
            name: 'ZeroR',
            command: 'weka.classifiers.rules.ZeroR',
            params: '',
            confidence: 0.1,
            reason: 'Clasificador base para comparación',
            bestFor: [
                'Establecer línea base',
                'Comparar otros algoritmos',
                'Datasets muy simples'
            ],
            limitations: [
                'Rendimiento muy básico',
                'No aprende patrones',
                'Solo predice la clase mayoritaria'
            ],
            isRecommended: false,
            notRecommendedReason: 'Demasiado simple para uso real, solo útil como baseline'
        };
    }

    private getOneRRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        return {
            name: 'OneR',
            command: 'weka.classifiers.rules.OneR',
            params: '-B 6',
            confidence: 0.2,
            reason: 'Reglas simples basadas en un solo atributo',
            bestFor: [
                'Análisis exploratorio',
                'Cuando se necesita interpretabilidad',
                'Datasets muy simples'
            ],
            limitations: [
                'Muy simple para problemas reales',
                'Ignora interacciones entre atributos',
                'Rendimiento limitado'
            ],
            isRecommended: false,
            notRecommendedReason: 'Demasiado simple para la mayoría de problemas reales'
        };
    }

    private getDecisionTableRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.4;
        if (!chars.isLargeDataset) confidence += 0.2;
        if (!chars.hasMissingValues) confidence += 0.1;
        const isRecommended = !chars.isLargeDataset && !chars.hasMissingValues;

        return {
            name: 'Decision Table',
            command: 'weka.classifiers.rules.DecisionTable',
            params: '-X 1 -S "weka.attributeSelection.BestFirst -D 1 -N 5"',
            confidence,
            reason: 'Simple y fácil de interpretar',
            bestFor: [
                'Datasets pequeños',
                'Cuando se necesita interpretabilidad',
                'Problemas simples'
            ],
            limitations: [
                'No escala bien',
                'Rendimiento limitado en problemas complejos',
                'Puede ser lento en búsqueda de atributos'
            ],
            isRecommended,
            notRecommendedReason: !isRecommended ? 'No óptimo para datasets grandes o con valores faltantes' : undefined
        };
    }

    private getGradientBoostingRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.75;
        if (chars.hasNumericAttributes) confidence += 0.1;
        if (!chars.hasMissingValues) confidence += 0.1;

        return {
            name: 'Gradient Boosting',
            command: 'weka.classifiers.meta.GradientBoostingClassifier',
            params: '-I 100 -L 0.1 -S 1',
            confidence,
            reason: 'Excelente para problemas de regresión y clasificación con alta precisión',
            bestFor: [
                'Problemas de regresión',
                'Clasificación con muchas variables',
                'Datasets con buena calidad de datos'
            ],
            limitations: [
                'Requiere ajuste fino de parámetros',
                'Puede sobreajustar fácilmente',
                'Computacionalmente intensivo'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getXGBoostRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.85;
        if (chars.hasNumericAttributes) confidence += 0.1;
        if (chars.isLargeDataset) confidence += 0.1;

        return {
            name: 'XGBoost',
            command: 'weka.classifiers.meta.XGBoost',
            params: '--eta=0.1 --max_depth=6 --nthread=4',
            confidence,
            reason: 'Alto rendimiento y velocidad para datasets grandes',
            bestFor: [
                'Competiciones de Machine Learning',
                'Datasets grandes',
                'Problemas complejos de clasificación y regresión'
            ],
            limitations: [
                'Requiere buen ajuste de hiperparámetros',
                'Puede ser complejo de configurar',
                'Alto consumo de memoria'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getLightGBMRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.8;
        if (chars.isLargeDataset) confidence += 0.15;
        if (chars.hasNumericAttributes) confidence += 0.05;

        return {
            name: 'LightGBM',
            command: 'weka.classifiers.meta.LightGBM',
            params: '--learning_rate=0.1 --num_leaves=31',
            confidence,
            reason: 'Rápido y eficiente para datasets muy grandes',
            bestFor: [
                'Datasets extremadamente grandes',
                'Cuando se necesita velocidad',
                'Problemas de clasificación y regresión'
            ],
            limitations: [
                'Puede sobreajustar en datasets pequeños',
                'Requiere ajuste cuidadoso de parámetros',
                'Menos interpretable que modelos simples'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }

    private getStackingRecommendation(chars: DatasetCharacteristics): IAlgorithmRecommendation {
        let confidence = 0.7;
        if (!chars.isLargeDataset) confidence += 0.1;
        if (!chars.hasMissingValues) confidence += 0.1;

        return {
            name: 'Stacking',
            command: 'weka.classifiers.meta.Stacking',
            params: '-X 10 -M "weka.classifiers.functions.LogisticRegression"',
            confidence,
            reason: 'Combina múltiples modelos para mejor rendimiento',
            bestFor: [
                'Cuando se necesita máxima precisión',
                'Problemas complejos',
                'Datasets bien preparados'
            ],
            limitations: [
                'Computacionalmente costoso',
                'Requiere mucho tiempo de entrenamiento',
                'Puede sobreajustar si no se configura bien'
            ],
            isRecommended: true,
            notRecommendedReason: undefined
        };
    }
} 