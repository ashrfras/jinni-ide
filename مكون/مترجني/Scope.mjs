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
	
	replaceBy (symb1, symb2) {
		//symb1.typeSymbol = symb2.typeSymbol;
		//symb1.subTypeSymbol = symb2.subTypeSymbol;
		symb1.setAsHeader(false);
		return symb1;
		//var i = this.symbols.indexOf(symb1);
		//symb2.members = symb1.members;
		//this.symbols[i] = symb2;
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