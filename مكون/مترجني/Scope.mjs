import Symbol from './Symbol.mjs';

export class Scope {
	symbols;
	sourceFile; // source filename like bar
	importName; // full import name like foor.bar
	
	constructor (smbs) {
		this.symbols = smbs || [];
	}
	
	setSourceFile (sourceFile) {
		this.sourceFile = sourceFile;
	}
	
	getSourceFile() {
		return this.sourceFile;
	}
	
	getImportName() {
		return this.importName;
	}
	
	// check if scope contains symb
	contains (symb) {
		return this.symbols.find((s) => s.name == symb.name);
	}
	
	containsByName (symbName) {
		return this.symbols.find((s) => s.name == symbName);
	}
	
	getSymbol (symb) {
		return this.symbols.find((s) => s.name == symb.name);
	}
	
	getSymbolByName (symbName) {
		return this.symbols.find((s) => s.name == symbName);
	}
	
	add (symb) {
		this.symbols.push(symb);
		return symb;
	}
	
	clear () {
		this.symbols = [];
	}
	
	// Copy this scope content to symbol
	copyToSymbol (symb) {
		this.symbols.forEach ((s) => {
			symb.addMember(s);
		});
		symb.isImport = true;
	}
	
}

export default Scope;