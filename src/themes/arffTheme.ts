import * as vscode from 'vscode';

export interface IArffTheme {
    name: string;
    colors: {
        keywords: {
            relation: string;
            attribute: string;
            data: string;
        };
        types: {
            primitive: string;
            nominal: string;
        };
        values: {
            numeric: string;
            string: string;
            missing: string;
            nominal: string;
            boolean: string;
        };
        identifiers: {
            relation: string;
            attribute: string;
            braces: string;
            parenthesis: string;
        };
        comments: string;
        strings: string;
        operators: string;
        delimiters: string;
        bracesContent: string;
    };
    styles: {
        keywords: {
            fontWeight: string;
            fontStyle: string;
        };
        types: {
            fontWeight: string;
            fontStyle: string;
        };
        values: {
            numeric: {
                fontWeight: string;
                fontStyle: string;
            };
            string: {
                fontWeight: string;
                fontStyle: string;
            };
            boolean: {
                fontWeight: string;
                fontStyle: string;
            };
        };
        identifiers: {
            fontWeight: string;
            fontStyle: string;
        };
    };
}

function getThemeColor(colorVar: string, darkFallback: string, lightFallback: string, isDark: boolean): string {
    return `var(${colorVar}, ${isDark ? darkFallback : lightFallback})`;
}

function getKeywordColors(isDark: boolean) {
    const keywordColor = getThemeColor(
        '--vscode-symbolIcon-keywordForeground',
        '#569CD6',
        '#0000FF',
        isDark
    );
    return {
        relation: keywordColor,
        attribute: keywordColor,
        data: keywordColor
    };
}

function getTypeColors(isDark: boolean) {
    return {
        primitive: getThemeColor(
            '--vscode-symbolIcon-typeParameterForeground',
            '#4EC9B0',
            '#267F99',
            isDark
        ),
        nominal: getThemeColor(
            '--vscode-symbolIcon-enumForeground',
            '#C586C0',
            '#AF00DB',
            isDark
        )
    };
}

function getValueColors(isDark: boolean) {
    return {
        numeric: getThemeColor('--vscode-charts-green', '#B5CEA8', '#098658', isDark),
        string: getThemeColor('--vscode-charts-orange', '#CE9178', '#A31515', isDark),
        missing: getThemeColor('--vscode-errorForeground', '#FF6B6B', '#EE0000', isDark),
        nominal: getThemeColor('--vscode-charts-yellow', '#D7BA7D', '#C17E70', isDark),
        boolean: getThemeColor('--vscode-debugTokenExpression-boolean', '#4E94CE', '#0000FF', isDark)
    };
}

function getIdentifierColors(isDark: boolean) {
    return {
        relation: getThemeColor(
            '--vscode-symbolIcon-variableForeground',
            '#9CDCFE',
            '#001080',
            isDark
        ),
        attribute: getThemeColor(
            '--vscode-symbolIcon-propertyForeground',
            '#9CDCFE',
            '#001080',
            isDark
        ),
        braces: getThemeColor(
            '--vscode-symbolIcon-operatorForeground',
            '#FFD700',
            '#FF8C00',
            isDark
        ),
        parenthesis: getThemeColor(
            '--vscode-symbolIcon-operatorForeground',
            '#DA70D6',
            '#4B0082',
            isDark
        )
    };
}

function getVSCodeColors(): IArffTheme {
    const theme = vscode.window.activeColorTheme;
    const isDark = theme.kind === vscode.ColorThemeKind.Dark;

    return {
        name: 'VS Code Theme',
        colors: {
            keywords: getKeywordColors(isDark),
            types: getTypeColors(isDark),
            values: getValueColors(isDark),
            identifiers: getIdentifierColors(isDark),
            comments: getThemeColor(
                '--vscode-editorLineNumber-foreground',
                '#6A9955',
                '#008000',
                isDark
            ),
            strings: getThemeColor(
                '--vscode-charts-orange',
                '#CE9178',
                '#A31515',
                isDark
            ),
            operators: getThemeColor(
                '--vscode-symbolIcon-operatorForeground',
                '#D4D4D4',
                '#000000',
                isDark
            ),
            delimiters: getThemeColor(
                '--vscode-symbolIcon-operatorForeground',
                '#D4D4D4',
                '#000000',
                isDark
            ),
            bracesContent: getThemeColor(
                '--vscode-charts-foreground',
                '#DCDCAA',
                '#8B4513',
                isDark
            )
        },
        styles: {
            keywords: {
                fontWeight: 'bold',
                fontStyle: 'normal'
            },
            types: {
                fontWeight: 'bold',
                fontStyle: 'italic'
            },
            values: {
                numeric: {
                    fontWeight: 'normal',
                    fontStyle: 'normal'
                },
                string: {
                    fontWeight: 'normal',
                    fontStyle: 'italic'
                },
                boolean: {
                    fontWeight: 'bold',
                    fontStyle: 'italic'
                }
            },
            identifiers: {
                fontWeight: 'normal',
                fontStyle: 'normal'
            }
        }
    };
}

// Definición de tokens y patrones
export const arffTokens = {
    keywords: ['@relation', '@attribute', '@data'],
    types: ['numeric', 'string', 'date', 'real', 'integer'],
    operators: ['{', '}', ',', '?', '[', ']', '(', ')'],
    comments: ['%'],
    specialChars: ['@', '_', '-', '.', '+'],
    booleanValues: ['true', 'false', 'yes', 'no', 'si', 'no']
};

// Definición de tipos de tokens para colorización semántica
const tokenTypes = [
    'keyword',      // 0
    'type',         // 1
    'string',       // 2
    'number',       // 3
    'comment',      // 4
    'variable',     // 5
    'operator',     // 6
    'identifier',   // 7
    'delimiter',    // 8
    'boolean'       // 9
];

const tokenModifiers = [
    'declaration',
    'definition',
    'readonly',
    'static',
    'deprecated',
    'modification',
    'documentation'
];

// Función principal de activación de la colorización
export function activateColorization(context: vscode.ExtensionContext): void {
    const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
    const eventEmitter = new vscode.EventEmitter<void>();
    const provider = createSemanticTokensProvider(legend, eventEmitter);

    // Registrar el proveedor de tokens semánticos
    context.subscriptions.push(
        vscode.languages.registerDocumentSemanticTokensProvider(
            { language: 'arff' }, 
            provider, 
            legend
        )
    );

    // Escuchar cambios en el tema de color
    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(() => {
            eventEmitter.fire();
        })
    );

    // Asegurarse de que el EventEmitter se disponga correctamente
    context.subscriptions.push(eventEmitter);
}

function createSemanticTokensProvider(
    legend: vscode.SemanticTokensLegend,
    eventEmitter: vscode.EventEmitter<void>
): vscode.DocumentSemanticTokensProvider {
    return {
        provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.SemanticTokens {
            const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
            const theme = getVSCodeColors();
            processDocument(document, tokensBuilder, theme);
            return tokensBuilder.build();
        },
        onDidChangeSemanticTokens: eventEmitter.event
    };
}

function processDocument(
    document: vscode.TextDocument, 
    tokensBuilder: vscode.SemanticTokensBuilder,
    theme: IArffTheme
): void {
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        processLine(line.text, i, tokensBuilder, theme);
    }
}

function processLine(
    text: string, 
    lineIndex: number, 
    tokensBuilder: vscode.SemanticTokensBuilder,
    theme: IArffTheme
): void {
    processComments(text, lineIndex, tokensBuilder);
    processKeywords(text, lineIndex, tokensBuilder);
    processTypes(text, lineIndex, tokensBuilder);
    processNumericValues(text, lineIndex, tokensBuilder);
    processStrings(text, lineIndex, tokensBuilder);
    processMissingValues(text, lineIndex, tokensBuilder);
    processIdentifiers(text, lineIndex, tokensBuilder);
    processNominalValues(text, lineIndex, tokensBuilder);
    processBooleanValues(text, lineIndex, tokensBuilder);
}

function processComments(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const commentMatch = RegExp(/%(.*$)/).exec(text);
    if (commentMatch) {
        const index = text.indexOf('%');
        tokensBuilder.push(lineIndex, index, commentMatch[0].length, 4, 0);
    }
}

function processKeywords(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const keywordRegex = RegExp(/@(relation|attribute|data)\b/g);
    let match;
    while ((match = keywordRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 0, 1);
    }
}

function processTypes(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const typeRegex = RegExp(/\b(numeric|string|date|real|integer)\b/g);
    let match;
    while ((match = typeRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 1, 2);
    }
}

function processNumericValues(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const numericRegex = RegExp(/\b\d+(\.\d+)?\b/g);
    let match;
    while ((match = numericRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 3, 0);
    }
}

function processStrings(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const stringRegex = RegExp(/'[^']*'|"[^"]*"/g);
    let match;
    while ((match = stringRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 2, 0);
    }
}

function processMissingValues(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const missingRegex = RegExp(/\?/g);
    let match;
    while ((match = missingRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, 1, 6, 0);
    }
}

function processIdentifiers(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const identifierRegex = RegExp(/(?<=@(?:relation|attribute)\s+)\w+/g);
    let match;
    while ((match = identifierRegex.exec(text)) !== null) {
        tokensBuilder.push(lineIndex, match.index, match[0].length, 7, 0);
    }
}

function processNominalValues(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const nominalRegex = RegExp(/\{([^}]+)\}/g);
    let match;
    while ((match = nominalRegex.exec(text)) !== null) {
        const fullMatch = match[0];
        const index = match.index;
        
        // Colorear las llaves y su contenido
        tokensBuilder.push(lineIndex, index, fullMatch.length, 8, 0);
        
        // Colorear los valores individuales dentro de las llaves
        processNominalValueContent(text, lineIndex, index, fullMatch, tokensBuilder);
    }
}

function processNominalValueContent(
    text: string,
    lineIndex: number,
    startIndex: number,
    fullMatch: string,
    tokensBuilder: vscode.SemanticTokensBuilder
): void {
    const values = fullMatch.slice(1, -1).split(',');
    let currentIndex = startIndex + 1;

    values.forEach(value => {
        const trimmedValue = value.trim();
        currentIndex = text.indexOf(trimmedValue, currentIndex);
        if (currentIndex !== -1) {
            tokensBuilder.push(lineIndex, currentIndex, trimmedValue.length, 5, 0);
            currentIndex += trimmedValue.length;
        }
    });
}

function processBooleanValues(text: string, lineIndex: number, tokensBuilder: vscode.SemanticTokensBuilder): void {
    const boolRegex = new RegExp(`\\b(${arffTokens.booleanValues.join('|')})\\b`, 'gi');
    let match;
    while ((match = boolRegex.exec(text)) !== null) {
        tokensBuilder.push(
            lineIndex,
            match.index,
            match[0].length,
            9,  // token type 'boolean'
            0   // no modifiers
        );
    }
}

// Actualizar el CSS para los valores booleanos
const booleanStyles = `
.boolean-value {
    font-weight: bold;
    color: var(--vscode-debugTokenExpression-boolean);
    font-style: italic;
}
`;

// Actualizar el CSS para los tokens
const tokenStyles = `
.token-type-keyword {
    font-weight: bold;
    color: var(--vscode-symbolIcon-keywordForeground);
    text-transform: uppercase;
}

.token-type-type {
    font-weight: bold;
    font-style: italic;
    color: var(--vscode-symbolIcon-typeParameterForeground);
}

.token-type-string {
    font-style: italic;
    color: var(--vscode-charts-orange);
}

.token-type-number {
    color: var(--vscode-charts-green);
}

.token-type-boolean {
    font-weight: bold;
    font-style: italic;
    color: var(--vscode-debugTokenExpression-boolean);
}

.token-type-identifier {
    color: var(--vscode-symbolIcon-variableForeground);
}

.token-type-comment {
    font-style: italic;
    color: var(--vscode-editorLineNumber-foreground);
    opacity: 0.8;
}

.token-type-operator {
    font-weight: bold;
    color: var(--vscode-symbolIcon-operatorForeground);
}

.token-type-delimiter {
    color: var(--vscode-symbolIcon-operatorForeground);
    opacity: 0.9;
}

.token-type-nominal {
    font-weight: bold;
    color: var(--vscode-charts-yellow);
    text-decoration: underline;
}

.token-type-missing {
    font-weight: bold;
    color: var(--vscode-errorForeground);
    text-decoration: wavy underline;
}
`;

// Exportar los estilos
export const arffStyles = {
    tokenStyles,
    booleanStyles
};

export const arffThemes = {
    light: getVSCodeColors(),
    dark: getVSCodeColors()
}; 