import * as vscode from 'vscode';

export class ArffCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument, 
        position: vscode.Position
    ): vscode.CompletionItem[] | undefined {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        if (linePrefix.trim().startsWith('@')) {
            return this.getKeywordCompletions();
        }

        if (linePrefix.includes('@attribute')) {
            return this.getAttributeTypeCompletions();
        }

        return undefined;
    }

    private getKeywordCompletions(): vscode.CompletionItem[] {
        const relationItem = this.createKeywordItem(
            '@relation',
            'Define el nombre del dataset',
            new vscode.MarkdownString()
                .appendMarkdown('Define el nombre de la relación/dataset\n\n')
                .appendCodeblock('@relation nombre_dataset', 'arff')
                .appendMarkdown('\n**Notas:**\n- Debe ser único\n- Evitar espacios y caracteres especiales')
        );

        const attributeItem = this.createKeywordItem(
            '@attribute',
            'Define un atributo y su tipo',
            new vscode.MarkdownString()
                .appendMarkdown('Define un atributo y su tipo de datos\n\n')
                .appendMarkdown('**Tipos soportados:**\n')
                .appendMarkdown('- numeric: valores numéricos\n')
                .appendMarkdown('- {val1,val2}: valores nominales\n')
                .appendMarkdown('- string: texto libre\n')
                .appendMarkdown('- date: fechas\n\n')
                .appendCodeblock('@attribute nombre {valor1,valor2}', 'arff')
        );

        const dataItem = this.createKeywordItem(
            '@data',
            'Marca el inicio de la sección de datos',
            new vscode.MarkdownString()
                .appendMarkdown('Marca el inicio de la sección de datos\n\n')
                .appendCodeblock('@data\nvalor1,valor2,valor3', 'arff')
                .appendMarkdown('\n**Notas:**\n- Los valores deben corresponder con los atributos definidos\n- Usar ? para valores faltantes')
        );

        return [relationItem, attributeItem, dataItem];
    }

    private getAttributeTypeCompletions(): vscode.CompletionItem[] {
        const numericItem = this.createValueItem(
            'numeric',
            'Tipo numérico',
            new vscode.MarkdownString()
                .appendMarkdown('Para valores numéricos (enteros o decimales)\n\n')
                .appendCodeblock('@attribute precio numeric', 'arff')
        );

        const nominalItem = this.createValueItem(
            '{valor1,valor2}',
            'Tipo nominal/categórico',
            new vscode.MarkdownString()
                .appendMarkdown('Para valores predefinidos/categorías\n\n')
                .appendCodeblock('@attribute color {rojo,verde,azul}', 'arff')
        );

        const stringItem = this.createValueItem(
            'string',
            'Tipo texto',
            new vscode.MarkdownString()
                .appendMarkdown('Para valores de texto libre\n\n')
                .appendCodeblock('@attribute descripcion string', 'arff')
        );

        const dateItem = this.createValueItem(
            'date',
            'Tipo fecha',
            new vscode.MarkdownString()
                .appendMarkdown('Para valores de fecha/hora\n\n')
                .appendCodeblock('@attribute fecha date "yyyy-MM-dd"', 'arff')
        );

        return [numericItem, nominalItem, stringItem, dateItem];
    }

    private createKeywordItem(
        label: string, 
        detail: string, 
        documentation: vscode.MarkdownString
    ): vscode.CompletionItem {
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Keyword);
        item.detail = detail;
        item.documentation = documentation;
        return item;
    }

    private createValueItem(
        label: string, 
        detail: string, 
        documentation: vscode.MarkdownString
    ): vscode.CompletionItem {
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Value);
        item.detail = detail;
        item.documentation = documentation;
        return item;
    }
}