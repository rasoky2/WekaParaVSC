import * as vscode from 'vscode';
import { IWekaAlgorithm, IWekaAlgorithmCategory } from '../interfaces/weka.interface';

export class WekaAlgorithmsService {
    private readonly _outputChannel: vscode.OutputChannel;

    constructor() {
        this._outputChannel = vscode.window.createOutputChannel('WEKA Algorithms');
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this._outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    /**
     * Categorías principales de algoritmos en WEKA
     */
    private readonly algorithmCategories: IWekaAlgorithmCategory[] = [
        {
            id: 'classifiers',
            name: 'Clasificadores',
            description: 'Algoritmos para clasificación supervisada',
            subcategories: [
                {
                    id: 'trees',
                    name: 'Árboles',
                    description: 'Algoritmos basados en árboles de decisión'
                },
                {
                    id: 'functions',
                    name: 'Funciones',
                    description: 'Algoritmos basados en funciones matemáticas'
                },
                {
                    id: 'lazy',
                    name: 'Perezosos',
                    description: 'Algoritmos que no construyen un modelo explícito'
                },
                {
                    id: 'bayes',
                    name: 'Bayesianos',
                    description: 'Algoritmos basados en probabilidad'
                },
                {
                    id: 'rules',
                    name: 'Reglas',
                    description: 'Algoritmos basados en reglas de decisión'
                }
            ]
        },
        {
            id: 'clusterers',
            name: 'Clustering',
            description: 'Algoritmos para agrupamiento no supervisado',
            subcategories: [
                {
                    id: 'partitional',
                    name: 'Particionales',
                    description: 'Algoritmos que dividen los datos en grupos no solapados'
                },
                {
                    id: 'hierarchical',
                    name: 'Jerárquicos',
                    description: 'Algoritmos que crean una jerarquía de clusters'
                },
                {
                    id: 'density',
                    name: 'Densidad',
                    description: 'Algoritmos basados en densidad de puntos'
                },
                {
                    id: 'probabilistic',
                    name: 'Probabilísticos',
                    description: 'Algoritmos basados en modelos probabilísticos'
                }
            ]
        }
    ];

    /**
     * Obtiene todos los algoritmos de clasificación disponibles
     */
    public getClassificationAlgorithms(): IWekaAlgorithm[] {
        return [
            // Árboles de Decisión
            {
                id: 'j48',
                name: 'J48 (C4.5)',
                category: 'trees',
                command: 'weka.classifiers.trees.J48',
                description: 'Árbol de decisión C4.5 - Bueno para datos categóricos y numéricos',
                defaultParams: '-C 0.25 -M 2',
                complexity: 'media',
                parameterDescriptions: {
                    '-C': 'Factor de confianza para la poda (menor = más poda)',
                    '-M': 'Número mínimo de instancias por hoja'
                }
            },
            {
                id: 'randomForest',
                name: 'Random Forest',
                category: 'trees',
                command: 'weka.classifiers.trees.RandomForest',
                description: 'Conjunto de árboles de decisión - Excelente para problemas complejos',
                defaultParams: '-I 100 -K 0 -S 1',
                complexity: 'alta',
                parameterDescriptions: {
                    '-I': 'Número de árboles',
                    '-K': 'Número de características',
                    '-S': 'Semilla aleatoria'
                }
            },
            {
                id: 'repTree',
                name: 'REPTree',
                category: 'trees',
                command: 'weka.classifiers.trees.REPTree',
                description: 'Árbol de decisión rápido - Bueno para datasets grandes',
                defaultParams: '-M 2 -V 0.001 -N 3 -S 1 -L -1 -I 0.0',
                complexity: 'baja',
                parameterDescriptions: {
                    '-M': 'Mínimo de instancias',
                    '-V': 'Varianza mínima para split',
                    '-N': 'Número de folds para poda'
                }
            },
            // Bayesianos
            {
                id: 'naiveBayes',
                name: 'Naive Bayes',
                category: 'bayes',
                command: 'weka.classifiers.bayes.NaiveBayes',
                description: 'Clasificador probabilístico simple y rápido',
                defaultParams: '',
                complexity: 'baja',
                parameterDescriptions: {}
            },
            {
                id: 'bayesNet',
                name: 'BayesNet',
                category: 'bayes',
                command: 'weka.classifiers.bayes.BayesNet',
                description: 'Red Bayesiana - Bueno para relaciones complejas',
                defaultParams: '-D -Q weka.classifiers.bayes.net.search.local.K2 -- -P 1 -S BAYES -E weka.classifiers.bayes.net.estimate.SimpleEstimator -- -A 0.5',
                complexity: 'alta',
                parameterDescriptions: {
                    '-D': 'No usar ADTree',
                    '-Q': 'Método de búsqueda',
                    '-P': 'Máximo de padres'
                }
            },
            // Funciones
            {
                id: 'smo',
                name: 'SVM (SMO)',
                category: 'functions',
                command: 'weka.classifiers.functions.SMO',
                description: 'Máquina de Vectores de Soporte - Excelente para clasificación binaria',
                defaultParams: '-C 1.0 -L 0.001 -P 1.0E-12 -N 0 -V -1 -W 1 -K "weka.classifiers.functions.supportVector.PolyKernel -E 1.0 -C 250007"',
                complexity: 'alta',
                parameterDescriptions: {
                    '-C': 'Parámetro de complejidad',
                    '-L': 'Tolerancia',
                    '-P': 'Epsilon'
                }
            },
            {
                id: 'logistic',
                name: 'Logistic',
                category: 'functions',
                command: 'weka.classifiers.functions.Logistic',
                description: 'Regresión logística - Bueno para probabilidades de clase',
                defaultParams: '-R 1.0E-8 -M -1 -num-decimal-places 4',
                complexity: 'media',
                parameterDescriptions: {
                    '-R': 'Ridge',
                    '-M': 'Máximo de iteraciones'
                }
            },
            {
                id: 'mlp',
                name: 'MultilayerPerceptron',
                category: 'functions',
                command: 'weka.classifiers.functions.MultilayerPerceptron',
                description: 'Red Neuronal - Bueno para problemas no lineales complejos',
                defaultParams: '-L 0.3 -M 0.2 -N 500 -V 0 -S 0 -E 20 -H "a"',
                complexity: 'alta',
                parameterDescriptions: {
                    '-L': 'Tasa de aprendizaje',
                    '-M': 'Momentum',
                    '-N': 'Épocas',
                    '-H': 'Capas ocultas'
                }
            }
        ];
    }

    /**
     * Obtiene todos los algoritmos de clustering disponibles
     */
    public getClusteringAlgorithms(): IWekaAlgorithm[] {
        return [
            {
                id: 'simpleKMeans',
                name: 'SimpleKMeans',
                category: 'partitional',
                command: 'weka.clusterers.SimpleKMeans',
                description: 'K-Means clásico - Bueno para clusters esféricos',
                defaultParams: '-init 0 -max-candidates 100 -periodic-pruning 10000 -min-density 2.0 -t1 -1.25 -t2 -1.0 -N 2 -A "weka.core.EuclideanDistance -R first-last" -I 500 -num-slots 1 -S 10',
                complexity: 'media',
                parameterDescriptions: {
                    '-N': 'Número de clusters',
                    '-I': 'Máximo de iteraciones',
                    '-S': 'Semilla aleatoria'
                }
            },
            {
                id: 'em',
                name: 'EM',
                category: 'probabilistic',
                command: 'weka.clusterers.EM',
                description: 'Expectation Maximization - Clusters con distribución normal',
                defaultParams: '-I 100 -N -1 -X 10 -max -1 -ll-cv 1.0E-6 -ll-iter 1.0E-6 -M 1.0E-6 -K 10 -num-slots 1 -S 100',
                complexity: 'alta',
                parameterDescriptions: {
                    '-I': 'Máximo de iteraciones',
                    '-N': 'Número de clusters (-1 = automático)',
                    '-X': 'Máximo de clusters'
                }
            },
            {
                id: 'dbscan',
                name: 'DBSCAN',
                category: 'density',
                command: 'weka.clusterers.DBSCAN',
                description: 'Clustering basado en densidad - Bueno para clusters de forma arbitraria',
                defaultParams: '-E 0.9 -M 6 -dist "weka.core.EuclideanDistance -R first-last"',
                complexity: 'media',
                parameterDescriptions: {
                    '-E': 'Epsilon (radio de vecindad)',
                    '-M': 'MinPoints',
                    '-dist': 'Medida de distancia'
                }
            },
            {
                id: 'hierarchical',
                name: 'HierarchicalClusterer',
                category: 'hierarchical',
                command: 'weka.clusterers.HierarchicalClusterer',
                description: 'Clustering jerárquico - Visualización en dendrograma',
                defaultParams: '-N 2 -L SINGLE -P -A "weka.core.EuclideanDistance -R first-last"',
                complexity: 'alta',
                parameterDescriptions: {
                    '-N': 'Número de clusters',
                    '-L': 'Tipo de enlace (SINGLE, COMPLETE, AVERAGE)',
                    '-P': 'Imprimir dendrograma'
                }
            }
        ];
    }

    /**
     * Obtiene todos los algoritmos disponibles
     */
    public getAllAlgorithms(): IWekaAlgorithm[] {
        return [
            ...this.getClassificationAlgorithms(),
            ...this.getClusteringAlgorithms()
        ];
    }

    /**
     * Muestra el selector de algoritmos con información detallada
     */
    public async showAlgorithmSelector(type: 'classification' | 'clustering' = 'classification'): Promise<IWekaAlgorithm | undefined> {
        this.log(`Mostrando selector de algoritmos de ${type}`);
        
        const algorithms = type === 'classification' 
            ? this.getClassificationAlgorithms()
            : this.getClusteringAlgorithms();

        // Agrupar por categoría
        const groupedAlgorithms = algorithms.reduce((acc, curr) => {
            if (!acc[curr.category]) {
                acc[curr.category] = [];
            }
            acc[curr.category].push(curr);
            return acc;
        }, {} as Record<string, IWekaAlgorithm[]>);

        // Crear QuickPick items con separadores
        const quickPickItems: (vscode.QuickPickItem & { algorithm?: IWekaAlgorithm })[] = [];

        for (const [category, algs] of Object.entries(groupedAlgorithms)) {
            const categoryInfo = this.algorithmCategories
                .flatMap(c => c.subcategories)
                .find(sc => sc.id === category);

            if (categoryInfo) {
                quickPickItems.push({
                    label: `$(symbol-class) ${categoryInfo.name.toUpperCase()}`,
                    kind: vscode.QuickPickItemKind.Separator
                });

                algs.forEach(alg => {
                    quickPickItems.push({
                        label: alg.name,
                        description: `Complejidad: ${alg.complexity}`,
                        detail: alg.description,
                        algorithm: alg
                    });
                });
            }
        }

        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: `Seleccione un algoritmo de ${type === 'classification' ? 'clasificación' : 'clustering'}`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected?.algorithm) {
            this.log(`Algoritmo seleccionado: ${selected.algorithm.name}`);
            await this.showAlgorithmDetails(selected.algorithm);
            return selected.algorithm;
        }

        return undefined;
    }

    /**
     * Muestra los detalles de un algoritmo en particular
     */
    private async showAlgorithmDetails(algorithm: IWekaAlgorithm): Promise<void> {
        this.log(`Mostrando detalles del algoritmo: ${algorithm.name}`);
        
        const panel = vscode.window.createWebviewPanel(
            'wekaAlgorithmDetails',
            `WEKA - ${algorithm.name}`,
            vscode.ViewColumn.Two,
            {
                enableScripts: true
            }
        );

        panel.webview.html = this._createAlgorithmDetailsHtml(algorithm);
    }

    /**
     * Genera el HTML para mostrar los detalles del algoritmo
     */
    private _createAlgorithmDetailsHtml(algorithm: IWekaAlgorithm): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        padding: 15px;
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        line-height: 1.6;
                    }
                    .section {
                        margin-bottom: 20px;
                        background: var(--vscode-editor-background);
                        padding: 15px;
                        border-radius: 5px;
                    }
                    .param-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                    }
                    .param-table td, .param-table th {
                        padding: 8px;
                        border: 1px solid var(--vscode-panel-border);
                    }
                    .param-table th {
                        background: var(--vscode-editor-background);
                    }
                    .code-block {
                        background: var(--vscode-textBlockQuote-background);
                        padding: 10px;
                        border-radius: 4px;
                        font-family: monospace;
                        overflow-x: auto;
                    }
                    .complexity {
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 3px;
                        font-size: 0.9em;
                        margin-left: 10px;
                    }
                    .complexity.baja { background: #4CAF50; color: white; }
                    .complexity.media { background: #FFC107; color: black; }
                    .complexity.alta { background: #F44336; color: white; }
                </style>
            </head>
            <body>
                <h1>
                    ${algorithm.name}
                    <span class="complexity ${algorithm.complexity}">
                        Complejidad: ${algorithm.complexity}
                    </span>
                </h1>
                
                <div class="section">
                    <h2>Descripción</h2>
                    <p>${algorithm.description}</p>
                </div>

                <div class="section">
                    <h2>Comando</h2>
                    <div class="code-block">
                        ${algorithm.command} ${algorithm.defaultParams}
                    </div>
                </div>

                <div class="section">
                    <h2>Parámetros</h2>
                    <table class="param-table">
                        <tr>
                            <th>Parámetro</th>
                            <th>Descripción</th>
                        </tr>
                        ${Object.entries(algorithm.parameterDescriptions)
                            .map(([param, desc]) => `
                                <tr>
                                    <td><code>${param}</code></td>
                                    <td>${desc}</td>
                                </tr>
                            `).join('')}
                    </table>
                </div>
            </body>
            </html>
        `;
    }
} 